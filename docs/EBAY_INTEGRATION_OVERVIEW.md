# eBay Integration Overview

Grookai Vault will integrate directly with eBay using the Authorization Code grant. Planned scopes (all read-only) enable us to ingest our own sales, inventory, and analytics signals without over-privileging the app:

- `sell.fulfillment.readonly` — order + line-item data for `ebay_self`.
- `sell.inventory.readonly` — listings/offers to cross-check inventory.
- `sell.account.readonly` — account-level metadata.
- `sell.analytics.readonly` — performance insights.
- `commerce.identity.readonly` — identity context for OAuth flows.
- `commerce.notification.subscription` & `commerce.notification.subscription.readonly` — future webhook subscriptions.

### Lanes

1. **`ebay_self`** — ingest our own fulfilled orders to create canonical `price_observations` (initial focus of this repo work).
2. **Active listings (Browse API)** — planned feed for live supply + floor pricing once listing surfaces are wired.
3. **`ebay_market` (Marketplace Insights)** — optional, contingent on approval, to pull anonymized sold comps across the marketplace.

> Current implementation scope: build the `ebay_self` pricing path first (env placeholders, client, schema support, worker skeleton). Marketplace Insights and Browse integrations will follow once credentials + approvals are finalized.

### Browse API access tokens

Active-listing pricing workers rely on the eBay Browse API. They use an application-level token stored in `EBAY_BROWSE_ACCESS_TOKEN`. To mint a fresh token:

1. Export `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` (and optionally `EBAY_ENV=sandbox`).
2. Run `npm run ebay:browse:token` (or `node scripts/ebay_fetch_browse_token.mjs`).  
   The script prints the access token plus expiry details.
3. Copy the token into your local env file (e.g. `.env.local`) as `EBAY_BROWSE_ACCESS_TOKEN`.
4. Restart your worker shell so `backend/pricing/ebay_browse_prices_worker.mjs` picks up the new token.

Tokens expire after a few hours; when the worker logs `[ebay-browse] 401 Unauthorized`, repeat the steps above.
