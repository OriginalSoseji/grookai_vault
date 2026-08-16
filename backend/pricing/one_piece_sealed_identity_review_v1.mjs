import {
  SEALED_PACKAGE_FORMS_V1,
  sha256V1,
  stableJsonV1,
} from "./cross_tcg_sealed_product_domain_v1.mjs";

export const ONE_PIECE_SEALED_IDENTITY_REVIEW_VERSION =
  "ONE_PIECE_SEALED_IDENTITY_REVIEW_V1";

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function slug(value) {
  return clean(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sourceIdentity(candidate) {
  return candidate?.candidate_identity?.source_product_identity ?? {};
}

function sourceEvidence(field, value, rule) {
  return {
    evidence_class: "source_name_structure",
    source_field: field,
    source_value: clean(value),
    deterministic_rule: rule,
    authority: "proposal_only",
  };
}

function parseWave(name) {
  const value = clean(name);
  return value.match(/\((wave\s+\d+\s*-\s*[^)]+)\)/i)?.[1] ??
    value.match(/\b(wave\s+\d+)\b/i)?.[1] ?? null;
}

function stripWave(name) {
  return clean(name).replace(/\s*\(wave\s+\d+\s*-\s*[^)]+\)\s*/gi, " ");
}

function isBoosterLine(name, groupName) {
  return /\bbooster\b/i.test(name) ||
    /^(?:extra|premium)?\s*booster\b/i.test(groupName);
}

export function inferOnePieceSealedPackageFormV1(candidate) {
  const name = clean(candidate?.source_product_name);
  const groupName = clean(sourceIdentity(candidate).group_name);
  const signals = new Set(candidate?.candidate_identity?.sealed_signals ?? []);
  let packageForm = null;
  let rule = "unresolved";

  if (/\b(?:display|box)\s+case\b|\bbooster\s+box\s+case\b|\bcase$/i.test(name)) {
    packageForm = "case";
    rule = "explicit_case_name";
  } else if (/\bsleeved\s+booster\s+pack\b/i.test(name)) {
    packageForm = "sleeved_pack";
    rule = "explicit_sleeved_booster_pack_name";
  } else if (/\bbooster\s+box\b/i.test(name)) {
    packageForm = "booster_box";
    rule = "explicit_booster_box_name";
  } else if (/\bbox\b/i.test(name) &&
      /^extra\s+booster\b/i.test(groupName)) {
    packageForm = "booster_box";
    rule = "extra_booster_group_box_name";
  } else if (/\b(?:starter|ultra)\s+deck\b.*\bdisplay\b/i.test(name) ||
      /\bdeck\s+set\s+display\b/i.test(name)) {
    packageForm = "deck_display";
    rule = "explicit_deck_display_name";
  } else if (/\bdisplay\b/i.test(name)) {
    packageForm = "display";
    rule = "explicit_display_name";
  } else if (/\b(?:starter|ultra)\s+deck\b/i.test(name) &&
      !/\bbonus\s+pack\b/i.test(name)) {
    packageForm = "deck";
    rule = "explicit_deck_name";
  } else if (/\bsealed\s+battle\s+kit\b|\bkit\b/i.test(name)) {
    packageForm = "kit";
    rule = "explicit_kit_name";
  } else if (/\btin\s+pack\s+set\b/i.test(name) &&
      !/\bset\s+of\b/i.test(name)) {
    packageForm = "tin";
    rule = "explicit_tin_pack_set_name";
  } else if (/\bdouble\s+pack\s+set\b|\bdeck\s+set\b|\bbooster\s+set\b|\bset\s+of\s+\d+\b|\bsealed\s+promotional\s+bundle\b/i.test(name)) {
    packageForm = "bundle";
    rule = "explicit_multi_product_or_bundle_name";
  } else if (/\b(?:gift|premium\s+card|devil\s+fruits)\s+collection\b|\billustration\s+box\b|\bspecial\s+don!!?\s+set\b|\banniversary\s+set\b/i.test(name)) {
    packageForm = "collection";
    rule = "explicit_collection_name";
  } else if (/\b(?:promotion|promo|event|winner|tournament|judge|participation|celebration|dash|welcome|revision|bonus|campaign|battle|top\s+player|don!!?\s+card)\b.*\bpack\b/i.test(name) ||
      /\bpack\b.*\b(?:winner|finalist)\b/i.test(name)) {
    packageForm = "promo_pack";
    rule = "explicit_promotional_pack_name";
  } else if (/\bbooster\s+pack\b/i.test(name) ||
      (/\bpack\b/i.test(name) && isBoosterLine(name, groupName))) {
    packageForm = "pack";
    rule = "explicit_booster_pack_name";
  } else if (signals.has("starter_deck") || signals.has("ultra_deck")) {
    packageForm = "deck";
    rule = "source_sealed_signal_deck_proposal";
  } else if (signals.has("pack")) {
    packageForm = "promo_pack";
    rule = "source_sealed_signal_pack_proposal";
  }

  return {
    package_form: packageForm,
    confidence: packageForm ? 0.92 : 0,
    evidence: packageForm ? [sourceEvidence("source_product_name", name, rule)] : [],
    rule,
  };
}

function boosterFamilyName(name, groupName) {
  const cleanedGroup = clean(groupName);
  if (cleanedGroup && !/\b(?:pre-release|release event|promotion cards)\b/i.test(cleanedGroup)) {
    return `${cleanedGroup} Booster Product`;
  }
  return stripWave(name)
    .replace(/\s*-?\s*(?:sleeved\s+)?booster\s+(?:pack|box)(?:\s+case)?\s*$/i, "")
    .trim();
}

function stripDistributionSuffix(name) {
  return stripWave(name)
    .replace(/\s+(?:display\s+case|display|case)\s*$/i, "")
    .trim();
}

export function proposeOnePieceSealedFamilyV1(candidate, packageForm) {
  const name = clean(candidate?.source_product_name);
  const groupName = clean(sourceIdentity(candidate).group_name);
  let canonicalName = name;
  let rule = "source_product_name_singleton_family";

  if (["pack", "sleeved_pack", "booster_box", "case"].includes(packageForm) &&
      isBoosterLine(name, groupName) && !/\b(?:pre-release|release\s+event|promotion|promo|event|winner|tournament|judge|participation|dash|special\s+don)\b/i.test(name)) {
    canonicalName = boosterFamilyName(name, groupName);
    rule = "booster_product_line_family";
  } else if (/\b(?:starter|ultra)\s+deck\b/i.test(name) &&
      !/\bset\s+of\b|\bbonus\s+pack\b/i.test(name)) {
    canonicalName = groupName || stripDistributionSuffix(name);
    rule = "deck_group_family";
  } else if (/\bdouble\s+pack\s+set\b|\bdevil\s+fruits\s+collection\b|\billustration\s+box\b|\bdeck\s+set\b/i.test(name)) {
    canonicalName = stripDistributionSuffix(name);
    rule = "distribution_suffix_family";
  } else if (/\btin\s+pack\s+set\s+vol\.?\s*\d+/i.test(name)) {
    canonicalName = stripDistributionSuffix(name)
      .replace(/\s+-[^-]+-\s*$/i, "")
      .replace(/\s*\[set\s+of\s+\d+\]\s*$/i, "")
      .trim();
    rule = "tin_volume_family";
  } else if (/\b(?:english|japanese)\s+(?:version\s+)?\d+(?:st|nd|rd|th)\s+anniversary\s+set/i.test(name)) {
    canonicalName = name
      .replace(/\b(?:english|japanese)\s+(?:version\s+)?/i, "")
      .replace(/\s*\(sealed\s+promotional\s+bundle\)\s*/i, "")
      .replace(/^one\s+piece(?:\s+card\s+game)?\s*/i, "One Piece Card Game ")
      .trim();
    rule = "anniversary_language_variant_family";
  }

  canonicalName = clean(canonicalName) || name;
  return {
    proposed_family_key: slug(canonicalName),
    proposed_canonical_name: canonicalName,
    proposed_manufacturer_name: "Bandai",
    proposed_product_line_key: groupName ? slug(groupName) : null,
    confidence: 0.75,
    rule,
    authority: "proposal_only_requires_official_or_human_review",
    evidence: [sourceEvidence(
      rule === "source_product_name_singleton_family"
        ? "source_product_name"
        : "source_product_name+source_group_name",
      rule === "source_product_name_singleton_family"
        ? name
        : `${name} | ${groupName}`,
      rule,
    )],
  };
}

function explicitContents(name) {
  const setCount = clean(name).match(/\[set\s+of\s+(\d+)\]/i)?.[1];
  if (!setCount) return [];
  return [{ unit: "source_named_item", quantity: Number(setCount) }];
}

function variantKey(candidate, packageForm, wave) {
  const language = candidate?.candidate_identity?.language?.normalized ?? "unknown";
  const terms = [packageForm ?? "unresolved", language];
  if (wave) terms.push(wave);
  terms.push(`source_${candidate.source_product_id}`);
  return slug(terms.join(" "));
}

export function buildOnePieceSealedIdentityReviewRowV1(candidate) {
  const packageProposal = inferOnePieceSealedPackageFormV1(candidate);
  const familyProposal = proposeOnePieceSealedFamilyV1(
    candidate,
    packageProposal.package_form,
  );
  const name = clean(candidate.source_product_name);
  const language = candidate?.candidate_identity?.language?.normalized ?? null;
  const wave = parseWave(name);
  const contents = explicitContents(name);
  const blockers = [
    "human_or_official_family_confirmation_required",
    "exact_source_to_variant_review_required",
    "manufacturer_authority_not_bound_to_candidate",
  ];
  if (!packageProposal.package_form) blockers.push("package_form_unresolved");
  if (contents.length === 0) blockers.push("explicit_contents_not_observed");
  blockers.push("region_not_observed");
  if (candidate?.candidate_identity?.release?.future_release ||
      candidate?.candidate_identity?.release?.explicit_presale) {
    blockers.push("future_or_presale_hold");
  }
  if (language !== "en") blockers.push("non_english_lane_hold");

  const core = {
    review_contract_version: ONE_PIECE_SEALED_IDENTITY_REVIEW_VERSION,
    candidate_id: candidate.id,
    source_provider: candidate.source_provider,
    source_category_id: candidate.source_category_id,
    source_group_id: candidate.source_group_id,
    source_product_id: candidate.source_product_id,
    source_product_name: name,
    source_payload_hash: candidate.source_payload_hash,
    source_identity: sourceIdentity(candidate),
    proposed_family: familyProposal,
    proposed_variant: {
      proposed_variant_key: variantKey(candidate, packageProposal.package_form, wave),
      proposed_canonical_name: name,
      proposed_package_form: packageProposal.package_form,
      proposed_language_code: language,
      proposed_region_code: null,
      proposed_edition: null,
      proposed_wave: wave,
      proposed_explicit_contents: contents,
      proposed_release_date: null,
      proposed_manufacturer_sku: null,
      proposed_upc: null,
      package_form_proposal: packageProposal,
    },
    review_state: "awaiting_exact_evidence_review",
    review_priority: language === "en" &&
      !candidate?.candidate_identity?.release?.future_release &&
      !candidate?.candidate_identity?.release?.explicit_presale &&
      packageProposal.package_form
      ? "current_english_structured_first"
      : "held_or_unresolved",
    blockers: [...new Set(blockers)].sort(),
    promotion_eligible: false,
    canonical_authority: false,
    mapping_authority: false,
    pricing_authority: false,
    publication_authority: false,
  };
  return { ...core, review_row_fingerprint_sha256: sha256V1(stableJsonV1(core)) };
}

export function buildOnePieceSealedIdentityReviewPlanV1({
  repository,
  candidatePlan,
}) {
  const rows = (candidatePlan?.payload?.candidates ?? [])
    .map(buildOnePieceSealedIdentityReviewRowV1)
    .sort((left, right) => left.source_product_id - right.source_product_id);
  const packageForms = Object.fromEntries(SEALED_PACKAGE_FORMS_V1.map((form) =>
    [form, rows.filter((row) => row.proposed_variant.proposed_package_form === form).length]));
  const proposedFamilyKeys = new Set(rows.map((row) =>
    row.proposed_family.proposed_family_key));
  const counts = {
    candidate_rows: rows.length,
    review_rows: rows.length,
    proposed_family_keys: proposedFamilyKeys.size,
    package_forms: packageForms,
    unresolved_package_forms: rows.filter((row) =>
      !row.proposed_variant.proposed_package_form).length,
    current_english_structured_first: rows.filter((row) =>
      row.review_priority === "current_english_structured_first").length,
    held_or_unresolved: rows.filter((row) =>
      row.review_priority === "held_or_unresolved").length,
    canonical_rows: 0,
    mapping_rows: 0,
    pricing_rows: 0,
    release_rows: 0,
  };
  const payload = { rows };
  const core = {
    version: ONE_PIECE_SEALED_IDENTITY_REVIEW_VERSION,
    repository,
    candidate_plan_fingerprint_sha256: candidatePlan?.plan_fingerprint_sha256,
    candidate_payload_fingerprint_sha256: candidatePlan?.payload_fingerprint_sha256,
    counts,
    payload_fingerprint_sha256: sha256V1(stableJsonV1(payload)),
    payload,
    boundaries: {
      offline_proposals_only: true,
      database_connections: 0,
      database_writes: 0,
      storage_writes: 0,
      network_requests: 0,
      canonical_authority: false,
      source_mapping_authority: false,
      pricing_authority: false,
      publication_authority: false,
      app_visibility_enabled: false,
    },
  };
  return { ...core, plan_fingerprint_sha256: sha256V1(stableJsonV1(core)) };
}

export function validateOnePieceSealedIdentityReviewPlanV1(plan) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const { plan_fingerprint_sha256: ignored, ...core } = plan ?? {};
  const rows = plan?.payload?.rows ?? [];
  add(plan?.version !== ONE_PIECE_SEALED_IDENTITY_REVIEW_VERSION,
    "version_mismatch");
  add(plan?.plan_fingerprint_sha256 !== sha256V1(stableJsonV1(core)),
    "plan_fingerprint_mismatch");
  add(plan?.payload_fingerprint_sha256 !== sha256V1(stableJsonV1(plan?.payload)),
    "payload_fingerprint_mismatch");
  add(rows.length !== 403 || plan?.counts?.candidate_rows !== 403 ||
    plan?.counts?.review_rows !== 403, "candidate_accounting_mismatch");
  add(new Set(rows.map((row) => row.candidate_id)).size !== rows.length,
    "duplicate_candidate_id");
  add(new Set(rows.map((row) => row.source_product_id)).size !== rows.length,
    "duplicate_source_product_id");
  for (const row of rows) {
    const prefix = String(row.source_product_id);
    add(!row.proposed_family?.proposed_family_key,
      `missing_family_proposal:${prefix}`);
    add(row.proposed_variant?.proposed_package_form !== null &&
      !SEALED_PACKAGE_FORMS_V1.includes(
        row.proposed_variant?.proposed_package_form),
    `invalid_package_form:${prefix}`);
    add(row.review_state !== "awaiting_exact_evidence_review" ||
      row.promotion_eligible !== false || row.canonical_authority !== false ||
      row.mapping_authority !== false || row.pricing_authority !== false ||
      row.publication_authority !== false,
    `authority_overclaim:${prefix}`);
    add(!Array.isArray(row.blockers) || row.blockers.length < 3,
      `review_blockers_missing:${prefix}`);
    const { review_row_fingerprint_sha256: rowFingerprint, ...rowCore } = row;
    add(rowFingerprint !== sha256V1(stableJsonV1(rowCore)),
      `row_fingerprint_mismatch:${prefix}`);
  }
  const boundaries = plan?.boundaries ?? {};
  add(boundaries.offline_proposals_only !== true ||
    boundaries.app_visibility_enabled !== false ||
    Object.entries(boundaries).some(([key, value]) =>
      !["offline_proposals_only", "app_visibility_enabled"].includes(key) &&
      value !== 0 && value !== false),
  "boundaries_mismatch");
  return { valid: findings.length === 0, findings };
}
