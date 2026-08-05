# Japanese Master Index V4 Permanent Storage Upload Completion V1

Date: 2026-08-05

## Context

The Japanese V4 image program had 53 deterministic high-resolution-ready
assets: 17 from the original official-source canary and 36 from source
remediation. A transient Storage proof had already established upload,
readback, removal, and absence behavior. The next separately approved gate
was to upload and retain the exact 53 permanent objects without database or
image-pointer access.

The approved execution ran from branch
`catalog/jpn-v4-production-integration-v2` at frozen source commit
`74f4386a027e7f76ad3dc8aa63600b7a50cf1a48`.

## Approval

The user explicitly approved only this permanent Storage mutation:

- Approval fingerprint:
  `23da727efaea32b71e3498f9af7ec12b83bed0e43519c55053d4fe2d27ee3b5e`
- Storage plan hash:
  `79d7744de1db13db6f58c441663e6d03c33f277e35d5d3c7c1a5a5364e59cd59`
- Exact object scope: 53
- No database access
- No image-pointer updates
- Every object required collision preflight and exact readback
- Any failure required rollback of only objects created by that execution

The approval did not include child printing writes, family promotion, scanner
publication, pricing, vault, cleanup, deletion, or rows outside the exact
53-object plan.

## Execution Result

Target:

- Supabase project: `ycdxbpibncqcchqiihfz`
- Storage bucket: `user-card-images`
- Upload policy: `upsert: false`
- Existing target policy: hard stop

Outcome:

- Status: `uploaded_verified_and_retained`
- Assets planned: 53
- Source assets staged and verified: 53
- Target paths initially absent: 53
- Objects uploaded: 53
- Exact Storage readbacks verified: 53
- Failure rollback removals: 0
- Durable objects after run: 53
- Runtime error: none
- Database reads: 0
- Database writes: 0
- Image-pointer writes: 0

All source bytes were staged before the first Storage request. Collision
preflight found all 53 target paths absent. Every upload was downloaded and
matched its frozen hash, size, dimensions, and image format. Because the full
batch succeeded, no rollback was triggered and all 53 objects remain stored.

## Proof

- Result proof hash:
  `56c1957683e3ef444b28fe74da0aae711d70d588e70d291ab59c188da225c353`
- Result JSON SHA-256:
  `401262eeb6afefa00edefa1b277f000242a6f13f4d2a6051b6a10d20fc5219e8`
- Result Markdown SHA-256:
  `8db631b496caef61fd4197996ea1634d3a041773725d108a2c3ba71b2c88c61c`
- Result JSON:
  `docs/audits/japanese_master_index_v4/image_storage_permanent_apply_v1/jpn_image_storage_permanent_apply_v1.json`
- Human-readable result:
  `docs/audits/japanese_master_index_v4/image_storage_permanent_apply_v1/jpn_image_storage_permanent_apply_v1.md`

A post-run plan-only replay reproduced the same 53-object approval fingerprint
and plan hash with no Storage or database access.

## Current Truths

- Exactly 53 Japanese V4 high-resolution images are now durably self-hosted.
- Every retained object passed exact readback verification during the approved
  run.
- No database row points to these objects as a consequence of this gate.
- Existing external image evidence and database image fields remain unchanged.
- The remaining 5,283 applied Japanese V4 parent rows are not included in this
  Storage completion claim.
- The 13 review-only and 4 blocked source-remediation rows remain unresolved.

## Invariants

- Storage existence is not database-pointer authority.
- The exact 53 stored objects must be reverified before any pointer mutation.
- Pointer changes require a separate complete-row snapshot, compare-and-swap
  contract, rollback-only proof, explicit approval, and post-write readback.
- Existing image evidence must not be overwritten without an explicit
  deterministic replacement policy.
- English, non-Japanese, pricing, vault, child-printing, family, scanner, and
  public-visibility boundaries remain unchanged.

## Verification

- Pre-run branch, source commit, remote, and clean-worktree checks passed.
- Pre-run plan-only reconciliation matched the exact approval fingerprint and
  plan hash.
- Pre-run permanent Storage contracts passed 6/6.
- The approved runner exited successfully after 53/53 readbacks.
- Post-run plan-only reconciliation matched the same frozen package.
- Permanent completion contracts cover counts, authorization boundaries, and
  proof-hash verification.
- Permanent Storage focused contracts passed 9/9 after result capture.
- Full Japanese Master Index contract suite passed 176/176.
- Release secret guard and `git diff --check` passed.

## Explicit Next Gate

Prepare a no-write database image-pointer package for only these 53 rows. The
planning package must:

- reverify all 53 durable Storage objects against the frozen asset manifest;
- read the exact current `card_prints` rows without mutation;
- freeze complete before-row JSON snapshots and the smallest allowed image
  column changes;
- preserve any stronger existing exact image state unless a deterministic
  replacement policy explicitly allows the change;
- use a single transaction with row locks and complete-row compare-and-swap;
- prove rollback-only behavior before requesting real apply approval;
- exclude all child printing, family, pricing, vault, English, and non-Japanese
  mutations.

Do not apply database pointers in the Storage completion gate.

## Stop State

The approved permanent Storage upload is complete with 53 durable,
readback-verified objects. Database and image-pointer state remain unchanged.
