import { createFileRoute } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Crumb, CrumbLink, CrumbSeparator, TopBar } from "#/components/top-bar";
import { api } from "../../convex/_generated/api";
import { PrViewerShell } from "../features/pr-viewer/components/PrViewerShell";
import { getChangedPathsFromPatch } from "../features/pr-viewer/model/diff-paths";

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
	const pr = useQuery(api.pullRequests.getByPr, {
		owner,
		repo,
		number: prNumber,
	});
	const [patch, setPatch] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [importStarted, setImportStarted] = useState(false);

	useEffect(() => {
		if (pr !== null || importStarted) return;

		setImportStarted(true);
		void importPr({ owner, repo, number: prNumber }).catch((cause) => {
			setError(
				cause instanceof Error
					? cause.message
					: "Could not import pull request.",
			);
		});
	}, [importPr, importStarted, owner, pr, prNumber, repo]);

	useEffect(() => {
		if (!pr?.diffUrl) return;

		let cancelled = false;
		void fetch(pr.diffUrl)
			.then((response) => {
				if (!response.ok)
					throw new Error(`Diff fetch failed: ${response.status}`);
				return response.text();
			})
			.then((text) => {
				if (!cancelled) setPatch(text);
			})
			.catch((cause) => {
				if (!cancelled) {
					setError(
						cause instanceof Error
							? cause.message
							: "Could not load pull request diff.",
					);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [pr?.diffUrl]);

	const status = error ? "error" : patch ? "ready" : "importing";
	const paths = patch ? getChangedPathsFromPatch(patch) : [];

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
				status={status}
				paths={paths}
				patch={patch}
				error={error}
			/>
		</>
	);
}
