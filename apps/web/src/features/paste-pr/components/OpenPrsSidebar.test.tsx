import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { OpenPrsSidebar } from "./OpenPrsSidebar";

const authState = vi.hoisted(() => ({
	isAuthenticated: true,
	isLoading: false,
}));

const queryState = vi.hoisted(() => ({
	openPrs: [] as Doc<"pullRequests">[] | undefined,
}));

vi.mock("@convex-dev/auth/react", () => ({
	useConvexAuth: () => ({
		isAuthenticated: authState.isAuthenticated,
		isLoading: authState.isLoading,
	}),
}));

vi.mock("convex/react", () => ({
	useQuery: () => queryState.openPrs,
	useMutation: () => vi.fn(async () => null),
}));

function fixturePr(
	overrides: Partial<Doc<"pullRequests">> & {
		owner: string;
		repo: string;
		number: number;
		title: string;
	},
): Doc<"pullRequests"> {
	return {
		_id: `pr_${overrides.number}` as Doc<"pullRequests">["_id"],
		_creationTime: 0,
		authorLogin: "octocat",
		authorAvatarUrl: "https://example.com/a.png",
		state: "open",
		baseRef: "main",
		headRef: "feat/x",
		baseSha: "a",
		headSha: "b",
		htmlUrl: `https://github.com/${overrides.owner}/${overrides.repo}/pull/${overrides.number}`,
		diffStorageId: "storage_x" as Doc<"pullRequests">["diffStorageId"],
		diffByteSize: 0,
		importedAt: 0,
		lastViewedAt: 0,
		githubUpdatedAt: 0,
		...overrides,
	};
}

describe("OpenPrsSidebar", () => {
	beforeEach(() => {
		authState.isAuthenticated = true;
		authState.isLoading = false;
		queryState.openPrs = [];
	});

	it("renders nothing when the user is not authenticated", () => {
		authState.isAuthenticated = false;
		queryState.openPrs = undefined;

		const { container } = render(<OpenPrsSidebar onSelect={vi.fn()} />);

		expect(container.firstChild).toBeNull();
	});

	it("shows an empty state when there are no open PRs", () => {
		queryState.openPrs = [];

		render(<OpenPrsSidebar onSelect={vi.fn()} />);

		expect(screen.getByText(/No open pull requests/i)).toBeTruthy();
	});

	it("renders the open-PR header and count when PRs are present", () => {
		queryState.openPrs = [
			fixturePr({
				owner: "tanstack",
				repo: "router",
				number: 1,
				title: "Add API",
			}),
			fixturePr({
				owner: "tanstack",
				repo: "query",
				number: 2,
				title: "Fix cache",
			}),
		];

		render(<OpenPrsSidebar onSelect={vi.fn()} />);

		expect(screen.getByText(/Open pull requests/i)).toBeTruthy();
		expect(screen.getByText("2")).toBeTruthy();
	});
});
