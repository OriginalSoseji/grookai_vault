import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOnePieceCardImagePointerV1,
  buildOnePieceCardImageSourcePlanV1,
  highResolutionOnePieceImageUrlV1,
  validateOnePieceCardImageSourcePlanV1,
} from "../../backend/pricing/one_piece_card_image_self_host_v1.mjs";

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
