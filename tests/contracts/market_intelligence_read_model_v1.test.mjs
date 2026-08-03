import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const migration = source(
  "supabase/migrations/20260803183000_market_intelligence_read_model_v1.sql",
);
const precisionMigration = source(
  "supabase/migrations/20260803190000_active_ask_currency_precision_v1.sql",
);
const readback = source("docs/sql/market_intelligence_read_model_v1_readback.sql");
const contract = source("docs/contracts/MARKET_INTELLIGENCE_READ_MODEL_V1.md");
const helper = source(
  "apps/web/src/lib/pricing/marketIntelligenceReadModelV1.ts",
);
const route = source("apps/web/src/app/api/card-pricing/route.ts");
const rail = source("apps/web/src/components/pricing/CardPagePricingRail.tsx");
const refreshWorker = source(
  "scripts/workers/tcgplayer_market_active_ask_refresh_v1.mjs",
);

test("read model is bounded, exact-printing, and snapshot-only", () => {
  assert.match(migration, /get_market_intelligence_read_model_v1/);
  assert.match(migration, /limit 500/i);
  assert.match(migration, /card_printing_id/);
  assert.match(migration, /mv_market_listing_active_ask_current_v1/);
  assert.doesNotMatch(migration, /market_listing_candidates/);
  assert.doesNotMatch(migration, /market_evidence_variant_assignments/);
  assert.doesNotMatch(migration, /market_listing_observations/);
});

test("read model suppresses stale or invalid active-ask evidence", () => {
  assert.match(migration, /interval '72 hours'/);
  assert.match(migration, /invalid_active_ask_evidence/);
  assert.match(migration, /stale_active_ask_snapshot/);
  assert.match(migration, /case when evidence\.is_usable then evidence\.lowest_active_ask else null end/);
  assert.match(migration, /case when evidence\.is_usable then evidence\.median_active_ask else null end/);
  assert.match(migration, /active_ask\.currency = 'USD'/);
  assert.match(migration, /evidence\.is_usable is not true/);
});

test("read model preserves authority and signed-in boundaries", () => {
  assert.match(migration, /'ebay_active'::text/);
  assert.match(migration, /'active_listing_ask'::text/);
  assert.match(migration, /false,\s*false/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = pg_catalog, public/);
  assert.match(migration, /revoke all[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(migration, /grant execute[\s\S]*to authenticated, service_role/i);
  assert.doesNotMatch(migration, /grant execute[\s\S]*to (public|anon)/i);
  assert.match(contract, /TCGPlayer `marketPrice` remains the Production V1 market close/);
});

test("web mapper accepts only fresh exact evidence with explicit non-price authority", () => {
  assert.match(helper, /MARKET_INTELLIGENCE_READ_MODEL_V1/);
  assert.match(helper, /row\.is_market_value !== false/);
  assert.match(helper, /row\.is_completed_sale !== false/);
  assert.match(helper, /row\.evidence_kind !== "active_listing_ask"/);
  assert.match(helper, /row\.freshness !== "fresh"/);
  assert.match(helper, /medianActiveAsk < lowestActiveAsk/);
  assert.match(helper, /get_market_intelligence_read_model_v1/);
});

test("signed-in card pricing endpoint returns both governed lanes", () => {
  assert.match(route, /getMarketIntelligenceReadModelV1/);
  assert.match(route, /Promise\.all/);
  assert.match(route, /marketIntelligenceRecords/);
  assert.match(route, /Sign in required\./);
});

test("card rail exposes evidence density without calling asks market value", () => {
  assert.match(rail, /Available Today/);
  assert.match(rail, /Lowest exact-printing eBay active ask/);
  assert.match(rail, /Median ask/);
  assert.match(rail, /active listings across/);
  assert.match(rail, /Lowest-to-median spread/);
  assert.match(rail, /evidence_strength/);
  assert.match(rail, /not a sale or market close\. It is not a market value\./);
  assert.doesNotMatch(rail, /Grookai Value/);
});

test("production readback proves grants, authority, freshness, and snapshot validity", () => {
  assert.match(readback, /anon_execute/);
  assert.match(readback, /authenticated_execute/);
  assert.match(readback, /service_role_execute/);
  assert.match(readback, /invalid_rows/);
  assert.match(readback, /stale_rows/);
  assert.match(readback, /market_value_claim_rows/);
  assert.match(readback, /completed_sale_claim_rows/);
  assert.match(readback, /authority_mismatch_rows/);
});

test("active-ask snapshot refresh uses a bounded hardened database session", () => {
  assert.match(refreshWorker, /statement_timeout/);
  assert.match(refreshWorker, /enable_nestloop/);
  assert.match(refreshWorker, /refresh materialized view concurrently public\.mv_market_listing_active_ask_current_v1/i);
  assert.match(refreshWorker, /round\(median_active_ask, 2\) < round\(lowest_active_ask, 2\)/);
});

test("active asks are normalized to positive USD currency precision before snapshotting", () => {
  assert.match(precisionMigration, /observation\.total_ask_price > 0/);
  assert.match(
    precisionMigration,
    /round\(min\(total_active_ask_price\)|round\(min\(total_ask_price\)::numeric, 2\)/,
  );
  assert.match(precisionMigration, /round\([\s\S]*percentile_cont\(0\.5\)/);
  assert.doesNotMatch(precisionMigration, /update public\./i);
  assert.doesNotMatch(precisionMigration, /delete from public\./i);
  assert.doesNotMatch(precisionMigration, /insert into public\./i);
});
