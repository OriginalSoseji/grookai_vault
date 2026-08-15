import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import {
  ONE_PIECE_COMPLETE_NUMBERED_BASELINE,
  ONE_PIECE_COMPLETE_NUMBERED_REQUIRED_SCHEMA,
  evaluateOnePieceCompleteNumberedPreflightV1,
  expectedOnePieceCompleteNumberedRetainedRowsV1,
  expectedOnePieceCompleteNumberedStagingRowsV1,
  summarizeOnePieceCompleteNumberedStagingV1,
} from "../../backend/pricing/one_piece_complete_numbered_canonical_preflight_v1.mjs";

const plan = JSON.parse(gunzipSync(fs.readFileSync(
  "docs/audits/pricing/one_piece_complete_numbered_canonical_promotion_v1/frozen_plan_v1/promotion_plan.json.gz",
)).toString("utf8"));

function cleanSnapshot() {
  return {
    transaction_read_only: true,
    foundation: {
      game_count: 1,
      game_id: "4f504300-0000-4000-8000-000000000001",
      release_count: 1,
      release_status: "hidden",
      release_version: "ONE_PIECE_CANONICAL_CATALOG_FOUNDATION_V1",
      anon_visible: false,
      authenticated_visible: false,
      service_role_visible: false,
    },
    baseline: structuredClone(ONE_PIECE_COMPLETE_NUMBERED_BASELINE),
    schema: Object.fromEntries(ONE_PIECE_COMPLETE_NUMBERED_REQUIRED_SCHEMA
      .map((table) => [table, true])),
    retained_rows: expectedOnePieceCompleteNumberedRetainedRowsV1(plan),
    staging_rows: expectedOnePieceCompleteNumberedStagingRowsV1(plan),
    collisions: {
      set_ids: 0,
      set_codes: 0,
      card_print_ids: 0,
      card_print_gv_ids: 0,
      card_print_tcgplayer_ids: 0,
      card_external_ids: 0,
      identity_ids: 0,
      identity_hashes: 0,
      identity_card_print_ids: 0,
      evidence_ids: 0,
      evidence_hashes: 0,
      evidence_acquisition_keys: 0,
      external_mappings: 0,
    },
    blocking_pids: [],
  };
}

test("clean complete-numbered production preflight passes", () => {
  const result = evaluateOnePieceCompleteNumberedPreflightV1({
    plan,
    snapshot: cleanSnapshot(),
  });
  assert.deepEqual(result, { valid: true, findings: [] });
});

test("staging, retained rows, collisions, visibility, and baseline drift fail closed", () => {
  for (const [expected, mutate] of [
    ["durable_staging_readback_mismatch", (value) => value.staging_rows.pop()],
    ["retained_st01_readback_mismatch", (value) => value.retained_rows.pop()],
    ["collision:card_print_ids", (value) => { value.collisions.card_print_ids = 1; }],
    ["foundation_visibility_open:authenticated",
      (value) => { value.foundation.authenticated_visible = true; }],
    ["protected_st01_baseline_mismatch", (value) => { value.baseline.card_prints = 30; }],
  ]) {
    const snapshot = cleanSnapshot();
    mutate(snapshot);
    const result = evaluateOnePieceCompleteNumberedPreflightV1({ plan, snapshot });
    assert.equal(result.valid, false);
    assert.ok(result.findings.includes(expected));
  }
});

test("staging summary is stable and binds all evidence hashes", () => {
  const rows = expectedOnePieceCompleteNumberedStagingRowsV1(plan);
  const first = summarizeOnePieceCompleteNumberedStagingV1(rows);
  const second = summarizeOnePieceCompleteNumberedStagingV1([...rows].reverse());
  assert.deepEqual(first, second);
  assert.equal(first.row_count, 6513);
});

test("preflight runner writes its plan before opening a read-only transaction", () => {
  const source = fs.readFileSync(
    "scripts/audits/one_piece_complete_numbered_canonical_preflight_v1.mjs",
    "utf8",
  );
  assert.ok(source.indexOf('writeJson(path.join(args.outDir, "run_plan.json")') <
    source.indexOf("const snapshot = await captureOnePieceCompleteNumberedPreflightV1("));
  assert.match(source, /client\.query\("begin read only"\)/);
  assert.match(source, /from public\.games where code='one_piece'/);
  assert.doesNotMatch(source, /public\.catalog_games/);
  assert.doesNotMatch(source, /client\.query\(`\s*(?:insert|update|delete|truncate|alter|create|drop)\b/i);
});
