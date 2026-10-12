import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateTcgplayerPricingBacklogV1,
} from "../../backend/pricing/tcgplayer_pricing_backlog_policy_v1.mjs";

const run = {
  id: "e658d577-a40c-46e8-b115-b3f9a7211507",
  run_key: "production-2026-10-11",
  selected_count: 208458,
  eligible_count: 165591,
  snapshot_count: 165591,
  excluded_count: 11673,
  quarantined_count: 31194,
  delayed_count: 0,
  suppressed_count: 0,
};

const primaryReasons = [
  { decision: "quarantine", primary_reason: "missing_active_source_mapping", count: 20257 },
  { decision: "exclude", primary_reason: "missing_active_source_mapping", count: 10634 },
  { decision: "quarantine", primary_reason: "missing_printed_number_evidence", count: 7390 },
  { decision: "quarantine", primary_reason: "missing_canonical_printing_identity", count: 1861 },
  { decision: "quarantine", primary_reason: "missing_positive_market_price", count: 1685 },
  { decision: "exclude", primary_reason: "cosmos_assignment_required", count: 569 },
  { decision: "exclude", primary_reason: "special_variant_v1_1", count: 392 },
  { decision: "exclude", primary_reason: "missing_printed_number_evidence", count: 34 },
  { decision: "exclude", primary_reason: "cosmos_exact_finish_required", count: 32 },
  { decision: "exclude", primary_reason: "missing_canonical_printing_identity", count: 7 },
  { decision: "exclude", primary_reason: "missing_mapping_method", count: 5 },
  { decision: "quarantine", primary_reason: "missing_mapping_method", count: 1 },
];

test("pricing backlog is partitioned into mutually exclusive completion lanes", () => {
  const report = evaluateTcgplayerPricingBacklogV1({ run, primaryReasons });
  assert.equal(report.status, "incomplete");
  assert.deepEqual(report.findings, []);
  assert.equal(report.counts.non_published, 42867);
  assert.equal(report.counts.primary_reason_rows, 42867);
  assert.deepEqual(
    report.lanes.map((lane) => [lane.lane_id, lane.backlog_count]),
    [
      ["identity_mapping", 30897],
      ["catalog_evidence", 7424],
      ["exact_printing", 1868],
      ["source_price", 1685],
      ["finish_assignment", 601],
      ["variant_support", 392],
    ],
  );
});

test("a missing primary-reason row invalidates the backlog instead of hiding work", () => {
  const report = evaluateTcgplayerPricingBacklogV1({
    run,
    primaryReasons: primaryReasons.slice(1),
  });
  assert.equal(report.status, "invalid");
  assert.ok(report.findings.includes("primary_reason_partition_mismatch"));
});

test("zero backlog is the only complete pricing state", () => {
  const report = evaluateTcgplayerPricingBacklogV1({
    run: {
      ...run,
      selected_count: 100,
      eligible_count: 100,
      snapshot_count: 100,
      excluded_count: 0,
      quarantined_count: 0,
    },
  });
  assert.equal(report.status, "complete");
  assert.equal(report.counts.non_published, 0);
});
