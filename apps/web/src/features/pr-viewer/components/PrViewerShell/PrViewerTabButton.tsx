import { cn } from "#/lib/utils";
import { PrViewerTab, prViewerTabs } from "./pr-viewer-tabs";

export function PrViewerTabButton({
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
