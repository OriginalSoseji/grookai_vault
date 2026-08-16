import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOnePieceCompleteCanonicalReconciliationV1,
  onePieceSetCodeFromCardNumberV1,
  validateOnePieceCompleteCanonicalReconciliationV1,
} from "../../backend/pricing/one_piece_complete_canonical_reconciliation_v1.mjs";

const repository = {
  commit_sha: "a".repeat(40),
  branch: "agent/one-piece-ingestion-readiness-v1",
};

function row(overrides = {}) {
  const productId = overrides.source_product_id ?? 1;
  const cardNumber = overrides.card_number ?? "OP01-001";
  return {
    id: `stage-${productId}`,
    batch_id: "batch-1",
    source_product_id: productId,
    source_group_id: overrides.source_group_id ?? 100,
    source_group_name: overrides.source_group_name ?? "Romance Dawn",
    source_product_name: overrides.source_product_name ?? "Test Card",
    source_active: true,
    classification: overrides.classification ?? "exact_single_card_candidate",
    classification_reasons: [],
    single_card_kind: overrides.single_card_kind ?? "numbered_card",
    promotion_state: overrides.promotion_state ?? "current_candidate",
    release: { released_on: "2022-12-02", explicit_presale: false },
    language: { normalized: "en" },
    card_evidence: {
      number: cardNumber,
      number_format: "booster",
      card_type: "character",
      rarity: "C",
    },
    product_signals: { treatments: [], sealed: [] },
    identity_payload: { product_id: productId },
    identity_key_hash: `identity-${productId}`,
    parent_gv_id: `GV-OP-TCGP-${productId}`,
    exact_source_product_mapping: `tcgplayer:${productId}`,
    source_price_lanes: [],
    source_image_reference:
      `https://tcgplayer-cdn.tcgplayer.com/product/${productId}_200w.jpg`,
    source_image_policy: "reference_only_until_self_hosted_and_hashed",
    source_payload_hash: `payload-${productId}`,
    ...overrides,
  };
}

function fixture() {
  const rows = [
    row({ source_product_id: 1, card_number: "ST01-001",
      source_group_id: 3189, source_group_name: "Starter Deck 1" }),
    row({ source_product_id: 2, card_number: "OP01-001" }),
    row({ source_product_id: 3, card_number: "OP01-001",
      source_group_id: 200, source_group_name: "Promotion Cards" }),
    row({ source_product_id: 4, single_card_kind: "don_card",
      card_number: null, card_evidence: { number: null, card_type: "don" } }),
    row({ source_product_id: 5, classification: "sealed_product_candidate",
      single_card_kind: null, promotion_state: "separate_sealed_catalog",
      card_number: null, card_evidence: { number: null },
      parent_gv_id: null, exact_source_product_mapping: null,
      identity_key_hash: null }),
    row({ source_product_id: 6, promotion_state: "future_or_presale_hold" }),
    row({ source_product_id: 7, classification: "ambiguous_quarantine",
      single_card_kind: null, promotion_state: "quarantine", card_number: null,
      card_evidence: { number: null }, parent_gv_id: null,
      exact_source_product_mapping: null, identity_key_hash: null }),
  ];
  const existing = [{
    source_product_id: 1,
    card_number: "ST01-001",
    card_print: { id: "card-1", gv_id: "GV-OP-TCGP-1" },
    identity: { id: "identity-1" },
    external_mapping: { source: "tcgplayer", external_id: "1" },
  }];
  const expected = {
    source_products: 7,
    current_numbered_products: 3,
    current_don_products: 1,
    future_numbered_products: 1,
    future_don_products: 0,
    sealed_products: 1,
    quarantined_products: 1,
    current_numbered_set_families: 2,
    existing_st01_products: 1,
    proposed_new_numbered_products: 2,
  };
  return { rows, existing, expected };
}

test("printed card numbers produce canonical set-code families", () => {
  assert.equal(onePieceSetCodeFromCardNumberV1("OP01-001"), "OP01");
  assert.equal(onePieceSetCodeFromCardNumberV1("ST36-005"), "ST36");
  assert.equal(onePieceSetCodeFromCardNumberV1("EB04-031"), "EB04");
  assert.equal(onePieceSetCodeFromCardNumberV1("PRB02-001"), "PRB02");
  assert.equal(onePieceSetCodeFromCardNumberV1("P-143"), "P");
  assert.equal(onePieceSetCodeFromCardNumberV1("DON!!"), null);
});

test("complete reconciliation partitions every lane without writes", () => {
  const { rows, existing, expected } = fixture();
  const result = buildOnePieceCompleteCanonicalReconciliationV1({
    repository,
    manifestRows: rows,
    manifestLogicalSha256: "fixture",
    stagingReleasePlanFingerprint: "plan",
    stagingReleasePayloadFingerprint: "payload",
    existingCanonicalRows: existing,
  }, { allowFixture: true, expected });
  assert.equal(result.numbered_candidates.length, 3);
  assert.equal(result.don_lane.length, 1);
  assert.equal(result.sealed_lane.length, 1);
  assert.equal(result.future_holds.length, 1);
  assert.equal(result.quarantine.length, 1);
  assert.equal(result.boundaries.database_writes, 0);
  assert.equal(result.boundaries.app_visibility_enabled, false);
  assert.deepEqual(
    validateOnePieceCompleteCanonicalReconciliationV1(result, {
      allowFixture: true,
      expected,
    }),
    { valid: true, findings: [] },
  );
});

test("duplicate printed numbers remain distinct product-backed candidates", () => {
  const { rows, existing, expected } = fixture();
  const result = buildOnePieceCompleteCanonicalReconciliationV1({
    repository,
    manifestRows: rows,
    manifestLogicalSha256: "fixture",
    stagingReleasePlanFingerprint: "plan",
    stagingReleasePayloadFingerprint: "payload",
    existingCanonicalRows: existing,
  }, { allowFixture: true, expected });
  const variants = result.numbered_candidates.filter(
    (candidate) => candidate.card_number === "OP01-001");
  assert.equal(variants.length, 2);
  assert.notEqual(variants[0].source_product_id, variants[1].source_product_id);
  assert.equal(result.diagnostics.collision_count, 0);
});

test("existing ST-01 bindings are retained and never reinsert-authorized", () => {
  const { rows, existing, expected } = fixture();
  const result = buildOnePieceCompleteCanonicalReconciliationV1({
    repository,
    manifestRows: rows,
    manifestLogicalSha256: "fixture",
    stagingReleasePlanFingerprint: "plan",
    stagingReleasePayloadFingerprint: "payload",
    existingCanonicalRows: existing,
  }, { allowFixture: true, expected });
  const st01 = result.numbered_candidates.find(
    (candidate) => candidate.source_product_id === 1);
  assert.equal(st01.reconciliation_action,
    "retain_existing_exact_canonical_binding");
  assert.equal(st01.canonical_promotion_eligible, false);
  assert.equal(st01.existing_canonical.card_print_id, "card-1");
});

test("source identity collisions fail validation", () => {
  const { rows, existing, expected } = fixture();
  rows[2].parent_gv_id = rows[1].parent_gv_id;
  const result = buildOnePieceCompleteCanonicalReconciliationV1({
    repository,
    manifestRows: rows,
    manifestLogicalSha256: "fixture",
    stagingReleasePlanFingerprint: "plan",
    stagingReleasePayloadFingerprint: "payload",
    existingCanonicalRows: existing,
  }, { allowFixture: true, expected });
  const validation = validateOnePieceCompleteCanonicalReconciliationV1(result, {
    allowFixture: true,
    expected,
  });
  assert.equal(validation.valid, false);
  assert.ok(validation.findings.includes("identity_collision_present"));
});

test("invalid numbered identities fail closed", () => {
  const { rows, existing, expected } = fixture();
  rows[1].card_evidence.number = "BAD";
  const result = buildOnePieceCompleteCanonicalReconciliationV1({
    repository,
    manifestRows: rows,
    manifestLogicalSha256: "fixture",
    stagingReleasePlanFingerprint: "plan",
    stagingReleasePayloadFingerprint: "payload",
    existingCanonicalRows: existing,
  }, { allowFixture: true, expected: {
    ...expected,
    current_numbered_set_families: 1,
  }});
  const validation = validateOnePieceCompleteCanonicalReconciliationV1(result, {
    allowFixture: true,
    expected: { ...expected, current_numbered_set_families: 1 },
  });
  assert.equal(validation.valid, false);
  assert.ok(validation.findings.includes("invalid_card_number_present"));
});

