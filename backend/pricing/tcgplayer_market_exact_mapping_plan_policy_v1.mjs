import { createHash } from "node:crypto";

import {
  classifyTcgplayerMarketProductScopeV1_1,
} from "./tcgplayer_market_product_scope_v1.mjs";

export const TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1 =
  "TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1";

function text(value) {
  return String(value ?? "").trim();
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
  const withoutCollectorSuffix = text(value).replace(
    /\s+-\s+[a-z]*\d+[a-z]?(?:\/[a-z0-9.-]+)?(?:\s+\([^)]*\))?\s*$/i,
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
  return {
    policy_version: TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1,
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
  const scope = classifyTcgplayerMarketProductScopeV1_1(source);

  if (!scope.in_scope) {
    return blocked(source, "source_outside_product_v1_scope", {
      product_scope: scope,
    });
  }
  if (!source.has_printed_number_evidence || !base.normalized_source_number) {
    return blocked(source, "missing_printed_number_evidence");
  }
  if (Number(source.active_source_mapping_count ?? 0) !== 0) {
    return blocked(source, "source_product_already_mapped");
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

  const setAuthority =
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
      : authority;

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
    return blocked(
      source,
      matchingTargets.length === 0
        ? "no_exact_set_number_name_target"
        : "ambiguous_exact_set_number_name_target",
      {
        evidence_lane: setAuthority.evidence_lane,
        set_authority: setAuthority,
        candidate_targets: matchingTargets.map(targetEvidence),
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
