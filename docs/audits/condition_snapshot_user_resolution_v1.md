# GROOKAI VAULT — USER-ASSISTED CONDITION RESOLUTION V1

## 1. OBJECTIVE

Design **user-assisted mapping** for ambiguous condition snapshots:

```text
condition_snapshots.vault_item_id → gv_vi_id (user-selected)
```

No auto-mapping. No guesses.

## 2. TRIGGER CONDITION

Only show resolver when:

```sql
gv_vi_id IS NULL
AND vault_item_id IS NOT NULL
```

And the snapshot has more than one valid candidate GVVI for the same ownership context.

## 3. DATA REQUIRED

For a given snapshot:

- `snapshot_id`
- `vault_item_id`
- candidate GVVIs

Repo-truth candidate query:

```sql
select gv_vi_id, card_print_id
from vault_item_instances
where legacy_vault_item_id = <vault_item_id>
  and archived_at is null;
```

Fallback candidate query when legacy linkage is absent but card context is known:

```sql
select vii.gv_vi_id, vii.card_print_id
from condition_snapshots cs
join vault_items vi
  on vi.id = cs.vault_item_id
join vault_item_instances vii
  on vii.user_id = cs.user_id
 and vii.archived_at is null
 and vii.card_print_id = coalesce(cs.card_print_id, vi.card_id)
where cs.id = <snapshot_id>;
```

## 4. UI CONTRACT (MINIMAL)

Component:

```text
Assign this scan to a card
```

Display:

- list of candidate cards
- image
- basic identity info
- GVVI label
- “Leave unassigned” option

Action:

```text
Select GVVI → confirm
```

Resolver rules:

- no preselected winner
- no hidden automatic assignment
- if the user cancels, snapshot remains unresolved

## 5. SERVER ACTION

Proposed RPC contract:

```sql
create or replace function public.assign_condition_snapshot_gvvi_v1(
  p_snapshot_id uuid,
  p_gv_vi_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- validate snapshot exists
  -- validate snapshot.gv_vi_id is null
  -- validate chosen GVVI belongs to the same user
  -- validate chosen GVVI matches snapshot card context
  -- assign gv_vi_id only
end;
$$;
```

Hard repo-truth note:

```text
condition_snapshots is currently append-only
```

Current schema has `trg_condition_snapshots_block_update`, so implementation must use a **controlled assignment lane** that allows only:

```text
gv_vi_id: NULL → NON-NULL
```

and nothing else.

Rules:

- only updates `gv_vi_id`
- no change to `vault_item_id`
- no overwrite after assignment
- all validations run before assignment

## 6. VALIDATION RULES

Before update:

- snapshot exists
- `gv_vi_id IS NULL`
- snapshot has `vault_item_id IS NOT NULL`
- chosen GVVI exists
- chosen GVVI belongs to the same user
- chosen GVVI matches the snapshot card context

Card-context validation must use repo truth:

- `condition_snapshots.card_print_id` if present
- otherwise `vault_items.card_id` for the referenced `vault_item_id`

Reject otherwise.

## 7. VERIFICATION

After assignment:

```sql
select id, gv_vi_id
from condition_snapshots
where id = <snapshot_id>;
```

Must show:

```text
gv_vi_id NOT NULL
```

And validation query:

```sql
select
  cs.id,
  cs.vault_item_id,
  cs.gv_vi_id,
  vii.card_print_id
from condition_snapshots cs
join vault_item_instances vii
  on cs.gv_vi_id = vii.gv_vi_id
where cs.id = <snapshot_id>;
```

Must show:

```text
exactly one matching GVVI
```

## 8. RESULT

Classification:

```text
PASS
```

This design preserves ambiguity until a user makes an explicit choice and does not invent object-level precision.

## 9. HARD RULES

- no automatic assignment
- no overwrite once assigned
- no deletion of original reference
- audit trail must remain
- no assignment that bypasses card-context validation
- no guessed GVVI resolution

## 10. NEXT STEP

```text
apply to first real ambiguous dataset when present
```

Then:

```text
implement the controlled gv_vi_id-only assignment lane
```

## FINAL SUMMARY

- ambiguous snapshots become resolvable without guessing
- historical `vault_item_id` context remains preserved
- GVVI is introduced only through explicit user choice
- the system is ready for real ambiguous condition data once the controlled assignment implementation is built
