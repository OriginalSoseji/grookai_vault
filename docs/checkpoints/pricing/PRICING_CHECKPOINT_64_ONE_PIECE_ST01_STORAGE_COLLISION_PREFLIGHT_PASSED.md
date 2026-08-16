# Pricing Checkpoint 64: One Piece ST-01 Storage Collision Preflight Passed

## Context

Checkpoint 63 acquired and independently verified source image bytes for the
exact 21-row One Piece ST-01 staging batch. Eighteen card/DON rows received
proposed content-addressed paths; three sealed rows remained outside the image
pointer contract.

This checkpoint records the next bounded gate: a read-only collision preflight
against the exact 18 proposed Supabase Storage objects.

## Current Truth

The preflight was produced from frozen commit
`d20217eb9de3d899b30715833737701341b852a3` on branch
`agent/one-piece-ingestion-readiness-v1`.

- Preflight fingerprint:
  `760733af1a85a828b56206334fdebab8acd3d8246cd938a9d82f05632c4be01b`
- Run-plan fingerprint:
  `c8bba7c126aaf70f30f83c8e8cf844e66df6e1356435253c19d769ce97005d42`
- Source readiness fingerprint:
  `e98d7e21fd828765165f6fde5a897c24104e8d9dabaeebe3808950a886190468`
- Source readiness rows SHA-256:
  `6fd5b77b764bf1a8400bc02f271781499321759b6a45d108e5f18571c7555c89`
- Target Supabase project: `ycdxbpibncqcchqiihfz`
- Target bucket: `user-card-images`
- Selected card/DON assets: `18`
- Locally reverified cache objects: `18`
- Storage list requests: `18`
- Existing target objects/collisions: `0`
- Objects ready for a separately authorized upload: `18`
- Sealed assets included: `0`
- Artifact hash mismatches: `0`

Independent reconciliation confirmed 18 unique source product IDs, parent
GV-IDs, target paths, and source-image hashes. Positions are exactly 1 through
18 and every path is under the governed One Piece ST-01 prefix.

## Problem And Risk

Content-addressed paths reduce accidental overwrites but do not prove that a
target object is absent. Uploading before a fresh collision check could replace
or silently conflict with evidence already present in Storage. Including sealed
products would also cross a still-undefined sealed image-pointer boundary.

## Decision

The exact 18 card/DON paths are collision-free at this checkpoint and may move
to a separately guarded permanent-upload plan. This result grants no upload,
pointer-update, canonical-promotion, sealed-write, or publication authority.

## Alternatives Rejected

- Uploading with `upsert: true` was rejected because it could overwrite an
  existing object.
- Treating content-addressed paths as sufficient collision proof was rejected.
- Including the three sealed rows was rejected because no governed sealed
  image contract exists for this batch.
- Combining upload and database pointer mutation was rejected because those
  are separate durable mutation boundaries.

## No-Write Proof

- Run plan was written before the first Storage request.
- Storage reads: `18`
- Storage downloads: `0`
- Storage uploads: `0`
- Storage removals: `0`
- Database connections/writes: `0 / 0`
- Pointer updates: `0`
- Canonical mutations: `0`

## Invariants

- All future upload inputs must remain bound to the exact 18 paths, hashes,
  byte sizes, and dimensions from the frozen plan.
- A fresh collision check is required immediately before each upload.
- Uploads must use `upsert: false`.
- Every uploaded object must be downloaded and reconciled by SHA-256, byte
  size, media type, and dimensions.
- Any partial failure may remove only objects created by that execution, then
  must verify those objects absent.
- No sealed asset, database row, canonical identity, image pointer, pricing
  row, publication row, or Vault row may be mutated by the upload gate.
- Existing objects must never be overwritten or deleted.

## Artifacts

- Audit directory:
  `docs/audits/pricing/one_piece_st01_storage_collision_preflight_v1/st01_18_objects_v1/`
- Frozen run plan: `run_plan.json`
- Per-object collision proof: `collision_rows.jsonl`
- Local source-byte readback: `local_cache_readback.json`
- Summary: `summary.json`
- Reconciliation report: `REPORT.md`
- Permanent audit hashes: `artifact_hashes.json`

## Exact Next Gate

Freeze and test a permanent Storage upload writer for exactly these 18 objects.
The writer must perform a fresh collision check, use `upsert: false`, upload
only verified source bytes, perform exact post-upload download/readback, and
roll back only objects created by its own execution on any failure. Do not run
the permanent upload until its immutable plan and mutation boundary have been
reviewed. Do not update database image pointers in the upload gate.
