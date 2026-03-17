# Mobile Vault Read Path Cutover v1

## Title
Mobile Vault Read Path Cutover v1

## Date
2026-03-16

## Objective
Cut over mobile vault ownership reads so the app no longer treats legacy bucket quantity as ownership truth and instead derives owned counts from active `vault_item_instances`.

## Read Paths Found
Read surfaces proved from current repo code:

| File | Function / Surface | Classification | Pre-fix ownership source | Status |
| --- | --- | --- | --- | --- |
| [main.dart](/c:/grookai_vault/lib/main.dart) | `VaultPageState.reload()` | ACTIVE READ | `v_vault_items` row list, including `qty` | live |
| [main.dart](/c:/grookai_vault/lib/main.dart) | `_VaultItemTile.build()` | DERIVED READ | `row['qty']` displayed in vault list | live |
| [main.dart](/c:/grookai_vault/lib/main.dart) | `VaultPageState.build()` -> `CardDetailScreen(quantity: ...)` | DERIVED READ | `row['qty']` forwarded into card detail | live |
| [card_detail_screen.dart](/c:/grookai_vault/lib/card_detail_screen.dart) | `_buildMetaChips()` | DERIVED READ | `widget.quantity` from parent | live |
| [vault_card_service.dart](/c:/grookai_vault/lib/services/vault/vault_card_service.dart) | new `getOwnedCountsByCardPrintIds(...)` | ACTIVE READ | authenticated wrapper over `vault_item_instances` | live |

Repo-truth classification after cutover:
- `v_vault_items` remains in [main.dart](/c:/grookai_vault/lib/main.dart) as a metadata/read-model source.
- `qty` is no longer the primary ownership truth on mobile.
- live ownership display now prefers canonical instance counts.
- legacy quantity remains only as a temporary fallback during rollout.

## Pre-Fix Behavior
Before this cutover:
- mobile vault list loaded rows from `v_vault_items`
- list quantity display used `row['qty']`
- card detail quantity chip used the same bucket quantity forwarded from `main.dart`
- mobile ownership truth therefore still depended on bucket semantics even though mobile writes were already instance-first

## Instance-Based Read Applied
Cutover applied in three parts:

1. Added authenticated instance-count wrapper:
   - [20260316114500_create_mobile_vault_instance_read_wrappers_v1.sql](/c:/grookai_vault/supabase/migrations/20260316114500_create_mobile_vault_instance_read_wrappers_v1.sql)
   - function: `public.vault_owned_counts_v1(uuid[])`
   - reason: `public.vault_item_instances` is still service-role-only under RLS, so Flutter cannot read it directly

2. Added mobile helper:
   - [vault_card_service.dart](/c:/grookai_vault/lib/services/vault/vault_card_service.dart)
   - function: `getOwnedCountsByCardPrintIds(...)`
   - behavior:
     - sends the requested `card_print_id` list to `vault_owned_counts_v1`
     - returns a `Map<String, int>` keyed by `card_print_id`

3. Rewired mobile vault list display:
   - [main.dart](/c:/grookai_vault/lib/main.dart)
   - `reload()` now:
     - still fetches `v_vault_items` for row metadata
     - fetches canonical owned counts separately
     - overlays each row with:
       - `owned_count`
       - `legacy_qty`
   - list and detail quantity display now use:
     - `owned_count`
     - then `legacy_qty`
     - then `qty`
   - `Qty` sorting now sorts locally by canonical owned count instead of database bucket quantity

Effective ownership rule after cutover:
- canonical: count active `vault_item_instances`
- temporary fallback only: legacy bucket `qty`

## Verification Results
Verification used the rebuilt local Supabase stack plus authenticated RPC calls that match the mobile trust boundary.

Test fixture:

| Field | Value |
| --- | --- |
| user_id | `d8711861-05fa-480c-a252-be6677753aab` |
| card_print_id | `33333333-3333-3333-3333-333333333333` |
| wrapper | `public.vault_owned_counts_v1(uuid[])` |

Authenticated flow results:

| Step | Result |
| --- | --- |
| add 1 | created `GVVI-80FA44D5-000001`, bucket `qty = 1` |
| add 2 | created `GVVI-80FA44D5-000002`, bucket `qty = 2` |
| count after add | wrapper returned `owned_count = 2` |
| archive one | archived one active instance, bucket `qty = 1` |
| count after archive one | wrapper returned `owned_count = 1` |
| archive all | archived remaining active instance, bucket archived with `qty = 0` |
| count after archive all | wrapper returned no active rows, effective count `0` |

Current local grep after cutover:

| Search | Result |
| --- | --- |
| `v_vault_items` in live mobile files | still present in [main.dart](/c:/grookai_vault/lib/main.dart) for metadata loading |
| `row['qty']` live ownership truth | removed as primary truth; remaining references are fallback fields in [main.dart](/c:/grookai_vault/lib/main.dart) |
| direct `vault_items` reads in `vault_card_service.dart` | none |

Tooling:
- `supabase db reset --local` passed
- `dart analyze lib/services/vault/vault_card_service.dart lib/main.dart lib/card_detail_screen.dart` completed with pre-existing warnings and infos, but no new read-cutover-specific errors

## Result
PASS WITH FOLLOW-UP

## Next Step
Proceed to web read-path cutover so web ownership displays also stop treating legacy bucket rows as ownership truth.
