# Catalog Shadow Automation V1

## Status

Implementation and branch canary complete. Production schedule activation is
gated on merge and default-branch readback.

## Context

Catalog discovery must continuously inspect new sets and cards without making
unattended canonical decisions. The previous schedule still contained bounded
promotion and MTG writer-dispatch paths. Those paths were inappropriate for the
current founder direction: build the broadest supportable shadow catalog in the
background, but write nothing to production identity or app-visible state.

## Decision

All scheduled catalog automation is governed by
`CATALOG_SHADOW_AUTOMATION_V1` and runs in `shadow-only` mode.

Allowed persistence is limited to immutable source evidence, normalized
candidate indexes, data-only Git history, workflow artifacts, and health/issues.
Candidates are evidence, not canonical identity.

The following effects are forbidden from every scheduled catalog path:

- production database writes;
- canonical writer dispatches;
- Storage writes or deletes;
- image-pointer changes;
- pricing or publication writes;
- Vault or collector-state writes;
- app visibility activation.

## Implementation

- Frozen producer commit: `018bdeac9d387aa13f3ba5fca30ade3051778d89`
- Branch: `fix/catalog-shadow-only-automation-v1`
- Pull request: `https://github.com/OriginalSoseji/grookai_vault/pull/267`
- Contract: `docs/contracts/CATALOG_SHADOW_AUTOMATION_V1.md`
- Pure reconciliation policy:
  `backend/catalog/catalog_shadow_automation_v1.mjs`
- Artifact-only worker:
  `scripts/workers/catalog_shadow_reconciliation_v1.mjs`

Scheduled database readers now set
`default_transaction_read_only=on` at session startup and use explicit
read-only transactions. Catalog shadow reconciliation checks out and verifies
the exact triggering SHA. MTG supervision has read-only GitHub Actions authority
and cannot dispatch its catalog writer.

## Live Canary Proof

All canaries ran from frozen producer SHA
`018bdeac9d387aa13f3ba5fca30ade3051778d89` on 2026-08-27.

| Workflow | Run | Result |
| --- | --- | --- |
| Universal Catalog Discovery | `33102491395` | success |
| Catalog Shadow Reconciliation | `33102493635` | success |
| MTG Catalog Supervisor | `33102496137` | success |

Run URLs:

- `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33102491395`
- `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33102493635`
- `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33102496137`

Artifact reconciliation verified 36 recorded SHA-256 entries with zero hash
mismatches.

## Current Catalog Evidence

The live discovery canary recorded:

- 1,257 source sets across the active source adapters;
- 120 source requests;
- 139,894 Pokemon language candidate cards across 18 language scopes;
- 8 actionable Pokemon gaps;
- 61 Pokemon Master Index update candidates;
- 0 canonical promotion candidates;
- database mode `read-only transaction`.

The shadow reconciliation recorded:

- mode `shadow-only`;
- status `completed`;
- database writes `false`;
- child writer dispatches `false`;
- promotion execution `false`.

The MTG supervisor recorded:

- 945 eligible sets complete and exact;
- 7 future sets deferred;
- 0 absent eligible sets;
- 0 partial or drifted eligible sets;
- `shadow_only: true`;
- `dispatched: false`;
- database writes `false`.

## Validation

- Focused catalog contracts: 52/52 passed.
- Modified Node entrypoints: syntax checks passed.
- `git diff --check`: passed.
- Full contract suite: 2,353/2,382 passed.
- The same 29 failures reproduced on an untouched `main` worktree and are
  pre-existing frozen-artifact/fingerprint drift unrelated to this change.

## Current Truths

- Background automation can discover, normalize, compare, and preserve catalog
  candidates without promoting them.
- Pokemon, MTG, and One Piece are the current active discovery source domains.
- A candidate can remain unresolved indefinitely without becoming canonical.
- Existing manual canonical writers still exist, but scheduled workflows cannot
  invoke them.
- Source-adapter expansion for additional TCGs is future shadow-catalog work; it
  does not require weakening this no-write boundary.

## Invariants

1. Candidate evidence is never equivalent to canonical identity.
2. Scheduled catalog jobs never write production database state.
3. Scheduled jobs never dispatch canonical writers.
4. Exact triggering SHA and artifact hashes remain auditable.
5. New source adapters default to shadow-only and must pass this contract.
6. Canonical promotion requires a separately frozen payload, explicit authority,
   bounded write contract, readback, rollback proof, and checkpoint.

## Explicit Next Gate

Merge pull request 267, run the three workflows once from the default branch,
and confirm that the default-branch run artifacts preserve the same read-only,
no-dispatch, and zero-hash-mismatch boundaries. After that, scheduled shadow
catalog growth can run unattended while canonical promotion remains closed.
