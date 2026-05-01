import { useCallback, useMemo, useState } from "react";

type PrKey = {
	owner: string;
	repo: string;
	number: number;
};

const STORAGE_PREFIX = "diffy.viewed.";

function storageKey({ owner, repo, number }: PrKey): string {
	return `${STORAGE_PREFIX}${owner}/${repo}#${number}`;
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
	const [viewed, setViewed] = useState<Set<string>>(() =>
		key ? load(key) : new Set(),
	);
	const [trackedKey, setTrackedKey] = useState(key);

	if (trackedKey !== key) {
		setTrackedKey(key);
		setViewed(key ? load(key) : new Set());
	}

	const isViewed = useCallback((path: string) => viewed.has(path), [viewed]);
	const viewedPaths = useMemo(() => [...viewed], [viewed]);

	const toggle = useCallback(
		(path: string) => {
			if (key === null) return;
			setViewed((current) => {
				const next = new Set(current);
				if (next.has(path)) next.delete(path);
				else next.add(path);
				persist(key, next);
				return next;
			});
		},
		[key],
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
				return next;
			});
		},
		[key],
	);

	return { isViewed, setPathsViewed, toggle, viewedPaths };
}
