import { describe, expect, it } from 'vitest';
import { appPrPath, parseGithubPrUrl } from './pr-url';

describe('parseGithubPrUrl', () => {
	it('parses a canonical PR url', () => {
		expect(parseGithubPrUrl('https://github.com/foo/bar/pull/42')).toEqual({
			owner: 'foo',
			repo: 'bar',
			number: 42,
		});
	});

	it('ignores trailing path, query, and hash', () => {
		expect(parseGithubPrUrl('https://github.com/foo/bar/pull/42/files?w=1#r1')).toEqual({
			owner: 'foo',
			repo: 'bar',
			number: 42,
		});
	});

	it('returns null for non-PR urls', () => {
		expect(parseGithubPrUrl('https://github.com/foo/bar')).toBeNull();
		expect(parseGithubPrUrl('https://example.com/foo/bar/pull/1')).toBeNull();
		expect(parseGithubPrUrl('not a url')).toBeNull();
	});
});

describe('appPrPath', () => {
	it('builds the diffy route', () => {
		expect(appPrPath({ owner: 'foo', repo: 'bar', number: 42 })).toBe('/pr/foo/bar/42');
	});
});
