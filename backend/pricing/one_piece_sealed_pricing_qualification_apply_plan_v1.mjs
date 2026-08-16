import {
  hashOnePieceSealedPricingQualificationPlanV1,
  validateOnePieceSealedPricingQualificationPlanV1,
} from "./one_piece_sealed_pricing_qualification_plan_v1.mjs";

export const ONE_PIECE_SEALED_PRICING_QUALIFICATION_APPLY_PLAN_VERSION =
  "ONE_PIECE_SEALED_PRICING_QUALIFICATION_APPLY_PLAN_V1";

const EXPECTED_STATUSES = Object.freeze({
  qualified_exact: 332,
  blocked_stale: 4,
  blocked_missing_price: 38,
});

export function buildOnePieceSealedPricingQualificationApplyPlanV1({
  repository,
  qualificationPlan,
  qualificationPlanArtifactSha256,
  rollbackCanarySummary,
  rollbackCanarySummarySha256,
}) {
  const rows = qualificationPlan?.payload?.qualification_rows ?? [];
  const holds = qualificationPlan?.payload?.missing_observation_holds ?? [];
  const preflight = rollbackCanarySummary?.full_plan_preflight ?? {};
  const mutationContract = {
    operation: "single_transaction_insert_only",
    insert_order: ["sealed_product_pricing_lane_qualifications"],
    expected_inserts: {
      sealed_product_pricing_lane_qualifications: rows.length,
    },
    expected_statuses: { ...EXPECTED_STATUSES },
    excluded_missing_observation_holds: holds.length,
    updates: 0,
    deletes: 0,
    release_writes: 0,
    release_member_writes: 0,
    release_pointer_writes: 0,
    publication_writes: 0,
    card_writes: 0,
    storage_writes: 0,
    vault_writes: 0,
    app_visibility_changes: 0,
  };
  const core = {
    version: ONE_PIECE_SEALED_PRICING_QUALIFICATION_APPLY_PLAN_VERSION,
    repository,
    source_plan_fingerprint_sha256:
      qualificationPlan.plan_fingerprint_sha256,
    source_payload_fingerprint_sha256:
      qualificationPlan.payload_fingerprint_sha256,
    qualification_plan_artifact_sha256: qualificationPlanArtifactSha256,
    rollback_canary_summary_sha256: rollbackCanarySummarySha256,
    rollback_canary_status: rollbackCanarySummary?.status,
    rollback_canary_producer_commit_sha:
      rollbackCanarySummary?.repository?.commit_sha,
    rollback_sample_fingerprint_sha256:
      rollbackCanarySummary?.sample_fingerprint_sha256,
    bound_preflight_fingerprint_sha256:
      hashOnePieceSealedPricingQualificationPlanV1(preflight),
    bound_preflight: preflight,
    mutation_contract: mutationContract,
    mutation_contract_sha256:
      hashOnePieceSealedPricingQualificationPlanV1(mutationContract),
    execution_requirements: {
      exact_clean_commit_required: true,
      explicit_execute_flag_required: true,
      fresh_read_only_preflight_required: true,
      transaction_local_zero_collision_recheck_required: true,
      transaction_local_source_lineage_recheck_required: true,
      exact_payload_readback_required: true,
      exact_write_attribution_required: true,
      one_atomic_transaction_required: true,
      failure_rolls_back_entire_transaction: true,
      independent_post_commit_readback_required: true,
      one_piece_hidden_release_status_required: true,
    },
    plan_only: true,
    database_connections: 0,
    database_writes: 0,
    apply_executed: false,
  };
  return { ...core, apply_plan_fingerprint_sha256:
    hashOnePieceSealedPricingQualificationPlanV1(core) };
}

export function validateOnePieceSealedPricingQualificationApplyPlanV1({
  plan,
  qualificationPlan,
}) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const sourceValidation =
    validateOnePieceSealedPricingQualificationPlanV1(qualificationPlan);
  for (const finding of sourceValidation.findings) {
    findings.push(`source_plan:${finding}`);
  }
  const { apply_plan_fingerprint_sha256: fingerprint, ...core } = plan ?? {};
  add(plan?.version !==
    ONE_PIECE_SEALED_PRICING_QUALIFICATION_APPLY_PLAN_VERSION,
  "version_mismatch");
  add(fingerprint !== hashOnePieceSealedPricingQualificationPlanV1(core),
    "apply_plan_fingerprint_mismatch");
  add(plan?.source_plan_fingerprint_sha256 !==
    qualificationPlan?.plan_fingerprint_sha256,
  "source_plan_fingerprint_mismatch");
  add(plan?.source_payload_fingerprint_sha256 !==
    qualificationPlan?.payload_fingerprint_sha256,
  "source_payload_fingerprint_mismatch");
  add(plan?.rollback_canary_status !==
    "production_rollback_canary_passed_zero_residue",
  "rollback_canary_not_passed");
  const preflight = plan?.bound_preflight ?? {};
  add(plan?.bound_preflight_fingerprint_sha256 !==
    hashOnePieceSealedPricingQualificationPlanV1(preflight),
  "bound_preflight_fingerprint_mismatch");
  add(preflight.valid !== true || preflight.transaction_read_only !== true,
    "bound_preflight_not_passed");
  add(Number(preflight?.lineage?.expected_rows) !== 374 ||
    Number(preflight?.lineage?.matched_variants) !== 374 ||
    Number(preflight?.lineage?.matched_exact_mappings) !== 374 ||
    Number(preflight?.lineage?.matched_source_observations) !== 374,
  "bound_preflight_lineage_mismatch");
  add(Number(preflight?.collisions?.id_collisions) !== 0 ||
    Number(preflight?.collisions?.unique_key_collisions) !== 0,
  "bound_preflight_collision");
  add(Number(preflight?.baseline
    ?.sealed_product_pricing_lane_qualifications) !== 0 ||
    Number(preflight?.baseline?.sealed_product_releases) !== 0 ||
    Number(preflight?.baseline?.sealed_product_release_members) !== 0 ||
    Number(preflight?.baseline?.sealed_product_release_pointer) !== 0 ||
    preflight?.baseline?.one_piece_release_status !== "hidden",
  "bound_preflight_state_mismatch");
  const contract = plan?.mutation_contract ?? {};
  add(contract?.expected_inserts
    ?.sealed_product_pricing_lane_qualifications !== 374,
  "qualification_insert_count_mismatch");
  add(contract.excluded_missing_observation_holds !== 16,
    "missing_observation_hold_count_mismatch");
  for (const [status, count] of Object.entries(EXPECTED_STATUSES)) {
    add(contract?.expected_statuses?.[status] !== count,
      `status_count_mismatch:${status}`);
  }
  add(plan?.mutation_contract_sha256 !==
    hashOnePieceSealedPricingQualificationPlanV1(contract),
  "mutation_contract_hash_mismatch");
  for (const key of ["updates", "deletes", "release_writes",
    "release_member_writes", "release_pointer_writes", "publication_writes",
    "card_writes", "storage_writes", "vault_writes",
    "app_visibility_changes"]) {
    add(contract[key] !== 0, `forbidden_scope:${key}`);
  }
  for (const [key, value] of Object.entries(
    plan?.execution_requirements ?? {})) {
    add(value !== true, `execution_requirement_missing:${key}`);
  }
  add(plan?.plan_only !== true || plan?.database_connections !== 0 ||
    plan?.database_writes !== 0 || plan?.apply_executed !== false,
  "plan_boundary_mismatch");
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
