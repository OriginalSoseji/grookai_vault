import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");

function read(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

const MIGRATION = read(
  "supabase/migrations/20260728130000_tcgplayer_market_read_model_contract_completion_v1.sql",
);
const WEB_READ_MODEL = read(
  "apps/web/src/lib/pricing/marketPricingReadModelV1.ts",
);
const WEB_PUBLIC_PRICING = read(
  "apps/web/src/lib/pricing/getPublicPricingByCardIds.ts",
);
const WEB_PRICING_RAIL = read(
  "apps/web/src/components/pricing/CardPagePricingRail.tsx",
);
const FLUTTER_PRICING = read(
  "lib/services/public/card_surface_pricing_service.dart",
);
const FLUTTER_NETWORK = read(
  "lib/services/network/network_stream_service.dart",
);
const LOCAL_PUBLICATION_SMOKE = read(
  "scripts/audits/tcgplayer_market_publication_local_smoke_v1.mjs",
);
const PRODUCT_CONTRACT = read(
  "docs/contracts/TCGPLAYER_MARKET_PRICING_PRODUCT_V1.md",
);

test("contract-completion migration safely replaces the unchanged RPC signature", () => {
  assert.match(
    MIGRATION,
    /drop function if exists public\.get_market_pricing_read_model_v1\(uuid\[\], uuid\[\]\)/i,
  );
  assert.match(
    MIGRATION,
    /create function public\.get_market_pricing_read_model_v1\(\s*p_card_print_ids uuid\[\] default null,\s*p_card_printing_ids uuid\[\] default null\s*\)/i,
  );
  assert.match(MIGRATION, /language sql\s+stable\s+security definer/i);
  assert.match(MIGRATION, /set search_path = public/i);
});

test("shared contract exposes publication timestamps for parent and exact rows", () => {
  assert.match(
    MIGRATION,
    /observed_at timestamptz,\s*published_at timestamptz,\s*freshness text/i,
  );
  assert.match(
    MIGRATION,
    /parent\.observed_at,\s*parent\.published_at,\s*coalesce\(parent\.freshness/i,
  );
  assert.match(
    MIGRATION,
    /exact\.observed_at,\s*exact\.published_at,\s*coalesce\(exact\.freshness/i,
  );
});

test("parent market close is the deterministic minimum eligible exact printing", () => {
  assert.match(MIGRATION, /ranked_parent_prices as materialized/i);
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
  assert.doesNotMatch(MIGRATION, /\bavg\s*\(\s*current_price\.market_price/i);
});

test("parent rows retain the selected exact identity and trace without changing scope", () => {
  assert.match(
    MIGRATION,
    /'parent'::text,\s*requested\.card_print_id,\s*parent\.card_printing_id,\s*card\.gv_id,\s*parent\.printing_gv_id,\s*parent\.finish_key/i,
  );
  assert.match(
    MIGRATION,
    /selected\.eligible_printing_count,\s*\(selected\.eligible_printing_count > 1\) as is_from_price/i,
  );
  assert.match(
    MIGRATION,
    /selected\.observed_at,\s*selected\.published_at,\s*selected\.freshness,\s*selected\.provenance_id/i,
  );
  assert.match(
    MIGRATION,
    /when parent\.is_from_price then 'From TCGPlayer Market'\s*else 'TCGPlayer Market'/i,
  );
});

test("RPC access remains authenticated and service-role only", () => {
  assert.match(
    MIGRATION,
    /revoke all on function public\.get_market_pricing_read_model_v1\(uuid\[\], uuid\[\]\)\s+from public, anon, authenticated, service_role/i,
  );
  assert.match(
    MIGRATION,
    /grant execute on function public\.get_market_pricing_read_model_v1\(uuid\[\], uuid\[\]\)\s+to authenticated, service_role/i,
  );
  assert.doesNotMatch(
    MIGRATION,
    /grant execute[\s\S]*?\bto\s+(?:public|anon)\b/i,
  );
});

test("ranked discovery reads use the same traced parent semantics", () => {
  assert.match(
    MIGRATION,
    /create or replace view public\.v_market_price_parent_summary_v1 as[\s\S]*ranked_parent_prices as/i,
  );
  assert.match(
    MIGRATION,
    /left join public\.mv_market_listing_active_ask_current_v1 active_ask/i,
  );
  assert.doesNotMatch(
    MIGRATION,
    /left join public\.v_market_listing_variant_active_ask_exact_v1 active_ask/i,
  );
  assert.match(
    MIGRATION,
    /drop function if exists public\.get_top_market_pricing_v1\(integer\)/i,
  );
  assert.match(
    MIGRATION,
    /create function public\.get_top_market_pricing_v1\(p_limit integer default 100\)[\s\S]*published_at timestamptz/i,
  );
  assert.match(
    MIGRATION,
    /parent\.provenance_id,\s*parent\.card_printing_id,\s*parent\.printing_gv_id,\s*parent\.finish_key,\s*parent\.published_at/i,
  );
  assert.match(
    MIGRATION,
    /revoke all on function public\.get_top_market_pricing_v1\(integer\)\s+from public, anon, authenticated, service_role/i,
  );
  assert.match(
    MIGRATION,
    /grant execute on function public\.get_top_market_pricing_v1\(integer\)\s+to authenticated, service_role/i,
  );
});

test("web pricing records require and preserve published_at", () => {
  assert.match(WEB_READ_MODEL, /published_at: string \| null/);
  assert.match(WEB_READ_MODEL, /published_at: string;/);
  assert.match(
    WEB_READ_MODEL,
    /const observedAt = validTimestamp\(row\.observed_at\);[\s\S]*?const publishedAt = validTimestamp\(row\.published_at\);/,
  );
  assert.match(WEB_READ_MODEL, /!observedAt \|\|\s*!publishedAt/);
  assert.match(WEB_READ_MODEL, /published_at: publishedAt/);
  assert.match(WEB_PUBLIC_PRICING, /updated_at: record\.published_at/);
  assert.match(WEB_PUBLIC_PRICING, /last_snapshot_at: record\.published_at/);
});

test("exact finish selection cannot mistake a parent From row for an exact row", () => {
  assert.match(
    WEB_PRICING_RAIL,
    /record\.pricing_scope === "card_printing" &&\s*record\.card_printing_id === selectedCardPrintingId/,
  );
  assert.match(
    WEB_PRICING_RAIL,
    /record\.pricing_scope === "card_printing" &&\s*record\.printing_gv_id === selectedPrintingGvId/,
  );
});

test("Flutter shared pricing models preserve the publication timestamp", () => {
  assert.match(FLUTTER_PRICING, /final DateTime\? publishedAt;/);
  assert.match(
    FLUTTER_PRICING,
    /final publishedAt = DateTime\.tryParse\(\(row\['published_at'\]/,
  );
  assert.match(FLUTTER_PRICING, /publishedAt == null/);
  assert.match(FLUTTER_PRICING, /publishedAt: publishedAt/);
  assert.match(
    FLUTTER_NETWORK,
    /CardSurfacePricingService\.fetchByCardPrintIds\(/,
  );
  assert.doesNotMatch(
    FLUTTER_NETWORK,
    /publishedAt: DateTime\.tryParse\(_nullable\(row\['published_at'\]\)/,
  );
});

test("local publication smoke proves parent and exact contract parity", () => {
  assert.match(LOCAL_PUBLICATION_SMOKE, /"--mode=production"/);
  assert.doesNotMatch(LOCAL_PUBLICATION_SMOKE, /"--limit=1"/);
  assert.match(LOCAL_PUBLICATION_SMOKE, /assertLocalUrl\(url\)/);
  assert.match(
    LOCAL_PUBLICATION_SMOKE,
    /canonicalName: `Pricing Smoke Pikachu \$\{fixtureSuffix\}`/,
  );
  assert.match(
    LOCAL_PUBLICATION_SMOKE,
    /canonicalNumber: `SMOKE-\$\{fixtureSuffix\}`/,
  );
  assert.match(
    LOCAL_PUBLICATION_SMOKE,
    /get_market_pricing_read_model_v1\(\s*array\[\$1\]::uuid\[\],\s*array\[\$2\]::uuid\[\]\s*\)/,
  );
  assert.match(LOCAL_PUBLICATION_SMOKE, /assert\.equal\(authenticated\.rowCount, 2\)/);
  assert.match(
    LOCAL_PUBLICATION_SMOKE,
    /assert\.equal\(readRow\.card_printing_id, fixture\.cardPrintingId\)/,
  );
  assert.match(LOCAL_PUBLICATION_SMOKE, /assert\.ok\(readRow\.published_at\)/);
  assert.match(
    LOCAL_PUBLICATION_SMOKE,
    /assert\.equal\(readRow\.provenance_id, current\.rows\[0\]\.provenance_id\)/,
  );
  assert.match(
    LOCAL_PUBLICATION_SMOKE,
    /assert\.equal\(parentPublishedAt, exactPublishedAt\)/,
  );
});

test("governing product contract documents traced parent summary semantics", () => {
  assert.match(
    PRODUCT_CONTRACT,
    /one eligible exact printing exposes that printing's identity/i,
  );
  assert.match(
    PRODUCT_CONTRACT,
    /deterministic minimum[\s\S]*selected minimum printing's identity, timestamps, and\s+provenance/i,
  );
  assert.match(PRODUCT_CONTRACT, /pricing_scope = parent/);
});
