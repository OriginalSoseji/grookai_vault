# Features Inventory

Name | Route/Entry | Files | Depends on | Visibility | Notes
--- | --- | --- | --- | --- | ---
Login | App start when no session | lib/features/auth/login_page.dart | Supabase auth | Displayed | Entry via `MyApp` stream of `onAuthStateChange`.
Home | Bottom Nav | lib/features/home/home_page.dart | HomeVm, Supabase views `public_wall_v` | Displayed | Recent/Vault surface.
Search | Bottom Nav, `/search` | lib/features/search/search_page.dart, lib/features/search/unified_search_page.dart, lib/features/search/unified_search_sheet.dart | Supabase functions `hydrate_card` via services | Displayed | Unified sheet is routed via `/unified-search-sheet`.
Vault | Bottom Nav | lib/features/vault/vault_page.dart | VaultService, Supabase tables `vault_items`, `v_vault_items` | Displayed | Effective prices list via `/vault-ext`.
Profile | Bottom Nav | lib/features/profile/profile_page.dart | Supabase auth/profile | Displayed | Profile button in AppBar too.
Card Detail | `RouteNames.cardDetail` `/card-detail` | lib/features/pricing/card_detail_page.dart | PriceService, Supabase `user_vault` | Displayed | Accepts `card_print_id` or resolves via set/number.
Scan (Production) | Center FAB/pill, `RouteNames.scanner`, `/scan` | lib/features/scan/scan_page.dart | Supabase storage `scans`, function `intake-scan` | Displayed (flag gvFeatureScanner) | Canonical scanner.
Scan History | `RouteNames.scanHistory` | lib/features/scanner/scan_history_page.dart | `scan_events` table | Displayed | Lists recent scans if table present.
Dev Admin | `RouteNames.devAdmin` | lib/features/debug/dev_admin_page.dart | Functions `check-sets` | Hidden (kDebugMode) | Dev-only.
Dev Health | `RouteNames.devHealth` | lib/features/dev/dev_health_page.dart | Function `prices_status` | Hidden (kDebugMode) | Dev-only.
Pricing Probe/Smoke/Diag | Various `/dev-*` | lib/features/dev/diagnostics/... | Functions `update_prices`, `prices_status` | Hidden (kDebugMode) | Diagnostics.
Explore Feed | `RouteNames.explore` | lib/features/explore/explore_feed_page.dart | Card repo/image resolver | Displayed via Dev Admin link | Not in bottom nav.
Alerts | `RouteNames.alerts` | lib/features/alerts/alerts_page.dart | `alerts` table | Hidden (flag gvFeatureAlerts=false) | Gated by flag.
Create Listing | `RouteNames.createListing` | lib/features/wall/create_listing_page.dart | Storage `listing-photos`, function `thumb_maker`, table `listings` | Hidden (kDebug/Prof only) | Dev route.
Wall Feed/Profile/Compose | `RouteNames.wallFeed/*` | lib/features/wall/... | Supabase views `public_wall_v`, tables `public_wall_posts`, functions `thumb_maker` | Displayed via Profile button (Wall Feed) | Secondary surfaces.
Vault Effective List | `/vault-ext` | lib/features/vault/vault_items_ext_list.dart | View `v_vault_items` | Displayed via actions | Non-primary.
Price Import (Dev) | `RouteNames.devPriceImport` | lib/dev/price_import_page.dart | PriceImporter tools | Hidden | Dev tooling.
Advanced Scanner (Dev) | `/scanner-advanced` | lib/features/scanner/scanner_advanced_page.dart | — | Hidden (dev flag) | Dev-only scaffold.

Notes:
- Feature flags: see `lib/config/flags.dart` and `lib/features/dev/dev_flags.dart` for scanner and dev exposure toggles.

