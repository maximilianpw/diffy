import { PatchDiff } from "@pierre/diffs/react";
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrCommentDoc, PrDoc } from "../../../../../convex/docTypes";
import { PullRequestState } from "../../model/pull-request.types";
import { PrViewerShell } from ".";
import { PrUpdateCheckStatus } from "./pr-update-notice-copy";

vi.mock("@pierre/diffs/react", () => ({
	PatchDiff: vi.fn(({ patch }: { patch: string }) => (
		<div data-testid="patch-diff">{patch}</div>
	)),
}));

const queryState = vi.hoisted(() => ({
	comments: [] as PrCommentDoc[],
	reviewComments: [] as Array<{
		_id: string;
		_creationTime: number;
		pullRequestId: string;
		githubId: number;
		authorLogin: string;
		authorAvatarUrl: string;
		body: string;
		htmlUrl: string;
		path: string;
		diffHunk: string;
		side?: "LEFT" | "RIGHT";
		line?: number;
		originalLine?: number;
		startLine?: number;
		originalStartLine?: number;
		position?: number;
		originalPosition?: number;
		createdAt: number;
		updatedAt: number;
	}>,
	nextQueryIndex: 0,
}));

vi.mock("convex/react", () => ({
	useQuery: () =>
		queryState.nextQueryIndex++ % 2 === 0
			? queryState.comments
			: queryState.reviewComments,
}));

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

type PrFixture = PrDoc & { diffUrl: string | null };

function fixturePr(overrides: Partial<PrFixture> = {}): PrFixture {
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
		diffUrl: "https://example.com/diff",
		importedAt: new Date("2026-04-12T00:00:00Z").getTime(),
		lastViewedAt: new Date("2026-04-12T00:00:00Z").getTime(),
		githubUpdatedAt: new Date("2026-04-12T00:00:00Z").getTime(),
		...overrides,
	};
}

function fixtureComment(overrides: Partial<PrCommentDoc> = {}): PrCommentDoc {
	return {
		_id: "comment_test" as PrCommentDoc["_id"],
		_creationTime: 0,
		pullRequestId: "pr_test" as PrCommentDoc["pullRequestId"],
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

function fixtureReviewComment(
	overrides: Partial<(typeof queryState.reviewComments)[number]> = {},
): (typeof queryState.reviewComments)[number] {
	return {
		_id: "review_comment_test",
		_creationTime: 0,
		pullRequestId: "pr_test",
		githubId: 789,
		authorLogin: "lauren",
		authorAvatarUrl: "https://example.com/reviewer.png",
		body: "Could we keep this branch covered?",
		htmlUrl: "https://github.com/tanstack/router/pull/123#discussion_r789",
		path: "packages/router/src/index.ts",
		diffHunk: "@@ -1 +1 @@\n-old\n+new",
		side: "RIGHT",
		line: 1,
		originalLine: 1,
		position: 2,
		originalPosition: 2,
		createdAt: new Date("2026-04-12T12:00:00Z").getTime(),
		updatedAt: new Date("2026-04-12T12:00:00Z").getTime(),
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

async function switchToCodeTab() {
	fireEvent.click(screen.getByRole("tab", { name: "Code" }));
	const panel = screen.getByRole("tabpanel", { name: "Code" });
	await waitFor(() => {
		expect(
			within(panel).queryByText("packages/router/src/index.ts"),
		).not.toBeNull();
	});
	return panel;
}

describe("PrViewerShell", () => {
	const scrollIntoView = vi.fn();

	beforeEach(() => {
		window.location.hash = "";
		localStorage.clear();
		queryState.comments = [];
		queryState.reviewComments = [];
		queryState.nextQueryIndex = 0;
		vi.mocked(PatchDiff).mockClear();
		scrollIntoView.mockReset();
		Object.defineProperty(Element.prototype, "scrollIntoView", {
			configurable: true,
			value: scrollIntoView,
			writable: true,
		});
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(TWO_FILE_PATCH, {
						status: 200,
						headers: { "content-type": "text/plain" },
					}),
			),
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("renders the PR summary, file tree, and one card per changed file", async () => {
		render(<PrViewerShell pr={fixturePr()} />);

		expect(
			screen.getByRole("heading", { name: "Add resilient route matching" }),
		).toBeTruthy();
		expect(screen.getByText("Merged")).toBeTruthy();
		expect(screen.getByText("feat/resilient-matching")).toBeTruthy();
		expect(screen.getByText("main")).toBeTruthy();
		expect(screen.getByText("tannerlinsley")).toBeTruthy();
		expect(screen.getByText("Changed files")).toBeTruthy();
		expect(
			screen.getByRole("region", { name: "Pull request preview" }),
		).toBeTruthy();
		expect(
			screen
				.getByRole("region", { name: "Pull request preview" })
				.parentElement?.classList.contains("sidebar-page-grid"),
		).toBe(true);
		expect(
			screen
				.getByRole("region", { name: "Pull request preview" })
				.classList.contains("min-w-0"),
		).toBe(true);
		const region = await switchToCodeTab();
		expect(
			within(region).getByText("packages/router/src/index.ts"),
		).toBeTruthy();
		expect(
			within(region).getByText("packages/router/src/util.ts"),
		).toBeTruthy();
	});

	it("renders the PR body as GitHub-flavored markdown above the diff", async () => {
		render(
			<PrViewerShell
				pr={fixturePr({
					body: "## Reviewer context\n\n- [x] Keeps route matching resilient",
				})}
			/>,
		);

		const discussionPanel = screen.getByRole("tabpanel", {
			name: "Discussions",
		});
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
			within(discussionPanel).getByRole("heading", {
				name: "Reviewer context",
			}),
		).toBeTruthy();
		const codePanel = await switchToCodeTab();
		expect(
			within(codePanel).getByRole("button", {
				name: /Mark packages\/router\/src\/index\.ts as viewed/,
			}),
		).toBeTruthy();
		expect(
			within(codePanel).getAllByText("packages/router/src/index.ts").length,
		).toBeGreaterThan(0);
	});

	it("defaults to the Discussions tab and shows diffs after switching to Code", async () => {
		queryState.comments = [fixtureComment()];

		render(
			<PrViewerShell
				pr={fixturePr({
					body: "## Reviewer context\n\nStart with the PR message.",
				})}
			/>,
		);

		const discussionsTab = screen.getByRole("tab", { name: "Discussions" });
		const codeTab = screen.getByRole("tab", { name: "Code" });
		expect(discussionsTab.getAttribute("aria-selected")).toBe("true");
		expect(codeTab.getAttribute("aria-selected")).toBe("false");
		expect(screen.getByRole("tabpanel", { name: "Discussions" })).toBeTruthy();
		expect(
			screen.getByRole("heading", { name: "Reviewer context" }),
		).toBeTruthy();
		expect(screen.getByText("tkdodo")).toBeTruthy();
		expect(screen.queryByText("packages/router/src/index.ts")).toBeNull();

		const codePanel = await switchToCodeTab();

		expect(discussionsTab.getAttribute("aria-selected")).toBe("false");
		expect(codeTab.getAttribute("aria-selected")).toBe("true");
		expect(
			within(codePanel).getByText("packages/router/src/index.ts"),
		).toBeTruthy();
		expect(
			screen.queryByRole("heading", { name: "Reviewer context" }),
		).toBeNull();
	});

	it("does not scroll when returning to Code from Discussions", async () => {
		window.location.hash = "#2";

		render(<PrViewerShell pr={fixturePr()} />);

		await waitFor(() => {
			expect(scrollIntoView).toHaveBeenCalledTimes(1);
		});

		fireEvent.click(screen.getByRole("tab", { name: "Discussions" }));
		scrollIntoView.mockClear();
		fireEvent.click(screen.getByRole("tab", { name: "Code" }));

		expect(scrollIntoView).not.toHaveBeenCalled();
	});

	it("renders top-level pull request comments as GitHub-flavored markdown", () => {
		queryState.comments = [fixtureComment()];

		render(<PrViewerShell pr={fixturePr()} />);

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

	it("renders inline review comments with changed-file context in the discussion timeline", () => {
		queryState.comments = [
			fixtureComment({
				createdAt: new Date("2026-04-12T13:00:00Z").getTime(),
			}),
		];
		queryState.reviewComments = [fixtureReviewComment()];

		render(<PrViewerShell pr={fixturePr()} />);

		const discussion = screen.getByRole("region", {
			name: "Pull request discussion",
		});
		const reviewComment = within(discussion).getByRole("article", {
			name: /lauren commented on packages\/router\/src\/index\.ts/,
		});
		expect(reviewComment).toBeTruthy();
		const laterTopLevelComment = within(discussion).getByRole("article", {
			name: /tkdodo commented/,
		});
		expect(
			reviewComment.compareDocumentPosition(laterTopLevelComment) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			within(discussion).getByText("packages/router/src/index.ts:1"),
		).toBeTruthy();
		expect(
			within(discussion).getByText("Could we keep this branch covered?"),
		).toBeTruthy();
		expect(within(discussion).getByTestId("patch-diff").textContent).toContain(
			"+new",
		);
		expect(within(discussion).getByText("lauren")).toBeTruthy();
		expect(PatchDiff).toHaveBeenCalledWith(
			expect.objectContaining({
				patch: `diff --git a/packages/router/src/index.ts b/packages/router/src/index.ts
--- a/packages/router/src/index.ts
+++ b/packages/router/src/index.ts
@@ -1 +1 @@
-old
+new
`,
				options: expect.objectContaining({
					diffStyle: "unified",
					disableFileHeader: true,
					overflow: "wrap",
				}),
			}),
			undefined,
		);
	});

	it("renders GitHub suggested changes in review comments as diffs", () => {
		queryState.reviewComments = [
			fixtureReviewComment({
				body: `Make the lookup miss retriable.

<details>
<summary>Suggested fix</summary>

\`\`\`suggestion
const retryable = new Error("missing row");
retryable.code = "23503";
throw retryable;
\`\`\`

</details>`,
				diffHunk: `@@ -9,5 +9,5 @@
 if (!rows[0]) {
   throw new Error(
     "missing row",
   );
 }`,
				startLine: 9,
				line: 13,
			}),
		];

		render(<PrViewerShell pr={fixturePr()} />);

		const discussion = screen.getByRole("region", {
			name: "Pull request discussion",
		});
		expect(
			within(discussion).getByText("Make the lookup miss retriable."),
		).toBeTruthy();
		expect(within(discussion).getByText("Suggested fix")).toBeTruthy();
		expect(within(discussion).queryByText("```suggestion")).toBeNull();
		expect(within(discussion).queryByText("</details>")).toBeNull();
		expect(within(discussion).getAllByTestId("patch-diff")).toHaveLength(2);
		expect(PatchDiff).toHaveBeenCalledWith(
			expect.objectContaining({
				patch: expect.stringContaining(
					`+const retryable = new Error("missing row");
+retryable.code = "23503";
+throw retryable;`,
				),
				options: expect.objectContaining({
					diffStyle: "unified",
					disableFileHeader: true,
				}),
			}),
			undefined,
		);
	});

	it("offers Update without a Pause control when a newer PR version is available", () => {
		const onApplyUpdate = vi.fn();
		const onToggleAutoCheck = vi.fn();

		render(
			<PrViewerShell
				pr={fixturePr({ state: PullRequestState.Open })}
				updateCheck={{
					status: PrUpdateCheckStatus.Available,
					autoCheckEnabled: true,
					onApplyUpdate,
					onToggleAutoCheck,
				}}
			/>,
		);

		expect(screen.getByText("Updates available")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Update" }));

		expect(onApplyUpdate).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole("button", { name: "Pause checks" })).toBeNull();
		expect(onToggleAutoCheck).not.toHaveBeenCalled();
	});

	it("shows Pause and the last-checked time while idle", () => {
		const onApplyUpdate = vi.fn();
		const onToggleAutoCheck = vi.fn();
		const lastCheckedAt = new Date("2026-04-12T13:45:00Z").getTime();

		render(
			<PrViewerShell
				pr={fixturePr({ state: PullRequestState.Open })}
				updateCheck={{
					status: PrUpdateCheckStatus.Idle,
					autoCheckEnabled: true,
					lastCheckedAt,
					onApplyUpdate,
					onToggleAutoCheck,
				}}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Pause checks" }));

		expect(onToggleAutoCheck).toHaveBeenCalledTimes(1);
		expect(onApplyUpdate).not.toHaveBeenCalled();
		expect(screen.getByText(/Last checked/)).toBeTruthy();
	});

	it("marks a file as viewed when its checkbox is clicked, hiding the diff body", async () => {
		render(<PrViewerShell pr={fixturePr()} />);
		await switchToCodeTab();

		const fileHeader = screen.getByRole("button", {
			name: /Mark packages\/router\/src\/index\.ts as viewed/,
		});
		expect(fileHeader.getAttribute("aria-expanded")).toBe("true");

		fireEvent.click(fileHeader);

		expect(fileHeader.getAttribute("aria-expanded")).toBe("false");
	});

	it("greys out a tree row when its file is marked as viewed", async () => {
		render(<PrViewerShell pr={fixturePr()} />);
		await switchToCodeTab();

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
		render(<PrViewerShell pr={fixturePr()} />);
		await switchToCodeTab();

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
		render(<PrViewerShell pr={fixturePr()} />);
		await switchToCodeTab();

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
		render(<PrViewerShell pr={fixturePr()} />);
		await switchToCodeTab();

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

		render(<PrViewerShell pr={fixturePr()} />);

		await waitFor(() => {
			expect(scrollIntoView).toHaveBeenCalledTimes(1);
		});
		const fileHeader = screen.getByRole("button", {
			name: /Mark packages\/router\/src\/util\.ts as viewed/,
		});
		const fileCard = document.getElementById("2");
		expect(fileCard).toBeInstanceOf(HTMLElement);
		expect(fileCard?.getAttribute("data-slot")).toBe("card");
		expect(scrollIntoView.mock.instances[0]).toBe(fileCard);
		expect(fileCard?.contains(fileHeader)).toBe(true);
		expect(window.location.hash).toBe("#2");
	});

	it("isolates viewed state when navigating between PRs", async () => {
		localStorage.clear();

		const prA = fixturePr({ number: 100 });
		const prB = fixturePr({ number: 200 });
		const { rerender } = render(<PrViewerShell pr={prA} />);
		await switchToCodeTab();

		const headerA = screen.getByRole("button", {
			name: /Mark packages\/router\/src\/index\.ts as viewed/,
		});
		fireEvent.click(headerA);
		expect(headerA.getAttribute("aria-expanded")).toBe("false");

		rerender(<PrViewerShell pr={prB} />);

		await switchToCodeTab();
		const headerB = screen.getByRole("button", {
			name: /Mark packages\/router\/src\/index\.ts as viewed/,
		});
		expect(headerB.getAttribute("aria-expanded")).toBe("true");
	});

	it("renders an importing state", () => {
		render(<PrViewerShell pr={null} />);

		expect(
			screen.getByText("Importing pull request from GitHub..."),
		).toBeTruthy();
	});

	it("renders an error state", () => {
		render(
			<PrViewerShell pr={null} importError="Could not import pull request." />,
		);

		expect(screen.getByText("Could not import pull request.")).toBeTruthy();
	});
});
