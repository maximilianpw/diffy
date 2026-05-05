import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button, buttonVariants } from "#/components/ui/button";
import { cn } from "#/lib/utils";

type TopBarProps = {
	children?: ReactNode;
	label?: ReactNode;
	htmlUrl?: string;
	pr?: TopBarPullRequest | null;
	className?: string;
};

type TopBarPullRequest = {
	owner: string;
	repo: string;
	number: number | string;
	htmlUrl?: string;
};

export function TopBar({
	children,
	label = "Diffy",
	htmlUrl,
	pr,
	className,
}: TopBarProps) {
	const breadcrumb =
		children ??
		(pr ? <PullRequestBreadcrumb pr={pr} /> : <Crumb>{label}</Crumb>);
	const githubHtmlUrl = htmlUrl ?? pr?.htmlUrl;

	return (
		<header
			className={cn(
				"sticky top-0 z-30 flex h-12 items-center justify-between gap-4 border-b bg-card/95 px-5 backdrop-blur-sm",
				className,
			)}
		>
			<div className="flex min-w-0 items-center gap-3">
				<Link
					to="/"
					aria-label="Diffy home"
					className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-foreground transition-opacity hover:opacity-80"
				>
					<span className="size-2 rotate-45 bg-background" />
				</Link>
				<nav
					aria-label="Breadcrumb"
					className="flex min-w-0 items-center gap-2 truncate font-medium text-[13px] text-foreground"
				>
					{breadcrumb}
				</nav>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				{githubHtmlUrl ? (
					<a
						href={githubHtmlUrl}
						target="_blank"
						rel="noreferrer noopener"
						className={buttonVariants({ variant: "ghost", size: "sm" })}
					>
						Open on GitHub
					</a>
				) : null}
				<AuthControl />
			</div>
		</header>
	);
}

function PullRequestBreadcrumb({ pr }: { pr: TopBarPullRequest }) {
	return (
		<>
			<CrumbLink to="/">Pull requests</CrumbLink>
			<CrumbSeparator />
			<Crumb>
				{pr.owner}/{pr.repo} #{pr.number}
			</Crumb>
		</>
	);
}

function AuthControl() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const { signIn, signOut } = useAuthActions();

	if (isLoading) {
		return <span className="text-muted-foreground text-xs">Loading...</span>;
	}

	if (isAuthenticated) {
		return (
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => void signOut()}
			>
				Sign out
			</Button>
		);
	}

	return (
		<Button type="button" size="sm" onClick={() => void signIn("github")}>
			Sign in with GitHub
		</Button>
	);
}

type CrumbProps = {
	children: ReactNode;
	muted?: boolean;
};

export function Crumb({ children, muted }: CrumbProps) {
	return (
		<span
			className={cn(
				"truncate",
				muted ? "text-muted-foreground" : "text-foreground",
			)}
		>
			{children}
		</span>
	);
}

export function CrumbSeparator() {
	return (
		<span aria-hidden="true" className="select-none text-muted-foreground/60">
			/
		</span>
	);
}

type CrumbLinkProps = {
	to: string;
	children: ReactNode;
};

export function CrumbLink({ to, children }: CrumbLinkProps) {
	return (
		<Link
			to={to}
			className="truncate text-muted-foreground transition-colors hover:text-foreground"
		>
			{children}
		</Link>
	);
}
