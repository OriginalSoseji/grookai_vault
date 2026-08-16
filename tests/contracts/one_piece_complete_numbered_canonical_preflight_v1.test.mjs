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
import {
  buildOnePieceCompleteNumberedPromotionPlanV1,
} from "../../backend/pricing/one_piece_complete_numbered_canonical_promotion_v1.mjs";
import { sha256 } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

function jsonl(buffer, compressed = false) {
  const body = compressed ? gunzipSync(buffer).toString("utf8") :
    buffer.toString("utf8");
  return body.trim().split(/\r?\n/).map(JSON.parse);
}

const fixturePaths = {
  authoritySummary: "docs/audits/pricing/one_piece_complete_official_catalog_authority_v1/official_english_v1/summary.json",
  bindings: "docs/audits/pricing/one_piece_complete_official_catalog_authority_v1/official_english_v1/numbered_product_bindings.jsonl.gz",
  seriesSources: "docs/audits/pricing/one_piece_complete_official_catalog_authority_v1/official_english_v1/series_sources.json",
  reconciliationSummary: "docs/audits/pricing/one_piece_complete_canonical_reconciliation_v1/frozen_reconciliation_v1/summary.json",
  manifest: "docs/audits/pricing/one_piece_canonical_catalog_readiness_v1/current_complete_source_2026-08-14_v1/source_product_manifest.jsonl.gz",
  existingSt01Plan: "docs/audits/pricing/one_piece_st01_canonical_promotion_v1/frozen_plan_v1/plan.json",
};
const fixtureBodies = Object.fromEntries(Object.entries(fixturePaths)
  .map(([key, file]) => [key, fs.readFileSync(file)]));
const plan = buildOnePieceCompleteNumberedPromotionPlanV1({
  repository: {
    commit_sha: "a".repeat(40),
    branch: "agent/one-piece-ingestion-readiness-v1",
    tracked_worktree_clean: true,
  },
  inputHashes: {
    authority_summary_sha256: sha256(fixtureBodies.authoritySummary),
    numbered_bindings_gzip_sha256: sha256(fixtureBodies.bindings),
    official_series_sources_sha256: sha256(fixtureBodies.seriesSources),
    reconciliation_summary_sha256: sha256(fixtureBodies.reconciliationSummary),
    source_manifest_gzip_sha256: sha256(fixtureBodies.manifest),
    existing_st01_plan_sha256: sha256(fixtureBodies.existingSt01Plan),
  },
  authoritySummary: JSON.parse(fixtureBodies.authoritySummary),
  bindings: jsonl(fixtureBodies.bindings, true),
  seriesSources: JSON.parse(fixtureBodies.seriesSources),
  reconciliationSummary: JSON.parse(fixtureBodies.reconciliationSummary),
  manifestRows: jsonl(fixtureBodies.manifest, true),
  existingSt01Plan: JSON.parse(fixtureBodies.existingSt01Plan),
});

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
    ["protected_st01_baseline_mismatch", (value) => { value.baseline.card_prints = 16; }],
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
  assert.equal(first.row_count, 6491);
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
