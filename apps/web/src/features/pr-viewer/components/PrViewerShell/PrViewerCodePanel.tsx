import type { Doc } from "../../../../../convex/_generated/dataModel";
import { PrViewerShellStatus } from ".";
import { DiffStack } from "./DiffStack";
import { PrViewerStatusCard } from "./PrViewerStatusCard";
import { PrViewerTabPanel } from "./PrViewerTabPanel";
import { PrViewerTab } from "./pr-viewer-tabs";

type PrDoc = Doc<"pullRequests">;

export function PrViewerCodePanel({
	pr,
	status,
	paths,
	patch,
	error,
	isViewed,
	onToggleViewed,
}: {
	pr: PrDoc | null;
	status: PrViewerShellStatus;
	paths: string[];
	patch: string | null;
	error?: string | null;
	isViewed: (path: string) => boolean;
	onToggleViewed: (path: string) => void;
}) {
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
