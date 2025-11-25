# eBay Seller Sync v1

## Overview
Seller Sync lets Grookai sellers connect their eBay account via OAuth so that their sold orders flow into `price_observations` and, after aggregation, power the Grookai Pricing Index v1 (`price_aggregates_v1` → `price_index_v1`). The flow is backend-only in this phase (no Flutter UI yet).

## Tables
- **`public.ebay_accounts`**  
  - Stores per-user OAuth tokens and metadata (`user_id`, `marketplace_id`, `access_token`, `refresh_token`, `scopes`, `last_sync_at`).  
  - Created via migration `20251123090000_ebay_accounts_v1.sql`.  
  - RLS TBD; current Edge Function uses the service role to upsert rows.
- **`public.price_observations`**  
  - Canonical raw pricing table (see `docs/AUDIT_PRICING_ENGINE_L2.md`).  
  - Each seller sale is recorded with `source='ebay_self'`, `marketplace_id`, `order_id`, `order_line_item_id`, `observed_at`, `price_usd`, and `raw_payload`.  
  - `card_print_id` remains `null` until the mapping layer is wired (see `docs/AUDIT_EBAY_MAPPING_L2.md`).

## Flow
1. **User initiates OAuth (future UI)**  
   - App sends the seller to eBay authorize URL with `state`.
2. **Edge Function callback** (`supabase/functions/ebay_oauth_callback/index.ts`)  
   - Receives `code` + `state`.  
   - TODO: Harden CSRF/state validation.  
   - Exchanges `code` for tokens via eBay OAuth endpoint.  
   - Authenticates the Supabase user (Authorization Bearer JWT).  
   - Upserts into `public.ebay_accounts` (per user + marketplace).  
   - Responds with simple JSON/HTML success.
3. **Token helper** (`backend/ebay/ebay_tokens.mjs`)  
   - `getSellerEbayAuth()` fetches the seller row and refreshes tokens via refresh_token when close to expiry.  
   - TODO: expand error handling + alerting when refresh fails.
4. **Sync worker** (`backend/ebay/ebay_sellers_sync_worker.mjs`)  
   - CLI options: `--dry-run`, `--limit`, `--seller-limit`, `--since`.  
   - Loads active sellers ordered by `last_sync_at`.  
   - For each seller:  
     - Retrieves tokens via helper.  
     - Calls eBay Fulfillment Orders API and builds `price_observations` rows (Phase 1: `card_print_id` null).  
     - Inserts rows (or logs them in dry-run).  
     - Updates `last_sync_at`.  
   - Logs summary counts.  
   - Future TODO: integrate mapping helpers so `card_print_id` is populated before insert, then enforce non-null rows.
5. **Pricing Index consumption**  
   - `price_observations` → `price_aggregates_v1` (MV) → `price_index_v1` (view).  
   - See `docs/PRICING_INDEX_V1_CONTRACT.md` for aggregation and confidence rules.

## Worker Safety & Modes
- The `pricing:ebay:sellers:sync` worker is **safe by default**. If no mode is specified, it logs and defaults to `--dry-run`.
- Passing both `--dry-run` and `--write` is rejected.
- In `--dry-run` mode:
  - No rows are written to `price_observations`.
  - `ebay_accounts.last_sync_at` is untouched.
  - Each line item logs a compact summary (`seller`, `order_id`, `line_item_id`, `card_print_id`, `price`, `currency`).
- In `--write` mode:
  - Rows are inserted into `price_observations`.
  - `last_sync_at` is updated per seller after successful sync.
  - If a row has `card_print_id = null`, the worker logs a warning (mapping enforcement will tighten this later).

## Future Work
- Harden OAuth state/CSRF validation + front-end redirect UX.
- Add RLS and a user-facing API to list connected seller accounts.
- Integrate mapping layer so eBay line items resolve to `card_prints.id` before insertion; enforce non-null `card_print_id`.
- Add scheduler (GitHub Actions or Supabase cron) to run `npm run pricing:ebay:sellers:sync`.
- Expand `price_sources` if new sources (e.g., `ebay_market`, `gv_market`) feed into the same pipeline.
- Build Edge/API endpoints for the app to monitor sync status and pricing metrics.
