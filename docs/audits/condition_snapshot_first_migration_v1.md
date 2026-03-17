# GROOKAI VAULT — FIRST CONDITION SNAPSHOT MIGRATION V1

## 1. TITLE

GROOKAI VAULT — FIRST CONDITION SNAPSHOT MIGRATION V1  
Status: ACTIVE  
Scope: Execute first **Category A deterministic migration** for condition snapshots under CONDITION_RECONCILIATION_PLAYBOOK_V1

## 2. OBJECTIVE

Apply reconciliation playbook rules to the **first safe condition snapshot set**:

```text
vault_item_id → GVVI (only when provably 1:1)
```

Goal:

```text
prove condition reconciliation can be executed safely
without ambiguity, loss, or corruption
```

## 3. TARGET SELECTION

Selection rule:

```text
✔ 1 vault_item_id
✔ 1 active GVVI
✔ 1 condition_snapshot
✔ no multi-instance history
✔ no ambiguity
```

Repo-truth adjustment required:
- `vault_item_instances` does not have `vault_item_id`
- the historical bucket linkage column is `legacy_vault_item_id`
- deterministic matching therefore had to use `legacy_vault_item_id` first, then `card_print_id` / `vault_items.card_id` as the fallback identity bridge

## 4. IDENTIFY SAFE DATASET

Adjusted deterministic candidate query used for this repo:

```sql
with deterministic_candidates as (
  select
    cs.id as snapshot_id,
    cs.vault_item_id,
    min(vii.gv_vi_id) as gv_vi_id
  from public.condition_snapshots cs
  join public.vault_items vi
    on vi.id = cs.vault_item_id
  join public.vault_item_instances vii
    on vii.user_id = cs.user_id
   and vii.archived_at is null
   and vii.gv_vi_id is not null
   and (
     vii.legacy_vault_item_id = cs.vault_item_id
     or vii.card_print_id = coalesce(cs.card_print_id, vi.card_id)
   )
  group by cs.id, cs.vault_item_id
  having count(*) = 1
)
select snapshot_id, vault_item_id, gv_vi_id
from deterministic_candidates;
```

Local rebuilt result:

| snapshot_id | vault_item_id | gv_vi_id |
| --- | --- | --- |
| none | none | none |

Observed local state after `supabase db reset --local`:
- `condition_snapshots` row count: `0`
- active `vault_item_instances` row count: `0`
- deterministic candidate count: `0`

Result:

```text
no local deterministic candidates existed at replay time
```

## 5. PRE-MIGRATION VALIDATION

Intended validation rule:

```sql
select
  cs.id,
  cs.vault_item_id,
  vii.gv_vi_id
from public.condition_snapshots cs
join public.vault_items vi
  on vi.id = cs.vault_item_id
join public.vault_item_instances vii
  on vii.user_id = cs.user_id
 and vii.archived_at is null
 and (
   vii.legacy_vault_item_id = cs.vault_item_id
   or vii.card_print_id = coalesce(cs.card_print_id, vi.card_id)
 );
```

Validation outcome:

```text
no rows to validate in the rebuilt local dataset
```

Because the candidate set was empty, no ambiguous rows were admitted and no unsafe mapping was attempted.

## 6. MIGRATION EXECUTION

Created forward-only migration:
- [20260316120000_condition_snapshots_add_gv_vi_id_v1.sql](/c:/grookai_vault/supabase/migrations/20260316120000_condition_snapshots_add_gv_vi_id_v1.sql)

What the migration does:
1. adds nullable `condition_snapshots.gv_vi_id`
2. adds FK `condition_snapshots.gv_vi_id -> vault_item_instances.gv_vi_id`
3. adds index `condition_snapshots_gv_vi_id_idx`
4. executes deterministic backfill only
5. preserves `vault_item_id`

Immutability handling:
- `condition_snapshots` has a trigger that blocks all updates
- the migration temporarily disables `trg_condition_snapshots_block_update`
- performs the deterministic backfill update
- re-enables the trigger in the same transaction

Backfill execution result on local rebuild:

```text
0 rows updated
```

Reason:

```text
no eligible condition_snapshots rows existed locally
```

## 7. VERIFICATION

### Replay proof

Command:

```text
supabase db reset --local
```

Result:

```text
PASS
```

The new migration replayed successfully from zero.

### Schema proof

Post-reset query:

```sql
select gv_vi_id
from public.condition_snapshots
limit 1;
```

Result:

```text
query succeeded, proving the new column exists
```

### Completeness

Adjusted completeness query:

```sql
with deterministic_candidates as (
  select
    cs.id as snapshot_id
  from public.condition_snapshots cs
  join public.vault_items vi
    on vi.id = cs.vault_item_id
  join public.vault_item_instances vii
    on vii.user_id = cs.user_id
   and vii.archived_at is null
   and vii.gv_vi_id is not null
   and (
     vii.legacy_vault_item_id = cs.vault_item_id
     or vii.card_print_id = coalesce(cs.card_print_id, vi.card_id)
   )
  where cs.gv_vi_id is null
  group by cs.id
  having count(*) = 1
)
select count(*)
from deterministic_candidates;
```

Result:

```text
0
```

Interpretation:
- there were no unresolved deterministic rows
- this was because there were no deterministic rows at all in the rebuilt local dataset

### Correctness

```sql
select
  cs.id,
  cs.gv_vi_id,
  vii.card_print_id
from public.condition_snapshots cs
join public.vault_item_instances vii
  on cs.gv_vi_id = vii.gv_vi_id
where vii.archived_at is null;
```

Result:

```text
0 rows
```

### Duplication Check

```sql
select gv_vi_id, count(*)
from public.condition_snapshots
where gv_vi_id is not null
group by gv_vi_id
having count(*) > 1;
```

Result:

```text
0 rows
```

## 8. RESULT CLASSIFICATION

```text
PASS WITH FOLLOW-UP
```

Reason:
- the forward-only schema migration was executed safely
- deterministic backfill logic was applied
- no ambiguity was introduced
- historical `vault_item_id` context was preserved
- the rebuilt local dataset contained no condition snapshots, so no row-level GVVI mapping was actually applied yet

## 9. OUTPUT

Files created:
- [20260316120000_condition_snapshots_add_gv_vi_id_v1.sql](/c:/grookai_vault/supabase/migrations/20260316120000_condition_snapshots_add_gv_vi_id_v1.sql)
- [condition_snapshot_first_migration_v1.md](/c:/grookai_vault/docs/audits/condition_snapshot_first_migration_v1.md)

## 10. HARD RULES

- DO NOT touch ambiguous rows
- DO NOT map multi-instance buckets
- DO NOT assign randomly
- DO NOT delete historical references
- DO NOT remove `vault_item_id`
- DO NOT duplicate snapshots

## 11. WHY THIS WORKS

This uses deterministic mapping only:
- the migration updates only rows with exactly one proven active GVVI match
- all ambiguous rows are excluded by construction
- historical context remains intact on `vault_item_id`

## 12. NEXT STEP

```text
leave ambiguous snapshots untouched
→ design user-assisted resolution flow
```

Follow-up required before the first real row-level condition mapping can be claimed complete:
- run the same deterministic candidate query against an environment that actually contains `condition_snapshots`
- only then validate the first non-zero deterministic reconciliation batch
