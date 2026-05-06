import type {
	PrCommentDoc,
	PrReviewCommentDoc,
} from "../../../../convex/docTypes";

export type DiscussionTimelineItem =
	| {
			type: DiscussionTimelineItemType.Comment;
			comment: PrCommentDoc;
			createdAt: number;
	  }
	| {
			type: DiscussionTimelineItemType.ReviewComment;
			comment: PrReviewCommentDoc;
			createdAt: number;
	  };

export enum DiscussionTimelineItemType {
	Comment = "comment",
	ReviewComment = "reviewComment",
}

export function getDiscussionTimelineItems(
	comments: PrCommentDoc[],
	reviewComments: PrReviewCommentDoc[],
): DiscussionTimelineItem[] {
	return [
		...comments.map(
			(comment): DiscussionTimelineItem => ({
				type: DiscussionTimelineItemType.Comment,
				comment,
				createdAt: comment.createdAt,
			}),
		),
		...reviewComments.map(
			(comment): DiscussionTimelineItem => ({
				type: DiscussionTimelineItemType.ReviewComment,
				comment,
				createdAt: comment.createdAt,
			}),
		),
	].sort((a, b) => a.createdAt - b.createdAt);
}
