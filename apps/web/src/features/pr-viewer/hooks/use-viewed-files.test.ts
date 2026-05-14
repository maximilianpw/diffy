import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useViewedFiles } from "./use-viewed-files";

const PR = { owner: "tanstack", repo: "router", number: 123 };
const REMOTE_PR = {
	...PR,
	_id: "pr_test" as Id<"pullRequests">,
	latestVersionNumber: 1,
};

const convexState = vi.hoisted(() => ({
	viewedPaths: undefined as string[] | undefined,
	setViewedPaths: vi.fn(),
}));

vi.mock("convex/react", () => ({
	useMutation: () => convexState.setViewedPaths,
	useQuery: () => convexState.viewedPaths,
}));

afterEach(() => {
	localStorage.clear();
});

describe("useViewedFiles", () => {
	beforeEach(() => {
		convexState.viewedPaths = undefined;
		convexState.setViewedPaths.mockReset();
	});

	it("reports unviewed by default and toggles into the viewed set", () => {
		const { result } = renderHook(() => useViewedFiles(PR));

		expect(result.current.isViewed("src/a.ts")).toBe(false);

		act(() => result.current.toggle("src/a.ts"));

		expect(result.current.isViewed("src/a.ts")).toBe(true);
		expect(result.current.isViewed("src/b.ts")).toBe(false);
	});

	it("toggles a viewed file back to unviewed", () => {
		const { result } = renderHook(() => useViewedFiles(PR));

		act(() => result.current.toggle("src/a.ts"));
		act(() => result.current.toggle("src/a.ts"));

		expect(result.current.isViewed("src/a.ts")).toBe(false);
	});

	it("marks multiple files viewed or unviewed together", () => {
		const { result } = renderHook(() => useViewedFiles(PR));

		act(() => result.current.setPathsViewed(["src/a.ts", "src/b.ts"], true));

		expect(result.current.isViewed("src/a.ts")).toBe(true);
		expect(result.current.isViewed("src/b.ts")).toBe(true);

		act(() => result.current.setPathsViewed(["src/a.ts", "src/b.ts"], false));

		expect(result.current.isViewed("src/a.ts")).toBe(false);
		expect(result.current.isViewed("src/b.ts")).toBe(false);
	});

	it("persists viewed state to localStorage scoped per PR", () => {
		const { result } = renderHook(() => useViewedFiles(PR));
		act(() => result.current.toggle("src/a.ts"));

		const stored = localStorage.getItem("diffy.viewed.tanstack/router#123");
		expect(stored).not.toBeNull();
		expect(JSON.parse(stored ?? "[]")).toContain("src/a.ts");
	});

	it("isolates viewed sets across PRs", () => {
		const { result: a } = renderHook(() => useViewedFiles(PR));
		const { result: b } = renderHook(() =>
			useViewedFiles({ owner: "tanstack", repo: "router", number: 456 }),
		);

		act(() => a.current.toggle("src/a.ts"));

		expect(a.current.isViewed("src/a.ts")).toBe(true);
		expect(b.current.isViewed("src/a.ts")).toBe(false);
	});

	it("isolates viewed sets across PR versions", () => {
		const { result, rerender } = renderHook(
			({ latestVersionNumber }) =>
				useViewedFiles({ ...PR, latestVersionNumber }),
			{ initialProps: { latestVersionNumber: 1 } },
		);

		act(() => result.current.toggle("src/a.ts"));
		rerender({ latestVersionNumber: 2 });

		expect(result.current.isViewed("src/a.ts")).toBe(false);
	});

	it("uses Convex viewed paths when a persisted review state is loaded", () => {
		convexState.viewedPaths = ["src/a.ts"];

		const { result } = renderHook(() => useViewedFiles(REMOTE_PR));

		expect(result.current.isViewed("src/a.ts")).toBe(true);
		expect(result.current.isViewed("src/b.ts")).toBe(false);
	});

	it("persists viewed changes to Convex when the PR has an id", () => {
		convexState.viewedPaths = [];

		const { result } = renderHook(() => useViewedFiles(REMOTE_PR));
		act(() => result.current.toggle("src/a.ts"));

		expect(convexState.setViewedPaths).toHaveBeenCalledWith({
			pullRequestId: "pr_test",
			versionNumber: 1,
			paths: ["src/a.ts"],
			viewed: true,
		});
	});
});
