import crypto from "node:crypto";

import { referenceCandidateHashV1 } from "./market_reference_warehouse_backfill_manifest_v1.mjs";

export const MARKET_REFERENCE_REMAINING_SINGLE_SOURCE_EXACT_BACKFILL_PLAN_VERSION = "MEE_09R_REMAINING_SINGLE_SOURCE_EXACT_SOURCE_BACKFILL_PLAN_V1";
export const EXPECTED_MEE_09Q_CANDIDATE_EVIDENCE_MANIFEST_HASH = "18a642c2731441f83dfcd2908e375af0ad3fd62211eb6ca6e8088cc7c4e4e168";
export const EXPECTED_MEE_09P_SOURCE_PACKAGE_FINGERPRINT = "aa015df3496947b1bc31c028c5c0fca848fccf85c129b94ddc80ef39c84aa077";
export const EXPECTED_MEE_09Q_CANDIDATE_COUNT = 15;

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

function buildProposedCandidateRows(candidateEvidence) {
  return candidateEvidence.map((candidate) => ({
    acquisition_run_id: null,
    raw_snapshot_id: null,
    card_print_id: candidate.card_print_id,
    gv_id: candidate.gv_id,
    source: candidate.source,
    source_type: candidate.source_type ?? "active_listing",
    source_url: candidate.source_url ?? null,
    raw_title: candidate.raw_title ?? null,
    raw_price: candidate.raw_price ?? null,
    currency: candidate.currency ?? null,
    condition_hint: candidate.condition_hint ?? null,
    finish_hint: candidate.finish_hint ?? null,
    observed_at: candidate.observed_at ?? null,
    match_confidence_hint: candidate.match_confidence_hint ?? "unreviewed",
    exclusion_flags: candidate.exclusion_flags ?? ["manual_review_required"],
    needs_review: true,
    can_publish_price_directly: false,
    raw_payload: candidate.raw_payload ?? {},
    candidate_hash: referenceCandidateHashV1(candidate),
  }));
}

export function buildRemainingSingleSourceExactSourceBackfillPlanRowsV1({ fetchArtifact } = {}) {
  if (!fetchArtifact || typeof fetchArtifact !== "object") {
    throw new Error("[remaining-single-source-backfill-plan] fetchArtifact is required");
  }
  if (!Array.isArray(fetchArtifact.candidate_evidence)) {
    throw new Error("[remaining-single-source-backfill-plan] fetchArtifact.candidate_evidence must be an array");
  }

  const candidateRows = buildProposedCandidateRows(fetchArtifact.candidate_evidence);
  return {
    candidateRows,
    normalizedRows: [],
    row_counts: {
      market_reference_candidates_proposed: candidateRows.length,
      market_reference_normalized_evidence_proposed: 0,
    },
  };
}

export function buildRemainingSingleSourceExactSourceBackfillPlanV1({
  fetchArtifact,
  candidateEvidenceManifestHash,
  sourcePackageFingerprint,
  generatedAt = new Date().toISOString(),
} = {}) {
  const rows = buildRemainingSingleSourceExactSourceBackfillPlanRowsV1({ fetchArtifact });
  const candidateHashes = new Set(rows.candidateRows.map((row) => `${row.source}:${row.candidate_hash}`));
  const findings = [];
  const schemaBlockers = [];

  if (candidateEvidenceManifestHash !== EXPECTED_MEE_09Q_CANDIDATE_EVIDENCE_MANIFEST_HASH) findings.push("candidate_evidence_manifest_hash_mismatch");
  if (sourcePackageFingerprint !== EXPECTED_MEE_09P_SOURCE_PACKAGE_FINGERPRINT) findings.push("source_package_fingerprint_mismatch");
  if (rows.candidateRows.length !== EXPECTED_MEE_09Q_CANDIDATE_COUNT) findings.push("candidate_row_count_mismatch");
  if (fetchArtifact?.ready_for_review_backfill_plan !== true) findings.push("fetch_artifact_not_ready_for_review_backfill_plan");
  if ((fetchArtifact?.findings ?? []).length > 0) findings.push("fetch_artifact_contains_findings");
  if (rows.candidateRows.some((row) => row.source !== "ebay_active")) findings.push("unexpected_candidate_source");
  if (rows.candidateRows.some((row) => row.source_type !== "active_listing")) findings.push("unexpected_candidate_source_type");
  if (rows.candidateRows.some((row) => row.needs_review !== true)) findings.push("candidate_missing_review_gate");
  if (rows.candidateRows.some((row) => row.can_publish_price_directly !== false)) findings.push("candidate_direct_publish_detected");
  if (duplicateCount(rows.candidateRows, (row) => `${row.source}:${row.candidate_hash}`) > 0) findings.push("candidate_hash_duplicates_detected");

  if (rows.candidateRows.some((row) => row.source === "ebay_active")) {
    schemaBlockers.push("warehouse_schema_does_not_allow_ebay_active_source");
  }
  if (rows.candidateRows.some((row) => row.source_type === "active_listing")) {
    schemaBlockers.push("warehouse_schema_requires_reference_source_type_only");
  }
  if (rows.candidateRows.length > 0) {
    schemaBlockers.push("active_listing_evidence_requires_market_reference_schema_extension");
  }
  findings.push(...schemaBlockers);

  const packageFingerprint = sha256V1({
    package_id: "MARKET-REFERENCE-REMAINING-SINGLE-SOURCE-EXACT-SOURCE-BACKFILL-PLAN-V1",
    version: MARKET_REFERENCE_REMAINING_SINGLE_SOURCE_EXACT_BACKFILL_PLAN_VERSION,
    candidate_evidence_manifest_hash: candidateEvidenceManifestHash,
    source_package_fingerprint: sourcePackageFingerprint,
    row_counts: rows.row_counts,
    candidate_hashes_sha256: sha256V1([...candidateHashes].sort().join("\n")),
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      public_price_publication: false,
      app_visible_pricing: false,
    },
    schema_blockers: schemaBlockers,
  });

  return {
    package_id: "MARKET-REFERENCE-REMAINING-SINGLE-SOURCE-EXACT-SOURCE-BACKFILL-PLAN-V1",
    version: MARKET_REFERENCE_REMAINING_SINGLE_SOURCE_EXACT_BACKFILL_PLAN_VERSION,
    generated_at: generatedAt,
    mode: "apply_plan_only_no_writes",
    candidate_evidence_manifest_hash_sha256: candidateEvidenceManifestHash,
    expected_candidate_evidence_manifest_hash_sha256: EXPECTED_MEE_09Q_CANDIDATE_EVIDENCE_MANIFEST_HASH,
    source_package_fingerprint_sha256: sourcePackageFingerprint,
    expected_source_package_fingerprint_sha256: EXPECTED_MEE_09P_SOURCE_PACKAGE_FINGERPRINT,
    package_fingerprint_sha256: packageFingerprint,
    proposed_table_row_counts: rows.row_counts,
    counts: {
      candidate_source_counts: countBy(rows.candidateRows, (row) => row.source),
      candidate_source_type_counts: countBy(rows.candidateRows, (row) => row.source_type),
      candidate_currency_counts: countBy(rows.candidateRows, (row) => row.currency),
      candidate_condition_counts: countBy(rows.candidateRows, (row) => row.condition_hint),
      candidate_hash_duplicates: duplicateCount(rows.candidateRows, (row) => `${row.source}:${row.candidate_hash}`),
    },
    schema_blockers: schemaBlockers,
    next_required_step: "MARKET-REFERENCE-ACTIVE-LISTING-WAREHOUSE-SCHEMA-V1",
    apply_order_if_schema_extended: [
      "market_reference_candidates",
    ],
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_price_publication: false,
      app_visible_pricing: false,
      price_rollups: false,
      identity_table_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      merges: false,
      global_apply: false,
    },
    findings,
    ready_for_apply_package: false,
    ready_for_schema_extension_plan: findings.every((finding) => schemaBlockers.includes(finding)),
    rows,
  };
}
