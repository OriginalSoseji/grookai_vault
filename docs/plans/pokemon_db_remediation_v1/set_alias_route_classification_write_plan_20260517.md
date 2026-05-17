# Set Alias Route Classification Write Plan - 2026-05-17

Status: no-write write-plan design only. This plan does not authorize Supabase writes, migrations, inserts, updates, deletes, transaction writes, alias row deletion, card movement, metadata merge, external mapping changes, or production mutation.

## Purpose

This is a route-classification write plan for exactly two alias route fixes in `public.set_code_classification`. It is not set canonicalization execution. It does not merge set rows, move cards, copy metadata, or change external mappings.

The future implementation intent is only:

- route `sv3pt5` to canonical set code `sv03.5`
- route `sm35` to canonical set code `sm3.5`

The alias rows in `public.sets` must remain available as permanent route/search/source aliases.

## Source Evidence

- `docs/plans/pokemon_db_remediation_v1/set_alias_prewrite_evidence_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/set_alias_prewrite_evidence_matrix_20260517.json`
- `docs/plans/pokemon_db_remediation_v1/set_alias_dependency_audit_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/set_alias_dependency_matrix_20260517.json`
- `docs/plans/pokemon_db_remediation_v1/set_alias_write_plan_dry_run_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/set_alias_write_plan_matrix_20260517.json`

The prewrite evidence pack found:

| Evidence | Result |
| --- | --- |
| Alias pairs audited | 20 |
| Blockers | 0 |
| Alias rows owning zero cards | 20/20 |
| Alias rows with no hidden non-card FK dependencies | 20/20 |
| Canonical rows owning real `card_prints` | 20/20 |
| Route classification review items | 2 |

The two route review items were:

- `sv3pt5` currently has a classification row but points to itself instead of `sv03.5`.
- `sm35` has no classification row and should route to `sm3.5`.

## Target Changes

Exactly two future route-classification changes are in scope:

| Alias set code | Future canonical route | Future operation class |
| --- | --- | --- |
| `sv3pt5` | `sv03.5` | update existing classification row |
| `sm35` | `sm3.5` | insert classification row after absence gate |

For `sv3pt5`, the current evidence row is:

```text
set_code = sv3pt5
is_canon = true
canonical_set_code = sv3pt5
canon_source = pokemonapi
notes = Canonical SV pt5 expansion; promoted after identity audit
```

The future target shape is:

```text
set_code = sv3pt5
is_canon = false
canonical_set_code = sv03.5
canon_source = alias
```

For `sm35`, the current evidence row is absent. The future target shape is:

```text
set_code = sm35
is_canon = false
canonical_set_code = sm3.5
canon_source = alias
```

`set_code_classification.set_code` is currently the primary key, so a later implementation may use `on conflict (set_code)` only after verifying that constraint still exists. This plan prefers a guarded insert for `sm35` because the current approved evidence says the row is absent.

## Non-Goals

- No card movement.
- No set deletion.
- No alias row deletion.
- No metadata copy.
- No external mapping movement.
- No missing-card backfill.
- No variant changes.
- No pricing changes.
- No scanner changes.
- No vault changes.
- No hard-stop or review-stop groups.
- No changes to the other 18 alias candidates.

## Scope Lock

Only these codes may appear in a future route-classification write input:

- `sv3pt5`
- `sm35`

Only these canonical targets may be written:

- `sv03.5`
- `sm3.5`

Excluded hard stops remain out of scope:

- `sv04.5` / `sv4pt5`
- `pgo` / `swsh10.5`
- `sv08.5` / `sv8pt5`
- `sv06.5` / `sv6pt5`

Excluded review stops remain out of scope:

- `bog` / `bp`
- `tk-ex-m` / `tk2b`
- `tk-ex-p` / `tk2a`
- `tk-ex-latia` / `tk1a`
- `tk-ex-latio` / `tk1b`

## Preflight Gates

Future execution must stop unless all gates pass immediately before any writable transaction:

1. Migration ledger is aligned.
2. Write scope is exactly `sv3pt5` and `sm35`.
3. Hard-stop and review-stop codes are absent from write scope.
4. Alias rows still exist in `public.sets`.
5. Target canonical rows still exist in `public.sets`.
6. `sv3pt5` and `sm35` alias rows still own zero `card_prints`.
7. `sv3pt5` and `sm35` alias rows still own zero legacy `cards` rows if the table exists.
8. `sv3pt5` and `sm35` alias rows still own zero external mappings.
9. `sv3pt5` and `sm35` alias rows still own zero external printing mappings.
10. `sv3pt5` and `sm35` alias rows still have no hidden non-card FK dependencies.
11. `sv03.5` and `sm3.5` canonical rows still own `card_prints`.
12. `set_code_classification` still has the required columns: `set_code`, `is_canon`, `canon_source`, `notes`, `pokemonapi_set_id`, `tcgdex_set_id`, `canonical_set_code`, and `tcgdex_asset_code`.
13. `set_code_classification.set_code` is still the primary key.
14. Current `sv3pt5` classification still points to itself.
15. Current `sm35` classification row is still absent.
16. Latest prewrite evidence script still reports zero blockers for these two aliases.

## Future Write Shape

The companion SQL file is:

- `docs/plans/pokemon_db_remediation_v1/set_alias_route_classification_write_plan_20260517.sql`

It contains:

- read-only audit section
- commented future writable transaction section
- rollback shape
- post-write verification queries

The future write section is intentionally commented so it cannot run accidentally. Do not execute it without separate explicit approval.

## Route And Search Impact

The route/search outcome should be:

- requests for `sv3pt5` resolve to canonical set `sv03.5`
- requests for `sm35` resolve to canonical set `sm3.5`
- alias set rows remain present for historical/source recognition
- canonical card inventory remains under `sv03.5` and `sm3.5`
- search surfaces can resolve through `set_code_classification` instead of deleting alias rows

This is route preservation, not destructive cleanup.

## Rollback Plan

Rollback should be transaction-first:

1. Run all future write statements inside one transaction.
2. Run post-write verification before commit.
3. Use `rollback` instead of `commit` if any verification fails.

That transaction rollback restores the prior `sv3pt5` classification and removes the uncommitted `sm35` insert without any `delete` statement.

If a future approved transaction is committed and later must be reverted:

- restore `sv3pt5` to the captured previous classification values
- treat exact removal of a committed `sm35` row as a separate rollback approval, because this plan intentionally includes no `delete`
- if deletion is not authorized, disable the incorrect route by a separately approved classification update and document the residual row
- verify no `sets`, `card_prints`, `external_mappings`, `external_printing_mappings`, or `justtcg_set_mappings` rows changed

Previous `sv3pt5` values to capture before execution:

```text
is_canon = true
canonical_set_code = sv3pt5
canon_source = pokemonapi
pokemonapi_set_id = null
tcgdex_set_id = null
tcgdex_asset_code = null
notes = Canonical SV pt5 expansion; promoted after identity audit
```

Previous `sm35` state to capture before execution:

```text
classification row absent
```

## Post-Write Verification

Future execution must verify:

- `sv3pt5` routes to `sv03.5`
- `sm35` routes to `sm3.5`
- canonical `card_prints` counts remain unchanged
- alias rows still own zero cards
- external mapping counts remain unchanged
- external printing mapping counts remain unchanged
- alias `sets` rows still exist
- no hard-stop or review-stop code was touched
- `node scripts/audits/set_alias_prewrite_evidence_v1.mjs` can be rerun cleanly
- `node scripts/audits/pokemon_master_set_audit_v1.mjs` can be rerun after the route fix

## No-Write Confirmation

- No Supabase writes.
- No migrations.
- No inserts.
- No updates.
- No deletes.
- No transaction writes.
- No alias row deletion.
- No card movement.
- No metadata merge.
- No external mapping changes.
- No production mutation.
