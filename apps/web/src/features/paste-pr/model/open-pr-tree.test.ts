import { describe, expect, it } from "vitest";
import type { PrDoc } from "../../../../convex/doc-types";
import { PullRequestState } from "../../pr-viewer/model/pull-request.types";
import { buildOpenPrTree } from "./open-pr-tree";

function pr(
	overrides: Partial<PrDoc> & {
		owner: string;
		repo: string;
		number: number;
		title: string;
	},
): PrDoc {
	return {
		_id: `pr_${overrides.owner}_${overrides.repo}_${overrides.number}` as PrDoc["_id"],
		_creationTime: 0,
		authorLogin: "octocat",
		authorAvatarUrl: "https://example.com/a.png",
		body: null,
		state: PullRequestState.Open,
		baseRef: "main",
		headRef: "feat/x",
		baseSha: "a",
		headSha: "b",
		htmlUrl: `https://github.com/${overrides.owner}/${overrides.repo}/pull/${overrides.number}`,
		diffStorageId: "storage_x" as PrDoc["diffStorageId"],
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
