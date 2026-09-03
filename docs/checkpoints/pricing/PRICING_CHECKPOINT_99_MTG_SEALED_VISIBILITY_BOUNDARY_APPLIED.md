# Pricing Checkpoint 99: MTG Sealed Visibility Boundary Applied

## Status

`BOUNDARY APPLIED - INDEPENDENT READBACK PENDING - SEALED PAYLOAD BLOCKED`

## Context

Production authority was granted for only
`20260903143000_sealed_product_visibility_boundary_v1.sql`, with SHA-256
`0d58da0694dda6fa048ada1109fb9b11e1246eb14a818e50092c59822541dfde`,
from merged `main@2cf542f6e472d8a496402b012f4bd305f8fe2f5a`.

The authorized migration was applied by GitHub run `33796159316` from the
immutable producer SHA through the temporary operational ref
`ops/mtg-sealed-visibility-apply-2cf542f6`. The apply step succeeded and the
same run read the production migration ledger back successfully.

## Problem

The workflow's automatic readback reported a failure in its function-definition
check after the migration had already applied. PostgreSQL rendered the
equivalent expression `coalesce(auth.role(), '')`, while the verifier required
the redundant cast spelling `coalesce(auth.role(), ''::text)`.

The failure was in verifier normalization, not in the production function or
its security boundary. The run's complete function dump and all other readback
checks showed the intended behavior, grants, volatility, search path, RLS,
policies, and data boundaries.

## Risk

- Replaying the migration because the workflow ended red would violate applied
  migration immutability.
- Ignoring the failed verifier without repairing and independently rerunning it
  would weaken the proof chain.
- Proceeding to the MTG sealed payload before a clean independent readback would
  combine schema uncertainty with a separately governed data mutation.
- Activating MTG sealed visibility now could expose an unverified catalog.

## Decision

- Treat the migration as durably applied because the apply step and production
  ledger readback both succeeded.
- Never rerun or edit the applied migration.
- Repair only the verifier so it accepts PostgreSQL's equivalent normalized
  rendering while retaining every function-security assertion.
- Require a fresh independent, zero-write production readback from the merged
  verifier repair before generating a new MTG sealed payload plan.
- Keep MTG sealed visibility `hidden` and keep the payload unapplied.

## Alternatives Rejected

- Reapply the migration: the ledger proves it is already applied.
- Change the production function to satisfy textual formatting: this would add
  a database mutation without changing behavior.
- Suppress the function check: the verifier must continue to prove security,
  volatility, search path, role checks, and grants.
- Continue directly to payload apply: schema authority does not authorize the
  2,904-row evidence payload.

## Migration Applied

- Migration: `20260903143000_sealed_product_visibility_boundary_v1.sql`
- SHA-256:
  `0d58da0694dda6fa048ada1109fb9b11e1246eb14a818e50092c59822541dfde`
- Authorized producer SHA: `2cf542f6e472d8a496402b012f4bd305f8fe2f5a`
- Production apply run: `33796159316`
- Apply result: success
- Migration ledger readback: success
- MTG sealed payload writes: zero
- Storage, pricing publication, Vault, and visibility activation writes: zero

## Production Readback Truths

Run `33796159316` proved:

- both migration file hashes matched their ledger identities;
- ledger rows `20260903130000` and `20260903143000` exist with 20 statements
  each and the expected forward order;
- columns, exact constraints, and supporting index passed;
- RLS, policies, and table privileges passed;
- release and pointer integrity passed;
- One Piece release and active pointer were preserved;
- sealed release controls contain one One Piece row and one MTG row;
- MTG sealed release status is `hidden`;
- MTG sealed releases, active pointers, and RPC rows remain zero;
- MTG catalog release status remains `signed_in`;
- verifier database writes were zero.

The only reported failure was the verifier's cast-sensitive function text
match. Commit `47ef2d79731a9764d6b38e5afa131e41617c49db` repairs that read-only
normalization and adds per-function diagnostics. Its captured production
payload replay passed all readback categories offline. A live independent
readback remains required after that repair merges.

## Current Truths

- Both sealed schema migrations are durably applied in production.
- The separate MTG sealed visibility boundary exists and is hidden.
- No MTG sealed catalog payload has been applied.
- No MTG sealed release or active pointer exists.
- No MTG sealed rows are returned by the governed RPC.
- The previous 2,904-variant plan is stale evidence and is not apply authority.
- PR `#401` contains only the verifier normalization, tests, and this checkpoint
  update; it does not mutate production.

## Invariants

- Applied migration history is immutable.
- Catalog visibility never implies sealed-product visibility.
- MTG sealed remains hidden until a separate explicit activation decision.
- One Piece sealed behavior remains unchanged.
- Readback tools write zero database rows.
- A fresh plan, preflight, and rollback canary do not authorize durable payload
  application.
- Schema authority never authorizes catalog, Storage, pricing, Vault, or
  visibility payload writes.

## What Must Never Be Broken

- Game isolation across sealed releases and active pointers.
- Service ownership of sealed release controls.
- Signed-in-only sealed pricing RPC access.
- Exact evidence and fresh-price qualification for release membership.
- Zero anonymous, cross-game, or candidate-evidence leakage.
- Exact mutation attribution and rollback boundaries.

## Permanent Evidence

- Authorized migration apply and automatic readback:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33796159316`
- Verifier repair PR:
  `https://github.com/OriginalSoseji/grookai_vault/pull/401`
- Prior dry-run:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33767719158`
- Existing MTG sealed audit root:
  `docs/audits/pricing/mtg_sealed_world_v1/`

## Explicit Next Gate

Merge PR `#401` after clean CI, then run the visibility-boundary workflow in
`migration_readback` mode from that exact merged SHA. Require every schema,
function, grant, RLS, policy, visibility, row-boundary, and zero-write check to
pass.

After the independent readback passes, generate a fresh MTG sealed plan from
one frozen producer SHA, run its read-only preflight, and run its transaction-
rollback canary. Stop before durable payload apply and report the fresh plan
fingerprint, source fingerprint, row counts, and canary result. Applying the MTG
sealed payload requires separate exact production authority.
