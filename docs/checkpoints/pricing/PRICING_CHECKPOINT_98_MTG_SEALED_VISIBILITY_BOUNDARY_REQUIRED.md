# Pricing Checkpoint 98: MTG Sealed Visibility Boundary Required

## Status

`FIRST MIGRATION APPLIED - SEALED PAYLOAD STILL BLOCKED`

## Context

Production authority was granted for only
`20260903130000_sealed_product_per_game_release_v2.sql`, with SHA-256
`630463aa7af959d9e885423baa5fda948a759c0263a92805c8318828743ca0a6`,
from merged `main@e04e3129eae597fc3b81497809dadf2ef72e00d1`.

GitHub run `33761561881` applied that exact migration successfully. The run
did not write MTG catalog rows, sealed products, Storage objects, image
pointers, pricing publication, Vault data, or visibility activation.

An independent read-only verifier from
`main@68fe3f5b2f5cbbae29b20fa7bdb78eed4af42081` then inspected the production
ledger, schema, constraints, indexes, functions, grants, RLS, policies, rows,
and active pointers in GitHub run `33764237780`.

## Problem

The readback proved the migration itself was applied correctly, but failed the
MTG visibility boundary check. The live MTG catalog release status was
`signed_in`, while there was no separate sealed-product visibility control.

The database was not corrupt. The original assumption that MTG catalog
visibility could also govern sealed visibility was unsafe. Applying and
activating the planned MTG sealed release under that model could expose the
new sealed rows to signed-in users immediately.

## Risk

- A sealed payload could become visible through an already-released card
  catalog before its own verification gate.
- Weakening the readback to accept `signed_in` would hide the missing trust
  boundary instead of repairing it.
- Reusing the previously frozen 2,904-variant plan after schema work would
  ignore source drift.
- Combining the boundary migration with the sealed payload would conflate two
  independent production authorities.

## Decision

- Preserve the successful first migration and its ledger row unchanged.
- Do not weaken the validator.
- Add a game-scoped sealed-product release control independent of catalog
  release control.
- Preserve current One Piece sealed visibility during backfill.
- Seed MTG sealed visibility as `hidden`.
- Require both catalog and sealed visibility in sealed pricing RPCs.
- Keep the new boundary migration, its production apply, and the later MTG
  sealed payload as separate gates.

## Alternatives Rejected

- Treating the failed readback as corruption: every schema, security, and
  integrity check except the visibility assumption passed.
- Accepting catalog `signed_in` as sufficient: this would permit unreviewed
  sealed exposure.
- Mutating the applied migration: applied migrations are immutable.
- Applying the 2,904-row sealed payload now: the required visibility boundary
  is not yet present and the prior plan is no longer fresh apply authority.

## Migration Applied

- Migration: `20260903130000_sealed_product_per_game_release_v2.sql`
- SHA-256:
  `630463aa7af959d9e885423baa5fda948a759c0263a92805c8318828743ca0a6`
- Producer SHA: `e04e3129eae597fc3b81497809dadf2ef72e00d1`
- Apply run: `33761561881`
- Result: success
- Authorized data payload writes: zero

## Readback Truths

Read-only run `33764237780` proved:

- exact migration file hash: passed;
- production ledger row and forward order: passed;
- columns and exact constraint definitions: passed;
- supporting index: passed;
- function definitions and function ACLs: passed;
- RLS and service-only policies: passed;
- complete table privilege checks: passed;
- null game keys and cross-game pointer mismatches: zero;
- One Piece release and active pointer: preserved;
- MTG sealed releases: zero;
- MTG sealed pointers: zero;
- MTG sealed RPC rows: zero;
- MTG catalog status: `signed_in`;
- database writes by verifier: zero.

## Current Truths

- The first per-game migration is durably applied and must not be replayed or
  edited.
- No MTG sealed catalog payload has been applied.
- No MTG sealed release or pointer exists.
- The prior frozen plan contained 2,904 variants, but it is evidence only.
- The boundary repair is local until merged and separately authorized.
- Boundary migration:
  `20260903143000_sealed_product_visibility_boundary_v1.sql`.
- Current boundary migration SHA-256:
  `0d58da0694dda6fa048ada1109fb9b11e1246eb14a818e50092c59822541dfde`.

## Invariants

- Applied migration history is immutable.
- Catalog visibility never implies sealed-product visibility.
- MTG sealed remains hidden until a later explicit release decision.
- One Piece sealed behavior is preserved.
- No migration run may use `--include-all`.
- Schema authority never authorizes catalog, Storage, pricing, Vault, or
  visibility payload writes.
- Read-only verification failures must remain visible and fail closed.
- A stale plan fingerprint is never durable apply authority.

## What Must Never Be Broken

- Game isolation across releases and active pointers.
- Service ownership of sealed release controls.
- Signed-in-only sealed pricing RPC access.
- Exact evidence and fresh-price qualification for release membership.
- Zero cross-game or anonymous leakage.
- Atomic rollback attribution for each separately authorized mutation.

## Permanent Evidence

- First migration apply:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33761561881`
- Independent readback:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33764237780`
- Existing frozen plan artifacts:
  `docs/audits/pricing/mtg_sealed_world_v1/`

## Explicit Next Gate

Merge the sealed visibility boundary from clean CI, then run only the new
migration's production dry-run from the exact merged `main` SHA. The dry-run
must prove no remote-only migrations and exactly one pending file:
`20260903143000_sealed_product_visibility_boundary_v1.sql`.

Stop after that dry-run. Applying the boundary migration requires separate
exact production authority tied to its final merged SHA and file hash. The MTG
sealed payload remains a still-later, separately authorized gate.
