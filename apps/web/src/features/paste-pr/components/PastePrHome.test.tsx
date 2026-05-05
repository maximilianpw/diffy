import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PastePrHome } from "./PastePrHome";

const signIn = vi.hoisted(() => vi.fn());

vi.mock("@convex-dev/auth/react", () => ({
	useAuthActions: () => ({ signIn }),
}));

describe("PastePrHome", () => {
	beforeEach(() => {
		signIn.mockReset();
	});

	it("renders the editorial hero heading", () => {
		render(
			<PastePrHome
				isAuthenticated={true}
				isLoading={false}
				navigateToPr={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("heading", { name: /Read a pull request/ }),
		).toBeTruthy();
		expect(screen.getByRole("main").classList.contains("max-w-3xl")).toBe(
			false,
		);
	});

	it("uses the content column when the open PR sidebar is visible", () => {
		render(
			<PastePrHome
				isAuthenticated={true}
				isLoading={false}
				navigateToPr={vi.fn()}
			/>,
		);

		expect(screen.getByRole("main").classList.contains("content-column")).toBe(
			true,
		);
	});

	it("centers across the full page when the signed-out sidebar is hidden", () => {
		render(
			<PastePrHome
				isAuthenticated={false}
				isLoading={false}
				navigateToPr={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("main").classList.contains("full-width-content"),
		).toBe(true);
		expect(screen.getByTestId("paste-pr-home-content").classList).toContain(
			"mx-auto",
		);
	});

	it("navigates to the canonical PR route for a GitHub PR URL", () => {
		const navigateToPr = vi.fn();

		render(
			<PastePrHome
				isAuthenticated={true}
				isLoading={false}
				navigateToPr={navigateToPr}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Pull request URL"), {
			target: { value: "https://github.com/tanstack/router/pull/123" },
		});
		fireEvent.submit(screen.getByRole("form", { name: "Open GitHub PR" }));

		expect(navigateToPr).toHaveBeenCalledWith({
			owner: "tanstack",
			repo: "router",
			number: 123,
		});
	});

	it("shows an error for a non-PR URL", () => {
		const navigateToPr = vi.fn();

		render(
			<PastePrHome
				isAuthenticated={true}
				isLoading={false}
				navigateToPr={navigateToPr}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Pull request URL"), {
			target: { value: "https://github.com/tanstack/router" },
		});
		fireEvent.submit(screen.getByRole("form", { name: "Open GitHub PR" }));

		expect(navigateToPr).not.toHaveBeenCalled();
		expect(screen.getByText("Paste a GitHub pull request URL.")).toBeTruthy();
	});

	it("prompts unauthenticated users to sign in with GitHub", () => {
		const navigateToPr = vi.fn();

		render(
			<PastePrHome
				isAuthenticated={false}
				isLoading={false}
				navigateToPr={navigateToPr}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: "Sign in with GitHub" }),
		);

		expect(signIn).toHaveBeenCalledWith("github");
		expect(screen.getByRole("button", { name: "Open PR" })).toHaveProperty(
			"disabled",
			true,
		);
	});
});
