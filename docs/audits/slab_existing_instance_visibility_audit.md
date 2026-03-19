# SLAB EXISTING INSTANCE VISIBILITY AUDIT

## Status

FOUND

## Founder User

- Email: `ccabrl@gmail.com`
- User ID: `03e80d15-a2bb-4d3c-abd1-2de03e55787b`

## Slab Cert Row

- `slab_certs.id`: `72287907-2457-4c9d-a6b4-2ccace363da1`
- `cert_number`: `106183226`
- `card_print_id`: `5557ba0d-6aa7-451f-8195-2a300235394e`
- `grader`: `PSA`
- `grade`: `9`
- `created_at`: `2026-03-17T22:22:47.926565+00:00`
- `updated_at`: `2026-03-17T22:22:47.926565+00:00`

Repo/data truth: the slab cert row exists.

## Linked Instance Rows

Founder-linked `vault_item_instances` rows where `slab_cert_id = 72287907-2457-4c9d-a6b4-2ccace363da1`:

- none

Classification:

- active slab instances: `0`
- archived slab instances: `0`

Additional check:

- all-user `vault_item_instances` rows for this `slab_cert_id`: `0`

Repo/data truth: the cert exists, but there is no canonical owned slab object anywhere in `vault_item_instances`.

## Linked Anchor Rows

Linked anchors via `legacy_vault_item_id` from slab instances:

- none, because there are no slab-linked instances

Same-card founder anchors for `card_print_id = 5557ba0d-6aa7-451f-8195-2a300235394e`:

- active raw compatibility anchor exists:
  - `vault_items.id`: `d1d7e75e-0efb-4fa0-9537-d5f3aca20db0`
  - `card_id`: `5557ba0d-6aa7-451f-8195-2a300235394e`
  - `gv_id`: `GV-PK-PR-SV-85`
  - `archived_at`: `null`
  - `created_at`: `2026-03-17T18:40:07.019433+00:00`
  - `is_graded`: `false`
  - `grade_company`: `null`
  - `grade_value`: `null`
  - `grade_label`: `null`

Raw founder instance for the same card:

- `vault_item_instances.id`: `71707056-deb2-4241-a448-313e64d2d61e`
- `card_print_id`: `5557ba0d-6aa7-451f-8195-2a300235394e`
- `slab_cert_id`: `null`
- `legacy_vault_item_id`: `null`
- `gv_vi_id`: `GVVI-065CAB28-000365`
- `archived_at`: `null`

Repo/data truth: founder owns the raw card, but there is no slab instance and therefore no slab anchor chain.

## Visibility Analysis

### Card Detail

Relevant files:

- [getOwnedObjectSummaryForCard.ts](/c:/grookai_vault/apps/web/src/lib/vault/getOwnedObjectSummaryForCard.ts)
- [page.tsx](/c:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx)

Current card-detail slab inclusion rule:

1. load `slab_certs` for the current `card_print_id`
2. load active founder `vault_item_instances` where `slab_cert_id in <that card's slab cert ids>`
3. count/group those slab instances into visible ownership lines

For this cert/card:

- step 1 succeeds: the `slab_certs` row exists
- step 2 returns `0` rows: there is no active founder slab instance linked to that cert

Result:

- card detail should **not** show a slab line today
- card detail should only show the raw owned-object summary for this card

### Vault

Relevant files:

- [getCanonicalVaultCollectorRows.ts](/c:/grookai_vault/apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts)
- [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx)

Current vault slab inclusion rule:

1. load active founder `vault_item_instances`
2. resolve `card_print_id` directly from raw instances or indirectly through `slab_certs.card_print_id`
3. aggregate one visible collector row per `card_print_id`
4. show slab metadata only when active slab instances are present in that aggregate

For this cert/card:

- there is one active raw instance for the card
- there are zero active slab instances for the card

Result:

- the vault should show the card as a raw-owned row
- the vault should **not** show slab badge/meta for cert `106183226`

## Exact Reason It Is Not Visible (or not obvious)

The cert is visible in data only as a `slab_certs` row. It is **not** visible as an owned slab object because no `vault_item_instances` row exists with:

- `user_id = 03e80d15-a2bb-4d3c-abd1-2de03e55787b`
- `slab_cert_id = 72287907-2457-4c9d-a6b4-2ccace363da1`
- `archived_at is null`

That means:

- no canonical slab object exists
- no slab anchor exists through `legacy_vault_item_id`
- current web vault/card-detail surfaces are correctly omitting it

This is not a hidden active slab. It is a stranded cert row.

Important repo-truth note:

- [createSlabInstance.ts](/c:/grookai_vault/apps/web/src/lib/slabs/createSlabInstance.ts) only returns `"This verified slab is already in your vault."` if an active founder `vault_item_instances` row already exists for that `slab_cert_id`
- current live data does **not** satisfy that condition

So if founder saw an “already exists in vault” message, that message is not supported by the current queried data state.

## Smallest Safe Fix Direction

Do not recreate the cert row.

Smallest safe next step:

1. audit the live slab creation path between:
   - `vault_items` episode insert
   - `admin_vault_instance_create_v1`
2. determine why the cert row was created but the slab instance row was never persisted
3. only after that, fix the slab creation write seam so cert + instance + anchor are created as one coherent owned-object path

This is a creation-path repair problem, not a read-model visibility bug.

## File Inventory

- [createSlabInstance.ts](/c:/grookai_vault/apps/web/src/lib/slabs/createSlabInstance.ts)
- [getOwnedObjectSummaryForCard.ts](/c:/grookai_vault/apps/web/src/lib/vault/getOwnedObjectSummaryForCard.ts)
- [getCanonicalVaultCollectorRows.ts](/c:/grookai_vault/apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts)
- [page.tsx](/c:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx)
- [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx)
- [slab_existing_instance_visibility_audit.sql](/c:/grookai_vault/docs/audits/slab_existing_instance_visibility_audit.sql)
