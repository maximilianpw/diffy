import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownContent } from "./MarkdownContent";

describe("MarkdownContent", () => {
	it("renders safe GitHub-style HTML instead of showing it as text", () => {
		render(
			<MarkdownContent>{`<!-- hidden bot state -->
<details><summary>Pre-merge checks</summary>

<sub>Configure custom checks in settings.</sub>

</details>`}</MarkdownContent>,
		);

		const details = screen.getByText("Pre-merge checks").closest("details");
		expect(details).toBeInstanceOf(HTMLDetailsElement);
		expect(
			screen.getByText("Pre-merge checks").closest("summary"),
		).toBeTruthy();
		expect(
			screen.getByText("Configure custom checks in settings.").tagName,
		).toBe("SUB");
		expect(screen.queryByText(/hidden bot state/)).toBeNull();
		expect(screen.queryByText(/<details>/)).toBeNull();
	});
});
