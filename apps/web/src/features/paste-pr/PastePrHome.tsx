import { useAuthActions, useConvexAuth } from '@convex-dev/auth/react';
import { useState } from 'react';
import { Eyebrow } from '#/components/section-header';
import { Alert, AlertDescription } from '#/components/ui/alert';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { getPrPathFromSubmission } from './parse-submission';

type PastePrHomeProps = {
	navigateToPr: (path: string) => void;
};

export function PastePrHome({ navigateToPr }: PastePrHomeProps) {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const { signIn, signOut } = useAuthActions();
	const [value, setValue] = useState('');
	const [error, setError] = useState<string | null>(null);

	function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const path = getPrPathFromSubmission(value);
		if (!isAuthenticated) {
			setError('Sign in with GitHub before opening a pull request.');
			return;
		}

		if (!path) {
			setError('Paste a GitHub pull request URL.');
			return;
		}

		setError(null);
		navigateToPr(path);
	}

	return (
		<main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-12">
			<Card>
				<CardHeader>
					<Eyebrow>Diffy</Eyebrow>
					<CardTitle className="text-2xl">Open a GitHub pull request</CardTitle>
					<CardDescription>
						Paste a public PR URL to inspect its changed files in a focused diff viewer.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="mb-4 flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
						<p className="text-muted-foreground text-sm">
							{isAuthenticated
								? 'Signed in with GitHub. Tokens stay on the Convex backend.'
								: 'Sign in with GitHub so Diffy can fetch pull request diffs.'}
						</p>
						{isAuthenticated ? (
							<Button
								type="button"
								variant="outline"
								onClick={() => void signOut()}
							>
								Sign out
							</Button>
						) : (
							<Button
								type="button"
								onClick={() => void signIn('github')}
								disabled={isLoading}
							>
								Sign in with GitHub
							</Button>
						)}
					</div>
					<form
						aria-label="Open GitHub PR"
						className="flex flex-col gap-3 sm:flex-row sm:items-end"
						onSubmit={onSubmit}
					>
						<div className="min-w-0 flex-1 space-y-1.5">
							<Label htmlFor="github-pr-url">GitHub PR URL</Label>
							<Input
								id="github-pr-url"
								onChange={(event) => setValue(event.target.value)}
								placeholder="https://github.com/owner/repo/pull/123"
								type="url"
								value={value}
							/>
						</div>
						<Button
							type="submit"
							disabled={!isAuthenticated || isLoading}
						>
							Open PR
						</Button>
					</form>
					{error ? (
						<Alert
							variant="destructive"
							className="mt-3"
						>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					) : null}
				</CardContent>
			</Card>
		</main>
	);
}
