# Audit: eBay Integration & Pricing (L2)

## 1. Overview
Repo search shows **no active eBay integration** in code, configs, or Supabase functions. Pricing infrastructure is in place (generic `admin.import_prices_do` RPC, bridge Edge functions, raw price tables), but all concrete ingestion logic currently targets PokemonAPI and other non-eBay feeds. The only eBay reference is in schema comments that list eBay as a potential `external_mappings.source`. There are no EBAY_* env vars, clients, or workers, and no marketplace-insights/EPID/sold-comp logic to reuse or deprecate.

## 2. Inventory of eBay-Related Pieces

### Tables
| Table / Column | Purpose | Status |
| --- | --- | --- |
| `public.external_mappings.source` (`supabase/migrations/20251115040000_ai_ingestion_schema_v1.sql:181`) | Canonical mapping from a `card_print` to third-party IDs; comment lists `tcgplayer`, `justtcg`, `ebay`, etc., proving the schema expects an eBay source tag but stores no logic. | **ALIGNED** (ready for eBay IDs; no conflicting behavior) |
| _No other eBay tables found_ | Searches for `ebay`, `ebay.com`, `EPID`, `sold listings`, `sold comps`, `marketplace insights`, `MarketplaceInsights`, and `EBAY_` across backend, Supabase, docs, CI, and Flutter returned no additional hits. | **N/A** |

### Backend Clients & Workers
| File | Description | Status |
| --- | --- | --- |
| _None_ | No backend client/worker mentions eBay. Existing pricing workers (`backend/pricing/import_prices_worker.mjs`, `backend/pricing/import_prices_bridge_smoke.mjs`) only test Supabase tunnel / Edge bridge and never touch eBay APIs. | **NEEDS REFIT** (new eBay workers must be authored from scratch) |

### Edge Functions & CI
| Component | Description | Status |
| --- | --- | --- |
| `supabase/functions/import-prices/index.ts` & `import-prices-v3/index.ts` | Legacy Edge entrypoints that validate bridge token and forward arbitrary payloads to `admin.import_prices_do`. They contain health/env-debug helpers but **no upstream API calls**. | **LEGACY PRICING PIPELINE** |
| `supabase/functions/import-prices-bridge/index.ts` | Hardened “bridge” variant that enforces `x-bridge-token` and invokes `admin.import_prices_do` with `dry_run` + `limit` arguments. No eBay logic. | **LEGACY PRICING PIPELINE** |
| `.github/workflows/auto-align-import-prices*.yml`, `kick-auto-align-bridge.yml`, `prod-import-prices-validate*.yml` | CI workflows that deploy/validate the Edge import functions. They ensure the bridge stays online but never talk to eBay. | **LEGACY PRICING PIPELINE** |

## 3. Environment & Secrets Audit
- `.env.example` and `.env.local` list only Supabase + Pokemon/TCGdex variables; there are **no `EBAY_*` keys defined or referenced** (`.env.example`, `.env.local`).
- No `.env.*` template contains eBay secrets, so there is **no conflicting or stale configuration to remove**.
- No hard-coded eBay credentials were found; only Supabase and bridge tokens exist. (Note: Supabase function folders currently store live-style `BRIDGE_IMPORT_TOKEN` values, but these are unrelated to eBay.)

## 4. Backend Clients & Workers Detail
- `backend/pricing/import_prices_worker.mjs` reads from `card_prices` to verify tunnel connectivity; it never calls external marketplaces. Classification: **SAFE TO KEEP** for tunnel diagnostics but **insufficient** for eBay ingestion.
- `backend/pricing/import_prices_bridge_smoke.mjs` (Step 1 deliverable) simply POSTs to the deployed Edge function with `{ mode: 'run', dryRun: true, limit: 5 }`. No eBay integration present. Classification: **SAFE TO KEEP** for monitoring.
- Other backend directories (`backend/clients`, `backend/pokemon`, `backend/sets`, `backend/infra`) target PokemonAPI/TCGdex pipelines only; repo-wide `rg -i ebay` against backend produced zero hits, confirming no latent eBay experiment exists.

## 5. Supabase Schema & Migrations
- `public.external_mappings` (`supabase/migrations/20251115040000_ai_ingestion_schema_v1.sql:181-213`) is the **only place referencing eBay** and merely describes how a `source` like `'ebay'` would be stored. This schema is ALIGNED with the future plan.
- `admin.import_prices_do` implementation (`supabase/migrations/20251118235959_import_prices_impl_v1.sql`) normalizes price rows into `card_price_observations` and routes rejects to `unmatched_price_rows`. It expects `price_sources` entries (not populated in repo) and will accept eBay-provided `source_id` values. Classification: **ALIGNED** (ready for upstream data but currently unused).
- `price_sources`, `card_price_observations`, and `unmatched_price_rows` definitions (same migration + `supabase/migrations/20251117004358_remote_schema.sql`) contain no marketplace-specific assumptions. They provide the canonical storage for raw comps; status: **ALIGNED**.
- No Supabase migration defines `ebay_*` tables or enums; there is no schema debt to unwind before shipping eBay ingestion.

## 6. Edge Functions & CI Findings
- All import Edge functions ultimately call `admin.import_prices_do` with user-provided payloads (see `supabase/functions/import-prices-bridge/index.ts:105-135`). They contain **no business logic**; to ingest eBay data we must supply the rows ourselves via backend worker or the new bridge worker.
- CI workflows (`.github/workflows/auto-align-import-prices-bridge.yml`, `kick-auto-align-bridge.yml`, `prod-import-prices-validate-edge.yml`) only ensure the bridge deploys/validates. Tagging: **LEGACY PRICING PIPELINE (DO NOT USE for new ingestion)** until new eBay-specific flows hook into the RPC with validated payloads.

## 7. Gaps & Recommendations
1. **No eBay configuration exists.** Introduce explicit `EBAY_*` env vars (client ID/secret, marketplace site ID, marketplace insights scopes, etc.) in `.env.example` once the API plan is solid. Add matching validation in backend/worker bootstrap code.
2. **No eBay client code.** Build a dedicated backend client (likely under `backend/clients/ebay.mjs`) that handles OAuth (oAuth2 client credentials for Buy APIs or refresh tokens for Sell APIs) and exposes helpers for Marketplace Insights / Browse sold-comps endpoints.
3. **No ingestion worker.** Author a worker under `backend/pricing/` (e.g., `ebay_marketplace_worker.mjs`) that:
   - Calls the eBay API client,
   - Translates results into the payload shape required by `admin.import_prices_do` (rows with `card_print_id`, `value`, `currency`, `kind`, `source_id` pointing to an `price_sources` row for eBay),
   - Populates `price_sources` with an `'ebay'` entry during setup.
4. **Document mapping strategy.** Extend `docs/ingestion` with how eBay EPIDs/Listing IDs tie to `external_mappings` so future audits can differentiate eBay vs. other marketplaces.
5. **Security note.** Ensure any future `.env` additions never commit live eBay keys; adopt the same GV Secrets Contract used for Supabase tokens.

_Prepared: `docs/AUDIT_EBAY_INTEGRATION_L2.md`_
