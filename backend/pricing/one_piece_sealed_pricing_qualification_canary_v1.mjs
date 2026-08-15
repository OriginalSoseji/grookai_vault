import {
  hashOnePieceSealedPricingQualificationPlanV1,
  stableJsonOnePieceSealedPricingQualificationPlanV1,
} from "./one_piece_sealed_pricing_qualification_plan_v1.mjs";

export const ONE_PIECE_SEALED_PRICING_QUALIFICATION_CANARY_VERSION =
  "ONE_PIECE_SEALED_PRICING_QUALIFICATION_ROLLBACK_CANARY_V1";
export const ONE_PIECE_SEALED_PRICING_QUALIFICATION_CANARY_STATUSES =
  Object.freeze(["qualified_exact", "blocked_stale",
    "blocked_missing_price"]);

function sorted(rows) {
  return [...rows].sort((left, right) => String(left.id).localeCompare(
    String(right.id)));
}

export function selectOnePieceSealedPricingQualificationCanaryV1(plan) {
  const rows = plan?.payload?.qualification_rows ?? [];
  const sample = ONE_PIECE_SEALED_PRICING_QUALIFICATION_CANARY_STATUSES
    .map((status) => sorted(rows.filter((row) =>
      row.qualification_status === status))[0])
    .map((row, index) => {
      if (!row) throw new Error(`Canary status is unavailable: ${
        ONE_PIECE_SEALED_PRICING_QUALIFICATION_CANARY_STATUSES[index]}`);
      return structuredClone(row);
    });
  return { statuses: [...ONE_PIECE_SEALED_PRICING_QUALIFICATION_CANARY_STATUSES],
    rows: sample, sample_fingerprint_sha256:
      hashOnePieceSealedPricingQualificationPlanV1(sample) };
}

export function normalizeOnePieceSealedPricingQualificationRowsV1(rows) {
  return sorted((rows ?? []).map((row) => ({
    id: row.id,
    variant_id: row.variant_id,
    source_mapping_id: row.source_mapping_id,
    source_price_row_identity: row.source_price_row_identity,
    source_subtype_name_normalized: row.source_subtype_name_normalized,
    observed_on: row.observed_on,
    currency: row.currency,
    qualification_status: row.qualification_status,
    qualification_evidence: row.qualification_evidence,
    source_observation_fingerprint: row.source_observation_fingerprint,
    qualification_contract_version: row.qualification_contract_version,
    publication_authority: row.publication_authority,
  })));
}

function normalizeWrites(rows) {
  return [...(rows ?? [])].map((row) => ({
    table_name: row.table_name,
    inserted: Number(row.inserted),
    updated: Number(row.updated),
    deleted: Number(row.deleted),
    hot_updated: Number(row.hot_updated),
  })).sort((left, right) => left.table_name.localeCompare(right.table_name));
}

export function evaluateOnePieceSealedPricingQualificationCanaryV1({
  selection,
  proof,
}) {
  const findings = [];
  const expectedRows = normalizeOnePieceSealedPricingQualificationRowsV1(
    selection?.rows);
  const actualRows = normalizeOnePieceSealedPricingQualificationRowsV1(
    proof?.transaction_readback);
  if (stableJsonOnePieceSealedPricingQualificationPlanV1(expectedRows) !==
      stableJsonOnePieceSealedPricingQualificationPlanV1(actualRows)) {
    findings.push("transaction_readback_mismatch");
  }
  const expectedWrites = [{
    table_name: "sealed_product_pricing_lane_qualifications",
    inserted: 3,
    updated: 0,
    deleted: 0,
    hot_updated: 0,
  }];
  if (stableJsonOnePieceSealedPricingQualificationPlanV1(
    normalizeWrites(proof?.write_attribution)) !==
      stableJsonOnePieceSealedPricingQualificationPlanV1(expectedWrites)) {
    findings.push("write_attribution_mismatch");
  }
  if (proof?.preflight?.valid !== true) findings.push("preflight_failed");
  if (proof?.transaction?.committed !== false ||
      proof?.transaction?.rolled_back !== true) {
    findings.push("transaction_boundary_mismatch");
  }
  if (proof?.post_rollback?.transaction_read_only !== true) {
    findings.push("post_rollback_not_read_only");
  }
  if (Number(proof?.post_rollback?.remaining_target_rows) !== 0) {
    findings.push("post_rollback_residue");
  }
  if (stableJsonOnePieceSealedPricingQualificationPlanV1(
    proof?.baseline_before) !==
      stableJsonOnePieceSealedPricingQualificationPlanV1(
        proof?.post_rollback?.baseline)) {
    findings.push("protected_baseline_changed");
  }
  if (proof?.boundaries?.durable_database_writes !== 0 ||
      proof?.boundaries?.release_writes !== 0 ||
      proof?.boundaries?.publication_writes !== 0 ||
      proof?.boundaries?.app_visibility_changes !== 0) {
    findings.push("forbidden_boundary_write");
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
