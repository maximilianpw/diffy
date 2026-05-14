import { describe, expect, it } from "vitest";
import { getDiscussionWindow } from "./discussion-window";

describe("getDiscussionWindow", () => {
	it("shows every item when the timeline is short", () => {
		const items = numberedItems(6);

		expect(getDiscussionWindow(items, { revealedMiddleCount: 0 })).toEqual({
			visibleItems: items,
			hiddenMiddleCount: 0,
			nextRevealCount: 0,
		});
	});

	it("keeps the first and last few items visible while hiding the middle", () => {
		expect(
			getDiscussionWindow(numberedItems(20), { revealedMiddleCount: 0 }),
		).toEqual({
			visibleItems: [0, 1, 2, 17, 18, 19],
			hiddenMiddleCount: 14,
			nextRevealCount: 10,
		});
	});

	it("reveals middle items from oldest to newest in batches of ten", () => {
		expect(
			getDiscussionWindow(numberedItems(20), { revealedMiddleCount: 10 }),
		).toEqual({
			visibleItems: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 17, 18, 19],
			hiddenMiddleCount: 4,
			nextRevealCount: 4,
		});
	});
});

function numberedItems(count: number): number[] {
	return Array.from({ length: count }, (_, index) => index);
}
