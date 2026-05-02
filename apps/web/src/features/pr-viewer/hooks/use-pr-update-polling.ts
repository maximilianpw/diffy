import { useCallback, useEffect, useRef, useState } from "react";
import type { PrUpdateCheck } from "../components/PrViewerShell";
import { PrUpdateCheckStatus } from "../components/PrViewerShell/pr-update-notice-copy";
import { getImportErrorMessage } from "../model/import-error-message";
import { PullRequestState } from "../model/pull-request.types";

export const POLL_INTERVAL_MS = 45_000;
export const POLL_MAX_INTERVAL_MS = 10 * 60_000;
export const POLL_MAX_FAILURES = 5;

type CheckResult = {
	checkedAt: number;
	hasUpdates: boolean;
};

type CheckForUpdates = (args: {
	owner: string;
	repo: string;
	number: number;
}) => Promise<CheckResult>;

type Args = {
	prState: PullRequestState | undefined;
	owner: string;
	repo: string;
	number: number;
	checkForUpdates: CheckForUpdates;
	isApplyingUpdate: boolean;
};

type Result = {
	status: PrUpdateCheck["status"];
	autoCheckEnabled: boolean;
	lastCheckedAt: number | null;
	error: string | null;
	clearUpdatesAvailable: () => void;
	clearError: () => void;
	toggleAutoCheck: () => void;
};

export function usePrUpdatePolling({
	prState,
	owner,
	repo,
	number,
	checkForUpdates,
	isApplyingUpdate,
}: Args): Result {
	const [autoCheckEnabled, setAutoCheckEnabled] = useState(true);
	const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
	const [updatesAvailable, setUpdatesAvailable] = useState(false);
	const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	const autoCheckEnabledRef = useRef(autoCheckEnabled);
	const updatesAvailableRef = useRef(updatesAvailable);
	const isApplyingUpdateRef = useRef(isApplyingUpdate);
	const consecutiveFailuresRef = useRef(0);
	const checkNowRef = useRef<(() => void) | null>(null);
	autoCheckEnabledRef.current = autoCheckEnabled;
	updatesAvailableRef.current = updatesAvailable;
	isApplyingUpdateRef.current = isApplyingUpdate;

	useEffect(() => {
		if (prState !== PullRequestState.Open) return;

		let cancelled = false;
		let inFlight = false;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		function shouldSkip(): boolean {
			return (
				!autoCheckEnabledRef.current ||
				updatesAvailableRef.current ||
				isApplyingUpdateRef.current
			);
		}

		function scheduleNext(delayMs: number) {
			if (cancelled) return;
			timeoutId = setTimeout(() => void check(), delayMs);
		}

		async function check() {
			if (cancelled || inFlight) return;
			if (
				shouldSkip() ||
				(typeof document !== "undefined" && document.hidden)
			) {
				scheduleNext(POLL_INTERVAL_MS);
				return;
			}

			inFlight = true;
			setIsCheckingForUpdates(true);
			try {
				const result = await checkForUpdates({ owner, repo, number });
				if (cancelled) return;
				consecutiveFailuresRef.current = 0;
				setError(null);
				setLastCheckedAt(result.checkedAt);
				setUpdatesAvailable(result.hasUpdates);
			} catch (cause) {
				if (cancelled) return;
				consecutiveFailuresRef.current += 1;
				setError(getImportErrorMessage(cause));
				if (consecutiveFailuresRef.current >= POLL_MAX_FAILURES) {
					setAutoCheckEnabled(false);
				}
			} finally {
				inFlight = false;
				if (!cancelled) setIsCheckingForUpdates(false);
			}

			const failures = consecutiveFailuresRef.current;
			const backoff =
				failures === 0
					? POLL_INTERVAL_MS
					: Math.min(
							POLL_INTERVAL_MS * 2 ** (failures - 1),
							POLL_MAX_INTERVAL_MS,
						);
			scheduleNext(backoff);
		}

		function onVisibilityChange() {
			if (document.hidden) return;
			if (timeoutId !== null) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			void check();
		}

		checkNowRef.current = () => {
			if (timeoutId !== null) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			void check();
		};

		void check();
		document.addEventListener("visibilitychange", onVisibilityChange);

		return () => {
			cancelled = true;
			if (timeoutId !== null) clearTimeout(timeoutId);
			checkNowRef.current = null;
			document.removeEventListener("visibilitychange", onVisibilityChange);
		};
	}, [checkForUpdates, owner, repo, number, prState]);

	const toggleAutoCheck = useCallback(() => {
		setAutoCheckEnabled((enabled) => {
			const next = !enabled;
			if (next) {
				consecutiveFailuresRef.current = 0;
				// Kick off an immediate check rather than waiting out the
				// (potentially long) backoff timer that's still scheduled.
				queueMicrotask(() => checkNowRef.current?.());
			}
			return next;
		});
		setError(null);
	}, []);

	const clearUpdatesAvailable = useCallback(() => {
		setUpdatesAvailable(false);
	}, []);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	const status: PrUpdateCheck["status"] = !autoCheckEnabled
		? PrUpdateCheckStatus.Paused
		: isApplyingUpdate
			? PrUpdateCheckStatus.Updating
			: updatesAvailable
				? PrUpdateCheckStatus.Available
				: error
					? PrUpdateCheckStatus.Error
					: isCheckingForUpdates
						? PrUpdateCheckStatus.Checking
						: PrUpdateCheckStatus.Idle;

	return {
		status,
		autoCheckEnabled,
		lastCheckedAt,
		error,
		clearUpdatesAvailable,
		clearError,
		toggleAutoCheck,
	};
}
