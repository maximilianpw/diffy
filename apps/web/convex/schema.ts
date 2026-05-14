import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';
import {
	GitHubCredentialHealth,
	GitHubCredentialScope,
	PullRequestReviewCommentSide,
	PullRequestState,
} from '@diffy/shared';

const pullRequestStateValidator = v.union(
	v.literal(PullRequestState.Open),
	v.literal(PullRequestState.Closed),
	v.literal(PullRequestState.Merged),
);

const pullRequestReviewCommentSideValidator = v.union(
	v.literal(PullRequestReviewCommentSide.Left),
	v.literal(PullRequestReviewCommentSide.Right),
);

const githubCredentialHealthValidator = v.union(
	v.literal(GitHubCredentialHealth.Healthy),
	v.literal(GitHubCredentialHealth.Unhealthy),
);

const githubCredentialScopeValidator = v.union(
	v.literal(GitHubCredentialScope.Repository),
);

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
		body: v.optional(v.union(v.string(), v.null())),
		authorLogin: v.string(),
		authorAvatarUrl: v.string(),
		state: pullRequestStateValidator,
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
		latestVersionId: v.optional(v.id('pullRequestVersions')),
		latestVersionNumber: v.optional(v.number()),
		discussionImportedAt: v.optional(v.number()),
		reviewCommentsImportedAt: v.optional(v.number()),
	})
		.index('by_owner_and_repo_and_number', ['owner', 'repo', 'number'])
		.index('by_last_viewed', ['lastViewedAt']),
	pullRequestVersions: defineTable({
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
	})
		.index('by_pull_request_and_version', ['pullRequestId', 'versionNumber'])
		.index('by_pull_request_and_diff_identity', [
			'pullRequestId',
			'baseSha',
			'headSha',
		])
		.index('by_pull_request_and_imported_at', ['pullRequestId', 'importedAt']),
	pullRequestComments: defineTable({
		pullRequestId: v.id('pullRequests'),
		githubId: v.number(),
		authorLogin: v.string(),
		authorAvatarUrl: v.string(),
		body: v.string(),
		htmlUrl: v.string(),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index('by_pull_request_and_created_at', ['pullRequestId', 'createdAt'])
		.index('by_pull_request_and_github_id', ['pullRequestId', 'githubId']),
	pullRequestReviewComments: defineTable({
		pullRequestId: v.id('pullRequests'),
		githubId: v.number(),
		pullRequestReviewId: v.optional(v.number()),
		authorLogin: v.string(),
		authorAvatarUrl: v.string(),
		body: v.string(),
		htmlUrl: v.string(),
		path: v.string(),
		diffHunk: v.string(),
		side: v.optional(pullRequestReviewCommentSideValidator),
		startSide: v.optional(pullRequestReviewCommentSideValidator),
		line: v.optional(v.number()),
		originalLine: v.optional(v.number()),
		startLine: v.optional(v.number()),
		originalStartLine: v.optional(v.number()),
		position: v.optional(v.number()),
		originalPosition: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index('by_pull_request_and_created_at', ['pullRequestId', 'createdAt'])
		.index('by_pull_request_and_github_id', ['pullRequestId', 'githubId']),
	reviewStateViewedFiles: defineTable({
		userId: v.id('users'),
		pullRequestId: v.id('pullRequests'),
		versionNumber: v.number(),
		path: v.string(),
		viewedAt: v.number(),
	}).index('by_user_and_pull_request_and_version_and_path', [
		'userId',
		'pullRequestId',
		'versionNumber',
		'path',
	]),
	githubCredentials: defineTable({
		userId: v.id('users'),
		scope: githubCredentialScopeValidator,
		owner: v.string(),
		repo: v.string(),
		encryptedToken: v.string(),
		iv: v.string(),
		tokenLastFour: v.string(),
		scopeLabel: v.string(),
		health: githubCredentialHealthValidator,
		createdAt: v.number(),
		updatedAt: v.number(),
		lastVerifiedAt: v.optional(v.number()),
		lastFailure: v.optional(v.string()),
	})
		.index('by_user_owner_repo', ['userId', 'owner', 'repo'])
		.index('by_user_updated_at', ['userId', 'updatedAt']),
});
