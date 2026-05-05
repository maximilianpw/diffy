import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PastePrHome } from "./PastePrHome";

const authState = vi.hoisted(() => ({
	isAuthenticated: true,
	isLoading: false,
	signIn: vi.fn(),
	signOut: vi.fn(),
}));

vi.mock("@convex-dev/auth/react", () => ({
	useAuthActions: () => ({
		signIn: authState.signIn,
		signOut: authState.signOut,
	}),
	useConvexAuth: () => ({
		isAuthenticated: authState.isAuthenticated,
		isLoading: authState.isLoading,
	}),
}));

describe("PastePrHome", () => {
	beforeEach(() => {
		authState.isAuthenticated = true;
		authState.isLoading = false;
		authState.signIn.mockReset();
		authState.signOut.mockReset();
	});

	it("renders the editorial hero heading", () => {
		render(<PastePrHome navigateToPr={vi.fn()} />);

		expect(
			screen.getByRole("heading", { name: /Read a pull request/ }),
		).toBeTruthy();
		expect(screen.getByRole("main").classList.contains("max-w-3xl")).toBe(
			false,
		);
	});

	it("uses the content column when the open PR sidebar is visible", () => {
		render(<PastePrHome navigateToPr={vi.fn()} />);

		expect(screen.getByRole("main").classList.contains("lg:col-start-2")).toBe(
			true,
		);
	});

	it("centers across the full page when the signed-out sidebar is hidden", () => {
		authState.isAuthenticated = false;

		render(<PastePrHome navigateToPr={vi.fn()} />);

		expect(screen.getByRole("main").classList.contains("lg:col-span-2")).toBe(
			true,
		);
		expect(screen.getByTestId("paste-pr-home-content").classList).toContain(
			"mx-auto",
		);
	});

	it("navigates to the canonical PR route for a GitHub PR URL", () => {
		const navigateToPr = vi.fn();

		render(<PastePrHome navigateToPr={navigateToPr} />);

		fireEvent.change(screen.getByLabelText("Pull request URL"), {
			target: { value: "https://github.com/tanstack/router/pull/123" },
		});
		fireEvent.submit(screen.getByRole("form", { name: "Open GitHub PR" }));

		expect(navigateToPr).toHaveBeenCalledWith("/pr/tanstack/router/123");
	});

	it("shows an error for a non-PR URL", () => {
		const navigateToPr = vi.fn();

		render(<PastePrHome navigateToPr={navigateToPr} />);

		fireEvent.change(screen.getByLabelText("Pull request URL"), {
			target: { value: "https://github.com/tanstack/router" },
		});
		fireEvent.submit(screen.getByRole("form", { name: "Open GitHub PR" }));

		expect(navigateToPr).not.toHaveBeenCalled();
		expect(screen.getByText("Paste a GitHub pull request URL.")).toBeTruthy();
	});

	it("prompts unauthenticated users to sign in with GitHub", () => {
		authState.isAuthenticated = false;
		const navigateToPr = vi.fn();

		render(<PastePrHome navigateToPr={navigateToPr} />);

		fireEvent.click(
			screen.getByRole("button", { name: "Sign in with GitHub" }),
		);

		expect(authState.signIn).toHaveBeenCalledWith("github");
		expect(screen.getByRole("button", { name: "Open PR" })).toHaveProperty(
			"disabled",
			true,
		);
	});
});
