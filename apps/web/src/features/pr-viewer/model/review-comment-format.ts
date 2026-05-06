import { PullRequestReviewCommentSide } from "@diffy/shared";
import type { PrReviewCommentDoc } from "../../../../convex/docTypes";
import {
	GIT_DIFF_HUNK_PREFIX,
	GIT_DIFF_LINE_PREFIX,
	getGitPatchFileHeader,
} from "./git-patch-format";

export enum ReviewCommentBodyPartType {
	Markdown = "markdown",
	Suggestion = "suggestion",
}

export type ReviewCommentBodyPart =
	| {
			type: ReviewCommentBodyPartType.Markdown;
			markdown: string;
	  }
	| {
			type: ReviewCommentBodyPartType.Suggestion;
			suggestion: string;
			patch: string;
	  };

type ParsedHunkLine = {
	text: string;
	oldLine: number | null;
	newLine: number | null;
	linePrefix:
		| typeof GIT_DIFF_LINE_PREFIX.Context
		| typeof GIT_DIFF_LINE_PREFIX.Addition
		| typeof GIT_DIFF_LINE_PREFIX.Deletion;
};

export function getReviewCommentLocation(comment: PrReviewCommentDoc): string {
	const line =
		comment.line ??
		comment.startLine ??
		comment.originalLine ??
		comment.originalStartLine ??
		null;

	return line == null ? comment.path : `${comment.path}:${line}`;
}

export function getReviewCommentPatch(comment: PrReviewCommentDoc): string {
	const path = comment.path || "review-comment";
	const hunk = comment.diffHunk.endsWith("\n")
		? comment.diffHunk
		: `${comment.diffHunk}\n`;

	return `${getGitPatchFileHeader(path)}${hunk}`;
}

export function getReviewCommentBodyParts(
	comment: PrReviewCommentDoc,
): ReviewCommentBodyPart[] {
	const parts: ReviewCommentBodyPart[] = [];
	const markdownLines: string[] = [];
	const lines = comment.body.split("\n");

	for (let index = 0; index < lines.length; index += 1) {
		const suggestionStart = getSuggestionFenceInfo(lines[index]);

		if (suggestionStart == null) {
			markdownLines.push(lines[index]);
			continue;
		}

		const suggestionLines: string[] = [];
		let closingFenceIndex: number | null = null;

		for (
			let suggestionLineIndex = index + 1;
			suggestionLineIndex < lines.length;
			suggestionLineIndex += 1
		) {
			if (lines[suggestionLineIndex].trim() === "```") {
				closingFenceIndex = suggestionLineIndex;
				break;
			}

			suggestionLines.push(lines[suggestionLineIndex]);
		}

		if (closingFenceIndex == null) {
			markdownLines.push(lines[index]);
			continue;
		}

		pushMarkdownPart(parts, markdownLines);
		const suggestion = trimTrailingEmptyLines(suggestionLines).join("\n");
		parts.push({
			type: ReviewCommentBodyPartType.Suggestion,
			suggestion,
			patch: getSuggestedChangePatch(comment, suggestion),
		});
		index = closingFenceIndex;
	}

	pushMarkdownPart(parts, markdownLines);
	return withoutSuggestionWrapperMarkdown(parts);
}

export function getSuggestedChangePatch(
	comment: PrReviewCommentDoc,
	suggestion: string,
): string {
	const path = comment.path || "review-comment";
	const oldLines = getReviewedLines(comment);
	const newLines = normalizeSuggestionLines(suggestion);
	const oldRangeStart = oldLines.length === 0 ? 0 : 1;
	const oldRange = oldLines.length;
	const newRange = newLines.length;
	const deletionLines = oldLines.map(
		(line) => `${GIT_DIFF_LINE_PREFIX.Deletion}${line}`,
	);
	const additionLines = newLines.map(
		(line) => `${GIT_DIFF_LINE_PREFIX.Addition}${line}`,
	);

	return `${getGitPatchFileHeader(path)}${GIT_DIFF_HUNK_PREFIX} -${oldRangeStart},${oldRange} +1,${newRange} ${GIT_DIFF_HUNK_PREFIX}
${[...deletionLines, ...additionLines].join("\n")}
`;
}

function getSuggestionFenceInfo(line: string): string | null {
	const match = /^```\s*([^\s`]*)\s*$/.exec(line);
	const info = match?.[1] ?? null;

	if (info == null) return null;
	return info === "suggestion" || info.startsWith("suggestion:") ? info : null;
}

function pushMarkdownPart(
	parts: ReviewCommentBodyPart[],
	markdownLines: string[],
) {
	const markdown = trimOuterEmptyLines(markdownLines).join("\n");
	markdownLines.length = 0;

	if (!markdown) return;
	parts.push({
		type: ReviewCommentBodyPartType.Markdown,
		markdown,
	});
}

function withoutSuggestionWrapperMarkdown(
	parts: ReviewCommentBodyPart[],
): ReviewCommentBodyPart[] {
	const normalizedParts = [...parts];

	for (let index = 0; index < normalizedParts.length; index += 1) {
		if (normalizedParts[index].type !== ReviewCommentBodyPartType.Suggestion) {
			continue;
		}

		const previousPart = normalizedParts[index - 1];
		if (previousPart?.type === ReviewCommentBodyPartType.Markdown) {
			normalizedParts[index - 1] = {
				type: ReviewCommentBodyPartType.Markdown,
				markdown: trimOuterWhitespaceLines(
					previousPart.markdown.replace(
						/\n?\s*<details>\s*\n\s*<summary>.*?<\/summary>\s*$/s,
						"",
					),
				),
			};
		}

		const nextPart = normalizedParts[index + 1];
		if (nextPart?.type === ReviewCommentBodyPartType.Markdown) {
			normalizedParts[index + 1] = {
				type: ReviewCommentBodyPartType.Markdown,
				markdown: trimOuterWhitespaceLines(
					nextPart.markdown.replace(/^\s*<\/details>\s*\n?/s, ""),
				),
			};
		}
	}

	return normalizedParts.filter(
		(part) =>
			part.type !== ReviewCommentBodyPartType.Markdown || part.markdown !== "",
	);
}

function trimOuterWhitespaceLines(value: string): string {
	return trimOuterEmptyLines(value.split("\n")).join("\n");
}

function getReviewedLines(comment: PrReviewCommentDoc): string[] {
	const parsedLines = getParsedHunkLines(comment.diffHunk);
	const isLeftSide = comment.side === PullRequestReviewCommentSide.Left;
	const startLine = isLeftSide
		? (comment.originalStartLine ?? comment.originalLine)
		: (comment.startLine ?? comment.line);
	const endLine = isLeftSide
		? (comment.originalLine ?? comment.originalStartLine)
		: (comment.line ?? comment.startLine);
	const rangedLines =
		startLine == null || endLine == null
			? []
			: parsedLines.filter((line) => {
					const lineNumber = isLeftSide ? line.oldLine : line.newLine;
					return (
						lineNumber != null &&
						lineNumber >= Math.min(startLine, endLine) &&
						lineNumber <= Math.max(startLine, endLine)
					);
				});

	const selectedLines = rangedLines.length > 0 ? rangedLines : parsedLines;
	return selectedLines
		.filter((line) =>
			isLeftSide
				? line.linePrefix !== GIT_DIFF_LINE_PREFIX.Addition
				: line.linePrefix !== GIT_DIFF_LINE_PREFIX.Deletion,
		)
		.map((line) => line.text);
}

function getParsedHunkLines(diffHunk: string): ParsedHunkLine[] {
	const lines = diffHunk.split("\n");
	const hunkHeader = lines.find((line) =>
		line.startsWith(GIT_DIFF_HUNK_PREFIX),
	);
	const hunkHeaderMatch = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(
		hunkHeader ?? "",
	);
	let oldLine = Number(hunkHeaderMatch?.[1] ?? 1);
	let newLine = Number(hunkHeaderMatch?.[2] ?? 1);
	const parsedLines: ParsedHunkLine[] = [];

	for (const line of lines) {
		if (!line || line.startsWith(GIT_DIFF_HUNK_PREFIX)) continue;

		const linePrefix = line.slice(0, 1);
		const text = line.slice(1);

		switch (linePrefix) {
			case GIT_DIFF_LINE_PREFIX.Context:
				parsedLines.push({
					text,
					oldLine,
					newLine,
					linePrefix,
				});
				oldLine += 1;
				newLine += 1;
				break;
			case GIT_DIFF_LINE_PREFIX.Addition:
				parsedLines.push({
					text,
					oldLine: null,
					newLine,
					linePrefix,
				});
				newLine += 1;
				break;
			case GIT_DIFF_LINE_PREFIX.Deletion:
				parsedLines.push({
					text,
					oldLine,
					newLine: null,
					linePrefix,
				});
				oldLine += 1;
				break;
			default:
				break;
		}
	}

	return parsedLines;
}

function normalizeSuggestionLines(suggestion: string): string[] {
	if (suggestion === "") return [];
	return trimTrailingEmptyLines(suggestion.split("\n"));
}

function trimOuterEmptyLines(lines: string[]): string[] {
	return trimTrailingEmptyLines(trimLeadingEmptyLines(lines));
}

function trimLeadingEmptyLines(lines: string[]): string[] {
	let firstNonEmptyLineIndex = 0;

	while (
		firstNonEmptyLineIndex < lines.length &&
		lines[firstNonEmptyLineIndex].trim() === ""
	) {
		firstNonEmptyLineIndex += 1;
	}

	return lines.slice(firstNonEmptyLineIndex);
}

function trimTrailingEmptyLines(lines: string[]): string[] {
	let lastNonEmptyLineIndex = lines.length - 1;

	while (
		lastNonEmptyLineIndex >= 0 &&
		lines[lastNonEmptyLineIndex].trim() === ""
	) {
		lastNonEmptyLineIndex -= 1;
	}

	return lines.slice(0, lastNonEmptyLineIndex + 1);
}
