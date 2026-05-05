import type { PrCommentDoc, PrDoc } from "../../../../../convex/doc-types";
import { PrDiscussion } from "../PrDiscussion";
import { PrSummaryCard } from "../PrSummaryCard";
import type { PrViewerShellStatus } from ".";
import { type PrUpdateCheck, PrUpdateNotice } from "./PrUpdateNotice";
import { PrViewerStatusCard } from "./PrViewerStatusCard";
import { PrViewerTabPanel } from "./PrViewerTabPanel";
import { PrViewerTab } from "./pr-viewer-tabs";

export function PrViewerDiscussionsPanel({
	pr,
	comments,
	status,
	error,
	updateCheck,
}: {
	pr: PrDoc | null;
	comments: PrCommentDoc[];
	status: PrViewerShellStatus;
	error?: string | null;
	updateCheck?: PrUpdateCheck;
}) {
	return (
		<PrViewerTabPanel tab={PrViewerTab.Discussions}>
			{pr ? <PrSummaryCard pr={pr} /> : null}
			{updateCheck ? <PrUpdateNotice updateCheck={updateCheck} /> : null}
			{pr ? <PrDiscussion pr={pr} comments={comments} /> : null}
			<PrViewerStatusCard status={status} error={error} />
		</PrViewerTabPanel>
	);
}
