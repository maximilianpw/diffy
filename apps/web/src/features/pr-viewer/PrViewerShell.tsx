import { PatchDiff } from '@pierre/diffs/react';
import { themeToTreeStyles } from '@pierre/trees';
import { FileTree, useFileTree } from '@pierre/trees/react';
import vesper from '@shikijs/themes/vesper';
import { SectionHeader } from '#/components/section-header';
import { Badge } from '#/components/ui/badge';
import { Card } from '#/components/ui/card';
import { Separator } from '#/components/ui/separator';
import { splitPatchFiles } from './diff-paths';

const treeThemeStyles = themeToTreeStyles(vesper);

type PrViewerShellProps = {
	owner: string;
	repo: string;
	number: number;
	status: 'importing' | 'ready' | 'error';
	paths: string[];
	patch: string | null;
	error?: string | null;
};

export function PrViewerShell({ owner, repo, number, status, paths, patch, error }: PrViewerShellProps) {
	const patchFiles = patch ? splitPatchFiles(patch) : [];
	const treeKey = paths.join('\0');

	return (
		<main className="min-h-screen bg-background text-foreground">
			<SectionHeader
				eyebrow="Diffy"
				className="border-b bg-card px-6 py-4"
			>
				{owner}/{repo}#{number}
			</SectionHeader>

			<div className="grid min-h-[calc(100vh-89px)] grid-cols-1 lg:grid-cols-[340px_1fr]">
				<ChangedFilesTree
					key={treeKey}
					paths={paths}
				/>

				<section
					aria-label="Diff preview"
					className="p-6"
				>
					<div className="mb-4 flex items-center justify-between gap-4">
						<SectionHeader
							eyebrow="Imported from GitHub"
							level="h2"
						>
							{status === 'ready' ? 'Pull request diff' : 'Loading pull request'}
						</SectionHeader>
						<Badge variant="secondary">{status}</Badge>
					</div>

					{status === 'importing' ? (
						<Card className="p-4">Importing pull request from GitHub...</Card>
					) : status === 'error' ? (
						<Card className="p-4 text-destructive">{error ?? 'Could not load pull request.'}</Card>
					) : patch ? (
						<div className="space-y-4">
							<div className="sr-only">{paths.join('\n')}</div>
							{patchFiles.map((file) => (
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
					) : (
						<Card className="p-4">No diff content available.</Card>
					)}
				</section>
			</div>
		</main>
	);
}

function ChangedFilesTree({ paths }: { paths: string[] }) {
	const { model } = useFileTree({
		paths,
		initialExpansion: 'open',
		flattenEmptyDirectories: true,
		stickyFolders: true,
		search: true,
		density: 'relaxed',
	});

	return (
		<FileTree
			model={model}
			header={
				<>
					<div className="flex items-center justify-between px-4 py-3">
						<span className="font-medium text-sm">Changed files</span>
						<Badge variant="secondary">{paths.length}</Badge>
					</div>
					<Separator />
				</>
			}
			className="border-b bg-card lg:border-r lg:border-b-0"
			style={{ height: 'calc(100vh - 89px)', ...treeThemeStyles }}
		/>
	);
}
