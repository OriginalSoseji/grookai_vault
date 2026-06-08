# Split Guarded Staging Workflow Checkpoint V1

Generated: 2026-05-29

## Purpose

The full English Master Index rebuild is too heavy for the normal one-process guarded command path.

This checkpoint records the safer workflow:

```text
build staging -> inspect staging -> guarded promote from --staging-dir -> regenerate downstream reports
```

The guard remains the only promotion authority, but the expensive build no longer has to run inside the guard process.

## Safety

```text
audit_only: true
db_writes_performed: false
migrations_created: false
cleanup_performed: false
quarantine_performed: false
```

## New Default Workflow

Build a staging directory first:

```powershell
node scripts\audits\english_master_index_build_guarded_staging_v1.mjs --label <short-source-label>
```

Then review the generated manifest:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1_guarded_staging/last_guarded_staging_manifest_v1.json
```

Promote only with the `recommended_guard_command` from that manifest.

## Guard Invariant

The promotion guard now supports an evidence-row floor:

```text
--min-evidence-rows
```

This prevents a build from passing solely because final truth counts look stable while a live source silently drops evidence.

## Current Promoted Baseline

| metric | value |
| --- | ---: |
| master_verified_printings | 38399 |
| master_verified_cards | 21547 |
| candidate_printings | 34 |
| conflicts | 0 |
| evidence_rows | 232100 |
| complete_master_index_sets | 99 |
| publishable_complete_sets | 99 |
| write_ready_now | 0 |

## Source Preservation Added

- PriceCharting base-product fixture generation now preserves previously accepted `pricecharting_csv_base_product` rows before adding new exact rows.
- Bulbapedia set-list evidence now has a preservation fixture generated from the last promoted Master Index so live Bulbapedia volatility cannot erase previously accepted evidence.

## Non-Regression Rule

```text
Live evidence may add rows, but live source availability must not delete, hide, or reduce previously promoted evidence.
```

## Verification

Commands run:

```powershell
node --check scripts\audits\english_master_index_build_guarded_staging_v1.mjs
node --check scripts\audits\english_master_index_guarded_rebuild_v1.mjs
node --check scripts\audits\english_master_index_pricecharting_base_product_acquisition_v1.mjs
node --check scripts\audits\english_master_index_preserve_source_from_index_v1.mjs
node --test tests\contracts\contract_scope_v1.test.mjs
git diff --check
npm run preflight
git status --short -- supabase\migrations
```

Result:

```text
preflight: PASS_WITH_DEFERRED_DEBT
critical_fail_checks: 0
supabase_migrations_changed: false
```
