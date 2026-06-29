import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildFreeReferenceCoverageGapV1 } from "../../backend/pricing/market_evidence_free_reference_coverage_gap_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const batch = {
  contract: "MARKET_EVIDENCE_ENGINE_V1",
  phase: "MEE-04C_RAW_EVIDENCE_ACQUISITION_BATCH_V1",
  items: [
    { card_print_id: "11111111-1111-1111-1111-111111111111", gv_id: "GV-PK-BS-4", name: "Charizard", set_code: "base1", number_plain: "4", source: "tcgcsv_reference" },
    { card_print_id: "11111111-1111-1111-1111-111111111111", gv_id: "GV-PK-BS-4", name: "Charizard", set_code: "base1", number_plain: "4", source: "pokemontcg_io_reference" },
    { card_print_id: "22222222-2222-2222-2222-222222222222", gv_id: "GV-PK-MISS-1", name: "Missingmon", set_code: "miss", number_plain: "1", source: "tcgcsv_reference" },
    { card_print_id: "22222222-2222-2222-2222-222222222222", gv_id: "GV-PK-MISS-1", name: "Missingmon", set_code: "miss", number_plain: "1", source: "pokemontcg_io_reference" },
  ],
};

const tcgcsvAcquisition = {
  contract: "MARKET_EVIDENCE_ENGINE_V1",
  phase: "MEE-06B_TCGCSV_REFERENCE_EVIDENCE_V1",
  summary: { candidate_evidence_count: 4 },
  reviewed_targets: [
    { card_print_id: "11111111-1111-1111-1111-111111111111", gv_id: "GV-PK-BS-4", status: "candidate_evidence_created", candidate_count: 4 },
    { card_print_id: "22222222-2222-2222-2222-222222222222", gv_id: "GV-PK-MISS-1", status: "no_tcgcsv_product_price_match", candidate_count: 0 },
  ],
};

const pokemonTcgAcquisition = {
  contract: "MARKET_EVIDENCE_ENGINE_V1",
  phase: "MEE-06A_POKEMONTCG_IO_REFERENCE_EVIDENCE_V1",
  summary: { candidate_evidence_count: 9 },
  reviewed_targets: [
    { card_print_id: "11111111-1111-1111-1111-111111111111", gv_id: "GV-PK-BS-4", status: "candidate_evidence_created", candidate_count: 9 },
    { card_print_id: "22222222-2222-2222-2222-222222222222", gv_id: "GV-PK-MISS-1", status: "missing_pokemonapi_external_id", candidate_count: 0 },
  ],
};

const tcgcsvNormalized = {
  contract: "MARKET_EVIDENCE_ENGINE_V1",
  phase: "MEE-06C_NORMALIZED_REFERENCE_EVIDENCE_V1",
  input_summary: { source_phase: "MEE-06B_TCGCSV_REFERENCE_EVIDENCE_V1" },
  summary: { model_eligible_count: 1 },
  counts: { disposition_counts: {}, quality_flag_counts: {} },
  normalized_evidence: [
    { card_print_id: "11111111-1111-1111-1111-111111111111", model_eligible: true },
  ],
};

const pokemonTcgNormalized = {
  contract: "MARKET_EVIDENCE_ENGINE_V1",
  phase: "MEE-06C_NORMALIZED_REFERENCE_EVIDENCE_V1",
  input_summary: { source_phase: "MEE-06A_POKEMONTCG_IO_REFERENCE_EVIDENCE_V1" },
  summary: { model_eligible_count: 1 },
  counts: { disposition_counts: {}, quality_flag_counts: {} },
  normalized_evidence: [
    { card_print_id: "11111111-1111-1111-1111-111111111111", model_eligible: true },
  ],
};

test("MEE-06D compares free reference lane coverage without writes", () => {
  const analysis = buildFreeReferenceCoverageGapV1({
    batch,
    tcgcsvAcquisition,
    tcgcsvNormalized,
    pokemonTcgAcquisition,
    pokemonTcgNormalized,
    generatedAt: "2026-06-25T18:00:00.000Z",
  });

  assert.equal(analysis.mode, "local_free_reference_coverage_gap_only");
  assert.equal(analysis.boundary.provider_calls, false);
  assert.equal(analysis.boundary.source_fetches, false);
  assert.equal(analysis.boundary.db_writes, false);
  assert.equal(analysis.boundary.pricing_rollups, false);
  assert.equal(analysis.boundary.public_price_publication, false);
  assert.equal(analysis.summary.target_count, 2);
  assert.equal(analysis.summary.covered_target_count, 1);
  assert.equal(analysis.summary.uncovered_target_count, 1);
  assert.equal(analysis.counts.coverage_bucket_counts.both_model_eligible, 1);
  assert.equal(analysis.counts.coverage_bucket_counts.no_model_eligible_reference, 1);
  assert.equal(analysis.counts.miss_reason_counts.tcgcsv_product_gap_and_missing_pokemonapi_mapping, 1);
});

test("MEE-06D labels products that exist upstream but have no price rows", () => {
  const analysis = buildFreeReferenceCoverageGapV1({
    batch,
    tcgcsvAcquisition: {
      ...tcgcsvAcquisition,
      reviewed_targets: [
        tcgcsvAcquisition.reviewed_targets[0],
        {
          ...tcgcsvAcquisition.reviewed_targets[1],
          status: "no_tcgcsv_price_rows_for_product",
          matched_product_count: 1,
        },
      ],
    },
    tcgcsvNormalized,
    pokemonTcgAcquisition,
    pokemonTcgNormalized,
  });

  assert.equal(
    analysis.counts.miss_reason_counts.tcgcsv_product_has_no_price_rows_and_missing_pokemonapi_mapping,
    1,
  );
});

test("MEE-06D script stays artifact-only and source-aware", () => {
  const moduleSource = source("backend/pricing/market_evidence_free_reference_coverage_gap_v1.mjs");
  const scriptSource = source("scripts/audits/market_evidence_engine_free_reference_coverage_gap_v1.mjs");
  const pkg = source("package.json");

  assert.match(pkg, /"mee:free-reference-gap"/);
  assert.match(scriptSource, /MEE-06B_TCGCSV_REFERENCE_EVIDENCE_V1/);
  assert.match(scriptSource, /MEE-06A_POKEMONTCG_IO_REFERENCE_EVIDENCE_V1/);
  assert.match(moduleSource, /tcgcsv_product_gap_and_missing_pokemonapi_mapping/);
  assert.match(moduleSource, /tcgcsv_product_has_no_price_rows/);

  const combined = `${moduleSource}\n${scriptSource}`;
  assert.doesNotMatch(combined, /createBackendClient|fetch\s*\(|axios|https\.request|curl\.exe|execFile/);
  assert.doesNotMatch(combined, /\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/);
});
