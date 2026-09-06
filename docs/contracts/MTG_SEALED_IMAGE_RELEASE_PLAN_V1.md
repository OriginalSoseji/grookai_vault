# MTG Sealed Image Release Plan V1

Status: Frozen planning contract; no database mutation authority  
Date: 2026-09-04

## Purpose

Bind the completed MTG sealed image coverage and durable Storage proofs into an
exact, append-only database payload. This gate plans the evidence release only.
It does not insert rows or activate an image pointer.

## Frozen Sources

- Active frozen MTG price release: `25626032-7d72-5542-a8e0-7a6532c2f776`
- Source price members: `2,182`
- Image-eligible variants: `2,149`
- Exact durable Storage objects: `2,141`
- Preserved exclusions: `33`
- Coverage fingerprint:
  `cf0e11f6bd5e990d48fa3b5e9a3f2f58d35a7314c28fe47cbab02f7cf07cdd0d`
- Durable Storage execution fingerprint:
  `ce99331a559a62d78a2ef2fffa389d30498df16928f4de9d7e1d58cec8ff426e`

No image may enter this payload unless its bytes, format, MIME type, dimensions,
size, content hash, Storage path, and Storage readback reconcile exactly to the
durable execution.

## Payload Shape

The planner creates deterministic rows for:

- `2,182` `sealed_product_image_evidence` rows;
- `2,141` `sealed_product_image_objects` rows;
- `2,149` `sealed_product_variant_image_assertions` rows;
- `1` draft `sealed_product_image_releases` row;
- `2,149` `sealed_product_image_release_members` rows.

The 33 excluded source members receive evidence rows only. They receive no
object assertion, release membership, representative image, or placeholder.

Every row ID and fingerprint is deterministic. Release-member and release
manifest fingerprints use the exact PostgreSQL `jsonb_build_array(... )::text`
hash contract from migration `20260904130000` and must match a live read-only
database calculation before the plan can freeze.

## Collision Policy

- Empty image tables permit a separately authorized exact insert.
- A complete identical frozen release produces an idempotent zero-row result.
- Any partial collision stops before writes.
- Any mismatched ID, fingerprint, source member, object hash, or pointer stops
  before writes.
- Existing objects and evidence are never overwritten or deleted.

## Apply Boundary

The first future apply gate must use one transaction:

1. Re-run production preflight and compare exact source authority.
2. Insert evidence, objects, assertions, one draft release, and release members.
3. Recompute the canonical manifest in PostgreSQL.
4. Freeze the release using the exact manifest.
5. Read back every row and protected boundary inside the transaction.
6. Commit only if every count, reference, fingerprint, and boundary matches.
7. Perform an independent read-only post-apply readback.
8. Prove a zero-row idempotency rerun.

That apply does not activate `sealed_product_image_release_pointer`.

## Pointer And Rollback

Pointer activation is a separate gate after the frozen evidence release passes
independent readback.

Before durable activation, run the exact compare-and-swap pointer function
inside a transaction, verify the target and all serving prerequisites, then
roll back and prove the baseline pointer state is restored. Durable pointer
activation requires separate authority and the same expected-current pointer.

The database evidence release is append-only. Its safe post-commit rollback is
to leave it inactive. No deletion is part of rollback. MTG sealed visibility
must remain `hidden` through both gates.

## Security Readback

Planning and every later apply/readback must prove:

- all six image tables have enabled and forced RLS;
- `anon` and `authenticated` have no direct table privileges;
- `service_role` has only the frozen table and routine privileges;
- the source MTG price release remains active and frozen;
- One Piece and all card, pricing, Vault, visibility, and client boundaries are
  unchanged.

## Prohibited

This planning contract authorizes no database writes, Storage operations,
image-pointer changes, pricing writes, visibility changes, signer deployment,
client activation, Vault mutation, cross-game mutation, update, delete, or
cleanup.

## Stop Condition

Stop after producing a hash-bound zero-write plan and production read-only
preflight. The next action requires exact authority for the append-only evidence
release apply. Pointer activation remains separately gated.
