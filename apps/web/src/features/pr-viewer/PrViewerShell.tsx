import { PatchDiff } from '@pierre/diffs/react';
import { themeToTreeStyles } from '@pierre/trees';
import { FileTree, useFileTree } from '@pierre/trees/react';
import vesper from '@shikijs/themes/vesper';
import { SectionHeader } from '#/components/section-header';
import { Badge } from '#/components/ui/badge';
import { Card } from '#/components/ui/card';
import { Separator } from '#/components/ui/separator';
import { previewFiles } from '../../lib/pr-example';

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
		initialExpansion: 'open',
		flattenEmptyDirectories: true,
		stickyFolders: true,
		search: true,
		density: 'relaxed',
	});

	return (
		<main className="min-h-screen bg-background text-foreground">
			<SectionHeader
				eyebrow="Diffy"
				className="border-b bg-card px-6 py-4"
			>
				{owner}/{repo}#{number}
			</SectionHeader>

			<div className="grid min-h-[calc(100vh-89px)] grid-cols-1 lg:grid-cols-[340px_1fr]">
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
					className="border-b bg-card lg:border-r lg:border-b-0"
					style={{ height: 'calc(100vh - 89px)', ...treeThemeStyles }}
				/>

				<section
					aria-label="Diff preview"
					className="p-6"
				>
					<div className="mb-4 flex items-center justify-between gap-4">
						<SectionHeader
							eyebrow="Static preview data"
							level="h2"
						>
							Pierre diff
						</SectionHeader>
						<Badge variant="secondary">+18 -3</Badge>
					</div>

					<div className="space-y-4">
						{previewFiles.map((file) => (
							<Card
								key={file.path}
								className="p-0"
								size="sm"
							>
								<PatchDiff
									patch={file.patch}
									options={{ theme: 'vesper' }}
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
