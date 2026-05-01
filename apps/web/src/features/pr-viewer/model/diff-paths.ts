const GIT_DIFF_HEADER_RE = /^diff --git a\/(.*?) b\/(.*)$/gm;
const GIT_DIFF_SPLIT_RE = /(?=^diff --git a\/.* b\/.*$)/gm;

export type PatchFile = {
	path: string;
	patch: string;
};

export function getChangedPathsFromPatch(patch: string): string[] {
	const paths = new Set<string>();
	for (const match of patch.matchAll(GIT_DIFF_HEADER_RE)) {
		paths.add(match[2]);
	}
	return [...paths];
}

export function splitPatchFiles(patch: string): PatchFile[] {
	return patch
		.split(GIT_DIFF_SPLIT_RE)
		.map((filePatch) => filePatch.trimStart())
		.filter((filePatch) => filePatch.startsWith("diff --git "))
		.map((filePatch, index) => {
			const match = /^diff --git a\/(.*?) b\/(.*)$/m.exec(filePatch);
			return {
				path: match?.[2] ?? `unknown-${index}`,
				patch: filePatch.endsWith("\n") ? filePatch : `${filePatch}\n`,
			};
		});
}
