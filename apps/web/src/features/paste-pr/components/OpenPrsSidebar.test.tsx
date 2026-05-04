import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { PullRequestState } from "../../pr-viewer/model/pull-request.types";
import { OpenPrsSidebar } from "./OpenPrsSidebar";

const authState = vi.hoisted(() => ({
	isAuthenticated: true,
	isLoading: false,
}));

const queryState = vi.hoisted(() => ({
	openPrs: [] as Doc<"pullRequests">[] | undefined,
}));

const mutationState = vi.hoisted(() => ({
	touchPr: vi.fn(async () => null),
}));

vi.mock("@convex-dev/auth/react", () => ({
	useConvexAuth: () => ({
		isAuthenticated: authState.isAuthenticated,
		isLoading: authState.isLoading,
	}),
}));

vi.mock("convex/react", () => ({
	useQuery: () => queryState.openPrs,
	useMutation: () => mutationState.touchPr,
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
		body: null,
		state: PullRequestState.Open,
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

async function findTreeFileRow(path: string) {
	return waitFor(() => {
		const tree = document.querySelector("file-tree-container");
		expect(tree).toBeInstanceOf(HTMLElement);

		const row = tree?.shadowRoot?.querySelector(`[data-item-path="${path}"]`);
		expect(row).toBeInstanceOf(HTMLElement);
		return row as HTMLElement;
	});
}

describe("OpenPrsSidebar", () => {
	beforeEach(() => {
		authState.isAuthenticated = true;
		authState.isLoading = false;
		queryState.openPrs = [];
		mutationState.touchPr.mockClear();
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

	it("selects and touches an open PR when its row is clicked", async () => {
		const onSelect = vi.fn();
		const pr = fixturePr({
			owner: "tanstack",
			repo: "router",
			number: 1,
			title: "Add API",
		});
		queryState.openPrs = [pr];

		render(<OpenPrsSidebar onSelect={onSelect} />);

		const row = await findTreeFileRow("tanstack/router/Add API");
		fireEvent.click(row);

		expect(mutationState.touchPr).toHaveBeenCalledWith({ id: pr._id });
		expect(onSelect).toHaveBeenCalledWith({
			id: pr._id,
			owner: "tanstack",
			repo: "router",
			number: 1,
			title: "Add API",
		});
	});
});
