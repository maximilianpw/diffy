import { describe, expect, it } from 'vitest';
import { getChangedPathsFromPatch, splitPatchFiles } from './diff-paths';

describe('getChangedPathsFromPatch', () => {
	it('returns paths from git diff headers', () => {
		const patch = twoFilePatch();

		expect(getChangedPathsFromPatch(patch)).toEqual([
			'apps/web/src/index.ts',
			'packages/shared/src/pr-url.ts',
		]);
	});

	it('splits a GitHub patch into one patch per file', () => {
		const files = splitPatchFiles(twoFilePatch());

		expect(files).toHaveLength(2);
		expect(files[0].path).toBe('apps/web/src/index.ts');
		expect(files[0].patch).toContain('diff --git a/apps/web/src/index.ts b/apps/web/src/index.ts');
		expect(files[0].patch).not.toContain('diff --git a/packages/shared/src/pr-url.ts');
		expect(files[1].path).toBe('packages/shared/src/pr-url.ts');
	});
});

function twoFilePatch() {
	return `diff --git a/apps/web/src/index.ts b/apps/web/src/index.ts
index 1111111..2222222 100644
--- a/apps/web/src/index.ts
+++ b/apps/web/src/index.ts
@@ -1 +1 @@
-old
+new
diff --git a/packages/shared/src/pr-url.ts b/packages/shared/src/pr-url.ts
index 3333333..4444444 100644
--- a/packages/shared/src/pr-url.ts
+++ b/packages/shared/src/pr-url.ts
@@ -1 +1 @@
-old
+new
`;
}
