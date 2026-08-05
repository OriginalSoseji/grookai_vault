# Japanese Master Index V4 Product Integration Inventory V1

Date: 2026-08-05

## Context

The Japanese V4 parent payload is durably applied in production. The next
gate was intentionally read-only: determine what the 5,336 new parents can
already power and what evidence is still missing before product publication,
image hosting, child-printing creation, family promotion, or scanner indexing.

The inventory was produced from branch
`catalog/jpn-v4-production-integration-v2`, starting at commit
`6e88dbb26ca5f74e3a645ed1242e264cfb66e8f3`.

## Problem

Database presence is not the same as product readiness. The applied parents
carry strong identity evidence and external image pointers, but the apply did
not prove self-hosted delivery, printing-level finish, family promotion, or
scanner index membership. Those states must not be inferred from one another.

## Risk

- Publishing all planned `normal` children would convert parent artwork
  evidence into unsupported finish truth.
- Treating external source URLs as self-hosted images would violate the
  production image policy and retain third-party runtime dependencies.
- Promoting pending family-review rows automatically would bypass the review
  boundary established by V4.
- Assuming searchable parents are scanner-ready would hide the absence of
  fingerprint rows.

## Decision

Use `JPN-MASTER-INDEX-V4-PRODUCT-INTEGRATION-INVENTORY-V1` as the governed
row-level inventory. It is pinned to the applied writer and preflight
fingerprints, reads production inside the existing read-only transaction
guard, and emits one integration record for each applied parent.

Search reachability, image hosting, child-printing eligibility, family review,
and scanner readiness remain independent lanes.

## Current Truths

### Scope

- Applied parents inventoried: 5,336
- Distinct parent UUIDs: 5,336
- Distinct parent GV-IDs: 5,336
- Reconciliation findings: 0

### Images

- Self-hosted parent images: 0
- External image pointers: 5,336
- Missing all image pointers: 0
- `image_source = identity`: 5,336
- `image_status = ok`: 5,336

The source URLs are useful acquisition evidence. They are not self-hosted
production delivery proof.

### Child Printings

- Planned candidates: 5,336
- Structurally complete candidate records: 5,336
- Live child printings: 0
- Publication eligible now: 0
- Blocked now: 5,336

Every candidate remains blocked by:

- printing-level finish evidence not established: 5,336
- self-hosted image pointer not proven: 5,336
- separate public-visibility approval required: 5,336

The planned `normal` value is a deferred proposal, not an approved printing
fact.

### Family Review

- `resolved_species`, pending: 3,853
- `resolved_domain`, pending: 1,483
- Promotion allowed: 0
- Reviewed rows: 0

### Search

- Print-identity parent search documents: 5,336
- Legacy search rows: 5,336
- Search V2 rows: 5,336
- Exact parent GV-ID RPC smoke: 12/12

The parents are already reachable through database search read models. This
does not certify client rendering, image reliability, or anonymous product
rollout.

### Scanner

- Currently indexed parents: 0
- Legacy fingerprint rows: 0
- Scanner fingerprint rows: 0
- External-image seed candidates: 5,336
- Self-hosted-image seed candidates: 0

## Source And Artifact Fingerprints

- Writer payload:
  `b11c033901f8cb94b641f2c6e7f3586a3db2bc994242f7d8aa28cb2198218e2c`
- Source preflight:
  `b269de1cae5bb83113e9b88f27400613fca92508c681950861c62213cd6ec36b`
- Deferred child dataset:
  `42e2870a82a6cdfba84c1a7588c3d1610ebac0cebea845febe7af490ead1e60d`
- Inventory content fingerprint:
  `54cdac7d005e1c0a043ad1684715be3dfee31ea8f585f38d5de94fb18c64e4a4`
- Row dataset fingerprint:
  `eeb38caaa7365e9fc75ae8c1f873fed5a4e2e64ca12048d56498d592fca97c61`

## Artifact Hashes

- `jpn_product_integration_inventory_v1.json`:
  `59f8c7c3ccd9d886689f49c5af34fb1aa394a99d0ceafae94556a0454d7d22df`
- `jpn_product_integration_inventory_v1.md`:
  `36af15e127d9b6f73f5ded8d9b335e7b58bb0fe23136d64d2166c274f268c24b`
- Row shard 1:
  `c5435e2165617e3f989072c7bfbfef47e17a28b936edf7b770166bfecc4bdec2`
- Row shard 2:
  `99f8aa6cffc387c6e22687f88c0f9869fbccbb42e7d6b9c3fb08e4bfd79c46c9`

## Verification

- Focused integration-inventory contracts: 8/8 passed.
- Full Japanese Master Index contracts: 136/136 passed.
- Script syntax and `package.json` parsing passed.
- Production transaction and session both proved read-only.
- Exact-GV-ID search RPC smoke passed 12/12.
- `git diff --check` passed.

## Invariants

- External image availability must never be labeled self-hosted coverage.
- Parent identity evidence must never create a finish claim by itself.
- Search reachability must never imply scanner indexing.
- Pending family-review rows must never be promoted automatically.
- Child printing, image hosting, scanner indexing, and family promotion each
  require their own bounded apply and rollback evidence.
- Existing English, pricing, vault, and non-Japanese data must remain outside
  these projects.

## Remaining Work

### Gate 1: Parent Image Self-Hosting

1. Build a no-write acquisition manifest for the exact 5,336 external image
   pointers, including source host, expected parent identity, deterministic
   storage path, download status, MIME type, dimensions, bytes, and SHA-256.
2. Quarantine unavailable, invalid, duplicate, or identity-ambiguous files.
3. Prove a bounded local-cache/download canary before any Storage upload.
4. Upload through a separately approved bounded batch.
5. Apply only reviewed parent `image_path`, `image_source`, `image_status`,
   and compatibility-pointer changes, with rollback and readback evidence.

### Parallel Gate: Family Review

1. Split the 3,853 species candidates from the 1,483 domain-only rows.
2. Determine which species links can be approved deterministically from the
   preserved family key and source evidence.
3. Keep domain-only rows non-promoted unless a valid cross-language family
   authority exists.
4. Apply reviewed decisions through a separate immutable release.

### Downstream Gates

1. Reassess child-printing candidates only after printing-level finish
   evidence exists. Do not bulk-approve the proposed `normal` finish.
2. Build the scanner index from reviewed self-hosted parent images, validate
   offline, then use a separately approved index publication gate.
3. Smoke-test signed-in web and mobile search/rendering using Japanese names,
   English collector-facing names, GV-IDs, set codes, and numbers.
4. Add pricing and vault integration only after the correct public printing
   identities exist.

## Explicit Next Gate

Create the exact-scope parent-image acquisition manifest and a no-Storage-write
download/readiness canary. Stop before uploads or database image-pointer
updates.

## Stop State

The read-only integration inventory is complete. All 5,336 applied parents
are database-search reachable. None is self-hosted or scanner-indexed, no
child printing is publication-ready, and all family-review rows remain
pending and non-promotable.
