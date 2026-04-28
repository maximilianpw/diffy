import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
	pullRequests: defineTable({
		// Natural identity from GitHub
		owner: v.string(),
		repo: v.string(),
		number: v.number(),

		// Metadata snapshot (from GET /pulls/{n})
		title: v.string(),
		authorLogin: v.string(),
		authorAvatarUrl: v.string(),
		state: v.union(v.literal('open'), v.literal('closed'), v.literal('merged')),
		baseRef: v.string(),
		headRef: v.string(),
		baseSha: v.string(),
		headSha: v.string(),
		htmlUrl: v.string(),

		// Raw unified diff lives in Convex file storage; the row only holds the handle.
		diffStorageId: v.id('_storage'),
		diffByteSize: v.number(),

		importedAt: v.number(),
		lastViewedAt: v.number(),
		githubUpdatedAt: v.number(),
	})
		.index('by_pr', ['owner', 'repo', 'number'])
		.index('by_last_viewed', ['lastViewedAt']),
});
