import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const MIGRATION = readFileSync(
  path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260728060000_tcgplayer_market_read_model_performance_v1.sql",
  ),
  "utf8",
);
const REFRESH_WORKER = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "workers",
    "tcgplayer_market_active_ask_refresh_v1.mjs",
  ),
  "utf8",
);
const PIPELINE = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "workers",
    "tcgplayer_market_pipeline_v1.mjs",
  ),
  "utf8",
);

test("performance migration preserves the shared RPC contract", () => {
  assert.match(
    MIGRATION,
    /create or replace function public\.get_market_pricing_read_model_v1\(/i,
  );
  assert.match(MIGRATION, /returns table\s*\(\s*pricing_scope text/i);
  assert.match(MIGRATION, /language sql\s+stable\s+security definer/i);
  assert.match(MIGRATION, /set search_path = public/i);
  assert.match(
    MIGRATION,
    /grant execute on function public\.get_market_pricing_read_model_v1\(uuid\[\], uuid\[\]\)\s+to authenticated, service_role/i,
  );
  assert.match(
    MIGRATION,
    /revoke all on function public\.get_market_pricing_read_model_v1\(uuid\[\], uuid\[\]\)\s+from public, anon/i,
  );
});

test("performance migration scopes active asks to requested printings", () => {
  assert.match(MIGRATION, /requested_parent_prices as materialized/i);
  assert.match(MIGRATION, /requested_printing_prices as materialized/i);
  assert.match(
    MIGRATION,
    /create materialized view public\.mv_market_listing_active_ask_current_v1/i,
  );
  assert.match(
    MIGRATION,
    /mv_market_listing_active_ask_current_printing_uidx[\s\S]*card_printing_id/i,
  );
  assert.match(
    MIGRATION,
    /left join public\.mv_market_listing_active_ask_current_v1 active_ask/i,
  );
  assert.doesNotMatch(MIGRATION, /v_market_price_parent_summary_v1/i);
});

test("performance migration adds request-path indexes", () => {
  assert.match(
    MIGRATION,
    /market_price_qualification_parent_idx[\s\S]*card_print_id[\s\S]*evaluated_at desc[\s\S]*id desc/i,
  );
  assert.match(MIGRATION, /mv_market_listing_active_ask_current_parent_idx/i);
});

test("latest unavailable reasons use request-scoped lateral lookups", () => {
  assert.match(MIGRATION, /latest_parent_decisions as materialized/i);
  assert.match(MIGRATION, /latest_printing_decisions as materialized/i);
  assert.match(MIGRATION, /left join lateral/i);
  assert.match(
    MIGRATION,
    /where decision\.card_print_id = requested\.card_print_id/i,
  );
  assert.match(
    MIGRATION,
    /where decision\.card_printing_id = requested\.card_printing_id/i,
  );
});

test("performance migration does not broaden anonymous access", () => {
  assert.doesNotMatch(
    MIGRATION,
    /grant execute[\s\S]*?\bto\s+(?:public|anon)\b/i,
  );
  assert.doesNotMatch(
    MIGRATION,
    /grant select[\s\S]*?\bto\s+(?:public|anon|authenticated)\b/i,
  );
  assert.match(
    MIGRATION,
    /grant select on public\.mv_market_listing_active_ask_current_v1 to service_role/i,
  );
});

test("active asks refresh in the background and not inside product reads", () => {
  assert.match(
    REFRESH_WORKER,
    /refresh materialized view concurrently public\.mv_market_listing_active_ask_current_v1/i,
  );
  assert.match(REFRESH_WORKER, /active-ask refresh apply requires a clean tracked working tree/i);
  assert.match(REFRESH_WORKER, /active_ask_cache_write:\s*args\.apply/i);
  assert.match(
    REFRESH_WORKER,
    /select set_config\('statement_timeout', \$1, false\)/i,
  );
  assert.match(
    REFRESH_WORKER,
    /select set_config\('enable_nestloop', 'off', false\)/i,
  );
  assert.match(
    REFRESH_WORKER,
    /current_setting\('statement_timeout'\) as statement_timeout/i,
  );
  assert.match(
    REFRESH_WORKER,
    /current_setting\('enable_nestloop'\) as enable_nestloop/i,
  );
  assert.match(
    REFRESH_WORKER,
    /database_session_policy:\s*\{[\s\S]*statement_timeout:[\s\S]*enable_nestloop:\s*"off"/i,
  );
  assert.match(
    REFRESH_WORKER,
    /database_session:\s*databaseSession/i,
  );
  assert.doesNotMatch(REFRESH_WORKER, /\b(insert|update|delete)\s+(?:into|from|public\.)/i);
  assert.match(PIPELINE, /phase:\s*"active_ask_refresh"/);
  assert.match(PIPELINE, /activationMode \? "--apply" : "--dry-run"/);
});
