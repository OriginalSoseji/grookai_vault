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
    "supabase/migrations/20260730180000_tcgplayer_market_parent_summary_runtime_repair_v1.sql",
  ),
  "utf8",
);

test("parent summary materializes the governed current publication once", () => {
  assert.match(
    MIGRATION,
    /current_prices as materialized\s*\(\s*select \*\s*from public\.v_market_price_current_v1\s*\)/i,
  );
  assert.equal(
    (
      MIGRATION.match(
        /from public\.v_market_price_current_v1/gi,
      ) ?? []
    ).length,
    1,
  );
  assert.match(
    MIGRATION,
    /ranked_parent_prices as materialized[\s\S]*from current_prices current_price/i,
  );
  assert.match(
    MIGRATION,
    /parent_active_asks as materialized[\s\S]*from current_prices current_price/i,
  );
});

test("runtime repair preserves deterministic parent-price semantics", () => {
  assert.match(
    MIGRATION,
    /count\(\*\) over \(\s*partition by current_price\.card_print_id\s*\)::integer as eligible_printing_count/i,
  );
  assert.match(
    MIGRATION,
    /row_number\(\) over \(\s*partition by current_price\.card_print_id\s*order by\s*current_price\.market_price asc,\s*current_price\.published_at desc,\s*current_price\.observed_at desc,\s*current_price\.card_printing_id asc\s*\) as parent_price_rank/i,
  );
  assert.match(MIGRATION, /where selected\.parent_price_rank = 1/i);
  assert.match(
    MIGRATION,
    /selected\.market_price::numeric as market_close/i,
  );
  assert.doesNotMatch(
    MIGRATION,
    /\b(?:avg|max)\s*\(\s*current_price\.market_price/i,
  );
});

test("runtime repair preserves traced exact identity and active-ask source", () => {
  assert.match(
    MIGRATION,
    /selected\.provenance_id,[\s\S]*selected\.card_printing_id,[\s\S]*selected\.printing_gv_id,[\s\S]*selected\.finish_key,[\s\S]*selected\.published_at/i,
  );
  assert.match(
    MIGRATION,
    /left join public\.mv_market_listing_active_ask_current_v1 active_ask/i,
  );
  assert.doesNotMatch(
    MIGRATION,
    /v_market_listing_variant_active_ask_exact_v1/i,
  );
});

test("runtime repair retains service-only parent-summary access", () => {
  assert.match(
    MIGRATION,
    /revoke all on public\.v_market_price_parent_summary_v1\s+from public, anon, authenticated/i,
  );
  assert.match(
    MIGRATION,
    /grant select on public\.v_market_price_parent_summary_v1 to service_role/i,
  );
  assert.doesNotMatch(
    MIGRATION,
    /grant select on public\.v_market_price_parent_summary_v1 to (?:public|anon|authenticated)/i,
  );
});
