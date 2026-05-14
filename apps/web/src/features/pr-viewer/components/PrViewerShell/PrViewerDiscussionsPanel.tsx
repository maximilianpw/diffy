import type { ReactNode } from "react";
import type { PrDoc } from "../../../../../convex/docTypes";
import type { DiffLocationTarget } from "../../model/diff-location";
import { PrDiscussion } from "../PrDiscussion";
import { PrSummaryCard } from "../PrSummaryCard";
import type { PrViewerShellStatus } from ".";
import { type PrUpdateCheck, PrUpdateNotice } from "./PrUpdateNotice";
import { PrViewerStatusCard } from "./PrViewerStatusCard";
import { PrViewerTabPanel } from "./PrViewerTabPanel";
import { PrViewerTab } from "./pr-viewer-tabs";

export function PrViewerDiscussionsPanel({
	pr,
	status,
	error,
	errorAction,
	updateCheck,
	onJumpToDiffLocation,
}: {
	pr: PrDoc | null;
	status: PrViewerShellStatus;
	error?: string | null;
	errorAction?: ReactNode;
	updateCheck?: PrUpdateCheck;
	onJumpToDiffLocation?: (target: DiffLocationTarget) => void;
}) {
	return (
		<PrViewerTabPanel tab={PrViewerTab.Discussions}>
			{pr ? <PrSummaryCard pr={pr} /> : null}
			{updateCheck ? <PrUpdateNotice updateCheck={updateCheck} /> : null}
			{pr ? (
				<PrDiscussion pr={pr} onJumpToDiffLocation={onJumpToDiffLocation} />
			) : null}
			<PrViewerStatusCard status={status} error={error} action={errorAction} />
		</PrViewerTabPanel>
	);
}
