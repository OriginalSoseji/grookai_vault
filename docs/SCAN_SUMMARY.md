# Scan Summary

Top 10 implemented but not visible
1. Alerts (lib/features/alerts/alerts_page.dart) — flagged off; add Profile nav.
2. Scan History (lib/features/scanner/scan_history_page.dart) — add entry from Scan result and Profile.
3. Explore Feed (lib/features/explore/explore_feed_page.dart) — add discoverable entry from Home/Profile.
4. Create Listing (lib/features/wall/create_listing_page.dart) — dev/profile route; keep gated or add dev menu.
5. Advanced Scanner (lib/features/scanner/scanner_advanced_page.dart) — dev-only.

Top 10 broken/incomplete
- Legacy `scanner_page.dart` — corrupted UTF-8; quarantined. Use ScanPage + widgets.
- Dev diagnostics routes — assume debug only; OK.

Fast wins (≤30m each)
- Add Profile → “Scan History” button.
- Add Profile → “Alerts” button (behind flag).
- Add Home card → “Explore Feed” link.

