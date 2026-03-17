# GROOKAI VAULT — SECOND SAFE RECONCILIATION MIGRATION V1

## 1. TITLE

GROOKAI VAULT — SECOND SAFE RECONCILIATION MIGRATION V1  
Status: ACTIVE  
Scope: Execute the second deterministic migration under RECONCILIATION_PLAYBOOK_V1 using a proven-safe 1:1 consumer

## 2. OBJECTIVE

Repeat the proven pattern from the first migration:

```text
vault_item_id → GVVI (only when deterministic)
```

Goal:

```text
prove repeatability of reconciliation rules
without touching ambiguous systems
```

## 3. TARGET SELECTION

Selected target:

```text
Category B — MIGRATE LATER TO GVVI
```

Chosen consumer:
- web shared-card public note action

Selection constraints satisfied:
- single-instance only (`active_instances = 1`)
- deterministic mapping
- not scans / fingerprints / media
- not user-critical
- minimal blast radius

## 4. CONFIRM TARGET

Consumer: web shared-card public note action for deterministic single-instance vault rows  
File/Object:
- [saveSharedCardPublicNoteAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/saveSharedCardPublicNoteAction.ts)
- [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx)
- supporting deterministic source already in place:
  - [page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx)
  - [getSingleActiveGvviByCardPrintIds.ts](/c:/grookai_vault/apps/web/src/lib/vault/getSingleActiveGvviByCardPrintIds.ts)

Surface:
- web runtime

Why deterministic:
- the seam updates public note text only
- it does not touch scans, fingerprints, media storage, or provenance
- `gv_vi_id` is only available to the vault UI when [getSingleActiveGvviByCardPrintIds.ts](/c:/grookai_vault/apps/web/src/lib/vault/getSingleActiveGvviByCardPrintIds.ts) proves exactly one active instance for the same `user_id + card_print_id`
- `vault_item_id` remains preserved as the fallback historical anchor

Proof of 1:1 mapping:
- selected sample rows for user `d8711861-05fa-480c-a252-be6677753aab`
- card `33333333-3333-3333-3333-333333333333` had one active bucket row and one active instance
- card `55555555-5555-5555-5555-555555555555` had one active bucket row and one active instance

## 5. PRE-MIGRATION VALIDATION

### Bucket

```sql
select id, user_id, card_id
from vault_items
where user_id = 'd8711861-05fa-480c-a252-be6677753aab'
  and card_id in (
    '33333333-3333-3333-3333-333333333333',
    '55555555-5555-5555-5555-555555555555'
  )
  and archived_at is null;
```

Result:

| id | user_id | card_id |
| --- | --- | --- |
| `3c0ae0e0-f1f2-41c9-b326-5c3b4dcd8845` | `d8711861-05fa-480c-a252-be6677753aab` | `33333333-3333-3333-3333-333333333333` |
| `3bc57c54-0e14-4661-b7db-afa9e2009c4e` | `d8711861-05fa-480c-a252-be6677753aab` | `55555555-5555-5555-5555-555555555555` |

### Instances

```sql
select id, gv_vi_id, user_id, card_print_id
from vault_item_instances
where user_id = 'd8711861-05fa-480c-a252-be6677753aab'
  and card_print_id in (
    '33333333-3333-3333-3333-333333333333',
    '55555555-5555-5555-5555-555555555555'
  )
  and archived_at is null;
```

Result:

| id | gv_vi_id | user_id | card_print_id |
| --- | --- | --- | --- |
| `3cb39beb-6017-42a6-adad-0bb0070d038a` | `GVVI-80FA44D5-000004` | `d8711861-05fa-480c-a252-be6677753aab` | `33333333-3333-3333-3333-333333333333` |
| `4b602244-970c-4297-a4b9-7238f99f99e4` | `GVVI-80FA44D5-000005` | `d8711861-05fa-480c-a252-be6677753aab` | `55555555-5555-5555-5555-555555555555` |

Requirement result:

```text
1 vault_item_id → exactly 1 active GVVI
```

The selected sample met the safety requirement.

## 6. IMPLEMENTATION

### Step 1 — Introduce GVVI (non-destructive)

No schema migration was required.

The selected consumer does not persist `vault_item_id` in its own table. It performs a runtime lookup before updating `shared_cards`.

Non-destructive runtime extension applied:
- [saveSharedCardPublicNoteAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/saveSharedCardPublicNoteAction.ts) now accepts nullable `gvViId`
- the action now prefers resolving canonical card identity through `vault_item_instances.gv_vi_id`
- it falls back to `vault_items.id` only when no deterministic GVVI is available
- [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx) now passes `item.gv_vi_id` into the note-save action for deterministic single-instance rows

### Step 2 — Populate mapping

No persistent table backfill was required.

The mapping is applied at the runtime seam:
- if `gvViId` exists, the action resolves:
  - `vault_item_instances.gv_vi_id`
  - `vault_item_instances.card_print_id`
  - `card_prints.id`
  - `card_prints.gv_id`
- if `gvViId` does not exist, the action uses the preserved legacy path through `vault_items`

### Step 3 — Update runtime seam

Applied rule:

```text
if gv_vi_id exists → use GVVI
else → fallback to vault_item_id
```

`vault_item_id` was not removed.

## 7. VERIFICATION

### Completeness

Deterministic mapping summary for the selected sample:

| vault_item_id | card_id | active_instance_count | gvvi_ids | deterministic |
| --- | --- | ---: | --- | --- |
| `3c0ae0e0-f1f2-41c9-b326-5c3b4dcd8845` | `33333333-3333-3333-3333-333333333333` | 1 | `GVVI-80FA44D5-000004` | true |
| `3bc57c54-0e14-4661-b7db-afa9e2009c4e` | `55555555-5555-5555-5555-555555555555` | 1 | `GVVI-80FA44D5-000005` | true |

Result:

```text
0 selected deterministic rows lacked a GVVI mapping
```

### Correctness

Resolved sample mappings:

```text
vault_item_id 3c0ae0e0-f1f2-41c9-b326-5c3b4dcd8845 → GVVI-80FA44D5-000004
vault_item_id 3bc57c54-0e14-4661-b7db-afa9e2009c4e → GVVI-80FA44D5-000005
```

No mismatch was found between:
- `user_id`
- `card_id / card_print_id`
- active instance uniqueness

### Duplication check

For the selected deterministic sample:

```text
no duplicated gv_vi_id mapping was produced
```

Additional verification:
- `npm run typecheck` in `apps/web` passed

Verification limitation:
- the local verification dataset contained no `shared_cards` rows for the selected user/cards
- because of that, a full note-save mutation through the live shared-card UX could not be executed in this shell without fabricating runtime state

## 8. RESULT

```text
PASS WITH FOLLOW-UP
```

Reason:
- the second deterministic runtime seam was migrated successfully
- no ambiguity was introduced
- `vault_item_id` was preserved
- full click-path verification of public note save remains outstanding because no local shared-card fixture existed for the selected deterministic sample

## 9. OUTPUT

Applied files:
- [saveSharedCardPublicNoteAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/saveSharedCardPublicNoteAction.ts)
- [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx)

Audit file:
- [reconciliation_second_safe_migration_v1.md](/c:/grookai_vault/docs/audits/reconciliation_second_safe_migration_v1.md)

## 10. HARD RULES

- no ambiguity allowed
- no silent mapping
- no touching Category C systems
- no deletion of `vault_item_id`
- no schema destruction

## 11. WHY THIS STEP MATTERS

This repeats the deterministic migration pattern on a second safe consumer:
- phased migration
- deterministic mapping
- validation before expansion

It proves the first migration was not a one-off seam and that the reconciliation rules are reusable on another low-risk runtime surface.

## 12. NEXT STEP

After this scoped success:

```text
repeat for next safe consumer
```

The next candidate should remain inside deterministic single-instance shared-card seams before any Category C reconciliation work begins.
