# Migration Rebuild Verification v1

## Title
Migration Rebuild Verification v1

## Date
2026-03-16

## Objective
Prove that the current Grookai Vault migration ledger still rebuilds successfully from zero after the vault-instance migration work and related preflight updates, and verify that the critical ownership artifacts required for the first web add-to-vault cutover seam still exist after replay.

## Preflight Result
Status: `PASS`

Command run first:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\drift_guard.ps1
```

High-level result:

- DriftGuard passed
- Local and linked migration histories appeared consistent
- No pending or error state was reported

High-level output summary:

| Check | Result |
| --- | --- |
| Local migration ledger read | Passed |
| Linked migration ledger read | Passed |
| Drift status | No pending/error detected |
| Rebuild prerequisite | `supabase db reset --local` still required |

## Reset Command Result
Status: `PASS`

Command run:

```powershell
supabase db reset --local
```

Result:

- Reset completed successfully
- Full ledger replay reached the latest migration
- No failing migration was encountered

Terminal summary:

| Item | Result |
| --- | --- |
| Resetting local database | Succeeded |
| Recreating database | Succeeded |
| Applying migrations | Succeeded |
| Final migration applied | `20260316110000_create_admin_vault_instance_create_v1.sql` |
| Seed warning | `WARN: no files matched pattern: supabase/seed.sql` |
| Reset completion | `Finished supabase db reset on branch main.` |

## Rebuild Outcome
The migration ledger rebuilt successfully from zero.

The rebuilt local database contains the expected ownership migration artifacts and still preserves the legacy compatibility table required by the temporary bucket mirror.

One follow-up gap was found:

- the owner-code helper present after replay is `public.generate_owner_code_v1`
- the requested verification query expected `public.generate_vault_owner_code_v1`

This does not block the first web add-to-vault cutover seam because that seam depends on:

- `public.admin_vault_instance_create_v1`
- `public.vault_item_instances`
- `public.vault_items`

All three exist after replay.

## Post-Rebuild Evidence
### Ownership tables

| Query | Result |
| --- | --- |
| `select to_regclass('public.vault_owners') as vault_owners_table;` | `vault_owners` |
| `select to_regclass('public.vault_item_instances') as vault_item_instances_table;` | `vault_item_instances` |

### Function existence query

Query run:

```sql
select
  n.nspname as schema_name,
  p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'generate_vault_owner_code_v1',
    'ensure_vault_owner_v1',
    'admin_vault_instance_create_v1'
  )
order by p.proname;
```

Result:

| schema_name | function_name |
| --- | --- |
| `public` | `admin_vault_instance_create_v1` |
| `public` | `ensure_vault_owner_v1` |

Follow-up confirmation query run:

```sql
select
  n.nspname as schema_name,
  p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('generate_owner_code_v1', 'generate_vault_owner_code_v1')
order by p.proname;
```

Result:

| schema_name | function_name |
| --- | --- |
| `public` | `generate_owner_code_v1` |

### Key column existence

Query run:

```sql
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('vault_owners', 'vault_item_instances')
  and column_name in (
    'owner_code',
    'next_instance_index',
    'gv_vi_id',
    'card_print_id',
    'slab_cert_id',
    'legacy_vault_item_id',
    'archived_at'
  )
order by table_name, column_name;
```

Result:

| table_name | column_name |
| --- | --- |
| `vault_item_instances` | `archived_at` |
| `vault_item_instances` | `card_print_id` |
| `vault_item_instances` | `gv_vi_id` |
| `vault_item_instances` | `legacy_vault_item_id` |
| `vault_item_instances` | `slab_cert_id` |
| `vault_owners` | `next_instance_index` |
| `vault_owners` | `owner_code` |

## Ownership Migration Artifact Verification
Verified post-rebuild ownership artifacts:

| Artifact | Verification |
| --- | --- |
| `public.vault_owners` | Present |
| `public.vault_item_instances` | Present |
| `public.ensure_vault_owner_v1` | Present |
| `public.admin_vault_instance_create_v1` | Present |
| `vault_owners.owner_code` | Present |
| `vault_owners.next_instance_index` | Present |
| `vault_item_instances.gv_vi_id` | Present |
| `vault_item_instances.card_print_id` | Present |
| `vault_item_instances.slab_cert_id` | Present |
| `vault_item_instances.legacy_vault_item_id` | Present |
| `vault_item_instances.archived_at` | Present |

Additional helper check:

| Helper | Verification |
| --- | --- |
| `public.generate_owner_code_v1` | Present |
| `public.generate_vault_owner_code_v1` | Not present |

Sample helper output:

| Query | Result |
| --- | --- |
| `select public.generate_owner_code_v1() as owner_code_sample;` | `622AC927` |

## Legacy Compatibility Verification
Legacy compatibility query results:

| Query | Result |
| --- | --- |
| `select to_regclass('public.vault_items') as vault_items_table;` | `vault_items` |

Legacy bucket columns verified:

| table_name | column_name |
| --- | --- |
| `vault_items` | `archived_at` |
| `vault_items` | `card_id` |
| `vault_items` | `id` |
| `vault_items` | `qty` |
| `vault_items` | `user_id` |

Compatibility conclusion:

- the legacy bucket mirror target still exists after replay
- the current web add-to-vault cutover seam still has a valid compatibility target in `public.vault_items`

## Constraint Verification
Query run:

```sql
select conname, pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'vault_item_instances'
order by conname;
```

Relevant rebuilt constraints:

| conname | definition |
| --- | --- |
| `vault_item_instances_gv_vi_id_key` | `UNIQUE (gv_vi_id)` |
| `vault_item_instances_identity_anchor_exactly_one` | `CHECK (((((card_print_id IS NOT NULL))::integer + ((slab_cert_id IS NOT NULL))::integer) = 1))` |
| `vault_item_instances_legacy_vault_item_id_fkey` | `FOREIGN KEY (legacy_vault_item_id) REFERENCES vault_items(id)` |
| `vault_item_instances_card_print_id_fkey` | `FOREIGN KEY (card_print_id) REFERENCES card_prints(id)` |
| `vault_item_instances_slab_cert_id_fkey` | `FOREIGN KEY (slab_cert_id) REFERENCES slab_certs(id)` |
| `vault_item_instances_user_id_fkey` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` |

Constraint conclusion:

- the rebuilt schema still enforces the intended exactly-one-anchor rule on `vault_item_instances`
- the raw/slab exclusivity contract survived replay intact

## Conclusion
`PASS WITH FOLLOW-UP` — rebuild succeeded and ownership artifacts verified.

Reason for follow-up:

- the replayed schema contains `public.generate_owner_code_v1`
- the verification contract expected `public.generate_vault_owner_code_v1`

This is a naming gap, not a rebuild failure.

The database is structurally compatible with the first web add-to-vault cutover seam because:

- `public.admin_vault_instance_create_v1` exists
- `public.vault_item_instances` exists
- `public.vault_items` still exists for temporary mirroring

## Next Action
continue runtime verification of web add-to-vault seam
