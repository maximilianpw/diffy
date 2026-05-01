import { type FileTreeRowDecoration, themeToTreeStyles } from "@pierre/trees";
import { FileTree, useFileTree } from "@pierre/trees/react";
import vesper from "@shikijs/themes/vesper";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useMemo, useRef } from "react";
import { Separator } from "#/components/ui/separator";

const treeThemeStyles = themeToTreeStyles(vesper);

const viewedCheckboxSpriteSheet = `
<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden" xmlns="http://www.w3.org/2000/svg">
	<symbol id="diffy-tree-checkbox-unchecked" viewBox="0 0 16 16">
		<rect x="3.5" y="3.5" width="9" height="9" rx="2" fill="none" stroke="currentColor" />
	</symbol>
	<symbol id="diffy-tree-checkbox-checked" viewBox="0 0 16 16">
		<rect x="3.5" y="3.5" width="9" height="9" rx="2" fill="none" stroke="currentColor" />
		<path d="M5.75 8.1 7.35 9.7 10.5 6.3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" />
	</symbol>
	<symbol id="diffy-tree-checkbox-mixed" viewBox="0 0 16 16">
		<rect x="3.5" y="3.5" width="9" height="9" rx="2" fill="none" stroke="currentColor" />
		<path d="M6 8h4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" />
	</symbol>
</svg>`;

const viewedCheckboxCss = `
[data-item-section='decoration'] {
	align-items: center;
	align-self: stretch;
	display: flex;
	flex: 0 0 var(--trees-row-height);
	justify-content: center;
	margin-block: 0;
	padding-inline-start: 0;
	cursor: pointer;
}

[data-item-section='decoration'] > span {
	width: 100%;
	height: 100%;
	justify-content: center;
	border-radius: 8px;
	color: var(--trees-fg-muted);
}

[data-item-section='decoration'] svg {
	width: calc(var(--trees-row-height) - 10px);
	height: calc(var(--trees-row-height) - 10px);
}

[data-item-section='decoration'] > span:hover {
	color: var(--trees-fg);
	background-color: var(--trees-bg-muted);
}

[data-icon-name='diffy-tree-checkbox-checked'] {
	color: var(--trees-fg);
}
`;

type ChangedFilesTreeProps = {
	paths: string[];
	viewedPaths: readonly string[];
	onSetPathsViewed: (paths: readonly string[], viewed: boolean) => void;
	onFileSelect: (fileIndex: number) => void;
};

export function ChangedFilesTree({
	paths,
	viewedPaths,
	onSetPathsViewed,
	onFileSelect,
}: ChangedFilesTreeProps) {
	const viewedPathSet = useMemo(() => new Set(viewedPaths), [viewedPaths]);
	const viewedPathSetRef = useRef<ReadonlySet<string>>(viewedPathSet);
	viewedPathSetRef.current = viewedPathSet;

	const renderRowDecoration = useCallback(
		({ item }: { item: { kind: "directory" | "file"; path: string } }) => {
			const state = getViewedState(
				item.path,
				item.kind,
				paths,
				viewedPathSetRef.current,
			);
			return getViewedDecoration(item.path, item.kind, state);
		},
		[paths],
	);

	const { model } = useFileTree({
		paths,
		viewedPaths,
		initialExpansion: "open",
		flattenEmptyDirectories: true,
		stickyFolders: true,
		search: true,
		density: "relaxed",
		icons: {
			set: "complete",
			colored: true,
			spriteSheet: viewedCheckboxSpriteSheet,
		},
		unsafeCSS: viewedCheckboxCss,
		renderRowDecoration,
	});

	function handleClickCapture(event: ReactMouseEvent<HTMLElement>) {
		const clickedToggle = getClickedViewedToggle(event.nativeEvent);
		if (clickedToggle == null) return;

		event.preventDefault();
		event.stopPropagation();

		const affectedPaths =
			clickedToggle.type === "folder"
				? getDescendantFilePaths(paths, clickedToggle.path)
				: [clickedToggle.path];

		if (affectedPaths.length === 0) return;
		const allViewed = affectedPaths.every((path) => viewedPathSet.has(path));
		onSetPathsViewed(affectedPaths, !allViewed);
	}

	function handleClick(event: ReactMouseEvent<HTMLElement>) {
		const clickedPath = getClickedFilePath(event.nativeEvent);
		const isPlainClick = !event.ctrlKey && !event.metaKey && !event.shiftKey;
		const fileIndex = clickedPath == null ? -1 : paths.indexOf(clickedPath);

		if (isPlainClick && fileIndex >= 0) {
			onFileSelect(fileIndex);
		}
	}

	return (
		<aside
			className="border-b bg-card lg:sticky lg:top-12 lg:self-start lg:border-r lg:border-b-0"
			style={{ height: "calc(100vh - 3rem)" }}
		>
			<FileTree
				model={model}
				header={
					<>
						<div className="flex items-center justify-between px-4 py-3">
							<span className="font-medium font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
								Changed files
							</span>
							<span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
								{paths.length}
							</span>
						</div>
						<Separator />
					</>
				}
				className="h-full"
				onClickCapture={handleClickCapture}
				onClick={handleClick}
				style={{ height: "calc(100vh - 3rem)", ...treeThemeStyles }}
			/>
		</aside>
	);
}

type ViewedState = "checked" | "mixed" | "unchecked";

function getViewedDecoration(
	path: string,
	kind: "directory" | "file",
	state: ViewedState,
): FileTreeRowDecoration {
	const iconName =
		state === "checked"
			? "diffy-tree-checkbox-checked"
			: state === "mixed"
				? "diffy-tree-checkbox-mixed"
				: "diffy-tree-checkbox-unchecked";
	const title =
		kind === "directory"
			? state === "checked"
				? `Mark files under ${path} as unviewed`
				: `Mark files under ${path} as viewed`
			: state === "checked"
				? `Mark ${path} as unviewed`
				: `Mark ${path} as viewed`;

	return {
		icon: { name: iconName, width: 16, height: 16 },
		title,
	};
}

function getViewedState(
	path: string,
	kind: "directory" | "file",
	paths: readonly string[],
	viewedPathSet: ReadonlySet<string>,
): ViewedState {
	if (kind === "file") return viewedPathSet.has(path) ? "checked" : "unchecked";

	const descendants = getDescendantFilePaths(paths, path);
	if (descendants.length === 0) return "unchecked";

	const viewedCount = descendants.filter((filePath) =>
		viewedPathSet.has(filePath),
	).length;
	if (viewedCount === 0) return "unchecked";
	return viewedCount === descendants.length ? "checked" : "mixed";
}

function getDescendantFilePaths(
	paths: readonly string[],
	directoryPath: string,
): string[] {
	const prefix = directoryPath.endsWith("/")
		? directoryPath
		: `${directoryPath}/`;
	return paths.filter((path) => path.startsWith(prefix));
}

// Couples to @pierre/trees row markup: data-item-section="decoration" on the
// row's decoration cell, data-type="item" on the row, and data-item-path /
// data-item-type on the row root. If trees is upgraded, re-verify these.
function getClickedViewedToggle(event: MouseEvent): {
	path: string;
	type: "file" | "folder";
} | null {
	const composedPath =
		typeof event.composedPath === "function" ? event.composedPath() : [];
	let isDecorationClick = false;
	let row: HTMLElement | null = null;

	for (const target of composedPath) {
		if (!(target instanceof HTMLElement)) continue;
		if (target.dataset.itemSection === "decoration") {
			isDecorationClick = true;
		}
		if (target.dataset.type === "item") {
			row = target;
			break;
		}
	}

	if (!isDecorationClick || row == null) return null;

	const path = row.dataset.itemPath;
	const type = row.dataset.itemType;
	if (path == null || (type !== "file" && type !== "folder")) return null;

	return { path, type };
}

function getClickedFilePath(event: MouseEvent): string | null {
	const composedPath =
		typeof event.composedPath === "function" ? event.composedPath() : [];

	for (const target of composedPath) {
		if (!(target instanceof HTMLElement)) continue;
		if (target.dataset.itemType === "file") {
			return target.dataset.itemPath ?? null;
		}
	}

	if (event.target instanceof Element) {
		return (
			event.target.closest<HTMLElement>("[data-item-type='file']")?.dataset
				.itemPath ?? null
		);
	}

	return null;
}
