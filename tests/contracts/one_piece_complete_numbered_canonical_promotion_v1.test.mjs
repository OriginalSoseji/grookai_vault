import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import {
  ONE_PIECE_COMPLETE_NUMBERED_EXPECTED,
  ONE_PIECE_COMPLETE_NUMBERED_PINNED_INPUTS,
  buildOnePieceCompleteNumberedPromotionPlanV1,
  buildOnePieceCompleteStagingBindingV1,
  expectedOnePieceCompleteNumberedAttributableWritesV1,
  validateOnePieceCompleteNumberedPromotionPlanV1,
} from "../../backend/pricing/one_piece_complete_numbered_canonical_promotion_v1.mjs";
import { sha256 } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

const root = process.cwd();
const paths = {
  authoritySummary: `${root}/docs/audits/pricing/one_piece_complete_official_catalog_authority_v1/official_english_v1/summary.json`,
  bindings: `${root}/docs/audits/pricing/one_piece_complete_official_catalog_authority_v1/official_english_v1/numbered_product_bindings.jsonl.gz`,
  seriesSources: `${root}/docs/audits/pricing/one_piece_complete_official_catalog_authority_v1/official_english_v1/series_sources.json`,
  reconciliationSummary: `${root}/docs/audits/pricing/one_piece_complete_canonical_reconciliation_v1/frozen_reconciliation_v1/summary.json`,
  manifest: `${root}/docs/audits/pricing/one_piece_canonical_catalog_readiness_v1/current_complete_source_2026-08-14_v1/source_product_manifest.jsonl.gz`,
  existingSt01Plan: `${root}/docs/audits/pricing/one_piece_st01_canonical_promotion_v1/frozen_plan_v1/plan.json`,
};

function jsonl(body, compressed = false) {
  const text = compressed ? gunzipSync(body).toString("utf8") : body.toString("utf8");
  return text.trim().split(/\r?\n/).map(JSON.parse);
}

let cachedPlan;

function fixture() {
  if (cachedPlan) return cachedPlan;
  const bodies = Object.fromEntries(Object.entries(paths).map(([key, file]) =>
    [key, fs.readFileSync(file)]));
  cachedPlan = buildOnePieceCompleteNumberedPromotionPlanV1({
    repository: {
      commit_sha: "a".repeat(40),
      branch: "agent/one-piece-ingestion-readiness-v1",
      tracked_worktree_clean: true,
    },
    inputHashes: {
      authority_summary_sha256: sha256(bodies.authoritySummary),
      numbered_bindings_gzip_sha256: sha256(bodies.bindings),
      official_series_sources_sha256: sha256(bodies.seriesSources),
      reconciliation_summary_sha256: sha256(bodies.reconciliationSummary),
      source_manifest_gzip_sha256: sha256(bodies.manifest),
      existing_st01_plan_sha256: sha256(bodies.existingSt01Plan),
    },
    authoritySummary: JSON.parse(bodies.authoritySummary),
    bindings: jsonl(bodies.bindings, true),
    seriesSources: JSON.parse(bodies.seriesSources),
    reconciliationSummary: JSON.parse(bodies.reconciliationSummary),
    manifestRows: jsonl(bodies.manifest, true),
    existingSt01Plan: JSON.parse(bodies.existingSt01Plan),
  });
  return cachedPlan;
}

test("complete promotion plan accounts for every current numbered product", () => {
  const plan = fixture();
  assert.deepEqual(plan.counts, ONE_PIECE_COMPLETE_NUMBERED_EXPECTED);
  assert.equal(validateOnePieceCompleteNumberedPromotionPlanV1(plan).valid, true);
  assert.equal(plan.payload.numbered_cards.length, 6491);
  assert.equal(plan.payload.retained_existing_rows.length, 17);
  assert.equal(plan.payload.authority_holds.length, 17);
  assert.equal(plan.payload.non_english_language_holds.length, 22);
});

test("new parent identities remain product-specific without collapsing numbers", () => {
  const plan = fixture();
  const repeated = plan.payload.numbered_cards.filter((row) =>
    row.card_number === "OP01-001");
  assert.ok(repeated.length > 1);
  assert.equal(new Set(repeated.map((row) => row.card_print.id)).size,
    repeated.length);
  assert.equal(new Set(repeated.map((row) =>
    row.identity.identity_key_hash)).size, repeated.length);
});

test("durable staging evidence is deterministically traceable", () => {
  const plan = fixture();
  const row = plan.payload.numbered_cards[0];
  assert.match(row.staging.staging_row_id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(row.source_evidence.evidence_payload.durable_staging.staging_row_id,
    row.staging.staging_row_id);
  assert.equal(row.source_evidence.evidence_payload.durable_staging
    .staging_payload_sha256, row.staging.staging_payload_sha256);
});

test("official holds, ST-01 rows, and images remain outside the write payload", () => {
  const plan = fixture();
  const newProducts = new Set(plan.payload.numbered_cards.map((row) =>
    row.source_product_id));
  assert.ok(plan.payload.retained_existing_rows.every((row) =>
    !newProducts.has(row.source_product_id)));
  assert.ok(plan.payload.authority_holds.every((row) =>
    !newProducts.has(row.source_product_id)));
  assert.ok(plan.payload.non_english_language_holds.every((row) =>
    !newProducts.has(row.source_product_id) && row.language_key !== "en"));
  assert.ok(plan.payload.numbered_cards.every((row) =>
    row.card_print.image_url === null && row.card_print.image_alt_url === null));
});

test("set release dates use the strongest source family instead of promo variants", () => {
  const plan = fixture();
  const sets = new Map(plan.payload.set_rows.map((row) => [row.code, row]));
  assert.equal(sets.get("OP01").release_date, "2022-12-02");
  assert.equal(sets.get("EB01").release_date, "2024-05-03");
  assert.equal(sets.get("P").release_date, null);
  assert.equal(sets.get("EB04").release_date, null);
  assert.equal(sets.get("OP01").source.source_release_date_policy,
    "strongest_source_group_unique_number_coverage");
});

test("tampering with identity, evidence, or boundaries fails closed", () => {
  for (const mutate of [
    (plan) => { plan.payload.numbered_cards[0].identity.identity_key_hash = "0".repeat(64); },
    (plan) => { plan.payload.numbered_cards[0].staging.staging_payload_sha256 = null; },
    (plan) => { plan.boundaries.image_pointer_writes = 1; },
    (plan) => { plan.payload.authority_holds.pop(); },
  ]) {
    const plan = structuredClone(fixture());
    mutate(plan);
    assert.equal(validateOnePieceCompleteNumberedPromotionPlanV1(plan).valid, false);
  }
});

test("pinned inputs and attributable write contract remain exact", () => {
  assert.deepEqual(ONE_PIECE_COMPLETE_NUMBERED_PINNED_INPUTS, {
    authority_summary_sha256: "1e5c0978f82121ed68c0cb1e080798529cd6c49b22ef5adcc4d65b87732f6ebc",
    numbered_bindings_gzip_sha256: "e57edabca8c86fa5555c1069ea2430bd0490613171e48ebe4ab709648332b9c6",
    official_series_sources_sha256: "d20fba9f8beaa1ceb2e3f3410f0bba2d24fdf90dab3bdb7f63319e6c3f157cbc",
    reconciliation_summary_sha256: "830418974b7eea09ce92f9197d0b39f643b40bd79029fcc4a84ed4e1f09d72f3",
    source_manifest_gzip_sha256: "973bec5c186adc8853dcff91218e1057772aea384f9a3318919fb03b9c39bc0e",
    existing_st01_plan_sha256: "10b238edc52ab8fa1271481231e6803553814c451f348d19e6e459017d9bf5e3",
  });
  assert.deepEqual(expectedOnePieceCompleteNumberedAttributableWritesV1(), {
    sets: 58,
    card_prints: 6491,
    card_print_identity: 6491,
    card_print_identity_source_evidence: 6491,
    external_mappings: 6491,
  });
});

test("staging binding changes when source evidence changes", () => {
  const row = {
    source_group_id: 10,
    source_product_id: 20,
    source_payload_hash: "a".repeat(64),
  };
  const first = buildOnePieceCompleteStagingBindingV1(row);
  const second = buildOnePieceCompleteStagingBindingV1({ ...row, extra: true });
  assert.equal(first.staging_row_id, second.staging_row_id);
  assert.notEqual(first.staging_payload_sha256, second.staging_payload_sha256);
});
