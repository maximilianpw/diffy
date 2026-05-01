export const previewFiles = [
	{
		path: "apps/web/src/routes/index.tsx",
		patch: `diff --git a/apps/web/src/routes/index.tsx b/apps/web/src/routes/index.tsx
index 1111111..2222222 100644
--- a/apps/web/src/routes/index.tsx
+++ b/apps/web/src/routes/index.tsx
@@ -1,5 +1,10 @@
 import { createFileRoute } from '@tanstack/react-router';
+import { PastePrHome } from '../features/paste-pr/components/PastePrHome';

-export const Route = createFileRoute('/')({ component: () => <p>Welcome to TanStack Start</p> });
+export const Route = createFileRoute('/')({ component: Home });

+function Home() {
+	const navigate = Route.useNavigate();
+	return <PastePrHome navigateToPr={(path) => navigate({ to: path })} />;
+}
`,
	},
	{
		path: "packages/shared/src/pr-url.ts",
		patch: `diff --git a/packages/shared/src/pr-url.ts b/packages/shared/src/pr-url.ts
index 3333333..4444444 100644
--- a/packages/shared/src/pr-url.ts
+++ b/packages/shared/src/pr-url.ts
@@ -1,2 +1,8 @@
-export const placeholder = true;
+export type PrIdentifier = { owner: string; repo: string; number: number };
+
+export function parsePrUrl(input: string): PrIdentifier | null {
+	const match = input.match(/github\\.com\\/([^/]+)\\/([^/]+)\\/pull\\/(\\d+)/);
+	if (!match) return null;
+	return { owner: match[1], repo: match[2], number: Number(match[3]) };
+}
`,
	},
	{
		path: "apps/extension/entrypoints/content.ts",
		patch: `diff --git a/apps/extension/entrypoints/content.ts b/apps/extension/entrypoints/content.ts
index 5555555..6666666 100644
--- a/apps/extension/entrypoints/content.ts
+++ b/apps/extension/entrypoints/content.ts
@@ -1,3 +1,6 @@
-// placeholder
+export default defineContentScript({
+	matches: ['https://github.com/*/*/pull/*'],
+	main: () => injectDiffyTab(),
+});
`,
	},
];
