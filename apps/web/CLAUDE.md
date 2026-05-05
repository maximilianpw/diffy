<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

## Code style

- Prefer enums for named states, modes, statuses, and cross-module contracts instead of ad hoc string unions or repeated string literals.
- Avoid `useEffect` where possible. Prefer derived render state, event handlers, router/search state, refs, or framework data primitives. Use effects only for focused synchronization with external systems or browser APIs.
