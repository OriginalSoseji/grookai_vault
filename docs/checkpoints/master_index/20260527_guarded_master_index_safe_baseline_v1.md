# Guarded Master Index Safe Baseline V1

Generated: 2026-05-27

## Purpose

This checkpoint records the first promoted English Master Index rebuild protected by an explicit non-regression guard.

The Master Index must improve or stay stable before generated reports are promoted over the last trusted baseline.

## Safety

```text
audit_only: true
db_writes_performed: false
migrations_created: false
cleanup_performed: false
quarantine_performed: false
```

## Guard Rule

Future Master Index rebuilds must use the guarded staging path before promotion:

```powershell
node scripts\audits\english_master_index_guarded_rebuild_v1.mjs --min-master-verified-printings 37834 --min-master-verified-cards 21553 --max-conflicts 0 --promote
```

The direct builder may still be used for dry-run or staging diagnostics, but final report replacement must be guarded.

## Promoted Baseline

| metric | value |
| --- | ---: |
| master_verified_printings | 37857 |
| master_verified_cards | 21556 |
| conflicts | 0 |
| evidence_rows | 230863 |
| candidate_printings | 116 |
| human_source_verified_printings | 896 |
| publishable_complete_sets | 72 |
| remaining_gap_facts | 2658 |
| write_ready_now | 0 |

## Important Fixes

- Cached PokemonTCG snapshot set configs may enrich canonical aliases, but cannot append missing sets or replace the canonical set universe.
- Cached PokemonTCG evidence remains additive through canonical alias remapping.
- Double Holo evidence is retained, but only exact bracketed finish labels are eligible for `finish_presence`.
- Unbracketed or contextual marketplace rows must remain manual-review evidence until a stricter source rule proves they are exact printing facts.

## Non-Regression Invariant

```text
Generated evidence may expand review context, but it must not reduce promoted master_verified card or printing counts.
```

```text
PokemonTCG live evidence may add rows, but live availability or cached set aliases must not delete, rename, or hide canonical snapshot evidence.
```

## Verification

Commands run after promotion:

```powershell
node --check scripts\audits\verified_master_set_index_v1_build_english_master_index.mjs
node --check scripts\audits\english_master_index_guarded_rebuild_v1.mjs
node --check scripts\audits\english_master_index_doubleholo_finish_acquisition_v1.mjs
node --test tests\contracts\contract_scope_v1.test.mjs
git diff --check
npm run preflight
git status --short -- supabase\migrations
```

Result:

```text
checks_passed: true
preflight: PASS_WITH_DEFERRED_DEBT
supabase_migrations_changed: false
```

## Next Work

Continue source-gap reduction against the remaining largest blockers:

- FireRed & LeafGreen
- Shining Fates
- Emerald
- Deoxys
- Team Rocket Returns
- Supreme Victors

All future source lanes must be audit-only and must pass the guarded rebuild before promotion.
