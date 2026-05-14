import { useEffect, useMemo, useState } from "react";
import { type PatchFile, splitPatchFiles } from "../model/diff-paths";

export type PrDiff = {
	patch: string | null;
	patchFiles: PatchFile[];
	paths: string[];
	error: string | null;
};

export function usePrDiff(diffUrl: string | undefined): PrDiff {
	const [patch, setPatch] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!diffUrl) {
			setPatch(null);
			setError(null);
			return;
		}

		let cancelled = false;
		setPatch(null);
		setError(null);
		void fetch(diffUrl)
			.then((response) => {
				if (!response.ok)
					throw new Error(`Diff fetch failed: ${response.status}`);
				return response.text();
			})
			.then((text) => {
				if (!cancelled) setPatch(text);
			})
			.catch((cause) => {
				if (cancelled) return;
				setError(
					cause instanceof Error
						? cause.message
						: "Could not load pull request diff.",
				);
			});

		return () => {
			cancelled = true;
		};
	}, [diffUrl]);

	const patchFiles = useMemo(
		() => (patch ? splitPatchFiles(patch) : []),
		[patch],
	);
	const paths = useMemo(
		() => patchFiles.map((file) => file.path),
		[patchFiles],
	);
	return { patch, patchFiles, paths, error };
}
