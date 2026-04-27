# Diffy

A self-hosted GitHub PR diff viewer. Open from a browser-extension tab next to "Files changed", or by pasting a PR URL.

## Layout

- `apps/web` — TanStack Start app + Convex, deployed to Cloudflare Workers.
- `apps/extension` — WXT browser extension (Chrome + Firefox).
- `packages/shared` — URL parser and shared types (`@diffy/shared`).

See `docs/architecture.md` for the intended module boundaries, runtime flow, and vertical slice order.

## Develop

```sh
bun install
bun dev          # starts the web app
```

In a second shell, from `apps/web/`:

```sh
bunx convex dev  # provisions the Convex deployment, populates VITE_CONVEX_URL
```

For the extension:

```sh
bun --filter @diffy/extension dev
```

## Tooling

- Bun workspaces, Biome (format + lint), TypeScript.
- Tool versions pinned in `.tool-versions` (mise/asdf).
- MCP servers for Convex / Playwright / GitHub configured in `.mcp.json`.

See `CLAUDE.md` for project-specific decisions and conventions.
