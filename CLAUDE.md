# Diffy

A self-hosted GitHub PR diff viewer. Entered from a browser-extension tab next to "Files changed", or by pasting a PR URL. Future hooks (deferred): AI code tour, marking chunks as important.

## Workflow

- **TDD by default.** Red → green → refactor. Write the failing test first, smallest change to pass, then clean up. Use the `tdd` skill if it helps structure the loop.
- **Don't expand scope.** If a task drifts toward something in "Out of scope" below, stop and ask.

## Decisions worth knowing

These aren't obvious from the code — don't second-guess them without asking.

- **Auth = Convex Auth (GitHub provider).** GitHub OAuth tokens never leave Convex. The extension intentionally has no auth — clicking its tab opens the web app, which already has the user's session.
- **Diff + tree UI = `@pierre/diffs` and `@pierre/trees`.** Don't reach for alternatives (react-diff-view, etc.). The "mark chunk important" feature will piggyback on `@pierre/diffs`'s annotations API.
- **Extension stays dumb.** Content script's only job: inject an `<a>` linking to the web app. No React, no shared components, no message passing.
- **`packages/shared` is headless.** No React, no UI. Content scripts run in hostile DOMs.
- **OAuth scope starts at `public_repo`.** Expand to `repo` only when private repos are explicitly on the table.

## Convex specifics

`apps/web/.cursorrules` has Convex schema/validator reference material — read it before changing `apps/web/convex/`.

## Tooling

**MCP servers** (configured in `.mcp.json` — agents that read it pick them up automatically):

- `convex` — inspect schema, run functions, tail logs against the local deployment. Run from `apps/web`.
- `playwright` — drive a real browser for testing the diff route and the WXT extension's content script.
- `github` — query the GitHub API (PRs, diffs, files); also useful for prototyping the calls Diffy itself makes. Requires `GITHUB_PERSONAL_ACCESS_TOKEN` in env.
- `context7` (loaded at user level) — fetch current docs for TanStack Start, Convex, WXT, `@pierre/*`. Prefer over web search for any library API question.
- Cloudflare MCP — *not yet wired*; add when first Workers deploy ships.

**Skills worth using on this project:**

- `tdd` — matches the default workflow above.
- `frontend-design:frontend-design` — for non-`@pierre/*` UI surfaces (login, paste-URL landing, layout shell).
- `security-review` — run before merging anything that touches OAuth or token handling.
- `claude-code-setup:claude-automation-recommender` — once a few routes exist, run it to suggest hooks tailored to this stack.
- `commit-commands:commit` / `commit-push-pr` — standard git flow.
- `simplify`, `slop`, `claude-md-management:claude-md-improver` — periodic hygiene.
