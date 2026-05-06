import { LocateFixed } from "lucide-react";
import { Button } from "#/components/ui/button";
import type { PrReviewCommentDoc } from "../../../../../convex/docTypes";
import {
	type DiffLocationTarget,
	getReviewCommentDiffLocation,
} from "../../model/diff-location";
import {
	getReviewCommentLocation,
	getReviewCommentPatch,
} from "../../model/review-comment-format";
import { ReviewCommentHunk } from "./ReviewCommentHunk";

type ReviewCommentContextProps = {
	comment: PrReviewCommentDoc;
	onJumpToDiffLocation?: (target: DiffLocationTarget) => void;
};

export function ReviewCommentContext({
	comment,
	onJumpToDiffLocation,
}: ReviewCommentContextProps) {
	const location = getReviewCommentLocation(comment);
	const patch = getReviewCommentPatch(comment);
	const diffLocation = getReviewCommentDiffLocation(comment);

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
				{diffLocation && onJumpToDiffLocation ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						aria-label={`View ${location} in full diff`}
						onClick={() => onJumpToDiffLocation(diffLocation)}
					>
						<LocateFixed data-icon="inline-start" />
						View in full diff
					</Button>
				) : null}
			</div>
			<ReviewCommentHunk patch={patch} />
		</div>
	);
}
