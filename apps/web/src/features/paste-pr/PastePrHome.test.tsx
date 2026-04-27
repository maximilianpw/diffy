import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PastePrHome } from './PastePrHome';

describe('PastePrHome', () => {
	it('navigates to the canonical PR route for a GitHub PR URL', () => {
		const navigateToPr = vi.fn();

		render(<PastePrHome navigateToPr={navigateToPr} />);

		fireEvent.change(screen.getByLabelText('GitHub PR URL'), {
			target: { value: 'https://github.com/tanstack/router/pull/123' },
		});
		fireEvent.submit(screen.getByRole('form', { name: 'Open GitHub PR' }));

		expect(navigateToPr).toHaveBeenCalledWith('/pr/tanstack/router/123');
	});

	it('shows an error for a non-PR URL', () => {
		const navigateToPr = vi.fn();

		render(<PastePrHome navigateToPr={navigateToPr} />);

		fireEvent.change(screen.getByLabelText('GitHub PR URL'), {
			target: { value: 'https://github.com/tanstack/router' },
		});
		fireEvent.submit(screen.getByRole('form', { name: 'Open GitHub PR' }));

		expect(navigateToPr).not.toHaveBeenCalled();
		expect(screen.getByText('Paste a GitHub pull request URL.')).toBeTruthy();
	});
});
