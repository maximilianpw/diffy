import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import {
	mutation,
	query,
	type MutationCtx,
	type QueryCtx,
} from './_generated/server';

async function requireSignedIn(ctx: MutationCtx | QueryCtx): Promise<Id<'users'>> {
	const userId = await getAuthUserId(ctx);
	if (userId == null) {
		throw new ConvexError('Sign in with GitHub before using Diffy.');
	}
	return userId;
}

export const listViewedPaths = query({
	args: {
		pullRequestId: v.id('pullRequests'),
		versionNumber: v.number(),
	},
	returns: v.array(v.string()),
	handler: async (ctx, { pullRequestId, versionNumber }) => {
		const userId = await requireSignedIn(ctx);
		const rows = await ctx.db
			.query('reviewStateViewedFiles')
			.withIndex('by_user_and_pull_request_and_version_and_path', (q) =>
				q
					.eq('userId', userId)
					.eq('pullRequestId', pullRequestId)
					.eq('versionNumber', versionNumber),
			)
			.take(5000);

		return rows.map((row) => row.path);
	},
});

export const setViewedPaths = mutation({
	args: {
		pullRequestId: v.id('pullRequests'),
		versionNumber: v.number(),
		paths: v.array(v.string()),
		viewed: v.boolean(),
	},
	returns: v.null(),
	handler: async (ctx, { pullRequestId, versionNumber, paths, viewed }) => {
		const userId = await requireSignedIn(ctx);
		const uniquePaths = [...new Set(paths)].filter((path) => path.length > 0);
		const viewedAt = Date.now();

		for (const path of uniquePaths) {
			const existing = await ctx.db
				.query('reviewStateViewedFiles')
				.withIndex('by_user_and_pull_request_and_version_and_path', (q) =>
					q
						.eq('userId', userId)
						.eq('pullRequestId', pullRequestId)
						.eq('versionNumber', versionNumber)
						.eq('path', path),
				)
				.unique();

			if (viewed) {
				if (existing) {
					await ctx.db.patch(existing._id, { viewedAt });
				} else {
					await ctx.db.insert('reviewStateViewedFiles', {
						userId,
						pullRequestId,
						versionNumber,
						path,
						viewedAt,
					});
				}
			} else if (existing) {
				await ctx.db.delete(existing._id);
			}
		}

		return null;
	},
});
