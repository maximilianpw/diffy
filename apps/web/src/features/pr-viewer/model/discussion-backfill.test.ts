import { describe, expect, it } from "vitest";
import { shouldBackfillDiscussion } from "./discussion-backfill";

describe("shouldBackfillDiscussion", () => {
	it("requests a backfill for existing PR snapshots that predate discussion import", () => {
		expect(shouldBackfillDiscussion({})).toBe(true);
		expect(shouldBackfillDiscussion({ discussionImportedAt: null })).toBe(true);
	});

	it("requests a backfill for existing PR snapshots that predate review comment import", () => {
		expect(shouldBackfillDiscussion({ discussionImportedAt: 123 })).toBe(true);
		expect(
			shouldBackfillDiscussion({
				discussionImportedAt: 123,
				reviewCommentsImportedAt: null,
			}),
		).toBe(true);
	});

	it("does not request a backfill after discussion has been imported", () => {
		expect(
			shouldBackfillDiscussion({
				discussionImportedAt: 123,
				reviewCommentsImportedAt: 456,
			}),
		).toBe(false);
	});

	it("does not request a backfill while the PR is still loading", () => {
		expect(shouldBackfillDiscussion(null)).toBe(false);
	});
});
