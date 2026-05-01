import { describe, expect, it } from "vitest";
import { getGitHubFetchError } from "./githubApiErrors";

describe("getGitHubFetchError", () => {
	it("explains organization OAuth App access restrictions", () => {
		const error = getGitHubFetchError({
			resource: "PR metadata",
			status: 403,
			body: JSON.stringify({
				message:
					"Although you appear to have the correct authorization credentials, the `VEV-platform-services` organization has enabled OAuth App access restrictions, meaning that data access to third-parties is limited.",
				documentation_url:
					"https://docs.github.com/rest/pulls/pulls#get-a-pull-request",
				status: "403",
			}),
		});

		expect(error).toEqual({
			kind: "github_org_oauth_app_restricted",
			org: "VEV-platform-services",
			message:
				"Diffy cannot access VEV-platform-services because that GitHub organization restricts OAuth App access. Ask an organization owner to approve this OAuth app for the organization, then retry the import.",
		});
	});
});
