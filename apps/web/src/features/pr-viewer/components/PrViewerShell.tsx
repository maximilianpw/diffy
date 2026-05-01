import {
	type WorkerInitializationRenderOptions,
	WorkerPoolContextProvider,
	type WorkerPoolOptions,
} from "@pierre/diffs/react";
import DiffWorker from "@pierre/diffs/worker/worker.js?worker";
import { themeToTreeStyles } from "@pierre/trees";
import { FileTree, useFileTree } from "@pierre/trees/react";
import vesper from "@shikijs/themes/vesper";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { useViewedFiles } from "../hooks/use-viewed-files";
import { splitPatchFiles } from "../model/diff-paths";
import {
	findFileIndexForFragment,
	jumpToFileFragment,
} from "../model/file-fragment";
import { FileCard } from "./FileCard";
import { PrSummaryCard } from "./PrSummaryCard";

const treeThemeStyles = themeToTreeStyles(vesper);

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
	const { isViewed, toggle, viewedPaths } = useViewedFiles(
		pr ?? { owner: "", repo: "", number: 0 },
	);

	return (
		<div className="grid min-h-[calc(100vh-3rem)] grid-cols-1 lg:grid-cols-[280px_1fr]">
			<ChangedFilesTree
				key={treeKey}
				paths={paths}
				viewedPaths={viewedPaths}
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

function ChangedFilesTree({
	paths,
	viewedPaths,
	onFileSelect,
}: {
	paths: string[];
	viewedPaths: readonly string[];
	onFileSelect: (fileIndex: number) => void;
}) {
	const { model } = useFileTree({
		paths,
		viewedPaths,
		initialExpansion: "open",
		flattenEmptyDirectories: true,
		stickyFolders: true,
		search: true,
		density: "relaxed",
	});

	function handleTreeClick(event: ReactMouseEvent<HTMLElement>) {
		const clickedPath = getClickedTreeFilePath(event.nativeEvent);
		const isPlainClick = !event.ctrlKey && !event.metaKey && !event.shiftKey;
		const fileIndex = clickedPath == null ? -1 : paths.indexOf(clickedPath);

		if (isPlainClick && fileIndex >= 0) {
			onFileSelect(fileIndex);
		}
	}

	return (
		<aside
			className="border-b bg-card lg:sticky lg:top-12 lg:self-start lg:border-r lg:border-b-0"
			style={{ height: "calc(100vh - 3rem)" }}
		>
			<FileTree
				model={model}
				header={
					<>
						<div className="flex items-center justify-between px-4 py-3">
							<span className="font-medium font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
								Changed files
							</span>
							<span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
								{paths.length}
							</span>
						</div>
						<Separator />
					</>
				}
				className="h-full"
				onClick={handleTreeClick}
				style={{ height: "calc(100vh - 3rem)", ...treeThemeStyles }}
			/>
		</aside>
	);
}

function getClickedTreeFilePath(event: MouseEvent): string | null {
	const composedPath =
		typeof event.composedPath === "function" ? event.composedPath() : [];

	for (const target of composedPath) {
		if (!(target instanceof HTMLElement)) continue;
		if (target.dataset.itemType === "file") {
			return target.dataset.itemPath ?? null;
		}
	}

	if (event.target instanceof Element) {
		return (
			event.target.closest<HTMLElement>("[data-item-type='file']")?.dataset
				.itemPath ?? null
		);
	}

	return null;
}
