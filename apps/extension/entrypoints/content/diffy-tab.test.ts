// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { injectDiffyPullRequestTab } from "./diffy-tab";

describe("injectDiffyPullRequestTab", () => {
	it("adds a Diffy tab beside GitHub pull request tabs", () => {
		document.body.innerHTML = `
			<nav class="tabnav-tabs" aria-label="Pull request">
				<a class="tabnav-tab" href="/diffy/demo/pull/42">Conversation</a>
				<a class="tabnav-tab selected" href="/diffy/demo/pull/42/files">Files changed</a>
			</nav>
		`;

		const result = injectDiffyPullRequestTab({
			appBaseUrl: "https://diffy.example.com",
			locationHref: "https://github.com/diffy/demo/pull/42/files",
		});

		const link = document.querySelector<HTMLAnchorElement>(
			'a[data-diffy-pr-tab="true"]',
		);
		expect(result).toBe("inserted");
		expect(link).not.toBeNull();
		expect(link?.textContent).toBe("Diffy");
		expect(link?.href).toBe("https://diffy.example.com/pr/diffy/demo/42");
		expect(link?.className).toBe("tabnav-tab");
	});

	it("does not insert duplicate tabs when GitHub mutates the page", () => {
		document.body.innerHTML = `
			<nav class="tabnav-tabs" aria-label="Pull request">
				<a class="tabnav-tab" href="/diffy/demo/pull/42/files">Files changed</a>
			</nav>
		`;
		const options = {
			appBaseUrl: "https://diffy.example.com",
			locationHref: "https://github.com/diffy/demo/pull/42",
		};

		expect(injectDiffyPullRequestTab(options)).toBe("inserted");
		expect(injectDiffyPullRequestTab(options)).toBe("already-present");
		expect(document.querySelectorAll('a[data-diffy-pr-tab="true"]')).toHaveLength(
			1,
		);
	});

	it("updates the existing tab when GitHub navigates to another pull request", () => {
		document.body.innerHTML = `
			<nav class="tabnav-tabs" aria-label="Pull request">
				<a class="tabnav-tab" href="/diffy/demo/pull/42/files">Files changed</a>
				<a class="tabnav-tab" data-diffy-pr-tab="true" href="https://diffy.example.com/pr/diffy/demo/42">Diffy</a>
			</nav>
		`;

		expect(
			injectDiffyPullRequestTab({
				appBaseUrl: "https://diffy.example.com",
				locationHref: "https://github.com/diffy/demo/pull/43/files",
			}),
		).toBe("updated");
		expect(
			document.querySelector<HTMLAnchorElement>(
				'a[data-diffy-pr-tab="true"]',
			)?.href,
		).toBe("https://diffy.example.com/pr/diffy/demo/43");
	});
});
