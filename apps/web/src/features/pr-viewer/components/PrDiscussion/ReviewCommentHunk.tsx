import { PatchDiff } from "@pierre/diffs/react";
import { REVIEW_COMMENT_DIFF_VIEWER_OPTIONS } from "../../model/diff-viewer-options";

type ReviewCommentHunkProps = {
	patch: string;
};

export function ReviewCommentHunk({ patch }: ReviewCommentHunkProps) {
	return (
		<PatchDiff
			className="pr-discussion-item__diff-viewer"
			patch={patch}
			options={REVIEW_COMMENT_DIFF_VIEWER_OPTIONS}
		/>
	);
}
