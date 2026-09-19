# Storefront full repository gate — September 19 UTC

The complete, unchanged `npm run shipcheck` passed on the local release candidate
based on `a151794a98cc1e47a9a8886e0e643009cea898e5`. This supersedes the earlier
integration checkpoint's pending full-suite step. Product source and the consolidated
release migration did not change during this check.

## Results

- Release secret guard, runtime preflight, health, quarantine and deferred reports passed.
- Node contracts: 3,907 total; 3,904 passed, three skipped, zero failures.
- Full website TypeScript and ESLint checks passed.
- Strict Next.js build passed, including all 27 static pages and local sitemap reads.
- `flutter clean`, dependency resolution and analysis passed; analysis found no issues.
- All 748 Flutter tests passed with concurrency one.

`shipcheck.json` records the command, log hash, counts and local target readback.
The full log remains in ignored `.local/integration/shipcheck.log`. Earlier browser,
SQL rollback, schema replay and physical Samsung proofs remain at their original
audit paths; this run does not claim a new device or production journey.

## Repairs and reproducibility

The sparse release checkout initially lacked unchanged repository fixtures needed
by the full suite. Tracked checkpoints, workflows, audit fixtures, release documents
and referenced baseline screenshots were restored byte-for-byte from recorded main.
No frozen repair evidence was edited and no repair executor was run.

The collector staging contract test inherited the storefront build environment,
causing its unrelated target-mode assertions to use the wrong port. It now executes
each real staging module in an explicit test environment. A regression covers
storefront target isolation and fixture/hosted crossover rejection. No production
authorization or application code was changed to make the checks pass.

The website build initially failed because its local API was unavailable during
sitemap generation. Starting the existing dedicated API resolved that failure.
`scripts/tests/run_storefront_shipcheck_v1.mjs` preserves the exact repository gate,
validates the fixed local project, supplies only local credentials and settings,
uses a read-only SQL connection, disables telemetry, and loads the outbound Node
network guard. The temporary loopback relay closes when the suite exits. See
`scripts/tests/STOREFRONT_TESTING.md` for the repeatable service commands.

Next.js-generated local build-directory references in `next-env.d.ts` and
`tsconfig.json` are restored from the prepared index after validation. They are
build artifacts, not intended source changes. Shared dependency junctions and
other worktrees are preserved.

## Commit and remaining release gates

The candidate is prepared for a local commit on
`review/vendor-storefronts-release-20260919`. The normal pre-commit hook remains
enabled and runs the full gate again using the same isolated environment. A commit
is successful only if that hook finishes successfully; no bypass is used.

No push, merge, remote migration, entitlement activation, payment action, worker
dispatch or deployment is authorized by this checkpoint. Code-review acceptance,
PR #473 integration coordination, fresh catalog dependency preflight and a separately
authorized release remain required. Store rollout flags remain off. Retain the
additive data and disable publication/read flags if a later rollout is reversed.
