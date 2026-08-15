import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildOnePieceSealedPricingLineageAuditV1,
  classifyOnePieceSealedPriceLineageV1,
  evaluateOnePieceSealedPricingLineageAuditV1,
} from "../../backend/pricing/one_piece_sealed_pricing_lineage_v1.mjs";

function canonical(index = 1) {
  return { variant_id: `variant-${index}`, family_id: `family-${index}`,
    source_mapping_id: `mapping-${index}`, source_product_id: index,
    source_product_name: `Product ${index}`, package_form: "box",
    language_code: "en", source_active: true,
    catalog_metadata_status: "current", canonical_lineage_exact: true };
}

function price(index = 1, overrides = {}) {
  return { product_id: index, source_price_row_identity: `price-${index}`,
    subtype_name_normalized: "normal", observed_on: "2026-08-15",
    currency: "USD", market_price: 10, low_price: 8,
    payload_hash: "a".repeat(64), ...overrides };
}

function proof() {
  const baseline = { qualifications: 0, releases: 0 };
  return { transaction_read_only: true, default_transaction_read_only: true,
    transaction_closed_before_artifacts: true, write_attribution: [],
    baseline_before: baseline, baseline_after: baseline };
}

test("evidence policy distinguishes exact, missing, stale, and ambiguous rows", () => {
  const base = { canonical: canonical(), authorityObservedOn: "2026-08-15" };
  assert.equal(classifyOnePieceSealedPriceLineageV1({ ...base,
    latestPrices: [price()] }).qualification_status, "qualified_exact");
  const missing = classifyOnePieceSealedPriceLineageV1({ ...base,
    latestPrices: [] });
  assert.equal(missing.qualification_status, "blocked_missing_observation");
  assert.equal(missing.persistable_in_existing_qualification_table, false);
  assert.equal(classifyOnePieceSealedPriceLineageV1({ ...base,
    latestPrices: [price(1, { market_price: null })] })
    .qualification_status, "blocked_missing_price");
  assert.equal(classifyOnePieceSealedPriceLineageV1({ ...base,
    latestPrices: [price(1, { observed_on: "2026-08-07" })] })
    .qualification_status, "blocked_stale");
  assert.equal(classifyOnePieceSealedPriceLineageV1({ ...base,
    latestPrices: [price(), price(1, { subtype_name_normalized: "foil" })] })
    .qualification_status, "blocked_ambiguous");
});

test("low price never substitutes for a null TCGPlayer market price", () => {
  const result = classifyOnePieceSealedPriceLineageV1({ canonical: canonical(),
    authorityObservedOn: "2026-08-15",
    latestPrices: [price(1, { market_price: null, low_price: 4.25 })] });
  assert.equal(result.qualification_status, "blocked_missing_price");
  assert.equal(result.market_price, null);
  assert.equal(result.low_price, 4.25);
});

test("complete 390-row read-only audit validates", () => {
  const canonicalRows = Array.from({ length: 390 }, (_, index) =>
    canonical(index + 1));
  const latestPriceRows = canonicalRows.map((row) => price(row.source_product_id));
  const audit = buildOnePieceSealedPricingLineageAuditV1({ canonicalRows,
    latestPriceRows, latestSync: { status: "completed",
      observed_on: "2026-08-15" } });
  assert.equal(audit.status_counts.qualified_exact, 390);
  assert.deepEqual(evaluateOnePieceSealedPricingLineageAuditV1({
    audit, proof: proof() }), { valid: true, findings: [] });
});

test("lineage drift and any read-only baseline mutation fail", () => {
  const canonicalRows = Array.from({ length: 390 }, (_, index) =>
    canonical(index + 1));
  canonicalRows[0].canonical_lineage_exact = false;
  const audit = buildOnePieceSealedPricingLineageAuditV1({ canonicalRows,
    latestPriceRows: canonicalRows.map((row) => price(row.source_product_id)),
    latestSync: { status: "completed", observed_on: "2026-08-15" } });
  const badProof = proof();
  badProof.baseline_after = { qualifications: 1, releases: 0 };
  const result = evaluateOnePieceSealedPricingLineageAuditV1({
    audit, proof: badProof });
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes("canonical_lineage_drift:variant-1"));
  assert.ok(result.findings.includes("protected_baseline_changed"));
});

test("pricing-lineage audit is statically read-only", () => {
  const source = fs.readFileSync(new URL("../../scripts/audits/" +
    "one_piece_sealed_pricing_lineage_v1.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /insert\s+into\s+public\./i);
  assert.doesNotMatch(source, /update\s+public\./i);
  assert.doesNotMatch(source, /delete\s+from\s+public\./i);
  assert.match(source, /default_transaction_read_only=on/i);
  assert.match(source, /repeatable read read only/i);
});
