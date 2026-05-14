import { injectDiffyPullRequestTab } from "./content/diffy-tab";

const DEFAULT_APP_BASE_URL = "http://localhost:3000";

export default defineContentScript({
	matches: ["https://github.com/*/*/pull/*"],
	runAt: "document_idle",
	main() {
		const appBaseUrl =
			import.meta.env.VITE_DIFFY_WEB_URL || DEFAULT_APP_BASE_URL;

		function inject() {
			injectDiffyPullRequestTab({ appBaseUrl });
		}

		inject();

		const observer = new MutationObserver(inject);
		observer.observe(document.body, { childList: true, subtree: true });
		window.addEventListener("turbo:render", inject);
		window.addEventListener("popstate", inject);
	},
});
