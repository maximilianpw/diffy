import { GitHubCredentialHealth } from "@diffy/shared";
import { useAction, useMutation, useQuery } from "convex/react";
import { KeyRound, RefreshCw, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { api } from "../../../../convex/_generated/api";
import { getImportErrorMessage } from "../model/import-error-message";

type GitHubCredentialRecoveryProps = {
	owner: string;
	repo: string;
	onSaved: () => Promise<void>;
};

enum CredentialRecoveryStatus {
	Idle = "idle",
	Saving = "saving",
	Testing = "testing",
	Deleting = "deleting",
}

export function GitHubCredentialRecovery({
	owner,
	repo,
	onSaved,
}: GitHubCredentialRecoveryProps) {
	const credential = useQuery(api.githubCredentials.getForRepository, {
		owner,
		repo,
	});
	const saveCredential = useAction(
		api.githubCredentials.saveRepositoryCredential,
	);
	const verifyCredential = useAction(
		api.githubCredentials.verifyRepositoryCredential,
	);
	const deleteCredential = useMutation(
		api.githubCredentials.deleteRepositoryCredential,
	);
	const [token, setToken] = useState("");
	const [status, setStatus] = useState(CredentialRecoveryStatus.Idle);
	const [error, setError] = useState<string | null>(null);
	const pending = status !== CredentialRecoveryStatus.Idle;

	async function handleSave(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setStatus(CredentialRecoveryStatus.Saving);
		setError(null);
		try {
			await saveCredential({ owner, repo, token });
			setToken("");
			await onSaved();
		} catch (cause) {
			setError(getImportErrorMessage(cause));
		} finally {
			setStatus(CredentialRecoveryStatus.Idle);
		}
	}

	async function handleVerify() {
		setStatus(CredentialRecoveryStatus.Testing);
		setError(null);
		try {
			await verifyCredential({ owner, repo });
			await onSaved();
		} catch (cause) {
			setError(getImportErrorMessage(cause));
		} finally {
			setStatus(CredentialRecoveryStatus.Idle);
		}
	}

	async function handleDelete() {
		setStatus(CredentialRecoveryStatus.Deleting);
		setError(null);
		try {
			await deleteCredential({ owner, repo });
		} catch (cause) {
			setError(getImportErrorMessage(cause));
		} finally {
			setStatus(CredentialRecoveryStatus.Idle);
		}
	}

	return (
		<div className="mt-4 max-w-2xl rounded-md border bg-background/60 p-4 text-foreground">
			<div className="mb-3 flex items-start justify-between gap-3">
				<div className="min-w-0">
					<h2 className="flex items-center gap-2 font-medium text-sm">
						<KeyRound className="size-4" aria-hidden="true" />
						Repository token
					</h2>
					<p className="mt-1 text-muted-foreground text-xs/relaxed">
						Save a fine-grained token with read access to {owner}/{repo}.
					</p>
				</div>
				{credential ? (
					<Badge
						variant={
							credential.health === GitHubCredentialHealth.Healthy
								? "secondary"
								: "destructive"
						}
					>
						{credential.health}
					</Badge>
				) : null}
			</div>

			{credential ? (
				<div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
					<span>Token ending in {credential.tokenLastFour}</span>
					<span>Scope: {credential.scopeLabel}</span>
					{credential.lastFailure ? (
						<span className="text-destructive">{credential.lastFailure}</span>
					) : null}
				</div>
			) : null}

			<form className="grid gap-3" onSubmit={handleSave}>
				<div className="grid gap-1.5">
					<Label htmlFor="github-repository-token">GitHub token</Label>
					<Input
						id="github-repository-token"
						type="password"
						autoComplete="off"
						value={token}
						placeholder="github_pat_..."
						onChange={(event) => setToken(event.currentTarget.value)}
					/>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<Button type="submit" disabled={pending || token.trim() === ""}>
						<KeyRound data-icon="inline-start" aria-hidden="true" />
						{credential ? "Replace and retry" : "Save and retry"}
					</Button>
					{credential ? (
						<>
							<Button
								type="button"
								variant="outline"
								disabled={pending}
								onClick={() => void handleVerify()}
							>
								<RefreshCw data-icon="inline-start" aria-hidden="true" />
								Test and retry
							</Button>
							<Button
								type="button"
								variant="destructive"
								disabled={pending}
								onClick={() => void handleDelete()}
							>
								<Trash2 data-icon="inline-start" aria-hidden="true" />
								Delete
							</Button>
						</>
					) : null}
				</div>
			</form>

			{error ? (
				<Alert className="mt-3" variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}
		</div>
	);
}
