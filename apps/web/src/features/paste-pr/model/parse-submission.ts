import { appPrPath, parseGithubPrUrl } from "@diffy/shared";

export function getPrPathFromSubmission(submission: string): string | null {
	const ref = parseGithubPrUrl(submission);
	return ref ? appPrPath(ref) : null;
}
