# Diffy

A self-hosted GitHub PR diff viewer. Open from a browser-extension tab next to "Files changed", or by pasting a PR URL.

## Layout

- `apps/web` — TanStack Start app + Convex, deployed to Cloudflare Workers.
- `apps/extension` — WXT browser extension (Chrome + Firefox).
- `packages/shared` — URL parser and shared types (`@diffy/shared`).

## Develop

```sh
pnpm install
pnpm dev          # starts the web app
```

In a second shell, from `apps/web/`:

```sh
pnpm exec convex dev  # provisions the Convex deployment, populates VITE_CONVEX_URL
```

For the extension:

```sh
pnpm --filter @diffy/extension dev
```

For a production extension build, point the injected GitHub tab at the deployed
web app:

```sh
VITE_DIFFY_WEB_URL=https://diffy.example.com pnpm --filter @diffy/extension build
```

## Verify

```sh
pnpm run check
pnpm run test
pnpm run build
```

## Ship

```sh
pnpm run deploy                  # Cloudflare Workers web app
pnpm run zip:extension           # Chrome MV3 zip
pnpm run zip:extension:firefox   # Firefox zip
```

Set the production Convex/Auth values documented in `.env.example` before
deploying the web app. Set `VITE_DIFFY_WEB_URL` when packaging the extension so
the GitHub tab points at the deployed web app instead of local development. If
stored repository tokens are enabled, set `GITHUB_PAT_ENCRYPTION_KEY` in Convex
to a stable 32-byte secret; changing it makes existing encrypted tokens
unreadable.

## Tooling

- pnpm workspaces, Biome (format + lint), TypeScript.
- Tool versions pinned in `.tool-versions` (mise/asdf).
- MCP servers for Convex / Playwright / GitHub configured in `.mcp.json`.

See `CLAUDE.md` for project-specific decisions and conventions.
