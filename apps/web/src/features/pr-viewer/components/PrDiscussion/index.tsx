import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { PrDoc } from "../../../../../convex/docTypes";
import {
	DiscussionTimelineItemType,
	getDiscussionTimelineItems,
} from "../../model/discussion-timeline";
import { DiscussionItem } from "./DiscussionItem";
import "./PrDiscussion.scss";
import { ReviewCommentBody } from "./ReviewCommentBody";
import { ReviewCommentContext } from "./ReviewCommentContext";

type PrDiscussionProps = {
	pr: PrDoc;
};

export function PrDiscussion({ pr }: PrDiscussionProps) {
	const comments =
		useQuery(api.pullRequests.listComments, { pullRequestId: pr._id }) ?? [];
	const reviewComments =
		useQuery(api.pullRequests.listReviewComments, { pullRequestId: pr._id }) ??
		[];
	const body = pr.body?.trim();
	const timelineItems = getDiscussionTimelineItems(comments, reviewComments);
	if (!body && timelineItems.length === 0) return null;

	return (
		<section aria-label="Pull request discussion" className="pr-discussion">
			{body ? (
				<DiscussionItem
					authorLogin={pr.authorLogin}
					authorAvatarUrl={pr.authorAvatarUrl}
					eventLabel="opened this pull request"
					isAuthor={true}
					body={body}
				/>
			) : null}
			{timelineItems.map((item) =>
				item.type === DiscussionTimelineItemType.Comment ? (
					<DiscussionItem
						key={item.comment._id}
						authorLogin={item.comment.authorLogin}
						authorAvatarUrl={item.comment.authorAvatarUrl}
						createdAt={item.comment.createdAt}
						eventLabel="commented"
						isAuthor={item.comment.authorLogin === pr.authorLogin}
						body={item.comment.body}
					/>
				) : (
					<DiscussionItem
						key={item.comment._id}
						authorLogin={item.comment.authorLogin}
						authorAvatarUrl={item.comment.authorAvatarUrl}
						createdAt={item.comment.createdAt}
						eventLabel={`commented on ${item.comment.path}`}
						isAuthor={item.comment.authorLogin === pr.authorLogin}
						body={item.comment.body}
						bodyContent={<ReviewCommentBody comment={item.comment} />}
						reviewContext={<ReviewCommentContext comment={item.comment} />}
					/>
				),
			)}
		</section>
	);
}
