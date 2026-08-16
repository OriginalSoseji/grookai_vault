import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import {
  ONE_PIECE_SEALED_PACKAGE_FORMS_V1,
  evaluateOnePieceSealedCanonicalCanaryV1,
  selectOnePieceSealedCanonicalCanaryV1,
} from "../../backend/pricing/one_piece_sealed_canonical_canary_v1.mjs";

const PLAN_PATH = new URL("../../docs/audits/pricing/" +
  "one_piece_sealed_online_evidence_resolution_v1/frozen_live_resolution_v1/" +
  "canonical_plan.json.gz", import.meta.url);

function selection() {
  return selectOnePieceSealedCanonicalCanaryV1(
    JSON.parse(gunzipSync(fs.readFileSync(PLAN_PATH))),
  );
}

function proof(selected) {
  const baseline = { card_prints: 1, sealed_product_candidates: 403 };
  return {
    transaction: { committed: false, rolled_back: true },
    readback: { expected_sha256: "a".repeat(64), actual_sha256: "a".repeat(64) },
    write_attribution: [
      ["sealed_product_families", selected.sample.families.length],
      ["sealed_product_variants", selected.sample.variants.length],
      ["sealed_product_candidate_reviews",
        selected.sample.automated_reviews.length],
      ["sealed_product_source_mappings", selected.sample.source_mappings.length],
      ["sealed_product_variant_evidence",
        selected.sample.variant_evidence.length],
    ].map(([table_name, inserted]) => ({ table_name, inserted, updated: 0,
      deleted: 0, hot_updated: 0 })),
    baseline_before: baseline,
    post_rollback: { remaining_rows: 0, baseline,
      transaction_read_only: true },
    boundaries: { database_durable_writes: 0, storage_writes: 0,
      pricing_writes: 0, publication_writes: 0 },
  };
}

test("deterministic canary spans every package form and shared-family variants", () => {
  const selected = selection();
  assert.deepEqual(selected.package_forms, [...ONE_PIECE_SEALED_PACKAGE_FORMS_V1]
    .sort());
  assert.ok(selected.sample.variants.filter((row) =>
    row.family_id === selected.multi_variant_family_id).length >= 2);
  assert.equal(new Set(selected.sample.variants.map((row) => row.id)).size,
    selected.sample.variants.length);
  assert.equal(selected.sample.source_mappings.length,
    selected.sample.variants.length);
});

test("exact rollback proof passes and any residue fails", () => {
  const selected = selection();
  const valid = proof(selected);
  assert.deepEqual(evaluateOnePieceSealedCanonicalCanaryV1({
    selection: selected,
    proof: valid,
  }), { valid: true, findings: [] });
  valid.post_rollback.remaining_rows = 1;
  const invalid = evaluateOnePieceSealedCanonicalCanaryV1({
    selection: selected,
    proof: valid,
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.findings.includes("rollback_residue_present"));
});
