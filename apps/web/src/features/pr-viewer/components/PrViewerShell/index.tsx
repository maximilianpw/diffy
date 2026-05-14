import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import type { PrDoc } from "../../../../../convex/docTypes";
import { usePrDiff } from "../../hooks/use-pr-diff";
import { useViewedFiles } from "../../hooks/use-viewed-files";
import type { DiffLocationTarget } from "../../model/diff-location";
import {
	findFileIndexForFragment,
	jumpToDiffLocation,
	jumpToFileFragment,
} from "../../model/file-fragment";
import { ChangedFilesTree } from "../ChangedFilesTree";
import type { PrUpdateCheck } from "./PrUpdateNotice";
import { PrViewerCodePanel } from "./PrViewerCodePanel";
import { PrViewerDiscussionsPanel } from "./PrViewerDiscussionsPanel";
import { PrViewerTabButton } from "./PrViewerTabButton";
import { PrViewerTab } from "./pr-viewer-tabs";

export type { PrUpdateCheck } from "./PrUpdateNotice";

type PrViewerShellProps = {
	pr: (PrDoc & { diffUrl: string | null }) | null;
	importError?: string | null;
	importErrorAction?: ReactNode;
	updateCheck?: PrUpdateCheck;
};

export enum PrViewerShellStatus {
	Importing = "importing",
	Ready = "ready",
	Error = "error",
	Empty = "empty",
}

export function PrViewerShell({
	pr,
	importError,
	importErrorAction,
	updateCheck,
}: PrViewerShellProps) {
	const {
		patch,
		patchFiles,
		paths,
		error: diffError,
	} = usePrDiff(pr?.diffUrl ?? undefined);
	const error = importError ?? diffError;
	const status = error
		? PrViewerShellStatus.Error
		: pr && patch
			? PrViewerShellStatus.Ready
			: PrViewerShellStatus.Importing;

	const [selectedTab, setSelectedTab] = useState<PrViewerTab>(() =>
		findFileIndexForFragment(paths.length) === null
			? PrViewerTab.Discussions
			: PrViewerTab.Code,
	);
	const [pendingFileJump, setPendingFileJump] = useState<number | null>(() =>
		findFileIndexForFragment(paths.length),
	);
	const [selectedDiffLocation, setSelectedDiffLocation] =
		useState<DiffLocationTarget | null>(null);
	const [pendingDiffLocationJump, setPendingDiffLocationJump] =
		useState<DiffLocationTarget | null>(null);
	const appliedFragmentJumpRef = useRef(pendingFileJump !== null);
	const pendingFileJumpRef = useRef(pendingFileJump);
	pendingFileJumpRef.current = pendingFileJump;
	const scrollToFileRef = useRef<((fileIndex: number) => void) | null>(null);
	const treeKey = paths.join("\0");
	const { isViewed, setPathsViewed, toggle, viewedPaths } = useViewedFiles(pr);
	const handleScrollToFileReady = useCallback(
		(scrollToFile: ((fileIndex: number) => void) | null) => {
			scrollToFileRef.current = scrollToFile;
		},
		[],
	);

	useEffect(() => {
		if (selectedTab === PrViewerTab.Code || appliedFragmentJumpRef.current) {
			return;
		}

		const fragmentFileIndex = findFileIndexForFragment(paths.length);
		if (fragmentFileIndex === null) return;

		appliedFragmentJumpRef.current = true;
		setSelectedTab(PrViewerTab.Code);
		setPendingFileJump(fragmentFileIndex);
	}, [paths.length, selectedTab]);

	useEffect(() => {
		if (selectedTab !== PrViewerTab.Code || pendingFileJump === null) return;
		if (pendingFileJumpRef.current !== pendingFileJump) return;

		if (jumpToFileFragment(pendingFileJump)) {
			pendingFileJumpRef.current = null;
			setPendingFileJump(null);
			return;
		}
		scrollToFileRef.current?.(pendingFileJump);
	}, [pendingFileJump, selectedTab]);

	useEffect(() => {
		if (
			selectedTab !== PrViewerTab.Code ||
			pendingDiffLocationJump === null ||
			paths.length === 0
		) {
			return;
		}

		const fileIndex = paths.indexOf(pendingDiffLocationJump.path);
		if (fileIndex === -1) {
			setPendingDiffLocationJump(null);
			setSelectedDiffLocation(null);
			return;
		}

		if (jumpToDiffLocation(fileIndex, pendingDiffLocationJump)) {
			setPendingDiffLocationJump(null);
			return;
		}
		scrollToFileRef.current?.(fileIndex);
	}, [paths, pendingDiffLocationJump, selectedTab]);

	function handleFileSelect(fileIndex: number) {
		setSelectedDiffLocation(null);
		setSelectedTab(PrViewerTab.Code);
		setPendingFileJump(fileIndex);
	}

	function handleDiffLocationSelect(target: DiffLocationTarget) {
		setPathsViewed([target.path], false);
		setSelectedDiffLocation(target);
		setSelectedTab(PrViewerTab.Code);
		setPendingDiffLocationJump(target);
	}

	function handleFileRendered(path: string) {
		const pendingFileJump = pendingFileJumpRef.current;
		if (pendingFileJump === null || paths[pendingFileJump] !== path) return;
		if (jumpToFileFragment(pendingFileJump)) {
			pendingFileJumpRef.current = null;
			setPendingFileJump(null);
		}
	}

	function handleDiffRendered(path: string) {
		if (
			selectedTab !== PrViewerTab.Code ||
			pendingDiffLocationJump === null ||
			pendingDiffLocationJump.path !== path
		) {
			return;
		}

		const fileIndex = paths.indexOf(path);
		if (fileIndex === -1) {
			setPendingDiffLocationJump(null);
			setSelectedDiffLocation(null);
			return;
		}

		if (jumpToDiffLocation(fileIndex, pendingDiffLocationJump)) {
			setPendingDiffLocationJump(null);
		}
	}

	return (
		<div className="sidebar-page-grid">
			<ChangedFilesTree
				key={treeKey}
				paths={paths}
				viewedPaths={viewedPaths}
				onSetPathsViewed={setPathsViewed}
				onFileSelect={handleFileSelect}
			/>

			<section
				aria-label="Pull request preview"
				className="flex min-w-0 flex-col px-6 py-8 lg:px-10"
			>
				<div
					aria-label="Pull request sections"
					className="mb-6 flex border-b"
					role="tablist"
				>
					<PrViewerTabButton
						tab={PrViewerTab.Discussions}
						selectedTab={selectedTab}
						onSelect={setSelectedTab}
					/>
					<PrViewerTabButton
						tab={PrViewerTab.Code}
						selectedTab={selectedTab}
						onSelect={setSelectedTab}
					/>
				</div>

				{selectedTab === PrViewerTab.Discussions ? (
					<PrViewerDiscussionsPanel
						pr={pr}
						status={status}
						error={error}
						errorAction={error ? importErrorAction : undefined}
						updateCheck={updateCheck}
						onJumpToDiffLocation={handleDiffLocationSelect}
					/>
				) : (
					<PrViewerCodePanel
						pr={pr}
						status={status}
						paths={paths}
						patch={patch}
						patchFiles={patchFiles}
						error={error}
						isViewed={isViewed}
						selectedDiffLocation={selectedDiffLocation}
						onToggleViewed={toggle}
						onFileRendered={handleFileRendered}
						onDiffRendered={handleDiffRendered}
						onScrollToFileReady={handleScrollToFileReady}
						errorAction={error ? importErrorAction : undefined}
					/>
				)}
			</section>
		</div>
	);
}
