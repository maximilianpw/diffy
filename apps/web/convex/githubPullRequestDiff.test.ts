import { describe, expect, it, vi } from 'vitest';
import { fetchGitHubPullRequestDiffText } from './githubPullRequestDiff';

describe('fetchGitHubPullRequestDiffText', () => {
	it('uses the raw GitHub diff when it is available', async () => {
		const fetchImpl = vi.fn().mockResolvedValueOnce(textResponse('diff --git a/a b/a\n'));

		await expect(
			fetchGitHubPullRequestDiffText({
				pullRequestUrl: 'https://api.github.com/repos/diffy/demo/pulls/42',
				pullRequestFilesUrl:
					'https://api.github.com/repos/diffy/demo/pulls/42/files',
				headers: { Authorization: 'Bearer token' },
				fetchImpl,
			}),
		).resolves.toBe('diff --git a/a b/a\n');

		expect(fetchImpl).toHaveBeenCalledOnce();
		expect(fetchImpl).toHaveBeenCalledWith(
			'https://api.github.com/repos/diffy/demo/pulls/42',
			{
				headers: {
					Accept: 'application/vnd.github.diff',
					Authorization: 'Bearer token',
				},
			},
		);
	});

	it('falls back to paginated pull request files when the raw diff is too large', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse(
					{
						message:
							"Sorry, the diff exceeded the maximum number of files (300). Consider using 'List pull requests files' API or locally cloning the repository instead.",
						errors: [{ resource: 'PullRequest', field: 'diff', code: 'too_large' }],
						status: '406',
					},
					{ status: 406 },
				),
			)
			.mockResolvedValueOnce(
				jsonResponse([
					{
						filename: 'src/added.ts',
						status: 'added',
						patch: '@@ -0,0 +1 @@\n+export const added = true;',
					},
				]),
			);

		await expect(
			fetchGitHubPullRequestDiffText({
				pullRequestUrl: 'https://api.github.com/repos/diffy/demo/pulls/42',
				pullRequestFilesUrl:
					'https://api.github.com/repos/diffy/demo/pulls/42/files',
				headers: { Authorization: 'Bearer token' },
				fetchImpl,
			}),
		).resolves.toBe(`diff --git a/src/added.ts b/src/added.ts
--- /dev/null
+++ b/src/added.ts
@@ -0,0 +1 @@
+export const added = true;
`);

		expect(fetchImpl).toHaveBeenNthCalledWith(
			2,
			expect.stringContaining('per_page=100'),
			expect.anything(),
		);
	});
});

function jsonResponse(body: unknown, init: ResponseInit = {}) {
	return new Response(JSON.stringify(body), {
		status: init.status ?? 200,
		headers: { 'Content-Type': 'application/json' },
	});
}

function textResponse(body: string, init: ResponseInit = {}) {
	return new Response(body, {
		status: init.status ?? 200,
		headers: { 'Content-Type': 'text/plain' },
	});
}
