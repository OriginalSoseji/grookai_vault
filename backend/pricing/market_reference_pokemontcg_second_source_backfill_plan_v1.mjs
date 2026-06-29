import crypto from "node:crypto";

import { referenceCandidateHashV1 } from "./market_reference_warehouse_backfill_manifest_v1.mjs";

export const MARKET_REFERENCE_POKEMONTCG_SECOND_SOURCE_BACKFILL_PLAN_VERSION = "MARKET_REFERENCE_POKEMONTCG_SECOND_SOURCE_BACKFILL_PLAN_V1";
export const EXPECTED_SECOND_SOURCE_CANDIDATE_COUNT = 10720;
export const EXPECTED_SECOND_SOURCE_NORMALIZED_COUNT = 10720;
export const EXPECTED_SECOND_SOURCE_TARGET_COUNT = 570;
export const EXPECTED_SECOND_SOURCE_MANIFEST_HASH = "e8a91143648af9076118642afb82da02be8e2086fc7f91995f7cc497afd713fc";
export const EXPECTED_SECOND_SOURCE_NORMALIZED_HASH = "387d7dd270c26f1a0b5a4ad41506abe0b6d54a08f890c2f755b94d2c23d92eda";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

export function sha256V1(value) {
  const text = typeof value === "string" ? value : JSON.stringify(stable(value));
  return crypto.createHash("sha256").update(text).digest("hex");
}

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    if (key === null || key === undefined || key === "") continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function duplicateCount(rows, getKey) {
  const seen = new Set();
  let duplicates = 0;
  for (const row of rows) {
    const key = getKey(row);
    if (seen.has(key)) duplicates += 1;
    seen.add(key);
  }
  return duplicates;
}

function buildCandidateRows(candidateEvidence) {
  return candidateEvidence.map((candidate) => ({
    acquisition_run_id: null,
    raw_snapshot_id: null,
    card_print_id: candidate.card_print_id,
    gv_id: candidate.gv_id,
    source: candidate.source,
    source_type: "reference",
    source_url: candidate.source_url ?? null,
    raw_title: candidate.raw_title ?? null,
    raw_price: candidate.raw_price ?? null,
    currency: candidate.currency ?? null,
    condition_hint: candidate.condition_hint ?? null,
    finish_hint: candidate.finish_hint ?? null,
    observed_at: candidate.observed_at,
    match_confidence_hint: candidate.match_confidence_hint ?? "unreviewed",
    exclusion_flags: candidate.exclusion_flags ?? [],
    needs_review: true,
    can_publish_price_directly: false,
    raw_payload: candidate.raw_payload ?? {},
    candidate_hash: referenceCandidateHashV1(candidate),
  }));
}

function buildNormalizedRows(normalizedEvidence) {
  return normalizedEvidence.map((row) => ({
    candidate_hash: referenceCandidateHashV1(row),
    card_print_id: row.card_print_id,
    source: row.source,
    normalizer_version: row.normalizer_version,
    metric_key: row.metric_key ?? null,
    metric_family: row.metric_family ?? null,
    normalized_price: row.normalized_price ?? null,
    normalized_currency: row.normalized_currency ?? null,
    model_disposition: row.model_disposition,
    model_eligible: row.model_eligible === true,
    evidence_quality_score: row.evidence_quality_score ?? null,
    weight_hint: row.weight_hint ?? null,
    quality_flags: row.quality_flags ?? [],
    group_reference_median: row.group_reference_median ?? null,
    normalized_payload: {
      gv_id: row.gv_id ?? null,
      source_url: row.source_url ?? null,
      raw_title: row.raw_title ?? null,
      condition_hint: row.condition_hint ?? null,
      finish_hint: row.finish_hint ?? null,
      observed_at: row.observed_at ?? null,
      match_confidence_hint: row.match_confidence_hint ?? null,
      needs_review: row.needs_review === true,
      can_publish_price_directly: false,
      raw_payload: row.raw_payload ?? {},
    },
  }));
}

export function buildPokemonTcgSecondSourceBackfillPlanRowsV1({
  manifest,
  normalizedArtifact,
} = {}) {
  if (!manifest || typeof manifest !== "object") throw new Error("[pokemontcg-second-source-backfill-plan] manifest is required");
  if (!normalizedArtifact || typeof normalizedArtifact !== "object") throw new Error("[pokemontcg-second-source-backfill-plan] normalizedArtifact is required");
  if (!Array.isArray(manifest.candidate_evidence)) throw new Error("[pokemontcg-second-source-backfill-plan] manifest.candidate_evidence must be an array");
  if (!Array.isArray(normalizedArtifact.normalized_evidence)) throw new Error("[pokemontcg-second-source-backfill-plan] normalized_evidence must be an array");

  const candidateRows = buildCandidateRows(manifest.candidate_evidence);
  const normalizedRows = buildNormalizedRows(normalizedArtifact.normalized_evidence);

  return {
    candidateRows,
    normalizedRows,
    row_counts: {
      market_reference_candidates: candidateRows.length,
      market_reference_normalized_evidence: normalizedRows.length,
    },
  };
}

export function buildPokemonTcgSecondSourceBackfillPlanV1({
  manifest,
  normalizedArtifact,
  manifestHash,
  normalizedHash,
  generatedAt = new Date().toISOString(),
  remoteCollisionSummary = null,
} = {}) {
  const rows = buildPokemonTcgSecondSourceBackfillPlanRowsV1({ manifest, normalizedArtifact });
  const candidateHashes = new Set(rows.candidateRows.map((row) => `${row.source}:${row.candidate_hash}`));
  const normalizedCandidateHashes = new Set(rows.normalizedRows.map((row) => `${row.source}:${row.candidate_hash}`));
  const targetCount = manifest?.summary?.covered_targets ?? manifest?.summary?.first_wave_total ?? null;
  const findings = [];

  if (manifestHash !== EXPECTED_SECOND_SOURCE_MANIFEST_HASH) findings.push("manifest_hash_mismatch");
  if (normalizedHash !== EXPECTED_SECOND_SOURCE_NORMALIZED_HASH) findings.push("normalized_artifact_hash_mismatch");
  if (targetCount !== EXPECTED_SECOND_SOURCE_TARGET_COUNT) findings.push("target_count_mismatch");
  if (rows.candidateRows.length !== EXPECTED_SECOND_SOURCE_CANDIDATE_COUNT) findings.push("candidate_row_count_mismatch");
  if (rows.normalizedRows.length !== EXPECTED_SECOND_SOURCE_NORMALIZED_COUNT) findings.push("normalized_row_count_mismatch");
  if (manifest?.ready !== true) findings.push("manifest_not_ready");
  if ((manifest?.findings ?? []).length > 0) findings.push("manifest_contains_findings");
  if (normalizedArtifact?.proofs?.no_database_write_boundary !== true) findings.push("normalized_db_boundary_missing");
  if (normalizedArtifact?.proofs?.no_public_price_publication_boundary !== true) findings.push("normalized_public_price_boundary_missing");
  if (rows.candidateRows.some((row) => row.source !== "pokemontcg_io_reference")) findings.push("unexpected_candidate_source");
  if (rows.normalizedRows.some((row) => row.source !== "pokemontcg_io_reference")) findings.push("unexpected_normalized_source");
  if (rows.candidateRows.some((row) => row.needs_review !== true)) findings.push("candidate_missing_review_gate");
  if (rows.candidateRows.some((row) => row.can_publish_price_directly !== false)) findings.push("candidate_direct_publish_detected");
  if (normalizedArtifact.normalized_evidence.some((row) => row.can_publish_price_directly === true)) findings.push("normalized_direct_publish_detected");
  if (duplicateCount(rows.candidateRows, (row) => `${row.source}:${row.candidate_hash}`) > 0) findings.push("candidate_hash_duplicates_detected");
  if (duplicateCount(rows.normalizedRows, (row) => `${row.source}:${row.candidate_hash}`) > 0) findings.push("normalized_candidate_hash_duplicates_detected");
  if ([...normalizedCandidateHashes].some((hash) => !candidateHashes.has(hash))) findings.push("normalized_rows_without_candidate_hash_match");
  if ((remoteCollisionSummary?.candidate_hash_collisions ?? 0) > 0) findings.push("remote_candidate_hash_collisions_detected");

  const packageFingerprint = sha256V1({
    package_id: "MARKET-REFERENCE-POKEMONTCG-SECOND-SOURCE-BACKFILL-PLAN-V1",
    version: MARKET_REFERENCE_POKEMONTCG_SECOND_SOURCE_BACKFILL_PLAN_VERSION,
    manifest_hash: manifestHash,
    normalized_artifact_hash: normalizedHash,
    row_counts: rows.row_counts,
    target_count: targetCount,
    candidate_hashes_sha256: sha256V1([...candidateHashes].sort().join("\n")),
    normalized_candidate_hashes_sha256: sha256V1([...normalizedCandidateHashes].sort().join("\n")),
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      public_price_publication: false,
    },
  });

  return {
    package_id: "MARKET-REFERENCE-POKEMONTCG-SECOND-SOURCE-BACKFILL-PLAN-V1",
    version: MARKET_REFERENCE_POKEMONTCG_SECOND_SOURCE_BACKFILL_PLAN_VERSION,
    generated_at: generatedAt,
    mode: "apply_plan_only_no_writes",
    manifest_hash_sha256: manifestHash,
    normalized_artifact_hash_sha256: normalizedHash,
    expected_manifest_hash_sha256: EXPECTED_SECOND_SOURCE_MANIFEST_HASH,
    expected_normalized_artifact_hash_sha256: EXPECTED_SECOND_SOURCE_NORMALIZED_HASH,
    package_fingerprint_sha256: packageFingerprint,
    proposed_table_row_counts: rows.row_counts,
    target_count: targetCount,
    counts: {
      candidate_source_counts: countBy(rows.candidateRows, (row) => row.source),
      candidate_currency_counts: countBy(rows.candidateRows, (row) => row.currency),
      candidate_finish_counts: countBy(rows.candidateRows, (row) => row.finish_hint),
      normalized_source_counts: countBy(rows.normalizedRows, (row) => row.source),
      normalized_currency_counts: countBy(rows.normalizedRows, (row) => row.normalized_currency),
      normalized_disposition_counts: countBy(rows.normalizedRows, (row) => row.model_disposition),
      normalized_model_eligible_counts: countBy(rows.normalizedRows, (row) => row.model_eligible ? "model_eligible" : "not_model_eligible"),
      candidate_hash_duplicates: duplicateCount(rows.candidateRows, (row) => `${row.source}:${row.candidate_hash}`),
      normalized_candidate_hash_duplicates: duplicateCount(rows.normalizedRows, (row) => `${row.source}:${row.candidate_hash}`),
    },
    remote_collision_summary: remoteCollisionSummary,
    apply_order: [
      "market_reference_candidates",
      "market_reference_normalized_evidence",
    ],
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      pricing_rollups: false,
      public_price_publication: false,
      app_visible_pricing: false,
      identity_table_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      merges: false,
    },
    findings,
    ready_for_apply_package: findings.length === 0,
    rows,
  };
}
