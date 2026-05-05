import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PrDoc } from "../../../../convex/doc-types";
import { PullRequestState } from "../../pr-viewer/model/pull-request.types";
import { OpenPrsSidebar } from "./OpenPrsSidebar";

function fixturePr(
	overrides: Partial<PrDoc> & {
		owner: string;
		repo: string;
		number: number;
		title: string;
	},
): PrDoc {
	return {
		_id: `pr_${overrides.number}` as PrDoc["_id"],
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
		diffStorageId: "storage_x" as PrDoc["diffStorageId"],
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
	it("renders nothing when the user is not authenticated", () => {
		const { container } = render(
			<OpenPrsSidebar
				isAuthenticated={false}
				openPrs={undefined}
				onSelect={vi.fn()}
			/>,
		);

		expect(container.firstChild).toBeNull();
	});

	it("shows an empty state when there are no open PRs", () => {
		render(
			<OpenPrsSidebar
				isAuthenticated={true}
				openPrs={[]}
				onSelect={vi.fn()}
			/>,
		);

		expect(screen.getByText(/No open pull requests/i)).toBeTruthy();
	});

	it("renders the open-PR header and count when PRs are present", () => {
		const openPrs = [
			fixturePr({ owner: "tanstack", repo: "router", number: 1, title: "Add API" }),
			fixturePr({ owner: "tanstack", repo: "query", number: 2, title: "Fix cache" }),
		];

		render(
			<OpenPrsSidebar
				isAuthenticated={true}
				openPrs={openPrs}
				onSelect={vi.fn()}
			/>,
		);

		expect(screen.getByText(/Open pull requests/i)).toBeTruthy();
		expect(screen.getByText("2")).toBeTruthy();
	});

	it("calls onSelect with the PR entry when its row is clicked", async () => {
		const onSelect = vi.fn();
		const pr = fixturePr({ owner: "tanstack", repo: "router", number: 1, title: "Add API" });

		render(
			<OpenPrsSidebar
				isAuthenticated={true}
				openPrs={[pr]}
				onSelect={onSelect}
			/>,
		);

		const row = await findTreeFileRow("tanstack/router/Add API");
		fireEvent.click(row);

		expect(onSelect).toHaveBeenCalledWith({
			id: pr._id,
			owner: "tanstack",
			repo: "router",
			number: 1,
			title: "Add API",
		});
	});
});
