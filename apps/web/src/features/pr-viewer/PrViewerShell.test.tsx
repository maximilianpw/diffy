import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrViewerShell } from './PrViewerShell';

describe('PrViewerShell', () => {
	it('renders a static PR viewer shell for the route params', () => {
		render(
			<PrViewerShell
				owner="tanstack"
				repo="router"
				number={123}
			/>,
		);

		expect(screen.getByRole('heading', { name: 'tanstack/router#123' })).toBeTruthy();
		expect(screen.getByRole('navigation', { name: 'Changed files' })).toBeTruthy();
		expect(screen.getByRole('region', { name: 'Diff preview' })).toBeTruthy();
		expect(screen.getByText('Static preview data')).toBeTruthy();
	});
});
