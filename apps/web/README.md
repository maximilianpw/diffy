# Diffy Web

TanStack Start frontend and Convex backend for Diffy.

## Development

From the repository root:

```sh
bun dev
```

This starts the Vite app and `convex dev` together. The web app listens on
`http://localhost:3000`.

## Checks

```sh
bun --filter @diffy/web check
bun --filter @diffy/web test
bun --filter @diffy/web build
```

## Deploy

```sh
bun --filter @diffy/web deploy
```

The Cloudflare Worker is configured in `wrangler.jsonc`. Convex/Auth environment
variables are documented in the repository root `.env.example`. The stored
GitHub token flow requires `GITHUB_PAT_ENCRYPTION_KEY` in the Convex environment
before users can save repository-specific PATs.
