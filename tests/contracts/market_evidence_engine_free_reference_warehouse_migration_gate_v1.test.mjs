import assert from "node:assert/strict";
import test from "node:test";

import {
  APPROVAL_TEXT,
  EXPECTED_PACKAGE_FINGERPRINT,
  EXPECTED_SQL_HASH,
  buildMarketReferenceWarehouseMigrationGateReportV1,
} from "../../scripts/audits/market_reference_warehouse_migration_gate_v1.mjs";

test("MEE-07D gate reports ready without applying when hashes and boundaries match", () => {
  const report = buildMarketReferenceWarehouseMigrationGateReportV1({
    generatedAt: "2026-06-25T20:00:00.000Z",
  });

  assert.equal(report.mode, "gate_report_only");
  assert.equal(report.ready, true);
  assert.equal(report.applied, false);
  assert.equal(report.candidate_sql_hash_sha256, EXPECTED_SQL_HASH);
  assert.equal(report.package_fingerprint_sha256, EXPECTED_PACKAGE_FINGERPRINT);
  assert.equal(report.approval_required, true);
  assert.equal(report.approval_text_matched, false);
  assert.equal(report.migration_exists, true);
  assert.equal(report.migration_matches_candidate, true);
  assert.deepEqual(report.findings, []);
});

test("MEE-07D gate blocks apply without exact approval text", () => {
  const report = buildMarketReferenceWarehouseMigrationGateReportV1({
    apply: true,
    approvalText: "next step",
    generatedAt: "2026-06-25T20:00:00.000Z",
  });

  assert.equal(report.mode, "apply_requested");
  assert.equal(report.ready, false);
  assert.equal(report.applied, false);
  assert.equal(report.approval_text_matched, false);
  assert.match(report.findings.join("\n"), /approval_text_mismatch/);
});

test("MEE-07D gate accepts only the exact approval packet text", () => {
  const report = buildMarketReferenceWarehouseMigrationGateReportV1({
    apply: true,
    approvalText: APPROVAL_TEXT,
    generatedAt: "2026-06-25T20:00:00.000Z",
  });

  assert.equal(report.ready, true);
  assert.equal(report.approval_text_matched, true);
  assert.equal(report.migration_exists, true);
  assert.equal(report.migration_matches_candidate, true);
  assert.deepEqual(report.findings, []);
});
