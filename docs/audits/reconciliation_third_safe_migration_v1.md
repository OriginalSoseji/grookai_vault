# GROOKAI VAULT — THIRD SAFE RECONCILIATION MIGRATION V1

## 1. Title

GROOKAI VAULT — THIRD SAFE RECONCILIATION MIGRATION V1  
Status: ACTIVE  
Scope: Execute the next deterministic Category B migration on a low-risk shared-card metadata seam

## 2. Date

2026-03-16

## 3. Objective

Apply `RECONCILIATION_PLAYBOOK_V1` again on the next safe shared-card-related seam so runtime logic prefers:

```text
gv_vi_id
```

when a vault row has exactly one active instance, while preserving:

```text
vault_item_id
```

as the historical fallback.

Goal:

```text
prove a third repeatable safe migration
without entering Category C ambiguity
```

## 4. Target Selected

Consumer:
- web shared-card public note client runtime seam

File/Object:
- [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx)
- [saveSharedCardPublicNoteAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/saveSharedCardPublicNoteAction.ts)

Surface:
- web runtime

Why deterministic:
- the seam only edits shared-card note metadata
- the public-note action already resolves canonical identity through `gv_vi_id` when present
- the remaining residual dependency was client-side note state still keyed by `vault_item_id`
- `gv_vi_id` is only attached to the vault row model when [getSingleActiveGvviByCardPrintIds.ts](/c:/grookai_vault/apps/web/src/lib/vault/getSingleActiveGvviByCardPrintIds.ts) proves exactly one active instance

Proof of 1:1 mapping:
- selected sample rows for user `d8711861-05fa-480c-a252-be6677753aab`
- bucket row `3c0ae0e0-f1f2-41c9-b326-5c3b4dcd8845` maps to active instance `GVVI-80FA44D5-000004`
- bucket row `3bc57c54-0e14-4661-b7db-afa9e2009c4e` maps to active instance `GVVI-80FA44D5-000005`

Why low risk:
- non-destructive shared-card metadata seam
- no scans
- no fingerprints
- no media storage or `user_card_images`
- no destructive ownership mutation

Repo-truth selection note:
- no remaining non-media `shared_cards` action existed after the first two safe migrations
- [toggleSharedCardPublicImageAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/toggleSharedCardPublicImageAction.ts) was explicitly excluded because it is media-backed
- the next safe seam was therefore the residual public-note runtime state, not a new media-adjacent server action

## 5. Proof of Deterministic Mapping

Bucket-side proof:

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

Instance-side proof:

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
each selected vault_item_id maps to exactly one active gv_vi_id
```

## 6. Runtime Seam Updated

Applied rule:

```text
if deterministic single active gvvi exists
→ prefer gv_vi_id
else
→ preserve vault_item_id fallback
```

What changed:
- [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx) now stores public-note modal identity using `gv_vi_id` first and `vault_item_id` second
- optimistic public-note updates now reconcile against the preferred shared identity key instead of hard-coding `vault_item_id`
- [saveSharedCardPublicNoteAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/saveSharedCardPublicNoteAction.ts) now returns the preferred shared identity key with `gv_vi_id` first and `vault_item_id` second
- the action still preserves the legacy lookup fallback through `vault_items` when no deterministic GVVI exists

What did not change:
- no schema migration
- no `vault_item_id` deletion
- no media/public-image logic
- no Category C system

## 7. Validation

Validation completed:
- deterministic mapping re-proved on the selected sample rows
- runtime seam now prefers `gv_vi_id` at the public-note client state boundary
- `vault_item_id` remains available as fallback
- `npm run typecheck` in `apps/web` passed

Runtime limitation:
- a full note-save click path was not executed because the local verification dataset had no `shared_cards` rows for the selected deterministic sample
- no synthetic shared-card fixture was fabricated for this audit

## 8. Result

```text
PASS WITH FOLLOW-UP
```

Reason:
- deterministic mapping was proven
- the selected runtime seam now prefers `gv_vi_id`
- `vault_item_id` fallback was preserved
- full click-path verification remains outstanding because matching shared-card runtime state was not present locally

## 9. Follow-Up

- if a local or staging shared-card fixture becomes available for a deterministic single-instance row, exercise the public-note click path end to end
- do not expand into public-image/media seams under the safe Category B lane

## 10. Next Step

```text
STOP safe Category B expansion
→ choose first controlled Category C design target
```

Repo truth after this migration:
- the only remaining adjacent shared-card seam is media-backed
- safe non-media shared-card Category B seams are exhausted
