# Cross-TCG Set Publication Gate V1

## Context

The Cross-TCG Set Browser V1 fixed game-scoped routes, One Piece and Magic
vocabulary, and set-cover coverage. The catalog automation still lacked a
recurring proof that a newly released set preserved those invariants.

## Decision

Add a read-only publication gate to the existing six-hour Catalog Shadow
Reconciliation workflow.

The gate evaluates only released game/set state. It requires canonical cards,
an explicit game browse policy, public self-hosted set media, matching game/set
media identity, and a successful image probe.

## Current Truths

- The gate does not promote or hide sets.
- Exact package, exact set, and representative covers remain distinct.
- Representative cover art is an accepted release fallback.
- A deck using representative art receives a coverage warning rather than
  taking the release offline.
- Blank, external, private, mismatched, and broken media block.
- Future TCGs fail closed until their vocabulary and product lanes are explicit.
- The workflow records immutable artifacts and opens a dedicated GitHub issue
  on regression.

## Invariants

- Database sessions are read-only.
- No database, Storage, pointer, pricing, publication, or Vault writes occur.
- Every selected set appears exactly once in the result.
- The exact producing Git SHA is recorded.
- A failed gate uploads evidence before the workflow fails.
- Pokemon browse vocabulary cannot stand in for another TCG.

## Verification

Required checks:

- Node syntax checks for the policy and worker.
- `cross_tcg_set_publication_gate_v1` contract tests.
- existing Cross-TCG Set Browser tests.
- existing Catalog Shadow Automation tests.
- `git diff --check`.
- one production read-only run with live cover probes.

## Next Gate

After the production read-only result is clean, the remaining set-media work is
optional exact-package enrichment for deck releases currently using valid
representative art. New TCG activation must extend both the backend gate policy
and the web browse configuration before release.
