import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildOnePieceSealedImageReviewItemV1,
} from "../../backend/pricing/one_piece_sealed_image_review_packet_v1.mjs";
import {
  ONE_PIECE_SEALED_REVIEW_DECISION_EXPORT_VERSION,
  validateOnePieceSealedReviewDecisionExportV1,
} from "../../backend/pricing/one_piece_sealed_review_decision_validation_v1.mjs";

function item(index) {
  return buildOnePieceSealedImageReviewItemV1({
    candidate: {
      id: `candidate-${index}`,
      source_product_id: 1000 + index,
      source_product_name: `Product ${index}`,
      source_group_id: 2000 + index,
      source_payload_hash: "a".repeat(64),
      candidate_identity: {
        source_product_identity: { group_name: `Group ${index}` },
      },
      evidence: [{
        source_image_reference_only:
          `https://tcgplayer-cdn.tcgplayer.com/product/${1000 + index}_200w.jpg`,
      }],
    },
    review: {
      candidate_id: `candidate-${index}`,
      source_product_id: 1000 + index,
      review_priority: "official_family_and_variant",
      proposed_family: { proposed_canonical_name: `Family ${index}` },
      proposed_variant: {
        proposed_canonical_name: `Variant ${index}`,
        proposed_package_form: "box",
        proposed_language_code: "en",
        proposed_wave: null,
      },
      blockers: ["human_image_review_required"],
    },
    binding: {
      candidate_id: `candidate-${index}`,
      source_product_id: 1000 + index,
      binding_status: "official_family_support_candidate_unique",
      top_score: 1,
      second_score: 0,
      review_candidates: [],
      official_record: {
        official_url: `https://en.onepiece-cardgame.com/products/${index}.php`,
        official_product_names: [`Family ${index}`],
        official_index_title: `Family ${index}`,
        release_date: "2026-01-01",
        msrp_text: "USD $1",
        contents_text: [],
        official_image_urls: [],
        official_record_fingerprint_sha256: "b".repeat(64),
      },
    },
  });
}

function fixture(count = 3) {
  const reviewItems = Array.from({ length: count }, (_, index) => item(index));
  const packetSummary = {
    status: "sealed_image_review_packet_passed_no_writes",
    packet_fingerprint_sha256: "c".repeat(64),
    counts: { review_items: count },
  };
  const decisions = reviewItems.map((reviewItem) => ({
    review_item_fingerprint_sha256:
      reviewItem.review_item_fingerprint_sha256,
    candidate_id: reviewItem.candidate_id,
    source_product_id: reviewItem.source_product_id,
    decision: "unreviewed",
    confirmations: {
      source_image_matches_product_label: false,
      package_form_visibly_supported: false,
      official_family_relationship_supported: false,
      language_or_region_visibly_supported: false,
    },
    corrected_package_form: null,
    corrected_language_code: null,
    corrected_region_code: null,
    corrected_wave: null,
    evidence_note: "",
    promotion_authorized: false,
    database_apply_authority: false,
  }));
  return {
    packetSummary,
    reviewItems,
    decisionExport: {
      version: ONE_PIECE_SEALED_REVIEW_DECISION_EXPORT_VERSION,
      packet_fingerprint_sha256: packetSummary.packet_fingerprint_sha256,
      reviewer: "reviewer@example.test",
      exported_at: "2026-08-15T18:00:00.000Z",
      decisions,
      promotion_authorized: false,
      database_apply_authority: false,
    },
  };
}

test("a complete evidence-backed export reconciles without granting authority", () => {
  const input = fixture();
  for (const decision of input.decisionExport.decisions) {
    decision.decision = "exact_variant_visually_confirmed";
    decision.confirmations = Object.fromEntries(
      Object.keys(decision.confirmations).map((key) => [key, true]));
    decision.evidence_note = "Source label and package form match the reference.";
  }
  const result = validateOnePieceSealedReviewDecisionExportV1(input);
  assert.equal(result.valid, true);
  assert.equal(result.complete, true);
  assert.equal(result.status, "complete_review_reconciled_no_writes");
  assert.equal(result.counts.promotion_authorized, 0);
  assert.equal(result.counts.database_apply_authorized, 0);
});

test("a complete non-exact review can reconcile", () => {
  const input = fixture();
  for (const decision of input.decisionExport.decisions) {
    decision.decision = "needs_additional_evidence";
  }
  const result = validateOnePieceSealedReviewDecisionExportV1(input);
  assert.equal(result.valid, true);
  assert.equal(result.complete, true);
  assert.equal(result.counts.exact_visual_confirmations, 0);
});

test("unreviewed rows preserve a valid but incomplete result", () => {
  const result = validateOnePieceSealedReviewDecisionExportV1(fixture());
  assert.equal(result.valid, true);
  assert.equal(result.complete, false);
  assert.equal(result.status, "partial_review_reconciled_no_writes");
});

test("missing and duplicated decisions fail reconciliation", () => {
  const input = fixture();
  input.decisionExport.decisions[1] = input.decisionExport.decisions[0];
  const result = validateOnePieceSealedReviewDecisionExportV1(input);
  assert.equal(result.valid, false);
  assert.ok(result.findings.some((value) =>
    value.startsWith("decision_item_duplicate:")));
  assert.ok(result.findings.includes("decision_item_missing:1001"));
});

test("exact confirmation requires four checks and a note", () => {
  const input = fixture();
  input.decisionExport.decisions[0].decision =
    "exact_variant_visually_confirmed";
  const result = validateOnePieceSealedReviewDecisionExportV1(input);
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes("exact_confirmation_incomplete:1000"));
  assert.ok(result.findings.includes("exact_confirmation_note_required:1000"));
});

test("packet drift, unknown decisions, and authority claims fail closed", () => {
  const input = fixture();
  input.decisionExport.packet_fingerprint_sha256 = "d".repeat(64);
  input.decisionExport.decisions[0].decision = "approve";
  input.decisionExport.decisions[1].promotion_authorized = true;
  input.decisionExport.database_apply_authority = true;
  const result = validateOnePieceSealedReviewDecisionExportV1(input);
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes("packet_fingerprint_mismatch"));
  assert.ok(result.findings.includes("decision_value_invalid:1000"));
  assert.ok(result.findings.includes(
    "decision_promotion_authority_overclaim:1001"));
  assert.ok(result.findings.includes("top_level_database_authority_overclaim"));
});

test("tampered packet item evidence fails closed", () => {
  const input = fixture();
  input.reviewItems[0].source_product_name = "Tampered";
  const result = validateOnePieceSealedReviewDecisionExportV1(input);
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes("packet_item_fingerprint_invalid:1000"));
});

test("audit runner contains no database or network client", () => {
  const script = fs.readFileSync(new URL(
    "../../scripts/audits/one_piece_sealed_review_decision_validation_v1.mjs",
    import.meta.url), "utf8");
  assert.doesNotMatch(script, /@supabase|\bpg\b|createClient|fetch\s*\(/);
  assert.match(script, /Database writes: 0/);
  assert.match(script, /Promotion authority: 0/);
});
