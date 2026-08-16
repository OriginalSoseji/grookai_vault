import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOnePieceCardImagePointerV1,
  buildOnePieceCardImageSourcePlanV1,
  highResolutionOnePieceImageUrlV1,
  onePieceCardImageAuditDirectoryV1,
  retryOnePieceCardImageReadV1,
  validateOnePieceCardImageSourcePlanV1,
} from "../../backend/pricing/one_piece_card_image_self_host_v1.mjs";

test("audit phase directories match their frozen manifest consumers", () => {
  assert.equal(onePieceCardImageAuditDirectoryV1("plan"), "source_plan_v1");
  assert.equal(onePieceCardImageAuditDirectoryV1("canary"),
    "storage_canary_v1");
  assert.equal(onePieceCardImageAuditDirectoryV1("upload"),
    "storage_upload_v1");
  assert.equal(onePieceCardImageAuditDirectoryV1("verify"),
    "storage_readback_v1");
  assert.throws(() => onePieceCardImageAuditDirectoryV1("other"));
});

test("immutable Storage readback retries bounded transport failures", async () => {
  let attempts = 0;
  const result = await retryOnePieceCardImageReadV1(async () => {
    attempts += 1;
    if (attempts < 3) throw new Error("transient_transport");
    return "verified";
  }, { attempts: 3, delayMs: 0 });
  assert.equal(result, "verified");
  assert.equal(attempts, 3);
});

test("exact TCGPlayer image references derive high resolution candidates", () => {
  assert.equal(highResolutionOnePieceImageUrlV1(
    "https://tcgplayer-cdn.tcgplayer.com/product/123_200w.jpg", 123),
  "https://tcgplayer-cdn.tcgplayer.com/product/123_in_1000x1000.jpg");
  assert.throws(() => highResolutionOnePieceImageUrlV1(
    "https://example.com/product/123_200w.jpg", 123));
});

test("source plan preserves exact product and card identity", () => {
  const rows = Array.from({ length: 6730 }, (_, index) => ({
    card_print_id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    gv_id: `GV-OP-TCGP-${index}`,
    canonical_name: `Card ${index}`,
    source_product_id: index + 1,
    source_image_url:
      `https://tcgplayer-cdn.tcgplayer.com/product/${index + 1}_200w.jpg`,
    source_availability_status: "available_exact_tcgplayer",
  }));
  const plan = buildOnePieceCardImageSourcePlanV1(rows);
  assert.deepEqual(validateOnePieceCardImageSourcePlanV1(plan),
    { valid: true, findings: [] });
});

test("pointer is content addressed and self-hosted", () => {
  const pointer = buildOnePieceCardImagePointerV1({
    card_print_id: "id", gv_id: "GV", source_product_id: 123,
    source_image_url:
      "https://tcgplayer-cdn.tcgplayer.com/product/123_200w.jpg",
  }, { sha256: "a".repeat(64), format: "jpg", content_type: "image/jpeg",
    size_bytes: 10000, width: 1000, height: 1395,
    source_download_role: "high_resolution" },
  "https://project.supabase.co/storage/v1/object/public/external-card-images");
  assert.equal(pointer.image_status, "exact");
  assert.match(pointer.image_path, /^one-piece\/card-prints\/tcgplayer\/123\//);
  assert.match(pointer.image_url, /external-card-images\/one-piece\//);
});

test("existing official image evidence is preserved as a separate authority", () => {
  const rows = Array.from({ length: 6730 }, (_, index) => ({
    card_print_id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    gv_id: `GV-OP-TCGP-${index}`,
    canonical_name: `Card ${index}`,
    source_product_id: index + 1,
    source_image_url:
      `https://tcgplayer-cdn.tcgplayer.com/product/${index + 1}_200w.jpg`,
    source_availability_status: "available_exact_tcgplayer",
    existing_image_path: index === 0
      ? "warehouse-derived/self-hosted-images-v1/card_prints/one-piece/st01/card/image.png"
      : null,
    existing_image_note: index === 0 ? "Official evidence." : null,
  }));
  const plan = buildOnePieceCardImageSourcePlanV1(rows);
  assert.equal(plan.items[0].evidence_role,
    "existing_official_self_hosted_image");
  assert.equal(validateOnePieceCardImageSourcePlanV1(plan).valid, true);
});

test("provider image gaps remain explicit without substituting artwork", () => {
  const rows = Array.from({ length: 6730 }, (_, index) => ({
    card_print_id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    gv_id: `GV-OP-TCGP-${index}`,
    canonical_name: `Card ${index}`,
    source_product_id: index + 1,
    source_image_url:
      `https://tcgplayer-cdn.tcgplayer.com/product/${index + 1}_200w.jpg`,
    source_availability_status: index < 177
      ? "unavailable_exact_tcgplayer" : "available_exact_tcgplayer",
    availability_probe: index < 177 ? {
      high_resolution: { status: 403 }, fallback: { status: 403 },
    } : { high_resolution: { status: 200 }, fallback: null },
  }));
  const plan = buildOnePieceCardImageSourcePlanV1(rows);
  assert.equal(plan.counts.available_images, 6553);
  assert.equal(plan.counts.coverage_gaps, 177);
  assert.deepEqual(validateOnePieceCardImageSourcePlanV1(plan),
    { valid: true, findings: [] });
});
