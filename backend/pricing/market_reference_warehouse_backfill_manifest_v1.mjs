import { createHash } from "node:crypto";

export const MARKET_REFERENCE_WAREHOUSE_BACKFILL_MANIFEST_PHASE = "MEE-08A_MARKET_REFERENCE_WAREHOUSE_BACKFILL_MANIFEST_V1";
export const MARKET_REFERENCE_WAREHOUSE_BACKFILL_MANIFEST_VERSION = "MARKET_REFERENCE_WAREHOUSE_BACKFILL_MANIFEST_V1";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

function sha256(value) {
  const text = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(text).digest("hex");
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

function artifactHash(artifact) {
  return sha256(artifact);
}

function runKey(artifact) {
  return sha256({
    phase: artifact.phase,
    generated_at: artifact.generated_at,
    source_phase: artifact.input_summary?.source_phase ?? null,
    summary: artifact.summary ?? {},
  });
}

function sourceObjectTypeForCandidate(candidate) {
  if (candidate.source === "tcgcsv_reference") return "tcgcsv_price_row";
  if (candidate.source === "pokemontcg_io_reference") return "pokemontcg_card";
  return "reference_candidate";
}

function sourceObjectIdForCandidate(candidate) {
  const payload = candidate.raw_payload ?? {};
  if (candidate.source === "tcgcsv_reference") {
    return [
      payload.group_id ?? "group_unknown",
      payload.product_id ?? "product_unknown",
      payload.subtype_name ?? "subtype_unknown",
      payload.metric ?? "metric_unknown",
    ].join(":");
  }
  if (candidate.source === "pokemontcg_io_reference") {
    return [
      payload.provider ?? "provider_unknown",
      payload.provider_card_id ?? "card_unknown",
      payload.variant ?? "variant_unknown",
      payload.metric ?? "metric_unknown",
    ].join(":");
  }
  return sha256(candidate.raw_payload ?? candidate);
}

function rawSnapshotKeyForCandidate(candidate) {
  return sha256({
    source: candidate.source,
    source_object_type: sourceObjectTypeForCandidate(candidate),
    source_object_id: sourceObjectIdForCandidate(candidate),
    payload_hash: sha256(candidate.raw_payload ?? {}),
  });
}

function candidateComparable(row) {
  return {
    source: row.source ?? null,
    card_print_id: row.card_print_id ?? null,
    source_url: row.source_url ?? null,
    raw_title: row.raw_title ?? null,
    raw_price: row.raw_price ?? row.normalized_price ?? null,
    currency: row.currency ?? row.normalized_currency ?? null,
    condition_hint: row.condition_hint ?? null,
    finish_hint: row.finish_hint ?? null,
    observed_at: row.observed_at ?? null,
    raw_payload: row.raw_payload ?? null,
  };
}

export function referenceCandidateHashV1(row) {
  return sha256(candidateComparable(row));
}

function buildAcquisitionRunRows({ acquisitions, normalizedArtifacts, coverageReport, artifactPaths }) {
  const artifacts = [
    ...acquisitions.map((artifact, index) => ({
      kind: "acquisition",
      artifact,
      path: artifactPaths.acquisitions?.[index] ?? null,
      source_list: [artifact.candidate_evidence?.[0]?.source].filter(Boolean),
    })),
    ...normalizedArtifacts.map((artifact, index) => ({
      kind: "normalization",
      artifact,
      path: artifactPaths.normalized?.[index] ?? null,
      source_list: Object.keys(artifact.counts?.source_counts ?? {}),
    })),
    {
      kind: "coverage",
      artifact: coverageReport,
      path: artifactPaths.coverageReport ?? null,
      source_list: Object.keys(coverageReport.sources ?? {}),
    },
  ];

  return artifacts.map(({ kind, artifact, path, source_list }) => ({
    run_key: runKey(artifact),
    contract_version: MARKET_REFERENCE_WAREHOUSE_BACKFILL_MANIFEST_VERSION,
    source_phase: artifact.phase,
    source_list,
    batch_artifact_path: artifactPaths.batch ?? null,
    batch_artifact_hash: artifactPaths.batchHash ?? null,
    input_artifact_paths: [path].filter(Boolean),
    options: {
      artifact_kind: kind,
      dry_run_manifest_only: true,
    },
    summary: artifact.summary ?? {},
    started_at: artifact.generated_at ?? null,
    finished_at: artifact.generated_at ?? null,
  }));
}

function buildRawSnapshotRows(candidates) {
  return candidates.map((candidate) => ({
    raw_snapshot_key: rawSnapshotKeyForCandidate(candidate),
    source: candidate.source,
    source_object_type: sourceObjectTypeForCandidate(candidate),
    source_object_id: sourceObjectIdForCandidate(candidate),
    source_url: candidate.source_url ?? null,
    raw_payload: candidate.raw_payload ?? {},
    observed_at: candidate.observed_at,
    payload_hash: sha256(candidate.raw_payload ?? {}),
    candidate_hash: referenceCandidateHashV1(candidate),
  }));
}

function dedupeRawSnapshotRows(rawSnapshots) {
  const byKey = new Map();
  for (const row of rawSnapshots) {
    if (!byKey.has(row.raw_snapshot_key)) byKey.set(row.raw_snapshot_key, row);
  }
  return [...byKey.values()];
}

function buildCandidateRows(candidates) {
  return candidates.map((candidate) => ({
    raw_snapshot_key: rawSnapshotKeyForCandidate(candidate),
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

function buildNormalizedRows(normalizedRows) {
  return normalizedRows.map((row) => ({
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

export function buildMarketReferenceWarehouseBackfillRowsV1({
  batch,
  acquisitions,
  normalizedArtifacts,
  coverageReport,
  artifactPaths = {},
} = {}) {
  if (!batch || typeof batch !== "object") throw new Error("[market-reference-backfill] batch artifact is required");
  if (!Array.isArray(acquisitions) || acquisitions.length === 0) throw new Error("[market-reference-backfill] acquisitions are required");
  if (!Array.isArray(normalizedArtifacts) || normalizedArtifacts.length === 0) throw new Error("[market-reference-backfill] normalized artifacts are required");
  if (!coverageReport || typeof coverageReport !== "object") throw new Error("[market-reference-backfill] coverage report is required");

  const candidateEvidence = acquisitions.flatMap((artifact) => artifact.candidate_evidence ?? []);
  const normalizedEvidence = normalizedArtifacts.flatMap((artifact) => artifact.normalized_evidence ?? []);
  const acquisitionRuns = buildAcquisitionRunRows({
    acquisitions,
    normalizedArtifacts,
    coverageReport,
    artifactPaths: {
      ...artifactPaths,
      batchHash: artifactHash(batch),
    },
  });
  const allRawSnapshots = buildRawSnapshotRows(candidateEvidence);
  const rawSnapshots = dedupeRawSnapshotRows(allRawSnapshots);
  const candidateRows = buildCandidateRows(candidateEvidence);
  const normalizedRows = buildNormalizedRows(normalizedEvidence);
  const coverageRows = [{
    report_key: runKey(coverageReport),
    contract_version: MARKET_REFERENCE_WAREHOUSE_BACKFILL_MANIFEST_VERSION,
    batch_artifact_path: artifactPaths.batch ?? null,
    tcgcsv_artifact_path: artifactPaths.tcgcsvAcquisition ?? null,
    pokemontcg_io_artifact_path: artifactPaths.pokemonTcgAcquisition ?? null,
    target_count: coverageReport.summary?.target_count ?? 0,
    covered_target_count: coverageReport.summary?.covered_target_count ?? 0,
    uncovered_target_count: coverageReport.summary?.uncovered_target_count ?? 0,
    source_summary: coverageReport.sources ?? {},
    counts: coverageReport.counts ?? {},
    samples: coverageReport.samples ?? {},
    artifact_path: artifactPaths.coverageReport ?? null,
    report_hash: artifactHash(coverageReport),
    generated_at: coverageReport.generated_at ?? null,
  }];

  return {
    candidateEvidence,
    normalizedEvidence,
    acquisitionRuns,
    rawSnapshots,
    rawSnapshotDuplicateRows: allRawSnapshots.length - rawSnapshots.length,
    candidateRows,
    normalizedRows,
    coverageRows,
  };
}

export function buildMarketReferenceWarehouseBackfillManifestV1({
  batch,
  acquisitions,
  normalizedArtifacts,
  coverageReport,
  artifactPaths = {},
  generatedAt = new Date().toISOString(),
  sampleLimit = 25,
} = {}) {
  if (!batch || typeof batch !== "object") throw new Error("[market-reference-backfill] batch artifact is required");
  if (!Array.isArray(acquisitions) || acquisitions.length === 0) throw new Error("[market-reference-backfill] acquisitions are required");
  if (!Array.isArray(normalizedArtifacts) || normalizedArtifacts.length === 0) throw new Error("[market-reference-backfill] normalized artifacts are required");
  if (!coverageReport || typeof coverageReport !== "object") throw new Error("[market-reference-backfill] coverage report is required");
  if (!Number.isInteger(sampleLimit) || sampleLimit < 1) throw new Error("[market-reference-backfill] sampleLimit must be positive");

  const {
    candidateEvidence,
    normalizedEvidence,
    acquisitionRuns,
    rawSnapshots,
    rawSnapshotDuplicateRows,
    candidateRows,
    normalizedRows,
    coverageRows,
  } = buildMarketReferenceWarehouseBackfillRowsV1({
    batch,
    acquisitions,
    normalizedArtifacts,
    coverageReport,
    artifactPaths: {
      ...artifactPaths,
    },
  });

  const directPublishableCandidates = candidateRows.filter((row) => row.can_publish_price_directly === true).length;
  const candidatesMissingReview = candidateRows.filter((row) => row.needs_review !== true).length;
  const normalizedDirectPublishable = normalizedEvidence.filter((row) => row.can_publish_price_directly === true).length;
  const candidateHashDuplicates = duplicateCount(candidateRows, (row) => `${row.source}:${row.candidate_hash}`);
  const normalizedCandidateMisses = normalizedRows.filter((row) => !candidateRows.some((candidate) => candidate.candidate_hash === row.candidate_hash && candidate.source === row.source)).length;

  const findings = [];
  if (directPublishableCandidates > 0) findings.push("candidate_direct_publishable_rows_detected");
  if (candidatesMissingReview > 0) findings.push("candidate_rows_missing_review_gate");
  if (normalizedDirectPublishable > 0) findings.push("normalized_direct_publishable_rows_detected");
  if (candidateHashDuplicates > 0) findings.push("candidate_hash_duplicates_detected");
  if (normalizedCandidateMisses > 0) findings.push("normalized_rows_without_candidate_hash_match");

  return {
    generated_at: generatedAt,
    contract: "MARKET_EVIDENCE_ENGINE_V1",
    phase: MARKET_REFERENCE_WAREHOUSE_BACKFILL_MANIFEST_PHASE,
    mode: "artifact_only_backfill_manifest_no_db_writes",
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      migration_apply: false,
      pricing_observations_writes: false,
      pricing_rollups: false,
      public_price_publication: false,
      manifest_created: true,
    },
    input_summary: {
      batch_target_count: batch.summary?.target_count ?? null,
      acquisition_artifact_count: acquisitions.length,
      normalized_artifact_count: normalizedArtifacts.length,
      candidate_evidence_count: candidateEvidence.length,
      normalized_evidence_count: normalizedEvidence.length,
      coverage_target_count: coverageReport.summary?.target_count ?? null,
      coverage_covered_target_count: coverageReport.summary?.covered_target_count ?? null,
      coverage_uncovered_target_count: coverageReport.summary?.uncovered_target_count ?? null,
    },
    proposed_table_row_counts: {
      market_reference_acquisition_runs: acquisitionRuns.length,
      market_reference_raw_snapshots: rawSnapshots.length,
      market_reference_candidates: candidateRows.length,
      market_reference_normalized_evidence: normalizedRows.length,
      market_reference_coverage_reports: coverageRows.length,
    },
    counts: {
      candidate_source_counts: countBy(candidateRows, (row) => row.source),
      normalized_source_counts: countBy(normalizedRows, (row) => row.source),
      normalized_disposition_counts: countBy(normalizedRows, (row) => row.model_disposition),
      normalized_model_eligible_counts: countBy(normalizedRows, (row) => row.model_eligible ? "model_eligible" : "not_model_eligible"),
      raw_snapshot_duplicate_rows_deduped: rawSnapshotDuplicateRows,
      candidate_hash_duplicates: candidateHashDuplicates,
      normalized_rows_without_candidate_hash_match: normalizedCandidateMisses,
    },
    findings,
    ready_for_db_backfill_apply_plan: findings.length === 0,
    manifest_hash_sha256: sha256({
      acquisitionRuns,
      rawSnapshots,
      candidateRows,
      normalizedRows,
      coverageRows,
    }),
    samples: {
      acquisition_runs: acquisitionRuns.slice(0, sampleLimit),
      raw_snapshots: rawSnapshots.slice(0, sampleLimit),
      candidates: candidateRows.slice(0, sampleLimit),
      normalized_evidence: normalizedRows.slice(0, sampleLimit),
      coverage_reports: coverageRows,
    },
  };
}
