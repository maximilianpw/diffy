import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrViewerShell } from './PrViewerShell';

describe('PrViewerShell', () => {
	it('renders imported PR diff data', () => {
		render(
			<PrViewerShell
				owner="tanstack"
				repo="router"
				number={123}
				status="ready"
				paths={['packages/router/src/index.ts']}
				patch={`diff --git a/packages/router/src/index.ts b/packages/router/src/index.ts
index 1111111..2222222 100644
--- a/packages/router/src/index.ts
+++ b/packages/router/src/index.ts
@@ -1 +1 @@
-old
+new
`}
			/>,
		);

		expect(screen.getByRole('heading', { name: 'tanstack/router#123' })).toBeTruthy();
		expect(screen.getByText('Changed files')).toBeTruthy();
		expect(screen.getByRole('region', { name: 'Diff preview' })).toBeTruthy();
		expect(screen.getByText('Imported from GitHub')).toBeTruthy();
		expect(screen.getByText('packages/router/src/index.ts')).toBeTruthy();
	});

	it('renders an importing state', () => {
		render(
			<PrViewerShell
				owner="tanstack"
				repo="router"
				number={123}
				status="importing"
				paths={[]}
				patch={null}
			/>,
		);

		expect(screen.getByText('Importing pull request from GitHub...')).toBeTruthy();
	});
});
