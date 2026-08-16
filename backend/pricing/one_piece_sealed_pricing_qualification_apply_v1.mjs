import {
  hashOnePieceSealedPricingQualificationPlanV1,
  stableJsonOnePieceSealedPricingQualificationPlanV1,
} from "./one_piece_sealed_pricing_qualification_plan_v1.mjs";

export const ONE_PIECE_SEALED_PRICING_QUALIFICATION_APPLY_VERSION =
  "ONE_PIECE_SEALED_PRICING_QUALIFICATION_DURABLE_APPLY_V1";
export const ONE_PIECE_SEALED_PRICING_QUALIFICATION_EXPECTED_INSERTS = 374;
export const ONE_PIECE_SEALED_PRICING_QUALIFICATION_WRITE_TABLE =
  "sealed_product_pricing_lane_qualifications";

function expectedBaselineAfter(before) {
  return { ...before,
    sealed_product_pricing_lane_qualifications:
      Number(before?.sealed_product_pricing_lane_qualifications ?? 0) +
      ONE_PIECE_SEALED_PRICING_QUALIFICATION_EXPECTED_INSERTS };
}

function validateReadback(findings, readback) {
  if (readback?.exact !== true || readback?.expected_sha256 !==
      readback?.actual_sha256 || Number(readback?.count) !== 374) {
    findings.push("exact_payload_readback_mismatch");
  }
  for (const [status, count] of Object.entries({ qualified_exact: 332,
    blocked_stale: 4, blocked_missing_price: 38 })) {
    if (Number(readback?.status_counts?.[status]) !== count) {
      findings.push(`readback_status_count_mismatch:${status}`);
    }
  }
}

function validateHidden(findings, baseline, prefix) {
  if (Number(baseline?.sealed_product_releases) !== 0 ||
      Number(baseline?.sealed_product_release_members) !== 0 ||
      Number(baseline?.sealed_product_release_pointer) !== 0 ||
      Number(baseline?.one_piece_release_control_rows) !== 1 ||
      baseline?.one_piece_release_status !== "hidden") {
    findings.push(`${prefix}_release_or_visibility_state_changed`);
  }
}

export function evaluateOnePieceSealedPricingQualificationPrecommitV1(proof) {
  const findings = [];
  if (proof?.transaction?.started !== true ||
      proof?.transaction?.committed !== false) {
    findings.push("transaction_state_invalid_before_commit");
  }
  if (proof?.transaction_local_preflight?.valid !== true) {
    findings.push("transaction_local_preflight_failed");
  }
  if (Number(proof?.baseline_before
    ?.sealed_product_pricing_lane_qualifications) !== 0) {
    findings.push("qualification_baseline_not_empty");
  }
  const lineage = proof?.transaction_local_preflight?.lineage ?? {};
  if (Number(lineage.expected_rows) !== 374 ||
      Number(lineage.matched_variants) !== 374 ||
      Number(lineage.matched_exact_mappings) !== 374 ||
      Number(lineage.matched_source_observations) !== 374) {
    findings.push("transaction_local_lineage_mismatch");
  }
  const collisions = proof?.transaction_local_preflight?.collisions ?? {};
  if (Number(collisions.id_collisions) !== 0 ||
      Number(collisions.unique_key_collisions) !== 0) {
    findings.push("transaction_local_collision");
  }
  validateReadback(findings, proof?.readback);
  const writes = proof?.write_attribution ?? [];
  if (writes.length !== 1 ||
      writes[0]?.table_name !==
        ONE_PIECE_SEALED_PRICING_QUALIFICATION_WRITE_TABLE ||
      Number(writes[0]?.inserted) !== 374 ||
      Number(writes[0]?.updated) !== 0 ||
      Number(writes[0]?.deleted) !== 0 ||
      Number(writes[0]?.hot_updated) !== 0) {
    findings.push("write_attribution_mismatch");
  }
  if (stableJsonOnePieceSealedPricingQualificationPlanV1(
    expectedBaselineAfter(proof?.baseline_before ?? {})) !==
      stableJsonOnePieceSealedPricingQualificationPlanV1(
        proof?.baseline_after_transaction ?? {})) {
    findings.push("protected_baseline_delta_mismatch");
  }
  validateHidden(findings, proof?.baseline_before, "before");
  validateHidden(findings, proof?.baseline_after_transaction, "after");
  for (const key of ["release_writes", "release_member_writes",
    "release_pointer_writes", "publication_writes", "card_writes",
    "storage_writes", "vault_writes", "app_visibility_changes"]) {
    if (proof?.boundaries?.[key] !== 0) {
      findings.push(`boundary_overclaim:${key}`);
    }
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function evaluateOnePieceSealedPricingQualificationPostApplyV1({
  applySummary,
  verification,
}) {
  const findings = [];
  if (applySummary?.status !==
      "durable_apply_committed_and_exact_readback_passed" ||
      applySummary?.committed !== true) {
    findings.push("durable_apply_not_proven");
  }
  if (verification?.transaction_read_only !== true ||
      (verification?.write_attribution ?? []).length !== 0) {
    findings.push("verification_not_read_only");
  }
  validateReadback(findings, verification?.readback);
  validateHidden(findings, verification?.baseline, "verification");
  if (Number(verification?.baseline
    ?.sealed_product_pricing_lane_qualifications) !== 374) {
    findings.push("qualification_baseline_count_mismatch");
  }
  for (const key of ["database_writes", "release_writes",
    "publication_writes", "card_writes", "storage_writes", "vault_writes",
    "app_visibility_changes"]) {
    if (verification?.boundaries?.[key] !== 0) {
      findings.push(`verification_boundary_overclaim:${key}`);
    }
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function buildOnePieceSealedPricingQualificationExecutionFingerprintV1(
  value) {
  return hashOnePieceSealedPricingQualificationPlanV1(value);
}
