type PrDiscussionSnapshot = {
	discussionImportedAt?: number | null;
};

export function shouldBackfillDiscussion(
	pr: PrDiscussionSnapshot | null,
): boolean {
	return pr != null && pr.discussionImportedAt == null;
}
