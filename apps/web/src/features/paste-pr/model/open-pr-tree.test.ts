import { describe, expect, it } from "vitest";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { buildOpenPrTree } from "./open-pr-tree";

function pr(
	overrides: Partial<Doc<"pullRequests">> & {
		owner: string;
		repo: string;
		number: number;
		title: string;
	},
): Doc<"pullRequests"> {
	return {
		_id: `pr_${overrides.owner}_${overrides.repo}_${overrides.number}` as Doc<"pullRequests">["_id"],
		_creationTime: 0,
		authorLogin: "octocat",
		authorAvatarUrl: "https://example.com/a.png",
		state: "open",
		baseRef: "main",
		headRef: "feat/x",
		baseSha: "a",
		headSha: "b",
		htmlUrl: `https://github.com/${overrides.owner}/${overrides.repo}/pull/${overrides.number}`,
		diffStorageId: "storage_x" as Doc<"pullRequests">["diffStorageId"],
		diffByteSize: 0,
		importedAt: 0,
		lastViewedAt: 0,
		githubUpdatedAt: 0,
		...overrides,
	};
}

describe("buildOpenPrTree", () => {
	it("groups PRs into owner/repo/title paths", () => {
		const { paths, prByPath } = buildOpenPrTree([
			pr({ owner: "tanstack", repo: "router", number: 1, title: "Add API" }),
			pr({ owner: "tanstack", repo: "query", number: 2, title: "Fix cache" }),
		]);

		expect(paths).toEqual([
			"tanstack/router/Add API",
			"tanstack/query/Fix cache",
		]);
		expect(prByPath.get("tanstack/router/Add API")).toMatchObject({
			owner: "tanstack",
			repo: "router",
			number: 1,
		});
	});

	it("sanitises slashes in titles so they don't fork the tree", () => {
		const { paths } = buildOpenPrTree([
			pr({
				owner: "acme",
				repo: "core",
				number: 9,
				title: "feat/auth: rotate tokens",
			}),
		]);

		expect(paths).toEqual(["acme/core/feat∕auth: rotate tokens"]);
	});

	it("disambiguates duplicate titles in the same repo via the PR number", () => {
		const { paths, prByPath } = buildOpenPrTree([
			pr({ owner: "acme", repo: "core", number: 10, title: "WIP" }),
			pr({ owner: "acme", repo: "core", number: 11, title: "WIP" }),
		]);

		expect(paths).toEqual(["acme/core/WIP (#10)", "acme/core/WIP (#11)"]);
		expect(prByPath.get("acme/core/WIP (#10)")?.number).toBe(10);
		expect(prByPath.get("acme/core/WIP (#11)")?.number).toBe(11);
	});
});
