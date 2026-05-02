import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PullRequestState } from "../model/pull-request.types";
import {
	POLL_INTERVAL_MS,
	POLL_MAX_FAILURES,
	usePrUpdatePolling,
} from "./use-pr-update-polling";

type CheckResult = { checkedAt: number; hasUpdates: boolean };
type CheckFn = (args: {
	owner: string;
	repo: string;
	number: number;
}) => Promise<CheckResult>;

function defaultArgs(overrides: {
	checkForUpdates: CheckFn;
	isApplyingUpdate?: boolean;
}) {
	return {
		prState: PullRequestState.Open,
		owner: "tanstack",
		repo: "router",
		number: 123,
		isApplyingUpdate: false,
		...overrides,
	};
}

async function flush() {
	// Give microtask queue time to settle (resolves the in-flight promise and
	// runs any state updates queued in its `.then`/`.finally`).
	await act(async () => {
		await Promise.resolve();
		await Promise.resolve();
	});
}

describe("usePrUpdatePolling", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("does not restart the timer when unrelated inputs change", async () => {
		const checkForUpdates = vi
			.fn<CheckFn>()
			.mockResolvedValue({ checkedAt: 1, hasUpdates: false });

		const { rerender } = renderHook(
			({ isApplyingUpdate }: { isApplyingUpdate: boolean }) =>
				usePrUpdatePolling(defaultArgs({ checkForUpdates, isApplyingUpdate })),
			{ initialProps: { isApplyingUpdate: false } },
		);

		await flush();
		expect(checkForUpdates).toHaveBeenCalledTimes(1);

		// A rerender that does not change identity-fields must not retrigger an
		// immediate check; only the scheduled timer should drive new calls.
		rerender({ isApplyingUpdate: true });
		rerender({ isApplyingUpdate: false });
		await flush();
		expect(checkForUpdates).toHaveBeenCalledTimes(1);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
		});
		expect(checkForUpdates).toHaveBeenCalledTimes(2);
	});

	it("backs off and auto-pauses after consecutive failures", async () => {
		const checkForUpdates = vi
			.fn<CheckFn>()
			.mockRejectedValue(new Error("network"));

		const { result } = renderHook(() =>
			usePrUpdatePolling(defaultArgs({ checkForUpdates })),
		);

		// Failure 1 fires on mount.
		await flush();
		expect(checkForUpdates).toHaveBeenCalledTimes(1);

		// Subsequent attempts wait POLL_INTERVAL_MS * 2^(n-1). Verify the
		// interval boundary precisely: advancing just under the expected delay
		// should NOT fire a check; then advancing the remainder should.
		const expectedFactors = [1, 2, 4, 8]; // for failures 2..5
		let expectedCalls = 1;
		for (const factor of expectedFactors) {
			const wait = factor * POLL_INTERVAL_MS;
			await act(async () => {
				await vi.advanceTimersByTimeAsync(wait - 100);
			});
			await flush();
			expect(checkForUpdates).toHaveBeenCalledTimes(expectedCalls);

			await act(async () => {
				await vi.advanceTimersByTimeAsync(100);
			});
			await flush();
			expectedCalls += 1;
			expect(checkForUpdates).toHaveBeenCalledTimes(expectedCalls);
		}

		expect(checkForUpdates).toHaveBeenCalledTimes(POLL_MAX_FAILURES);
		expect(result.current.autoCheckEnabled).toBe(false);
		expect(result.current.status).toBe("paused");

		// After auto-pause, no further calls regardless of how much time passes.
		await act(async () => {
			await vi.advanceTimersByTimeAsync(60 * POLL_INTERVAL_MS);
		});
		expect(checkForUpdates).toHaveBeenCalledTimes(POLL_MAX_FAILURES);
	});

	it("resets the failure counter when the user resumes after auto-pause", async () => {
		let shouldFail = true;
		const checkForUpdates = vi.fn<CheckFn>().mockImplementation(async () => {
			if (shouldFail) throw new Error("network");
			return { checkedAt: Date.now(), hasUpdates: false };
		});

		const { result } = renderHook(() =>
			usePrUpdatePolling(defaultArgs({ checkForUpdates })),
		);

		// Drive to auto-pause.
		await flush();
		for (const factor of [1, 2, 4, 8]) {
			await act(async () => {
				await vi.advanceTimersByTimeAsync(factor * POLL_INTERVAL_MS);
			});
			await flush();
		}
		expect(result.current.autoCheckEnabled).toBe(false);

		// Network recovers; user resumes — should kick off an immediate check
		// rather than wait out the long backoff timer still scheduled.
		shouldFail = false;
		await act(async () => {
			result.current.toggleAutoCheck();
			// Allow the queued microtask to run.
			await Promise.resolve();
			await Promise.resolve();
		});
		expect(result.current.error).toBeNull();

		// Cause one more failure: counter must be back at 1, NOT at 6, so we
		// don't immediately re-pause.
		shouldFail = true;
		await act(async () => {
			await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
		});
		await flush();
		expect(result.current.autoCheckEnabled).toBe(true);
	});

	it("records lastCheckedAt from the action result, not from imports", async () => {
		const checkForUpdates = vi
			.fn<CheckFn>()
			.mockResolvedValue({ checkedAt: 7777, hasUpdates: false });

		const { result } = renderHook(() =>
			usePrUpdatePolling(defaultArgs({ checkForUpdates })),
		);

		await flush();
		expect(result.current.lastCheckedAt).toBe(7777);
	});

	it("does nothing when the PR is not open", async () => {
		const checkForUpdates = vi.fn<CheckFn>();

		renderHook(() =>
			usePrUpdatePolling({
				...defaultArgs({ checkForUpdates }),
				prState: PullRequestState.Merged,
			}),
		);

		await flush();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(10 * POLL_INTERVAL_MS);
		});
		expect(checkForUpdates).not.toHaveBeenCalled();
	});
});
