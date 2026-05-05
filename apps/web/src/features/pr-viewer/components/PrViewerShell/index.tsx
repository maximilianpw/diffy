import { cn } from "#/lib/utils";
import { useEffect, useRef, useState } from "react";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { useViewedFiles } from "../../hooks/use-viewed-files";
import {
	findFileIndexForFragment,
	jumpToFileFragment,
} from "../../model/file-fragment";
import { ChangedFilesTree } from "../ChangedFilesTree";
import type { PrUpdateCheck } from "./PrUpdateNotice";
import { PrViewerCodePanel } from "./PrViewerCodePanel";
import { PrViewerDiscussionsPanel } from "./PrViewerDiscussionsPanel";
import { PrViewerTab, prViewerTabs } from "./pr-viewer-tabs";
export type { PrUpdateCheck } from "./PrUpdateNotice";

type PrDoc = Doc<"pullRequests">;
type PrCommentDoc = Doc<"pullRequestComments">;

type PrViewerShellProps = {
	pr: PrDoc | null;
	status: PrViewerShellStatus;
	paths: string[];
	patch: string | null;
	comments?: PrCommentDoc[];
	error?: string | null;
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
	comments = [],
	status,
	paths,
	patch,
	error,
	updateCheck,
}: PrViewerShellProps) {
	const [selectedTab, setSelectedTab] = useState<PrViewerTab>(() =>
		findFileIndexForFragment(paths.length) === null
			? PrViewerTab.Discussions
			: PrViewerTab.Code,
	);
	const [pendingFileJump, setPendingFileJump] = useState<number | null>(() =>
		findFileIndexForFragment(paths.length),
	);
	const appliedFragmentJumpRef = useRef(pendingFileJump !== null);
	const treeKey = paths.join("\0");
	const { isViewed, setPathsViewed, toggle, viewedPaths } = useViewedFiles(pr);

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

		jumpToFileFragment(pendingFileJump);
		setPendingFileJump(null);
	}, [pendingFileJump, selectedTab]);

	function handleFileSelect(fileIndex: number) {
		setSelectedTab(PrViewerTab.Code);
		setPendingFileJump(fileIndex);
	}

	return (
		<div className="grid min-h-[calc(100vh-3rem)] grid-cols-1 lg:grid-cols-[280px_1fr]">
			<ChangedFilesTree
				key={treeKey}
				paths={paths}
				viewedPaths={viewedPaths}
				onSetPathsViewed={setPathsViewed}
				onFileSelect={handleFileSelect}
			/>

			<section
				aria-label="Pull request preview"
				className="flex flex-col px-6 py-8 lg:px-10"
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
						comments={comments}
						status={status}
						error={error}
						updateCheck={updateCheck}
					/>
				) : (
					<PrViewerCodePanel
						pr={pr}
						status={status}
						paths={paths}
						patch={patch}
						error={error}
						isViewed={isViewed}
						onToggleViewed={toggle}
					/>
				)}
			</section>
		</div>
	);
}

function PrViewerTabButton({
	tab,
	onSelect,
	selectedTab,
}: {
	tab: PrViewerTab;
	onSelect: (tab: PrViewerTab) => void;
	selectedTab: PrViewerTab;
}) {
	const tabConfig = prViewerTabs[tab];
	const selected = tab === selectedTab;

	return (
		<button
			aria-controls={tabConfig.panelId}
			aria-selected={selected}
			className={cn(
				"-mb-px border-b-2 px-3 py-2 font-medium text-sm transition-colors",
				selected
					? "border-foreground text-foreground"
					: "border-transparent text-muted-foreground hover:text-foreground",
			)}
			id={tabConfig.id}
			onClick={() => onSelect(tab)}
			role="tab"
			type="button"
		>
			{tabConfig.label}
		</button>
	);
}
