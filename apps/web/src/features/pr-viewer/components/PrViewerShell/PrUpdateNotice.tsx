import { Pause, Play, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { NOTICE_COPY, PrUpdateCheckStatus } from "./pr-update-notice-copy";

export type PrUpdateCheck = {
	status: PrUpdateCheckStatus;
	autoCheckEnabled: boolean;
	error?: string | null;
	lastCheckedAt?: number | null;
	onApplyUpdate: () => void;
	onToggleAutoCheck: () => void;
};

const lastCheckedFormatter = new Intl.DateTimeFormat(undefined, {
	hour: "numeric",
	minute: "2-digit",
});

const OVERRIDE_STATUSES = new Set([
	PrUpdateCheckStatus.Available,
	PrUpdateCheckStatus.Updating,
	PrUpdateCheckStatus.Error,
]);

function getEffectiveStatus({
	status,
	autoCheckEnabled,
}: Pick<PrUpdateCheck, "status" | "autoCheckEnabled">): PrUpdateCheckStatus {
	return !autoCheckEnabled && !OVERRIDE_STATUSES.has(status)
		? PrUpdateCheckStatus.Paused
		: status;
}

function UpdateActions({
	updateCheck,
	isAvailable,
	isPaused,
}: {
	updateCheck: PrUpdateCheck;
	isAvailable: boolean;
	isPaused: boolean;
}) {
	if (isAvailable) {
		return (
			<Button
				type="button"
				size="sm"
				onClick={updateCheck.onApplyUpdate}
			>
				<RefreshCw data-icon="inline-start" />
				Update
			</Button>
		);
	}

	return (
		<Button
			type="button"
			size="sm"
			variant="outline"
			onClick={updateCheck.onToggleAutoCheck}
		>
			{isPaused ? <Play data-icon="inline-start" /> : <Pause data-icon="inline-start" />}
			{isPaused ? "Resume checks" : "Pause checks"}
		</Button>
	);
}

export function PrUpdateNotice({
	updateCheck,
}: {
	updateCheck: PrUpdateCheck;
}) {
	const effectiveStatus = getEffectiveStatus(updateCheck);
	const isAvailable = effectiveStatus === PrUpdateCheckStatus.Available;
	const isUpdating = effectiveStatus === PrUpdateCheckStatus.Updating;
	const isError = effectiveStatus === PrUpdateCheckStatus.Error;
	const isPaused = effectiveStatus === PrUpdateCheckStatus.Paused;

	const copy = NOTICE_COPY[effectiveStatus];
	const description =
		isError && updateCheck.error ? updateCheck.error : copy.description;
	const lastCheckedLabel =
		updateCheck.lastCheckedAt != null && !isAvailable && !isUpdating
			? `Last checked ${lastCheckedFormatter.format(updateCheck.lastCheckedAt)}`
			: null;

	return (
		<Alert
			variant={isError ? "destructive" : "default"}
			className={
				isAvailable
					? "border-primary/40 bg-primary/5 sm:grid-cols-[auto_1fr_auto]"
					: "sm:grid-cols-[auto_1fr_auto]"
			}
		>
			<copy.Icon aria-hidden="true" />
			<AlertTitle>{copy.title}</AlertTitle>
			<AlertDescription>
				{description}
				{lastCheckedLabel ? (
					<span className="block text-xs opacity-70">{lastCheckedLabel}</span>
				) : null}
			</AlertDescription>
			<div className="col-start-2 mt-2 flex flex-wrap gap-1 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:items-center">
				<UpdateActions
					updateCheck={updateCheck}
					isAvailable={isAvailable}
					isPaused={isPaused}
				/>
			</div>
		</Alert>
	);
}
