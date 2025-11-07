# Backend Coverage Map

Function/Endpoint | Consumed by Screen(s) | DTO/Service | Displayed? | Gaps
--- | --- | --- | --- | ---
`functions.invoke('intake-scan')` | ScanPage | inline in `ScanPage` | Yes (flagged) | None
`functions.invoke('check-sets')` | DevAdminPage | features/debug/dev_admin_page.dart | Hidden | Dev-only
`functions.invoke('prices_status')` | DevHealthPage, PricingProbePage | features/dev/* | Hidden | Dev-only
`functions.invoke('update_prices')` | PricingProbePage | features/dev/diagnostics/pricing_probe_page.dart | Hidden | Dev-only
`functions.invoke('thumb_maker')` | CreateListingPage | features/wall/create_listing_page.dart | Hidden | Dev-only listing flow
`storage.from('scans')` upload + signed URL | ScanPage | inline | Yes | None
`from('scan_events')` | Scan controller/metrics/history | services/scan_metrics.dart; scan_history_page.dart | Partial | History route exists but not linked prominently
`from('alerts')` | AlertsPage | features/alerts/alerts_page.dart | Hidden | Feature flag off
`from('vault_items')` (+ views) | Vault flows | services/vault_service.dart; features/vault/* | Yes | —
`functions.invoke('scan_resolve')` | Scanner embed service | services/scanner_embed.dart | Hidden | Used by legacy/advanced path; no prod screen uses it
`functions.invoke('hydrate_card')` | CardsService | services/cards_service.dart | Yes (indirect via search/detail) | Ensure models stay in sync

