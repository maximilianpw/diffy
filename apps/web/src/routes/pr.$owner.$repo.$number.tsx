import { createFileRoute } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { Crumb, CrumbLink, CrumbSeparator, TopBar } from "#/components/top-bar";
import type { PrUpdateCheck } from "#/features/pr-viewer/components/PrViewerShell";
import { api } from "../../convex/_generated/api";
import { PrViewerShell } from "../features/pr-viewer/components/PrViewerShell";
import { usePrUpdatePolling } from "../features/pr-viewer/hooks/use-pr-update-polling";
import { shouldBackfillDiscussion } from "../features/pr-viewer/model/discussion-backfill";
import { getImportErrorMessage } from "../features/pr-viewer/model/import-error-message";
import { PullRequestState } from "../features/pr-viewer/model/pull-request.types";

export const Route = createFileRoute("/pr/$owner/$repo/$number")({
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
	number: string;
}) {
	const prNumber = Number(number);
	const importPr = useAction(api.pullRequests.importPr);
	const importDiscussion = useAction(api.pullRequests.importDiscussion);
	const checkForUpdates = useAction(api.pullRequests.checkForUpdates);
	const pr = useQuery(api.pullRequests.getByPr, {
		owner,
		repo,
		number: prNumber,
	});
	const [importError, setImportError] = useState<string | null>(null);
	const [importStarted, setImportStarted] = useState(false);
	const [discussionImportStarted, setDiscussionImportStarted] = useState(false);
	const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);

	const polling = usePrUpdatePolling({
		prState: pr?.state,
		owner,
		repo,
		number: prNumber,
		checkForUpdates,
		isApplyingUpdate,
	});

	useEffect(() => {
		if (pr !== null || importStarted) return;

		setImportStarted(true);
		void importPr({ owner, repo, number: prNumber }).catch((cause) => {
			setImportError(getImportErrorMessage(cause));
		});
	}, [importPr, importStarted, owner, pr, prNumber, repo]);

	useEffect(() => {
		if (!pr || !shouldBackfillDiscussion(pr) || discussionImportStarted) return;

		setDiscussionImportStarted(true);
		void importDiscussion({
			pullRequestId: pr._id,
			owner,
			repo,
			number: prNumber,
		}).catch((cause) => {
			setImportError(getImportErrorMessage(cause));
		});
	}, [discussionImportStarted, importDiscussion, owner, pr, prNumber, repo]);

	const applyUpdate = useCallback(async () => {
		setIsApplyingUpdate(true);
		setImportError(null);
		try {
			await importPr({ owner, repo, number: prNumber });
			polling.clearUpdatesAvailable();
			polling.clearError();
		} catch (cause) {
			setImportError(getImportErrorMessage(cause));
		} finally {
			setIsApplyingUpdate(false);
		}
	}, [importPr, owner, polling, prNumber, repo]);

	const onApplyUpdate = useCallback(() => void applyUpdate(), [applyUpdate]);

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
			<TopBar
				breadcrumb={
					<>
						<CrumbLink to="/">Pull requests</CrumbLink>
						<CrumbSeparator />
						<Crumb>
							{owner}/{repo}#{number}
						</Crumb>
					</>
				}
				htmlUrl={pr?.htmlUrl}
			/>
			<PrViewerShell
				pr={pr ?? null}
				importError={importError}
				updateCheck={updateCheck}
			/>
		</>
	);
}
