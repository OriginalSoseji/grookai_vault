# Japanese Master Index V4 Transient Storage Canary Completion V1

Date: 2026-08-05

## Context

Japanese V4 database identity rows were already applied under a separately
bounded approval. Image-source remediation then identified 53
high-resolution-ready rows: 17 from the original official-source sample and
36 from deterministic source remediation. Before any durable image hosting,
the production Storage path needed a mutation proof with mandatory rollback.

The approved canary ran from branch
`catalog/jpn-v4-production-integration-v2` at frozen source commit
`6b1e1637c29577f7e475a1be6782b0d67ca4a5ab`.

## Approval

The user approved only the transient 17-object Japanese V4 Storage canary:

- Approval fingerprint:
  `ef7d4745196a3f670870fa27f7d5b7a4d6609d61beae5889f4d90ea18d8394d7`
- Storage plan hash:
  `0d387055da45e4e1f38cfb2007eb8cb4e175023eb221c6d55391d46d6d6779ae`
- No database access
- No image-pointer updates
- Every uploaded object had to be read back, removed, and verified absent

This approval did not authorize durable image hosting, a larger upload,
database pointer writes, child printing writes, family promotion, scanner
publication, pricing writes, vault writes, cleanup, or deletion of existing
objects.

## Execution

Target:

- Supabase project: `ycdxbpibncqcchqiihfz`
- Storage bucket: `user-card-images`
- Existing-object policy: hard stop
- Upload policy: `upsert: false`

Result:

- Status: `passed_and_rolled_back`
- Assets staged: 17
- Objects uploaded: 17
- Exact readbacks verified: 17
- Objects removed: 17
- Target paths verified absent: 17
- Durable objects after run: 0
- Database reads: 0
- Database writes: 0
- Image-pointer writes: 0
- Runtime error: none

The source images were staged before the first Storage call. Each downloaded
Storage object matched the planned hash, size, dimensions, and image format.
The guarded cleanup removed every canary-created object and verified all 17
target paths were absent.

## Proof

- Result proof hash:
  `5ef791677e10d1a0643c4add7b25a50fc67bbf9460e8fba68a1e398009f9911a`
- Result JSON file SHA-256:
  `39b9577842ec3cbc6c3c1acbc267942565e7b070af65d9ba0a71d45ce05de3b6`
- Result Markdown file SHA-256:
  `c141750adcc6c6e3491f53d1b282930eb42ab26003ca96edbccbb44644f8adec`
- Result artifact:
  `docs/audits/japanese_master_index_v4/image_storage_canary_apply_v1/jpn_image_storage_canary_apply_v1.json`
- Human-readable result:
  `docs/audits/japanese_master_index_v4/image_storage_canary_apply_v1/jpn_image_storage_canary_apply_v1.md`

A post-run plan-only replay reproduced the same approval fingerprint and plan
hash with `storage_access_performed: false`.

## Current Truths

- The exact production bucket accepted non-overwriting writes for all 17
  approved paths.
- Storage readback preserved the planned bytes and image properties.
- Cleanup and absence verification worked for all 17 paths.
- No object from this canary remains in Storage.
- No database or image-pointer operation occurred.
- This proves the Storage mechanism, not permanent publication.
- Fifty-three Japanese V4 rows currently have deterministic
  high-resolution-ready sources.

## Invariants

- Transient Storage proof is not durable-upload approval.
- A hosted image is not permission to update a database image pointer.
- Existing objects must never be overwritten by an image acquisition job.
- Identity evidence, source quality, Storage state, and database pointer state
  remain independently governed.
- English, non-Japanese, pricing, vault, family, child-printing, scanner, and
  public visibility boundaries remain unchanged.

## Verification

- Pre-run branch, commit, remote, and clean-worktree checks passed.
- Pre-run plan-only reconciliation matched the approved fingerprint and hash.
- Pre-run focused Storage contracts passed 7/7.
- The live runner exited successfully.
- Post-run plan-only reconciliation matched the same frozen approval.
- Permanent contract assertions cover exact counts, authorization boundaries,
  and proof-hash verification.

## Explicit Next Gate

Prepare a separate, fingerprinted permanent Storage upload package for the 53
high-resolution-ready Japanese V4 rows: the original 17 plus the 36
deterministically remediated rows. That package must include exact source and
target hashes, collision preflight, bounded upload/readback reconciliation,
rollback strategy, and independent explicit approval.

Database image-pointer updates remain a later, separately approved gate after
the permanent objects exist and read back correctly. Do not combine durable
Storage upload and database pointer mutation into one approval.

## Stop State

The transient Storage canary is complete and left zero durable objects. No
permanent images were uploaded and no database pointers were changed.
