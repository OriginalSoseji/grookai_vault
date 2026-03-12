# GV ID Vault Application Audit

Date: 2026-03-12

## Scope

Phase objective: make `gv_id` the primary vault-facing product identity in the application layer without changing database schema, pricing views, or compatibility joins.

## Repository Search Classification

Search terms:

- `card_id`
- `card_prints.id`
- `vault_items.card_id`

Classification summary:

- Vault ownership flow
  - [lib/main.dart](/C:/grookai_vault/lib/main.dart)
  - [lib/screens/identity_scan/identity_scan_screen.dart](/C:/grookai_vault/lib/screens/identity_scan/identity_scan_screen.dart)
  - [lib/screens/scanner/scan_identify_screen.dart](/C:/grookai_vault/lib/screens/scanner/scan_identify_screen.dart)
  - [apps/web/scripts/rls_probe.mjs](/C:/grookai_vault/apps/web/scripts/rls_probe.mjs)
  - [apps/web/README.md](/C:/grookai_vault/apps/web/README.md)
- Catalog flow
  - [lib/models/card_print.dart](/C:/grookai_vault/lib/models/card_print.dart)
  - `apps/web/src/app/explore/*`, `apps/web/src/lib/public*`, `apps/web/src/app/card/[gv_id]/*`
  - card search RPC consumers and public card pages already prefer `gv_id`
- Pricing flow
  - [lib/card_detail_screen.dart](/C:/grookai_vault/lib/card_detail_screen.dart)
  - `backend/pricing/*`
  - pricing-related Supabase views/functions/migrations
- Ingestion worker
  - `backend/pokemon/*`
  - `backend/tools/*`
  - [backend/identity/identity_scan_worker_v1.mjs](/C:/grookai_vault/backend/identity/identity_scan_worker_v1.mjs)
- Image worker
  - `backend/condition/*`
  - `backend/identity/grookai_vision_worker_v1.mjs`
- Other
  - `.tmp/*` generated schema/data snapshots
  - `supabase/migrations/*` database definitions and historical compatibility SQL
  - `lib/main.dart.bak.*` backup files

Only the Flutter vault ownership flow was changed in this phase.

## Files Updated

- [lib/main.dart](/C:/grookai_vault/lib/main.dart)
- [lib/models/card_print.dart](/C:/grookai_vault/lib/models/card_print.dart)
- [lib/services/vault/vault_card_service.dart](/C:/grookai_vault/lib/services/vault/vault_card_service.dart)
- [lib/screens/identity_scan/identity_scan_screen.dart](/C:/grookai_vault/lib/screens/identity_scan/identity_scan_screen.dart)
- [lib/screens/scanner/scan_identify_screen.dart](/C:/grookai_vault/lib/screens/scanner/scan_identify_screen.dart)
- [lib/card_detail_screen.dart](/C:/grookai_vault/lib/card_detail_screen.dart)

## Queries Updated

- Vault read query in [lib/main.dart](/C:/grookai_vault/lib/main.dart)
  - `from('v_vault_items').select('id,user_id,card_id,gv_id,qty,condition_label,created_at,name,set_name,number,photo_url,image_url')`
- Canonical card lookup added in [lib/services/vault/vault_card_service.dart](/C:/grookai_vault/lib/services/vault/vault_card_service.dart)
  - `from('card_prints').select('id,gv_id,name,set_code,number,number_plain,image_url,image_alt_url,set:sets(name,code)').eq('id', cardId).maybeSingle()`
- Vault ownership lookup added in [lib/services/vault/vault_card_service.dart](/C:/grookai_vault/lib/services/vault/vault_card_service.dart)
  - `from('vault_items').select('id,qty,condition_label').eq('user_id', userId).eq('gv_id', identity.gvId).maybeSingle()`
- Vault update compatibility query added in [lib/services/vault/vault_card_service.dart](/C:/grookai_vault/lib/services/vault/vault_card_service.dart)
  - existing row update now writes both `gv_id` and `card_id`
- Vault insert compatibility query added in [lib/services/vault/vault_card_service.dart](/C:/grookai_vault/lib/services/vault/vault_card_service.dart)
  - new rows insert `user_id, gv_id, card_id, name, set_name, photo_url, qty, condition_label`
- Application-layer write path removed
  - `rpc('vault_add_or_increment')` is no longer used by active Flutter vault add flows

## Vault Read Paths Migrated

- Mobile vault list
  - now explicitly reads `gv_id` from `v_vault_items`
  - vault tiles display `gv_id`
- Vault-based detail navigation
  - vault detail screen now receives `gvId`
  - UI shows `GV: {gv_id}` instead of exposing raw `card_id` when available
- Web vault list
  - no implemented query surface found; `/vault` is still an auth placeholder
- Recently-added feed
  - no app-layer implementation found in this repo
- Public wall / shareable vault references
  - no implemented app-layer surface found in this repo

## Vault Write Paths Migrated

- Add card to vault from catalog picker in [lib/main.dart](/C:/grookai_vault/lib/main.dart)
  - canonical row resolved first
  - application writes both `gv_id` and `card_id`
  - duplicate ownership is resolved on `(user_id, gv_id)` in app logic
- Add card to vault from scanner in [lib/screens/scanner/scan_identify_screen.dart](/C:/grookai_vault/lib/screens/scanner/scan_identify_screen.dart)
  - canonical row resolved first
  - application writes both `gv_id` and `card_id`
- Add card to vault from identity scan in [lib/screens/identity_scan/identity_scan_screen.dart](/C:/grookai_vault/lib/screens/identity_scan/identity_scan_screen.dart)
  - canonical row resolved first
  - application writes both `gv_id` and `card_id`
  - prior RPC-only `card_id` path removed from the app
- Remove card from vault
  - unchanged by design
  - still deletes by vault item row `id`
- Update quantity
  - unchanged by design
  - still updates by vault item row `id`
- Update condition
  - no active application-layer write path found in this repo

## Remaining card_id Dependencies

- Pricing compatibility in [lib/card_detail_screen.dart](/C:/grookai_vault/lib/card_detail_screen.dart)
  - `card_print_active_prices`
  - `pricing-live-request`
- Pricing worker read path in [backend/pricing/pricing_backfill_worker_v1.mjs](/C:/grookai_vault/backend/pricing/pricing_backfill_worker_v1.mjs)
  - still reads `vault_items.card_id`
- Database compatibility layer in `supabase/migrations/*`
  - pricing views/functions still join on `card_id`
  - vault views/functions still carry `card_id` for compatibility
- Catalog/detail screens
  - still use `cardPrintId` internally for pricing and canonical joins
  - not changed in this phase unless they were directly part of a vault ownership write/read path

## Verification

- `dart format` ran on all touched Dart files
- `flutter analyze` ran on touched files
  - result: no analyzer errors from this migration
  - remaining output is pre-existing warnings/info in touched files
- Active Flutter vault add paths no longer issue direct `vault_items.insert` with only `card_id`
- Active Flutter identity add path no longer uses `rpc('vault_add_or_increment')`
- Pricing path remains `card_id`-based by design for compatibility

## Result

Application-layer vault ownership flows now treat `gv_id` as the primary outward-facing identity while preserving `card_id` for pricing and compatibility joins.
