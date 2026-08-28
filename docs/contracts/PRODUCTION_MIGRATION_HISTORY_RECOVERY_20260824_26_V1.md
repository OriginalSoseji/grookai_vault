# Production Migration History Recovery 20260824-26 V1

## Objective

Restore the eight production-applied migration files missing from Git without
reapplying or changing production. The production migration ledger is the
source of the recovered SQL and the live schema is the semantic readback.

## Exact Scope

- `20260824021500_tcgcsv_source_artifact_lookup_performance_v1.sql`
- `20260824033000_tcgplayer_market_snapshot_paging_v1.sql`
- `20260824043000_operations_notification_severity_v2.sql`
- `20260824170000_print_identity_search_candidate_first_v1.sql`
- `20260824173000_catalog_parent_visibility_direct_v1.sql`
- `20260824174500_print_identity_search_bounded_candidates_v1.sql`
- `20260826053000_retire_mee_public_pricing_compatibility_v1.sql`
- `20260826070000_card_prints_gv_id_trgm_performance_v1.sql`

No other migration version belongs to this repair.

## Evidence Authority

The rows were read from `supabase_migrations.schema_migrations` inside a
repeatable-read, read-only production transaction. The recovery manifest
records each version, migration name, statement count, raw ledger-statement
SHA-256, recovered path, recovered file SHA-256, and byte count.

The live readback records the resulting index definitions and validity, final
function-definition hashes and ACLs, constraint definition and validation,
view-definition hash and ACL, comments, and latest migration version.

## Normalization Exception

The ledger's second `20260824021500` statement stores psql-escaped comment
delimiters (`\ ... \;`) rather than replayable SQL string syntax. The recovered
file replaces only those delimiters with a valid SQL string literal. The live
index definition and live comment text prove the intended result. Both raw
ledger statement hashes and the normalized recovered-file hash remain in the
manifest.

All other recovered SQL is emitted from the ledger statements without semantic
changes. Whitespace needed to join multiple ledger statements into one file is
not evidence drift.

## Invariants

1. These versions are already applied and must never be re-applied to
   production.
2. No ledger row may be inserted, updated, deleted, or rewritten by recovery.
3. No production schema or data may change during recovery.
4. The recovered files must recreate the observed production objects on a
   clean migration replay.
5. Concurrent-index migrations must remain outside explicit transaction
   wrappers.
6. The final `search_print_identity_v1` definition is the bounded-candidates
   version from `20260824174500`; the earlier candidate-first migration remains
   in history because replay order is authoritative.
7. The retired pricing compatibility view must remain zero-row and readable
   only by `service_role`.
8. Recovery evidence must contain no database credentials.

## Boundaries

- production database reads only;
- zero migration apply;
- zero migration-ledger writes;
- zero schema or data mutation;
- zero Storage, image, AI, pricing publication, or Vault writes;
- no new migration may be added until this historical chain is merged.

## Known Forward Repair

Automated review confirmed that the live bounded search definition limits its
`name_seed` before request-role catalog visibility is applied. Hidden catalog
rows can therefore consume the bound and underfill an anonymous result page.
This is an existing production behavior, not recovery drift.

The recovered historical migration must remain byte- and statement-traceable
to the production ledger. It must not be rewritten to conceal this defect.
Issue `#282` governs a new forward-only migration that moves visibility ahead
of the candidate limit while preserving the function signature, result shape,
ACLs, and fail-closed release policy.

## Stop Condition

Stop after the eight files, recovery evidence, tests, reviewed PR, and
permanent checkpoint are merged. Then complete issue `#282` as a separate
forward-only migration before rebasing the bounded Yu-Gi-Oh/Gundam
game-foundation gate on the repaired migration chain.
