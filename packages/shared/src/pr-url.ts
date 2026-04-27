export type PrRef = {
	owner: string;
	repo: string;
	number: number;
};

const GITHUB_PR_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:[/?#].*)?$/;

export function parseGithubPrUrl(url: string): PrRef | null {
	const m = url.trim().match(GITHUB_PR_RE);
	if (!m) return null;
	const [, owner, repo, number] = m;
	return { owner, repo, number: Number(number) };
}

export function diffyPrPath(ref: PrRef): string {
	return `/pr/${ref.owner}/${ref.repo}/${ref.number}`;
}
