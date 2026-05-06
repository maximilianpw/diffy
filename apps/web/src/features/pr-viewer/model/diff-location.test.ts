import { PullRequestReviewCommentSide } from "@diffy/shared";
import { describe, expect, it } from "vitest";
import type { PrReviewCommentDoc } from "../../../../convex/docTypes";
import {
	DiffLocationSide,
	getReviewCommentDiffLocation,
	getSelectedLinesForDiffLocation,
} from "./diff-location";

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
		line: 10,
		originalLine: 8,
		position: 2,
		originalPosition: 2,
		createdAt: new Date("2026-04-12T12:00:00Z").getTime(),
		updatedAt: new Date("2026-04-12T12:00:00Z").getTime(),
		...overrides,
	};
}

describe("diff location targets", () => {
	it("maps right-side review comments to addition line selections", () => {
		const location = getReviewCommentDiffLocation(fixtureReviewComment());

		expect(location).toEqual({
			path: "packages/router/src/index.ts",
			line: 10,
			side: DiffLocationSide.Additions,
		});
		expect(location && getSelectedLinesForDiffLocation(location)).toEqual({
			start: 10,
			end: 10,
			side: DiffLocationSide.Additions,
			endSide: DiffLocationSide.Additions,
		});
	});

	it("maps left-side review comments to deletion line selections", () => {
		expect(
			getReviewCommentDiffLocation(
				fixtureReviewComment({
					side: PullRequestReviewCommentSide.Left,
					line: undefined,
					originalLine: 8,
				}),
			),
		).toEqual({
			path: "packages/router/src/index.ts",
			line: 8,
			side: DiffLocationSide.Deletions,
		});
	});
});
