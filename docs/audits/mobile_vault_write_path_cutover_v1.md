# Mobile Vault Write Path Cutover v1

## Title
Mobile Vault Write Path Cutover v1

## Date
2026-03-16

## Objective
Cut over the live mobile vault mutation layer to canonical instance-first ownership writes while keeping legacy `vault_items` as a temporary compatibility mirror and keeping service-role logic out of Flutter.

## Mobile Write Paths Found
Live ownership mutation paths proved from repo code:

| File | Function | Pre-fix mutation | Status |
| --- | --- | --- | --- |
| [vault_card_service.dart](/c:/grookai_vault/lib/services/vault/vault_card_service.dart) | `addOrIncrementVaultItem(...)` | direct `vault_items` select/update/insert by `gv_id` and `qty` | live |
| [main.dart](/c:/grookai_vault/lib/main.dart) | `_incQty(String id, int delta)` | direct `vault_items.update({'qty': next})` | live |
| [main.dart](/c:/grookai_vault/lib/main.dart) | `_delete(String id)` | direct `vault_items.delete().eq('id', id)` | live |
| [identity_scan_screen.dart](/c:/grookai_vault/lib/screens/identity_scan/identity_scan_screen.dart) | `_addToVault()` | routed through `VaultCardService.addOrIncrementVaultItem(...)` | live |
| [scan_identify_screen.dart](/c:/grookai_vault/lib/screens/scanner/scan_identify_screen.dart) | `_addToVault(...)` | routed through `VaultCardService.addOrIncrementVaultItem(...)` | likely legacy but reachable |

Repo-truth findings:
- there was no existing authenticated instance-write RPC wrapper
- there were no live Flutter calls to `admin_vault_instance_create_v1`
- there are now no remaining live direct `.from('vault_items')` writes under:
  - [main.dart](/c:/grookai_vault/lib/main.dart)
  - [vault_card_service.dart](/c:/grookai_vault/lib/services/vault/vault_card_service.dart)
  - [identity_scan_screen.dart](/c:/grookai_vault/lib/screens/identity_scan/identity_scan_screen.dart)
  - [scan_identify_screen.dart](/c:/grookai_vault/lib/screens/scanner/scan_identify_screen.dart)

## Pre-Fix Behavior
Before cutover:
- mobile add/increment wrote ownership directly into `public.vault_items`
- mobile decrement wrote `qty` directly on `public.vault_items`
- mobile delete removed the entire `vault_items` row directly
- canonical `public.vault_item_instances` was not touched by the live mobile mutation layer

That meant mobile ownership truth still depended on the legacy bucket table even after the web layer had already moved to instance-first writes.

## Canonical Routing Applied
New authenticated wrapper lane added in [20260316113000_create_mobile_vault_instance_wrappers_v1.sql](/c:/grookai_vault/supabase/migrations/20260316113000_create_mobile_vault_instance_wrappers_v1.sql):

- `public.vault_add_card_instance_v1(...)`
  - authenticated wrapper
  - calls `public.admin_vault_instance_create_v1(...)` internally
  - mirrors `vault_items`
- `public.vault_archive_one_instance_v1(...)`
  - archives one oldest active canonical instance for the current user/card
  - mirrors bucket decrement/archive
- `public.vault_archive_all_instances_v1(...)`
  - archives all active canonical instances for the current user/card
  - mirrors bucket archive

Flutter changes:
- [vault_card_service.dart](/c:/grookai_vault/lib/services/vault/vault_card_service.dart)
  - add/increment now calls `vault_add_card_instance_v1`
  - archive-one now calls `vault_archive_one_instance_v1`
  - archive-all now calls `vault_archive_all_instances_v1`
  - added minimal mobile logs:
    - `vault.mobile.add.begin`
    - `vault.mobile.archive.begin`
- [main.dart](/c:/grookai_vault/lib/main.dart)
  - `_incQty(...)` now routes through `VaultCardService`
  - `_delete(...)` now routes through `VaultCardService`
  - no direct `vault_items` mutation remains in the live mobile vault page

Service-role containment:
- Flutter does not call `admin_vault_instance_create_v1` directly
- Flutter does not hold or use a service-role key
- privileged instance creation remains inside database-side security-definer wrappers

## Verification Results
Verification used the local Supabase stack with an authenticated publishable-key client, which matches the mobile trust boundary.

Test fixture:

| Field | Value |
| --- | --- |
| user_id | `a5474ee9-972c-4595-b7fa-6c90945896d5` |
| card_print_id | `33333333-3333-3333-3333-333333333333` |

Test 1 — Add:
- called `vault_add_card_instance_v1` once
- result:
  - `created_count = 1`
  - `gv_vi_id = GVVI-CA299695-000001`
  - bucket qty = `1`

Test 2 — Add again:
- called `vault_add_card_instance_v1` again
- result:
  - second `gv_vi_id = GVVI-CA299695-000002`
  - canonical active instances = `2`
  - bucket qty = `2`

Test 3 — Remove one:
- called `vault_archive_one_instance_v1`
- result:
  - oldest active instance archived
  - canonical active instances = `1`
  - canonical archived instances = `1`
  - bucket qty = `1`

Test 4 — Delete remaining owned item:
- called `vault_archive_all_instances_v1`
- result:
  - canonical active instances = `0`
  - canonical archived instances = `2`
  - bucket qty = `0`
  - bucket row archived

Verification query summary:

| Step | Canonical active instances | Canonical archived instances | Bucket qty | Bucket archived_at |
| --- | --- | --- | --- | --- |
| after add 1 | `1` | `0` | `1` | `null` |
| after add 2 | `2` | `0` | `2` | `null` |
| after remove one | `1` | `1` | `1` | `null` |
| after delete all | `0` | `2` | `0` | non-null |

Tooling verification:
- `supabase db reset --local` passed
- `dart analyze lib/services/vault/vault_card_service.dart` passed
- `dart analyze` on `main.dart` still reports pre-existing warnings unrelated to this cutover

## Result
PASS

## Next Step
Proceed to read-path cutover for mobile vault surfaces so the app stops reading bucket ownership from `v_vault_items`.
