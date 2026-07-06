import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

const contractPath = "docs/contracts/MEE_PUBLIC_PRICING_BRIDGE_REFERENCE_ANCHORED_V1.md";
const auditPath = "docs/audits/market_evidence_engine_v1/MEE-PUBLIC-PRICING-BRIDGE-REFERENCE-ANCHORED-V1.md";
const currentBridgeSqlPath = "docs/sql/mee_public_price_bridge_v1.sql";
const candidateSqlPath = "docs/sql/mee_public_pricing_bridge_reference_anchored_v1_view_candidate.sql";
const readbackSqlPath = "docs/sql/mee_public_pricing_bridge_reference_anchored_v1_readback.sql";
const appCompatibilityPlanPath =
  "docs/plans/market_evidence_engine_v1/MEE_PUBLIC_PRICING_BRIDGE_REFERENCE_ANCHORED_V1_APP_COMPATIBILITY_PLAN.md";

function evaluatePricingScenario({
  referenceMid = null,
  activeAskMid = null,
  mixedRawSlab = false,
  activeCondition = "unknown",
  referenceCondition = "unknown",
} = {}) {
  if (mixedRawSlab) {
    return {
      grookaiValueAvailable: false,
      activeAskAvailable: Boolean(activeAskMid),
      status: "needs_lane_split",
    };
  }

  if (typeof referenceMid === "number" && typeof activeAskMid === "number") {
    const pressurePct = ((activeAskMid - referenceMid) / referenceMid) * 100;
    const aligned = Math.abs(pressurePct) <= 10;
    return {
      grookaiValueAvailable: true,
      activeAskAvailable: true,
      grookaiValueMayEqualActiveAsk: aligned && referenceCondition === activeCondition,
      status: pressurePct > 10 ? "active_listings_above_reference" : pressurePct < -10 ? "active_listings_below_reference" : "aligned",
      pressurePct,
    };
  }

  if (typeof referenceMid === "number") {
    return {
      grookaiValueAvailable: true,
      activeAskAvailable: false,
      status: "reference_only",
    };
  }

  if (typeof activeAskMid === "number") {
    return {
      grookaiValueAvailable: false,
      activeAskAvailable: true,
      status: "active_listing_only",
    };
  }

  return {
    grookaiValueAvailable: false,
    activeAskAvailable: false,
    status: "insufficient_evidence",
  };
}

test("reference anchored bridge contract defines evidence hierarchy and active ask separation", () => {
  const contract = read(contractPath);

  assert.match(contract, /Grookai Value is evidence-anchored/i);
  assert.match(contract, /Verified transaction evidence/i);
  assert.match(contract, /Reference valuation evidence/i);
  assert.match(contract, /Active listing evidence/i);
  assert.match(contract, /Available Today/i);
  assert.match(contract, /Active listings may nudge Grookai Value\. They must not overwrite it\./i);
  assert.match(contract, /Do not default Grookai Value to Near Mint pricing\./i);
  assert.match(contract, /Damaged, HP, MP, LP, NM/i);
  assert.match(contract, /Do not use JustTCG as public pricing\./i);
});

test("audit identifies current V1 regression source exactly", () => {
  const audit = read(auditPath);
  const sql = stripSqlComments(read(currentBridgeSqlPath));

  assert.match(audit, /GV-PK-HP-101/);
  assert.match(audit, /primary_price = 79/);
  assert.match(audit, /grookai_value = 79/);
  assert.match(audit, /market_reference_signal_rollups/);
  assert.match(audit, /reference_median = 50\.00/);
  assert.match(audit, /docs\/sql\/mee_public_price_bridge_v1\.sql/);
  assert.match(audit, /supabase\/migrations\/20260625180000_mee_public_price_bridge_v1\.sql/);

  assert.match(sql, /signal\.candidate_median\s+as\s+primary_price/i);
  assert.match(sql, /signal\.candidate_median\s+as\s+grookai_value/i);
  assert.match(sql, /'ebay'::text\s+as\s+primary_source/i);
  assert.match(sql, /signal\.source_type\s+=\s+'active_listing'/i);
});

test("reference plus eBay disagreement keeps Grookai Value separate from active ask", () => {
  const result = evaluatePricingScenario({
    referenceMid: 55,
    activeAskMid: 79,
    referenceCondition: "unknown",
    activeCondition: "nm",
  });

  assert.equal(result.grookaiValueAvailable, true);
  assert.equal(result.activeAskAvailable, true);
  assert.equal(result.status, "active_listings_above_reference");
  assert.equal(result.grookaiValueMayEqualActiveAsk, false);
  assert.ok(result.pressurePct > 40);
});

test("eBay-only evidence is active ask only, not Grookai Value", () => {
  const result = evaluatePricingScenario({ activeAskMid: 79 });

  assert.equal(result.grookaiValueAvailable, false);
  assert.equal(result.activeAskAvailable, true);
  assert.equal(result.status, "active_listing_only");
});

test("reference-only evidence can show Grookai Value without Available Today", () => {
  const result = evaluatePricingScenario({ referenceMid: 55 });

  assert.equal(result.grookaiValueAvailable, true);
  assert.equal(result.activeAskAvailable, false);
  assert.equal(result.status, "reference_only");
});

test("mixed raw and slab lanes block Grookai Value", () => {
  const result = evaluatePricingScenario({
    referenceMid: 55,
    activeAskMid: 200,
    mixedRawSlab: true,
  });

  assert.equal(result.grookaiValueAvailable, false);
  assert.equal(result.activeAskAvailable, true);
  assert.equal(result.status, "needs_lane_split");
});

test("Mightyena regression requires eBay 79 to remain active ask pressure", () => {
  const result = evaluatePricingScenario({
    referenceMid: 50,
    activeAskMid: 79,
    referenceCondition: "unknown",
    activeCondition: "nm",
  });

  assert.equal(result.grookaiValueAvailable, true);
  assert.equal(result.activeAskAvailable, true);
  assert.equal(result.status, "active_listings_above_reference");
  assert.equal(result.grookaiValueMayEqualActiveAsk, false);
  assert.ok(result.pressurePct > 50);
});

test("reference anchored SQL candidate separates Grookai Value from active ask", () => {
  const sql = stripSqlComments(read(candidateSqlPath));

  assert.match(sql, /create\s+or\s+replace\s+view\s+public\.v_market_evidence_public_pricing_bridge_reference_anchored_v1/i);
  assert.match(sql, /from\s+public\.market_reference_signal_rollups/i);
  assert.match(sql, /from\s+public\.market_listing_rollups/i);
  assert.match(sql, /reference_median/i);
  assert.match(sql, /controlled_grookai_value_mid/i);
  assert.match(sql, /active_ask_mid/i);
  assert.match(sql, /market_pressure_pct/i);
  assert.match(sql, /market_pressure_status/i);
  assert.match(sql, /grookai_value_block_reason/i);
  assert.match(sql, /blocked_no_valuation_anchor/i);
  assert.match(sql, /blocked_reference_requires_review/i);
  assert.match(sql, /reference_review_status\s+is\s+distinct\s+from\s+'review_ready_multi_source'/i);
  assert.match(sql, /raw_and_slab_available_separated/i);
  assert.match(sql, /condition_unknown_reference_range/i);

  assert.doesNotMatch(sql, /signal\.candidate_median\s+as\s+grookai_value/i);
  assert.doesNotMatch(sql, /'ebay'::text\s+as\s+primary_source/i);
  assert.doesNotMatch(sql, /\bjusttcg\b/i);
  assert.doesNotMatch(sql, /\bpricing_observations\b/i);
  assert.doesNotMatch(sql, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
});

test("reference anchored readback guards public boundary and Mightyena regression", () => {
  const readback = stripSqlComments(read(readbackSqlPath));

  assert.match(readback, /GV-PK-HP-101/);
  assert.match(readback, /GV-PK-ASC-276/);
  assert.match(readback, /active_only_grookai_value_leak_rows/);
  assert.match(readback, /disagreement_active_ask_overwrite_rows/);
  assert.match(readback, /review_required_grookai_value_leak_rows/);
  assert.match(readback, /ascended_pikachu_regression_row/);
  assert.match(readback, /writes_pricing_observations/);
  assert.match(readback, /writes_ebay_active_prices_latest/);
  assert.match(readback, /uses_justtcg_public_pricing/);
  assert.match(readback, /false::boolean\s+as\s+market_truth/i);
});

test("app compatibility plan requires two separate pricing sections", () => {
  const plan = read(appCompatibilityPlanPath);

  assert.match(plan, /Grookai Value/);
  assert.match(plan, /Available Today/);
  assert.match(plan, /grookai_value_mid/);
  assert.match(plan, /active_ask_mid/);
  assert.match(plan, /must not show a primary Grookai Value/i);
  assert.match(plan, /It must not render `\$79` as Grookai Value\./);
});
