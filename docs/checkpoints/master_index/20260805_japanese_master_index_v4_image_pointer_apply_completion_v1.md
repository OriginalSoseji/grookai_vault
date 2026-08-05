# Japanese Master Index V4 Image Pointer Apply Completion V1

Date: 2026-08-05

## Context

The founder approved the exact 53-row Japanese V4 image-pointer package after
its successful production rollback proof. The approved mutation was limited to
`image_note`, `image_path`, and `image_status` on the frozen parent rows.

## Applied Boundary

- Package fingerprint:
  `e76ecd6f12ad5c1a1a1f6836d54c34d527e4688f43d5196331aed31da93df912`
- Pointer plan hash:
  `0600e0de392dcf714b5a3450a6f05fd739e6b32092e9e46883c747c56bacf5be`
- Mutation contract hash:
  `5f103aaabda1f04533426e6695b367460c29483e694b5909e233c6529778e6f9`
- Rollback-proof hash:
  `ce3dbf33ba7d1cdb247269a8081ac1f31e0572fdfbf5a1322271baa36bcbe185`
- Apply proof hash:
  `e7392884f42b618000495fbdd181c0eec220e66201cec50bc20f54b1d074dbbb`

## Result

- GitHub workflow run: `31042140815`
- GitHub job: `92428815968`
- Producing commit: `28669b7b6e9eba6cbb1079e14726968eb8b74152`
- Status: `applied_and_durably_verified`
- Storage objects reverified: 53/53
- Rows locked before mutation: 53/53
- Complete before snapshots verified: 53/53
- Rows updated: 53/53
- Complete expected-after snapshots verified before commit: 53/53
- Commit completed: true
- Durable expected-after snapshots verified after commit: 53/53
- Independent HTTPS expected-after readback: 53/53
- Exact self-hosted paths/statuses: 53/53
- Preserved fallback/source/representative fields: 53/53
- Durable database writes: 53 rows, three columns only
- Storage writes: 0

## Artifact Hashes

- Apply JSON SHA-256:
  `94de01acd5ffcc80c5a72a43d3d43c7bcd7dc53db0845467a193a841f316b65d`
- Apply Markdown SHA-256:
  `ac881d14b0e41fd41849e77d41e88148fe9d376da297bbeae0fc6577bb1668ad`
- Independent readback JSON SHA-256:
  `765358ce5b1a47d516ff1f32bdbc2cb30ca4ec230e956842d4ead660fe58834b`

Artifacts:

- `docs/audits/japanese_master_index_v4/image_pointer_apply_v1/jpn_image_pointer_apply_v1.json`
- `docs/audits/japanese_master_index_v4/image_pointer_apply_v1/jpn_image_pointer_apply_v1.md`
- `docs/audits/japanese_master_index_v4/image_pointer_apply_v1/jpn_image_pointer_apply_independent_readback_v1.json`
- GitHub run: `https://github.com/OriginalSoseji/grookai_vault/actions/runs/31042140815`

## Current Truths

- These 53 Japanese V4 parent rows now use exact self-hosted `image_path`
  values and `image_status=exact`.
- Their external `image_url` values remain available as fallbacks.
- Their `image_source=identity` and `representative_image_url` values remain
  unchanged.
- No child-printing, identity, family, pricing, vault, scanner, English, or
  non-Japanese data changed in this gate.
- The one-shot apply workflow has been removed and cannot repeat this apply.

## Invariants

- A self-hosted pointer does not alter canonical identity authority.
- External fallback URLs must remain preserved unless a later independent gate
  proves they can be retired.
- No other Japanese V4 row inherits these paths without exact evidence.
- No public child printing or family promotion is implied by this apply.
- Future image-pointer work must use a new package and approval boundary.

## Verification

- Apply implementation hashes matched the reviewed workflow pins.
- Focused pre-apply safety contracts passed 16/16.
- Full Japanese Master Index suite passed 190/190 before execution.
- Release secret guard passed.
- Apply artifact proof hash verifies.
- Independent HTTPS Data API readback matched all 53 frozen expected-after
  complete-row hashes.
- Post-apply focused evidence contracts passed 18/18.
- Post-apply full Japanese Master Index suite passed 192/192.

## Explicit Next Gate

Run product-facing read-only smoke tests for these 53 parents across search,
set/card detail image resolution, and hosted-first fallback behavior. Confirm
the application reads `image_path` without changing canonical identity,
printing publication, or family state.

Do not expand Storage or pointer writes to the remaining Japanese catalog in
that smoke-test gate.

## Stop State

The exact approved 53-row pointer apply is complete and durably verified. The
one-shot execution path is retired.
