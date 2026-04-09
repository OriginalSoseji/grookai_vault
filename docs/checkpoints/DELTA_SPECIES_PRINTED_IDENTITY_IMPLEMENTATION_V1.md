# DELTA_SPECIES_PRINTED_IDENTITY_IMPLEMENTATION_V1

## Context

This is the first schema-level identity execution after the duplicate / mixed cleanup work.

Objective delivered in this run:

- add `printed_identity_modifier` to `public.card_prints`
- create the v2 identity unique index
- backfill canonical delta-species rows with explicit printed proof only
- preserve all existing `gv_id` values
- structurally unblock the final `cel25` row

Artifacts created:

- `supabase/migrations/20260408191000__delta_species_printed_identity.sql`
- `backend/identity/delta_species_backfill_worker_v1.mjs`
- this checkpoint

## Migration Details

Applied migration file:

- `20260408191000__delta_species_printed_identity.sql`

Applied DDL:

```sql
alter table public.card_prints
add column if not exists printed_identity_modifier text;
```

```sql
create unique index if not exists uq_card_prints_identity_v2
on public.card_prints (
  set_id,
  number_plain,
  coalesce(printed_identity_modifier, ''),
  coalesce(variant_key, '')
)
where set_id is not null
  and number_plain is not null;
```

Live post-migration verification:

- `printed_identity_modifier` column exists: `1`
- `uq_card_prints_identity_v2` exists: `1`

## Index Strategy

Implemented uniqueness lane:

- `(set_id, number_plain, coalesce(printed_identity_modifier, ''), coalesce(variant_key, ''))`

Important scope:

- the index is partial on rows where both `set_id` and `number_plain` are not null

This matches the intended canonical identity surface and avoids false failures from legacy rows outside the enforceable identity lane.

## Backfill Counts

Worker command results:

- `node --check` passed
- `--dry-run` passed
- `--apply` passed

Live worker outputs:

- `delta_rows_already_set_before = 0`
- `candidate_row_count = 194`
- `rows_updated = 194`
- `delta_rows_after = 194`

Strict proof rules enforced:

- updated only rows where `name like '%δ%'`
- or `lower(name) like '%delta species%'`
- did not infer from set, typing, or external metadata
- did not touch `variant_key`
- did not touch `gv_id`

## Verification Outputs

Post-implementation verification:

- column exists: `1`
- v2 unique index exists: `1`
- rows with `printed_identity_modifier = 'delta_species'`: `194`
- uniqueness violations under enforced v2 scope: `0`
- FK orphan counts:
  - `card_print_identity = 0`
  - `card_print_traits = 0`
  - `card_printings = 0`
  - `external_mappings = 0`
  - `vault_items = 0`

`gv_id` stability:

- checksum before worker apply: `bbcc635636d6a05d67f1be2654740a0c`
- checksum after worker apply: `bbcc635636d6a05d67f1be2654740a0c`
- result: unchanged

## Invariants Preserved

1. Existing `gv_id` values were not mutated.
2. `variant_key` semantics were not changed.
3. Only explicit printed delta-species rows were updated.
4. No FK integrity regressions were introduced.
5. No duplicate canonical rows were created under the enforced v2 identity scope.

## `cel25` Unlock Confirmation

Final `cel25` dependency state after implementation:

- target row `b4a42612-945d-419f-a4f4-c64ae5c26d6b / Gardevoir ex δ / GV-PK-CEL-93CC`
  - `printed_identity_modifier = 'delta_species'`
  - `variant_key = 'cc'`
  - modeled target count = `1`

- unresolved source row `f7c22698-daa3-4412-84ef-436fb1fe130f / Gardevoir ex / 93A`
  - still unresolved count = `1`
  - source modifier remains unset

Meaning:

- the canonical target is now structurally distinct for both:
  - `delta_species`
  - `cc`

This is the model support that was missing before.

## Next Execution Unit

Exact next lawful execution unit:

- `CEL25_DELTA_SPECIES_FINAL_RESOLUTION_V1`

That unit can now resolve the remaining `cel25` source row against a canonical target whose identity is no longer encoded only in freeform name text.

## Result

The delta-species identity model is now live:

- schema extended safely
- v2 identity uniqueness enforced
- canonical delta rows backfilled deterministically
- `gv_id` stable
- final `cel25` row structurally unblocked
