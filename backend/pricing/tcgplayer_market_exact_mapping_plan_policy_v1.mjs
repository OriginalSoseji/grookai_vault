import { createHash } from "node:crypto";
import {
  TCGPLAYER_TRAINER_KIT_PILOT_V1,
  trainerKitPilotCardV1,
  matchesTrainerKitPilotSourceV1,
  matchesTrainerKitPilotMappingV1,
  trainerKitPilotPlanningAuthorityV1,
} from "./tcgplayer_trainer_kit_pilot_v1.mjs";

import {
  classifyTcgplayerMarketProductScopeV1_2,
} from "./tcgplayer_market_product_scope_v1.mjs";
import {
  matchesReviewedTcgplayerProductTargetV1,
  reviewedTcgplayerProductIdentityByIdV1,
  reviewedTcgplayerProductIdentityV1,
} from "./tcgplayer_reviewed_product_identity_authority_v1.mjs";
import {
  matchesReviewedTcgplayerG1RcProductTargetV1,
  reviewedTcgplayerG1RcProductIdentityByIdV1,
  reviewedTcgplayerG1RcProductIdentityV1,
} from "./tcgplayer_g1_rc_product_identity_authority_v1.mjs";
import {
  matchesReviewedTcgplayer30cClassicAliasProductTargetV1,
  reviewedTcgplayer30cClassicAliasProductIdentityByIdV1,
  reviewedTcgplayer30cClassicAliasProductIdentityV1,
} from "./tcgplayer_30c_classic_alias_product_identity_authority_v1.mjs";
import {
  matchesReviewedTcgplayerExuUnownProductTargetV1,
  reviewedTcgplayerExuUnownProductIdentityByIdV1,
  reviewedTcgplayerExuUnownProductIdentityV1,
} from "./tcgplayer_exu_unown_product_identity_authority_v1.mjs";
import {
  matchesReviewedTcgplayerAliasWaveProductTargetV1,
  reviewedTcgplayerAliasWaveProductIdentityByIdV1,
  reviewedTcgplayerAliasWaveProductIdentityV1,
} from "./tcgplayer_reviewed_alias_wave_product_identity_authority_v1.mjs";
import {
  matchesReviewedTcgplayerPrismStarAliasProductTargetV1,
  reviewedTcgplayerPrismStarAliasProductIdentityByIdV1,
  reviewedTcgplayerPrismStarAliasProductIdentityV1,
} from "./tcgplayer_prism_star_alias_product_identity_authority_v1.mjs";
import {
  matchesReviewedTcgplayerAliasWave2ProductTargetV1,
  reviewedTcgplayerAliasWave2ProductIdentityByIdV1,
  reviewedTcgplayerAliasWave2ProductIdentityV1,
} from "./tcgplayer_reviewed_alias_wave_2_product_identity_authority_v1.mjs";
import {
  matchesReviewedTcgplayerBw11RadiantCollectionProductTargetV1,
  reviewedTcgplayerBw11RadiantCollectionProductIdentityByIdV1,
  reviewedTcgplayerBw11RadiantCollectionProductIdentityV1,
} from "./tcgplayer_bw11_radiant_collection_product_identity_authority_v1.mjs";
import {
  matchesReviewedTcgplayerBwpAliasProductTargetV1,
  reviewedTcgplayerBwpAliasProductIdentityByIdV1,
  reviewedTcgplayerBwpAliasProductIdentityV1,
} from "./tcgplayer_bwp_alias_product_identity_authority_v1.mjs";
import {
  matchesReviewedTcgplayerNintendoTargetPromoProductTargetV1,
  reviewedTcgplayerNintendoTargetPromoProductIdentityByIdV1,
  reviewedTcgplayerNintendoTargetPromoProductIdentityV1,
} from "./tcgplayer_nintendo_target_promo_product_identity_authority_v1.mjs";
import {
  matchesReviewedTcgplayerDeltaSpeciesAliasProductTargetV1,
  reviewedTcgplayerDeltaSpeciesAliasProductIdentityByIdV1,
  reviewedTcgplayerDeltaSpeciesAliasProductIdentityV1,
} from "./tcgplayer_delta_species_alias_product_identity_authority_v1.mjs";
import {
  matchesReviewedTcgplayerEnergyAliasProductTargetV1,
  reviewedTcgplayerEnergyAliasProductIdentityByIdV1,
  reviewedTcgplayerEnergyAliasProductIdentityV1,
} from "./tcgplayer_energy_alias_product_identity_authority_v1.mjs";
import {
  matchesReviewedTcgplayerWcdTeamRushdownProductTargetV1,
  reviewedTcgplayerWcdTeamRushdownProductIdentityByIdV1,
  reviewedTcgplayerWcdTeamRushdownProductIdentityV1,
} from "./tcgplayer_wcd_team_rushdown_pilot_v1.mjs";

export const TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1 =
  "TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1";
export const TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_1 =
  "TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_1";
export const TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_2 =
  "TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_2";
export const TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_3 =
  "TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_3";

function text(value) {
  return String(value ?? "").trim();
}

function reviewedProductIdentityById(sourceProductId) {
  return reviewedTcgplayerProductIdentityByIdV1(sourceProductId) ??
    reviewedTcgplayerG1RcProductIdentityByIdV1(sourceProductId) ??
    reviewedTcgplayer30cClassicAliasProductIdentityByIdV1(sourceProductId) ??
    reviewedTcgplayerExuUnownProductIdentityByIdV1(sourceProductId) ??
    reviewedTcgplayerAliasWaveProductIdentityByIdV1(sourceProductId) ??
    reviewedTcgplayerPrismStarAliasProductIdentityByIdV1(sourceProductId) ??
    reviewedTcgplayerAliasWave2ProductIdentityByIdV1(sourceProductId) ??
    reviewedTcgplayerBw11RadiantCollectionProductIdentityByIdV1(sourceProductId) ??
    reviewedTcgplayerBwpAliasProductIdentityByIdV1(sourceProductId) ??
    reviewedTcgplayerNintendoTargetPromoProductIdentityByIdV1(sourceProductId) ??
    reviewedTcgplayerDeltaSpeciesAliasProductIdentityByIdV1(sourceProductId) ??
    reviewedTcgplayerEnergyAliasProductIdentityByIdV1(sourceProductId) ??
    reviewedTcgplayerWcdTeamRushdownProductIdentityByIdV1(sourceProductId);
}

function reviewedProductIdentity(source) {
  return reviewedTcgplayerProductIdentityV1(source) ??
    reviewedTcgplayerG1RcProductIdentityV1(source) ??
    reviewedTcgplayer30cClassicAliasProductIdentityV1(source) ??
    reviewedTcgplayerExuUnownProductIdentityV1(source) ??
    reviewedTcgplayerAliasWaveProductIdentityV1(source) ??
    reviewedTcgplayerPrismStarAliasProductIdentityV1(source) ??
    reviewedTcgplayerAliasWave2ProductIdentityV1(source) ??
    reviewedTcgplayerBw11RadiantCollectionProductIdentityV1(source) ??
    reviewedTcgplayerBwpAliasProductIdentityV1(source) ??
    reviewedTcgplayerNintendoTargetPromoProductIdentityV1(source) ??
    reviewedTcgplayerDeltaSpeciesAliasProductIdentityV1(source) ??
    reviewedTcgplayerEnergyAliasProductIdentityV1(source) ??
    reviewedTcgplayerWcdTeamRushdownProductIdentityV1(source);
}

function matchesReviewedProductTarget(source, target) {
  return matchesReviewedTcgplayerProductTargetV1(source, target) ||
    matchesReviewedTcgplayerG1RcProductTargetV1(source, target) ||
    matchesReviewedTcgplayer30cClassicAliasProductTargetV1(source, target) ||
    matchesReviewedTcgplayerExuUnownProductTargetV1(source, target) ||
    matchesReviewedTcgplayerAliasWaveProductTargetV1(source, target) ||
    matchesReviewedTcgplayerPrismStarAliasProductTargetV1(source, target) ||
    matchesReviewedTcgplayerAliasWave2ProductTargetV1(source, target) ||
    matchesReviewedTcgplayerBw11RadiantCollectionProductTargetV1(source, target) ||
    matchesReviewedTcgplayerBwpAliasProductTargetV1(source, target) ||
    matchesReviewedTcgplayerNintendoTargetPromoProductTargetV1(source, target) ||
    matchesReviewedTcgplayerDeltaSpeciesAliasProductTargetV1(source, target) ||
    matchesReviewedTcgplayerEnergyAliasProductTargetV1(source, target) ||
    matchesReviewedTcgplayerWcdTeamRushdownProductTargetV1(source, target);
}

function normalizedAlnum(value) {
  return text(value)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/♂/g, " m ")
    .replace(/♀/g, " f ")
    .replace(/[’‘`´]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeTcgplayerMappingNameV1(value) {
  // Remove only the printed coordinate, never a trailing treatment or stamp.
  const withoutCollectorSuffix = text(value).replace(
    /\s+-\s+[a-z]*\d+[a-z]?(?:\/[a-z0-9.-]+)?(?=\s*(?:\([^)]*\)\s*)*$)/i,
    "",
  );
  return normalizedAlnum(withoutCollectorSuffix);
}

export function normalizeTcgplayerMappingNumberV1(value) {
  const left = text(value)
    .replace(/[‐‑–—]/g, "-")
    .replace(/[⁄∕]/g, "/")
    .split("/", 1)[0]
    .replace(/^#/, "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();
  if (!left) return "";
  const match = left.match(/^([A-Z]*)(\d+)([A-Z]*)$/);
  if (!match) return left;
  return `${match[1]}${match[2].replace(/^0+/, "") || "0"}${match[3]}`;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function tcgplayerExactMappingCandidateFingerprintV1(candidate) {
  return createHash("sha256").update(stableJson(candidate)).digest("hex");
}

export function quarantineTcgplayerTargetCollisionsV1(results) {
  const candidatesByTarget = new Map();
  for (const row of results) {
    if (row.disposition !== "candidate" || !row.target?.card_print_id) continue;
    const rows = candidatesByTarget.get(row.target.card_print_id) ?? [];
    rows.push(row);
    candidatesByTarget.set(row.target.card_print_id, rows);
  }

  return results.map((row) => {
    const collisions =
      row.disposition === "candidate"
        ? candidatesByTarget.get(row.target?.card_print_id) ?? []
        : [];
    if (collisions.length <= 1) return row;

    const {
      disposition: _disposition,
      candidate_fingerprint: candidateFingerprint,
      evidence_lane: evidenceLane,
      mapping_method: mappingMethod,
      mapping_confidence: mappingConfidence,
      target,
      evidence,
      ...base
    } = row;
    return {
      ...base,
      disposition: "blocked",
      reason: "multiple_source_products_match_same_canonical_target",
      collision: {
        target,
        source_products: collisions
          .map((candidate) => ({
            source_product_id: candidate.source_product_id,
            source_product_name: candidate.source_product_name,
            source_subtypes: candidate.source_subtypes,
          }))
          .sort((left, right) => left.source_product_id - right.source_product_id),
      },
      former_candidate_evidence: {
        evidence_lane: evidenceLane,
        mapping_method: mappingMethod,
        mapping_confidence: mappingConfidence,
        evidence,
        candidate_fingerprint: candidateFingerprint,
      },
    };
  });
}

function targetEvidence(target) {
  return {
    card_print_id: target.card_print_id,
    gv_id: target.gv_id,
    set_id: target.set_id,
    set_code: target.set_code,
    canonical_name: target.name,
    canonical_number: target.number,
    variant_key: text(target.variant_key),
    active_standard_identity_count: Number(
      target.active_standard_identity_count ?? 0,
    ),
    active_tcgplayer_mapping_count: Number(
      target.active_tcgplayer_mapping_count ?? 0,
    ),
  };
}

function targetFailures(source, target) {
  const failures = [];
  if (trainerKitPilotCardV1(source) && !matchesTrainerKitPilotMappingV1(source, target)) {
    failures.push("trainer_kit_pilot_identity_mismatch");
  }
  if (!text(target.set_id)) failures.push("missing_target_set_id");
  if (!text(target.set_code)) failures.push("missing_target_set_code");
  if (text(target.variant_key)) failures.push("target_not_base_variant");
  if (
    normalizeTcgplayerMappingNameV1(source.source_product_name) !==
    normalizeTcgplayerMappingNameV1(target.name)
  ) {
    failures.push("normalized_name_mismatch");
  }
  if (
    normalizeTcgplayerMappingNumberV1(source.printed_number) !==
    normalizeTcgplayerMappingNumberV1(target.number)
  ) {
    failures.push("normalized_number_mismatch");
  }
  if (Number(target.active_standard_identity_count) !== 1) {
    failures.push("target_missing_unique_active_standard_identity");
  }
  if (Number(target.active_tcgplayer_mapping_count) !== 0) {
    failures.push("target_already_has_active_tcgplayer_mapping");
  }
  return failures;
}

function baseResult(source) {
  const reviewedIdentity = reviewedProductIdentity(source);
  return {
    ...(trainerKitPilotCardV1(source) ? { pilot_policy_version: TCGPLAYER_TRAINER_KIT_PILOT_V1 } : {}),
    ...(reviewedIdentity ? {
      reviewed_product_identity_authority_version:
        reviewedIdentity.authority_version,
    } : {}),
    policy_version: TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_3,
    source_product_id: Number(source.source_product_id),
    source_product_name: text(source.source_product_name),
    source_group_id: Number(source.source_group_id),
    source_group_name: text(source.source_group_name),
    printed_number: text(source.printed_number),
    normalized_source_name: normalizeTcgplayerMappingNameV1(
      source.source_product_name,
    ),
    normalized_source_number: normalizeTcgplayerMappingNumberV1(
      source.printed_number,
    ),
    source_subtypes: [...new Set(source.source_subtypes ?? [])].sort(),
    supporting_gap_observation_ids: [
      ...new Set(source.supporting_gap_observation_ids ?? []),
    ].sort(),
    supporting_gap_row_count: Number(source.supporting_gap_row_count ?? 0),
  };
}

function blocked(source, reason, detail = {}) {
  return {
    ...baseResult(source),
    disposition: "blocked",
    reason,
    ...detail,
  };
}

export function planTcgplayerExactMappingCandidateV1({
  source,
  directTargets = [],
  groupConsensus = null,
  authority = null,
  setTargets = [],
}) {
  const base = baseResult(source);
  const scope = classifyTcgplayerMarketProductScopeV1_2(source);
  const reservedReviewedIdentity =
    reviewedProductIdentityById(source?.source_product_id);
  const reviewedIdentity = reviewedProductIdentity(source);

  if (reservedReviewedIdentity && !reviewedIdentity) {
    return blocked(source, "reviewed_product_source_drift", {
      evidence_lane: "reviewed_product_identity_authority",
    });
  }

  const pilotSource = matchesTrainerKitPilotSourceV1(source);
  if ((trainerKitPilotCardV1(source) && !pilotSource) ||
      (!scope.in_scope &&
        !(scope.rule_id === "deck_exclusive_special_variant" && pilotSource) &&
        !reviewedIdentity)) {
    return blocked(source, "source_outside_product_v1_scope", {
      product_scope: scope,
    });
  }
  if (!source.has_printed_number_evidence ||
      (!base.normalized_source_number && !reviewedIdentity)) {
    return blocked(source, "missing_printed_number_evidence");
  }
  if (Number(source.active_source_mapping_count ?? 0) !== 0) {
    return blocked(source, "source_product_already_mapped");
  }

  if (reviewedIdentity) {
    const possibleTargets = [...directTargets, ...setTargets].filter(
      (target, index, all) =>
        all.findIndex((candidate) =>
          candidate.card_print_id === target.card_print_id,
        ) === index,
    );
    const target = possibleTargets.find((candidate) =>
      matchesReviewedProductTarget(source, candidate),
    );
    if (!target) {
      return blocked(source, "reviewed_product_target_missing_or_drifted", {
        evidence_lane: "reviewed_product_identity_authority",
        candidate_targets: possibleTargets.map(targetEvidence),
      });
    }
    const failures = [];
    if (Number(target.active_standard_identity_count) !== 1) {
      failures.push("target_missing_unique_active_standard_identity");
    }
    if (Number(target.active_tcgplayer_mapping_count) !== 0) {
      failures.push("target_already_has_active_tcgplayer_mapping");
    }
    if (failures.length > 0) {
      return blocked(source, failures[0], {
        all_failures: failures,
        evidence_lane: "reviewed_product_identity_authority",
        candidate_targets: [targetEvidence(target)],
      });
    }
    const candidate = {
      ...base,
      disposition: "candidate",
      evidence_lane: "reviewed_product_identity_authority",
      mapping_method: "exact_reviewed_product_identity_authority_v1",
      mapping_confidence: 1,
      target: targetEvidence(target),
      evidence: {
        authority_version: reviewedIdentity.authority_version,
        exact_source_product: true,
        exact_target_parent: true,
        exact_variant: true,
        verified_printing_gv_id: reviewedIdentity.printing.printing_gv_id,
        verified_printing_finish: reviewedIdentity.printing.finish_key,
        verified_printing_provenance_source:
          reviewedIdentity.printing.provenance_source,
        verified_printing_provenance_ref:
          reviewedIdentity.printing.provenance_ref,
        unique_active_standard_identity: true,
        target_unmapped: true,
      },
    };
    return {
      ...candidate,
      candidate_fingerprint:
        tcgplayerExactMappingCandidateFingerprintV1(candidate),
    };
  }

  if (directTargets.length > 0) {
    if (directTargets.length !== 1) {
      return blocked(source, "embedded_identity_not_unique", {
        candidate_targets: directTargets.map(targetEvidence),
      });
    }
    const target = directTargets[0];
    const failures = targetFailures(source, target);
    if (failures.length > 0) {
      return blocked(source, failures[0], {
        all_failures: failures,
        candidate_targets: [targetEvidence(target)],
        evidence_lane: "embedded_tcgcsv_identity",
      });
    }
    const candidate = {
      ...base,
      disposition: "candidate",
      evidence_lane: "embedded_tcgcsv_identity",
      mapping_method: "exact_embedded_tcgcsv_identity_v1",
      mapping_confidence: 1,
      target: targetEvidence(target),
      evidence: {
        embedded_external_id: text(target.embedded_external_id),
        exact_name: true,
        exact_number: true,
        unique_active_standard_identity: true,
        target_unmapped: true,
      },
    };
    return {
      ...candidate,
      candidate_fingerprint:
        tcgplayerExactMappingCandidateFingerprintV1(candidate),
    };
  }

  const setAuthority = trainerKitPilotPlanningAuthorityV1(source) ?? (
    groupConsensus?.set_count === 1
      ? {
          evidence_lane: "unique_group_set_consensus",
          mapping_method: "exact_group_set_number_name_consensus_v1",
          mapping_confidence: 0.99,
          set_id: groupConsensus.set_id,
          set_code: groupConsensus.set_code,
          authority_evidence: {
            mapped_source_product_count:
              groupConsensus.mapped_source_product_count,
            distinct_target_set_count: groupConsensus.set_count,
          },
        }
      : authority);

  if (!setAuthority) {
    return blocked(source, "missing_unique_set_authority", {
      group_consensus: groupConsensus,
    });
  }

  const matchingTargets = setTargets.filter(
    (target) =>
      target.set_id === setAuthority.set_id &&
      normalizeTcgplayerMappingNameV1(source.source_product_name) ===
        normalizeTcgplayerMappingNameV1(target.name) &&
      normalizeTcgplayerMappingNumberV1(source.printed_number) ===
        normalizeTcgplayerMappingNumberV1(target.number) &&
      !text(target.variant_key),
  );
  if (matchingTargets.length !== 1) {
    const reviewTargets = matchingTargets.length === 0
      ? setTargets.filter(
          (target) =>
            target.set_id === setAuthority.set_id &&
            normalizeTcgplayerMappingNumberV1(source.printed_number) ===
              normalizeTcgplayerMappingNumberV1(target.number) &&
            !text(target.variant_key),
        )
      : [];
    return blocked(
      source,
      matchingTargets.length === 0
        ? "no_exact_set_number_name_target"
        : "ambiguous_exact_set_number_name_target",
      {
        evidence_lane: setAuthority.evidence_lane,
        set_authority: setAuthority,
        candidate_targets: matchingTargets.map(targetEvidence),
        ...(reviewTargets.length > 0
          ? { review_targets: reviewTargets.map(targetEvidence) }
          : {}),
      },
    );
  }

  const target = matchingTargets[0];
  const failures = targetFailures(source, target);
  if (failures.length > 0) {
    return blocked(source, failures[0], {
      all_failures: failures,
      evidence_lane: setAuthority.evidence_lane,
      set_authority: setAuthority,
      candidate_targets: [targetEvidence(target)],
    });
  }

  const candidate = {
    ...base,
    disposition: "candidate",
    evidence_lane: setAuthority.evidence_lane,
    mapping_method: setAuthority.mapping_method,
    mapping_confidence: setAuthority.mapping_confidence,
    target: targetEvidence(target),
    evidence: {
      ...setAuthority.authority_evidence,
      exact_name: true,
      exact_number: true,
      unique_active_standard_identity: true,
      target_unmapped: true,
    },
  };
  return {
    ...candidate,
    candidate_fingerprint:
      tcgplayerExactMappingCandidateFingerprintV1(candidate),
  };
}
