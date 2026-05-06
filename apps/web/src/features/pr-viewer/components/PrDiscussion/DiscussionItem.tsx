import type { ReactNode } from "react";
import { MarkdownContent } from "../MarkdownContent";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
	year: "numeric",
	month: "short",
	day: "numeric",
});

type DiscussionItemProps = {
	authorLogin: string;
	authorAvatarUrl: string;
	createdAt?: number;
	eventLabel: string;
	isAuthor: boolean;
	body: string;
	bodyContent?: ReactNode;
	reviewContext?: ReactNode;
};

export function DiscussionItem({
	authorLogin,
	authorAvatarUrl,
	createdAt,
	eventLabel,
	isAuthor,
	body,
	bodyContent,
	reviewContext,
}: DiscussionItemProps) {
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
				{reviewContext}
				<div className="pr-discussion-item__body">
					{bodyContent ?? <MarkdownContent>{body}</MarkdownContent>}
				</div>
			</div>
		</article>
	);
}
