# Japanese Master Index V4 Image Pointer Rollback Proof Completion V1

Date: 2026-08-05

## Context

The 53 Japanese V4 exact image objects are durable in production Storage. A
separate no-write pointer plan froze complete before/after snapshots for the
matching 53 parent `card_prints` rows and allowed only `image_note`,
`image_path`, and `image_status` to change.

## Problem

Before a real pointer apply can be considered, the exact package needed to
prove complete-row compare-and-swap, all-row locking, expected-after readback,
transaction rollback, and durable restoration against production.

## Decision

Run the exact 53-row package once in GitHub Actions using a credential-free,
manually pinned TLS bootstrap followed by an authenticated verified reconnect.
The proof runner has no commit path and must always roll back.

## Result

- Workflow run: `31040921659`
- Workflow job: `92424765495`
- Producing commit: `cf287c0544a238d91218e390540bf9dbf1c52582`
- Pull request: `#181` (draft; not merged)
- Status: `rollback_proof_passed_zero_durable_changes`
- Storage objects reverified: 53/53
- Rows locked before mutation: 53/53
- Rows updated inside transaction: 53/53
- Expected-after rows verified inside transaction: 53/53
- Rollback completed: true
- Frozen before rows restored durably: 53/53
- Durable database writes: 0
- Durable image-pointer writes: 0
- Storage writes: 0

The earlier run `31040487637` failed during certificate bootstrap before
authentication and before `BEGIN`. It attempted no row mutation. The transport
repair superseded that package and the successful run used the hashes below.

## Frozen Proof Boundary

- Package fingerprint:
  `e76ecd6f12ad5c1a1a1f6836d54c34d527e4688f43d5196331aed31da93df912`
- Pointer plan hash:
  `0600e0de392dcf714b5a3450a6f05fd739e6b32092e9e46883c747c56bacf5be`
- Mutation contract hash:
  `5f103aaabda1f04533426e6695b367460c29483e694b5909e233c6529778e6f9`
- Code bundle hash:
  `3fe17f3b06c413246037fc00caff323becd48328d0ed107b1bb002b40f1123c7`
- Pointer-row dataset fingerprint:
  `5088488f1b9897a2f860b08ec789d7293da29c187474026f40dc324d5f15a0dc`
- Proof hash:
  `ce3dbf33ba7d1cdb247269a8081ac1f31e0572fdfbf5a1322271baa36bcbe185`

## Artifact Hashes

- Proof JSON SHA-256:
  `eba2194f093ac11d9578b14973a5de1d492a5184d3b16066c7ad785952b66826`
- Proof Markdown SHA-256:
  `c79f069f0a8c58e8cf3818d6f3991f8bae0e89dd8925adb8924535e0416c3e42`

Artifacts:

- `docs/audits/japanese_master_index_v4/image_pointer_rollback_proof_v1/jpn_image_pointer_rollback_proof_v1.json`
- `docs/audits/japanese_master_index_v4/image_pointer_rollback_proof_v1/jpn_image_pointer_rollback_proof_v1.md`
- GitHub run: `https://github.com/OriginalSoseji/grookai_vault/actions/runs/31040921659`

## Current Truths

- The 53 exact self-hosted image objects remain present and verified.
- The 53 database rows still match their frozen before snapshots.
- No database image pointer has been durably changed.
- The exact three-column update is transaction-safe under complete-row CAS.
- The external `image_url`, `image_source=identity`,
  `representative_image_url`, and all non-image columns remain preserved by
  the proposed after snapshots.

## Invariants

- A passing rollback proof is not authority for a real apply.
- Any row drift after this proof must block a later apply.
- All 53 Storage objects must be reverified before a real transaction begins.
- A real apply may change only `image_note`, `image_path`, and `image_status`.
- The external fallback URL must remain unchanged.
- No child printing, family promotion, scanner publication, pricing, vault,
  English, non-Japanese, cleanup, quarantine, or deletion scope is included.

## Verification

- Focused pointer/TLS contracts passed 8/8 before execution.
- Full Japanese Master Index contract suite passed 183/183.
- Release secret guard passed.
- GitHub Actions run `31040921659` and its artifact both report success.
- The permanent proof artifact reconciles all package and mutation hashes.

## Explicit Next Gate

Prepare and review a real-apply runner that consumes this exact package,
reverifies all 53 Storage objects, locks all 53 rows before mutation, requires
complete-row compare-and-swap, writes only the three allowed columns in one
transaction, commits only after 53/53 expected-after readback, and performs a
second durable readback after commit.

Do not execute that runner without separate explicit approval naming these
exact values:

```text
fingerprint=e76ecd6f12ad5c1a1a1f6836d54c34d527e4688f43d5196331aed31da93df912
pointer_plan_hash=0600e0de392dcf714b5a3450a6f05fd739e6b32092e9e46883c747c56bacf5be
mutation_contract_hash=5f103aaabda1f04533426e6695b367460c29483e694b5909e233c6529778e6f9
```

## Stop State

The rollback proof is complete and durable state is unchanged. The next gate
is a separately approved real database image-pointer apply and readback.
