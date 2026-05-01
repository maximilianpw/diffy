import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import { getImportErrorMessage } from "./import-error-message";

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
});
