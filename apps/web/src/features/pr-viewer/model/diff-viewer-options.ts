import type {
	PatchDiffProps,
	WorkerInitializationRenderOptions,
} from "@pierre/diffs/react";

export const DIFF_VIEWER_THEME = "vesper";

export const FULL_DIFF_VIEWER_OPTIONS = {
	theme: DIFF_VIEWER_THEME,
} satisfies PatchDiffProps<undefined>["options"];

export const REVIEW_COMMENT_DIFF_VIEWER_OPTIONS = {
	theme: DIFF_VIEWER_THEME,
	diffStyle: "unified",
	disableFileHeader: true,
	overflow: "wrap",
} satisfies PatchDiffProps<undefined>["options"];

export const DIFF_WORKER_HIGHLIGHTER_OPTIONS = {
	theme: DIFF_VIEWER_THEME,
} satisfies WorkerInitializationRenderOptions;
