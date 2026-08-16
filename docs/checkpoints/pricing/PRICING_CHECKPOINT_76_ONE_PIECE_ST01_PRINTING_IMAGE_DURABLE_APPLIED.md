# Pricing Checkpoint 76: One Piece ST-01 Printing And Image Durable Applied

## Current Truth

The exact ST-01 printing and parent-image-pointer payload is now durable in
production and has passed both writer readback and a separate fresh read-only
verification.

- Parent pointer updates committed: `17`
- Normal child `card_printings` inserted: `14`
- Exact TCGPlayer `external_printing_mappings` inserted: `14`
- Foil child rows written: `0`
- Child image-pointer rows written: `0`
- Independent findings: `0`
- One Piece release status: `hidden`
- Anonymous visibility: `false`
- Authenticated visibility: `false`
- Service visibility: `false`

The ST-01 printing/image durable gate is complete. This does not authorize
public One Piece release or catalog-wide promotion.

## Frozen Authority

- Branch: `agent/one-piece-ingestion-readiness-v1`
- Durable apply producer SHA:
  `3e38c15b260dfc415f89f7051e4cab3fccead60b`
- Apply-plan producer SHA:
  `35ab5b1d065456c7764722c1af90d9f559c274f3`
- Apply-plan fingerprint:
  `4e8762052370315c75402f5dd7c42763dd1f6558efe44c2d6e2b35306139ec36`
- Mutation-plan fingerprint:
  `52d48812803ede0db3a536f0a08346a12aa1461cef128ab5b55a0224f089e13f`
- Mutation-payload fingerprint:
  `1916b0279e007648b55244543a25530b631d4f69a0b4ad74333fb84ee87cb1ec`
- Rollback proof:
  `5981125e7746b174cef093274b70c1fbb301ddaf6b732eef40b3728fd489eddb`

## Decision

The durable writer was permitted to perform only the transaction already
proved by checkpoint 75:

1. update 17 existing parent image pointers through complete-row
   compare-and-set predicates;
2. insert 14 deterministic normal child-printing rows;
3. insert 14 deterministic exact TCGPlayer printing mappings;
4. read back every target row inside the transaction;
5. verify transaction-local write attribution; and
6. commit only when every finding was empty.

The writer was inert by default and required the exact clean producer SHA,
branch, apply-plan fingerprint, mutation-payload fingerprint, and approval
binding. Its `run_plan.json` was written before production database access.

## Production Proof

Transaction mutation counts and readback reconciled exactly:

- `card_prints`: `0` inserts, `17` updates, `0` deletes, `4` HOT updates;
- `card_printings`: `14` inserts, `0` updates, `0` deletes;
- `external_printing_mappings`: `14` inserts, `0` updates, `0` deletes.

The four HOT updates are a subset of the 17 total parent updates and remain
inside the checkpoint 75 policy range. They are not additional writes.

The writer opened a fresh read-only connection after commit and read back all
17 parent rows, 14 child rows, and 14 mapping rows. A separate verifier process
then repeated the readback on another fresh read-only transaction and returned
`fresh_read_only_post_apply_verification_passed` with zero findings.

## Invariants

- The 17 canonical parent identities were not replaced or re-keyed.
- Parent artwork uses self-hosted `image_path` values with
  `image_source=identity`.
- The 14 exact child rows represent only supported `normal` source lanes.
- The three `foil` products remain explicit taxonomy blockers with no child.
- Child image fields remain null; parent artwork was not copied into a
  finish-specific image claim.
- No update, delete, merge, upsert, cleanup, or overwrite occurred in the
  child or printing-mapping tables.
- No DON!!, sealed, Storage, pricing, publication, Vault, Pokemon, Japanese,
  or MTG row was written.
- One Piece remains hidden from every application role.

## Validation

- Focused durable-apply and rollback contracts: passed.
- Complete One Piece contract suite before apply: `172 / 172` passed.
- Full repository contracts after the CI timing repair: passed.
- Full web typecheck, lint, and strict production build: passed.
- Flutter analysis and tests: `614 / 614` passed.
- Independent post-apply findings: `0`.
- Reconciliation mismatches: `0`.

The unrelated Collaborative Binders process-containment fixture was made
deterministic under full parallel load by increasing only its child-startup
timeout from one to five seconds. The timeout, descendant cleanup, output
capture, and handle-disposal assertions remain unchanged.

## Artifact Integrity

- Frozen apply-plan file SHA-256:
  `e7a1e9b2bfe4726b781f7b608214214704515e4bf1223a0c906083b176c8658d`
- Durable execution summary SHA-256:
  `923ac5111469636c8b706df9cff4fe0fd7442ed94304dba317a4da7ee2ef473c`
- Durable execution hash-manifest SHA-256:
  `213b7757a423b1c6f950e762af9d86fcb74648f2e75a66344103c493fa08f53a`
- Independent verifier summary SHA-256:
  `59b69b1ac7c3f82c86145baa1ad25c2753e06e3ff8ecbf419d1fd0b4d99d63fe`
- Independent verifier hash-manifest SHA-256:
  `7d7dd15843035d7dc49586b1730ffc1939756472987fc0b8bc37bac3e12af8cc`

## Artifacts

- Frozen durable apply plan:
  `docs/audits/pricing/one_piece_st01_printing_image_durable_apply_v1/frozen_apply_plan_v1/`
- Durable execution:
  `docs/audits/pricing/one_piece_st01_printing_image_durable_apply_v1/durable_apply_execution_v1/`
- Independent post-apply verifier:
  `docs/audits/pricing/one_piece_st01_printing_image_durable_apply_v1/independent_post_apply_v1/`
- Preceding rollback proof:
  `docs/audits/pricing/one_piece_st01_printing_image_rollback_canary_v1/production_rollback_hot_policy_v1/`

## Exact Next Gate

Inventory and reconcile the complete available English TCGPlayer One Piece
catalog against the source warehouse. Generalize the proven classification,
identity, printing, finish, DON!!, sealed, and image-planning contracts without
adding public visibility or pricing publication authority.

Quarantine unsupported or ambiguous rows individually. Do not infer foil
taxonomy, create child images without printing evidence, overwrite existing
canonical identities, or expose One Piece to application roles during that
catalog-wide readiness gate.
