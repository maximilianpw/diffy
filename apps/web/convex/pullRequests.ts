import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { PullRequestState } from '@diffy/shared';
import type { Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import {
	action,
	internalMutation,
	internalQuery,
	mutation,
	query,
	type ActionCtx,
	type MutationCtx,
	type QueryCtx,
} from './_generated/server';
import { getGitHubFetchError } from './githubApiErrors';

const GITHUB_API = 'https://api.github.com';

const pullRequestStateValidator = v.union(
	v.literal(PullRequestState.Open),
	v.literal(PullRequestState.Closed),
	v.literal(PullRequestState.Merged),
);

type GitHubPrMeta = {
	title: string;
	body: string | null;
	merged_at: string | null;
	state: PullRequestState.Open | PullRequestState.Closed;
	updated_at: string;
	html_url: string;
	user: { login: string; avatar_url: string };
	base: { ref: string; sha: string };
	head: { ref: string; sha: string };
};

type GitHubIssueComment = {
	id: number;
	body: string;
	html_url: string;
	user: { login: string; avatar_url: string } | null;
	created_at: string;
	updated_at: string;
};

type UpdateSnapshot = {
	githubUpdatedAt: number;
	state: PullRequestState;
	baseSha: string;
	headSha: string;
};

type UpdateCheckResult = {
	checkedAt: number;
	hasUpdates: boolean;
	remoteGithubUpdatedAt: number;
	remoteState: PullRequestState;
	remoteBaseSha: string;
	remoteHeadSha: string;
};

const prFields = {
	owner: v.string(),
	repo: v.string(),
	number: v.number(),
	title: v.string(),
	body: v.optional(v.union(v.string(), v.null())),
	authorLogin: v.string(),
	authorAvatarUrl: v.string(),
	state: pullRequestStateValidator,
	baseRef: v.string(),
	headRef: v.string(),
	baseSha: v.string(),
	headSha: v.string(),
	htmlUrl: v.string(),
	diffStorageId: v.id('_storage'),
	diffByteSize: v.number(),
	importedAt: v.number(),
	lastViewedAt: v.number(),
	githubUpdatedAt: v.number(),
	latestVersionId: v.optional(v.id('pullRequestVersions')),
	latestVersionNumber: v.optional(v.number()),
	discussionImportedAt: v.optional(v.number()),
};

const prVersionFields = {
	pullRequestId: v.id('pullRequests'),
	versionNumber: v.number(),
	baseRef: v.string(),
	headRef: v.string(),
	baseSha: v.string(),
	headSha: v.string(),
	diffStorageId: v.id('_storage'),
	diffByteSize: v.number(),
	githubUpdatedAt: v.number(),
	importedAt: v.number(),
};

const prCommentFields = {
	pullRequestId: v.id('pullRequests'),
	githubId: v.number(),
	authorLogin: v.string(),
	authorAvatarUrl: v.string(),
	body: v.string(),
	htmlUrl: v.string(),
	createdAt: v.number(),
	updatedAt: v.number(),
};

const prDoc = v.object({
	_id: v.id('pullRequests'),
	_creationTime: v.number(),
	...prFields,
});

const prCommentDoc = v.object({
	_id: v.id('pullRequestComments'),
	_creationTime: v.number(),
	...prCommentFields,
});

const prVersionDoc = v.object({
	_id: v.id('pullRequestVersions'),
	_creationTime: v.number(),
	...prVersionFields,
});

const prWithDiffUrl = v.object({
	_id: v.id('pullRequests'),
	_creationTime: v.number(),
	...prFields,
	diffUrl: v.union(v.string(), v.null()),
});

const updateCheckResult = v.object({
	checkedAt: v.number(),
	hasUpdates: v.boolean(),
	remoteGithubUpdatedAt: v.number(),
	remoteState: pullRequestStateValidator,
	remoteBaseSha: v.string(),
	remoteHeadSha: v.string(),
});

async function requireSignedIn(ctx: ActionCtx | MutationCtx | QueryCtx): Promise<Id<'users'>> {
	const userId = await getAuthUserId(ctx);
	if (userId == null) {
		throw new ConvexError('Sign in with GitHub before using Diffy.');
	}
	return userId;
}

function getPullRequestState(meta: Pick<GitHubPrMeta, 'merged_at' | 'state'>): PullRequestState {
	if (meta.merged_at != null) return PullRequestState.Merged;
	return meta.state === PullRequestState.Closed ? PullRequestState.Closed : PullRequestState.Open;
}

const MISSING_TOKEN_MESSAGE =
	'GitHub access token is missing. Sign out and sign in with GitHub again.';

const commentValidator = v.object({
	githubId: v.number(),
	authorLogin: v.string(),
	authorAvatarUrl: v.string(),
	body: v.string(),
	htmlUrl: v.string(),
	createdAt: v.number(),
	updatedAt: v.number(),
});

type StoredComment = {
	githubId: number;
	authorLogin: string;
	authorAvatarUrl: string;
	body: string;
	htmlUrl: string;
	createdAt: number;
	updatedAt: number;
};

type ExistingVersion = {
	versionId: Id<'pullRequestVersions'>;
	versionNumber: number;
	diffStorageId: Id<'_storage'>;
	diffByteSize: number;
};

export const importPr = action({
	args: {
		owner: v.string(),
		repo: v.string(),
		number: v.number(),
	},
	returns: v.id('pullRequests'),
	handler: async (ctx, { owner, repo, number }): Promise<Id<'pullRequests'>> => {
		const userId = await requireSignedIn(ctx);

		const token: string | null = await ctx.runQuery(internal.pullRequests.getGitHubAccessToken, {
			userId,
		});
		if (!token) {
			throw new ConvexError(MISSING_TOKEN_MESSAGE);
		}

		const baseHeaders: Record<string, string> = {
			Authorization: `Bearer ${token}`,
			'X-GitHub-Api-Version': '2022-11-28',
			'User-Agent': 'diffy',
		};
		const url = `${GITHUB_API}/repos/${owner}/${repo}/pulls/${number}`;
		const commentsUrl = `${GITHUB_API}/repos/${owner}/${repo}/issues/${number}/comments?per_page=100`;

		const [metaRes, comments]: [Response, GitHubIssueComment[]] = await Promise.all([
			fetch(url, { headers: { ...baseHeaders, Accept: 'application/vnd.github+json' } }),
			fetchGitHubIssueComments(commentsUrl, baseHeaders),
		]);

		if (!metaRes.ok) {
			throw new ConvexError(
				getGitHubFetchError({
					resource: 'PR metadata',
					status: metaRes.status,
					body: await metaRes.text(),
				}),
			);
		}

		const meta = (await metaRes.json()) as GitHubPrMeta;

		// Skip diff fetch + upload when an existing version already covers (baseSha, headSha).
		const existingVersion: ExistingVersion | null = await ctx.runQuery(
			internal.pullRequests.findVersionBySha,
			{ owner, repo, number, baseSha: meta.base.sha, headSha: meta.head.sha },
		);

		let diffStorageId: Id<'_storage'>;
		let diffByteSize: number;
		if (existingVersion) {
			diffStorageId = existingVersion.diffStorageId;
			diffByteSize = existingVersion.diffByteSize;
		} else {
			const diffRes = await fetch(url, {
				headers: { ...baseHeaders, Accept: 'application/vnd.github.diff' },
			});
			if (!diffRes.ok) {
				throw new ConvexError(
					getGitHubFetchError({
						resource: 'PR diff',
						status: diffRes.status,
						body: await diffRes.text(),
					}),
				);
			}
			const diffBlob = await diffRes.blob();
			diffStorageId = await ctx.storage.store(diffBlob);
			diffByteSize = diffBlob.size;
		}

		const state = getPullRequestState(meta);

		return await ctx.runMutation(internal.pullRequests.recordImport, {
			owner,
			repo,
			number,
			title: meta.title,
			body: meta.body,
			authorLogin: meta.user.login,
			authorAvatarUrl: meta.user.avatar_url,
			state,
			baseRef: meta.base.ref,
			headRef: meta.head.ref,
			baseSha: meta.base.sha,
			headSha: meta.head.sha,
			htmlUrl: meta.html_url,
			diffStorageId,
			diffByteSize,
			githubUpdatedAt: new Date(meta.updated_at).getTime(),
			importedAt: Date.now(),
			reuseVersionId: existingVersion?.versionId,
			reuseVersionNumber: existingVersion?.versionNumber,
			comments: comments.map(toStoredComment),
		});
	},
});

export const checkForUpdates = action({
	args: {
		owner: v.string(),
		repo: v.string(),
		number: v.number(),
	},
	returns: updateCheckResult,
	handler: async (ctx, { owner, repo, number }): Promise<UpdateCheckResult> => {
		const userId = await requireSignedIn(ctx);

		const token: string | null = await ctx.runQuery(internal.pullRequests.getGitHubAccessToken, {
			userId,
		});
		if (!token) {
			throw new ConvexError(MISSING_TOKEN_MESSAGE);
		}

		const local: UpdateSnapshot | null = await ctx.runQuery(internal.pullRequests.getUpdateSnapshot, {
			owner,
			repo,
			number,
		});

		const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${number}`, {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/vnd.github+json',
				'X-GitHub-Api-Version': '2022-11-28',
				'User-Agent': 'diffy',
			},
		});

		if (!response.ok) {
			throw new ConvexError(
				getGitHubFetchError({
					resource: 'PR metadata',
					status: response.status,
					body: await response.text(),
				}),
			);
		}

		const meta = (await response.json()) as GitHubPrMeta;
		const remoteState = getPullRequestState(meta);
		const remoteGithubUpdatedAt = new Date(meta.updated_at).getTime();

		return {
			checkedAt: Date.now(),
			hasUpdates:
				local == null ||
				remoteGithubUpdatedAt > local.githubUpdatedAt ||
				remoteState !== local.state ||
				meta.base.sha !== local.baseSha ||
				meta.head.sha !== local.headSha,
			remoteGithubUpdatedAt,
			remoteState,
			remoteBaseSha: meta.base.sha,
			remoteHeadSha: meta.head.sha,
		};
	},
});

export const importDiscussion = action({
	args: {
		pullRequestId: v.id('pullRequests'),
		owner: v.string(),
		repo: v.string(),
		number: v.number(),
	},
	returns: v.null(),
	handler: async (ctx, { pullRequestId, owner, repo, number }) => {
		const userId = await requireSignedIn(ctx);

		const token: string | null = await ctx.runQuery(internal.pullRequests.getGitHubAccessToken, {
			userId,
		});
		if (!token) {
			throw new ConvexError(MISSING_TOKEN_MESSAGE);
		}

		const baseHeaders: Record<string, string> = {
			Authorization: `Bearer ${token}`,
			'X-GitHub-Api-Version': '2022-11-28',
			'User-Agent': 'diffy',
		};
		const url = `${GITHUB_API}/repos/${owner}/${repo}/pulls/${number}`;
		const commentsUrl = `${GITHUB_API}/repos/${owner}/${repo}/issues/${number}/comments?per_page=100`;

		const [metaRes, comments]: [Response, GitHubIssueComment[]] = await Promise.all([
			fetch(url, { headers: { ...baseHeaders, Accept: 'application/vnd.github+json' } }),
			fetchGitHubIssueComments(commentsUrl, baseHeaders),
		]);

		if (!metaRes.ok) {
			throw new ConvexError(
				getGitHubFetchError({
					resource: 'PR metadata',
					status: metaRes.status,
					body: await metaRes.text(),
				}),
			);
		}

		const meta = (await metaRes.json()) as GitHubPrMeta;

		await ctx.runMutation(internal.pullRequests.replaceDiscussion, {
			pullRequestId,
			body: meta.body,
			githubUpdatedAt: new Date(meta.updated_at).getTime(),
			discussionImportedAt: Date.now(),
			comments: comments.map(toStoredComment),
		});

		return null;
	},
});

export const getGitHubAccessToken = internalQuery({
	args: { userId: v.id('users') },
	returns: v.union(v.string(), v.null()),
	handler: async (ctx, { userId }): Promise<string | null> => {
		const user = await ctx.db.get(userId);
		return user?.githubAccessToken ?? null;
	},
});

export const getUpdateSnapshot = internalQuery({
	args: {
		owner: v.string(),
		repo: v.string(),
		number: v.number(),
	},
	returns: v.union(
		v.object({
			githubUpdatedAt: v.number(),
			state: pullRequestStateValidator,
			baseSha: v.string(),
			headSha: v.string(),
		}),
		v.null(),
	),
	handler: async (ctx, { owner, repo, number }): Promise<UpdateSnapshot | null> => {
		const pr = await ctx.db
			.query('pullRequests')
			.withIndex('by_owner_and_repo_and_number', (q) =>
				q.eq('owner', owner).eq('repo', repo).eq('number', number),
			)
			.unique();

		if (!pr) return null;

		return {
			githubUpdatedAt: pr.githubUpdatedAt,
			state: pr.state,
			baseSha: pr.baseSha,
			headSha: pr.headSha,
		};
	},
});

export const findVersionBySha = internalQuery({
	args: {
		owner: v.string(),
		repo: v.string(),
		number: v.number(),
		baseSha: v.string(),
		headSha: v.string(),
	},
	returns: v.union(
		v.object({
			versionId: v.id('pullRequestVersions'),
			versionNumber: v.number(),
			diffStorageId: v.id('_storage'),
			diffByteSize: v.number(),
		}),
		v.null(),
	),
	handler: async (ctx, { owner, repo, number, baseSha, headSha }): Promise<ExistingVersion | null> => {
		const pr = await ctx.db
			.query('pullRequests')
			.withIndex('by_owner_and_repo_and_number', (q) =>
				q.eq('owner', owner).eq('repo', repo).eq('number', number),
			)
			.unique();
		if (!pr) return null;

		const version = await ctx.db
			.query('pullRequestVersions')
			.withIndex('by_pull_request_and_diff_identity', (q) =>
				q.eq('pullRequestId', pr._id).eq('baseSha', baseSha).eq('headSha', headSha),
			)
			.unique();
		if (!version) return null;

		return {
			versionId: version._id,
			versionNumber: version.versionNumber,
			diffStorageId: version.diffStorageId,
			diffByteSize: version.diffByteSize,
		};
	},
});

export const recordImport = internalMutation({
	args: {
		owner: v.string(),
		repo: v.string(),
		number: v.number(),
		title: v.string(),
		body: v.union(v.string(), v.null()),
		authorLogin: v.string(),
		authorAvatarUrl: v.string(),
		state: pullRequestStateValidator,
		baseRef: v.string(),
		headRef: v.string(),
		baseSha: v.string(),
		headSha: v.string(),
		htmlUrl: v.string(),
		diffStorageId: v.id('_storage'),
		diffByteSize: v.number(),
		githubUpdatedAt: v.number(),
		importedAt: v.number(),
		reuseVersionId: v.optional(v.id('pullRequestVersions')),
		reuseVersionNumber: v.optional(v.number()),
		comments: v.array(commentValidator),
	},
	returns: v.id('pullRequests'),
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('pullRequests')
			.withIndex('by_owner_and_repo_and_number', (q) =>
				q.eq('owner', args.owner).eq('repo', args.repo).eq('number', args.number),
			)
			.unique();

		const sharedFields = {
			owner: args.owner,
			repo: args.repo,
			number: args.number,
			title: args.title,
			body: args.body,
			authorLogin: args.authorLogin,
			authorAvatarUrl: args.authorAvatarUrl,
			state: args.state,
			baseRef: args.baseRef,
			headRef: args.headRef,
			baseSha: args.baseSha,
			headSha: args.headSha,
			htmlUrl: args.htmlUrl,
			diffStorageId: args.diffStorageId,
			diffByteSize: args.diffByteSize,
			githubUpdatedAt: args.githubUpdatedAt,
			lastViewedAt: args.importedAt,
			discussionImportedAt: args.importedAt,
		};

		let pullRequestId: Id<'pullRequests'>;
		if (existing) {
			// Legacy backfill: if the row predates the versions table, its diff blob is
			// not referenced by any version row — drop it before overwriting the handle.
			if (
				existing.latestVersionId == null &&
				existing.diffStorageId !== args.diffStorageId
			) {
				await ctx.storage.delete(existing.diffStorageId);
			}
			await ctx.db.patch(existing._id, sharedFields);
			pullRequestId = existing._id;
		} else {
			pullRequestId = await ctx.db.insert('pullRequests', {
				...sharedFields,
				importedAt: args.importedAt,
			});
		}

		let versionId = args.reuseVersionId;
		let versionNumber = args.reuseVersionNumber;
		if (versionId == null || versionNumber == null) {
			const [latest] = await ctx.db
				.query('pullRequestVersions')
				.withIndex('by_pull_request_and_version', (q) =>
					q.eq('pullRequestId', pullRequestId),
				)
				.order('desc')
				.take(1);
			versionNumber = (latest?.versionNumber ?? 0) + 1;
			versionId = await ctx.db.insert('pullRequestVersions', {
				pullRequestId,
				versionNumber,
				baseRef: args.baseRef,
				headRef: args.headRef,
				baseSha: args.baseSha,
				headSha: args.headSha,
				diffStorageId: args.diffStorageId,
				diffByteSize: args.diffByteSize,
				githubUpdatedAt: args.githubUpdatedAt,
				importedAt: args.importedAt,
			});
		}

		await ctx.db.patch(pullRequestId, {
			latestVersionId: versionId,
			latestVersionNumber: versionNumber,
		});

		await replacePullRequestComments(ctx, pullRequestId, args.comments);

		return pullRequestId;
	},
});

export const replaceDiscussion = internalMutation({
	args: {
		pullRequestId: v.id('pullRequests'),
		body: v.union(v.string(), v.null()),
		githubUpdatedAt: v.number(),
		discussionImportedAt: v.number(),
		comments: v.array(commentValidator),
	},
	returns: v.null(),
	handler: async (
		ctx,
		{ pullRequestId, body, githubUpdatedAt, discussionImportedAt, comments },
	) => {
		await ctx.db.patch(pullRequestId, {
			body,
			githubUpdatedAt,
			discussionImportedAt,
		});

		await replacePullRequestComments(ctx, pullRequestId, comments);

		return null;
	},
});

export const list = query({
	args: {},
	returns: v.array(prDoc),
	handler: async (ctx) => {
		await requireSignedIn(ctx);

		return await ctx.db
			.query('pullRequests')
			.withIndex('by_last_viewed')
			.order('desc')
			.take(50);
	},
});

export const listOpen = query({
	args: {},
	returns: v.array(prDoc),
	handler: async (ctx) => {
		await requireSignedIn(ctx);

		return await ctx.db
			.query('pullRequests')
			.withIndex('by_last_viewed')
			.order('desc')
			.filter((q) => q.eq(q.field('state'), PullRequestState.Open))
			.take(50);
	},
});

export const listComments = query({
	args: { pullRequestId: v.id('pullRequests') },
	returns: v.array(prCommentDoc),
	handler: async (ctx, { pullRequestId }) => {
		await requireSignedIn(ctx);

		return await ctx.db
			.query('pullRequestComments')
			.withIndex('by_pull_request_and_created_at', (q) => q.eq('pullRequestId', pullRequestId))
			.order('asc')
			.collect();
	},
});

export const listVersions = query({
	args: { pullRequestId: v.id('pullRequests') },
	returns: v.array(prVersionDoc),
	handler: async (ctx, { pullRequestId }) => {
		await requireSignedIn(ctx);

		return await ctx.db
			.query('pullRequestVersions')
			.withIndex('by_pull_request_and_version', (q) =>
				q.eq('pullRequestId', pullRequestId),
			)
			.order('asc')
			.collect();
	},
});

export const get = query({
	args: { id: v.id('pullRequests') },
	returns: v.union(prWithDiffUrl, v.null()),
	handler: async (ctx, { id }) => {
		await requireSignedIn(ctx);

		const pr = await ctx.db.get(id);
		if (!pr) return null;
		const diffUrl = await ctx.storage.getUrl(pr.diffStorageId);
		return { ...pr, diffUrl };
	},
});

async function fetchGitHubIssueComments(
	url: string,
	baseHeaders: Record<string, string>,
): Promise<GitHubIssueComment[]> {
	const comments: GitHubIssueComment[] = [];
	let nextUrl: string | null = url;

	while (nextUrl) {
		const response = await fetch(nextUrl, {
			headers: { ...baseHeaders, Accept: 'application/vnd.github+json' },
		});

		if (!response.ok) {
			throw new ConvexError(
				getGitHubFetchError({
					resource: 'PR comments',
					status: response.status,
					body: await response.text(),
				}),
			);
		}

		comments.push(...((await response.json()) as GitHubIssueComment[]));
		nextUrl = getNextPageUrl(response.headers.get('link'));
	}

	return comments;
}

function getNextPageUrl(linkHeader: string | null): string | null {
	if (!linkHeader) return null;

	for (const link of linkHeader.split(',')) {
		const match = /<([^>]+)>;\s*rel="next"/.exec(link.trim());
		if (match?.[1]) return match[1];
	}

	return null;
}

function toStoredComment(comment: GitHubIssueComment) {
	return {
		githubId: comment.id,
		authorLogin: comment.user?.login ?? 'ghost',
		authorAvatarUrl: comment.user?.avatar_url ?? '',
		body: comment.body,
		htmlUrl: comment.html_url,
		createdAt: new Date(comment.created_at).getTime(),
		updatedAt: new Date(comment.updated_at).getTime(),
	};
}

async function replacePullRequestComments(
	ctx: MutationCtx,
	pullRequestId: Id<'pullRequests'>,
	comments: StoredComment[],
) {
	const existing = await ctx.db
		.query('pullRequestComments')
		.withIndex('by_pull_request_and_created_at', (q) => q.eq('pullRequestId', pullRequestId))
		.collect();

	await Promise.all(existing.map((comment) => ctx.db.delete(comment._id)));

	for (const comment of [...comments].sort((a, b) => a.createdAt - b.createdAt)) {
		await ctx.db.insert('pullRequestComments', {
			pullRequestId,
			...comment,
		});
	}
}

export const getByPr = query({
	args: {
		owner: v.string(),
		repo: v.string(),
		number: v.number(),
	},
	returns: v.union(prWithDiffUrl, v.null()),
	handler: async (ctx, { owner, repo, number }) => {
		await requireSignedIn(ctx);

		const pr = await ctx.db
			.query('pullRequests')
			.withIndex('by_owner_and_repo_and_number', (q) =>
				q.eq('owner', owner).eq('repo', repo).eq('number', number),
			)
			.unique();
		if (!pr) return null;
		const diffUrl = await ctx.storage.getUrl(pr.diffStorageId);
		return { ...pr, diffUrl };
	},
});

export const touch = mutation({
	args: { id: v.id('pullRequests') },
	returns: v.null(),
	handler: async (ctx, { id }) => {
		await requireSignedIn(ctx);

		await ctx.db.patch(id, { lastViewedAt: Date.now() });
		return null;
	},
});
