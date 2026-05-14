import { describe, expect, it } from 'vitest';

import { GITHUB_OAUTH_SCOPE } from './githubOAuthScope';

describe('GITHUB_OAUTH_SCOPE', () => {
	it('keeps the GitHub OAuth app on public repository access', () => {
		const scopes = GITHUB_OAUTH_SCOPE.split(' ');

		expect(scopes).toContain('read:user');
		expect(scopes).toContain('user:email');
		expect(scopes).toContain('public_repo');
		expect(scopes).not.toContain('repo');
	});
});
