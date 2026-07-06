import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

const sqlPath = "docs/sql/mee_public_pricing_bridge_variant_aware_v1_view_candidate.sql";
const functionSqlPath = "docs/sql/mee_public_pricing_bridge_variant_aware_v1_function_candidate.sql";
const readbackPath = "docs/sql/mee_public_pricing_bridge_variant_aware_v1_readback.sql";
const helperPath = "apps/web/src/lib/pricing/getCardPricingUiByCardPrintId.ts";
const routePath = "apps/web/src/app/api/card-pricing/route.ts";
const railPath = "apps/web/src/components/pricing/CardPagePricingRail.tsx";
const panelsPath = "apps/web/src/components/cards/CardPageMarketVaultPanels.tsx";
const cardPagePath = "apps/web/src/app/card/[gv_id]/page.tsx";
const addToVaultPath = "apps/web/src/components/vault/AddToVaultCardAction.tsx";

test("variant-aware bridge preserves parent bridge and adds card_printing rows", () => {
  const sql = stripSqlComments(read(sqlPath));

  assert.match(sql, /create\s+or\s+replace\s+view\s+public\.v_market_evidence_public_pricing_bridge_variant_aware_v1/i);
  assert.match(sql, /'parent'::text\s+as\s+pricing_scope/i);
  assert.match(sql, /'card_printing'::text\s+as\s+pricing_scope/i);
  assert.match(sql, /from\s+public\.v_market_evidence_public_pricing_bridge_reference_anchored_v1\s+bridge/i);
  assert.match(sql, /from\s+public\.v_market_reference_variant_signal_rollups_v1\s+reference/i);
  assert.match(sql, /from\s+public\.v_market_listing_variant_active_ask_rollups_v1\s+active/i);
  assert.match(sql, /card_printing_id/);
  assert.match(sql, /printing_gv_id/);
  assert.match(sql, /assigned_finish_key/);
});

test("bounded card-detail function filters by card_print_id before variant evidence reads", () => {
  const sql = stripSqlComments(read(functionSqlPath));

  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.get_market_evidence_public_pricing_bridge_variant_aware_v1/i);
  assert.match(sql, /p_card_print_id uuid/i);
  assert.match(sql, /returns setof public\.v_market_evidence_public_pricing_bridge_variant_aware_v1/i);
  assert.match(sql, /where bridge\.card_print_id = p_card_print_id/i);
  assert.match(sql, /where reference\.card_print_id = p_card_print_id/i);
  assert.match(sql, /where active\.card_print_id = p_card_print_id/i);
  assert.match(sql, /blocked_reference_requires_review/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /grant execute on function public\.get_market_evidence_public_pricing_bridge_variant_aware_v1\(uuid\) to authenticated, service_role/i);
});

test("variant-aware bridge keeps active ask out of Grookai Value without reference anchor", () => {
  const sql = stripSqlComments(read(sqlPath));

  assert.match(sql, /when reference_median is null then 'blocked_no_valuation_anchor'/i);
  assert.match(sql, /blocked_reference_requires_review/i);
  assert.match(sql, /when reference_median is null then null::numeric/i);
  assert.match(sql, /raw_active_ask_mid is not null as active_listing_evidence/i);
  assert.match(sql, /false as market_truth/i);
  assert.match(sql, /false as sold_comp/i);
  assert.match(sql, /false as publishable/i);
  assert.match(sql, /false as app_visible/i);

  assert.doesNotMatch(sql, /\bpricing_observations\b/i);
  assert.doesNotMatch(sql, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(sql, /\bjusttcg\b/i);
  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
});

test("readback includes Arceus Charizard variant regression and boundary guards", () => {
  const readback = stripSqlComments(read(readbackPath));

  assert.match(readback, /GV-PK-AR-1/);
  assert.match(readback, /GV-PK-ASC-276/);
  assert.match(readback, /variant_active_ask_rows/);
  assert.match(readback, /variant_grookai_value_rows/);
  assert.match(readback, /public_boundary_leak_rows/);
  assert.match(readback, /active_only_grookai_value_leak_rows/);
  assert.match(readback, /review_required_grookai_value_leak_rows/);
  assert.match(readback, /ascended_pikachu_regression_rows/);
  assert.match(readback, /printing_gv_id/);
  assert.match(readback, /assigned_finish_key/);
});

test("card detail pricing client-loads one parent-plus-variant bundle", () => {
  const helper = read(helperPath);
  const route = read(routePath);
  const page = read(cardPagePath);
  const rail = read(railPath);

  assert.match(helper, /\.rpc\("get_market_evidence_public_pricing_bridge_variant_aware_v1"/);
  assert.match(helper, /getCardPricingUiRowsByCardPrintIdWithClient/);
  assert.match(helper, /pricing_scope/);
  assert.match(helper, /card_printing_id/);
  assert.match(helper, /printing_gv_id/);
  assert.match(helper, /createServerAdminClient/);
  assert.match(route, /pricingRecords/);
  assert.match(route, /getCardPricingUiRowsByCardPrintIdWithClient/);
  assert.doesNotMatch(page, /getCardPricingUiRowsByCardPrintId/);
  assert.match(page, /Pricing is intentionally client-loaded/);
  assert.match(page, /pricingRecords=\{pricingRecords\}/);
  assert.match(rail, /\/api\/card-pricing\?/);
  assert.match(rail, /isLoadingPricing && !selectedPricing/);
});

test("variant selector drives pricing rail without per-click pricing fetches", () => {
  const rail = read(railPath);
  const panels = read(panelsPath);
  const addToVault = read(addToVaultPath);

  assert.match(rail, /selectPricingRecord/);
  assert.match(rail, /selectedCardPrintingId/);
  assert.match(rail, /selectedPrintingGvId/);
  assert.match(rail, /pricingRecords/);
  assert.match(rail, /eBay active ask for selected variant/);
  assert.match(panels, /useState<CardPrinting \| null>/);
  assert.match(panels, /selectedPrintingId/);
  assert.match(panels, /selectedPrintingGvId/);
  assert.match(panels, /onSelectedPrintingChange=\{setSelectedPrinting\}/);
  assert.match(addToVault, /onSelectedPrintingChange/);
});
