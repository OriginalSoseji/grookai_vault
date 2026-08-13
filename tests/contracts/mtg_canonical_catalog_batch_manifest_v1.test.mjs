import assert from "node:assert/strict";
import test from "node:test";

import { buildMtgCanonicalCandidateV1 } from "../../backend/pricing/mtg_canonical_catalog_candidate_v1.mjs";
import { buildMtgCanaryPayloadV1 } from "../../scripts/audits/mtg_canonical_catalog_canary_plan_v1.mjs";
import {
  pickNextMtgCatalogBatchV1,
  resolveMtgSetMetadataV1,
  validateMtgCatalogBatchManifestV1,
} from "../../scripts/audits/mtg_canonical_catalog_batch_manifest_v1.mjs";

function candidate(setType = "commander") {
  return buildMtgCanonicalCandidateV1({
    id: "572feb8c-6976-40a8-8a34-b4db836cca56",
    oracle_id: "bdcb7aed-3595-4c7e-b9da-543e92de919a",
    name: "Test Card",
    lang: "en",
    games: ["paper"],
    digital: false,
    set_id: "d7beb4b7-e1ff-4d35-ab07-5700f17ea1ea",
    set: "tst",
    set_name: "Test Set",
    set_type: setType,
    released_at: "2025-06-13",
    collector_number: "1",
    layout: "normal",
    finishes: ["nonfoil"],
    rarity: "common",
  });
}

test("catalog set payload supports non-expansion sets without inventing a set role", () => {
  const payload = buildMtgCanaryPayloadV1(
    {
      candidates: [candidate()],
      warehouseProducts: new Map(),
      sourceBulkSha256: "a".repeat(64),
      stagingMigrationSha256: "b".repeat(64),
      foundationMigrationSha256: "c".repeat(64),
      repository: { commit_sha: "d".repeat(40), branch: "test" },
    },
    {
      plan_version: "MTG_CANONICAL_CATALOG_SET_BATCH_V1",
      require_expansion: false,
      quality_flag: "mtg_catalog_set_batch_v1",
      include_source_card_release_evidence: true,
    },
  );
  assert.equal(payload.rows.sets[0].set_role, null);
  assert.equal(payload.rows.card_prints[0].data_quality_flags.mtg_catalog_set_batch_v1, true);
  assert.equal(payload.rows.card_prints[0].data_quality_flags.mtg_catalog_canary, undefined);
  assert.equal(payload.plan_version, "MTG_CANONICAL_CATALOG_SET_BATCH_V1");
  assert.equal(payload.rows.external_mappings[0].meta.source_card_released_at, "2025-06-13");
});

test("set metadata abstains at set level while preserving card-level release evidence", () => {
  const first = candidate();
  const second = {
    ...candidate(),
    card: { ...candidate().card, source_print_id: "00000000-0000-4000-8000-000000000002" },
    set: { ...candidate().set, released_at: "2026-01-01" },
  };
  const resolved = resolveMtgSetMetadataV1([first, second]);
  assert.equal(resolved.set.released_at, null);
  assert.deepEqual(resolved.observed_release_dates, ["2025-06-13", "2026-01-01"]);
  assert.equal(
    resolved.release_date_resolution,
    "card_level_values_preserved_set_level_abstained",
  );
  assert.equal(resolved.candidates[0].source_card_released_at, "2025-06-13");
  assert.equal(resolved.candidates[1].source_card_released_at, "2026-01-01");
});

test("existing canary payload defaults remain unchanged", () => {
  const payload = buildMtgCanaryPayloadV1({
    candidates: [candidate("expansion")],
    warehouseProducts: new Map(),
    sourceBulkSha256: "a".repeat(64),
    stagingMigrationSha256: "b".repeat(64),
    foundationMigrationSha256: "c".repeat(64),
    repository: { commit_sha: "d".repeat(40), branch: "test" },
  });
  assert.equal(payload.rows.sets[0].set_role, "expansion");
  assert.equal(payload.rows.card_prints[0].data_quality_flags.mtg_catalog_canary, true);
  assert.equal(payload.plan_version, "MTG_CANONICAL_CATALOG_CANARY_PLAN_V1");
});

test("manifest validation protects frozen source and DSK subtraction", () => {
  const manifest = {
    source: {
      bulk_sha256: "a",
      warehouse_sha256: "b",
      candidate_payload_sha256: "c",
    },
    coverage: {
      total_candidate_count: 104712,
      total_set_count: 953,
      already_canonical_set_count: 1,
      already_canonical_parent_count: 417,
      remaining_parent_count: 104295,
    },
    batches: [{ writer_payload_fingerprint: "d" }],
  };
  const reconciliation = {
    source_bulk: { sha256: "a" },
    warehouse_snapshot: { sha256: "b" },
    reconciliation: {
      candidate_payload_sha256: "c",
      eligible_candidate_count: 104712,
      canonical_set_candidate_count: 953,
    },
  };
  assert.deepEqual(validateMtgCatalogBatchManifestV1(manifest, reconciliation), []);
  manifest.coverage.remaining_parent_count = 104294;
  assert.deepEqual(validateMtgCatalogBatchManifestV1(manifest, reconciliation), [
    "remaining_parent_count_mismatch",
  ]);
});

test("bounded selector excludes unreleased and weakly mapped sets", () => {
  const base = {
    catalog_state: "not_staged",
    set_type: "expansion",
    quarantined_collision_lanes: 0,
    candidate_count: 200,
    positive_market_lanes: 200,
    price_lane_coverage: 1,
  };
  const rows = [
    { ...base, code: "future", released_at: "2026-11-13" },
    { ...base, code: "weak", released_at: "2026-07-01", price_lane_coverage: 0.5 },
    { ...base, code: "ready", released_at: "2026-06-26" },
  ];
  assert.equal(pickNextMtgCatalogBatchV1(rows, "2026-08-13").code, "ready");
});
