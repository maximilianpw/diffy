export enum PrViewerTab {
	Discussions = "discussions",
	Code = "code",
}

export const prViewerTabs = {
	[PrViewerTab.Discussions]: {
		id: "pr-viewer-discussions-tab",
		panelId: "pr-viewer-discussions-panel",
		label: "Discussions",
	},
	[PrViewerTab.Code]: {
		id: "pr-viewer-code-tab",
		panelId: "pr-viewer-code-panel",
		label: "Code",
	},
} as const satisfies Record<
	PrViewerTab,
	{ id: string; panelId: string; label: string }
>;
