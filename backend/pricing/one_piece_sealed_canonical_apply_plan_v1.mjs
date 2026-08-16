import { createHash } from "node:crypto";

export const ONE_PIECE_SEALED_CANONICAL_APPLY_PLAN_VERSION =
  "ONE_PIECE_SEALED_CANONICAL_APPLY_PLAN_V1";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stable(entry)]));
  }
  return value;
}

export function stableJsonOnePieceSealedCanonicalApplyPlanV1(value) {
  return JSON.stringify(stable(value));
}

export function hashOnePieceSealedCanonicalApplyPlanV1(value) {
  return createHash("sha256").update(
    typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : stableJsonOnePieceSealedCanonicalApplyPlanV1(value),
  ).digest("hex");
}

export function buildOnePieceSealedCanonicalApplyPlanV1({
  repository,
  canonicalPlan,
  canonicalPlanSha256,
  preflight,
  rollbackCanary,
}) {
  const payload = canonicalPlan?.payload ?? {};
  const mutationContract = {
    operation: "single_transaction_insert_only",
    insert_order: [
      "sealed_product_families",
      "sealed_product_variants",
      "sealed_product_candidate_reviews",
      "sealed_product_source_mappings",
      "sealed_product_variant_evidence",
    ],
    expected_inserts: {
      sealed_product_families: (payload.families ?? []).length,
      sealed_product_variants: (payload.variants ?? []).length,
      sealed_product_candidate_reviews:
        (payload.automated_reviews ?? []).length,
      sealed_product_source_mappings: (payload.source_mappings ?? []).length,
      sealed_product_variant_evidence: (payload.variant_evidence ?? []).length,
    },
    updates: 0,
    deletes: 0,
    candidate_writes: 0,
    card_writes: 0,
    storage_writes: 0,
    pricing_writes: 0,
    release_writes: 0,
    publication_writes: 0,
    vault_writes: 0,
    app_visibility_changes: 0,
  };
  const core = {
    version: ONE_PIECE_SEALED_CANONICAL_APPLY_PLAN_VERSION,
    repository,
    resolution_fingerprint_sha256:
      canonicalPlan.resolution_fingerprint_sha256,
    canonical_plan_sha256: canonicalPlanSha256,
    canonical_payload_fingerprint_sha256:
      hashOnePieceSealedCanonicalApplyPlanV1(payload),
    preflight_fingerprint_sha256: preflight.preflight_fingerprint_sha256,
    rollback_sample_fingerprint_sha256:
      rollbackCanary.sample_fingerprint_sha256,
    source_gate_status: "online_evidence_resolution_passed_no_writes",
    preflight_status: preflight.status,
    rollback_canary_status: rollbackCanary.status,
    mutation_contract: mutationContract,
    mutation_contract_sha256:
      hashOnePieceSealedCanonicalApplyPlanV1(mutationContract),
    execution_requirements: {
      exact_clean_commit_required: true,
      fresh_zero_collision_preflight_required: true,
      exact_candidate_lineage_required: true,
      transaction_local_exact_readback_required: true,
      exact_write_attribution_required: true,
      independent_post_commit_readback_required: true,
      hidden_release_status_required: true,
      failure_rolls_back_entire_transaction: true,
    },
    plan_only: true,
    database_writes: 0,
    apply_executed: false,
  };
  return { ...core, apply_plan_fingerprint_sha256:
    hashOnePieceSealedCanonicalApplyPlanV1(core) };
}

export function validateOnePieceSealedCanonicalApplyPlanV1(plan) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const { apply_plan_fingerprint_sha256: fingerprint, ...core } = plan ?? {};
  add(plan?.version !== ONE_PIECE_SEALED_CANONICAL_APPLY_PLAN_VERSION,
    "version_mismatch");
  add(fingerprint !== hashOnePieceSealedCanonicalApplyPlanV1(core),
    "apply_plan_fingerprint_mismatch");
  add(plan?.preflight_status !== "production_read_only_preflight_passed",
    "preflight_not_passed");
  add(plan?.rollback_canary_status !==
    "production_rollback_canary_passed_zero_residue",
  "rollback_canary_not_passed");
  const expected = plan?.mutation_contract?.expected_inserts ?? {};
  for (const [table, count] of Object.entries({
    sealed_product_families: 242,
    sealed_product_variants: 390,
    sealed_product_candidate_reviews: 390,
    sealed_product_source_mappings: 390,
    sealed_product_variant_evidence: 1731,
  })) add(expected[table] !== count, `insert_count_mismatch:${table}`);
  add(plan?.mutation_contract_sha256 !==
    hashOnePieceSealedCanonicalApplyPlanV1(plan?.mutation_contract),
  "mutation_contract_hash_mismatch");
  for (const key of ["updates", "deletes", "candidate_writes", "card_writes",
    "storage_writes", "pricing_writes", "release_writes",
    "publication_writes", "vault_writes", "app_visibility_changes"]) {
    add(plan?.mutation_contract?.[key] !== 0, `forbidden_scope:${key}`);
  }
  add(plan?.plan_only !== true || plan?.database_writes !== 0 ||
    plan?.apply_executed !== false, "plan_boundary_mismatch");
  for (const [key, value] of Object.entries(plan?.execution_requirements ?? {})) {
    add(value !== true, `execution_requirement_missing:${key}`);
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
