import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
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

type GitHubPrMeta = {
	title: string;
	body: string | null;
	merged_at: string | null;
	state: 'open' | 'closed';
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

const prFields = {
	owner: v.string(),
	repo: v.string(),
	number: v.number(),
	title: v.string(),
	body: v.optional(v.union(v.string(), v.null())),
	authorLogin: v.string(),
	authorAvatarUrl: v.string(),
	state: v.union(v.literal('open'), v.literal('closed'), v.literal('merged')),
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
	discussionImportedAt: v.optional(v.number()),
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

const prWithDiffUrl = v.object({
	_id: v.id('pullRequests'),
	_creationTime: v.number(),
	...prFields,
	diffUrl: v.union(v.string(), v.null()),
});

async function requireSignedIn(ctx: ActionCtx | MutationCtx | QueryCtx): Promise<Id<'users'>> {
	const userId = await getAuthUserId(ctx);
	if (userId == null) {
		throw new Error('Sign in with GitHub before using Diffy.');
	}
	return userId;
}

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
			throw new Error('GitHub access token is missing. Sign out and sign in with GitHub again.');
		}

		const baseHeaders: Record<string, string> = {
			Authorization: `Bearer ${token}`,
			'X-GitHub-Api-Version': '2022-11-28',
			'User-Agent': 'diffy',
		};
		const url = `${GITHUB_API}/repos/${owner}/${repo}/pulls/${number}`;
		const commentsUrl = `${GITHUB_API}/repos/${owner}/${repo}/issues/${number}/comments?per_page=100`;

		const [metaRes, diffRes, comments]: [Response, Response, GitHubIssueComment[]] = await Promise.all([
			fetch(url, { headers: { ...baseHeaders, Accept: 'application/vnd.github+json' } }),
			fetch(url, { headers: { ...baseHeaders, Accept: 'application/vnd.github.diff' } }),
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
		if (!diffRes.ok) {
			throw new ConvexError(
				getGitHubFetchError({
					resource: 'PR diff',
					status: diffRes.status,
					body: await diffRes.text(),
				}),
			);
		}

		const meta = (await metaRes.json()) as GitHubPrMeta;
		const diffBlob = await diffRes.blob();

		const diffStorageId = await ctx.storage.store(diffBlob);

		const state: 'open' | 'closed' | 'merged' =
			meta.merged_at != null ? 'merged' : meta.state === 'closed' ? 'closed' : 'open';

		const now = Date.now();

		const pullRequestId = await ctx.runMutation(internal.pullRequests.upsert, {
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
			diffByteSize: diffBlob.size,
			importedAt: now,
			lastViewedAt: now,
			githubUpdatedAt: new Date(meta.updated_at).getTime(),
			discussionImportedAt: now,
		});

		await ctx.runMutation(internal.pullRequests.replaceComments, {
			pullRequestId,
			comments: comments.map(toStoredComment),
		});

		return pullRequestId;
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
			throw new Error('GitHub access token is missing. Sign out and sign in with GitHub again.');
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

export const upsert = internalMutation({
	args: prFields,
	returns: v.id('pullRequests'),
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('pullRequests')
			.withIndex('by_owner_and_repo_and_number', (q) =>
				q.eq('owner', args.owner).eq('repo', args.repo).eq('number', args.number),
			)
			.unique();

		if (existing) {
			await ctx.storage.delete(existing.diffStorageId);
			await ctx.db.patch(existing._id, { ...args, importedAt: existing.importedAt });
			return existing._id;
		}

		return await ctx.db.insert('pullRequests', args);
	},
});

export const replaceDiscussion = internalMutation({
	args: {
		pullRequestId: v.id('pullRequests'),
		body: v.union(v.string(), v.null()),
		githubUpdatedAt: v.number(),
		discussionImportedAt: v.number(),
		comments: v.array(
			v.object({
				githubId: v.number(),
				authorLogin: v.string(),
				authorAvatarUrl: v.string(),
				body: v.string(),
				htmlUrl: v.string(),
				createdAt: v.number(),
				updatedAt: v.number(),
			}),
		),
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

export const replaceComments = internalMutation({
	args: {
		pullRequestId: v.id('pullRequests'),
		comments: v.array(
			v.object({
				githubId: v.number(),
				authorLogin: v.string(),
				authorAvatarUrl: v.string(),
				body: v.string(),
				htmlUrl: v.string(),
				createdAt: v.number(),
				updatedAt: v.number(),
			}),
		),
	},
	returns: v.null(),
	handler: async (ctx, { pullRequestId, comments }) => {
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
			.filter((q) => q.eq(q.field('state'), 'open'))
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
	comments: Array<{
		githubId: number;
		authorLogin: string;
		authorAvatarUrl: string;
		body: string;
		htmlUrl: string;
		createdAt: number;
		updatedAt: number;
	}>,
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
