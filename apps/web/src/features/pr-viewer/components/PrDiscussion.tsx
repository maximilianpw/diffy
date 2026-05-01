import type { Doc } from "../../../../convex/_generated/dataModel";
import { MarkdownContent } from "./MarkdownContent";
import "./PrDiscussion.scss";

type PrDoc = Doc<"pullRequests">;
type PrCommentDoc = Doc<"pullRequestComments">;

type PrDiscussionProps = {
	pr: PrDoc;
	comments: PrCommentDoc[];
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
	year: "numeric",
	month: "short",
	day: "numeric",
});

export function PrDiscussion({ pr, comments }: PrDiscussionProps) {
	const body = pr.body?.trim();
	if (!body && comments.length === 0) return null;

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
			{comments.map((comment) => (
				<DiscussionItem
					key={comment._id}
					authorLogin={comment.authorLogin}
					authorAvatarUrl={comment.authorAvatarUrl}
					createdAt={comment.createdAt}
					eventLabel="commented"
					isAuthor={comment.authorLogin === pr.authorLogin}
					body={comment.body}
				/>
			))}
		</section>
	);
}

function DiscussionItem({
	authorLogin,
	authorAvatarUrl,
	createdAt,
	eventLabel,
	isAuthor,
	body,
}: {
	authorLogin: string;
	authorAvatarUrl: string;
	createdAt?: number;
	eventLabel: string;
	isAuthor: boolean;
	body: string;
}) {
	const createdAtDate =
		typeof createdAt === "number" ? new Date(createdAt) : null;
	const formattedDate = createdAtDate
		? dateFormatter.format(createdAtDate)
		: null;
	const accessibleName = formattedDate
		? `${authorLogin} ${eventLabel} ${formattedDate}`
		: `${authorLogin} ${eventLabel}`;

	return (
		<article className="pr-discussion-item" aria-label={accessibleName}>
			{authorAvatarUrl ? (
				<img
					src={authorAvatarUrl}
					alt=""
					width={40}
					height={40}
					className="pr-discussion-item__avatar"
				/>
			) : (
				<div className="pr-discussion-item__avatar" aria-hidden="true">
					{authorLogin.slice(0, 1).toUpperCase()}
				</div>
			)}
			<div className="pr-discussion-item__card">
				<header className="pr-discussion-item__header">
					<span className="pr-discussion-item__author">{authorLogin}</span>
					<span>{eventLabel}</span>
					{createdAtDate && formattedDate ? (
						<time
							className="pr-discussion-item__time"
							dateTime={createdAtDate.toISOString()}
						>
							{formattedDate}
						</time>
					) : null}
					{isAuthor ? (
						<span className="pr-discussion-item__badge">Author</span>
					) : null}
				</header>
				<div className="pr-discussion-item__body">
					<MarkdownContent>{body}</MarkdownContent>
				</div>
			</div>
		</article>
	);
}
