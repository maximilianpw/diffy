import { Badge } from "#/components/ui/badge";
import { cn } from "#/lib/utils";
import type { Doc } from "../../../convex/_generated/dataModel";

type PrDoc = Doc<"pullRequests">;

type PrSummaryCardProps = {
	pr: PrDoc;
};

const STATUS_LABEL: Record<PrDoc["state"], string> = {
	open: "Open",
	closed: "Closed",
	merged: "Merged",
};

const STATUS_VARIANT: Record<
	PrDoc["state"],
	"default" | "secondary" | "outline"
> = {
	open: "default",
	closed: "outline",
	merged: "secondary",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
	year: "numeric",
	month: "short",
	day: "numeric",
});

export function PrSummaryCard({ pr }: PrSummaryCardProps) {
	return (
		<header className="flex flex-col gap-4 border-b pb-6">
			<div className="flex items-center gap-2">
				<Badge
					variant={STATUS_VARIANT[pr.state]}
					className="h-6 px-2.5 text-[11px] uppercase tracking-wider"
				>
					{STATUS_LABEL[pr.state]}
				</Badge>
				<span className="font-mono text-[11px] text-muted-foreground">
					{pr.owner}/{pr.repo} #{pr.number}
				</span>
			</div>
			<h1 className="font-heading font-semibold text-2xl/tight tracking-tight text-foreground">
				{pr.title}
			</h1>
			<dl className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] text-muted-foreground">
				<MetaItem label="Branches">
					<BranchChip>{pr.headRef}</BranchChip>
					<Arrow />
					<BranchChip>{pr.baseRef}</BranchChip>
				</MetaItem>
				<MetaItem label="Author">
					<img
						src={pr.authorAvatarUrl}
						alt=""
						width={18}
						height={18}
						className="size-[18px] rounded-full ring-1 ring-border"
					/>
					<span className="text-foreground">{pr.authorLogin}</span>
				</MetaItem>
				<MetaItem label="Imported">
					<span className="text-foreground tabular-nums">
						{dateFormatter.format(pr.importedAt)}
					</span>
				</MetaItem>
			</dl>
		</header>
	);
}

function MetaItem({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-center gap-2">
			<dt className="font-medium uppercase tracking-wider text-[10px] text-muted-foreground/80">
				{label}
			</dt>
			<dd className="flex items-center gap-1.5">{children}</dd>
		</div>
	);
}

function BranchChip({ children }: { children: React.ReactNode }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-md border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] text-foreground",
			)}
		>
			{children}
		</span>
	);
}

function Arrow() {
	return (
		<svg
			width="12"
			height="12"
			viewBox="0 0 12 12"
			aria-hidden="true"
			className="text-muted-foreground/60"
		>
			<path
				d="M2 6H9.5M6.5 3L9.5 6L6.5 9"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.25"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
