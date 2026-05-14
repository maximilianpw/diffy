import { appPrPath, parseGithubPrUrl } from "@diffy/shared";

const DIFFY_TAB_SELECTOR = 'a[data-diffy-pr-tab="true"]';
const TAB_NAV_SELECTORS = [
	"nav.tabnav-tabs",
	".tabnav-tabs",
	'nav[aria-label="Pull request"]',
	'[aria-label="Pull request"] [role="tablist"]',
];

export type DiffyTabInjectionResult =
	| "inserted"
	| "updated"
	| "already-present"
	| "not-a-pr"
	| "nav-not-found";

export type DiffyTabOptions = {
	appBaseUrl: string;
	locationHref?: string;
	root?: ParentNode;
};

export function injectDiffyPullRequestTab({
	appBaseUrl,
	locationHref = window.location.href,
	root = document,
}: DiffyTabOptions): DiffyTabInjectionResult {
	const pr = parseGithubPrUrl(locationHref);
	if (!pr) return "not-a-pr";

	const href = new URL(appPrPath(pr), appBaseUrl).toString();
	const existingTab = root.querySelector<HTMLAnchorElement>(DIFFY_TAB_SELECTOR);
	if (existingTab) {
		if (existingTab.href === href) return "already-present";
		existingTab.href = href;
		return "updated";
	}

	const tabNav = findPullRequestTabNav(root);
	if (!tabNav) return "nav-not-found";

	const tab = document.createElement("a");
	tab.dataset.diffyPrTab = "true";
	tab.className = getTabClassName(tabNav);
	tab.href = href;
	tab.textContent = "Diffy";

	const filesTab = findFilesChangedTab(tabNav);
	if (filesTab) {
		filesTab.insertAdjacentElement("afterend", tab);
	} else {
		tabNav.append(tab);
	}

	return "inserted";
}

function findPullRequestTabNav(root: ParentNode): Element | null {
	for (const selector of TAB_NAV_SELECTORS) {
		const nav = root.querySelector(selector);
		if (nav) return nav;
	}

	return null;
}

function findFilesChangedTab(tabNav: Element): Element | null {
	for (const link of tabNav.querySelectorAll("a")) {
		const text = link.textContent?.replace(/\s+/g, " ").trim().toLowerCase();
		const href = link.getAttribute("href") ?? "";
		if (text?.includes("files changed") || href.endsWith("/files")) {
			return link;
		}
	}

	return null;
}

function getTabClassName(tabNav: Element): string {
	const firstTab = tabNav.querySelector("a");
	return firstTab?.className || "tabnav-tab";
}
