# Japanese Master Index V4 Image Pointer Apply Readiness V1

Date: 2026-08-05

## Context

The Japanese V4 identity payload is applied, 53 exact image objects are
durable in production Storage, and the exact 53-row image-pointer package has
passed a production rollback proof with zero durable changes.

The founder explicitly approved the durable apply using the exact package,
plan, and mutation-contract hashes below.

## Approved Boundary

- Package fingerprint:
  `e76ecd6f12ad5c1a1a1f6836d54c34d527e4688f43d5196331aed31da93df912`
- Pointer plan hash:
  `0600e0de392dcf714b5a3450a6f05fd739e6b32092e9e46883c747c56bacf5be`
- Mutation contract hash:
  `5f103aaabda1f04533426e6695b367460c29483e694b5909e233c6529778e6f9`
- Required rollback-proof hash:
  `ce3dbf33ba7d1cdb247269a8081ac1f31e0572fdfbf5a1322271baa36bcbe185`
- Apply DB connector SHA-256:
  `5af461261264dd78d55b8bcc66dee0decab71fe71964e86530fde907d7bb4c69`
- Apply runner SHA-256:
  `5e5dac562334057e81611c12807de3534ea423cfb3e5ecb769cb38a275569d32`

## Exact Scope

- Target: `public.card_prints`
- Rows: exactly 53 frozen parent rows
- Allowed columns:
  - `image_note`
  - `image_path`
  - `image_status`
- Preserved columns include:
  - `image_url`
  - `image_source`
  - `representative_image_url`
  - every non-image column
- Storage writes: 0
- New Storage objects: 0
- Child printing writes: 0
- Family, pricing, vault, scanner, English, and non-Japanese writes: 0

## Execution Contract

1. Reconcile the exact frozen plan and successful rollback proof locally.
2. Reverify all 53 Storage objects before database authentication.
3. Establish a manually pinned, hostname-verified TLS connection.
4. Begin one transaction and set bounded lock and statement timeouts.
5. Lock all 53 rows before the first update.
6. Require all 53 complete before-row hashes to match.
7. Validate the exact three-column set for every row.
8. Apply all 53 updates with complete-row compare-and-swap.
9. Verify all 53 complete expected-after hashes inside the transaction.
10. Commit once.
11. Read all 53 rows again and require durable expected-after hashes.
12. Write the result artifact only after durable verification.

Any failure before commit rolls back the transaction. A stale or previously
applied row fails the complete-row preflight before the first update.

## Verification

- Apply scripts pass Node syntax checks.
- Apply runner reconciles all approved hashes in plan-only mode with zero
  database or Storage access.
- Focused image-pointer safety contracts passed 16/16.
- Full Japanese Master Index contract suite passed 190/190.
- Release secret guard passed.
- Git-index script SHA-256 values match the one-shot workflow pins.

## Execution Mechanism

The temporary workflow
`.github/workflows/japanese-v4-image-pointer-approved-apply.yml` runs only for
a same-repository pull request whose head branch is exactly
`catalog/jpn-v4-production-integration-v2`. It has no push or schedule trigger
and verifies both apply script hashes before execution.

After the first successful result is downloaded, the temporary trigger must be
removed before any evidence-only follow-up commit. No second apply run is
authorized.

## Stop State

The exact 53-row durable apply is approved and ready, but it has not yet run.
The current database rows still match the frozen before snapshots.
