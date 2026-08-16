import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOnePieceCardImagePointerPlanV1,
  evaluateOnePieceCardImagePointerStateV1,
  validateOnePieceCardImagePointerPlanV1,
} from "../../backend/pricing/one_piece_card_image_pointer_v1.mjs";
import {
  buildOnePieceCardImageSourcePlanV1,
  hashOnePieceCardImageV1,
} from "../../backend/pricing/one_piece_card_image_self_host_v1.mjs";

function fixture() {
  const sourceRows = Array.from({ length: 6730 }, (_, index) => ({
    card_print_id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    gv_id: `GV-OP-TCGP-${index + 1}`,
    canonical_name: `Card ${index + 1}`,
    source_product_id: index + 1,
    source_image_url:
      `https://tcgplayer-cdn.tcgplayer.com/product/${index + 1}_200w.jpg`,
    source_availability_status: index < 177
      ? "unavailable_exact_tcgplayer" : "available_exact_tcgplayer",
    availability_probe: index < 177 ? {
      high_resolution: { status: 403 }, fallback: { status: 403 },
    } : { high_resolution: { status: 200 }, fallback: null },
  }));
  const sourcePlan = buildOnePieceCardImageSourcePlanV1(sourceRows);
  const pointers = sourcePlan.items.slice(177).map((source) => ({
    card_print_id: source.card_print_id,
    gv_id: source.gv_id,
    source_product_id: source.source_product_id,
    source_image_url: source.source_image_url,
    image_path: `one-piece/card-prints/tcgplayer/${source.source_product_id}/` +
      `${String(source.source_product_id).padStart(64, "0")}.jpg`,
    image_url: "https://project.supabase.co/storage/v1/object/public/" +
      `external-card-images/one-piece/card-prints/tcgplayer/` +
      `${source.source_product_id}/image.jpg`,
    image_source: "self_hosted_tcgplayer_exact_product_v1",
    image_hash: String(source.source_product_id).padStart(64, "0"),
    image_status: "exact",
    image_res: { width: 600, height: 838 },
    image_note: "Exact image",
    content_type: "image/jpeg",
    size_bytes: 10000,
    width: 600,
    height: 838,
    format: "jpg",
    source_download_role: "high_resolution",
  }));
  const assetManifest = {
    source_plan_fingerprint_sha256: sourcePlan.plan_fingerprint_sha256,
    pointers,
    coverage_gaps: sourcePlan.items.slice(0, 177),
    counts: { catalog_rows: 6730, image_pointers: 6553, coverage_gaps: 177 },
    pointer_payload_fingerprint_sha256: hashOnePieceCardImageV1(pointers),
  };
  const currentRows = sourcePlan.items.map((source) => ({
    id: source.card_print_id,
    gv_id: source.gv_id,
    game_code: "one_piece",
    source_product_id: String(source.source_product_id),
    image_url: null, image_alt_url: null, image_source: null,
    image_hash: null, image_status: null, image_res: null,
    image_last_checked_at: null, image_path: null, image_note: null,
  }));
  return { sourcePlan, assetManifest, currentRows };
}

test("pointer plan reconciles exact assets and explicit provider gaps", () => {
  const value = fixture();
  const plan = buildOnePieceCardImagePointerPlanV1({ ...value,
    pointerTimestamp: "2026-08-16T04:00:00.000Z", producerCommit: "a".repeat(40),
    sourcePlanSha256: "b".repeat(64), assetManifestSha256: "c".repeat(64),
    boundarySnapshot: { row_count: 1, image_fingerprint: "d".repeat(32) } });
  assert.equal(plan.rows.length, 6553);
  assert.equal(plan.gap_rows.length, 177);
  assert.deepEqual(validateOnePieceCardImagePointerPlanV1(plan,
    value.sourcePlan, value.assetManifest), { valid: true, findings: [] });
  assert.deepEqual(evaluateOnePieceCardImagePointerStateV1(plan,
    value.currentRows, "before"), []);
  const afterRows = value.currentRows.map((row) => {
    const planned = plan.rows.find((candidate) =>
      candidate.card_print_id === row.id);
    return planned ? { ...row, ...planned.after } : row;
  });
  assert.deepEqual(evaluateOnePieceCardImagePointerStateV1(plan,
    afterRows, "after"), []);
});

test("coverage gap cannot carry an image claim", () => {
  const value = fixture();
  value.currentRows[0].image_url = "https://wrong.example/image.jpg";
  const plan = buildOnePieceCardImagePointerPlanV1({ ...value,
    pointerTimestamp: "2026-08-16T04:00:00.000Z", producerCommit: "a".repeat(40),
    sourcePlanSha256: "b".repeat(64), assetManifestSha256: "c".repeat(64),
    boundarySnapshot: { row_count: 1, image_fingerprint: "d".repeat(32) } });
  assert.ok(validateOnePieceCardImagePointerPlanV1(plan,
    value.sourcePlan, value.assetManifest).findings.includes(
      "coverage_gap_has_image_claim"));
});
