# GROOKAI VAULT — FIRST SAFE RECONCILIATION MIGRATION V1

## 1. TITLE

GROOKAI VAULT — FIRST SAFE RECONCILIATION MIGRATION V1  
Status: ACTIVE  
Scope: Execute the first deterministic, low-risk migration from `vault_item_id` to GVVI under the reconciliation playbook

## 2. OBJECTIVE

Apply the **Reconciliation Playbook V1** to one **safe, deterministic consumer** to prove:

```text
playbook → real migration → no corruption → no ambiguity
```

This follows best practice of phased migration:

- validate small subset first
- avoid high-risk transformations
- preserve original data integrity before scaling ([Datafold][1])

## 3. TARGET SELECTION CRITERIA

Selected target conditions:

```text
✔ 1:1 mapping (vault_item_id → GVVI)
✔ no ambiguity
✔ not user-visible critical
✔ not scan/media/fingerprint system
✔ no historical multi-quantity collapse
```

## 4. SELECTED TARGET (CONFIRM FROM INVENTORY)

Consumer: web shared-card toggle action for deterministic single-instance vault rows  
File/Object:
- [apps/web/src/lib/sharedCards/toggleSharedCardAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/toggleSharedCardAction.ts)
- [apps/web/src/app/vault/page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx)
- [apps/web/src/components/vault/VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx)
- [apps/web/src/lib/vault/getSingleActiveGvviByCardPrintIds.ts](/c:/grookai_vault/apps/web/src/lib/vault/getSingleActiveGvviByCardPrintIds.ts)

Why safe:
- the migrated seam is not ownership-critical
- it does not touch scans, media, fingerprints, or provenance
- the migration is scoped only to rows where one active bucket row corresponds to exactly one active instance
- `vault_item_id` is preserved as the historical fallback

Proof of 1:1 mapping:
- selected active sample rows for user `d8711861-05fa-480c-a252-be6677753aab`
- card `33333333-3333-3333-3333-333333333333` had one active bucket row and one active instance
- card `55555555-5555-5555-5555-555555555555` had one active bucket row and one active instance

## 5. PRE-MIGRATION AUDIT

### Query 1 — bucket rows

```sql
select id, user_id, card_id, qty, archived_at
from vault_items
where user_id = 'd8711861-05fa-480c-a252-be6677753aab'
  and card_id in (
    '33333333-3333-3333-3333-333333333333',
    '55555555-5555-5555-5555-555555555555'
  )
  and archived_at is null;
```

Result:

| vault_item_id | user_id | card_id | qty | archived_at |
| --- | --- | --- | ---: | --- |
| `3c0ae0e0-f1f2-41c9-b326-5c3b4dcd8845` | `d8711861-05fa-480c-a252-be6677753aab` | `33333333-3333-3333-3333-333333333333` | 1 | `null` |
| `3bc57c54-0e14-4661-b7db-afa9e2009c4e` | `d8711861-05fa-480c-a252-be6677753aab` | `55555555-5555-5555-5555-555555555555` | 1 | `null` |

### Query 2 — instance rows

```sql
select id, gv_vi_id, user_id, card_print_id, archived_at
from vault_item_instances
where user_id = 'd8711861-05fa-480c-a252-be6677753aab'
  and card_print_id in (
    '33333333-3333-3333-3333-333333333333',
    '55555555-5555-5555-5555-555555555555'
  )
  and archived_at is null;
```

Result:

| instance_id | gv_vi_id | user_id | card_print_id | archived_at |
| --- | --- | --- | --- | --- |
| `3cb39beb-6017-42a6-adad-0bb0070d038a` | `GVVI-80FA44D5-000004` | `d8711861-05fa-480c-a252-be6677753aab` | `33333333-3333-3333-3333-333333333333` | `null` |
| `4b602244-970c-4297-a4b9-7238f99f99e4` | `GVVI-80FA44D5-000005` | `d8711861-05fa-480c-a252-be6677753aab` | `55555555-5555-5555-5555-555555555555` | `null` |

Requirement result:

```text
each selected vault_item row maps to exactly one instance
```

The selected target met the safety requirement.

## 6. MIGRATION STRATEGY

Applied strategy:

```text
Strategy 2 — Deterministic Migration
```

### Step 1 — Add GVVI reference (non-destructive)

No schema migration was required.

Non-destructive runtime extension applied:
- `VaultCardData` now carries nullable `gv_vi_id`
- vault page normalization now derives `gv_vi_id` only for cards with exactly one active instance
- share toggle action input now accepts `gvViId` while preserving `itemId`

### Step 2 — Populate GVVI mapping

Implemented in the web runtime seam:
- [getSingleActiveGvviByCardPrintIds.ts](/c:/grookai_vault/apps/web/src/lib/vault/getSingleActiveGvviByCardPrintIds.ts) derives `card_print_id -> gv_vi_id` only when the active instance count is exactly `1`
- [page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx) attaches that nullable `gv_vi_id` to the rendered vault row model
- [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx) passes `gvViId` into the share-toggle action
- [toggleSharedCardAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/toggleSharedCardAction.ts) now prefers `gv_vi_id` resolution through `vault_item_instances`, then falls back to `vault_item_id` only when no deterministic GVVI is available

### Step 3 — Preserve original reference

`vault_item_id` was not removed.

It remains:

```text
historical anchor + compatibility fallback
```

## 7. VERIFICATION

### Query 1 — mapping completeness

Targeted deterministic sample summary:

| vault_item_id | card_id | active_instance_count | gvvi_ids | deterministic |
| --- | --- | ---: | --- | --- |
| `3c0ae0e0-f1f2-41c9-b326-5c3b4dcd8845` | `33333333-3333-3333-3333-333333333333` | 1 | `GVVI-80FA44D5-000004` | true |
| `3bc57c54-0e14-4661-b7db-afa9e2009c4e` | `55555555-5555-5555-5555-555555555555` | 1 | `GVVI-80FA44D5-000005` | true |

Result:

```text
0 selected deterministic rows lacked a GVVI mapping
```

### Query 2 — mapping correctness

For the selected sample:

```text
vault_item_id 3c0ae0e0-f1f2-41c9-b326-5c3b4dcd8845 → GVVI-80FA44D5-000004
vault_item_id 3bc57c54-0e14-4661-b7db-afa9e2009c4e → GVVI-80FA44D5-000005
```

No mismatch was found between:
- `user_id`
- `card_id / card_print_id`
- active instance uniqueness

### Query 3 — no duplication

For the selected deterministic sample:

```text
no duplicated gv_vi_id mapping was produced
```

Additional verification:
- `npm run typecheck` in `apps/web` passed

## 8. RESULT CLASSIFICATION

```text
PASS WITH FOLLOW-UP
```

Reason:
- the deterministic single-instance share-toggle seam was migrated successfully
- no ambiguity was introduced
- `vault_item_id` was preserved
- full browser-click verification of the share toggle was not executed in this shell session

## 9. OUTPUT

Applied files:
- [apps/web/src/lib/vault/getSingleActiveGvviByCardPrintIds.ts](/c:/grookai_vault/apps/web/src/lib/vault/getSingleActiveGvviByCardPrintIds.ts)
- [apps/web/src/app/vault/page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx)
- [apps/web/src/components/vault/VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx)
- [apps/web/src/components/vault/VaultCardTile.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCardTile.tsx)
- [apps/web/src/lib/sharedCards/toggleSharedCardAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/toggleSharedCardAction.ts)

## 10. HARD RULES

- do not migrate ambiguous systems
- do not touch scans/media/fingerprint
- do not remove `vault_item_id`
- do not collapse multiple objects into one
- do not assign data without proof

## 11. NEXT STEP

After this scoped success:

```text
repeat with next safe Category B consumer
```

The next candidate should stay within deterministic single-instance seams before any Category C reconciliation work begins.

[1]: https://www.datafold.com/data-quality-guide/data-quality-during-data-migrations?utm_source=chatgpt.com "Data quality during data migrations"
