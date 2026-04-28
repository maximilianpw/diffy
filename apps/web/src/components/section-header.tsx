import type { ReactNode } from "react";
import { cn } from "#/lib/utils";

type EyebrowProps = {
	children: ReactNode;
	className?: string;
};

export function Eyebrow({ children, className }: EyebrowProps) {
	return (
		<p
			className={cn(
				"font-medium text-muted-foreground text-xs uppercase tracking-wider",
				className,
			)}
		>
			{children}
		</p>
	);
}

type SectionHeaderProps = {
	eyebrow: ReactNode;
	level?: "h1" | "h2";
	className?: string;
	children: ReactNode;
};

export function SectionHeader({
	eyebrow,
	level = "h1",
	className,
	children,
}: SectionHeaderProps) {
	const Heading = level;
	const sizeClass = level === "h1" ? "text-2xl" : "text-xl";

	return (
		<header className={className}>
			<Eyebrow>{eyebrow}</Eyebrow>
			<Heading
				className={cn(
					"mt-1 font-heading font-semibold tracking-normal",
					sizeClass,
				)}
			>
				{children}
			</Heading>
		</header>
	);
}
