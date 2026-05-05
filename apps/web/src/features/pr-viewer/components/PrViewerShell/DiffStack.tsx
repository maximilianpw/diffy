import {
	type WorkerInitializationRenderOptions,
	WorkerPoolContextProvider,
	type WorkerPoolOptions,
} from "@pierre/diffs/react";
import DiffWorker from "@pierre/diffs/worker/worker.js?worker";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { splitPatchFiles } from "../../model/diff-paths";
import { FileCard } from "../FileCard";

const diffWorkerHighlighterOptions = {
	theme: "vesper",
} satisfies WorkerInitializationRenderOptions;

const diffWorkerPoolOptions = {
	workerFactory: () => new DiffWorker(),
	poolSize: 4,
} satisfies WorkerPoolOptions;

type DiffStackProps = {
	patch: string;
	paths: string[];
	isViewed: (path: string) => boolean;
	onToggleViewed: (path: string) => void;
};

export function DiffStack({
	patch,
	paths,
	isViewed,
	onToggleViewed,
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
