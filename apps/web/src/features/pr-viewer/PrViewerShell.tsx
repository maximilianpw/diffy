import { PatchDiff } from "@pierre/diffs/react";
import { themeToTreeStyles } from "@pierre/trees";
import { FileTree, useFileTree } from "@pierre/trees/react";
import vesper from "@shikijs/themes/vesper";
import { Badge } from "#/components/ui/badge";
import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { previewFiles } from "../../lib/pr-example";

const treeThemeStyles = themeToTreeStyles(vesper);

type PrViewerShellProps = {
	owner: string;
	repo: string;
	number: number;
};

const previewPaths = previewFiles.map((file) => file.path);

export function PrViewerShell({ owner, repo, number }: PrViewerShellProps) {
	const { model } = useFileTree({
		paths: previewPaths,
		initialExpansion: "open",
		flattenEmptyDirectories: true,
		stickyFolders: true,
		search: true,
		density: "relaxed",
	});

	return (
		<main className="min-h-screen bg-background text-foreground">
			<header className="border-b bg-card px-6 py-4">
				<p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
					Diffy
				</p>
				<h1 className="mt-1 font-heading font-semibold text-2xl tracking-normal">
					{owner}/{repo}#{number}
				</h1>
			</header>

			<div className="grid min-h-[calc(100vh-89px)] grid-cols-1 lg:grid-cols-[340px_1fr]">
				<nav
					aria-label="Changed files"
					className="border-b bg-card lg:border-r lg:border-b-0"
				>
					<FileTree
						model={model}
						header={
							<>
								<div className="flex items-center justify-between px-4 py-3">
									<span className="font-medium text-sm">Changed files</span>
									<Badge variant="secondary">{previewPaths.length}</Badge>
								</div>
								<Separator />
							</>
						}
						style={{ height: "calc(100vh - 89px)", ...treeThemeStyles }}
					/>
				</nav>

				<section aria-label="Diff preview" className="p-6">
					<div className="mb-4 flex items-center justify-between gap-4">
						<div>
							<p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
								Static preview data
							</p>
							<h2 className="mt-1 font-heading font-semibold text-xl tracking-normal">
								Pierre diff
							</h2>
						</div>
						<Badge
							variant="secondary"
							className="bg-emerald-100 text-emerald-800"
						>
							+18 -3
						</Badge>
					</div>

					<div className="space-y-4">
						{previewFiles.map((file) => (
							<Card key={file.path} className="p-0" size="sm">
								<PatchDiff
									patch={file.patch}
									options={{ theme: "vesper" }}
									disableWorkerPool
								/>
							</Card>
						))}
					</div>
				</section>
			</div>
		</main>
	);
}
