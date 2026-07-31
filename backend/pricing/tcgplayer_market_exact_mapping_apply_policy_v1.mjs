import { createHash } from "node:crypto";

import {
  tcgplayerExactMappingCandidateFingerprintV1,
  TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_1,
} from "./tcgplayer_market_exact_mapping_plan_policy_v1.mjs";

export const TCGPLAYER_MARKET_EXACT_MAPPING_APPLY_POLICY_V1 =
  "TCGPLAYER_MARKET_EXACT_MAPPING_APPLY_POLICY_V1";
export const TCGPLAYER_MARKET_EXACT_MAPPING_META_SCHEMA_V1 =
  "TCGPLAYER_MARKET_EXACT_MAPPING_META_SCHEMA_V1";
export const TCGPLAYER_MARKET_EXACT_MAPPING_APPLY_CONFIRMATION_V1 =
  "TCGPLAYER_MARKET_EXACT_MAPPING_APPLY_V1";
export const TCGPLAYER_MARKET_EXACT_MAPPING_MAX_BATCH_SIZE_V1 = 25;

function text(value) {
  return String(value ?? "").trim();
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function tcgplayerExactMappingApplyFingerprintV1(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function validateTcgplayerExactMappingCandidateForApplyV1(candidate) {
  const failures = [];
  if (
    candidate?.policy_version !==
    TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_1
  ) {
    failures.push("unexpected_candidate_policy_version");
  }
  if (candidate?.disposition !== "candidate") {
    failures.push("candidate_disposition_not_candidate");
  }
  if (!Number.isInteger(Number(candidate?.source_product_id))) {
    failures.push("invalid_source_product_id");
  }
  if (!text(candidate?.target?.card_print_id)) {
    failures.push("missing_target_card_print_id");
  }
  if (!text(candidate?.target?.gv_id)) failures.push("missing_target_gv_id");
  if (text(candidate?.target?.variant_key)) {
    failures.push("target_not_base_variant");
  }
  if (Number(candidate?.target?.active_standard_identity_count) !== 1) {
    failures.push("target_missing_unique_active_standard_identity");
  }
  if (Number(candidate?.target?.active_tcgplayer_mapping_count) !== 0) {
    failures.push("target_already_mapped_in_plan");
  }
  if (!text(candidate?.mapping_method)) failures.push("missing_mapping_method");
  const confidence = Number(candidate?.mapping_confidence);
  if (!Number.isFinite(confidence) || confidence < 0.99 || confidence > 1) {
    failures.push("mapping_confidence_below_apply_floor");
  }
  if (!Array.isArray(candidate?.supporting_gap_observation_ids)) {
    failures.push("missing_supporting_observations");
  }

  const { candidate_fingerprint: suppliedFingerprint, ...fingerprintPayload } =
    candidate ?? {};
  const expectedFingerprint =
    tcgplayerExactMappingCandidateFingerprintV1(fingerprintPayload);
  if (
    !text(suppliedFingerprint) ||
    suppliedFingerprint !== expectedFingerprint
  ) {
    failures.push("candidate_fingerprint_mismatch");
  }
  return {
    accepted: failures.length === 0,
    failures,
    expected_fingerprint: expectedFingerprint,
  };
}

function duplicateValues(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

export function selectTcgplayerExactMappingApplyBatchV1(
  candidates,
  {
    limit,
    excludedSourceProductIds = [],
    excludedTargetCardPrintIds = [],
  } = {},
) {
  const batchLimit = Number(limit);
  if (
    !Number.isInteger(batchLimit) ||
    batchLimit < 1 ||
    batchLimit > TCGPLAYER_MARKET_EXACT_MAPPING_MAX_BATCH_SIZE_V1
  ) {
    throw new Error(
      `APPLY_LIMIT_OUT_OF_RANGE:1-${TCGPLAYER_MARKET_EXACT_MAPPING_MAX_BATCH_SIZE_V1}`,
    );
  }
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("CANDIDATE_ARTIFACT_EMPTY");
  }

  const validationFailures = candidates.flatMap((candidate) => {
    const result = validateTcgplayerExactMappingCandidateForApplyV1(candidate);
    return result.accepted
      ? []
      : [
          {
            source_product_id: candidate?.source_product_id ?? null,
            failures: result.failures,
          },
        ];
  });
  if (validationFailures.length > 0) {
    throw new Error(
      `CANDIDATE_ARTIFACT_INVALID:${JSON.stringify(validationFailures)}`,
    );
  }

  const duplicateSourceIds = duplicateValues(
    candidates.map((row) => Number(row.source_product_id)),
  );
  const duplicateTargetIds = duplicateValues(
    candidates.map((row) => row.target.card_print_id),
  );
  const duplicateFingerprints = duplicateValues(
    candidates.map((row) => row.candidate_fingerprint),
  );
  if (
    duplicateSourceIds.length ||
    duplicateTargetIds.length ||
    duplicateFingerprints.length
  ) {
    throw new Error(
      `CANDIDATE_ARTIFACT_COLLISION:${JSON.stringify({
        duplicate_source_product_ids: duplicateSourceIds,
        duplicate_target_card_print_ids: duplicateTargetIds,
        duplicate_candidate_fingerprints: duplicateFingerprints,
      })}`,
    );
  }

  const excludedSources = new Set(
    excludedSourceProductIds.map((value) => Number(value)),
  );
  const excludedTargets = new Set(excludedTargetCardPrintIds.map(text));
  const ordered = [...candidates].sort(
    (left, right) =>
      Number(left.source_product_id) - Number(right.source_product_id) ||
      left.target.card_print_id.localeCompare(right.target.card_print_id),
  );
  const excluded = ordered.filter(
    (row) =>
      excludedSources.has(Number(row.source_product_id)) ||
      excludedTargets.has(row.target.card_print_id),
  );
  const selected = ordered
    .filter(
      (row) =>
        !excludedSources.has(Number(row.source_product_id)) &&
        !excludedTargets.has(row.target.card_print_id),
    )
    .slice(0, batchLimit);
  if (selected.length !== batchLimit) {
    throw new Error(
      `INSUFFICIENT_COLLISION_FREE_CANDIDATES:${selected.length}/${batchLimit}`,
    );
  }

  const batchFingerprint = tcgplayerExactMappingApplyFingerprintV1(
    selected.map((row) => ({
      source_product_id: Number(row.source_product_id),
      target_card_print_id: row.target.card_print_id,
      candidate_fingerprint: row.candidate_fingerprint,
    })),
  );
  return {
    policy_version: TCGPLAYER_MARKET_EXACT_MAPPING_APPLY_POLICY_V1,
    selected,
    excluded,
    candidate_count: candidates.length,
    selected_count: selected.length,
    excluded_count: excluded.length,
    batch_fingerprint: batchFingerprint,
  };
}

export function buildTcgplayerExactMappingMetaV1(candidate, context) {
  return {
    schema_version: TCGPLAYER_MARKET_EXACT_MAPPING_META_SCHEMA_V1,
    mapping_method: candidate.mapping_method,
    confidence: Number(candidate.mapping_confidence),
    evidence_lane: candidate.evidence_lane,
    apply_policy_version: TCGPLAYER_MARKET_EXACT_MAPPING_APPLY_POLICY_V1,
    candidate_policy_version: candidate.policy_version,
    candidate_fingerprint: candidate.candidate_fingerprint,
    batch_fingerprint: context.batch_fingerprint,
    maintenance_run_id: context.maintenance_run_id,
    source_sync_run_id: context.source_sync_run_id,
    candidate_artifact_sha256: context.candidate_artifact_sha256,
    candidate_artifact_path: context.candidate_artifact_path,
    candidate_plan_commit_sha: context.candidate_plan_commit_sha,
    producing_commit_sha: context.producing_commit_sha,
    source_group_id: Number(candidate.source_group_id),
    source_group_name: candidate.source_group_name,
    canonical_gv_id: candidate.target.gv_id,
    supporting_gap_observation_ids:
      candidate.supporting_gap_observation_ids,
  };
}
