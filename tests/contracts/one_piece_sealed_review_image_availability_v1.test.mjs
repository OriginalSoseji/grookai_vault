import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOnePieceSealedReviewImageTargetsV1,
  summarizeOnePieceSealedReviewImageProbeV1,
  validateOnePieceSealedReviewImageProbeV1,
} from "../../scripts/audits/one_piece_sealed_review_image_availability_v1.mjs";

const items = [{
  candidate_id: "candidate-1",
  source_product_id: 1,
  source_image: {
    url: "https://tcgplayer-cdn.tcgplayer.com/product/1_200w.jpg",
  },
  official_evidence: {
    reference_image_url:
      "https://en.onepiece-cardgame.com/images/product.webp",
  },
}, {
  candidate_id: "candidate-2",
  source_product_id: 2,
  source_image: {
    url: "https://tcgplayer-cdn.tcgplayer.com/product/2_200w.jpg",
  },
  official_evidence: {
    reference_image_url:
      "https://en.onepiece-cardgame.com/images/product.webp",
  },
}];

test("image targets deduplicate official references and preserve candidate ownership", () => {
  const targets = buildOnePieceSealedReviewImageTargetsV1(items);
  assert.equal(targets.length, 3);
  const official = targets.find((target) =>
    target.roles.includes("bandai_official_family_reference"));
  assert.deepEqual(official.candidate_ids, ["candidate-1", "candidate-2"]);
  assert.deepEqual(official.source_product_ids, [1, 2]);
});

test("image targets reject unapproved hosts", () => {
  const changed = structuredClone(items);
  changed[0].source_image.url = "https://example.com/image.jpg";
  assert.throws(() => buildOnePieceSealedReviewImageTargetsV1(changed),
    /outside allowlist/);
});

test("probe validation requires exact target reconciliation and no authority", () => {
  const targets = buildOnePieceSealedReviewImageTargetsV1(items);
  const results = targets.map((target) => ({
    ...target,
    status: "available",
    response_body_persisted: false,
    identity_authority: false,
    image_pointer_authority: false,
  }));
  assert.deepEqual(validateOnePieceSealedReviewImageProbeV1({ targets, results }),
    { valid: true, findings: [] });
  results[0].image_pointer_authority = true;
  assert.equal(validateOnePieceSealedReviewImageProbeV1({ targets, results }).valid,
    false);
});

test("probe summary separates source and official availability", () => {
  const targets = buildOnePieceSealedReviewImageTargetsV1(items);
  const results = targets.map((target, index) => ({
    ...target,
    status: index === 0 ? "http_error" : "available",
  }));
  const summary = summarizeOnePieceSealedReviewImageProbeV1({ targets, results });
  assert.equal(summary.unique_urls, 3);
  assert.equal(summary.available, 2);
  assert.equal(summary.unavailable, 1);
  assert.equal(summary.by_role.bandai_official_family_reference.unique_urls, 1);
});
