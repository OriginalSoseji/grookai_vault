# Web Import Vault Items Cutover v1

## Title
Web Import Vault Items Cutover v1

## Date
2026-03-16

## Objective
Cut over the live web bulk import seam from legacy bucket-first ownership writes in `vault_items` to canonical instance-first ownership writes in `vault_item_instances`, while keeping `vault_items` as a temporary compatibility mirror.

## Import Surface Audited
- Exact file: [importVaultItems.ts](/c:/grookai_vault/apps/web/src/lib/import/importVaultItems.ts)
- Exact functions:
  - `importVaultItems(rows)`
  - `importVaultItemsForUser({ client, adminClient, userId, rows })`
- Proven live caller:
  - [ImportClient.tsx](/c:/grookai_vault/apps/web/src/app/vault/import/ImportClient.tsx)
  - `handleImport()` calls `importVaultItems(preview.rows)`
- Input shape:
  - `rows: MatchResult[]`
  - matched rows contain `row.quantity`, `match.card_id`, `match.gv_id`, and descriptive card metadata
- Quantity representation:
  - normalized import quantities are aggregated by `gvId`
  - `desiredQuantity` is compared against the current active bucket qty
  - `quantityToImport` is the positive delta to create
- Proven live status: yes

## Pre-Fix Behavior
Before this cutover, ownership writes in [importVaultItems.ts](/c:/grookai_vault/apps/web/src/lib/import/importVaultItems.ts) were bucket-authoritative:
- existing ownership was read from `public.vault_items`
- matched rows were aggregated by `gvId`
- if an active bucket already existed, the file called RPC `vault_inc_qty(item_id, inc)`
- if no active bucket existed, the file inserted a new `vault_items` row with `qty`
- canonical `vault_item_instances` was not written at all

Identity usage before cutover:
- canonical matched card identity was carried as `match.card_id`
- reconciliation and write routing used `gv_id` to group rows
- ownership truth remained `vault_items.qty`

## Canonical Cutover Applied
Canonical ownership is now instance-first for the web import seam:
- every reconciled import row is expanded into `quantityToImport` owned objects
- for each unit, the seam calls `public.admin_vault_instance_create_v1(...)`
- canonical create uses the existing server admin client
- canonical create runs before any legacy bucket mirror write

Exact canonical create payload used:
- `p_user_id`
- `p_card_print_id`
- `p_acquisition_cost`
- `p_condition_label`
- `p_notes`
- `p_name`
- `p_set_name`
- `p_created_at`

Structured logs added around the seam:
- `vault.import.begin`
- `vault.import.item`
- `vault.import.instance_create_failed`
- `vault.import.bucket_mirror_failed`

The live wrapper `importVaultItems(rows)` still:
- authenticates the web user through `createServerComponentClient()`
- calls the instance-first helper
- revalidates `/vault`, `/wall`, and `/founder`

## Temporary Bucket Mirror Behavior
The legacy bucket write remains only as a compatibility mirror:
- after canonical instance creation succeeds for an import row, the seam mirrors the same `quantityToImport` into `public.vault_items`
- if an active bucket already exists, the seam mirrors via `vault_inc_qty`
- if no active bucket exists, the seam inserts a new bucket row with `qty = quantityToImport`
- if the insert hits an active-row conflict, the seam resolves the row and mirrors with `vault_inc_qty`

Important behavior:
- canonical instance creation is authoritative
- mirror failure is logged but does not roll back canonical rows
- the import return contract remains unchanged

## Verification Method
Verification used the same repo code path in a controlled local Supabase environment:

1. Seeded local catalog fixtures:
   - `card_print_id = 33333333-3333-3333-3333-333333333333`
   - `card_print_id = 55555555-5555-5555-5555-555555555555`
2. Created a local authenticated test user:
   - `user_id = c39d11b0-ca3f-4397-aa28-0456bf77785b`
3. Called the exact import seam helper boundary:
   - `importVaultItemsForUser({ client, adminClient, userId, rows })`
4. Imported:
   - card 1 with quantity `2`
   - card 2 with quantity `1`
5. Queried both `vault_item_instances` and `vault_items` for that same user

Verification runtime logs showed:
- `vault.import.begin`
- one `vault.import.item` log per matched import line
- no `vault.import.instance_create_failed`
- no `vault.import.bucket_mirror_failed`

## Database Verification
Query 1 used:

```sql
select
  user_id,
  card_print_id,
  count(*) filter (where archived_at is null) as active_instances
from public.vault_item_instances
where user_id = 'c39d11b0-ca3f-4397-aa28-0456bf77785b'
  and card_print_id in (
    '33333333-3333-3333-3333-333333333333',
    '55555555-5555-5555-5555-555555555555'
  )
group by user_id, card_print_id
order by card_print_id;
```

Result:

| user_id | card_print_id | active_instances |
| --- | --- | --- |
| `c39d11b0-ca3f-4397-aa28-0456bf77785b` | `33333333-3333-3333-3333-333333333333` | `2` |
| `c39d11b0-ca3f-4397-aa28-0456bf77785b` | `55555555-5555-5555-5555-555555555555` | `1` |

Query 2 used:

```sql
select
  user_id,
  card_id,
  qty,
  archived_at
from public.vault_items
where user_id = 'c39d11b0-ca3f-4397-aa28-0456bf77785b'
  and card_id in (
    '33333333-3333-3333-3333-333333333333',
    '55555555-5555-5555-5555-555555555555'
  )
order by card_id;
```

Result:

| user_id | card_id | qty | archived_at |
| --- | --- | --- | --- |
| `c39d11b0-ca3f-4397-aa28-0456bf77785b` | `33333333-3333-3333-3333-333333333333` | `2` | `null` |
| `c39d11b0-ca3f-4397-aa28-0456bf77785b` | `55555555-5555-5555-5555-555555555555` | `1` | `null` |

Verification summary:

| Imported card | Canonical active instances | Mirrored bucket qty |
| --- | --- | --- |
| `33333333-3333-3333-3333-333333333333` | `2` | `2` |
| `55555555-5555-5555-5555-555555555555` | `1` | `1` |

## Result
PASS

## Follow-Up Notes
- Import reconciliation still reads existing quantities from `public.vault_items` for compatibility. That is acceptable for this write-path phase because read-path cutover is not part of this task.
- The new exported helper `importVaultItemsForUser(...)` exists to isolate the canonical write seam from Next request-only concerns and make the import write boundary directly verifiable.
- No migration was required.
- No read path, mobile path, scanner path, or import UX was changed.

## Next Step
Cut over [vault_card_service.dart](/c:/grookai_vault/lib/services/vault/vault_card_service.dart) to instance-first ownership writes with temporary legacy bucket mirroring.
