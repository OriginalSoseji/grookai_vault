# Production Migration History Recovery 20260824-26 V1

## Status

`COMPLETE - PRODUCTION HISTORY RECONCILED IN GIT`

Eight migrations already applied to production but absent from Git are now
restored on the default branch. Production was read only; no migration was
re-applied and no ledger, schema, data, Storage, pricing, or Vault state was
changed by this recovery.

## Context

The repository migration chain ended at `20260823074000`, while the production
ledger ended at `20260826070000`. Creating a new catalog-foundation migration
on that incomplete chain would have made clean-environment replay diverge from
production and violated the requirement for a clean migration history.

## Problem And Risk

The following production-applied versions were missing from Git:

1. `20260824021500_tcgcsv_source_artifact_lookup_performance_v1`
2. `20260824033000_tcgplayer_market_snapshot_paging_v1`
3. `20260824043000_operations_notification_severity_v2`
4. `20260824170000_print_identity_search_candidate_first_v1`
5. `20260824173000_catalog_parent_visibility_direct_v1`
6. `20260824174500_print_identity_search_bounded_candidates_v1`
7. `20260826053000_retire_mee_public_pricing_compatibility_v1`
8. `20260826070000_card_prints_gv_id_trgm_performance_v1`

Omitting them would make new environments miss active indexes, function
definitions, ACLs, an operations constraint, and the retired pricing boundary.
Rewriting history from live definitions alone would lose statement-level
provenance. Reapplying them to production could damage already-correct state.

## Decision

Use `supabase_migrations.schema_migrations` as the statement authority and the
live production schema as semantic readback. Recover only the exact eight
versions. Record statement hashes, recovered-file hashes, byte counts, live
definitions, validity, ACLs, comments, and the latest ledger version.

Production access was restricted to repeatable-read, read-only queries. The
recovery never invoked the migration runner.

## Normalization Exception

The second statement in `20260824021500` stored psql-escaped comment delimiters
instead of replayable SQL string syntax. Only those delimiters were normalized
to a valid SQL literal. The raw ledger hashes remain preserved, and the live
index definition and comment prove the intended semantic result.

All other recovered statements retain ledger authority without semantic
changes.

## Alternatives Rejected

- Skip the gap and add a new migration: rejected because replay history would
  remain incomplete.
- Mark the versions repaired without restoring SQL: rejected because a fresh
  environment still could not reproduce production.
- Rewrite the historical search function while recovering it: rejected
  because historical files must describe what production actually applied.
- Reapply the eight migrations: rejected because production already contains
  the versions and objects.
- Reset or edit the production ledger: prohibited.

## Implementation

- Governing contract:
  `docs/contracts/PRODUCTION_MIGRATION_HISTORY_RECOVERY_20260824_26_V1.md`
- Recovery audit:
  `docs/audits/catalog_discovery/production_migration_history_recovery_20260824_26_v1/`
- Contract test:
  `tests/contracts/production_migration_history_recovery_20260824_26_v1.test.mjs`
- Pull request:
  `https://github.com/OriginalSoseji/grookai_vault/pull/281`
- Merge commit:
  `7a20056cb08730692ac345ae3dd1df04870234b7`

## Production Readback

- Latest production migration: `20260826070000`.
- Recovered ledger rows: `8`.
- Relevant indexes valid and ready: `4/4`.
- Operations severity constraint: validated.
- Operations function execute ACL: `postgres`, `service_role` only.
- Final print-identity search definition: bounded-candidates V1.
- Parent visibility definition: direct V1.
- Retired pricing compatibility view: `security_invoker=true`, zero-row by
  contract, readable only by `service_role`.
- Production writes during recovery: `0`.

## Permanent Artifact Hashes

- `production_ledger_manifest.json`:
  `8f9b3d01a259219a9986e0483eba2010c05e98034cb049d159573f57629da861`
- `production_schema_readback.json`:
  `8d4d876c8da1be922529078710c4f72a2e41a252a5cbcc74376c877a33a911ba`

The audit's `artifact_hashes.json` binds both files. The manifest additionally
binds each recovered migration by SHA-256 and byte count.

## Validation

- Recovery contract: `8/8` passed.
- Affected search, pricing, warehouse, operations, ACL, and boundary suites:
  `107/107` passed.
- Release secret-packaging guard: passed.
- Production drift audit: `0` critical failures.
- Production deferred-debt checks remained explicit:
  - card prints missing GV-ID: `62`;
  - historical source/card mapping duplicate groups: `5`;
  - canonical card prints missing active identity: `2,466`.
- Pull-request CodeQL: passed.
- Contracts drift gates: passed.
- Contracts runtime protection: passed.
- Legacy-key scan: passed.
- Vercel preview: passed.
- Final Codex review: no major issues.

The full local contract suite reported `2,408` passing and `29` failing tests.
The failures are pre-existing pinned-artifact drift in Japanese image
adjudication, MEE review/backfill artifacts, and One Piece DON/sealed/canary
fixtures. None references the recovered migrations or changed in the focused
affected suites. This recovery does not relabel those failures as passing.

## Review Finding And Forward Repair

Automated review found a real existing defect in the recovered final search
function: hidden catalogs can consume the bounded `name_seed` before
request-role visibility is applied, underfilling an anonymous result page.

The historical migration was intentionally not rewritten. Issue
`https://github.com/OriginalSoseji/grookai_vault/issues/282` requires a new
forward-only migration that applies visibility before the bound while
preserving the function signature, result shape, ACLs, and release policy.

## Migration And Apply Status

- New migration applied by this project: none.
- Existing production ledger rows changed: none.
- Existing production schema or data changed: none.
- Storage, images, AI, pricing publication, and Vault access: none.
- Provider cost: `$0.00`.

## Current Truths

1. Git and production now share migration history through `20260826070000`.
2. The eight recovered files are permanent replay inputs, not pending applies.
3. Production schema and security readback match the recovered chain's final
   state.
4. The psql-comment normalization is narrow, documented, and hash-audited.
5. The bounded search visibility defect exists in production and is governed
   by issue `#282`.
6. Yu-Gi-Oh and Gundam production game foundations are still absent.
7. Canonical reconciliation issue `#277` remains open.

## Invariants

1. Never reapply these eight versions to production.
2. Never rewrite their production ledger rows.
3. Never edit recovered history to hide a later-discovered defect.
4. Fix live behavior only through a new forward migration.
5. Keep statement hashes and live semantic readback together.
6. Keep concurrent index migrations outside explicit transaction wrappers.
7. Preserve the retired pricing view's zero-row, service-only boundary.
8. Preserve the final search and visibility function ACLs unless a separately
   governed security change authorizes otherwise.

## What Must Never Be Broken

- A clean environment must replay the same migration sequence as production.
- Migration recovery must never become permission to mutate production.
- Historical SQL must remain traceable to the ledger.
- The known search defect must not be silently accepted or patched inside old
  history.
- New catalog foundations must not be layered on top of an unresolved search
  boundary defect.

## Explicit Next Gate

Implement issue `#282` as one bounded forward-only search migration. Add a
regression with enough hidden and visible same-name rows to prove hidden rows
cannot consume the anonymous candidate bound. Verify anonymous,
authenticated, and service-role behavior plus unchanged RPC shape and ACLs.

After that repair is reviewed, applied, and read back, define the separate
Yu-Gi-Oh/Gundam game-foundation gate: exactly two deterministic game rows and
two hidden release-control rows, stopping before cards, sets, printings,
mappings, images, pricing, publication, or Vault writes.
