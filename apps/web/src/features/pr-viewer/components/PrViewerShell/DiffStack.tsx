import {
	WorkerPoolContextProvider,
	type WorkerPoolOptions,
} from "@pierre/diffs/react";
import DiffWorker from "@pierre/diffs/worker/worker.js?worker";
import type { ReactNode } from "react";
import { useMemo } from "react";
import {
	type DiffLocationTarget,
	getSelectedLinesForDiffLocation,
} from "../../model/diff-location";
import { splitPatchFiles } from "../../model/diff-paths";
import { DIFF_WORKER_HIGHLIGHTER_OPTIONS } from "../../model/diff-viewer-options";
import { FileCard } from "../FileCard";

const diffWorkerPoolOptions = {
	workerFactory: () => new DiffWorker(),
	poolSize: 4,
} satisfies WorkerPoolOptions;

type DiffStackProps = {
	patch: string;
	paths: string[];
	isViewed: (path: string) => boolean;
	selectedDiffLocation?: DiffLocationTarget | null;
	onToggleViewed: (path: string) => void;
	onDiffRendered?: (path: string) => void;
};

export function DiffStack({
	patch,
	paths,
	isViewed,
	selectedDiffLocation,
	onToggleViewed,
	onDiffRendered,
}: DiffStackProps) {
	const patchFiles = useMemo(() => splitPatchFiles(patch), [patch]);

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
						selectedLines={
							selectedDiffLocation?.path === file.path
								? getSelectedLinesForDiffLocation(selectedDiffLocation)
								: null
						}
						onToggleViewed={() => onToggleViewed(file.path)}
						onDiffRendered={onDiffRendered}
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
			highlighterOptions={DIFF_WORKER_HIGHLIGHTER_OPTIONS}
		>
			{children}
		</WorkerPoolContextProvider>
	);
}
