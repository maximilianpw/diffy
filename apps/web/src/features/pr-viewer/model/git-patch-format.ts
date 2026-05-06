export const GIT_DIFF_FILE_PREFIX = "diff --git";
export const GIT_DIFF_OLD_FILE_PREFIX = "--- a/";
export const GIT_DIFF_NEW_FILE_PREFIX = "+++ b/";
export const GIT_DIFF_HUNK_PREFIX = "@@";

export const GIT_DIFF_LINE_PREFIX = {
	Context: " ",
	Addition: "+",
	Deletion: "-",
	NoNewlineMarker: "\\",
} as const;

export function getGitPatchFileHeader(path: string): string {
	return `${GIT_DIFF_FILE_PREFIX} a/${path} b/${path}
${GIT_DIFF_OLD_FILE_PREFIX}${path}
${GIT_DIFF_NEW_FILE_PREFIX}${path}
`;
}
