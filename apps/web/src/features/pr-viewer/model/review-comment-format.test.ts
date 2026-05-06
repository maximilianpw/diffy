import { PullRequestReviewCommentSide } from "@diffy/shared";
import { describe, expect, it } from "vitest";
import type { PrReviewCommentDoc } from "../../../../convex/docTypes";
import {
	getReviewCommentBodyParts,
	getReviewCommentLocation,
	getReviewCommentPatch,
	getSuggestedChangePatch,
	ReviewCommentBodyPartType,
} from "./review-comment-format";

function fixtureReviewComment(
	overrides: Partial<PrReviewCommentDoc> = {},
): PrReviewCommentDoc {
	return {
		_id: "review_comment_test" as PrReviewCommentDoc["_id"],
		_creationTime: 0,
		pullRequestId: "pr_test" as PrReviewCommentDoc["pullRequestId"],
		githubId: 789,
		authorLogin: "lauren",
		authorAvatarUrl: "https://example.com/reviewer.png",
		body: "Could we keep this branch covered?",
		htmlUrl: "https://github.com/tanstack/router/pull/123#discussion_r789",
		path: "packages/router/src/index.ts",
		diffHunk: "@@ -1 +1 @@\n-old\n+new",
		side: PullRequestReviewCommentSide.Right,
		line: 1,
		originalLine: 1,
		position: 2,
		originalPosition: 2,
		createdAt: new Date("2026-04-12T12:00:00Z").getTime(),
		updatedAt: new Date("2026-04-12T12:00:00Z").getTime(),
		...overrides,
	};
}

describe("review comment formatting", () => {
	it("formats file and line context for a review comment", () => {
		expect(getReviewCommentLocation(fixtureReviewComment())).toBe(
			"packages/router/src/index.ts:1",
		);
	});

	it("normalizes a GitHub review comment hunk into a single-file patch", () => {
		expect(
			getReviewCommentPatch(fixtureReviewComment()),
		).toBe(`diff --git a/packages/router/src/index.ts b/packages/router/src/index.ts
--- a/packages/router/src/index.ts
+++ b/packages/router/src/index.ts
@@ -1 +1 @@
-old
+new
`);
	});

	it("splits GitHub suggested-change fences out of review comment markdown", () => {
		const parts = getReviewCommentBodyParts(
			fixtureReviewComment({
				body: `Make the lookup miss retriable.

\`\`\`suggestion
const retryable = new Error("missing row");
retryable.code = "23503";
throw retryable;
\`\`\`

This should keep retries working.`,
				diffHunk: `@@ -9,5 +9,5 @@
 if (!rows[0]) {
   throw new Error(
     "missing row",
   );
 }`,
				startLine: 9,
				line: 13,
			}),
		);

		expect(parts).toHaveLength(3);
		expect(parts[0]).toEqual({
			type: ReviewCommentBodyPartType.Markdown,
			markdown: "Make the lookup miss retriable.",
		});
		expect(parts[1]).toMatchObject({
			type: ReviewCommentBodyPartType.Suggestion,
			suggestion: `const retryable = new Error("missing row");
retryable.code = "23503";
throw retryable;`,
		});
		expect(parts[2]).toEqual({
			type: ReviewCommentBodyPartType.Markdown,
			markdown: "This should keep retries working.",
		});
	});

	it("consumes CodeRabbit details wrappers around suggested changes", () => {
		const parts = getReviewCommentBodyParts(
			fixtureReviewComment({
				body: `Make the lookup miss retriable.

<details>
<summary>Suggested fix</summary>

\`\`\`suggestion
throw retryable;
\`\`\`

</details>`,
			}),
		);

		expect(parts).toHaveLength(2);
		expect(parts[0]).toEqual({
			type: ReviewCommentBodyPartType.Markdown,
			markdown: "Make the lookup miss retriable.",
		});
		expect(parts[1]).toMatchObject({
			type: ReviewCommentBodyPartType.Suggestion,
			suggestion: "throw retryable;",
		});
	});

	it("turns a suggested change into a reviewable patch", () => {
		expect(
			getSuggestedChangePatch(
				fixtureReviewComment({
					diffHunk: `@@ -9,5 +9,5 @@
 if (!rows[0]) {
   throw new Error(
     "missing row",
   );
 }`,
					startLine: 9,
					line: 13,
				}),
				`const retryable = new Error("missing row");
retryable.code = "23503";
throw retryable;`,
			),
		).toBe(`diff --git a/packages/router/src/index.ts b/packages/router/src/index.ts
--- a/packages/router/src/index.ts
+++ b/packages/router/src/index.ts
@@ -1,5 +1,3 @@
-if (!rows[0]) {
-  throw new Error(
-    "missing row",
-  );
-}
+const retryable = new Error("missing row");
+retryable.code = "23503";
+throw retryable;
`);
	});
});
