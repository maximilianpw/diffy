import { describe, expect, it } from "vitest";
import { getPrRefFromSubmission } from "./parse-submission";

describe("getPrRefFromSubmission", () => {
	it("returns the PR reference for a GitHub PR URL", () => {
		expect(
			getPrRefFromSubmission(
				"https://github.com/tanstack/router/pull/123?diff=split",
			),
		).toEqual({ owner: "tanstack", repo: "router", number: 123 });
	});

	it("returns null when the submission is not a GitHub PR URL", () => {
		expect(
			getPrRefFromSubmission("https://github.com/tanstack/router"),
		).toBeNull();
	});
});
