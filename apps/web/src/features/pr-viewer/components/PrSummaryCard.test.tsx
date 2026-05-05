import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PrDoc } from "../../../../convex/doc-types";
import { PullRequestState } from "../model/pull-request.types";
import { PrSummaryCard } from "./PrSummaryCard";

function fixturePr(
	overrides: Partial<PrDoc> = {},
): PrDoc {
	return {
		_id: "pr_test" as PrDoc["_id"],
		_creationTime: 0,
		owner: "tanstack",
		repo: "router",
		number: 123,
		title: "Add resilient route matching",
		body: null,
		authorLogin: "tannerlinsley",
		authorAvatarUrl: "https://example.com/avatar.png",
		state: PullRequestState.Merged,
		baseRef: "main",
		headRef: "feat/resilient-matching",
		baseSha: "aaa",
		headSha: "bbb",
		htmlUrl: "https://github.com/tanstack/router/pull/123",
		diffStorageId: "storage_test" as PrDoc["diffStorageId"],
		diffByteSize: 1234,
		importedAt: new Date("2026-04-12T00:00:00Z").getTime(),
		lastViewedAt: new Date("2026-04-12T00:00:00Z").getTime(),
		githubUpdatedAt: new Date("2026-04-12T00:00:00Z").getTime(),
		...overrides,
	};
}

const stateLabels = [
	[PullRequestState.Open, "Open"],
	[PullRequestState.Closed, "Closed"],
	[PullRequestState.Merged, "Merged"],
] as const satisfies ReadonlyArray<readonly [PullRequestState, string]>;

describe("PrSummaryCard", () => {
	it.each(stateLabels)("renders the %s state label", (state, label) => {
		render(<PrSummaryCard pr={fixturePr({ state })} />);

		expect(screen.getByText(label)).toBeTruthy();
	});

	it("shows the latest stored PR version when available", () => {
		render(<PrSummaryCard pr={fixturePr({ latestVersionNumber: 2 })} />);

		expect(screen.getByText("v2")).toBeTruthy();
	});
});
