import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import {
  ONE_PIECE_COMPLETE_DON_BASELINE,
  buildOnePieceCompleteDonApplyPlanV1,
  evaluateOnePieceCompleteDonPreflightV1,
  evaluateOnePieceCompleteDonReadbackV1,
  evaluateOnePieceCompleteDonWritesV1,
  expectedOnePieceCompleteDonReadbackV1,
  selectOnePieceCompleteDonCanaryV1,
  validateOnePieceCompleteDonApplyPlanV1,
} from "../../backend/pricing/one_piece_complete_don_canonical_gate_v1.mjs";

const plan = JSON.parse(gunzipSync(fs.readFileSync(
  "docs/audits/pricing/one_piece_complete_don_canonical_v1/frozen_plan_v1/promotion_plan.json.gz")));

function stagingRows() {
  return plan.payload.don_cards.map((row) => ({
    id: row.staging.staging_row_id,
    batch_id: row.staging.staging_batch_id,
    source_product_id: row.source_product_id,
    source_group_id: row.source_group_id,
    record_class: "exact_single_card_candidate",
    single_card_kind: "don_card",
    language_key: "en",
    promotion_state: "current_candidate",
    payload_sha256: row.staging.staging_payload_sha256,
    source_payload_hash: row.staging.source_payload_hash,
  }));
}

test("production preflight accepts only exact hidden collision-free state", () => {
  const snapshot = {
    transaction_read_only: true,
    foundation: { game_count: 1,
      game_id: "4f504300-0000-4000-8000-000000000001",
      release_count: 1, release_status: "hidden",
      anon_visible: false, authenticated_visible: false,
      service_role_visible: false },
    baseline: ONE_PIECE_COMPLETE_DON_BASELINE,
    schema: Object.fromEntries(["games", "sets", "card_prints",
      "card_print_identity", "card_print_identity_source_evidence",
      "external_mappings", "one_piece_canonical_import_rows",
      "catalog_game_release_controls"].map((key) => [key, true])),
    staging_rows: stagingRows(),
    collisions: { set_ids: 0, set_codes: 0, card_print_ids: 0,
      card_print_gv_ids: 0, card_print_tcgplayer_ids: 0,
      card_external_ids: 0, identity_ids: 0, identity_hashes: 0,
      identity_card_print_ids: 0, evidence_ids: 0, evidence_hashes: 0,
      evidence_acquisition_keys: 0, external_mappings: 0 },
    blocking_pids: [],
  };
  assert.equal(evaluateOnePieceCompleteDonPreflightV1({ plan, snapshot }).valid,
    true);
  snapshot.collisions.external_mappings = 1;
  assert.equal(evaluateOnePieceCompleteDonPreflightV1({ plan, snapshot }).valid,
    false);
});

test("five-row rollback sample spans distinct DON evidence forms", () => {
  const sample = selectOnePieceCompleteDonCanaryV1(plan);
  assert.equal(sample.don_cards.length, 5);
  assert.equal(new Set(sample.don_cards.map((row) => row.source_product_id)).size,
    5);
  assert.ok(sample.don_cards.some((row) => row.source_product_name.includes("Gold")));
  assert.ok(sample.don_cards.some((row) =>
    row.source_product_name.includes("Alternate Art")));
});

test("exact durable readback and write attribution pass", () => {
  const readback = expectedOnePieceCompleteDonReadbackV1(plan);
  assert.deepEqual(evaluateOnePieceCompleteDonReadbackV1({ plan, readback }), []);
  readback.authenticated_visible = true;
  assert.deepEqual(evaluateOnePieceCompleteDonReadbackV1({ plan, readback }),
    ["visibility_mismatch:authenticated_visible"]);
  const writes = Object.entries({ sets: 1, card_prints: 222,
    card_print_identity: 222, card_print_identity_source_evidence: 222,
    external_mappings: 222 }).map(([table_name, inserted]) => ({
    table_name, inserted, updated: 0, deleted: 0, hot_updated: 0,
  }));
  assert.deepEqual(evaluateOnePieceCompleteDonWritesV1(writes), []);
  writes[0].updated = 1;
  assert.deepEqual(evaluateOnePieceCompleteDonWritesV1(writes),
    ["attributable_writes_mismatch"]);
});

test("apply plan binds immutable proofs and fails closed on scope expansion", () => {
  const preflight = { status: "production_read_only_preflight_passed",
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    preflight_fingerprint_sha256: "b".repeat(64), findings: [] };
  const canary = { status: "production_rollback_canary_passed",
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    canary_fingerprint_sha256: "c".repeat(64), findings: [] };
  const applyPlan = buildOnePieceCompleteDonApplyPlanV1({
    repository: { commit_sha: "a".repeat(40) }, promotionPlan: plan,
    preflightSummary: preflight, canarySummary: canary,
    proofHashes: { preflight_summary_sha256: "d".repeat(64),
      canary_summary_sha256: "e".repeat(64) },
  });
  assert.equal(validateOnePieceCompleteDonApplyPlanV1(applyPlan, plan).valid,
    true);
  applyPlan.boundaries.pricing_writes = 1;
  assert.equal(validateOnePieceCompleteDonApplyPlanV1(applyPlan, plan).valid,
    false);
});

test("gate runner exposes read-only preflight and guarded apply modes", () => {
  const source = fs.readFileSync(
    "scripts/audits/one_piece_complete_don_canonical_gate_v1.mjs", "utf8");
  assert.match(source, /begin transaction isolation level repeatable read read only/);
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /--expected-apply-plan-fingerprint/);
  assert.equal(source.match(/client\.query\("commit"\)/g)?.length, 1);
  assert.doesNotMatch(source,
    /\bupdate\s+public\.|\bdelete\s+from\s+public\.|\btruncate\b/i);
});
