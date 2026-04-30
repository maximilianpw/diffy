import { themeToTreeStyles } from "@pierre/trees";
import { FileTree, useFileTree } from "@pierre/trees/react";
import vesper from "@shikijs/themes/vesper";
import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import type { Doc } from "../../../convex/_generated/dataModel";
import { splitPatchFiles } from "./diff-paths";
import { FileCard } from "./FileCard";
import { PrSummaryCard } from "./PrSummaryCard";
import { useViewedFiles } from "./use-viewed-files";

const treeThemeStyles = themeToTreeStyles(vesper);

type PrDoc = Doc<"pullRequests">;

type PrViewerShellProps = {
	pr: PrDoc | null;
	status: "importing" | "ready" | "error";
	paths: string[];
	patch: string | null;
	error?: string | null;
};

export function PrViewerShell({
	pr,
	status,
	paths,
	patch,
	error,
}: PrViewerShellProps) {
	const treeKey = paths.join("\0");

	return (
		<div className="grid min-h-[calc(100vh-3rem)] grid-cols-1 lg:grid-cols-[280px_1fr]">
			<ChangedFilesTree key={treeKey} paths={paths} />

			<section
				aria-label="Diff preview"
				className="flex flex-col gap-6 px-6 py-8 lg:px-10"
			>
				{pr ? <PrSummaryCard pr={pr} /> : null}

				{status === "importing" ? (
					<Card className="p-4 text-muted-foreground">
						Importing pull request from GitHub...
					</Card>
				) : status === "error" ? (
					<Card className="p-4 text-destructive">
						{error ?? "Could not load pull request."}
					</Card>
				) : pr && patch ? (
					<DiffStack
						key={`${pr.owner}/${pr.repo}#${pr.number}`}
						pr={pr}
						patch={patch}
						paths={paths}
					/>
				) : (
					<Card className="p-4 text-muted-foreground">
						No diff content available.
					</Card>
				)}
			</section>
		</div>
	);
}

function DiffStack({
	pr,
	patch,
	paths,
}: {
	pr: PrDoc;
	patch: string;
	paths: string[];
}) {
	const patchFiles = splitPatchFiles(patch);
	const { isViewed, toggle } = useViewedFiles({
		owner: pr.owner,
		repo: pr.repo,
		number: pr.number,
	});

	return (
		<div className="flex flex-col gap-4">
			<div className="sr-only">{paths.join("\n")}</div>
			{patchFiles.map((file) => (
				<FileCard
					key={file.path}
					path={file.path}
					patch={file.patch}
					viewed={isViewed(file.path)}
					onToggleViewed={() => toggle(file.path)}
				/>
			))}
		</div>
	);
}

function ChangedFilesTree({ paths }: { paths: string[] }) {
	const { model } = useFileTree({
		paths,
		initialExpansion: "open",
		flattenEmptyDirectories: true,
		stickyFolders: true,
		search: true,
		density: "relaxed",
	});

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
				style={{ height: "calc(100vh - 3rem)", ...treeThemeStyles }}
			/>
		</aside>
	);
}
