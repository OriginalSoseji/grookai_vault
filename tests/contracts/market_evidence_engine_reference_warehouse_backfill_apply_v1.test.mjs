import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  APPROVAL_TEXT,
  EXPECTED_MANIFEST_HASH,
  EXPECTED_MIGRATION_HASH,
  buildMarketReferenceWarehouseBackfillApplyReportV1,
} from "../../scripts/audits/market_reference_warehouse_backfill_apply_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("MEE-08C backfill apply package defaults to report-only mode", () => {
  const report = buildMarketReferenceWarehouseBackfillApplyReportV1({
    generatedAt: "2026-06-25T21:00:00.000Z",
  });

  assert.equal(report.mode, "dry_run_report_only");
  assert.equal(report.ready_for_apply, true);
  assert.equal(report.applied, false);
  assert.equal(report.boundary.db_writes, false);
  assert.equal(report.boundary.pricing_observations_writes, false);
  assert.equal(report.boundary.public_price_publication, false);
  assert.equal(report.manifest_hash_sha256, EXPECTED_MANIFEST_HASH);
  assert.equal(report.migration_hash_sha256, EXPECTED_MIGRATION_HASH);
  assert.deepEqual(report.findings, []);
});

test("MEE-08C blocks apply without exact final approval", () => {
  const blocked = buildMarketReferenceWarehouseBackfillApplyReportV1({
    apply: true,
    approvalText: "next step",
    generatedAt: "2026-06-25T21:00:00.000Z",
  });
  const approved = buildMarketReferenceWarehouseBackfillApplyReportV1({
    apply: true,
    approvalText: APPROVAL_TEXT,
    generatedAt: "2026-06-25T21:00:00.000Z",
  });

  assert.equal(blocked.ready_for_apply, false);
  assert.match(blocked.findings.join("\n"), /approval_text_mismatch/);
  assert.equal(approved.approval_text_matched, true);
  assert.doesNotMatch(approved.findings.join("\n"), /approval_text_mismatch/);
  assert.ok(
    approved.ready_for_apply || approved.findings.includes("payload_inputs_missing_for_apply"),
  );
});

test("MEE-08C apply package never targets pricing or identity surfaces", () => {
  const script = source("scripts/audits/market_reference_warehouse_backfill_apply_v1.mjs");
  const plan = source("docs/plans/market_evidence_engine_v1/MEE_08C_MARKET_REFERENCE_WAREHOUSE_BACKFILL_APPLY_PACKAGE_V1.md");

  assert.match(plan, /DB writer package prepared\. Not executed/);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
  assert.doesNotMatch(script, /\.from\(["']card_prints["']\)/);
  assert.doesNotMatch(script, /\.from\(["']card_printings["']\)/);
  assert.doesNotMatch(script, /\.from\(["']vault_/);
  assert.doesNotMatch(script, /\.from\(["'].*image/);
  assert.doesNotMatch(script, /\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/);
});
