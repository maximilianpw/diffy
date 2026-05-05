import type { ReactNode } from "react";
import { type PrViewerTab, prViewerTabs } from "./pr-viewer-tabs";

export function PrViewerTabPanel({
	tab,
	children,
}: {
	tab: PrViewerTab;
	children: ReactNode;
}) {
	const tabConfig = prViewerTabs[tab];

	return (
		<div
			aria-labelledby={tabConfig.id}
			className="flex flex-col gap-6"
			id={tabConfig.panelId}
			role="tabpanel"
		>
			{children}
		</div>
	);
}
