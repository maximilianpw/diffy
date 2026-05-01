import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { PrViewerShell } from "./PrViewerShell";

const TWO_FILE_PATCH = `diff --git a/packages/router/src/index.ts b/packages/router/src/index.ts
index 1111111..2222222 100644
--- a/packages/router/src/index.ts
+++ b/packages/router/src/index.ts
@@ -1 +1 @@
-old
+new
diff --git a/packages/router/src/util.ts b/packages/router/src/util.ts
index 3333333..4444444 100644
--- a/packages/router/src/util.ts
+++ b/packages/router/src/util.ts
@@ -1 +1 @@
-old
+new
`;

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
		body: null,
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

function fixtureComment(
	overrides: Partial<Doc<"pullRequestComments">> = {},
): Doc<"pullRequestComments"> {
	return {
		_id: "comment_test" as Doc<"pullRequestComments">["_id"],
		_creationTime: 0,
		pullRequestId: "pr_test" as Doc<"pullRequestComments">["pullRequestId"],
		githubId: 456,
		authorLogin: "tkdodo",
		authorAvatarUrl: "https://example.com/commenter.png",
		body: "Looks good after ~~rebasing~~ updating the tests.",
		htmlUrl: "https://github.com/tanstack/router/pull/123#issuecomment-456",
		createdAt: new Date("2026-04-13T00:00:00Z").getTime(),
		updatedAt: new Date("2026-04-13T00:00:00Z").getTime(),
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

async function findTreeFolderRow(path: string) {
	return waitFor(() => {
		const tree = document.querySelector("file-tree-container");
		expect(tree).toBeInstanceOf(HTMLElement);

		const row = tree?.shadowRoot?.querySelector(
			`[data-item-type="folder"][data-item-path="${path}"]`,
		);
		expect(row).toBeInstanceOf(HTMLElement);
		return row as HTMLElement;
	});
}

function getTreeViewedToggle(row: HTMLElement) {
	const toggle = row.querySelector('[data-item-section="decoration"]');
	expect(toggle).toBeInstanceOf(HTMLElement);
	return toggle as HTMLElement;
}

function getTreeViewedToggleTitle(row: HTMLElement) {
	return row
		.querySelector('[data-item-section="decoration"] span')
		?.getAttribute("title");
}

describe("PrViewerShell", () => {
	const scrollIntoView = vi.fn();

	beforeEach(() => {
		window.location.hash = "";
		localStorage.clear();
		scrollIntoView.mockReset();
		Object.defineProperty(Element.prototype, "scrollIntoView", {
			configurable: true,
			value: scrollIntoView,
			writable: true,
		});
	});

	it("renders the PR summary, file tree, and one card per changed file", () => {
		render(
			<PrViewerShell
				pr={fixturePr()}
				status="ready"
				paths={["packages/router/src/index.ts", "packages/router/src/util.ts"]}
				patch={TWO_FILE_PATCH}
			/>,
		);

		expect(
			screen.getByRole("heading", { name: "Add resilient route matching" }),
		).toBeTruthy();
		expect(screen.getByText("Merged")).toBeTruthy();
		expect(screen.getByText("feat/resilient-matching")).toBeTruthy();
		expect(screen.getByText("main")).toBeTruthy();
		expect(screen.getByText("tannerlinsley")).toBeTruthy();
		expect(screen.getByText("Changed files")).toBeTruthy();
		expect(screen.getByRole("region", { name: "Diff preview" })).toBeTruthy();
		const region = screen.getByRole("region", { name: "Diff preview" });
		expect(
			within(region).getByText("packages/router/src/index.ts"),
		).toBeTruthy();
		expect(
			within(region).getByText("packages/router/src/util.ts"),
		).toBeTruthy();
	});

	it("renders the PR body as GitHub-flavored markdown above the diff", () => {
		render(
			<PrViewerShell
				pr={fixturePr({
					body: "## Reviewer context\n\n- [x] Keeps route matching resilient",
				})}
				status="ready"
				paths={["packages/router/src/index.ts"]}
				patch={TWO_FILE_PATCH}
			/>,
		);

		const region = screen.getByRole("region", { name: "Diff preview" });
		const discussion = screen.getByRole("region", {
			name: "Pull request discussion",
		});
		expect(
			within(discussion).getByRole("article", {
				name: /tannerlinsley opened this pull request/,
			}),
		).toBeTruthy();
		expect(within(discussion).getByText("Author")).toBeTruthy();
		expect(
			within(region).getByRole("heading", { name: "Reviewer context" }),
		).toBeTruthy();
		expect(within(region).getByRole("checkbox")).toHaveProperty(
			"checked",
			true,
		);
		expect(
			within(region).getAllByText("packages/router/src/index.ts").length,
		).toBeGreaterThan(0);
	});

	it("renders top-level pull request comments as GitHub-flavored markdown", () => {
		render(
			<PrViewerShell
				pr={fixturePr()}
				comments={[fixtureComment()]}
				status="ready"
				paths={["packages/router/src/index.ts"]}
				patch={TWO_FILE_PATCH}
			/>,
		);

		const discussion = screen.getByRole("region", {
			name: "Pull request discussion",
		});
		expect(within(discussion).getByText("tkdodo")).toBeTruthy();
		expect(
			within(discussion).getByRole("article", { name: /tkdodo commented/ }),
		).toBeTruthy();
		expect(within(discussion).getByText("Apr 13, 2026")).toBeTruthy();
		expect(within(discussion).getByText("rebasing").tagName).toBe("DEL");
		expect(within(discussion).getByText(/updating the tests/)).toBeTruthy();
	});

	it("marks a file as viewed when its checkbox is clicked, hiding the diff body", () => {
		render(
			<PrViewerShell
				pr={fixturePr()}
				status="ready"
				paths={["packages/router/src/index.ts", "packages/router/src/util.ts"]}
				patch={TWO_FILE_PATCH}
			/>,
		);

		const fileHeader = screen.getByRole("button", {
			name: /Mark packages\/router\/src\/index\.ts as viewed/,
		});
		expect(fileHeader.getAttribute("aria-expanded")).toBe("true");

		fireEvent.click(fileHeader);

		expect(fileHeader.getAttribute("aria-expanded")).toBe("false");
	});

	it("greys out a tree row when its file is marked as viewed", async () => {
		render(
			<PrViewerShell
				pr={fixturePr()}
				status="ready"
				paths={["packages/router/src/index.ts", "packages/router/src/util.ts"]}
				patch={TWO_FILE_PATCH}
			/>,
		);

		const treeRow = await findTreeFileRow("packages/router/src/index.ts");
		expect(treeRow.getAttribute("data-item-viewed")).toBeNull();

		fireEvent.click(
			screen.getByRole("button", {
				name: /Mark packages\/router\/src\/index\.ts as viewed/,
			}),
		);

		await waitFor(() => {
			expect(treeRow.getAttribute("data-item-viewed")).toBe("true");
		});
	});

	it("marks a file as viewed when its tree checkbox is clicked", async () => {
		render(
			<PrViewerShell
				pr={fixturePr()}
				status="ready"
				paths={["packages/router/src/index.ts", "packages/router/src/util.ts"]}
				patch={TWO_FILE_PATCH}
			/>,
		);

		const treeRow = await findTreeFileRow("packages/router/src/index.ts");
		const treeToggle = getTreeViewedToggle(treeRow);
		const fileHeader = screen.getByRole("button", {
			name: /Mark packages\/router\/src\/index\.ts as viewed/,
		});
		expect(getTreeViewedToggleTitle(treeRow)).toBe(
			"Mark packages/router/src/index.ts as viewed",
		);

		fireEvent.click(treeToggle);

		await waitFor(() => {
			expect(treeRow.getAttribute("data-item-viewed")).toBe("true");
			expect(getTreeViewedToggleTitle(treeRow)).toBe(
				"Mark packages/router/src/index.ts as unviewed",
			);
			expect(fileHeader.getAttribute("aria-expanded")).toBe("false");
		});
		expect(window.location.hash).toBe("");
		expect(scrollIntoView).not.toHaveBeenCalled();
	});

	it("marks all descendant files viewed when a tree folder checkbox is clicked", async () => {
		render(
			<PrViewerShell
				pr={fixturePr()}
				status="ready"
				paths={["packages/router/src/index.ts", "packages/router/src/util.ts"]}
				patch={TWO_FILE_PATCH}
			/>,
		);

		const folderRow = await findTreeFolderRow("packages/router/src/");
		const folderToggle = getTreeViewedToggle(folderRow);

		fireEvent.click(folderToggle);

		await waitFor(() => {
			expect(
				screen
					.getByRole("button", {
						name: /Mark packages\/router\/src\/index\.ts as viewed/,
					})
					.getAttribute("aria-expanded"),
			).toBe("false");
			expect(
				screen
					.getByRole("button", {
						name: /Mark packages\/router\/src\/util\.ts as viewed/,
					})
					.getAttribute("aria-expanded"),
			).toBe("false");
		});
	});

	it("updates the URL fragment and jumps to a file when its tree row is clicked", async () => {
		render(
			<PrViewerShell
				pr={fixturePr()}
				status="ready"
				paths={["packages/router/src/index.ts", "packages/router/src/util.ts"]}
				patch={TWO_FILE_PATCH}
			/>,
		);

		const fileRow = await findTreeFileRow("packages/router/src/util.ts");
		const fileHeader = screen.getByRole("button", {
			name: /Mark packages\/router\/src\/util\.ts as viewed/,
		});
		const fileCard = document.getElementById("2");
		expect(fileCard).toBeInstanceOf(HTMLElement);
		expect(fileCard?.getAttribute("data-slot")).toBe("card");

		fireEvent.mouseDown(fileRow);
		fireEvent.click(fileRow);

		expect(window.location.hash).toBe("#2");
		expect(scrollIntoView).toHaveBeenCalledTimes(1);
		expect(scrollIntoView.mock.instances[0]).toBe(fileCard);
		expect(fileCard?.contains(fileHeader)).toBe(true);
		expect(scrollIntoView.mock.calls[0]?.[0]).toMatchObject({
			block: "start",
		});
		expect(scrollIntoView.mock.calls[0]?.[0]).not.toHaveProperty("behavior");
	});

	it("jumps to a file when the PR loads with a matching URL fragment", async () => {
		window.location.hash = "#2";

		render(
			<PrViewerShell
				pr={fixturePr()}
				status="ready"
				paths={["packages/router/src/index.ts", "packages/router/src/util.ts"]}
				patch={TWO_FILE_PATCH}
			/>,
		);

		const fileHeader = screen.getByRole("button", {
			name: /Mark packages\/router\/src\/util\.ts as viewed/,
		});
		const fileCard = document.getElementById("2");
		expect(fileCard).toBeInstanceOf(HTMLElement);
		expect(fileCard?.getAttribute("data-slot")).toBe("card");

		await waitFor(() => {
			expect(scrollIntoView).toHaveBeenCalledTimes(1);
		});
		expect(scrollIntoView.mock.instances[0]).toBe(fileCard);
		expect(fileCard?.contains(fileHeader)).toBe(true);
		expect(window.location.hash).toBe("#2");
	});

	it("isolates viewed state when navigating between PRs", () => {
		localStorage.clear();

		const prA = fixturePr({ number: 100 });
		const prB = fixturePr({ number: 200 });
		const { rerender } = render(
			<PrViewerShell
				pr={prA}
				status="ready"
				paths={["packages/router/src/index.ts"]}
				patch={TWO_FILE_PATCH}
			/>,
		);

		const headerA = screen.getByRole("button", {
			name: /Mark packages\/router\/src\/index\.ts as viewed/,
		});
		fireEvent.click(headerA);
		expect(headerA.getAttribute("aria-expanded")).toBe("false");

		rerender(
			<PrViewerShell
				pr={prB}
				status="ready"
				paths={["packages/router/src/index.ts"]}
				patch={TWO_FILE_PATCH}
			/>,
		);

		const headerB = screen.getByRole("button", {
			name: /Mark packages\/router\/src\/index\.ts as viewed/,
		});
		expect(headerB.getAttribute("aria-expanded")).toBe("true");
	});

	it("renders an importing state", () => {
		render(
			<PrViewerShell pr={null} status="importing" paths={[]} patch={null} />,
		);

		expect(
			screen.getByText("Importing pull request from GitHub..."),
		).toBeTruthy();
	});

	it("renders an error state", () => {
		render(
			<PrViewerShell
				pr={null}
				status="error"
				paths={[]}
				patch={null}
				error="Could not import pull request."
			/>,
		);

		expect(screen.getByText("Could not import pull request.")).toBeTruthy();
	});
});
