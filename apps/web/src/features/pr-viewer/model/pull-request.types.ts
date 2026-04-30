import type { Doc } from "../../../../convex/_generated/dataModel";

export type PullRequestState = Doc<"pullRequests">["state"];

export enum PullRequestStateLabel {
	open = "Open",
	closed = "Closed",
	merged = "Merged",
}

export enum PullRequestStateBadgeVariant {
	open = "default",
	closed = "outline",
	merged = "secondary",
}
