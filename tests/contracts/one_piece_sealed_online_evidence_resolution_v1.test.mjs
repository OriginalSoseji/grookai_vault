import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildOnePieceSealedOnlineEvidenceResolutionV1,
  ONE_PIECE_SEALED_AUTOMATION_REVIEWER_ID,
  validateOnePieceSealedOnlineEvidenceResolutionV1,
} from "../../backend/pricing/one_piece_sealed_online_evidence_resolution_v1.mjs";

function candidate(index) {
  const productId = 300000 + index;
  const isJapanese = index >= 390 && index < 393;
  const isFuture = index >= 393;
  const productName = `Starter Deck ${index + 1}: Product ${index}`;
  return {
    id: `candidate-${index}`,
    source_provider: "tcgplayer",
    source_category_id: 68,
    source_group_id: 9000 + index,
    source_product_id: productId,
    source_product_name: productName,
    source_payload_hash: index.toString(16).padStart(64, "0"),
    classifier_version: "ONE_PIECE_COMPLETE_SEALED_CANDIDATE_WAREHOUSE_V1",
    classification: "sealed_candidate",
    evidence: [{ evidence_class: "source_manifest_classification" }, {
      evidence_class: "source_locale_and_release",
    }, {
      evidence_class: "reference_only_assets_and_price_lanes",
      source_image_reference_only:
        `https://tcgplayer-cdn.tcgplayer.com/product/${productId}_200w.jpg`,
      source_image_pointer_authorized: false,
      pricing_publication_authorized: false,
    }],
    candidate_identity: {
      source_product_identity: {
        provider: "tcgplayer",
        category_id: 68,
        group_id: 9000 + index,
        group_name: `Starter Deck ${index + 1}`,
        product_id: productId,
        product_name: productName,
      },
      language: { normalized: isJapanese ? "ja" : "en" },
      release: {
        future_release: isFuture,
        explicit_presale: isFuture,
      },
    },
  };
}

function review(row, index) {
  return {
    candidate_id: row.id,
    source_product_id: row.source_product_id,
    source_product_name: row.source_product_name,
    source_identity: row.candidate_identity.source_product_identity,
    proposed_family: {
      proposed_family_key: `starter_deck_${index + 1}`,
      proposed_canonical_name: `Starter Deck ${index + 1}`,
      proposed_manufacturer_name: "Bandai",
      proposed_product_line_key: `starter_deck_${index + 1}`,
    },
    proposed_variant: {
      proposed_variant_key: `deck_en_source_${row.source_product_id}`,
      proposed_canonical_name: row.source_product_name,
      proposed_package_form: "deck",
      proposed_region_code: null,
      proposed_edition: null,
      proposed_wave: null,
      proposed_manufacturer_sku: null,
      proposed_upc: null,
      package_form_proposal: {
        package_form: "deck",
        confidence: 0.92,
        evidence: [{
          source_field: "source_product_name",
          source_value: row.source_product_name,
        }],
      },
    },
  };
}

function snapshot(row) {
  return {
    category_id: 68,
    group_id: row.source_group_id,
    source_url:
      `https://tcgcsv.com/tcgplayer/68/${row.source_group_id}/products`,
    fetched_at: "2026-08-15T20:00:00.000Z",
    transport: "node_fetch_tls_verified",
    response_sha256: "a".repeat(64),
    candidate_products: [{
      productId: row.source_product_id,
      name: row.source_product_name,
      cleanName: row.source_product_name.replace(/[^a-z0-9]/gi, " "),
      imageUrl:
        `https://tcgplayer-cdn.tcgplayer.com/product/${row.source_product_id}_200w.jpg`,
      categoryId: 68,
      groupId: row.source_group_id,
      url: `https://www.tcgplayer.com/product/${row.source_product_id}/one-piece-product`,
      modifiedOn: "2026-08-15T00:00:00",
      imageCount: 1,
      presaleInfo: {
        isPresale: row.candidate_identity.release.explicit_presale,
        releasedOn: row.candidate_identity.release.explicit_presale
          ? "2027-01-01T00:00:00"
          : "2026-01-01T00:00:00",
        note: null,
      },
      extendedData: [],
    }],
  };
}

function input() {
  const candidates = Array.from({ length: 403 }, (_, index) => candidate(index));
  return {
    repository: {
      commit_sha: "b".repeat(40),
      branch: "agent/one-piece-ingestion-readiness-v1",
      tracked_worktree_clean: true,
    },
    candidatePlan: {
      plan_fingerprint_sha256: "c".repeat(64),
      payload: { candidates },
    },
    reviewRows: candidates.map(review),
    officialBindings: candidates.map((row) => ({
      candidate_id: row.id,
      binding_status: "official_family_support_not_found",
      official_record: null,
    })),
    groupSnapshots: candidates.map(snapshot),
    sourceDeclaration: {
      source_url: "https://tcgcsv.com/docs",
      response_sha256: "d".repeat(64),
      fetched_at: "2026-08-15T20:00:00.000Z",
      direct_tcgplayer_api_export: true,
      raw_body_persisted: false,
    },
  };
}

test("exact online source evidence replaces blanket human review", () => {
  const result = buildOnePieceSealedOnlineEvidenceResolutionV1(input());
  assert.deepEqual(validateOnePieceSealedOnlineEvidenceResolutionV1(result),
    { valid: true, findings: [] });
  assert.equal(result.counts.exact_source_identities, 403);
  assert.equal(result.counts.statuses.auto_resolved_current_english, 390);
  assert.equal(result.counts.statuses.scope_held_non_english, 3);
  assert.equal(result.counts.statuses.scope_held_future_or_presale, 10);
  assert.equal(result.counts.human_review_required, 0);
  assert.equal(result.payload.canonical_plan.variants.length, 390);
  assert.equal(result.payload.canonical_plan.source_mappings.length, 390);
  assert.ok(result.payload.canonical_plan.automated_reviews.every((row) =>
    row.reviewed_by === ONE_PIECE_SEALED_AUTOMATION_REVIEWER_ID &&
    row.decision === "confirmed_sealed" &&
    row.decision_evidence.human_judgment_used === false));
  assert.equal(result.boundaries.database_writes, 0);
  assert.equal(result.boundaries.apply_authority, false);
});

test("scope holds preserve exact evidence without entering the apply plan", () => {
  const result = buildOnePieceSealedOnlineEvidenceResolutionV1(input());
  const held = result.payload.held_or_residual;
  assert.equal(held.length, 13);
  assert.ok(held.every((row) => row.source_evidence.exact_source_identity));
  assert.ok(held.every((row) => row.human_review_required === false));
  assert.ok(held.every((row) => row.canonical_plan_eligible === false));
});

test("source name drift fails exact identity and routes to review", () => {
  const value = input();
  value.groupSnapshots[0].candidate_products[0].name = "Different Product";
  const result = buildOnePieceSealedOnlineEvidenceResolutionV1(value);
  assert.equal(result.payload.resolutions[0].resolution_status,
    "evidence_gap_requires_review");
  assert.equal(result.payload.resolutions[0].human_review_required, true);
  assert.equal(validateOnePieceSealedOnlineEvidenceResolutionV1(result).valid,
    false);
});

test("card metadata prevents sealed auto-resolution", () => {
  const value = input();
  value.groupSnapshots[0].candidate_products[0].extendedData = [{
    name: "Number",
    value: "OP01-001",
  }];
  const result = buildOnePieceSealedOnlineEvidenceResolutionV1(value);
  assert.equal(result.payload.resolutions[0].source_evidence.checks.no_card_metadata,
    false);
  assert.equal(result.payload.resolutions[0].canonical_plan_eligible, false);
});

test("a mismatched product URL or image identity fails closed", () => {
  const value = input();
  value.groupSnapshots[0].candidate_products[0].url =
    "https://www.tcgplayer.com/product/999999/wrong";
  value.groupSnapshots[1].candidate_products[0].imageUrl =
    "https://tcgplayer-cdn.tcgplayer.com/product/999999_200w.jpg";
  const result = buildOnePieceSealedOnlineEvidenceResolutionV1(value);
  assert.equal(result.payload.resolutions[0].source_evidence
    .checks.canonical_product_url_matches, false);
  assert.equal(result.payload.resolutions[1].source_evidence
    .checks.image_identity_matches, false);
});

test("exact catalog image identity does not require an available image binary", () => {
  const value = input();
  value.groupSnapshots[0].candidate_products[0].imageCount = 0;
  const result = buildOnePieceSealedOnlineEvidenceResolutionV1(value);
  const evidence = result.payload.resolutions[0].source_evidence;
  assert.equal(evidence.source_product.image_count, 0);
  assert.equal(evidence.checks.image_identity_matches, true);
  assert.equal(evidence.exact_source_identity, true);
  assert.equal(result.payload.resolutions[0].resolution_status,
    "auto_resolved_current_english");
});

test("same-named families in different product lines receive unique schema keys", () => {
  const value = input();
  for (const [index, productLine] of ["paramount_war", "romance_dawn"].entries()) {
    value.reviewRows[index].proposed_family.proposed_family_key =
      "box_promotion_pack";
    value.reviewRows[index].proposed_family.proposed_canonical_name =
      "Box Promotion Pack";
    value.reviewRows[index].proposed_family.proposed_product_line_key =
      productLine;
  }
  const result = buildOnePieceSealedOnlineEvidenceResolutionV1(value);
  const matching = result.payload.canonical_plan.families.filter((row) =>
    row.canonical_name === "Box Promotion Pack");
  assert.deepEqual(matching.map((row) => row.family_key).sort(), [
    "paramount_war_box_promotion_pack",
    "romance_dawn_box_promotion_pack",
  ]);
  assert.deepEqual(validateOnePieceSealedOnlineEvidenceResolutionV1(result),
    { valid: true, findings: [] });
});

test("validator mirrors production sealed uniqueness constraints", () => {
  const result = buildOnePieceSealedOnlineEvidenceResolutionV1(input());
  result.payload.canonical_plan.families[1].family_key =
    result.payload.canonical_plan.families[0].family_key;
  const validation = validateOnePieceSealedOnlineEvidenceResolutionV1(result);
  assert.equal(validation.valid, false);
  assert.ok(validation.findings.includes(
    "families_duplicate_game_key_family_key"));
});

test("package form must be supported by the exact source-name proposal", () => {
  const value = input();
  value.reviewRows[0].proposed_variant.package_form_proposal.evidence[0]
    .source_value = "Other Product";
  const result = buildOnePieceSealedOnlineEvidenceResolutionV1(value);
  assert.equal(result.payload.resolutions[0].source_evidence.checks
    .package_form_supported_by_exact_source_name, false);
});

test("online resolver runner has no database or Storage client", () => {
  const script = fs.readFileSync(new URL(
    "../../scripts/audits/one_piece_sealed_online_evidence_resolution_v1.mjs",
    import.meta.url), "utf8");
  assert.doesNotMatch(script, /@supabase|\bpg\b|createClient|storage\.from/);
  assert.match(script, /Database writes: 0/);
  assert.match(script, /Apply authority: false/);
  assert.match(script, /manifest\.artifacts \?\? manifest/);
  assert.match(script, /typeof expected === "string"/);
});
