import { ConvexError } from 'convex/values';
import { getGitHubFetchError } from './githubApiErrors';

type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

type GitHubPullRequestFile = {
	filename: string;
	previous_filename?: string;
	status: string;
	patch?: string;
};

type FetchGitHubPullRequestDiffArgs = {
	pullRequestUrl: string;
	pullRequestFilesUrl: string;
	headers: Record<string, string>;
	fetchImpl?: FetchImpl;
};

const TOO_LARGE_DIFF_STATUS = 406;
const FILES_PER_PAGE = 100;

export async function fetchGitHubPullRequestDiffText({
	pullRequestUrl,
	pullRequestFilesUrl,
	headers,
	fetchImpl = fetch,
}: FetchGitHubPullRequestDiffArgs): Promise<string> {
	const diffRes = await fetchImpl(pullRequestUrl, {
		headers: { ...headers, Accept: 'application/vnd.github.diff' },
	});

	if (diffRes.ok) return await diffRes.text();

	const body = await diffRes.text();
	if (!isTooLargeDiffResponse(diffRes.status, body)) {
		throw new ConvexError(
			getGitHubFetchError({
				resource: 'PR diff',
				status: diffRes.status,
				body,
			}),
		);
	}

	const files = await fetchAllPullRequestFiles({
		pullRequestFilesUrl,
		headers,
		fetchImpl,
	});
	return files.map(toUnifiedFilePatch).join('');
}

async function fetchAllPullRequestFiles({
	pullRequestFilesUrl,
	headers,
	fetchImpl,
}: Required<Pick<FetchGitHubPullRequestDiffArgs, 'pullRequestFilesUrl' | 'headers' | 'fetchImpl'>>): Promise<
	GitHubPullRequestFile[]
> {
	const files: GitHubPullRequestFile[] = [];

	for (let page = 1; ; page += 1) {
		const url = new URL(pullRequestFilesUrl);
		url.searchParams.set('per_page', String(FILES_PER_PAGE));
		url.searchParams.set('page', String(page));

		const response = await fetchImpl(url.toString(), {
			headers: { ...headers, Accept: 'application/vnd.github+json' },
		});

		if (!response.ok) {
			throw new ConvexError(
				getGitHubFetchError({
					resource: 'PR files',
					status: response.status,
					body: await response.text(),
				}),
			);
		}

		const pageFiles = (await response.json()) as GitHubPullRequestFile[];
		files.push(...pageFiles);

		if (pageFiles.length < FILES_PER_PAGE) return files;
	}
}

function isTooLargeDiffResponse(status: number, body: string): boolean {
	if (status !== TOO_LARGE_DIFF_STATUS) return false;

	const parsed = parseGitHubErrorBody(body);
	if (parsed?.errors?.some((error) => error.code === 'too_large')) return true;

	return parsed?.message?.includes('diff exceeded the maximum number of files') ?? false;
}

function parseGitHubErrorBody(body: string):
	| {
			message?: string;
			errors?: Array<{ code?: string }>;
	  }
	| null {
	try {
		const parsed: unknown = JSON.parse(body);
		if (parsed == null || typeof parsed !== 'object') return null;
		return parsed as { message?: string; errors?: Array<{ code?: string }> };
	} catch {
		return null;
	}
}

function toUnifiedFilePatch(file: GitHubPullRequestFile): string {
	const oldPath = file.previous_filename ?? file.filename;
	const newPath = file.filename;
	const oldRef = file.status === 'added' ? '/dev/null' : `a/${oldPath}`;
	const newRef = file.status === 'removed' ? '/dev/null' : `b/${newPath}`;
	const lines = [`diff --git a/${oldPath} b/${newPath}`];

	if (file.status === 'renamed' && file.previous_filename) {
		lines.push(`rename from ${file.previous_filename}`);
		lines.push(`rename to ${file.filename}`);
	}

	lines.push(`--- ${oldRef}`);
	lines.push(`+++ ${newRef}`);

	if (file.patch) lines.push(trimTrailingNewlines(file.patch));

	return `${lines.join('\n')}\n`;
}

function trimTrailingNewlines(value: string): string {
	return value.replace(/\n+$/, '');
}
