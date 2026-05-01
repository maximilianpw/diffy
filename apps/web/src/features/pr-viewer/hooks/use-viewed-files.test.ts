import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useViewedFiles } from "./use-viewed-files";

const PR = { owner: "tanstack", repo: "router", number: 123 };

afterEach(() => {
	sessionStorage.clear();
});

describe("useViewedFiles", () => {
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

	it("persists viewed state to sessionStorage scoped per PR", () => {
		const { result } = renderHook(() => useViewedFiles(PR));
		act(() => result.current.toggle("src/a.ts"));

		const stored = sessionStorage.getItem("diffy.viewed.tanstack/router#123");
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
});
