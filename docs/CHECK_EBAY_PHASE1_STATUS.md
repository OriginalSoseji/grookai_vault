# eBay Phase 1 Scaffolding Status

## Summary
Phase 1 scaffolding is in place: all required env/docs, client/worker code, migration, npm script, and legacy notices exist and look consistent with the requested design.

## Checklist Results
- `.env.example`: OK  
  - Section `# eBay Integration (pricing, inventory, analytics)` present with `EBAY_CLIENT_ID/SECRET/REDIRECT_URI/ENV/MARKETPLACE_ID` placeholders; no typos observed.
- `docs/EBAY_INTEGRATION_OVERVIEW.md`: OK  
  - File exists and calls out Authorization Code grant, `sell.fulfillment.readonly` (and other scopes), plus the three lanes (`ebay_self`, Browse, `ebay_market`).
- `backend/clients/ebay_client.mjs`: OK  
  - File exists; base URL switches on `EBAY_ENV`, and exported `get`/`post` helpers call a shared `request` that attaches the bearer Authorization header and marketplace ID.
- `backend/ebay/ebay_self_orders_worker.mjs`: OK  
  - File exists with `parseArgs()` handling `--since/--limit/--dry-run`; `main()` creates `createBackendClient`, instantiates `EbayClient`, builds `price_observations` rows with `source: 'ebay_self'`, and respects `--dry-run` logging instead of inserts.
- Supabase migration for price_observations: OK  
  - `supabase/migrations/20251120120000_pricing_ebay_self_extension.sql` adds `marketplace_id`, `order_id`, `order_line_item_id`, `shipping_amount`, `seller_location`, `raw_payload` via `ADD COLUMN IF NOT EXISTS` and refreshes the listing_type check. It also upserts a `price_sources` row for `ebay_self`; there is no separate `source` enum to update.
- package.json script `"pricing:ebay:self"`: OK  
  - Script points to `node backend/ebay/ebay_self_orders_worker.mjs`.
- Legacy import-prices Edge functions: OK  
  - `supabase/functions/import-prices/index.ts`, `import-prices-v3/index.ts`, and `import-prices-bridge/index.ts` all exist with the LEGACY NOTICE block at the top referencing `admin.import_prices_do` and directing new work to eBay pipelines.

## Syntax Check
- `backend/clients/ebay_client.mjs`: OK (passes `node --check`).
- `backend/ebay/ebay_self_orders_worker.mjs`: OK (passes `node --check`).

## Recommended Next Actions
- None for scaffolding verification; next functional steps will be implementing OAuth token storage/refresh and card_print mapping logic when ready.
