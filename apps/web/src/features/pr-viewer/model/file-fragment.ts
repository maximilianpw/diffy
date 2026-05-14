import { DiffLocationSide, type DiffLocationTarget } from "./diff-location";

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

export function jumpToFileFragment(fileIndex: number): boolean {
	if (typeof window === "undefined") return false;

	const fragmentId = getFileFragmentId(fileIndex);
	if (window.location.hash.slice(1) !== fragmentId) {
		window.location.hash = fragmentId;
	}

	const fileElement = document.getElementById(fragmentId);
	fileElement?.scrollIntoView({ block: "start" });
	return fileElement != null;
}

export function jumpToDiffLocation(
	fileIndex: number,
	location: DiffLocationTarget,
): boolean {
	if (typeof window === "undefined") return false;

	const fragmentId = getFileFragmentId(fileIndex);
	if (window.location.hash.slice(1) !== fragmentId) {
		window.location.hash = fragmentId;
	}

	const fileElement = document.getElementById(fragmentId);
	const lineElement = fileElement
		? getDiffLineElement(fileElement, location)
		: null;

	if (lineElement) {
		lineElement.scrollIntoView({ block: "center" });
		return true;
	}

	fileElement?.scrollIntoView({ block: "start" });
	return false;
}

function getDiffLineElement(
	fileElement: HTMLElement,
	location: DiffLocationTarget,
): HTMLElement | null {
	const diffContainers = fileElement.querySelectorAll("diffs-container");
	const sideColumn =
		location.side === DiffLocationSide.Additions
			? "data-additions"
			: "data-deletions";
	const sideSelector = `[${sideColumn}] [data-column-number="${location.line}"]`;
	const genericSelector = `[data-column-number="${location.line}"]`;

	for (const diffContainer of diffContainers) {
		const containerRoot = diffContainer.shadowRoot ?? diffContainer;
		const sideMatch = containerRoot.querySelector(sideSelector);
		if (sideMatch instanceof HTMLElement) return sideMatch;

		const genericMatch = containerRoot.querySelector(genericSelector);
		if (genericMatch instanceof HTMLElement) return genericMatch;
	}

	return null;
}
