import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("TCGdex pricing backfill plan stays plan-only and guarded", () => {
  const script = source("scripts/audits/market_reference_tcgdex_pricing_backfill_plan_v1.mjs");
  const pkg = source("package.json");

  assert.match(script, /MEE-TCGDEX-REFERENCE-PRICING-BACKFILL-PLAN-V1/);
  assert.match(script, /ready_for_apply_package/);
  assert.match(script, /renderPreflightSql/);
  assert.match(script, /renderReadbackSql/);
  assert.match(pkg, /"mee:tcgdex-reference-pricing-audit"/);

  assert.doesNotMatch(script, /\.from\([^)]*\)[\s\S]{0,200}\.insert\s*\(/);
  assert.doesNotMatch(script, /\.from\([^)]*\)[\s\S]{0,200}\.update\s*\(/);
  assert.doesNotMatch(script, /\.from\([^)]*\)[\s\S]{0,200}\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.from\([^)]*\)[\s\S]{0,200}\.delete\s*\(/);
  assert.doesNotMatch(script, /supabase[\s\S]{0,200}\.rpc\s*\(/);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
});
