# Features Status

Feature | Status | Evidence | Fix suggestion | Owner files
--- | --- | --- | --- | ---
Scanner (ScanPage) | Displayed | Routed via `/scan` and `RouteNames.scanner` | N/A | lib/features/scan/scan_page.dart
Scanner Advanced (legacy) | Hidden | Dev-only route `/scanner-advanced` | Keep hidden; use widgets only | lib/features/scanner/scanner_advanced_page.dart
Login | Displayed | `MyApp` uses auth stream | N/A | lib/features/auth/login_page.dart
Vault | Displayed | In bottom nav | N/A | lib/features/vault/vault_page.dart
Search/Unified Search | Displayed | Bottom nav + `/unified-search-sheet` | Consider add recent history | lib/features/search/*
Card Detail | Displayed | Routed as `/card-detail` | N/A | lib/features/pricing/card_detail_page.dart
Scan History | Displayed (no direct nav) | Route wired; check table `scan_events` | Add entry point | lib/features/scanner/scan_history_page.dart
Alerts | Hidden | Flag default false | Decide GA plan; add Profile entry | lib/features/alerts/alerts_page.dart
Dev Admin/Health/Diagnostics | Hidden | kDebug/profile only | Keep | lib/features/dev/*, lib/features/debug/*
Explore Feed | Displayed (dev link) | Routed `/explore` | Consider expose from Home | lib/features/explore/explore_feed_page.dart
Create Listing | Hidden (dev/profile) | Route gated | Keep dev | lib/features/wall/create_listing_page.dart
Wall Feed/Profile/Compose | Displayed | Profile menu opens | N/A | lib/features/wall/*

