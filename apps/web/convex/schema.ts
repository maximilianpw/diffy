import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export default defineSchema({
	...authTables,
	users: defineTable({
		name: v.optional(v.string()),
		image: v.optional(v.string()),
		email: v.optional(v.string()),
		emailVerificationTime: v.optional(v.number()),
		phone: v.optional(v.string()),
		phoneVerificationTime: v.optional(v.number()),
		isAnonymous: v.optional(v.boolean()),
		githubAccessToken: v.optional(v.string()),
	}).index('email', ['email']),
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
		.index('by_owner_and_repo_and_number', ['owner', 'repo', 'number'])
		.index('by_last_viewed', ['lastViewedAt']),
});
