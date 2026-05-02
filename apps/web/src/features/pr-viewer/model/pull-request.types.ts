import { PullRequestState } from "@diffy/shared";

export { PullRequestState };

export const PullRequestStateLabel: Record<PullRequestState, string> = {
	[PullRequestState.Open]: "Open",
	[PullRequestState.Closed]: "Closed",
	[PullRequestState.Merged]: "Merged",
};

export const PullRequestStateBadgeVariant: Record<
	PullRequestState,
	"default" | "outline" | "secondary"
> = {
	[PullRequestState.Open]: "default",
	[PullRequestState.Closed]: "outline",
	[PullRequestState.Merged]: "secondary",
};
