<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Clean dependency installation

After changing dependencies, verify `npm ci` in a clean directory using the npm
version reported by hosted CI as well as the local installer. A successful local
`npm install` is insufficient: npm11 accepted an optional WebAssembly peer layout
that npm10 rejected. Keep the resolver's declared `@emnapi/core` and
`@emnapi/runtime` build peers and their lock entries together. Preserve the
cross-platform optional packages when refreshing the lockfile.
