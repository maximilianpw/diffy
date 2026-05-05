import { themeToTreeStyles } from "@pierre/trees";
import { FileTree, useFileTree } from "@pierre/trees/react";
import vesper from "@shikijs/themes/vesper";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useMemo } from "react";
import { Badge } from "#/components/ui/badge";
import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import type { PrDoc } from "../../../../convex/doc-types";
import { buildOpenPrTree, type OpenPrEntry } from "../model/open-pr-tree";

const treeThemeStyles = themeToTreeStyles(vesper);

const HIDE_FILE_ICON_CSS = `
  [data-item-type='file'] [data-item-section='icon'] {
    display: none;
  }
`;

type OpenPrsSidebarProps = {
	isAuthenticated: boolean;
	openPrs: PrDoc[] | undefined;
	onSelect: (entry: OpenPrEntry) => void;
};

export function OpenPrsSidebar({
	isAuthenticated,
	openPrs,
	onSelect,
}: OpenPrsSidebarProps) {
	const { paths, prByPath } = useMemo(
		() => buildOpenPrTree(openPrs ?? []),
		[openPrs],
	);

	if (!isAuthenticated) return null;

	return (
		<aside
			aria-label="Open pull requests"
			className="border-b bg-card lg:sticky lg:top-12 lg:self-start lg:border-r lg:border-b-0"
			style={{ height: "calc(100vh - 3rem)" }}
		>
			<div className="flex items-center justify-between px-4 py-3">
				<span className="font-medium font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
					Open pull requests
				</span>
				<Badge variant="secondary" className="font-mono tabular-nums">
					{openPrs?.length ?? 0}
				</Badge>
			</div>
			<Separator />

			{openPrs === undefined ? (
				<Card size="sm" className="mx-4 my-4 px-4 text-muted-foreground">
					Loading…
				</Card>
			) : paths.length === 0 ? (
				<Card size="sm" className="mx-4 my-4 px-4 text-muted-foreground">
					No open pull requests yet — paste a URL to start.
				</Card>
			) : (
				<OpenPrTree
					key={paths.join("\0")}
					paths={paths}
					prByPath={prByPath}
					onSelect={onSelect}
				/>
			)}
		</aside>
	);
}

function OpenPrTree({
	paths,
	prByPath,
	onSelect,
}: {
	paths: string[];
	prByPath: Map<string, OpenPrEntry>;
	onSelect: (entry: OpenPrEntry) => void;
}) {
	const { model } = useFileTree({
		paths,
		initialExpansion: "open",
		flattenEmptyDirectories: false,
		stickyFolders: true,
		search: true,
		density: "relaxed",
		unsafeCSS: HIDE_FILE_ICON_CSS,
		renderRowDecoration: ({ row }) => {
			const entry = prByPath.get(row.path);
			if (!entry) return null;
			return { text: `#${entry.number}` };
		},
	});

	function handleClick(event: ReactMouseEvent<HTMLElement>) {
		const clickedPath = getClickedFilePath(event.nativeEvent);
		if (clickedPath == null) return;

		const entry = prByPath.get(clickedPath);
		if (entry) onSelect(entry);
	}

	return (
		<FileTree
			model={model}
			className="h-full"
			onClick={handleClick}
			style={{ height: "calc(100vh - 6rem)", ...treeThemeStyles }}
		/>
	);
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
