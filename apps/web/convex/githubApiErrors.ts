type GitHubFetchErrorInput = {
	resource: string;
	status: number;
	body: string;
};

export type GitHubFetchError =
	| {
			kind: "github_org_oauth_app_restricted";
			org: string;
			message: string;
	  }
	| {
			kind: "github_fetch_failed";
			resource: string;
			status: number;
			body: string;
			message: string;
	  };

type GitHubErrorBody = {
	message?: unknown;
	documentation_url?: unknown;
};

const oauthRestrictionPattern =
	/the `([^`]+)` organization has enabled OAuth App access restrictions/;

export function getGitHubFetchError({
	resource,
	status,
	body,
}: GitHubFetchErrorInput): GitHubFetchError {
	const parsed = parseGitHubErrorBody(body);
	const message = typeof parsed?.message === "string" ? parsed.message : body;
	const restrictedOrg = oauthRestrictionPattern.exec(message)?.[1];

	if (status === 403 && restrictedOrg) {
		return {
			kind: "github_org_oauth_app_restricted",
			org: restrictedOrg,
			message: `Diffy cannot access ${restrictedOrg} because that GitHub organization restricts OAuth App access. Ask an organization owner to approve this OAuth app for the organization, then retry the import.`,
		};
	}

	return {
		kind: "github_fetch_failed",
		resource,
		status,
		body,
		message: `GitHub ${resource} fetch failed: ${status} ${body}`,
	};
}

function parseGitHubErrorBody(body: string): GitHubErrorBody | null {
	try {
		const parsed: unknown = JSON.parse(body);
		if (parsed == null || typeof parsed !== "object") return null;
		return parsed as GitHubErrorBody;
	} catch {
		return null;
	}
}
