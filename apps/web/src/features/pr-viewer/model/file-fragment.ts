export function getFileFragmentId(fileIndex: number): string {
	return String(fileIndex + 1);
}

export function findFileIndexForFragment(
	fileCount: number,
	hash = typeof window === "undefined" ? "" : window.location.hash,
): number | null {
	const fragmentId = hash.startsWith("#") ? hash.slice(1) : hash;
	if (!/^[1-9]\d*$/.test(fragmentId)) return null;

	const fileIndex = Number(fragmentId) - 1;
	return fileIndex < fileCount ? fileIndex : null;
}

export function jumpToFileFragment(fileIndex: number): void {
	if (typeof window === "undefined") return;

	const fragmentId = getFileFragmentId(fileIndex);
	if (window.location.hash.slice(1) !== fragmentId) {
		window.location.hash = fragmentId;
	}

	document.getElementById(fragmentId)?.scrollIntoView({ block: "start" });
}
