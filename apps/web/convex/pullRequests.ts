import { v } from 'convex/values';
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

const GITHUB_API = 'https://api.github.com';

type GitHubPrMeta = {
	title: string;
	merged_at: string | null;
	state: 'open' | 'closed';
	updated_at: string;
	html_url: string;
	user: { login: string; avatar_url: string };
	base: { ref: string; sha: string };
	head: { ref: string; sha: string };
};

const prFields = {
	owner: v.string(),
	repo: v.string(),
	number: v.number(),
	title: v.string(),
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
};

const prDoc = v.object({
	_id: v.id('pullRequests'),
	_creationTime: v.number(),
	...prFields,
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

		const [metaRes, diffRes]: [Response, Response] = await Promise.all([
			fetch(url, { headers: { ...baseHeaders, Accept: 'application/vnd.github+json' } }),
			fetch(url, { headers: { ...baseHeaders, Accept: 'application/vnd.github.diff' } }),
		]);

		if (!metaRes.ok) {
			throw new Error(`GitHub PR metadata fetch failed: ${metaRes.status} ${await metaRes.text()}`);
		}
		if (!diffRes.ok) {
			throw new Error(`GitHub PR diff fetch failed: ${diffRes.status} ${await diffRes.text()}`);
		}

		const meta = (await metaRes.json()) as GitHubPrMeta;
		const diffBlob = await diffRes.blob();

		const diffStorageId = await ctx.storage.store(diffBlob);

		const state: 'open' | 'closed' | 'merged' =
			meta.merged_at != null ? 'merged' : meta.state === 'closed' ? 'closed' : 'open';

		const now = Date.now();

		return await ctx.runMutation(internal.pullRequests.upsert, {
			owner,
			repo,
			number,
			title: meta.title,
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
		});
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
