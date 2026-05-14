import type { ReactNode } from "react";
import type { PrDoc } from "../../../../../convex/docTypes";
import type { DiffLocationTarget } from "../../model/diff-location";
import type { PatchFile } from "../../model/diff-paths";
import { PrViewerShellStatus } from ".";
import { DiffStack } from "./DiffStack";
import { PrViewerStatusCard } from "./PrViewerStatusCard";
import { PrViewerTabPanel } from "./PrViewerTabPanel";
import { PrViewerTab } from "./pr-viewer-tabs";

type PrViewerCodePanelProps = {
	pr: PrDoc | null;
	status: PrViewerShellStatus;
	paths: string[];
	patch: string | null;
	patchFiles: PatchFile[];
	isViewed: (path: string) => boolean;
	selectedDiffLocation?: DiffLocationTarget | null;
	onToggleViewed: (path: string) => void;
	onFileRendered?: (path: string) => void;
	onDiffRendered?: (path: string) => void;
	onScrollToFileReady?: (
		scrollToFile: ((fileIndex: number) => void) | null,
	) => void;
	error?: string | null;
	errorAction?: ReactNode;
};

export function PrViewerCodePanel({
	pr,
	status,
	paths,
	patch,
	patchFiles,
	isViewed,
	selectedDiffLocation,
	onToggleViewed,
	onFileRendered,
	onDiffRendered,
	onScrollToFileReady,
	error,
	errorAction,
}: PrViewerCodePanelProps) {
	if (
		status === PrViewerShellStatus.Importing ||
		status === PrViewerShellStatus.Error
	) {
		return (
			<PrViewerTabPanel tab={PrViewerTab.Code}>
				<PrViewerStatusCard
					status={status}
					error={error}
					action={errorAction}
				/>
			</PrViewerTabPanel>
		);
	}

	if (!pr || !patch) {
		return (
			<PrViewerTabPanel tab={PrViewerTab.Code}>
				<PrViewerStatusCard status={PrViewerShellStatus.Empty} />
			</PrViewerTabPanel>
		);
	}

	return (
		<PrViewerTabPanel tab={PrViewerTab.Code}>
			<DiffStack
				patchFiles={patchFiles}
				paths={paths}
				isViewed={isViewed}
				selectedDiffLocation={selectedDiffLocation}
				onToggleViewed={onToggleViewed}
				onFileRendered={onFileRendered}
				onDiffRendered={onDiffRendered}
				onScrollToFileReady={onScrollToFileReady}
			/>
		</PrViewerTabPanel>
	);
}
