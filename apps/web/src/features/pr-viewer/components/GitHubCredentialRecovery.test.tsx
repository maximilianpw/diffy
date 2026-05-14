import { GitHubCredentialHealth, GitHubCredentialScope } from "@diffy/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubCredentialRecovery } from "./GitHubCredentialRecovery";

const convexState = vi.hoisted(() => ({
	credential: null as null | {
		_id: string;
		_creationTime: number;
		scope: GitHubCredentialScope;
		owner: string;
		repo: string;
		tokenLastFour: string;
		scopeLabel: string;
		health: GitHubCredentialHealth;
		createdAt: number;
		updatedAt: number;
		lastVerifiedAt?: number;
		lastFailure?: string;
	},
	saveCredential: vi.fn(),
	verifyCredential: vi.fn(),
	deleteCredential: vi.fn(),
}));

vi.mock("convex/react", () => ({
	useAction: () =>
		vi.fn((args: { token?: string }) =>
			"token" in args
				? convexState.saveCredential(args)
				: convexState.verifyCredential(args),
		),
	useMutation: () => convexState.deleteCredential,
	useQuery: () => convexState.credential,
}));

describe("GitHubCredentialRecovery", () => {
	beforeEach(() => {
		convexState.credential = null;
		convexState.saveCredential.mockResolvedValue(null);
		convexState.verifyCredential.mockResolvedValue(null);
		convexState.deleteCredential.mockResolvedValue(null);
		convexState.saveCredential.mockClear();
		convexState.verifyCredential.mockClear();
		convexState.deleteCredential.mockClear();
	});

	it("saves a repository token and retries the import", async () => {
		const onSaved = vi.fn().mockResolvedValue(undefined);
		render(
			<GitHubCredentialRecovery
				owner="tanstack"
				repo="router"
				onSaved={onSaved}
			/>,
		);

		fireEvent.change(screen.getByLabelText("GitHub token"), {
			target: { value: "github_pat_secret" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save and retry" }));

		await waitFor(() => {
			expect(convexState.saveCredential).toHaveBeenCalledWith({
				owner: "tanstack",
				repo: "router",
				token: "github_pat_secret",
			});
			expect(onSaved).toHaveBeenCalledTimes(1);
		});
	});

	it("shows stored credential metadata and supports testing or deleting it", async () => {
		const onSaved = vi.fn().mockResolvedValue(undefined);
		convexState.credential = {
			_id: "credential_test",
			_creationTime: 0,
			scope: GitHubCredentialScope.Repository,
			owner: "tanstack",
			repo: "router",
			tokenLastFour: "1234",
			scopeLabel: "repo, read:user",
			health: GitHubCredentialHealth.Unhealthy,
			createdAt: 0,
			updatedAt: 0,
			lastFailure: "Bad credentials",
		};

		render(
			<GitHubCredentialRecovery
				owner="tanstack"
				repo="router"
				onSaved={onSaved}
			/>,
		);

		expect(screen.getByText("Token ending in 1234")).toBeTruthy();
		expect(screen.getByText("Scope: repo, read:user")).toBeTruthy();
		expect(screen.getByText("Bad credentials")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Test and retry" }));
		await waitFor(() => {
			expect(convexState.verifyCredential).toHaveBeenCalledWith({
				owner: "tanstack",
				repo: "router",
			});
			expect(onSaved).toHaveBeenCalledTimes(1);
		});

		fireEvent.click(screen.getByRole("button", { name: "Delete" }));
		await waitFor(() => {
			expect(convexState.deleteCredential).toHaveBeenCalledWith({
				owner: "tanstack",
				repo: "router",
			});
		});
	});
});
