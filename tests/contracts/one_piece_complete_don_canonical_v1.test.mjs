import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import {
  ONE_PIECE_COMPLETE_DON_EXPECTED,
  ONE_PIECE_COMPLETE_DON_PINNED_INPUTS,
  buildOnePieceCompleteDonPromotionPlanV1,
  expectedOnePieceCompleteDonAttributableWritesV1,
  validateOnePieceCompleteDonPromotionPlanV1,
} from "../../backend/pricing/one_piece_complete_don_canonical_v1.mjs";
import { sha256 } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

const manifestPath =
  "docs/audits/pricing/one_piece_canonical_catalog_readiness_v1/current_complete_source_2026-08-14_v1/source_product_manifest.jsonl.gz";
const summaryPath =
  "docs/audits/pricing/one_piece_complete_canonical_reconciliation_v1/frozen_reconciliation_v1/summary.json";
const lanePath =
  "docs/audits/pricing/one_piece_complete_canonical_reconciliation_v1/frozen_reconciliation_v1/don_lane.jsonl";

function jsonl(body, compressed = false) {
  const text = compressed ? gunzipSync(body).toString("utf8") : body.toString("utf8");
  return text.trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
}

let cached;
function fixture() {
  if (cached) return cached;
  const manifest = fs.readFileSync(manifestPath);
  const summary = fs.readFileSync(summaryPath);
  const lane = fs.readFileSync(lanePath);
  cached = buildOnePieceCompleteDonPromotionPlanV1({
    repository: { commit_sha: "a".repeat(40),
      branch: "agent/one-piece-ingestion-readiness-v1",
      tracked_worktree_clean: true },
    inputHashes: {
      source_manifest_gzip_sha256: sha256(manifest),
      reconciliation_summary_sha256: sha256(summary),
      don_lane_sha256: sha256(lane),
    },
    manifestRows: jsonl(manifest, true),
    donLane: jsonl(lane),
  });
  return cached;
}

test("DON plan accounts for all current, language-held, and future products", () => {
  const plan = fixture();
  assert.deepEqual(plan.counts, ONE_PIECE_COMPLETE_DON_EXPECTED);
  assert.equal(validateOnePieceCompleteDonPromotionPlanV1(plan).valid, true);
  assert.equal(plan.payload.don_cards.length, 222);
  assert.equal(plan.payload.non_english_language_holds.length, 1);
  assert.equal(plan.payload.future_or_presale_holds.length, 2);
});

test("repeated DON names remain product-specific identities", () => {
  const rows = fixture().payload.don_cards.filter((row) =>
    row.source_product_name === "DON!! Card");
  assert.ok(rows.length > 1);
  assert.equal(new Set(rows.map((row) => row.card_print.id)).size, rows.length);
  assert.equal(new Set(rows.map((row) => row.identity.identity_key_hash)).size,
    rows.length);
});

test("DON identity is unnumbered, hidden, reference-only, and not visual authority", () => {
  const row = fixture().payload.don_cards[0];
  assert.equal(row.card_print.number, null);
  assert.equal(row.identity.printed_number, "DON!!");
  assert.equal(row.card_print.image_url, null);
  assert.equal(row.source_evidence.evidence_payload.authority
    .official_visual_variant_authority, false);
  assert.equal(row.card_print.data_quality_flags.app_visibility,
    "hidden_by_game_release_control");
});

test("tampering and scope expansion fail closed", () => {
  for (const mutate of [
    (plan) => { plan.payload.don_cards[0].card_print.image_url = "https://x"; },
    (plan) => { plan.payload.don_cards[0].identity.identity_key_hash = "0".repeat(64); },
    (plan) => { plan.payload.future_or_presale_holds.pop(); },
    (plan) => { plan.boundaries.publication_writes = 1; },
  ]) {
    const plan = structuredClone(fixture());
    mutate(plan);
    assert.equal(validateOnePieceCompleteDonPromotionPlanV1(plan).valid, false);
  }
});

test("pinned source hashes and write contract remain exact", () => {
  assert.deepEqual(ONE_PIECE_COMPLETE_DON_PINNED_INPUTS, {
    source_manifest_gzip_sha256:
      "973bec5c186adc8853dcff91218e1057772aea384f9a3318919fb03b9c39bc0e",
    reconciliation_summary_sha256:
      "830418974b7eea09ce92f9197d0b39f643b40bd79029fcc4a84ed4e1f09d72f3",
    don_lane_sha256:
      "941c24025dafbdd705a9c373d8977eac9d818cd02e14cbfc386f226cd918a825",
  });
  assert.deepEqual(expectedOnePieceCompleteDonAttributableWritesV1(), {
    sets: 1,
    card_prints: 222,
    card_print_identity: 222,
    card_print_identity_source_evidence: 222,
    external_mappings: 222,
  });
});
