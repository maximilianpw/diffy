import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PastePrHome } from './PastePrHome';

const authState = vi.hoisted(() => ({
	isAuthenticated: true,
	isLoading: false,
	signIn: vi.fn(),
	signOut: vi.fn(),
}));

vi.mock('@convex-dev/auth/react', () => ({
	useAuthActions: () => ({ signIn: authState.signIn, signOut: authState.signOut }),
	useConvexAuth: () => ({
		isAuthenticated: authState.isAuthenticated,
		isLoading: authState.isLoading,
	}),
}));

describe('PastePrHome', () => {
	beforeEach(() => {
		authState.isAuthenticated = true;
		authState.isLoading = false;
		authState.signIn.mockReset();
		authState.signOut.mockReset();
	});

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

	it('prompts unauthenticated users to sign in with GitHub', () => {
		authState.isAuthenticated = false;
		const navigateToPr = vi.fn();

		render(<PastePrHome navigateToPr={navigateToPr} />);

		fireEvent.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));

		expect(authState.signIn).toHaveBeenCalledWith('github');
		expect(screen.getByRole('button', { name: 'Open PR' })).toHaveProperty('disabled', true);
	});
});
