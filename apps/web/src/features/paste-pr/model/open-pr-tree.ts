import type { Doc, Id } from "../../../../convex/_generated/dataModel";

export type OpenPrEntry = {
	id: Id<"pullRequests">;
	owner: string;
	repo: string;
	number: number;
	title: string;
};

export type OpenPrTree = {
	paths: string[];
	prByPath: Map<string, OpenPrEntry>;
};

const SLASH_REPLACEMENT = "∕";

export function buildOpenPrTree(
	prs: ReadonlyArray<Doc<"pullRequests">>,
): OpenPrTree {
	const titleCounts = new Map<string, number>();
	for (const p of prs) {
		const key = `${p.owner}/${p.repo}/${sanitise(p.title)}`;
		titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
	}

	const paths: string[] = [];
	const prByPath = new Map<string, OpenPrEntry>();

	for (const p of prs) {
		const sanitisedTitle = sanitise(p.title);
		const baseKey = `${p.owner}/${p.repo}/${sanitisedTitle}`;
		const basename =
			(titleCounts.get(baseKey) ?? 0) > 1
				? `${sanitisedTitle} (#${p.number})`
				: sanitisedTitle;
		const path = `${p.owner}/${p.repo}/${basename}`;
		paths.push(path);
		prByPath.set(path, {
			id: p._id,
			owner: p.owner,
			repo: p.repo,
			number: p.number,
			title: p.title,
		});
	}

	return { paths, prByPath };
}

function sanitise(title: string): string {
	return title.replaceAll("/", SLASH_REPLACEMENT);
}
