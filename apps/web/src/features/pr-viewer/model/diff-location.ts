import { PullRequestReviewCommentSide } from "@diffy/shared";
import type { SelectedLineRange } from "@pierre/diffs";
import type { PrReviewCommentDoc } from "../../../../convex/docTypes";

export enum DiffLocationSide {
	Additions = "additions",
	Deletions = "deletions",
}

export type DiffLocationTarget = {
	path: string;
	line: number;
	side: DiffLocationSide;
};

export function getReviewCommentDiffLocation(
	comment: PrReviewCommentDoc,
): DiffLocationTarget | null {
	const isLeftSide = comment.side === PullRequestReviewCommentSide.Left;
	const line = isLeftSide
		? (comment.originalLine ?? comment.originalStartLine)
		: (comment.line ?? comment.startLine);

	if (line == null || !comment.path) return null;

	return {
		path: comment.path,
		line,
		side: isLeftSide ? DiffLocationSide.Deletions : DiffLocationSide.Additions,
	};
}

export function getSelectedLinesForDiffLocation(
	location: DiffLocationTarget,
): SelectedLineRange {
	return {
		start: location.line,
		end: location.line,
		side: location.side,
		endSide: location.side,
	};
}
