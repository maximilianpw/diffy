export type DiffStats = {
	additions: number;
	deletions: number;
};

export function countDiffStats(filePatch: string): DiffStats {
	let additions = 0;
	let deletions = 0;

	for (const line of filePatch.split("\n")) {
		if (line.startsWith("+++") || line.startsWith("---")) continue;
		if (line.startsWith("+")) additions++;
		else if (line.startsWith("-")) deletions++;
	}

	return { additions, deletions };
}
