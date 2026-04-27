import { describe, expect, it } from 'vitest';
import { getPrPathFromSubmission } from './parse-submission';

describe('getPrPathFromSubmission', () => {
	it('returns the canonical Diffy PR path for a GitHub PR URL', () => {
		expect(
			getPrPathFromSubmission(
				'https://github.com/tanstack/router/pull/123?diff=split',
			),
		).toBe('/pr/tanstack/router/123');
	});

	it('returns null when the submission is not a GitHub PR URL', () => {
		expect(getPrPathFromSubmission('https://github.com/tanstack/router')).toBeNull();
	});
});
