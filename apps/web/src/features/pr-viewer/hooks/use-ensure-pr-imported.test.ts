import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useEnsurePrImported } from "./use-ensure-pr-imported";

const PR_ID = "pr_123" as Id<"pullRequests">;

async function flush() {
	await act(async () => {
		await Promise.resolve();
		await Promise.resolve();
	});
}

function defaultArgs(
	overrides: Partial<Parameters<typeof useEnsurePrImported>[0]> = {},
) {
	return {
		pr: undefined,
		owner: "tanstack",
		repo: "router",
		number: 123,
		importPr: vi.fn().mockResolvedValue(PR_ID),
		importDiscussion: vi.fn().mockResolvedValue(null),
		...overrides,
	};
}

describe("useEnsurePrImported", () => {
	it("waits for the PR query to resolve before importing", async () => {
		const importPr = vi.fn().mockResolvedValue(PR_ID);

		renderHook(() =>
			useEnsurePrImported(defaultArgs({ pr: undefined, importPr })),
		);
		await flush();

		expect(importPr).not.toHaveBeenCalled();
	});

	it("imports a PR once when the query resolves missing", async () => {
		const importPr = vi.fn().mockResolvedValue(PR_ID);
		const { rerender } = renderHook(
			({ pr }: { pr: Parameters<typeof useEnsurePrImported>[0]["pr"] }) =>
				useEnsurePrImported(defaultArgs({ pr, importPr })),
			{ initialProps: { pr: null } },
		);

		await flush();
		rerender({ pr: null });
		await flush();

		expect(importPr).toHaveBeenCalledTimes(1);
		expect(importPr).toHaveBeenCalledWith({
			owner: "tanstack",
			repo: "router",
			number: 123,
		});
	});

	it("backfills discussion once when an existing PR has no discussion import timestamp", async () => {
		const importDiscussion = vi.fn().mockResolvedValue(null);
		const pr = {
			_id: PR_ID,
			discussionImportedAt: undefined,
		} as Parameters<typeof useEnsurePrImported>[0]["pr"];
		const { rerender } = renderHook(() =>
			useEnsurePrImported(defaultArgs({ pr, importDiscussion })),
		);

		await flush();
		rerender();
		await flush();

		expect(importDiscussion).toHaveBeenCalledTimes(1);
		expect(importDiscussion).toHaveBeenCalledWith({
			pullRequestId: PR_ID,
			owner: "tanstack",
			repo: "router",
			number: 123,
		});
	});
});
