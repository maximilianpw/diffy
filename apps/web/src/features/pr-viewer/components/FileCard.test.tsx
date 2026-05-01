import { PatchDiff } from "@pierre/diffs/react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FileCard } from "./FileCard";

vi.mock("@pierre/diffs/react", () => ({
	PatchDiff: vi.fn(() => <div data-testid="patch-diff" />),
}));

const PATCH = `diff --git a/src/index.ts b/src/index.ts
index 1111111..2222222 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1 +1 @@
-old
+new
`;

describe("FileCard", () => {
	it("does not opt PatchDiff out of the worker pool", () => {
		render(
			<FileCard
				fileIndex={0}
				path="src/index.ts"
				patch={PATCH}
				viewed={false}
				onToggleViewed={vi.fn()}
			/>,
		);

		expect(PatchDiff).toHaveBeenCalledWith(
			expect.not.objectContaining({ disableWorkerPool: true }),
			undefined,
		);
	});
});
