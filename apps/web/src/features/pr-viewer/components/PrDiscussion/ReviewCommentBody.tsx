import type { PrReviewCommentDoc } from "../../../../../convex/docTypes";
import {
	getReviewCommentBodyParts,
	ReviewCommentBodyPartType,
} from "../../model/review-comment-format";
import { MarkdownContent } from "../MarkdownContent";
import { ReviewCommentHunk } from "./ReviewCommentHunk";

type ReviewCommentBodyProps = {
	comment: PrReviewCommentDoc;
};

export function ReviewCommentBody({ comment }: ReviewCommentBodyProps) {
	const bodyParts = getReviewCommentBodyParts(comment);

	return (
		<div className="pr-discussion-item__review-body">
			{bodyParts.map((part) =>
				part.type === ReviewCommentBodyPartType.Markdown ? (
					<MarkdownContent key={getReviewCommentBodyPartKey(part)}>
						{part.markdown}
					</MarkdownContent>
				) : (
					<details
						className="pr-discussion-item__suggestion"
						key={getReviewCommentBodyPartKey(part)}
						open
					>
						<summary className="pr-discussion-item__suggestion-summary">
							Suggested fix
						</summary>
						<ReviewCommentHunk patch={part.patch} />
					</details>
				),
			)}
		</div>
	);
}

function getReviewCommentBodyPartKey(
	part: ReturnType<typeof getReviewCommentBodyParts>[number],
): string {
	return part.type === ReviewCommentBodyPartType.Markdown
		? `${part.type}:${part.markdown}`
		: `${part.type}:${part.patch}`;
}
