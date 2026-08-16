import {
  sha256V1,
  stableJsonV1,
} from "./cross_tcg_sealed_product_domain_v1.mjs";

export const ONE_PIECE_SEALED_IMAGE_REVIEW_PACKET_VERSION =
  "ONE_PIECE_SEALED_IMAGE_REVIEW_PACKET_V1";

export const ONE_PIECE_SEALED_REVIEW_DECISIONS_V1 = Object.freeze([
  "unreviewed",
  "exact_variant_visually_confirmed",
  "family_match_only",
  "needs_additional_evidence",
  "source_image_unavailable",
  "official_reference_unavailable",
  "variant_mismatch",
  "not_manufacturer_sealed",
  "defer_language_or_future",
]);

function sourceImage(candidate) {
  for (const evidence of candidate?.evidence ?? []) {
    const value = evidence?.source_image_reference_only;
    if (typeof value === "string" && value.startsWith("https://")) return value;
  }
  return null;
}

function queueLane(review, binding) {
  if (review.review_priority === "held_or_unresolved") return "held_scope_review";
  if (binding.binding_status === "official_family_support_candidate_unique") {
    return "official_supported_visual_review";
  }
  if (binding.binding_status === "official_family_support_candidate_ambiguous") {
    return "ambiguous_official_family_review";
  }
  return "residual_source_only_review";
}

export function buildOnePieceSealedImageReviewItemV1({
  candidate,
  review,
  binding,
}) {
  if (!candidate || !review || !binding) {
    throw new Error("candidate, review, and binding are required");
  }
  if (candidate.id !== review.candidate_id ||
      candidate.id !== binding.candidate_id ||
      candidate.source_product_id !== review.source_product_id ||
      candidate.source_product_id !== binding.source_product_id) {
    throw new Error("review item identity mismatch");
  }
  const official = binding.official_record;
  const core = {
    packet_version: ONE_PIECE_SEALED_IMAGE_REVIEW_PACKET_VERSION,
    candidate_id: candidate.id,
    source_product_id: candidate.source_product_id,
    source_product_name: candidate.source_product_name,
    source_group_id: candidate.source_group_id,
    source_group_name:
      candidate.candidate_identity?.source_product_identity?.group_name ?? null,
    source_payload_hash: candidate.source_payload_hash,
    source_image: {
      url: sourceImage(candidate),
      evidence_role: "tcgplayer_reference_only",
      image_pointer_authorized: false,
    },
    proposed_family: review.proposed_family,
    proposed_variant: review.proposed_variant,
    official_evidence: {
      binding_status: binding.binding_status,
      top_score: binding.top_score,
      second_score: binding.second_score,
      official_url: official?.official_url ?? null,
      official_product_names: official?.official_product_names ?? [],
      official_index_title: official?.official_index_title ?? null,
      release_date: official?.release_date ?? null,
      msrp_text: official?.msrp_text ?? null,
      contents_text: official?.contents_text ?? [],
      reference_image_url: official?.official_image_urls?.[0] ?? null,
      official_record_fingerprint_sha256:
        official?.official_record_fingerprint_sha256 ?? null,
      alternatives: binding.review_candidates,
      family_support_only: official !== null,
      exact_variant_authority: false,
      exact_source_mapping_authority: false,
    },
    review_lane: queueLane(review, binding),
    blockers: review.blockers,
    decision_template: {
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
    },
    allowed_decisions: ONE_PIECE_SEALED_REVIEW_DECISIONS_V1,
    canonical_authority: false,
    mapping_authority: false,
    pricing_authority: false,
    publication_authority: false,
  };
  return {
    ...core,
    review_item_fingerprint_sha256: sha256V1(stableJsonV1(core)),
  };
}

export function buildOnePieceSealedImageReviewPacketV1({
  repository,
  candidatePlan,
  reviewRows,
  authoritySummary,
  bindings,
}) {
  const candidates = candidatePlan?.payload?.candidates ?? [];
  const reviewById = new Map(reviewRows.map((row) => [row.candidate_id, row]));
  const bindingById = new Map(bindings.map((row) => [row.candidate_id, row]));
  const items = candidates.map((candidate) =>
    buildOnePieceSealedImageReviewItemV1({
      candidate,
      review: reviewById.get(candidate.id),
      binding: bindingById.get(candidate.id),
    })).sort((left, right) => left.source_product_id - right.source_product_id);
  const laneCounts = Object.fromEntries([
    "official_supported_visual_review",
    "ambiguous_official_family_review",
    "residual_source_only_review",
    "held_scope_review",
  ].map((lane) => [lane, items.filter((item) => item.review_lane === lane).length]));
  const payload = { items };
  const core = {
    version: ONE_PIECE_SEALED_IMAGE_REVIEW_PACKET_VERSION,
    repository,
    candidate_plan_fingerprint_sha256: candidatePlan.plan_fingerprint_sha256,
    review_plan_fingerprint_sha256:
      authoritySummary.review_plan_fingerprint_sha256,
    official_authority_fingerprint_sha256:
      authoritySummary.authority_fingerprint_sha256,
    counts: {
      review_items: items.length,
      unique_candidate_ids: new Set(items.map((item) => item.candidate_id)).size,
      unique_source_product_ids:
        new Set(items.map((item) => item.source_product_id)).size,
      source_image_references: items.filter((item) => item.source_image.url).length,
      official_reference_images: items.filter((item) =>
        item.official_evidence.reference_image_url).length,
      official_family_support: items.filter((item) =>
        item.official_evidence.family_support_only).length,
      lanes: laneCounts,
      default_unreviewed: items.filter((item) =>
        item.decision_template.decision === "unreviewed").length,
      promotion_authorized: 0,
    },
    payload_fingerprint_sha256: sha256V1(stableJsonV1(payload)),
    payload,
    boundaries: {
      offline_review_artifact_only: true,
      browser_local_state_only: true,
      network_requests_during_generation: 0,
      database_connections: 0,
      database_writes: 0,
      storage_writes: 0,
      canonical_authority: false,
      source_mapping_authority: false,
      pricing_authority: false,
      publication_authority: false,
      app_visibility_enabled: false,
    },
  };
  return {
    ...core,
    packet_fingerprint_sha256: sha256V1(stableJsonV1(core)),
  };
}

export function validateOnePieceSealedImageReviewPacketV1(packet) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const { packet_fingerprint_sha256: ignored, ...core } = packet ?? {};
  const items = packet?.payload?.items ?? [];
  add(packet?.version !== ONE_PIECE_SEALED_IMAGE_REVIEW_PACKET_VERSION,
    "version_mismatch");
  add(packet?.packet_fingerprint_sha256 !== sha256V1(stableJsonV1(core)),
    "packet_fingerprint_mismatch");
  add(packet?.payload_fingerprint_sha256 !==
    sha256V1(stableJsonV1(packet?.payload)), "payload_fingerprint_mismatch");
  add(items.length !== 403, "review_item_count_mismatch");
  add(new Set(items.map((item) => item.candidate_id)).size !== 403,
    "candidate_identity_mismatch");
  add(new Set(items.map((item) => item.source_product_id)).size !== 403,
    "source_product_identity_mismatch");
  for (const item of items) {
    const prefix = item.source_product_id;
    const { review_item_fingerprint_sha256: fingerprint, ...itemCore } = item;
    add(fingerprint !== sha256V1(stableJsonV1(itemCore)),
      `item_fingerprint_mismatch:${prefix}`);
    add(item.source_image.image_pointer_authorized !== false,
      `source_image_authority_overclaim:${prefix}`);
    add(item.official_evidence.exact_variant_authority !== false ||
      item.official_evidence.exact_source_mapping_authority !== false,
    `official_authority_overclaim:${prefix}`);
    add(item.decision_template.decision !== "unreviewed" ||
      item.decision_template.promotion_authorized !== false ||
      item.decision_template.database_apply_authority !== false,
    `decision_authority_overclaim:${prefix}`);
    add(item.canonical_authority !== false || item.mapping_authority !== false ||
      item.pricing_authority !== false || item.publication_authority !== false,
    `item_authority_overclaim:${prefix}`);
    add(!ONE_PIECE_SEALED_REVIEW_DECISIONS_V1.every((decision) =>
      item.allowed_decisions.includes(decision)),
    `decision_options_missing:${prefix}`);
    if (item.source_image.url) {
      add(new URL(item.source_image.url).hostname !==
        "tcgplayer-cdn.tcgplayer.com", `source_image_host_mismatch:${prefix}`);
    }
    if (item.official_evidence.official_url) {
      add(new URL(item.official_evidence.official_url).hostname !==
        "en.onepiece-cardgame.com", `official_host_mismatch:${prefix}`);
    }
  }
  const boundaries = packet?.boundaries ?? {};
  add(boundaries.offline_review_artifact_only !== true ||
    boundaries.browser_local_state_only !== true ||
    boundaries.network_requests_during_generation !== 0 ||
    boundaries.database_connections !== 0 || boundaries.database_writes !== 0 ||
    boundaries.storage_writes !== 0 || boundaries.canonical_authority !== false ||
    boundaries.source_mapping_authority !== false ||
    boundaries.pricing_authority !== false ||
    boundaries.publication_authority !== false ||
    boundaries.app_visibility_enabled !== false,
  "boundaries_mismatch");
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
