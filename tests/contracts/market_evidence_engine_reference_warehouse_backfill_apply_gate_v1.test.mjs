import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  APPROVAL_TEXT,
  EXPECTED_MANIFEST_HASH,
  EXPECTED_MIGRATION_HASH,
  EXPECTED_ROW_COUNTS,
  buildMarketReferenceWarehouseBackfillApplyGateReportV1,
} from "../../scripts/audits/market_reference_warehouse_backfill_apply_gate_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("MEE-08B gate validates manifest and migration without DB writes", () => {
  const report = buildMarketReferenceWarehouseBackfillApplyGateReportV1({
    generatedAt: "2026-06-25T20:30:00.000Z",
  });

  assert.equal(report.mode, "gate_report_only");
  assert.equal(report.ready_for_apply_plan, true);
  assert.equal(report.applied, false);
  assert.equal(report.manifest_hash_sha256, EXPECTED_MANIFEST_HASH);
  assert.equal(report.migration_hash_sha256, EXPECTED_MIGRATION_HASH);
  assert.deepEqual(report.proposed_table_row_counts, EXPECTED_ROW_COUNTS);
  assert.equal(report.boundary.db_writes, false);
  assert.equal(report.boundary.pricing_observations_writes, false);
  assert.equal(report.boundary.public_price_publication, false);
  assert.deepEqual(report.findings, []);
});

test("MEE-08B gate requires exact approval text for apply-plan mode", () => {
  const blocked = buildMarketReferenceWarehouseBackfillApplyGateReportV1({
    applyPlan: true,
    approvalText: "next step",
    generatedAt: "2026-06-25T20:30:00.000Z",
  });
  const approved = buildMarketReferenceWarehouseBackfillApplyGateReportV1({
    applyPlan: true,
    approvalText: APPROVAL_TEXT,
    generatedAt: "2026-06-25T20:30:00.000Z",
  });

  assert.equal(blocked.ready_for_apply_plan, false);
  assert.match(blocked.findings.join("\n"), /approval_text_mismatch/);
  assert.equal(approved.ready_for_apply_plan, true);
  assert.equal(approved.approval_text_matched, true);
  assert.deepEqual(approved.findings, []);
});

test("MEE-08B script and plan stay apply-plan only", () => {
  const script = source("scripts/audits/market_reference_warehouse_backfill_apply_gate_v1.mjs");
  const plan = source("docs/plans/market_evidence_engine_v1/MEE_08B_MARKET_REFERENCE_WAREHOUSE_BACKFILL_APPLY_PLAN_V1.md");
  const combined = `${script}\n${plan}`;

  assert.match(plan, /Apply-plan gate only/);
  assert.match(plan, /No database writes/);
  assert.match(plan, /No pricing_observations writes/);
  assert.doesNotMatch(combined, /createBackendClient|createClient|supabase\.from|\.insert\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/);
});
