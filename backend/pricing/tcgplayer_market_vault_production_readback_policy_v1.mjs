export const TCGPLAYER_MARKET_VAULT_PRODUCTION_READBACK_POLICY_V1 =
  "TCGPLAYER_MARKET_VAULT_PRODUCTION_READBACK_POLICY_V1";

function integer(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : 0;
}

function money(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function includesOption(options, expected) {
  return Array.isArray(options) && options.includes(expected);
}

export function evaluateTcgplayerMarketVaultProductionReadbackV1(
  evidence = {},
) {
  const findings = [];
  const schema = evidence.schema ?? {};
  const access = evidence.access ?? {};
  const owner = evidence.owner_scope ?? {};
  const pricing = evidence.exact_pricing ?? {};

  if (schema.relation_name !== "v_vault_mobile_pricing_targets_v1") {
    findings.push("vault_pricing_target_view_missing");
  }
  if (schema.relation_kind !== "v") {
    findings.push("vault_pricing_target_relation_not_view");
  }
  if (!includesOption(schema.relation_options, "security_barrier=true")) {
    findings.push("vault_pricing_target_security_barrier_missing");
  }
  if (!includesOption(schema.relation_options, "security_invoker=false")) {
    findings.push("vault_pricing_target_security_invoker_not_false");
  }
  if (schema.owner_table_rls_enabled !== true) {
    findings.push("vault_owner_table_rls_not_enabled");
  }
  if (schema.definition_owner_scoped !== true) {
    findings.push("vault_pricing_target_not_owner_scoped");
  }
  if (schema.definition_excludes_archived !== true) {
    findings.push("vault_pricing_target_does_not_exclude_archived");
  }
  if (schema.definition_excludes_slabs !== true) {
    findings.push("vault_pricing_target_does_not_exclude_slabs");
  }

  if (access.anonymous_select_granted !== false) {
    findings.push("vault_pricing_target_anonymous_select_not_denied");
  }
  if (access.authenticated_select_granted !== true) {
    findings.push("vault_pricing_target_authenticated_select_missing");
  }
  if (access.authenticated_write_or_ddl_granted !== false) {
    findings.push("vault_pricing_target_authenticated_write_or_ddl_granted");
  }
  if (access.service_select_granted !== true) {
    findings.push("vault_pricing_target_service_select_missing");
  }
  if (access.service_write_or_ddl_granted !== false) {
    findings.push("vault_pricing_target_service_write_or_ddl_granted");
  }
  if (access.anonymous_runtime_denied !== true) {
    findings.push("vault_pricing_target_anonymous_runtime_not_denied");
  }
  if (access.anonymous_runtime_code !== "42501") {
    findings.push("vault_pricing_target_anonymous_denial_code_unexpected");
  }
  if (integer(access.authenticated_without_uid_count) !== 0) {
    findings.push("vault_pricing_target_auth_without_uid_leaked_rows");
  }

  if (owner.sample_owner_available !== true) {
    findings.push("vault_pricing_target_owner_sample_unavailable");
  }
  if (
    integer(owner.expected_target_count) !==
    integer(owner.authenticated_target_count)
  ) {
    findings.push("vault_pricing_target_owner_count_mismatch");
  }
  if (integer(owner.foreign_owner_target_count) !== 0) {
    findings.push("vault_pricing_target_foreign_owner_leak");
  }
  if (integer(owner.duplicate_instance_count) !== 0) {
    findings.push("vault_pricing_target_duplicate_instance");
  }
  if (
    integer(owner.resolved_printing_count) +
      integer(owner.unresolved_printing_count) !==
    integer(owner.authenticated_target_count)
  ) {
    findings.push("vault_pricing_target_resolution_count_mismatch");
  }

  if (
    integer(pricing.requested_printing_count) !==
    integer(pricing.returned_pricing_row_count)
  ) {
    findings.push("vault_exact_pricing_row_count_mismatch");
  }
  if (integer(pricing.non_exact_scope_count) !== 0) {
    findings.push("vault_exact_pricing_non_exact_scope");
  }
  if (integer(pricing.identity_mismatch_count) !== 0) {
    findings.push("vault_exact_pricing_identity_mismatch");
  }
  if (
    integer(pricing.priced_copy_count) +
      integer(pricing.unpriced_copy_count) !==
    integer(owner.authenticated_target_count)
  ) {
    findings.push("vault_exact_pricing_copy_count_mismatch");
  }
  if (integer(pricing.priced_copy_count) < 1) {
    findings.push("vault_exact_pricing_priced_sample_unavailable");
  }
  if (
    Math.abs(
      money(pricing.reconciled_total_usd) -
        money(pricing.independent_total_usd),
    ) > 0.000001
  ) {
    findings.push("vault_exact_pricing_total_mismatch");
  }

  return {
    policy_version: TCGPLAYER_MARKET_VAULT_PRODUCTION_READBACK_POLICY_V1,
    status: findings.length === 0 ? "passed" : "failed",
    findings: [...new Set(findings)].sort(),
    schema: {
      relation_name: schema.relation_name ?? null,
      relation_kind: schema.relation_kind ?? null,
      relation_options: schema.relation_options ?? [],
      owner_table_rls_enabled: schema.owner_table_rls_enabled === true,
      definition_owner_scoped: schema.definition_owner_scoped === true,
      definition_excludes_archived:
        schema.definition_excludes_archived === true,
      definition_excludes_slabs: schema.definition_excludes_slabs === true,
    },
    access: {
      anonymous_select_granted: access.anonymous_select_granted === true,
      authenticated_select_granted:
        access.authenticated_select_granted === true,
      authenticated_write_or_ddl_granted:
        access.authenticated_write_or_ddl_granted === true,
      service_select_granted: access.service_select_granted === true,
      service_write_or_ddl_granted:
        access.service_write_or_ddl_granted === true,
      anonymous_runtime_denied: access.anonymous_runtime_denied === true,
      anonymous_runtime_code: access.anonymous_runtime_code ?? null,
      authenticated_without_uid_count: integer(
        access.authenticated_without_uid_count,
      ),
    },
    owner_scope: {
      sample_owner_available: owner.sample_owner_available === true,
      expected_target_count: integer(owner.expected_target_count),
      authenticated_target_count: integer(owner.authenticated_target_count),
      foreign_owner_target_count: integer(owner.foreign_owner_target_count),
      duplicate_instance_count: integer(owner.duplicate_instance_count),
      resolved_printing_count: integer(owner.resolved_printing_count),
      unresolved_printing_count: integer(owner.unresolved_printing_count),
    },
    exact_pricing: {
      requested_printing_count: integer(pricing.requested_printing_count),
      returned_pricing_row_count: integer(
        pricing.returned_pricing_row_count,
      ),
      non_exact_scope_count: integer(pricing.non_exact_scope_count),
      identity_mismatch_count: integer(pricing.identity_mismatch_count),
      priced_copy_count: integer(pricing.priced_copy_count),
      unpriced_copy_count: integer(pricing.unpriced_copy_count),
      reconciled_total_usd: money(pricing.reconciled_total_usd),
      independent_total_usd: money(pricing.independent_total_usd),
    },
  };
}
