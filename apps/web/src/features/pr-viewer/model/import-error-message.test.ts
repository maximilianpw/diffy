import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import {
	getImportErrorDetails,
	getImportErrorMessage,
} from "./import-error-message";

describe("getImportErrorMessage", () => {
	it("uses ConvexError data when it contains the application error message", () => {
		const cause = new ConvexError({
			kind: "github_org_oauth_app_restricted",
			org: "VEV-platform-services",
			message:
				"Diffy cannot access VEV-platform-services because that GitHub organization restricts OAuth App access.",
		});

		expect(getImportErrorMessage(cause)).toBe(
			"Diffy cannot access VEV-platform-services because that GitHub organization restricts OAuth App access.",
		);
	});

	it("marks OAuth app restriction errors as recoverable with a repository token", () => {
		const cause = new ConvexError({
			kind: "github_org_oauth_app_restricted",
			org: "VEV-platform-services",
			message:
				"Diffy cannot access VEV-platform-services because that GitHub organization restricts OAuth App access.",
		});

		expect(getImportErrorDetails(cause)).toEqual({
			message:
				"Diffy cannot access VEV-platform-services because that GitHub organization restricts OAuth App access.",
			canSaveRepositoryCredential: true,
		});
	});

	it("marks stored PAT failures as recoverable with replacement", () => {
		const cause = new ConvexError({
			kind: "github_stored_pat_failed",
			owner: "tanstack",
			repo: "router",
			message:
				"Stored GitHub token for tanstack/router could not access this pull request. Replace the token and retry.",
		});

		expect(getImportErrorDetails(cause).canSaveRepositoryCredential).toBe(true);
	});
});
