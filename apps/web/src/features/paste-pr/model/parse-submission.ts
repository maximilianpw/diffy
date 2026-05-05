import { parseGithubPrUrl } from "@diffy/shared";

export function getPrRefFromSubmission(submission: string) {
	return parseGithubPrUrl(submission);
}
