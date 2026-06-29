import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

test("market listing nightly ingest contract blocks public pricing and requires strict filtering", () => {
  const md = readFileSync(new URL("../../docs/contracts/MARKET_LISTING_NIGHTLY_INGEST_V1.md", import.meta.url), "utf8");
  const jsonText = readFileSync(new URL("../../docs/contracts/MARKET_LISTING_NIGHTLY_INGEST_V1.json", import.meta.url), "utf8");
  const contract = JSON.parse(jsonText);

  assert.equal(contract.contract, "MARKET_LISTING_NIGHTLY_INGEST_V1");
  assert.equal(contract.status, "candidate");
  assert.equal(contract.strict_filtering.filter_before_median, true);
  assert.equal(contract.strict_filtering.separate_raw_single_and_slab, true);
  assert.equal(contract.required_row_flags.needs_review, true);
  assert.equal(contract.required_row_flags.can_publish_price_directly, false);
  assert.equal(contract.required_row_flags.publishable, false);
  assert.equal(contract.required_row_flags.app_visible, false);
  assert.equal(contract.required_row_flags.market_truth, false);

  for (const blocked of [
    "pricing_observations",
    "ebay_active_prices_latest",
    "card_prints",
    "card_printings",
    "public_pricing_views",
  ]) {
    assert.ok(contract.blocked_writes.includes(blocked), `${blocked} must be blocked`);
  }

  for (const allowed of [
    "market_listing_acquisition_runs",
    "market_listing_query_cache",
    "market_listing_raw_snapshots",
    "market_listing_observations",
    "market_listing_seller_snapshots",
    "market_listing_price_events",
    "market_listing_card_candidates",
    "market_listing_rollups",
  ]) {
    assert.ok(contract.allowed_tables.includes(allowed), `${allowed} must be explicitly allowed`);
  }

  assert.match(md, /Nightly listing ingestion may collect and organize evidence\. It must not publish market truth\./);
  assert.match(md, /Apply strict title evidence filtering before rollup medians are calculated/);
  assert.match(md, /No public pricing views/);
  assert.match(md, /No app-visible pricing/);
  assert.match(md, /No pricing_observations writes/);
  assert.match(md, /No ebay_active_prices_latest writes/);
  assert.match(md, /No card_prints\/card_printings writes/);
  assert.match(md, /No migrations/);
  assert.match(md, /Contract hash: \{contract_hash\}/);
  assert.match(sha256(jsonText), /^[a-f0-9]{64}$/);
});
