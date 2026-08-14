import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildMtgWarehousePricingIndexV1,
  classifyMtgUnmappedPrintingGapV1,
  isMtgShadowQualificationCandidateV1,
  markMtgMappingCollisionsV1,
  MTG_PRICING_RECONCILIATION_BOUNDARIES_V1,
  parseMtgTcgplayerLaneIdentityV1,
  reconcileMtgExternalPrintingMappingV1,
} from "../../backend/pricing/mtg_exact_printing_pricing_reconciliation_v1.mjs";
import {
  buildMtgPricingCoverageRowsV1,
  readGzipJsonlLogicalEvidenceV1,
  writeDeterministicGzipJsonlPartsV1,
} from "../../scripts/audits/mtg_exact_printing_pricing_reconciliation_v1.mjs";

function warehouse(rows = []) {
  return buildMtgWarehousePricingIndexV1(rows);
}

function fixture(overrides = {}) {
  const productId = overrides.productId ?? 123;
  const finish = overrides.finish ?? "foil";
  return {
    mapping: {
      card_printing_id: "printing-1",
      source: "tcgplayer_market",
      external_id: `${productId}:${finish}`,
      active: true,
      meta: {
        product_id: productId,
        source_subtype: finish,
        source_print_id: "scryfall-1",
      },
      ...overrides.mapping,
    },
    printing: {
      id: "printing-1",
      card_print_id: "card-1",
      finish_key: finish,
      printing_gv_id: `GV-MTG-1-${finish.toUpperCase()}`,
      ...overrides.printing,
    },
    cardPrint: {
      id: "card-1",
      name: "Test Card",
      number: "12a",
      ...overrides.cardPrint,
    },
    set: {
      ordinal: 1,
      source_set_id: "set-1",
      code: "tst",
      name: "Test Set",
      ...overrides.set,
    },
  };
}

test("TCGPlayer lane identity requires an exact product and subtype", () => {
  assert.deepEqual(parseMtgTcgplayerLaneIdentityV1("123:Foil"), {
    product_id: 123,
    source_subtype: "foil",
    source_lane_identity: "123:foil",
  });
  assert.equal(parseMtgTcgplayerLaneIdentityV1("123"), null);
  assert.equal(parseMtgTcgplayerLaneIdentityV1("name:foil"), null);
});

test("exact printing and a snapshot signal become a shadow candidate only", () => {
  const input = fixture();
  const lane = reconcileMtgExternalPrintingMappingV1({
    ...input,
    warehouseIndex: warehouse([
      {
        product_id: 123,
        group_id: 4,
        name: "Test Card",
        subtypes: ["normal", "foil"],
        positive_market_subtypes: ["foil"],
      },
    ]),
  });
  assert.equal(lane.card_printing_id, "printing-1");
  assert.equal(lane.finish, "foil");
  assert.equal(lane.product_id, 123);
  assert.equal(lane.source_subtype, "foil");
  assert.equal(lane.warehouse_lane_status, "exact_snapshot_positive_signal_lane");
  assert.equal(isMtgShadowQualificationCandidateV1(lane), true);
  assert.equal(lane.publication_candidate, false);
  assert.equal(lane.publication_state, "blocked_requires_amount_and_freshness");
});

test("missing product, missing subtype, and nonpositive lane stay blocked", () => {
  const input = fixture();
  const missingProduct = reconcileMtgExternalPrintingMappingV1({
    ...input,
    warehouseIndex: warehouse([]),
  });
  assert.equal(missingProduct.warehouse_lane_status, "missing_warehouse_product");
  assert.equal(isMtgShadowQualificationCandidateV1(missingProduct), false);

  const missingSubtype = reconcileMtgExternalPrintingMappingV1({
    ...input,
    warehouseIndex: warehouse([
      { product_id: 123, subtypes: ["normal"], positive_market_subtypes: ["normal"] },
    ]),
  });
  assert.equal(missingSubtype.warehouse_lane_status, "missing_warehouse_subtype");

  const noMarket = reconcileMtgExternalPrintingMappingV1({
    ...input,
    warehouseIndex: warehouse([
      { product_id: 123, subtypes: ["foil"], positive_market_subtypes: [] },
    ]),
  });
  assert.equal(noMarket.warehouse_lane_status, "exact_lane_without_positive_market_signal");
  assert.equal(isMtgShadowQualificationCandidateV1(noMarket), false);
});

test("duplicate warehouse product IDs are reported and never selected", () => {
  const index = warehouse([
    { product_id: 123, subtypes: ["foil"], positive_market_subtypes: ["foil"] },
    { product_id: 123, subtypes: ["foil"], positive_market_subtypes: ["foil"] },
  ]);
  assert.deepEqual([...index.duplicate_product_ids], [123]);
  const lane = reconcileMtgExternalPrintingMappingV1({
    ...fixture(),
    warehouseIndex: index,
  });
  assert.equal(lane.warehouse_lane_status, "duplicate_warehouse_product");
  assert.equal(isMtgShadowQualificationCandidateV1(lane), false);
});

test("finish and source-subtype mismatch is a structural blocker", () => {
  const input = fixture({ printing: { finish_key: "normal" } });
  const lane = reconcileMtgExternalPrintingMappingV1({
    ...input,
    warehouseIndex: warehouse([
      { product_id: 123, subtypes: ["foil"], positive_market_subtypes: ["foil"] },
    ]),
  });
  assert.ok(lane.findings.includes("canonical_finish_source_subtype_mismatch"));
  assert.equal(isMtgShadowQualificationCandidateV1(lane), false);
});

test("source lane with multiple canonical owners is quarantined", () => {
  const index = warehouse([
    { product_id: 123, subtypes: ["foil"], positive_market_subtypes: ["foil"] },
  ]);
  const first = reconcileMtgExternalPrintingMappingV1({
    ...fixture(),
    warehouseIndex: index,
  });
  const secondInput = fixture({
    mapping: { card_printing_id: "printing-2" },
    printing: { id: "printing-2", card_print_id: "card-2" },
    cardPrint: { id: "card-2", name: "Other Card" },
  });
  const second = reconcileMtgExternalPrintingMappingV1({
    ...secondInput,
    warehouseIndex: index,
  });
  const collisions = markMtgMappingCollisionsV1([first, second]);
  assert.equal(collisions.length, 1);
  assert.equal(collisions[0].collision_type, "source_lane_owner_collision");
  assert.equal(isMtgShadowQualificationCandidateV1(first), false);
  assert.equal(isMtgShadowQualificationCandidateV1(second), false);
});

test("unmapped etched printing is preserved as an explicit V1 gap", () => {
  const input = fixture({ finish: "etched" });
  const gap = classifyMtgUnmappedPrintingGapV1({
    printing: input.printing,
    cardPrint: input.cardPrint,
    set: input.set,
  });
  assert.equal(gap.gap_reason, "unsupported_etched_finish_v1");
  assert.equal(gap.inferred_mapping, false);
  assert.equal(gap.publication_state, "blocked");
});

test("set and finish coverage remains deterministic", () => {
  const input = fixture();
  const lane = reconcileMtgExternalPrintingMappingV1({
    ...input,
    warehouseIndex: warehouse([
      { product_id: 123, subtypes: ["foil"], positive_market_subtypes: ["foil"] },
    ]),
  });
  const rows = buildMtgPricingCoverageRowsV1({
    printings: [{
      set_ordinal: 1,
      set_id: "set-1",
      set_code: "tst",
      set_name: "Test Set",
      finish: "foil",
      card_printing_id: "printing-1",
    }],
    lanes: [lane],
    gaps: [],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].printing_count, 1);
  assert.equal(rows[0].exact_mapped_printing_count, 1);
  assert.equal(rows[0].snapshot_positive_signal_printing_coverage, 1);
  assert.equal(rows[0].publication_state, "blocked_requires_amount_and_freshness");
});

test("gzip JSONL artifacts are deterministic and preserve logical evidence", async () => {
  const leftDir = fs.mkdtempSync(path.join(os.tmpdir(), "mtg-pricing-gzip-left-"));
  const rightDir = fs.mkdtempSync(path.join(os.tmpdir(), "mtg-pricing-gzip-right-"));
  const rows = [
    { card_printing_id: "printing-1", product_id: 123, signal: true },
    { card_printing_id: "printing-2", product_id: 456, signal: false },
  ];
  try {
    const left = await writeDeterministicGzipJsonlPartsV1(leftDir, "lanes", rows, 1);
    const right = await writeDeterministicGzipJsonlPartsV1(rightDir, "lanes", rows, 1);
    assert.equal(left.index.logical_jsonl_sha256, right.index.logical_jsonl_sha256);
    assert.equal(left.index.total_row_count, 2);
    assert.equal(left.index.part_count, 2);
    for (let index = 0; index < left.part_names.length; index += 1) {
      const leftBytes = fs.readFileSync(path.join(leftDir, left.part_names[index]));
      const rightBytes = fs.readFileSync(path.join(rightDir, right.part_names[index]));
      assert.deepEqual(leftBytes, rightBytes);
      const evidence = await readGzipJsonlLogicalEvidenceV1(
        path.join(leftDir, left.part_names[index]),
      );
      assert.equal(evidence.row_count, 1);
      assert.equal(
        evidence.logical_jsonl_sha256,
        left.part_metadata[index].logical_jsonl_sha256,
      );
      assert.equal(evidence.compressed_sha256, left.part_metadata[index].compressed_sha256);
    }
  } finally {
    fs.rmSync(leftDir, { recursive: true, force: true });
    fs.rmSync(rightDir, { recursive: true, force: true });
  }
});

test("planner authority excludes database, publication, images, and inference", () => {
  for (const key of [
    "database_access",
    "database_writes",
    "publication_writes",
    "release_control_writes",
    "image_access",
    "storage_writes",
    "vault_writes",
    "active_ingestion_access",
    "inferred_mappings",
  ]) {
    assert.equal(MTG_PRICING_RECONCILIATION_BOUNDARIES_V1[key], false, key);
  }
  const source = fs.readFileSync(
    new URL("../../scripts/audits/mtg_exact_printing_pricing_reconciliation_v1.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /@supabase|from\s+["']pg["']|DATABASE_URL|SUPABASE/);
  assert.match(source, /writeDeterministicGzipJsonlPartsV1/);
  assert.match(source, /maxRowsPerPart = 20_000/);
});
