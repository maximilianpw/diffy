import type { ReactNode } from "react";
import { Card } from "#/components/ui/card";
import { PrViewerShellStatus } from ".";

export function PrViewerStatusCard({
	status,
	error,
	action,
}: {
	status: PrViewerShellStatus;
	error?: string | null;
	action?: ReactNode;
}) {
	if (status === PrViewerShellStatus.Importing) {
		return (
			<Card className="p-4 text-muted-foreground">
				Importing pull request from GitHub...
			</Card>
		);
	}

	if (status === PrViewerShellStatus.Error) {
		return (
			<Card className="p-4 text-destructive">
				{error ?? "Could not load pull request."}
				{action}
			</Card>
		);
	}

	if (status === PrViewerShellStatus.Empty) {
		return (
			<Card className="p-4 text-muted-foreground">
				No diff content available.
			</Card>
		);
	}

	return null;
}
