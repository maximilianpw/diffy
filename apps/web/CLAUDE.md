<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->

## Code style

- Prefer enums for named states, modes, statuses, and cross-module contracts instead of ad hoc string unions or repeated string literals.
- Avoid `useEffect` where possible. Prefer derived render state, event handlers, router/search state, refs, or framework data primitives. Use effects only for focused synchronization with external systems or browser APIs.

<!-- intent-skills:start -->

# Skill mappings - load `use` with `npx @tanstack/intent@latest load <use>`.

skills:

- when: "Working on TanStack Start app setup, client/server entry points, root route document shell, or React-specific Start APIs."
  use: "@tanstack/react-start#react-start"
- when: "Working on TanStack Start server functions, server routes, middleware, environment boundaries, or request/response utilities."
  use: "@tanstack/start-client-core#start-core"
- when: "Deploying the web app to Cloudflare Workers or changing SSR, prerendering, cache headers, or route-level SSR behavior."
  use: "@tanstack/start-client-core#start-core/deployment"
- when: "Adding or changing server functions, validation, FormData handling, response status/headers, redirects, or server-only file organization."
  use: "@tanstack/start-client-core#start-core/server-functions"
- when: "Adding or changing server-side API endpoints with route `server.handlers`."
  use: "@tanstack/start-client-core#start-core/server-routes"
- when: "Working on TanStack Router file routes, route trees, route context, or route generation conventions."
  use: "@tanstack/router-core#router-core"
- when: "Protecting routes, wiring Convex Auth state into router context, or changing redirect-based auth."
  use: "@tanstack/router-core#router-core/auth-and-guards"
- when: "Adding or changing route loaders, loaderDeps, pending/error states, router invalidation, or deferred data."
  use: "@tanstack/router-core#router-core/data-loading"
- when: "Adding or changing typed navigation, links, preloading, active link state, or scroll restoration."
  use: "@tanstack/router-core#router-core/navigation"
- when: "Adding or changing validated search params, URL-backed UI state, or loaderDeps derived from search."
  use: "@tanstack/router-core#router-core/search-params"
- when: "Adding or changing dynamic PR path params, splat routes, optional params, or typed `useParams` calls."
  use: "@tanstack/router-core#router-core/path-params"
- when: "Changing the TanStack Router Vite plugin, route generation, routes directory, or automatic code splitting."
  use: "@tanstack/router-plugin#router-plugin"
- when: "Configuring TanStack Devtools or the devtools Vite plugin for local debugging."
use: "@tanstack/devtools-vite#devtools-vite-plugin"
<
<!-- intent-skills:end -->
