import { PatchDiff } from "@pierre/diffs/react";
import { Card } from "#/components/ui/card";
import { cn } from "#/lib/utils";
import { countDiffStats } from "./diff-stats";

type FileCardProps = {
	path: string;
	patch: string;
	viewed: boolean;
	onToggleViewed: () => void;
};

export function FileCard({
	path,
	patch,
	viewed,
	onToggleViewed,
}: FileCardProps) {
	const { additions, deletions } = countDiffStats(patch);
	const headerId = `file-${path}`;
	const bodyId = `file-${path}-body`;

	return (
		<Card
			className={cn(
				"p-0 transition-colors",
				viewed && "ring-foreground/5 bg-card/60",
			)}
			size="sm"
		>
			<button
				type="button"
				id={headerId}
				aria-expanded={!viewed}
				aria-controls={bodyId}
				aria-label={`Mark ${path} as viewed`}
				onClick={onToggleViewed}
				className="group/file-header flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/40"
			>
				<Chevron expanded={!viewed} />
				<span
					className={cn(
						"min-w-0 flex-1 truncate font-mono text-[12px]",
						viewed &&
							"text-muted-foreground line-through decoration-muted-foreground/40",
					)}
					title={path}
				>
					{path}
				</span>
				<DiffStatPill additions={additions} deletions={deletions} />
				<span
					aria-hidden="true"
					className={cn(
						"flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-background/40 px-2 py-1 font-medium text-[11px] transition-colors",
						viewed
							? "border-foreground/30 bg-foreground/5 text-foreground"
							: "text-muted-foreground group-hover/file-header:text-foreground",
					)}
				>
					<CheckMark active={viewed} />
					Viewed
				</span>
			</button>
			{viewed ? null : (
				<div id={bodyId}>
					<PatchDiff
						patch={patch}
						options={{ theme: "vesper" }}
						disableWorkerPool
					/>
				</div>
			)}
		</Card>
	);
}

function Chevron({ expanded }: { expanded: boolean }) {
	return (
		<svg
			width="10"
			height="10"
			viewBox="0 0 10 10"
			aria-hidden="true"
			className={cn(
				"shrink-0 text-muted-foreground transition-transform duration-150",
				expanded ? "rotate-90" : "",
			)}
		>
			<path
				d="M3 1.5L7 5L3 8.5"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function CheckMark({ active }: { active: boolean }) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"flex size-3 items-center justify-center rounded-sm border transition-colors",
				active
					? "border-foreground bg-foreground text-background"
					: "border-border",
			)}
		>
			{active ? (
				<svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
					<path
						d="M1.5 4L3.5 6L6.5 2"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			) : null}
		</span>
	);
}

function DiffStatPill({
	additions,
	deletions,
}: {
	additions: number;
	deletions: number;
}) {
	return (
		<span className="hidden shrink-0 items-center gap-2 font-mono text-[11px] tabular-nums sm:flex">
			<span className="text-emerald-500/90">+{additions}</span>
			<span className="text-rose-500/90">-{deletions}</span>
		</span>
	);
}
