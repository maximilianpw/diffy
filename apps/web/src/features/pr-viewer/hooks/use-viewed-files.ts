import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type PrKey = {
	_id?: Id<"pullRequests">;
	owner: string;
	repo: string;
	number: number;
	latestVersionNumber?: number;
};

const STORAGE_PREFIX = "diffy.viewed.";

// latestVersionNumber only bumps when (baseSha, headSha) change, so
// discussion-only updates preserve the user's viewed marks.
function storageKey({
	owner,
	repo,
	number,
	latestVersionNumber,
}: PrKey): string {
	const versionSuffix =
		typeof latestVersionNumber === "number" ? `@v${latestVersionNumber}` : "";
	return `${STORAGE_PREFIX}${owner}/${repo}#${number}${versionSuffix}`;
}

function load(key: string): Set<string> {
	if (typeof window === "undefined") return new Set();
	try {
		const raw = window.localStorage.getItem(key);
		if (!raw) return new Set();
		const parsed = JSON.parse(raw) as unknown;
		return Array.isArray(parsed)
			? new Set(parsed.filter((p): p is string => typeof p === "string"))
			: new Set();
	} catch {
		return new Set();
	}
}

function persist(key: string, set: Set<string>): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(key, JSON.stringify([...set]));
	} catch {
		// localStorage can be disabled or full; viewed-state is best-effort UX.
	}
}

export function useViewedFiles(pr: PrKey | null) {
	const key = pr ? storageKey(pr) : null;
	const versionNumber = pr?.latestVersionNumber ?? 0;
	const persistedViewedPaths = useQuery(
		api.reviewState.listViewedPaths,
		pr?._id ? { pullRequestId: pr._id, versionNumber } : "skip",
	);
	const setPersistedViewedPaths = useMutation(api.reviewState.setViewedPaths);
	const initialViewed =
		persistedViewedPaths !== undefined
			? new Set(persistedViewedPaths)
			: key
				? load(key)
				: new Set<string>();
	const syncKey = `${key ?? "none"}|${
		persistedViewedPaths === undefined
			? "local"
			: persistedViewedPaths.join("\0")
	}`;
	const [viewed, setViewed] = useState<Set<string>>(() => initialViewed);
	const [trackedKey, setTrackedKey] = useState(syncKey);

	if (trackedKey !== syncKey) {
		setTrackedKey(syncKey);
		setViewed(initialViewed);
	}

	const isViewed = useCallback((path: string) => viewed.has(path), [viewed]);
	const viewedPaths = useMemo(() => [...viewed], [viewed]);
	const persistRemote = useCallback(
		(paths: readonly string[], shouldBeViewed: boolean) => {
			if (!pr?._id) return;
			void Promise.resolve(
				setPersistedViewedPaths({
					pullRequestId: pr._id,
					versionNumber,
					paths: [...paths],
					viewed: shouldBeViewed,
				}),
			).catch(() => {
				// Local optimistic viewed state remains useful if persistence fails.
			});
		},
		[pr?._id, setPersistedViewedPaths, versionNumber],
	);

	const toggle = useCallback(
		(path: string) => {
			if (key === null) return;
			setViewed((current) => {
				const next = new Set(current);
				const shouldBeViewed = !next.has(path);
				if (shouldBeViewed) next.add(path);
				else next.delete(path);
				persist(key, next);
				persistRemote([path], shouldBeViewed);
				return next;
			});
		},
		[key, persistRemote],
	);

	const setPathsViewed = useCallback(
		(paths: readonly string[], shouldBeViewed: boolean) => {
			if (key === null) return;
			setViewed((current) => {
				const next = new Set(current);
				for (const path of paths) {
					if (shouldBeViewed) next.add(path);
					else next.delete(path);
				}
				persist(key, next);
				persistRemote(paths, shouldBeViewed);
				return next;
			});
		},
		[key, persistRemote],
	);

	return { isViewed, setPathsViewed, toggle, viewedPaths };
}
