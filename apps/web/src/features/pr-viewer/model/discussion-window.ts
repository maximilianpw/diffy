export const DISCUSSION_VISIBLE_EDGE_COUNT = 3;
export const DISCUSSION_REVEAL_BATCH_SIZE = 10;

type DiscussionWindowOptions = {
	revealedMiddleCount: number;
};

export type DiscussionWindow<T> = {
	visibleItems: T[];
	hiddenMiddleCount: number;
	nextRevealCount: number;
};

export function getDiscussionWindow<T>(
	items: readonly T[],
	{ revealedMiddleCount }: DiscussionWindowOptions,
): DiscussionWindow<T> {
	const edgeCount = DISCUSSION_VISIBLE_EDGE_COUNT;
	const collapseThreshold = edgeCount * 2;
	if (items.length <= collapseThreshold) {
		return {
			visibleItems: [...items],
			hiddenMiddleCount: 0,
			nextRevealCount: 0,
		};
	}

	const firstItems = items.slice(0, edgeCount);
	const middleItems = items.slice(edgeCount, items.length - edgeCount);
	const lastItems = items.slice(items.length - edgeCount);
	const safeRevealedMiddleCount = Math.max(0, revealedMiddleCount);
	const revealedMiddleItems = middleItems.slice(0, safeRevealedMiddleCount);
	const hiddenMiddleCount = Math.max(
		0,
		middleItems.length - revealedMiddleItems.length,
	);

	return {
		visibleItems: [...firstItems, ...revealedMiddleItems, ...lastItems],
		hiddenMiddleCount,
		nextRevealCount: Math.min(DISCUSSION_REVEAL_BATCH_SIZE, hiddenMiddleCount),
	};
}
