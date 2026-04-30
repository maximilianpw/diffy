import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { useState } from "react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { getPrPathFromSubmission } from "../model/parse-submission";

type PastePrHomeProps = {
	navigateToPr: (path: string) => void;
};

export function PastePrHome({ navigateToPr }: PastePrHomeProps) {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const { signIn } = useAuthActions();
	const [value, setValue] = useState("");
	const [error, setError] = useState<string | null>(null);

	function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const path = getPrPathFromSubmission(value);
		if (!isAuthenticated) {
			setError("Sign in with GitHub before opening a pull request.");
			return;
		}

		if (!path) {
			setError("Paste a GitHub pull request URL.");
			return;
		}

		setError(null);
		navigateToPr(path);
	}

	return (
		<main className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col justify-center px-6 py-16">
			<div className="flex flex-col gap-10">
				<div className="flex flex-col gap-3">
					<p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
						Diffy / pull request viewer
					</p>
					<h1 className="font-heading text-4xl/[1.05] font-semibold tracking-tight text-foreground sm:text-5xl/[1.05]">
						Read a pull request
						<br />
						<span className="text-muted-foreground">like a manuscript.</span>
					</h1>
					<p className="max-w-xl text-sm/relaxed text-muted-foreground">
						Paste a GitHub pull request URL to inspect every changed file in a
						focused, distraction-free diff viewer. Tokens stay on the Convex
						backend; nothing about the PR is shared anywhere else.
					</p>
				</div>

				{!isAuthenticated && !isLoading ? (
					<Card size="sm">
						<CardContent className="flex items-center justify-between gap-4">
							<CardDescription>
								Diffy uses your GitHub OAuth token to fetch PR diffs. The token
								never leaves the Convex backend.
							</CardDescription>
							<Button
								type="button"
								size="lg"
								onClick={() => void signIn("github")}
								disabled={isLoading}
								className="shrink-0"
							>
								Sign in with GitHub
							</Button>
						</CardContent>
					</Card>
				) : null}

				<form aria-label="Open GitHub PR" onSubmit={onSubmit}>
					<Card size="sm">
						<CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
							<div className="min-w-0 flex-1 space-y-1.5">
								<Label
									htmlFor="github-pr-url"
									className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
								>
									Pull request URL
								</Label>
								<Input
									id="github-pr-url"
									onChange={(event) => setValue(event.target.value)}
									placeholder="https://github.com/owner/repo/pull/123"
									type="url"
									value={value}
									className="font-mono text-sm"
								/>
							</div>
							<Button
								type="submit"
								size="lg"
								disabled={!isAuthenticated || isLoading}
							>
								Open PR
							</Button>
						</CardContent>
					</Card>
				</form>

				{error ? (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				) : null}
			</div>
		</main>
	);
}
