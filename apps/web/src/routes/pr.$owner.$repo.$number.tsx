import { createFileRoute } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { TopBar } from "#/components/top-bar";
import { GitHubCredentialRecovery } from "#/features/pr-viewer/components/GitHubCredentialRecovery";
import type { PrUpdateCheck } from "#/features/pr-viewer/components/PrViewerShell";
import { api } from "../../convex/_generated/api";
import { PrViewerShell } from "../features/pr-viewer/components/PrViewerShell";
import { useEnsurePrImported } from "../features/pr-viewer/hooks/use-ensure-pr-imported";
import { usePrUpdatePolling } from "../features/pr-viewer/hooks/use-pr-update-polling";
import { getImportErrorMessage } from "../features/pr-viewer/model/import-error-message";
import { PullRequestState } from "../features/pr-viewer/model/pull-request.types";

export const Route = createFileRoute("/pr/$owner/$repo/$number")({
	params: {
		parse: ({ owner, repo, number }) => {
			const prNumber = Number(number);
			if (!Number.isInteger(prNumber) || prNumber < 1) {
				throw new Error("Pull request number must be a positive integer.");
			}

			return { owner, repo, number: prNumber };
		},
		stringify: ({ owner, repo, number }) => ({
			owner,
			repo,
			number: String(number),
		}),
	},
	component: PrRoute,
});

function PrRoute() {
	const { owner, repo, number } = Route.useParams();

	return (
		<PrRouteForPullRequest
			key={`${owner}/${repo}/${number}`}
			owner={owner}
			repo={repo}
			number={number}
		/>
	);
}

function PrRouteForPullRequest({
	owner,
	repo,
	number,
}: {
	owner: string;
	repo: string;
	number: number;
}) {
	const importPr = useAction(api.pullRequests.importPr);
	const importDiscussion = useAction(api.pullRequests.importDiscussion);
	const checkForUpdates = useAction(api.pullRequests.checkForUpdates);
	const pr = useQuery(api.pullRequests.getByPr, {
		owner,
		repo,
		number,
	});
	const importError = useEnsurePrImported({
		pr,
		owner,
		repo,
		number,
		importPr,
		importDiscussion,
	});
	const [updateError, setUpdateError] = useState<string | null>(null);
	const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);

	const polling = usePrUpdatePolling({
		prState: pr?.state,
		owner,
		repo,
		number,
		checkForUpdates,
		isApplyingUpdate,
	});

	const applyUpdate = useCallback(async () => {
		setIsApplyingUpdate(true);
		setUpdateError(null);
		try {
			await importPr({ owner, repo, number });
			polling.clearUpdatesAvailable();
			polling.clearError();
		} catch (cause) {
			setUpdateError(getImportErrorMessage(cause));
		} finally {
			setIsApplyingUpdate(false);
		}
	}, [importPr, owner, polling, number, repo]);

	const onApplyUpdate = useCallback(() => void applyUpdate(), [applyUpdate]);
	const importErrorAction = importError?.canSaveRepositoryCredential ? (
		<GitHubCredentialRecovery owner={owner} repo={repo} onSaved={applyUpdate} />
	) : undefined;

	const updateCheck: PrUpdateCheck | undefined =
		pr?.state === PullRequestState.Open
			? {
					status: polling.status,
					autoCheckEnabled: polling.autoCheckEnabled,
					error: polling.error,
					lastCheckedAt: polling.lastCheckedAt,
					onApplyUpdate,
					onToggleAutoCheck: polling.toggleAutoCheck,
				}
			: undefined;

	return (
		<>
			<TopBar pr={pr ?? { owner, repo, number }} />
			<PrViewerShell
				pr={pr ?? null}
				importError={importError?.message ?? updateError}
				importErrorAction={importErrorAction}
				updateCheck={updateCheck}
			/>
		</>
	);
}
