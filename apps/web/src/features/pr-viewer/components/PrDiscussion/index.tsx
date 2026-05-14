import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { PrDoc } from "../../../../../convex/docTypes";
import type { DiffLocationTarget } from "../../model/diff-location";
import {
	type DiscussionTimelineItem,
	DiscussionTimelineItemType,
	getDiscussionTimelineItems,
} from "../../model/discussion-timeline";
import {
	DISCUSSION_REVEAL_BATCH_SIZE,
	getDiscussionWindow,
} from "../../model/discussion-window";
import { DiscussionItem } from "./DiscussionItem";
import "./PrDiscussion.scss";
import { ReviewCommentBody } from "./ReviewCommentBody";
import { ReviewCommentContext } from "./ReviewCommentContext";

type PrDiscussionProps = {
	pr: PrDoc;
	onJumpToDiffLocation?: (target: DiffLocationTarget) => void;
};

export function PrDiscussion({ pr, onJumpToDiffLocation }: PrDiscussionProps) {
	const [revealedMiddleCount, setRevealedMiddleCount] = useState(0);
	const comments =
		useQuery(api.pullRequests.listComments, { pullRequestId: pr._id }) ?? [];
	const reviewComments =
		useQuery(api.pullRequests.listReviewComments, { pullRequestId: pr._id }) ??
		[];
	const body = pr.body?.trim();
	const timelineItems = getDiscussionTimelineItems(comments, reviewComments);
	const discussionWindow = getDiscussionWindow(timelineItems, {
		revealedMiddleCount,
	});
	const controlSplitsTimeline = discussionWindow.hiddenMiddleCount > 0;
	const itemsBeforeControl = controlSplitsTimeline
		? discussionWindow.visibleItems.slice(0, -3)
		: discussionWindow.visibleItems;
	const itemsAfterControl = controlSplitsTimeline
		? discussionWindow.visibleItems.slice(-3)
		: [];
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
			{itemsBeforeControl.map((item) => (
				<TimelineItem
					key={item.comment._id}
					item={item}
					pr={pr}
					onJumpToDiffLocation={onJumpToDiffLocation}
				/>
			))}
			{controlSplitsTimeline ? (
				<div className="pr-discussion__middle-control">
					<button
						type="button"
						className="pr-discussion__middle-button"
						onClick={() =>
							setRevealedMiddleCount(
								(count) => count + DISCUSSION_REVEAL_BATCH_SIZE,
							)
						}
					>
						Show {discussionWindow.nextRevealCount} more{" "}
						{discussionWindow.nextRevealCount === 1 ? "comment" : "comments"}
					</button>
				</div>
			) : null}
			{itemsAfterControl.map((item) => (
				<TimelineItem
					key={item.comment._id}
					item={item}
					pr={pr}
					onJumpToDiffLocation={onJumpToDiffLocation}
				/>
			))}
		</section>
	);
}

function TimelineItem({
	item,
	pr,
	onJumpToDiffLocation,
}: {
	item: DiscussionTimelineItem;
	pr: PrDoc;
	onJumpToDiffLocation?: (target: DiffLocationTarget) => void;
}) {
	return item.type === DiscussionTimelineItemType.Comment ? (
		<DiscussionItem
			authorLogin={item.comment.authorLogin}
			authorAvatarUrl={item.comment.authorAvatarUrl}
			createdAt={item.comment.createdAt}
			eventLabel="commented"
			isAuthor={item.comment.authorLogin === pr.authorLogin}
			body={item.comment.body}
		/>
	) : (
		<DiscussionItem
			authorLogin={item.comment.authorLogin}
			authorAvatarUrl={item.comment.authorAvatarUrl}
			createdAt={item.comment.createdAt}
			eventLabel={`commented on ${item.comment.path}`}
			isAuthor={item.comment.authorLogin === pr.authorLogin}
			body={item.comment.body}
			bodyContent={<ReviewCommentBody comment={item.comment} />}
			reviewContext={
				<ReviewCommentContext
					comment={item.comment}
					onJumpToDiffLocation={onJumpToDiffLocation}
				/>
			}
		/>
	);
}
