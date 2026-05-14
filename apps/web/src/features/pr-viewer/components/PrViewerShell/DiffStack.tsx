import {
	WorkerPoolContextProvider,
	type WorkerPoolOptions,
} from "@pierre/diffs/react";
import DiffWorker from "@pierre/diffs/worker/worker.js?worker";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
	type DiffLocationTarget,
	getSelectedLinesForDiffLocation,
} from "../../model/diff-location";
import type { PatchFile } from "../../model/diff-paths";
import { DIFF_WORKER_HIGHLIGHTER_OPTIONS } from "../../model/diff-viewer-options";
import { FileCard } from "../FileCard";

const diffWorkerPoolOptions = {
	workerFactory: () => new DiffWorker(),
	poolSize: 4,
} satisfies WorkerPoolOptions;

type DiffStackProps = {
	patchFiles: PatchFile[];
	paths: string[];
	isViewed: (path: string) => boolean;
	selectedDiffLocation?: DiffLocationTarget | null;
	onToggleViewed: (path: string) => void;
	onFileRendered?: (path: string) => void;
	onDiffRendered?: (path: string) => void;
	onScrollToFileReady?: (
		scrollToFile: ((fileIndex: number) => void) | null,
	) => void;
};

export function DiffStack({
	patchFiles,
	paths,
	isViewed,
	selectedDiffLocation,
	onToggleViewed,
	onFileRendered,
	onDiffRendered,
	onScrollToFileReady,
}: DiffStackProps) {
	const parentRef = useRef<HTMLDivElement | null>(null);
	const [scrollMargin, setScrollMargin] = useState(0);
	const estimatedSizes = useMemo(
		() => patchFiles.map(estimatePatchFileSize),
		[patchFiles],
	);
	const getItemKey = useCallback(
		(index: number) => patchFiles[index]?.path ?? index,
		[patchFiles],
	);
	const virtualizer = useWindowVirtualizer({
		count: patchFiles.length,
		estimateSize: (index) => estimatedSizes[index] ?? MIN_FILE_CARD_HEIGHT,
		getItemKey,
		overscan: 2,
		scrollMargin,
	});
	const scrollToFile = useCallback(
		(fileIndex: number) => {
			virtualizer.scrollToIndex(fileIndex, { align: "start" });
		},
		[virtualizer],
	);

	useLayoutEffect(() => {
		setScrollMargin(parentRef.current?.offsetTop ?? 0);
	}, []);

	useLayoutEffect(() => {
		onScrollToFileReady?.(scrollToFile);
		return () => onScrollToFileReady?.(null);
	}, [onScrollToFileReady, scrollToFile]);

	return (
		<DiffWorkerPoolProvider>
			<div ref={parentRef} className="relative">
				<div className="sr-only">{paths.join("\n")}</div>
				<div
					className="relative w-full"
					style={{ height: `${virtualizer.getTotalSize()}px` }}
				>
					{virtualizer.getVirtualItems().map((virtualItem) => {
						const file = patchFiles[virtualItem.index];
						if (!file) return null;

						return (
							<div
								key={virtualItem.key}
								data-index={virtualItem.index}
								ref={virtualizer.measureElement}
								className="absolute top-0 left-0 w-full pb-4"
								style={{
									transform: `translateY(${
										virtualItem.start - scrollMargin
									}px)`,
								}}
							>
								<FileCard
									fileIndex={virtualItem.index}
									path={file.path}
									patch={file.patch}
									viewed={isViewed(file.path)}
									selectedLines={
										selectedDiffLocation?.path === file.path
											? getSelectedLinesForDiffLocation(selectedDiffLocation)
											: null
									}
									onToggleViewed={() => onToggleViewed(file.path)}
									onFileRendered={onFileRendered}
									onDiffRendered={onDiffRendered}
								/>
							</div>
						);
					})}
				</div>
			</div>
		</DiffWorkerPoolProvider>
	);
}

const MIN_FILE_CARD_HEIGHT = 72;
const DIFF_LINE_HEIGHT = 24;
const FILE_CARD_CHROME_HEIGHT = 72;

function estimatePatchFileSize(file: PatchFile): number {
	const lineCount = file.patch.split("\n").length;
	return Math.max(
		MIN_FILE_CARD_HEIGHT,
		FILE_CARD_CHROME_HEIGHT + lineCount * DIFF_LINE_HEIGHT,
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
