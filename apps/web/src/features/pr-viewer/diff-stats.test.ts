import { describe, expect, it } from "vitest";
import { countDiffStats } from "./diff-stats";

describe("countDiffStats", () => {
	it("counts added and removed lines, ignoring file headers", () => {
		const filePatch = `diff --git a/apps/web/src/index.ts b/apps/web/src/index.ts
index 1111111..2222222 100644
--- a/apps/web/src/index.ts
+++ b/apps/web/src/index.ts
@@ -1,3 +1,4 @@
 unchanged line
-removed line
+added line one
+added line two
 trailing context
`;

		expect(countDiffStats(filePatch)).toEqual({ additions: 2, deletions: 1 });
	});

	it("returns zeros for a patch with no changed lines", () => {
		const filePatch = `diff --git a/file.ts b/file.ts
index 1111111..2222222 100644
--- a/file.ts
+++ b/file.ts
@@ -1 +1 @@
 only context
`;

		expect(countDiffStats(filePatch)).toEqual({ additions: 0, deletions: 0 });
	});

	it("does not double-count the +++ and --- header lines", () => {
		const filePatch = `diff --git a/a b/b
--- a/a
+++ b/b
@@ -0,0 +1,1 @@
+added
`;

		expect(countDiffStats(filePatch)).toEqual({ additions: 1, deletions: 0 });
	});
});
