# Pricing Checkpoint 117: MTG Sealed Image Release Plan Frozen

## Context

Checkpoint 116 proved and preserved all 2,141 durable, exact-readback MTG
sealed image objects supporting 2,149 variants. The database image schema was
already applied, but all six image tables remained empty and the MTG image
release pointer remained absent.

## Problem

Storage objects alone are not governed product image authority. Every source
release member needs immutable evidence; every eligible variant needs an exact
object assertion; and the eligible set needs a database-canonical release
manifest before any pointer or client can use those images.

## Risk

Incorrect source bindings, locally invented fingerprints, partial collisions,
or premature pointer activation could make an image appear to prove the wrong
sealed variant. A plan that omitted the 33 failed source images could also lose
the audit record and later allow representative art to fill those gaps.

## Decision

Freeze a deterministic append-only evidence-release payload from code commit
`722aaf241e967ebc3e05f3963eb44f31cc81c6ae` and plan fingerprint
`7c7f65ed0d281fec9f9b0e65f74c6b695828445bcf45fb2dcd98baab814c68a9`.

The planned release is
`86b207e6-4f73-5d9a-af40-864c47256c38`, with database-canonical manifest
`7ef0baf51b75d54d5d52b810634432918303d76c338e6d9152be07beb06d12c2`.

The first future apply must insert and freeze the evidence release without
activating the image pointer. Pointer activation remains a separate gate after
independent readback and a rollback-only compare-and-swap canary.

## Planned Rows

- Image evidence: `2,182`
- Exact image objects: `2,141`
- Exact variant assertions: `2,149`
- Draft then frozen image releases: `1`
- Image release members: `2,149`
- Evidence-only exclusions: `33`
- Image pointer writes in the first apply: `0`

## Production Read-Only Proof

- Active MTG price release:
  `25626032-7d72-5542-a8e0-7a6532c2f776`
- Price release state: `frozen`
- Expected / observed source members: `2,182 / 2,182`
- Source member mismatches: `0`
- Existing rows across all six image tables: `0`
- Existing MTG image pointer: `null`
- MTG sealed visibility: `hidden`
- MTG catalog visibility: `signed_in`
- One Piece price pointer count: `1`
- Image tables with enabled and forced RLS: `6/6`
- Direct `anon` or `authenticated` table grants: `0`
- Expected service table grants: `11`
- Expected service routine grants: `2`
- Applied image migration ledger rows: `1`
- PostgreSQL member fingerprints checked / mismatched: `2,149 / 0`
- Planned / PostgreSQL manifest mismatch: `0`
- Production transaction and session read-only: `on / on`
- Database writes: `0`
- Storage operations: `0`

## Collision And Idempotency Policy

- Empty target tables permit only the separately authorized exact payload.
- Any partial collision or mismatched ID/fingerprint hard-stops before writes.
- A complete identical frozen release becomes a zero-row idempotent rerun.
- Existing evidence and objects are never updated, overwritten, or deleted.
- The 33 exclusions cannot receive assertions or release membership.

## Rollback

Any mismatch before the evidence apply commits rolls back the whole transaction.
After commit, the immutable evidence release remains safely inactive because
the image pointer is unchanged. No destructive rollback is allowed.

Before later pointer activation, execute the exact pointer compare-and-swap in
a transaction, verify it, roll back, and prove restoration to the current null
baseline. Durable pointer activation requires separate authority.

## Verification

- New image-release contracts: `6/6` passed.
- Image migration, schema, and release-plan contracts: `34/34` passed.
- Syntax checks: passed.
- `git diff --check`: passed.
- The full repository shipcheck reached Flutter tests and reported one failure
  while loading `identity_search_probe_test.dart`; that isolated test then
  passed `6/6`. This backend planning gate did not alter Flutter code.

## Permanent Evidence

`docs/audits/pricing/mtg_sealed_image_release_plan_v1/2026-09-05T01-36-09Z_read_only/`

The directory contains the exact compressed evidence, object, assertion, and
member payloads; the release row; exclusions; pointer plan; production
preflight; summary; report; and SHA-256 artifact manifest.

## Current Truths

- Every source price member has exactly one planned evidence row.
- Every eligible variant resolves to an exact verified Storage object.
- Shared bytes deduplicate objects without merging variant evidence.
- All 33 source gaps remain explicit and ineligible.
- No database image authority has yet been written.
- No MTG image release is active.
- MTG sealed remains hidden.

## Invariants

- Source release, coverage, durable Storage execution, plan, and manifest
  fingerprints must all match at apply time.
- The evidence apply may not activate the image pointer.
- App roles retain no direct image-table access.
- Pricing, visibility, clients, signer, Vault, cards, and other games remain
  unchanged.

## What Must Never Be Broken

Do not infer image authority from a Storage path. Do not omit excluded evidence.
Do not accept locally computed member hashes without PostgreSQL parity. Do not
combine the append-only evidence apply with pointer activation or visibility.

## Exact Next Gate

Build the guarded database evidence-release executor from the frozen artifacts,
prove a full rollback-only transaction, and freeze a separately fingerprinted
durable apply plan. The executor may insert exactly 2,182 evidence rows, 2,141
object rows, 2,149 assertions, one draft release, and 2,149 members, then freeze
that release after exact manifest verification. It must not activate the image
pointer or perform Storage, pricing, visibility, signer, client, Vault,
cross-game, update, or delete operations.
