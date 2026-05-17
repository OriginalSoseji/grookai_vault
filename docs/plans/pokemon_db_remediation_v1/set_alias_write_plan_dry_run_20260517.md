# Set Alias Write-Plan Dry Run - 2026-05-17

Status: deterministic write-plan dry run only. This document defines a future write plan shape for the 20 safe-looking alias candidates. It does not authorize Supabase writes, migrations, inserts, updates, deletes, merge operations, alias changes, migration repair, `db pull`, or production mutation.

## Source Inputs

- `docs/plans/pokemon_db_remediation_v1/set_canonicalization_plan.md`
- `docs/plans/pokemon_db_remediation_v1/set_canonicalization_dry_run_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/set_alias_dependency_audit_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/set_alias_dependency_matrix_20260517.json`

## Scope

Only the 20 alias candidates from the dependency audit are in scope. The 5 review stops and 4 hard stops remain excluded.

Excluded hard stops:

- `sv04.5` vs `sv4pt5`
- `pgo` vs `swsh10.5`
- `sv08.5` vs `sv8pt5`
- `sv06.5` vs `sv6pt5`

Excluded review stops:

- `bog` vs `bp`
- `tk-ex-m` vs `tk2b`
- `tk-ex-p` vs `tk2a`
- `tk-ex-latia` vs `tk1a`
- `tk-ex-latio` vs `tk1b`

## Dry-Run Target Matrix

| Canonical target row | Permanent alias row | Future write-plan status |
| --- | --- | --- |
| `sv03.5` | `sv3pt5` | candidate |
| `sv10.5b` | `zsv10pt5` | candidate |
| `swsh3.5` | `swsh35` | candidate |
| `swsh12.5` | `swsh12pt5` | candidate |
| `sm75` | `sm7.5` | candidate |
| `hsp` | `hgssp` | candidate |
| `sv09` | `sv9` | candidate |
| `base6` | `lc` | candidate |
| `me01` | `me1` | candidate |
| `sv03` | `sv3` | candidate |
| `sv04` | `sv4` | candidate |
| `me02` | `me2` | candidate |
| `sv01` | `sv1` | candidate |
| `swsh4.5` | `swsh45` | candidate |
| `sm3.5` | `sm35` | candidate |
| `sv07` | `sv7` | candidate |
| `sv08` | `sv8` | candidate |
| `sv05` | `sv5` | candidate |
| `sv06` | `sv6` | candidate |
| `sv10.5w` | `rsv10pt5` | candidate |

All 20 alias rows had zero `card_prints`, zero alias-side `external_mappings`, zero alias-side `external_printing_mappings`, and no alias-side direct FK ownership in the dependency audit. All 20 still carry useful metadata and route/search risk, so they should be preserved as alias rows or represented by a dedicated alias layer. They should not be deleted.

## Future Canonical Target Row

For each pair, the canonical target row is the row that owns card inventory, external card mappings, and downstream card-print dependencies. The alias row is a metadata and routing surface only.

Future implementation must treat the canonical target as the only row that owns:

- `card_prints`
- `external_mappings`
- `external_printing_mappings` through `card_printings`
- pricing, vault, fingerprint, embedding, provenance, and discovery dependencies that hang from canonical `card_prints`
- source-specific card-level mappings

No card reassignment is expected for these 20 pairs because the alias rows currently own zero cards. If any alias row gains card ownership before implementation, that pair is no longer in this write-plan candidate set.

## Permanent Alias Preservation Layer

The future canonicalization system should be:

```text
canonical physical set
+
permanent alias/source-routing layer
```

It should not be:

```text
delete old rows and pretend aliases never existed
```

The current schema has `public.set_code_classification` with `set_code`, `is_canon`, `canonical_set_code`, `pokemonapi_set_id`, `tcgdex_set_id`, and `tcgdex_asset_code`. That table can be the immediate classification/routing surface, but it is not a complete alias provenance model.

Future write-plan candidate:

1. Keep each alias row in `public.sets`.
2. Ensure each alias code exists in `set_code_classification`.
3. Ensure alias rows are classified as non-canonical with `canonical_set_code` pointing to the canonical target.
4. Preserve source IDs in `pokemonapi_set_id`, `tcgdex_set_id`, and `tcgdex_asset_code` where present.
5. Preserve alias metadata on the alias row for route/search display and source auditability.
6. If a stronger alias model is later approved, add a dedicated alias/provenance table in a separate migration, not in this cleanup pass.

## Metadata Merge Behavior

Metadata merge must be null-only by default.

Allowed future behavior:

- Copy alias metadata into canonical row only when the canonical field is null or empty.
- Preserve the alias row's original value even if copied.
- Record the source of copied metadata in an audit note or future alias/provenance layer.
- Prefer canonical card-owning row metadata when both sides are populated.

Fields requiring preservation review:

- `release_date`
- `printed_total`
- `printed_set_abbrev`
- `logo_url`
- `symbol_url`
- `hero_image_url`
- `hero_image_source`
- `identity_domain_default`
- `identity_model`
- `source`

Manual-review cases:

- Canonical and alias rows both have non-null conflicting values.
- Alias has release date but canonical has null release date.
- Alias has logo/symbol assets but canonical has null assets.
- Alias source JSON contains PokemonTCG or TCGdex identifiers not represented in `set_code_classification`.

## External Mapping Retention

The 20 scoped alias rows do not own card-level external mappings in the dependency audit. Therefore future write planning should not move `external_mappings` or `external_printing_mappings` for these pairs.

Future behavior:

- Keep canonical card-level mappings attached to canonical `card_prints`.
- Do not synthesize card-level mappings for empty alias rows.
- Preserve set-level mapping intent through `set_code_classification` and, where relevant, `justtcg_set_mappings` on the canonical set.
- Add source routing only at the set-code alias layer unless a future source-specific audit proves a need for card-level mapping changes.

## Route And Search Redirect Preservation

Every alias code should remain available as a permanent route/search/source alias.

Future behavior:

- Public routes using alias code should resolve to the canonical set page.
- Search by alias code should search canonical `card_prints`.
- API responses should expose canonical set identity while optionally listing aliases.
- `list_set_codes`-style surfaces should either include aliases as aliases or expose a separate canonical-only mode.
- `search_cards_in_set(q, alias_code)` should resolve through alias classification before filtering.
- Historical URLs should redirect rather than 404.

Route preservation is mandatory for aliases such as:

- `sv3pt5`, `swsh35`, `swsh12pt5`
- `sm7.5`, `hgssp`, `lc`
- `me1`, `me2`
- `sv1`, `sv3`, `sv4`, `sv5`, `sv6`, `sv7`, `sv8`, `sv9`
- `swsh45`, `sm35`
- `zsv10pt5`, `rsv10pt5`

## Future Write Operation Classes

This is a dry-run description only. Do not execute from this document.

1. Capture rollback snapshot:
   - canonical `sets` row
   - alias `sets` row
   - `set_code_classification` rows for both codes
   - `justtcg_set_mappings` rows for both set IDs
   - counts for all FK and set-code surfaces
2. Assert safety gates.
3. Upsert or update alias classification:
   - alias `set_code`
   - `is_canon = false`
   - `canonical_set_code = canonical target`
   - preserve source IDs and notes
4. Optionally fill canonical null metadata from alias row after manual review.
5. Keep alias `sets` row; do not delete it.
6. Rebuild or refresh only approved search/routing surfaces if needed.
7. Run post-write audit queries.

## FK Safety Gates

Each future write-plan candidate must pass all gates immediately before any write:

```sql
-- Alias row must still own zero card_prints.
select s.code, count(cp.id) as card_print_rows
from public.sets s
left join public.card_prints cp on cp.set_id = s.id
where s.code = any(:alias_codes)
group by s.code
having count(cp.id) <> 0;
```

```sql
-- Alias row must still own zero legacy cards rows.
select s.code, count(c.id) as cards_rows
from public.sets s
left join public.cards c on c.set_id = s.id
where s.code = any(:alias_codes)
group by s.code
having count(c.id) <> 0;
```

```sql
-- Alias row must still own zero card-level mappings.
select s.code, count(em.id) as mapping_rows
from public.sets s
join public.card_prints cp on cp.set_id = s.id
join public.external_mappings em on em.card_print_id = cp.id
where s.code = any(:alias_codes)
group by s.code
having count(em.id) <> 0;
```

```sql
-- Alias row must still own zero printing-level mappings.
select s.code, count(epm.id) as printing_mapping_rows
from public.sets s
join public.card_prints cp on cp.set_id = s.id
join public.card_printings cpn on cpn.card_print_id = cp.id
join public.external_printing_mappings epm on epm.card_printing_id = cpn.id
where s.code = any(:alias_codes)
group by s.code
having count(epm.id) <> 0;
```

```sql
-- Alias set row must not own justtcg_set_mappings.
select s.code, count(jsm.id) as justtcg_set_mapping_rows
from public.sets s
left join public.justtcg_set_mappings jsm on jsm.grookai_set_id = s.id
where s.code = any(:alias_codes)
group by s.code
having count(jsm.id) <> 0;
```

Stop if any query returns rows.

Additional safety gates:

- Confirm hard-stop codes are absent from write input.
- Confirm review-stop codes are absent from write input.
- Confirm canonical target row exists.
- Confirm alias row exists.
- Confirm alias and canonical names still normalize to the same set name.
- Confirm no new source mapping conflicts exist.
- Confirm route/search code has alias fallback behavior before hiding aliases from canonical lists.

## Rollback Strategy

Rollback must be possible without data loss because the future plan keeps alias rows and avoids card movement.

Rollback package required before future writes:

- JSON snapshot of affected `sets` rows.
- JSON snapshot of affected `set_code_classification` rows.
- JSON snapshot of affected `justtcg_set_mappings` rows.
- Per-pair dependency count snapshot from `set_alias_dependency_matrix_20260517.json` regenerated immediately before writes.

Rollback operation classes:

1. Restore prior `set_code_classification` rows for affected codes.
2. Revert canonical null-only metadata changes from captured snapshot.
3. Leave card rows untouched.
4. Leave external mappings untouched.
5. Re-run post-rollback dependency audit and master set audit.

Hard rollback stop:

- If any card rows were moved or deleted, this plan was violated and rollback must become an incident response, not a routine revert.

## Post-Write Audit Queries

All future writes must be followed by read-only verification:

```sql
-- All alias codes classify to expected canonical targets.
select set_code, is_canon, canonical_set_code
from public.set_code_classification
where set_code = any(:alias_codes)
order by set_code;
```

```sql
-- Alias rows still exist in public.sets.
select code, name, release_date, printed_total, printed_set_abbrev
from public.sets
where game = 'pokemon'
  and code = any(:alias_codes)
order by code;
```

```sql
-- Alias rows still own no cards.
select s.code, count(cp.id) as card_print_rows
from public.sets s
left join public.card_prints cp on cp.set_id = s.id
where s.code = any(:alias_codes)
group by s.code
order by s.code;
```

```sql
-- Canonical targets still own their cards.
select s.code, count(cp.id) as card_print_rows
from public.sets s
left join public.card_prints cp on cp.set_id = s.id
where s.code = any(:canonical_codes)
group by s.code
order by s.code;
```

```sql
-- No hard-stop or review-stop codes were touched by classification.
select set_code, is_canon, canonical_set_code
from public.set_code_classification
where set_code = any(:excluded_codes)
order by set_code;
```

Also rerun:

```powershell
node scripts/audits/set_alias_dependency_audit_v1.mjs
node scripts/audits/pokemon_master_set_audit_v1.mjs
```

## Dry-Run Conclusion

The 20 scoped pairs are deterministic enough to become a future write-plan candidate, but only if the implementation preserves aliases permanently. The correct cleanup is not deletion. It is canonical set ownership plus permanent alias/source routing, with null-only metadata merge and strict pre/post gates.

No future write should proceed until the route/search alias behavior is explicitly approved.

## No-Write Confirmation

- No Supabase writes.
- No migrations.
- No inserts.
- No updates.
- No deletes.
- No merge operations.
- No alias changes.
- No migration repair.
- No `db pull`.
- No production mutation.
