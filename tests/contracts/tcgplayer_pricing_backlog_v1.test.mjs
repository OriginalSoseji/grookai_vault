import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  evaluateTcgplayerPricingBacklogV1,
} from "../../backend/pricing/tcgplayer_pricing_backlog_policy_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKLOG_SCRIPT = readFileSync(
  path.resolve(__dirname, "..", "..", "scripts", "audits", "tcgplayer_pricing_backlog_v1.mjs"),
  "utf8",
);

test("read-only pricing backlog audit requires verified remote database TLS", () => {
  assert.match(BACKLOG_SCRIPT, /rejectUnauthorized:\s*true/);
  assert.doesNotMatch(BACKLOG_SCRIPT, /rejectUnauthorized:\s*false/);
});

const run = {
  id: "e658d577-a40c-46e8-b115-b3f9a7211507",
  run_key: "gym-release-production-20261014T0214Z",
  selected_count: 208599,
  eligible_count: 165581,
  snapshot_count: 165581,
  excluded_count: 11688,
  quarantined_count: 31330,
  delayed_count: 0,
  suppressed_count: 0,
};

const primaryReasons = [
  { decision: "quarantine", primary_reason: "missing_active_source_mapping", count: 20372 },
  { decision: "exclude", primary_reason: "missing_active_source_mapping", count: 10441 },
  { decision: "quarantine", primary_reason: "missing_printed_number_evidence", count: 7394 },
  { decision: "quarantine", primary_reason: "missing_positive_market_price", count: 1695 },
  { decision: "quarantine", primary_reason: "edition_bound_pricing_authority_required", count: 1663 },
  { decision: "exclude", primary_reason: "cosmos_assignment_required", count: 569 },
  { decision: "exclude", primary_reason: "special_variant_v1_1", count: 392 },
  { decision: "exclude", primary_reason: "edition_bound_pricing_authority_required", count: 206 },
  { decision: "quarantine", primary_reason: "missing_canonical_printing_identity", count: 205 },
  { decision: "exclude", primary_reason: "missing_printed_number_evidence", count: 34 },
  { decision: "exclude", primary_reason: "cosmos_exact_finish_required", count: 32 },
  { decision: "exclude", primary_reason: "missing_canonical_printing_identity", count: 7 },
  { decision: "exclude", primary_reason: "missing_mapping_method", count: 5 },
  { decision: "exclude", primary_reason: "missing_positive_market_price", count: 2 },
  { decision: "quarantine", primary_reason: "missing_mapping_method", count: 1 },
];

test("pricing backlog is partitioned into mutually exclusive completion lanes", () => {
  const report = evaluateTcgplayerPricingBacklogV1({ run, primaryReasons });
  assert.equal(report.status, "incomplete");
  assert.deepEqual(report.findings, []);
  assert.equal(report.counts.non_published, 43018);
  assert.equal(report.counts.primary_reason_rows, 43018);
  assert.deepEqual(
    report.lanes.map((lane) => [lane.lane_id, lane.backlog_count]),
    [
      ["identity_mapping", 30819],
      ["catalog_evidence", 7428],
      ["edition_authority", 1869],
      ["source_price", 1697],
      ["finish_assignment", 601],
      ["variant_support", 392],
      ["exact_printing", 212],
    ],
  );
  assert.equal(report.lanes.some((lane) => lane.lane_id === "unclassified"), false);
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
