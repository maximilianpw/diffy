# Diffy Extension

WXT browser extension for Diffy.

The content script runs on GitHub pull request pages and inserts a Diffy tab
next to GitHub's pull request tabs. By default the tab points at
`http://localhost:3000` for local development.

For a production build, set `VITE_DIFFY_WEB_URL`:

```sh
VITE_DIFFY_WEB_URL=https://diffy.example.com bun run build
```

The extension does not collect or transmit personal data. Firefox builds declare
that through `browser_specific_settings.gecko.data_collection_permissions`.
