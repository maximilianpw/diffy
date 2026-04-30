import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Doc } from "../../../../convex/_generated/dataModel";
import type { PullRequestState } from "../model/pull-request.types";
import { PrSummaryCard } from "./PrSummaryCard";

function fixturePr(
	overrides: Partial<Doc<"pullRequests">> = {},
): Doc<"pullRequests"> {
	return {
		_id: "pr_test" as Doc<"pullRequests">["_id"],
		_creationTime: 0,
		owner: "tanstack",
		repo: "router",
		number: 123,
		title: "Add resilient route matching",
		authorLogin: "tannerlinsley",
		authorAvatarUrl: "https://example.com/avatar.png",
		state: "merged",
		baseRef: "main",
		headRef: "feat/resilient-matching",
		baseSha: "aaa",
		headSha: "bbb",
		htmlUrl: "https://github.com/tanstack/router/pull/123",
		diffStorageId: "storage_test" as Doc<"pullRequests">["diffStorageId"],
		diffByteSize: 1234,
		importedAt: new Date("2026-04-12T00:00:00Z").getTime(),
		lastViewedAt: new Date("2026-04-12T00:00:00Z").getTime(),
		githubUpdatedAt: new Date("2026-04-12T00:00:00Z").getTime(),
		...overrides,
	};
}

const stateLabels = [
	["open", "Open"],
	["closed", "Closed"],
	["merged", "Merged"],
] as const satisfies ReadonlyArray<readonly [PullRequestState, string]>;

describe("PrSummaryCard", () => {
	it.each(stateLabels)("renders the %s state label", (state, label) => {
		render(<PrSummaryCard pr={fixturePr({ state })} />);

		expect(screen.getByText(label)).toBeTruthy();
	});
});
