import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import {
  buildOnePieceSealedImageReviewItemV1,
  buildOnePieceSealedImageReviewPacketV1,
  validateOnePieceSealedImageReviewPacketV1,
} from "../../backend/pricing/one_piece_sealed_image_review_packet_v1.mjs";
import { renderOnePieceSealedReviewHtmlV1 } from
  "../../scripts/audits/one_piece_sealed_image_review_packet_v1.mjs";

function fixture(index, status = "official_family_support_candidate_unique") {
  const candidateId = `candidate-${index}`;
  const sourceProductId = 700000 + index;
  const candidate = {
    id: candidateId,
    source_product_id: sourceProductId,
    source_product_name: `Booster Box ${index}`,
    source_group_id: 10,
    source_payload_hash: "a".repeat(64),
    candidate_identity: {
      source_product_identity: { group_name: `Product ${index}` },
    },
    evidence: [{
      source_image_reference_only:
        `https://tcgplayer-cdn.tcgplayer.com/product/${sourceProductId}_200w.jpg`,
    }],
  };
  const review = {
    candidate_id: candidateId,
    source_product_id: sourceProductId,
    review_priority: "current_english_structured_first",
    proposed_family: {
      proposed_family_key: `product_${index}`,
      proposed_canonical_name: `Product ${index}`,
    },
    proposed_variant: {
      proposed_canonical_name: `Booster Box ${index}`,
      proposed_package_form: "booster_box",
      proposed_language_code: "en",
      proposed_wave: null,
    },
    blockers: ["exact_source_to_variant_review_required"],
  };
  const officialRecord = status === "official_family_support_candidate_unique"
    ? {
        official_url: `https://en.onepiece-cardgame.com/products/product${index}.html`,
        official_product_names: [`Product ${index}`],
        official_index_title: `Product ${index}`,
        release_date: "2025-01-01",
        msrp_text: "USD $4.99",
        contents_text: ["Pack x 1"],
        official_image_urls: [
          `https://en.onepiece-cardgame.com/images/product${index}.webp`,
        ],
        official_record_fingerprint_sha256: "b".repeat(64),
      }
    : null;
  const binding = {
    candidate_id: candidateId,
    source_product_id: sourceProductId,
    binding_status: status,
    top_score: officialRecord ? 1 : 0.4,
    second_score: null,
    official_record: officialRecord,
    review_candidates: [],
  };
  return { candidate, review, binding };
}

test("review item joins source and official images without granting authority", () => {
  const item = buildOnePieceSealedImageReviewItemV1(fixture(1));
  assert.match(item.source_image.url, /tcgplayer-cdn/);
  assert.match(item.official_evidence.reference_image_url, /onepiece-cardgame/);
  assert.equal(item.official_evidence.family_support_only, true);
  assert.equal(item.official_evidence.exact_variant_authority, false);
  assert.equal(item.decision_template.decision, "unreviewed");
  assert.equal(item.decision_template.database_apply_authority, false);
});

test("mismatched evidence identities fail closed", () => {
  const value = fixture(2);
  value.binding.source_product_id += 1;
  assert.throws(() => buildOnePieceSealedImageReviewItemV1(value),
    /identity mismatch/);
});

test("complete 403-row packet validates with explicit no-write boundaries", () => {
  const fixtures = Array.from({ length: 403 }, (_, index) => fixture(index,
    index % 2 === 0
      ? "official_family_support_candidate_unique"
      : "official_family_support_not_found"));
  const packet = buildOnePieceSealedImageReviewPacketV1({
    repository: { commit_sha: "c".repeat(40), branch: "test" },
    candidatePlan: {
      plan_fingerprint_sha256: "d".repeat(64),
      payload: { candidates: fixtures.map((value) => value.candidate) },
    },
    reviewRows: fixtures.map((value) => value.review),
    authoritySummary: {
      review_plan_fingerprint_sha256: "e".repeat(64),
      authority_fingerprint_sha256: "f".repeat(64),
    },
    bindings: fixtures.map((value) => value.binding),
  });
  assert.deepEqual(validateOnePieceSealedImageReviewPacketV1(packet),
    { valid: true, findings: [] });
  assert.equal(packet.counts.review_items, 403);
  assert.equal(packet.counts.source_image_references, 403);
  assert.equal(packet.counts.promotion_authorized, 0);
});

test("review website is local-only and exports non-authoritative decisions", () => {
  const fixtures = Array.from({ length: 403 }, (_, index) => fixture(index));
  const packet = buildOnePieceSealedImageReviewPacketV1({
    repository: { commit_sha: "c".repeat(40), branch: "test" },
    candidatePlan: {
      plan_fingerprint_sha256: "d".repeat(64),
      payload: { candidates: fixtures.map((value) => value.candidate) },
    },
    reviewRows: fixtures.map((value) => value.review),
    authoritySummary: {
      review_plan_fingerprint_sha256: "e".repeat(64),
      authority_fingerprint_sha256: "f".repeat(64),
    },
    bindings: fixtures.map((value) => value.binding),
  });
  const html = renderOnePieceSealedReviewHtmlV1(packet);
  assert.match(html, /Local review only/);
  assert.match(html, /localStorage/);
  assert.match(html, /promotion_authorized:false/);
  assert.doesNotMatch(html, /fetch\s*\(/);
  assert.doesNotMatch(html, /\/api\//);
  assert.doesNotMatch(html, /supabase/i);
  const scriptStart = html.indexOf("<script>");
  const scriptEnd = html.lastIndexOf("</script>");
  const script = scriptStart >= 0 && scriptEnd > scriptStart
    ? html.slice(scriptStart + "<script>".length, scriptEnd)
    : null;
  assert.ok(script);
  assert.doesNotThrow(() => new vm.Script(script));
});

test("tampering with a review item invalidates the packet", () => {
  const fixtures = Array.from({ length: 403 }, (_, index) => fixture(index));
  const packet = buildOnePieceSealedImageReviewPacketV1({
    repository: { commit_sha: "c".repeat(40), branch: "test" },
    candidatePlan: {
      plan_fingerprint_sha256: "d".repeat(64),
      payload: { candidates: fixtures.map((value) => value.candidate) },
    },
    reviewRows: fixtures.map((value) => value.review),
    authoritySummary: {
      review_plan_fingerprint_sha256: "e".repeat(64),
      authority_fingerprint_sha256: "f".repeat(64),
    },
    bindings: fixtures.map((value) => value.binding),
  });
  packet.payload.items[0].decision_template.promotion_authorized = true;
  const result = validateOnePieceSealedImageReviewPacketV1(packet);
  assert.equal(result.valid, false);
  assert.ok(result.findings.some((finding) =>
    finding.startsWith("decision_authority_overclaim:")));
});
