import type { PrReviewCommentDoc } from "../../../../../convex/docTypes";
import {
	getReviewCommentLocation,
	getReviewCommentPatch,
} from "../../model/review-comment-format";
import { ReviewCommentHunk } from "./ReviewCommentHunk";

type ReviewCommentContextProps = {
	comment: PrReviewCommentDoc;
};

export function ReviewCommentContext({ comment }: ReviewCommentContextProps) {
	const location = getReviewCommentLocation(comment);
	const patch = getReviewCommentPatch(comment);

	return (
		<div className="pr-discussion-item__review-context">
			<div className="pr-discussion-item__review-toolbar">
				<a
					className="pr-discussion-item__review-location"
					href={comment.htmlUrl}
					target="_blank"
					rel="noreferrer"
				>
					{location}
				</a>
			</div>
			<ReviewCommentHunk patch={patch} />
		</div>
	);
}
