import { Card } from "#/components/ui/card";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { useViewedFiles } from "../../hooks/use-viewed-files";
import { jumpToFileFragment } from "../../model/file-fragment";
import { ChangedFilesTree } from "../ChangedFilesTree";
import { PrDiscussion } from "../PrDiscussion";
import { PrSummaryCard } from "../PrSummaryCard";
import { DiffStack } from "./DiffStack";
import { type PrUpdateCheck, PrUpdateNotice } from "./PrUpdateNotice";

export type { PrUpdateCheck } from "./PrUpdateNotice";

type PrDoc = Doc<"pullRequests">;
type PrCommentDoc = Doc<"pullRequestComments">;

type PrViewerShellProps = {
	pr: PrDoc | null;
	comments?: PrCommentDoc[];
	status: "importing" | "ready" | "error";
	paths: string[];
	patch: string | null;
	error?: string | null;
	updateCheck?: PrUpdateCheck;
};

export function PrViewerShell({
	pr,
	comments = [],
	status,
	paths,
	patch,
	error,
	updateCheck,
}: PrViewerShellProps) {
	const treeKey = paths.join("\0");
	const { isViewed, setPathsViewed, toggle, viewedPaths } = useViewedFiles(pr);

	return (
		<div className="grid min-h-[calc(100vh-3rem)] grid-cols-1 lg:grid-cols-[280px_1fr]">
			<ChangedFilesTree
				key={treeKey}
				paths={paths}
				viewedPaths={viewedPaths}
				onSetPathsViewed={setPathsViewed}
				onFileSelect={jumpToFileFragment}
			/>

			<section
				aria-label="Diff preview"
				className="flex flex-col gap-6 px-6 py-8 lg:px-10"
			>
				{pr ? <PrSummaryCard pr={pr} /> : null}
				{updateCheck ? <PrUpdateNotice updateCheck={updateCheck} /> : null}
				{pr ? <PrDiscussion pr={pr} comments={comments} /> : null}

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
						patch={patch}
						paths={paths}
						isViewed={isViewed}
						onToggleViewed={toggle}
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
