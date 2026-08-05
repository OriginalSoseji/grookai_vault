# Japanese Master Index V4 Image Pointer Rollback Proof Readiness V1

Date: 2026-08-05

## Context

The approved Japanese V4 permanent Storage gate retained 53 exact image
objects after collision preflight and exact readback. The corresponding 53
parent `card_prints` rows still contain their external fallback URL, legacy
`image_status=ok`, no self-hosted `image_path`, and a stale pre-hosting note.

This gate prepares the smallest database pointer change and proves the package
can be reconciled without making a durable database change.

## Problem

The application cannot consume the retained self-hosted images until the
matching parent rows point to their exact Storage paths. A pointer update must
not overwrite the external fallback, broaden identity authority, or mutate any
column outside the approved image-pointer scope.

## Risk

- A stale row could be updated after unrelated production changes.
- A Storage object could differ from the exact bytes approved previously.
- A broad update could mutate identity, family, pricing, or publication data.
- A rollback proof could accidentally expose a commit path.
- Partial updates could leave the 53-row package inconsistent.

## Decision

Freeze one exact 53-row package with these controls:

- Reverify all 53 Storage objects by size, SHA-256, dimensions, and format.
- Snapshot complete current `card_prints` rows through the HTTPS Data API.
- Change only `image_note`, `image_path`, and `image_status`.
- Preserve `image_url`, `image_source`, `representative_image_url`, and every
  other column.
- Require complete-row compare-and-swap and lock all 53 rows before mutation.
- Execute the proof in one transaction that always rolls back.
- Read all 53 rows after rollback and require exact restoration of the frozen
  before-row hashes.
- Keep the real durable apply outside this gate and subject to separate
  explicit approval.

## Scope

- Parent rows: 53
- Unique card-print IDs: 53
- Storage objects reverified: 53/53
- Rollback-proof updates planned: 53
- Already-applied rows: 0
- Blocked rows: 0
- Allowed columns: `image_note`, `image_path`, `image_status`
- Database writes during planning: 0
- Storage writes during planning: 0

## Frozen Proof Boundary

- Plan artifact content fingerprint:
  `c7b76859e45afccbd57c579db118a3b1349782fc1c0ab9ad897acae66e47121c`
- Package fingerprint:
  `e76ecd6f12ad5c1a1a1f6836d54c34d527e4688f43d5196331aed31da93df912`
- Pointer plan hash:
  `0600e0de392dcf714b5a3450a6f05fd739e6b32092e9e46883c747c56bacf5be`
- Mutation contract hash:
  `5f103aaabda1f04533426e6695b367460c29483e694b5909e233c6529778e6f9`
- Code bundle hash:
  `3fe17f3b06c413246037fc00caff323becd48328d0ed107b1bb002b40f1123c7`
- Row dataset fingerprint:
  `5088488f1b9897a2f860b08ec789d7293da29c187474026f40dc324d5f15a0dc`
- Database snapshot fingerprint:
  `081ddcd21602260453690d094a23f2c58ca6506eb376441ea9c5493cc24c9db3`
- Storage readback fingerprint:
  `a75e347c9e449b8f352c3d246b1d5b569d4696b78c4c529cc52a6fae2b9267c3`

## Artifact Hashes

- Plan JSON SHA-256:
  `f879ec27630d3b070e0d37815925eaca11a555fd0639ddd1aef305e5bca31ec9`
- Plan Markdown SHA-256:
  `6ae5efd74fb23ef512fc6582352a3df6f2278eb11bc965c71d054d8a51827bc0`
- Pointer-row shard SHA-256:
  `54b20c248c9ccd6af34ceb7c4787a6b3be031e9027fa71de2858b8b5ffea97d6`

Artifacts:

- `docs/audits/japanese_master_index_v4/image_pointer_plan_v1/jpn_image_pointer_plan_v1.json`
- `docs/audits/japanese_master_index_v4/image_pointer_plan_v1/jpn_image_pointer_plan_v1.md`
- `docs/audits/japanese_master_index_v4/image_pointer_plan_v1/rows/jpn_image_pointer_plan_rows_v1/jpn_image_pointer_plan_rows_v1_0001_of_0001.json.gz`

## Current Truths

- All 53 retained Storage objects still match their frozen exact evidence.
- All 53 database rows were read through select-only HTTPS access.
- Every row still requires the same exact three-field pointer update.
- The external `image_url` fallback and `image_source=identity` are preserved.
- The rollback runner reconciles the frozen package in plan-only mode with no
  database or Storage access.
- No image pointer has been updated by this gate.

## Invariants

- Storage success does not authorize a database pointer mutation.
- The external fallback URL must remain unchanged.
- Image pointers do not alter canonical identity or family authority.
- Complete-row drift blocks the entire transaction.
- The rollback proof must have no commit path and zero durable changes.
- No child printing, family promotion, scanner publication, pricing, vault,
  English, non-Japanese, cleanup, quarantine, or deletion scope is included.

## Verification

- Three JavaScript syntax checks passed.
- Focused image-pointer contracts passed 6/6 with all immutable plan values
  pinned.
- Full Japanese Master Index contract suite passed 182/182.
- Release secret guard passed.
- Repository shipcheck passed production preflight, global contracts, web
  checks/build, Flutter analysis, and 526 Flutter tests. Seven additional
  Flutter suites failed to load after localhost test-shell connections closed;
  all seven suites then passed serially (37/37 assertions). This was a Windows
  parallel-runner transport failure, not a failed product assertion.
- `git diff --check` passed.
- Plan-only rollback-runner reconciliation returned the exact 53-row package,
  plan, and mutation hashes with no database or Storage access.
- Initial GitHub proof run `31040487637` failed during credential-free TLS
  bootstrap because Node did not trust the Supabase self-signed root. It
  failed before authentication and before `BEGIN`, so no row mutation was
  attempted. The repair manually verifies hostname, certificate dates,
  signatures, and the pinned intermediate/root before an authenticated
  `rejectUnauthorized: true` reconnect. The old package hashes are superseded.

## Explicit Next Gate

Commit and push this frozen implementation and plan, then execute only the
rollback-proof workflow with these exact inputs:

```text
fingerprint=e76ecd6f12ad5c1a1a1f6836d54c34d527e4688f43d5196331aed31da93df912
pointer_plan_hash=0600e0de392dcf714b5a3450a6f05fd739e6b32092e9e46883c747c56bacf5be
mutation_contract_hash=5f103aaabda1f04533426e6695b367460c29483e694b5909e233c6529778e6f9
```

Because GitHub cannot manually dispatch a workflow until the workflow exists
on the default branch, the first proof may run from a same-repository pull
request whose head is exactly `catalog/jpn-v4-production-integration-v2`.
That trigger carries the same three frozen values, rejects forks and unrelated
branches, and does not merge the branch. Manual dispatch remains available
after the workflow exists on the default branch.

The workflow may write inside one transaction only. It must roll back, prove
all 53 before-row hashes are durably restored, and report zero durable writes.
Stop after preserving that proof. A real pointer apply remains a separate
approval gate.

## Stop State

The image-pointer package is ready for rollback-only execution. The 53
self-hosted objects remain durable, while all database image pointers remain
unchanged.
