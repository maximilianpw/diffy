import { v } from 'convex/values';
import { internal } from './_generated/api';
import { action, internalMutation, mutation, query } from './_generated/server';

const GITHUB_API = 'https://api.github.com';

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

export const importPr = action({
	args: {
		owner: v.string(),
		repo: v.string(),
		number: v.number(),
		token: v.string(),
	},
	handler: async (ctx, { owner, repo, number, token }) => {
		const baseHeaders = {
			Authorization: `Bearer ${token}`,
			'X-GitHub-Api-Version': '2022-11-28',
			'User-Agent': 'diffy',
		};
		const url = `${GITHUB_API}/repos/${owner}/${repo}/pulls/${number}`;

		const [metaRes, diffRes] = await Promise.all([
			fetch(url, { headers: { ...baseHeaders, Accept: 'application/vnd.github+json' } }),
			fetch(url, { headers: { ...baseHeaders, Accept: 'application/vnd.github.diff' } }),
		]);

		if (!metaRes.ok) {
			throw new Error(`GitHub PR metadata fetch failed: ${metaRes.status} ${await metaRes.text()}`);
		}
		if (!diffRes.ok) {
			throw new Error(`GitHub PR diff fetch failed: ${diffRes.status} ${await diffRes.text()}`);
		}

		const meta = await metaRes.json();
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

export const upsert = internalMutation({
	args: prFields,
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('pullRequests')
			.withIndex('by_pr', (q) =>
				q.eq('owner', args.owner).eq('repo', args.repo).eq('number', args.number),
			)
			.first();

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
	handler: async (ctx) => {
		return await ctx.db
			.query('pullRequests')
			.withIndex('by_last_viewed')
			.order('desc')
			.collect();
	},
});

export const get = query({
	args: { id: v.id('pullRequests') },
	handler: async (ctx, { id }) => {
		const pr = await ctx.db.get(id);
		if (!pr) return null;
		const diffUrl = await ctx.storage.getUrl(pr.diffStorageId);
		return { ...pr, diffUrl };
	},
});

export const touch = mutation({
	args: { id: v.id('pullRequests') },
	handler: async (ctx, { id }) => {
		await ctx.db.patch(id, { lastViewedAt: Date.now() });
	},
});
