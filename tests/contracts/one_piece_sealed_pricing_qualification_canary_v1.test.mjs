import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import {
  evaluateOnePieceSealedPricingQualificationCanaryV1,
  normalizeOnePieceSealedPricingQualificationRowsV1,
  selectOnePieceSealedPricingQualificationCanaryV1,
} from "../../backend/pricing/one_piece_sealed_pricing_qualification_canary_v1.mjs";
import { parseArgs } from
  "../../scripts/audits/one_piece_sealed_pricing_qualification_rollback_canary_v1.mjs";

const plan = JSON.parse(gunzipSync(fs.readFileSync(
  "docs/audits/pricing/one_piece_sealed_pricing_lineage_v1/" +
  "production_read_only_v1/qualification_plan.json.gz")));

function databasePlan() {
  const rows = plan.qualification_rows.map((row, index) => ({
    id: `00000000-0000-5000-8000-${String(index).padStart(12, "0")}`,
    variant_id: row.variant_id,
    source_mapping_id: row.source_mapping_id,
    source_price_row_identity: row.source_price_row_identity,
    source_subtype_name_normalized: row.source_subtype_name_normalized,
    observed_on: row.observed_on,
    currency: row.currency,
    qualification_status: row.qualification_status,
    qualification_evidence: { decision: { status: row.qualification_status } },
    source_observation_fingerprint: row.source_observation_fingerprint,
    qualification_contract_version: "ONE_PIECE_SEALED_PRICING_QUALIFICATION_V1",
    publication_authority: false,
  }));
  return { payload: { qualification_rows: rows } };
}

function validProof(selection) {
  const baseline = { qualifications: 0, releases: 0 };
  return { preflight: { valid: true },
    transaction: { committed: false, rolled_back: true },
    baseline_before: baseline,
    transaction_readback:
      normalizeOnePieceSealedPricingQualificationRowsV1(selection.rows),
    write_attribution: [{
      table_name: "sealed_product_pricing_lane_qualifications",
      inserted: 3, updated: 0, deleted: 0, hot_updated: 0,
    }],
    post_rollback: { transaction_read_only: true,
      remaining_target_rows: 0, baseline },
    boundaries: { durable_database_writes: 0, release_writes: 0,
      publication_writes: 0, app_visibility_changes: 0 } };
}

test("canary selects exactly one row from each persisted decision class", () => {
  const selection = selectOnePieceSealedPricingQualificationCanaryV1(
    databasePlan());
  assert.deepEqual(selection.statuses,
    ["qualified_exact", "blocked_stale", "blocked_missing_price"]);
  assert.equal(selection.rows.length, 3);
});

test("exact rollback proof passes and residue or extra writes fail", () => {
  const selection = selectOnePieceSealedPricingQualificationCanaryV1(
    databasePlan());
  assert.deepEqual(evaluateOnePieceSealedPricingQualificationCanaryV1({
    selection, proof: validProof(selection) }), { valid: true, findings: [] });
  const bad = validProof(selection);
  bad.post_rollback.remaining_target_rows = 1;
  bad.write_attribution.push({ table_name: "sealed_product_releases",
    inserted: 1, updated: 0, deleted: 0, hot_updated: 0 });
  const result = evaluateOnePieceSealedPricingQualificationCanaryV1({
    selection, proof: bad });
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes("post_rollback_residue"));
  assert.ok(result.findings.includes("write_attribution_mismatch"));
});

test("executor is inert without explicit hashes and cannot commit", () => {
  assert.throws(() => parseArgs([]), /execute-rollback-canary/);
  assert.throws(() => parseArgs(["--execute-rollback-canary"]), /Exact head SHA/);
  const args = parseArgs(["--execute-rollback-canary",
    `--expected-head-sha=${"a".repeat(40)}`,
    `--expected-plan-fingerprint=${"b".repeat(64)}`,
    `--expected-payload-fingerprint=${"c".repeat(64)}`]);
  assert.equal(args.execute, true);
  const source = fs.readFileSync(
    "scripts/audits/one_piece_sealed_pricing_qualification_rollback_canary_v1.mjs",
    "utf8");
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /client\.query\("rollback"\)/);
  assert.doesNotMatch(source, /client\.query\(["']commit["']\)/i);
  assert.doesNotMatch(source,
    /update\s+public\.|delete\s+from\s+public\.|truncate\s+/i);
  assert.equal((source.match(/insert into public\./gi) ?? []).length, 1);
});
