import {
	type WorkerInitializationRenderOptions,
	WorkerPoolContextProvider,
	type WorkerPoolOptions,
} from "@pierre/diffs/react";
import DiffWorker from "@pierre/diffs/worker/worker.js?worker";
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { Card } from "#/components/ui/card";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { useViewedFiles } from "../hooks/use-viewed-files";
import { splitPatchFiles } from "../model/diff-paths";
import {
	findFileIndexForFragment,
	jumpToFileFragment,
} from "../model/file-fragment";
import { ChangedFilesTree } from "./ChangedFilesTree";
import { FileCard } from "./FileCard";
import { PrSummaryCard } from "./PrSummaryCard";

const diffWorkerHighlighterOptions = {
	theme: "vesper",
} satisfies WorkerInitializationRenderOptions;

const diffWorkerPoolOptions = {
	workerFactory: () => new DiffWorker(),
	poolSize: 4,
} satisfies WorkerPoolOptions;

type PrDoc = Doc<"pullRequests">;

type PrViewerShellProps = {
	pr: PrDoc | null;
	status: "importing" | "ready" | "error";
	paths: string[];
	patch: string | null;
	error?: string | null;
};

export function PrViewerShell({
	pr,
	status,
	paths,
	patch,
	error,
}: PrViewerShellProps) {
	const viewerKey = pr ? `${pr.owner}/${pr.repo}#${pr.number}` : "empty";

	return (
		<PrViewerContent
			key={viewerKey}
			pr={pr}
			status={status}
			paths={paths}
			patch={patch}
			error={error}
		/>
	);
}

function PrViewerContent({
	pr,
	status,
	paths,
	patch,
	error,
}: PrViewerShellProps) {
	const treeKey = paths.join("\0");
	const { isViewed, setPathsViewed, toggle, viewedPaths } = useViewedFiles(
		pr ?? { owner: "", repo: "", number: 0 },
	);

	return (
		<div className="grid min-h-[calc(100vh-3rem)] grid-cols-1 lg:grid-cols-[280px_1fr]">
			<ChangedFilesTree
				key={treeKey}
				paths={paths}
				viewedPaths={viewedPaths}
				onSetPathsViewed={setPathsViewed}
				onFileSelect={jumpToFileFragment}
			/>

			<section
				aria-label="Diff preview"
				className="flex flex-col gap-6 px-6 py-8 lg:px-10"
			>
				{pr ? <PrSummaryCard pr={pr} /> : null}

				{status === "importing" ? (
					<Card className="p-4 text-muted-foreground">
						Importing pull request from GitHub...
					</Card>
				) : status === "error" ? (
					<Card className="p-4 text-destructive">
						{error ?? "Could not load pull request."}
					</Card>
				) : pr && patch ? (
					<DiffStack
						patch={patch}
						paths={paths}
						isViewed={isViewed}
						onToggleViewed={toggle}
					/>
				) : (
					<Card className="p-4 text-muted-foreground">
						No diff content available.
					</Card>
				)}
			</section>
		</div>
	);
}

function DiffStack({
	patch,
	paths,
	isViewed,
	onToggleViewed,
}: {
	patch: string;
	paths: string[];
	isViewed: (path: string) => boolean;
	onToggleViewed: (path: string) => void;
}) {
	const patchFiles = useMemo(() => splitPatchFiles(patch), [patch]);

	useEffect(() => {
		const fileIndex = findFileIndexForFragment(patchFiles.length);
		if (fileIndex !== null) jumpToFileFragment(fileIndex);
	}, [patchFiles.length]);

	return (
		<DiffWorkerPoolProvider>
			<div className="flex flex-col gap-4">
				<div className="sr-only">{paths.join("\n")}</div>
				{patchFiles.map((file, fileIndex) => (
					<FileCard
						key={file.path}
						fileIndex={fileIndex}
						path={file.path}
						patch={file.patch}
						viewed={isViewed(file.path)}
						onToggleViewed={() => onToggleViewed(file.path)}
					/>
				))}
			</div>
		</DiffWorkerPoolProvider>
	);
}

function DiffWorkerPoolProvider({ children }: { children: ReactNode }) {
	if (typeof Worker === "undefined") return children;

	return (
		<WorkerPoolContextProvider
			poolOptions={diffWorkerPoolOptions}
			highlighterOptions={diffWorkerHighlighterOptions}
		>
			{children}
		</WorkerPoolContextProvider>
	);
}
