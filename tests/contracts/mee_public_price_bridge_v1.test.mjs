import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

function loadJson(relativePath) {
  return JSON.parse(read(relativePath));
}

const bridgeSqlPath = "docs/sql/mee_public_price_bridge_v1.sql";
const readbackSqlPath = "docs/sql/mee_public_price_bridge_v1_readback.sql";
const migrationPath = "supabase/migrations/20260625180000_mee_public_price_bridge_v1.sql";
const contractPath = "docs/contracts/MEE_PUBLIC_PRICE_BRIDGE_V1.md";
const checkpointPath = "docs/checkpoints/market_evidence_engine/MEE_PUBLIC_PRICE_BRIDGE_V1.md";
const remoteApplyReportPath = "docs/audits/market_evidence_engine_v1/MEE-PUBLIC-PRICE-BRIDGE-V1-REMOTE-SCHEMA-APPLY/report.json";
const remoteApplyMarkdownPath = "docs/audits/market_evidence_engine_v1/MEE-PUBLIC-PRICE-BRIDGE-V1-REMOTE-SCHEMA-APPLY.md";
const cardPricingHelperPath = "apps/web/src/lib/pricing/getCardPricingUiByCardPrintId.ts";
const publicPricingHelperPath = "apps/web/src/lib/pricing/getPublicPricingByCardIds.ts";
const cardPricingRoutePath = "apps/web/src/app/api/card-pricing/route.ts";
const pricingRailPath = "apps/web/src/components/pricing/CardPagePricingRail.tsx";
const pricingDisclosurePath = "apps/web/src/components/common/PricingDisclosure.tsx";

test("MEE public price bridge reads only approved internal MEE price signals", () => {
  const sql = stripSqlComments(read(bridgeSqlPath));

  assert.match(sql, /create\s+or\s+replace\s+view\s+public\.v_market_evidence_public_price_bridge_v1/i);
  assert.match(sql, /from\s+public\.v_market_evidence_internal_approved_price_signals_v1\s+signal/i);
  assert.match(sql, /signal\.source_type\s+=\s+'active_listing'/i);
  assert.match(sql, /signal\.evidence_lane\s+=\s+'raw_single'/i);
  assert.match(sql, /signal\.currency\s+=\s+'USD'/i);
  assert.match(sql, /signal\.signal_at\s+>=\s+now\(\)\s+-\s+interval\s+'14 days'/i);
});

test("MEE public price bridge labels active listing evidence without market-truth claims", () => {
  const sql = stripSqlComments(read(bridgeSqlPath));

  assert.match(sql, /'ebay'::text\s+as\s+primary_source/i);
  assert.match(sql, /'active_listing_market_estimate'::text\s+as\s+pricing_basis/i);
  assert.match(sql, /'Market estimate from active listing evidence'::text\s+as\s+display_label/i);
  assert.match(sql, /true\s+as\s+app_visible/i);
  assert.match(sql, /false\s+as\s+market_truth/i);
  assert.match(sql, /false\s+as\s+sold_comp/i);
  assert.match(sql, /true\s+as\s+active_listing_evidence/i);
  assert.match(sql, /true\s+as\s+signed_in_only/i);
});

test("MEE public price bridge exposes authenticated select only", () => {
  const sql = stripSqlComments(read(bridgeSqlPath));

  assert.match(sql, /revoke\s+all\s+on\s+public\.v_market_evidence_public_price_bridge_v1\s+from\s+public,\s+anon,\s+authenticated,\s+service_role/i);
  assert.match(sql, /grant\s+select\s+on\s+public\.v_market_evidence_public_price_bridge_v1\s+to\s+authenticated,\s+service_role/i);
  assert.match(sql, /revoke\s+all\s+on\s+public\.v_card_pricing_ui_v1\s+from\s+public,\s+anon,\s+authenticated,\s+service_role/i);
  assert.match(sql, /grant\s+select\s+on\s+public\.v_card_pricing_ui_v1\s+to\s+authenticated,\s+service_role/i);
});

test("MEE public price bridge SQL does not write legacy public pricing stores", () => {
  const sql = stripSqlComments(`${read(bridgeSqlPath)}\n${read(readbackSqlPath)}`);

  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
  assert.doesNotMatch(sql, /\bpricing_observations\b/i);
  assert.doesNotMatch(sql, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(sql, /\bjusttcg\b/i);
});

test("app pricing reads use the governed TCGPlayer market contract", () => {
  const cardHelper = read(cardPricingHelperPath);
  const publicHelper = read(publicPricingHelperPath);

  for (const helper of [cardHelper, publicHelper]) {
    assert.match(helper, /getMarketPricingReadModelV1/);
    assert.match(helper, /market_close/);
    assert.doesNotMatch(helper, /grookai_value/i);
    assert.doesNotMatch(helper, /v_card_pricing_ui_v1/);
    assert.doesNotMatch(helper, /v_best_prices_all_gv_v1/);
    assert.doesNotMatch(helper, /card_print_active_prices/);
  }
});

test("app pricing reads keep active asks separate from the market close", () => {
  const cardHelper = read(cardPricingHelperPath);
  const publicHelper = read(publicPricingHelperPath);

  assert.doesNotMatch(cardHelper, /primary_source:\s*"ebay"/);
  assert.doesNotMatch(cardHelper, /pricing_basis:\s*"active_listing_market_estimate"/);
  assert.match(cardHelper, /primary_source:\s*"tcgplayer_market"/);
  assert.match(cardHelper, /active_ask_listing_count/);
  assert.match(publicHelper, /raw_price:\s*record\.market_close/);
  assert.match(publicHelper, /raw_price_source:\s*"tcgplayer_market"/);
});

test("pricing UI copy separates TCGPlayer Market and exact active asks", () => {
  const rail = read(pricingRailPath);
  const disclosure = read(pricingDisclosurePath);

  assert.match(rail, /TCGPlayer Market/);
  assert.match(rail, /Available Today/);
  assert.match(rail, /Lowest exact-printing eBay active ask/);
  assert.match(rail, /No qualified market price/);
  assert.match(rail, /Asking-price evidence, not a sale or market close\./);
  assert.match(disclosure, /TCGPlayer&apos;s latest qualified market price/);
  assert.match(disclosure, /eBay active asks and remains separate from the market close/);
  assert.doesNotMatch(`${rail}\n${disclosure}`, /Grookai Value/);
});

test("signed-in card pricing hydration route is tracked and auth-gated", () => {
  const route = read(cardPricingRoutePath);
  const rail = read(pricingRailPath);
  const gitignore = read(".gitignore");

  assert.match(route, /getCardPricingUiRowsByCardPrintIdWithClient/);
  assert.match(route, /createRouteHandlerClient/);
  assert.match(route, /createServerAdminClient/);
  assert.match(route, /auth\.getUser\(\)/);
  assert.match(route, /auth\.getUser\(bearerToken\)/);
  assert.match(route, /extractBearerToken/);
  assert.match(route, /Sign in required\./);
  assert.match(route, /card_print_id/);
  assert.match(route, /pricingRecords/);
  assert.match(route, /Cache-Control["']:\s*["']private,\s*no-store/);
  assert.match(rail, /supabase\.auth\.getSession\(\)/);
  assert.match(rail, /Authorization:\s*`Bearer \$\{session\.access_token\}`/);
  assert.match(rail, /credentials:\s*"same-origin"/);
  assert.match(gitignore, /!apps\/web\/src\/app\/api\/card-pricing\/route\.ts/);
});

test("MEE public price bridge remote readback has closed truth boundaries", () => {
  const report = loadJson(remoteApplyReportPath);

  assert.equal(report.package_id, "MEE-PUBLIC-PRICE-BRIDGE-V1-REMOTE-SCHEMA-APPLY");
  assert.equal(report.mode, "targeted_remote_schema_apply_authenticated_public_price_bridge");
  assert.deepEqual(report.findings, []);
  assert.equal(report.readback.bridge_rows, 11);
  assert.equal(report.readback.ui_rows, 11);
  assert.equal(report.readback.boundary.market_truth_rows, 0);
  assert.equal(report.readback.boundary.sold_comp_rows, 0);
  assert.equal(report.readback.boundary.non_active_listing_rows, 0);
  assert.equal(report.readback.boundary.unexpected_source_rows, 0);
  assert.equal(report.readback.boundary.stale_rows, 0);
  assert.equal(report.readback.writes_pricing_observations, false);
  assert.equal(report.readback.writes_ebay_active_prices_latest, false);
  assert.equal(report.readback.sold_comp_truth, false);
  assert.equal(report.readback.market_truth, false);
  assert.equal(report.migration_history_marked, true);
});

test("MEE public price bridge artifacts exist", () => {
  for (const artifactPath of [bridgeSqlPath, readbackSqlPath, migrationPath, contractPath, checkpointPath, cardPricingRoutePath, pricingRailPath, remoteApplyReportPath, remoteApplyMarkdownPath]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
});
