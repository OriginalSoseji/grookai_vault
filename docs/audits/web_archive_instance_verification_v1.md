# Web Archive Instance Verification v1

## Title
Web Archive Instance Verification v1

## Date
2026-03-16

## Objective
Verify that the live web vault decrement/archive seam correctly archives one canonical owned instance after the GVVI add-to-vault cutover, while keeping the temporary legacy bucket mirror in sync.

## Archive Surface Audited
- Exact file: [updateVaultItemQuantity.ts](/c:/grookai_vault/apps/web/src/lib/vault/updateVaultItemQuantity.ts)
- Exact function: `updateVaultItemQuantity(change)`
- Live call chain:
  - [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx)
  - [changeVaultItemQuantityAction.ts](/c:/grookai_vault/apps/web/src/lib/vault/changeVaultItemQuantityAction.ts)
  - [updateVaultItemQuantity.ts](/c:/grookai_vault/apps/web/src/lib/vault/updateVaultItemQuantity.ts)
- Write target before repair:
  - direct `vault_items` read/update only
  - no RPC call
  - no `vault_item_instances` write
- Write target after repair:
  - canonical archive: direct service-role update on `public.vault_item_instances`
  - temporary compatibility mirror: authenticated update on `public.vault_items`
- Reachability: proven live from the web vault UI because [VaultCardTile.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCardTile.tsx) sends decrement/remove actions through `onQuantityChange(item.vault_item_id, "decrement")`, and the vault page still reads bucket rows from [v_vault_items_web](/c:/grookai_vault/supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql).

## Baseline State
Controlled local verification used the exact helper boundary that the live web action calls.

Because the local stack had been reset and no prior owned-instance fixture remained, I rebuilt a deterministic local test fixture through the live add-to-vault seam first:
- two adds through [addCardToVault.ts](/c:/grookai_vault/apps/web/src/lib/vault/addCardToVault.ts)
- one active legacy bucket row
- two active canonical instance rows

Baseline identifiers:

| Field | Value |
| --- | --- |
| user | `7ce2d42b-b4ca-47a1-94e6-70039fe92601` |
| card | `33333333-3333-3333-3333-333333333333` |
| bucket row | `3c3fa4ce-2fea-4355-957d-0252f79c1b56` |
| active instance count before | `2` |
| archived instance count before | `0` |
| bucket qty before | `2` |

## Reproduction Method
1. Re-proved the live web decrement seam from code:
   - vault page renders bucket rows from `v_vault_items_web`
   - decrement action sends `vault_item_id`
   - server action calls `updateVaultItemQuantity`
2. Added structured archive logs inside [updateVaultItemQuantity.ts](/c:/grookai_vault/apps/web/src/lib/vault/updateVaultItemQuantity.ts).
3. Ran one controlled decrement through the exact helper boundary used by the server action:
   - type: `decrement`
   - `userId = 7ce2d42b-b4ca-47a1-94e6-70039fe92601`
   - `itemId = 3c3fa4ce-2fea-4355-957d-0252f79c1b56`
4. Queried `vault_item_instances` and `vault_items` in the same local environment before and after the decrement.

## Observed Logs
Pre-repair logs proved the defect:

| Log | Summary |
| --- | --- |
| `vault.archive.begin` | emitted with `vaultItemId`, but no selected canonical instance followed |
| `[vault:qty]` | bucket decremented from `2` to `1` |
| `vault.archive.selected_instance` | not emitted |
| `vault.archive.instance_failed` | not emitted |

That matched the code path: bucket decrement only, no canonical archive.

Post-repair logs proved the fixed seam:

| Log | Summary |
| --- | --- |
| `vault.archive.begin` | `userId=7ce2d42b-b4ca-47a1-94e6-70039fe92601`, `cardPrintId=33333333-3333-3333-3333-333333333333`, `vaultItemId=3c3fa4ce-2fea-4355-957d-0252f79c1b56` |
| `vault.archive.selected_instance` | selected oldest active instance `c2a76563-55cc-4f5e-8af0-ae15b0efda81` with `gvvi=GVVI-01CDEA2A-000001` |
| `[vault:qty]` | legacy bucket mirror decremented to `1` |
| `vault.archive.instance_failed` | not emitted |
| `vault.archive.bucket_mirror_failed` | not emitted |

## Database Verification
Query 1 used:

```sql
select
  id,
  gv_vi_id,
  user_id,
  card_print_id,
  archived_at,
  created_at
from public.vault_item_instances
where user_id = '7ce2d42b-b4ca-47a1-94e6-70039fe92601'
  and card_print_id = '33333333-3333-3333-3333-333333333333'
order by created_at asc;
```

Result:

| id | gv_vi_id | user_id | card_print_id | archived_at | created_at |
| --- | --- | --- | --- | --- | --- |
| `c2a76563-55cc-4f5e-8af0-ae15b0efda81` | `GVVI-01CDEA2A-000001` | `7ce2d42b-b4ca-47a1-94e6-70039fe92601` | `33333333-3333-3333-3333-333333333333` | `2026-03-16T22:21:29.513+00:00` | `2026-03-16T22:21:29.425558+00:00` |
| `0eeac5bd-8353-4ae4-915e-e333c53bb589` | `GVVI-01CDEA2A-000002` | `7ce2d42b-b4ca-47a1-94e6-70039fe92601` | `33333333-3333-3333-3333-333333333333` | `null` | `2026-03-16T22:21:29.458687+00:00` |

Query 2 used:

```sql
select
  count(*) filter (where archived_at is null) as active_instances,
  count(*) filter (where archived_at is not null) as archived_instances
from public.vault_item_instances
where user_id = '7ce2d42b-b4ca-47a1-94e6-70039fe92601'
  and card_print_id = '33333333-3333-3333-3333-333333333333';
```

Result:

| active_instances | archived_instances |
| --- | --- |
| `1` | `1` |

Query 3 used:

```sql
select
  id,
  user_id,
  card_id,
  qty,
  archived_at,
  created_at
from public.vault_items
where user_id = '7ce2d42b-b4ca-47a1-94e6-70039fe92601'
  and card_id = '33333333-3333-3333-3333-333333333333'
order by created_at asc;
```

Schema/runtime adjustment:
- no adjustment was needed
- the legacy compatibility row is still keyed by `card_id` in `public.vault_items`

Result:

| id | user_id | card_id | qty | archived_at | created_at |
| --- | --- | --- | --- | --- | --- |
| `3c3fa4ce-2fea-4355-957d-0252f79c1b56` | `7ce2d42b-b4ca-47a1-94e6-70039fe92601` | `33333333-3333-3333-3333-333333333333` | `1` | `null` | `2026-03-16T22:21:29.452226+00:00` |

## Result Classification
PASS

## Root Cause (if any)
The initial verification failed before repair because the live web decrement seam was still bucket-only:
- [updateVaultItemQuantity.ts](/c:/grookai_vault/apps/web/src/lib/vault/updateVaultItemQuantity.ts) read `vault_items`
- decremented or archived `vault_items`
- never selected or archived a canonical `vault_item_instances` row

That left the canonical ownership lane stale after decrement:
- active instances stayed at `2`
- bucket qty became `1`

The proven failure bucket was:
- archive write failure

More precisely:
- missing canonical archive write inside the live helper

## Repair Applied (if any)
Minimal repair applied in [updateVaultItemQuantity.ts](/c:/grookai_vault/apps/web/src/lib/vault/updateVaultItemQuantity.ts):
- imported the existing server admin client
- added deterministic canonical instance selection:
  - same `user_id`
  - same `card_print_id`
  - `archived_at is null`
  - ordered by `created_at asc, id asc`
- archived exactly one canonical instance first
- kept the legacy `vault_items` decrement/archive as a temporary mirror
- kept canonical authority:
  - canonical archive failure throws
  - bucket mirror failure only logs

No migration was required.

No read path was changed.

No mobile or scanner flow was changed.

## Conclusion
PASS

The live web decrement/archive seam now behaves correctly for the verified case:
- one active canonical instance was archived
- one active canonical instance remained
- the legacy bucket mirror decremented from `2` to `1`
- no delete occurred
- no duplicate archive occurred
- no wrong-user or wrong-card mutation occurred

The archive seam is now structurally consistent with the instance-first ownership model while the read path still depends on the legacy bucket mirror.

## Next Step
proceed to convert `updateVaultItemQuantity.ts`
