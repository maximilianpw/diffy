export type PrRef = {
	owner: string;
	repo: string;
	number: number;
};

const GITHUB_PR_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:[/?#].*)?$/;

export function parseGithubPrUrl(url: string): PrRef | null {
	const parsed = url.trim().match(GITHUB_PR_RE);
	if (!parsed) return null;
	const [, owner, repo, number] = parsed;
	return { owner, repo, number: Number(number) };
}

export function appPrPath(ref: PrRef): string {
	return `/pr/${ref.owner}/${ref.repo}/${ref.number}`;
}
