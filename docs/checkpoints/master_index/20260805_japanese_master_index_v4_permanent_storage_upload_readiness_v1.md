# Japanese Master Index V4 Permanent Storage Upload Readiness V1

Date: 2026-08-05

## Context

The Japanese V4 transient Storage canary proved that the production bucket
supports non-overwriting upload, exact readback, removal, and absence
verification. That canary left zero durable objects. Source remediation also
resolved 36 additional low-resolution rows to deterministic high-resolution
sources.

This gate combines the original 17 high-resolution canary assets and the 36
remediated assets into one permanent-upload approval package. The package was
prepared on branch `catalog/jpn-v4-production-integration-v2`, starting from
commit `c84698d20ce5494ce4b7b0940a6535c2fc0337a8`.

## Problem

Permanent self-hosting requires stronger boundaries than the transient
canary. A successful run will intentionally retain objects, so the exact
source bytes, target paths, collision policy, readback requirements, failure
rollback scope, and database exclusion must all be frozen before approval.

## Risk

- A stale or changed source image could upload under a previously planned
  identity.
- An existing target could be overwritten or silently reused.
- A partial failure could leave unverified orphan objects.
- Storage success could be incorrectly treated as database-pointer approval.
- A broad cleanup could remove an object not created by this execution.

## Decision

Prepare one exact 53-object package with these rules:

- Stage and verify all exact source bytes before the first Storage request.
- Require all 53 target paths to be absent before the first upload.
- Stop on any existing target object.
- Upload with `upsert: false`; overwrite is forbidden.
- Download every uploaded object and verify hash, size, dimensions, and image
  format.
- Retain all 53 objects only if the entire run succeeds.
- On any upload or readback failure, remove only objects created by that
  execution and verify those paths absent.
- Perform no database reads, database writes, or image-pointer updates.

The planning gate itself uses only verified repository artifacts and local
cache files. It does not fetch sources or access Storage or the database.

## Scope

- Total assets: 53
- Original high-resolution canary lane: 17
- Deterministic source-remediation lane: 36
- Unique card-print IDs: 53
- Unique GV-IDs: 53
- Unique target paths: 53
- Official Japanese source images: 48
- Preserved exact Serebii source images: 5
- Local cache hash and image-property verification: 53/53

Source authorities:

- Applied Japanese V4 identity-evidence pointer: 17
- Unique exact official set/number/printed-name match: 31
- Preserved exact Serebii row/detail-page evidence: 5

## Frozen Approval Boundary

- Approval fingerprint:
  `23da727efaea32b71e3498f9af7ec12b83bed0e43519c55053d4fe2d27ee3b5e`
- Storage plan hash:
  `79d7744de1db13db6f58c441663e6d03c33f277e35d5d3c7c1a5a5364e59cd59`
- Code bundle hash:
  `590542fd2abc8710272a9f83410e75ed917556b09de9e2ce8244cd18abcc51e7`
- Asset dataset fingerprint:
  `c5764e3e530d28009a28c58bd43e2159d9df042d407aff1dc4e8ff303b52d201`
- Plan artifact content fingerprint:
  `9f124fc23f7f6dcfcfeb26f0f4a54ec4624eea426f785f124e87be81aa63c5d9`

## Artifact Hashes

- Plan JSON SHA-256:
  `a358322717107ccedda56182ad94086c389d85f02329118baa49efbc7deccec8`
- Plan Markdown SHA-256:
  `f63b20f27a508dafa379a9abfa39b4bc1f2c59ca63a003eb64df68106de32643`
- Asset shard SHA-256:
  `94c43761ed24b4903a1857d285b7a92a60fd4f6f5906c95c587b2a498a2efcb2`

Artifacts:

- `docs/audits/japanese_master_index_v4/image_storage_permanent_plan_v1/jpn_image_storage_permanent_plan_v1.json`
- `docs/audits/japanese_master_index_v4/image_storage_permanent_plan_v1/jpn_image_storage_permanent_plan_v1.md`
- `docs/audits/japanese_master_index_v4/image_storage_permanent_plan_v1/rows/jpn_image_storage_permanent_assets_v1/jpn_image_storage_permanent_assets_v1_0001_of_0001.json.gz`

## Current Truths

- The permanent package is fully planned and fingerprinted.
- The 53 exact local source files all match their frozen evidence.
- The permanent apply runner reconciles the package in plan-only mode.
- Collision preflight is planned but has not been executed.
- No permanent object has been uploaded by this package.
- Storage reads/writes in this gate: 0/0.
- Database reads/writes in this gate: 0/0.
- Image-pointer writes in this gate: 0.
- The prior transient canary still has zero durable objects.

## Invariants

- Source quality is not identity authority.
- Existing Storage objects must never be overwritten.
- Failure rollback may remove only objects created by that execution.
- Storage upload does not authorize a database image pointer.
- Database pointer mutation must remain a later independent approval.
- No child printing, family promotion, scanner publication, pricing, vault,
  English, non-Japanese, cleanup, quarantine, or deletion scope is included.

## Verification

- Plan and apply script syntax checks passed.
- Permanent Storage focused contracts passed 6/6 with immutable values pinned.
- Full Japanese Master Index contract suite passed 173/173.
- Release secret guard passed.
- Plan-only apply-runner reconciliation returned the exact 53-object approval
  fingerprint and plan hash with no Storage or database access.
- `git diff --check` passed.

## Explicit Next Gate

Obtain explicit approval for the exact 53-object permanent Storage upload:

```text
node scripts/audits/japanese_master_index_v4/image_storage_permanent_apply_v1.mjs --apply --fingerprint=23da727efaea32b71e3498f9af7ec12b83bed0e43519c55053d4fe2d27ee3b5e --plan-hash=79d7744de1db13db6f58c441663e6d03c33f277e35d5d3c7c1a5a5364e59cd59
```

Stop before execution unless branch, commit, clean worktree, code bundle,
approval fingerprint, plan hash, and all tests reconcile. Do not combine this
approval with database access or pointer updates.

After a successful upload and 53/53 exact readback, create a permanent Storage
completion checkpoint. Only then prepare a separate database image-pointer
dry-run/readback package.

## Stop State

The permanent 53-object package is approval-ready but has not accessed
Storage or the database. No durable object or database pointer was created by
this gate.
