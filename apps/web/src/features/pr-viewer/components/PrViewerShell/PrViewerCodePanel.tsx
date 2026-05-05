import type { PrDoc } from "../../../../../convex/docTypes";
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
	isViewed: (path: string) => boolean;
	onToggleViewed: (path: string) => void;
	error?: string | null;
};

export function PrViewerCodePanel({
	pr,
	status,
	paths,
	patch,
	isViewed,
	onToggleViewed,
	error,
}: PrViewerCodePanelProps) {
	if (
		status === PrViewerShellStatus.Importing ||
		status === PrViewerShellStatus.Error
	) {
		return (
			<PrViewerTabPanel tab={PrViewerTab.Code}>
				<PrViewerStatusCard status={status} error={error} />
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
				patch={patch}
				paths={paths}
				isViewed={isViewed}
				onToggleViewed={onToggleViewed}
			/>
		</PrViewerTabPanel>
	);
}
