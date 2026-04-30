import { useConvexAuth } from "@convex-dev/auth/react";
import { themeToTreeStyles } from "@pierre/trees";
import {
	FileTree,
	useFileTree,
	useFileTreeSelection,
} from "@pierre/trees/react";
import vesper from "@shikijs/themes/vesper";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef } from "react";
import { Badge } from "#/components/ui/badge";
import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { api } from "../../../../convex/_generated/api";
import { buildOpenPrTree, type OpenPrEntry } from "../model/open-pr-tree";

const treeThemeStyles = themeToTreeStyles(vesper);

const HIDE_FILE_ICON_CSS = `
  [data-item-type='file'] [data-item-section='icon'] {
    display: none;
  }
`;

type OpenPrsSidebarProps = {
	onSelect: (entry: OpenPrEntry) => void;
};

export function OpenPrsSidebar({ onSelect }: OpenPrsSidebarProps) {
	const { isAuthenticated } = useConvexAuth();
	const openPrs = useQuery(
		api.pullRequests.listOpen,
		isAuthenticated ? {} : "skip",
	);
	const touchPr = useMutation(api.pullRequests.touch);

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
					onSelect={(entry) => {
						void touchPr({ id: entry.id });
						onSelect(entry);
					}}
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

	const selectedPaths = useFileTreeSelection(model);
	const lastNavigatedPathRef = useRef<string | null>(null);
	useEffect(() => {
		for (const p of selectedPaths) {
			const entry = prByPath.get(p);
			if (entry && lastNavigatedPathRef.current !== p) {
				lastNavigatedPathRef.current = p;
				onSelect(entry);
				return;
			}
		}
	}, [selectedPaths, prByPath, onSelect]);

	return (
		<FileTree
			model={model}
			className="h-full"
			style={{ height: "calc(100vh - 6rem)", ...treeThemeStyles }}
		/>
	);
}
