import { createHash } from "node:crypto";

export const SEALED_SCHEMA_PREFLIGHT_VERSION =
  "CROSS_TCG_SEALED_PRODUCT_SCHEMA_SECURITY_PREFLIGHT_V1";
export const SEALED_MIGRATION_SHA256 =
  "794ba84ce5fcd57568d7b94536ec06dbdb7d8b4d171a0f2895e6e0b808f895d4";
export const SEALED_ROLLBACK_SHA256 =
  "5a87967acb8c3f610807daa023eb94920aa393c6a64d123c46e113f225af9a7e";
export const SEALED_MIGRATION_PLAN_FINGERPRINT =
  "f95ee1e0787f14801ba3b24f313f40a391325d2169eda0798f0fe32dfe948643";
export const SEALED_RESERVED_MIGRATION_VERSION = "20260814060000";
export const SEALED_RESERVED_MIGRATION_NAME =
  "cross_tcg_sealed_product_domain_v1";

export const SEALED_TABLES_V1 = Object.freeze([
  "sealed_product_families",
  "sealed_product_variants",
  "sealed_product_candidates",
  "sealed_product_candidate_reviews",
  "sealed_product_source_mappings",
  "sealed_product_variant_evidence",
  "sealed_product_pricing_lane_qualifications",
  "sealed_product_releases",
  "sealed_product_release_members",
  "sealed_product_release_pointer",
]);

export const SEALED_FUNCTIONS_V1 = Object.freeze([
  "sealed_product_reject_row_mutation_v1()",
  "sealed_product_guard_release_mutation_v1()",
  "sealed_product_guard_release_member_insert_v1()",
  "sealed_product_freeze_release_v1(uuid,text,uuid)",
  "sealed_product_set_active_release_v1(uuid,uuid,uuid)",
]);

export const SEALED_INDEXES_V1 = Object.freeze([
  "sealed_product_variants_family_idx",
  "sealed_product_candidates_source_idx",
  "sealed_product_candidates_classification_idx",
  "sealed_product_candidate_reviews_candidate_idx",
  "sealed_product_source_mappings_variant_idx",
  "sealed_product_variant_evidence_variant_dimension_idx",
  "sealed_product_pricing_variant_status_idx",
  "sealed_product_release_members_release_idx",
]);

export const SEALED_POLICIES_V1 = Object.freeze([
  ["sealed_product_families", "sealed_product_families_service_role_all"],
  ["sealed_product_variants", "sealed_product_variants_service_role_all"],
  ["sealed_product_candidates", "sealed_product_candidates_service_role_all"],
  ["sealed_product_candidate_reviews", "sealed_product_candidate_reviews_service_role_all"],
  ["sealed_product_source_mappings", "sealed_product_source_mappings_service_role_all"],
  ["sealed_product_variant_evidence", "sealed_product_variant_evidence_service_role_all"],
  ["sealed_product_pricing_lane_qualifications", "sealed_product_pricing_qualifications_service_role_all"],
  ["sealed_product_releases", "sealed_product_releases_service_role_all"],
  ["sealed_product_release_members", "sealed_product_release_members_service_role_all"],
  ["sealed_product_release_pointer", "sealed_product_release_pointer_service_role_all"],
]);

export const SEALED_TRIGGERS_V1 = Object.freeze([
  "sealed_product_families_append_only",
  "sealed_product_variants_append_only",
  "sealed_product_candidates_append_only",
  "sealed_product_candidate_reviews_append_only",
  "sealed_product_source_mappings_append_only",
  "sealed_product_variant_evidence_append_only",
  "sealed_product_pricing_qualifications_append_only",
  "sealed_product_releases_guard_mutation",
  "sealed_product_release_members_append_only",
  "sealed_product_release_members_guard_insert",
]);

export const SEALED_REQUIRED_ROLES_V1 = Object.freeze([
  "anon",
  "authenticated",
  "authenticator",
  "service_role",
]);

export const SEALED_REQUIRED_EXTENSIONS_V1 = Object.freeze([
  "plpgsql",
  "pgcrypto",
]);

export const SEALED_PROTECTED_RELATIONS_V1 = Object.freeze([
  "card_prints",
  "card_printings",
  "vault_item_instances",
  "vault_owners",
  "market_price_pipeline_runs",
  "market_price_publication_sets",
  "market_price_current_publication",
  "market_price_publication_snapshots",
  "market_price_qualification_decisions",
  "catalog_game_release_controls",
  "games",
  "sets",
  "mtg_canonical_import_batches",
  "mtg_canonical_import_rows",
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stable(entry)]),
    );
  }
  return value;
}

export function stableJsonSealedPreflightV1(value) {
  return JSON.stringify(stable(value));
}

export function sealedPreflightSha256V1(value) {
  return createHash("sha256").update(value).digest("hex");
}

function addWhen(findings, condition, code) {
  if (condition) findings.push(code);
}

function missingExpected(rows, expected, key) {
  const found = new Set((rows ?? []).map((row) => row[key]));
  return expected.filter((entry) => !found.has(entry));
}

export function evaluateSealedSchemaSecurityPreflightV1(input) {
  const findings = [];
  const { local, production } = input;

  addWhen(findings, local.migration_sha256 !== SEALED_MIGRATION_SHA256,
    "migration_sha256_mismatch");
  addWhen(findings, local.rollback_sha256 !== SEALED_ROLLBACK_SHA256,
    "rollback_sha256_mismatch");
  addWhen(findings,
    local.migration_plan_fingerprint !== SEALED_MIGRATION_PLAN_FINGERPRINT,
    "migration_plan_fingerprint_mismatch");
  addWhen(findings, local.candidate_in_applied_migration_path === true,
    "candidate_already_in_applied_migration_path");
  addWhen(findings, Number(local.duplicate_migration_versions) !== 0,
    "local_duplicate_migration_versions");
  addWhen(findings,
    String(local.latest_migration_version ?? "") >= SEALED_RESERVED_MIGRATION_VERSION,
    "reserved_migration_version_not_after_local_history");

  addWhen(findings, production.guard?.transaction_read_only !== "on",
    "transaction_not_read_only");
  addWhen(findings, production.guard?.default_transaction_read_only !== "on",
    "session_not_fail_closed_read_only");
  addWhen(findings, production.guard?.transaction_closed_before_artifacts !== true,
    "transaction_not_closed_before_artifacts");

  for (const [key, expectedCount] of [
    ["tables", SEALED_TABLES_V1.length],
    ["functions", SEALED_FUNCTIONS_V1.length],
    ["indexes", SEALED_INDEXES_V1.length],
    ["policies", SEALED_POLICIES_V1.length],
    ["triggers", SEALED_TRIGGERS_V1.length],
  ]) {
    addWhen(findings, Number(production.collisions?.expected_counts?.[key]) !== expectedCount,
      `expected_${key}_inventory_mismatch`);
    addWhen(findings, (production.collisions?.[key] ?? []).length !== 0,
      `sealed_${key}_collision`);
  }

  addWhen(findings, production.migration_history?.schema_present !== true,
    "migration_history_schema_missing");
  addWhen(findings, production.migration_history?.table_present !== true,
    "migration_history_table_missing");
  const historyColumns = new Set(production.migration_history?.columns ?? []);
  for (const column of ["version", "statements", "name"]) {
    addWhen(findings, !historyColumns.has(column), `migration_history_${column}_missing`);
  }
  addWhen(findings, Number(production.migration_history?.duplicate_versions) !== 0,
    "production_duplicate_migration_versions");
  addWhen(findings, Number(production.migration_history?.reserved_version_rows) !== 0,
    "reserved_migration_version_collision");
  addWhen(findings, Number(production.migration_history?.sealed_history_rows) !== 0,
    "sealed_migration_history_collision");
  addWhen(findings,
    String(production.migration_history?.latest_version ?? "") >=
      SEALED_RESERVED_MIGRATION_VERSION,
    "reserved_migration_version_not_after_production_history");

  const missingRoles = missingExpected(
    production.requirements?.roles,
    SEALED_REQUIRED_ROLES_V1,
    "role_name",
  );
  missingRoles.forEach((role) => findings.push(`required_role_missing:${role}`));
  const missingExtensions = missingExpected(
    production.requirements?.extensions,
    SEALED_REQUIRED_EXTENSIONS_V1,
    "extension_name",
  );
  missingExtensions.forEach((extension) =>
    findings.push(`required_extension_missing:${extension}`));
  addWhen(findings, production.requirements?.gen_random_uuid_available !== true,
    "gen_random_uuid_unavailable");
  addWhen(findings, production.requirements?.current_user_can_create_public !== true,
    "preflight_user_cannot_create_public_schema");

  for (const row of production.security_boundary?.schema_create_privileges ?? []) {
    if (["anon", "authenticated"].includes(row.role_name) && row.has_create) {
      findings.push(`unsafe_schema_create_privilege:${row.role_name}:${row.schema_name}`);
    }
  }
  addWhen(findings, (production.security_boundary?.candidate_object_grants ?? []).length !== 0,
    "candidate_object_grant_collision");

  for (const relation of production.baselines?.missing_relations ?? []) {
    findings.push(`protected_relation_missing:${relation}`);
  }
  addWhen(findings, !/^[0-9a-f]{64}$/.test(
    production.baselines?.schema_fingerprint_sha256 ?? ""),
  "protected_schema_fingerprint_missing");
  addWhen(findings, !/^[0-9a-f]{64}$/.test(
    production.baselines?.row_fingerprint_sha256 ?? ""),
  "protected_row_fingerprint_missing");
  addWhen(findings, Number(production.baselines?.rows?.card_prints ?? 0) <= 0,
    "card_print_baseline_empty");
  addWhen(findings, Number(production.baselines?.rows?.card_printings ?? 0) <= 0,
    "card_printing_baseline_empty");
  addWhen(findings,
    Number(production.baselines?.rows?.market_price_current_publication ?? 0) !== 1,
    "market_publication_pointer_count_mismatch");
  addWhen(findings, Number(production.baselines?.mtg?.game_count ?? 0) !== 1,
    "mtg_game_count_mismatch");
  addWhen(findings, Number(production.baselines?.mtg?.set_count ?? 0) <= 0,
    "mtg_set_baseline_empty");
  addWhen(findings, Number(production.baselines?.mtg?.card_count ?? 0) <= 0,
    "mtg_card_baseline_empty");
  addWhen(findings, production.baselines?.mtg?.release_status !== "hidden",
    "mtg_release_not_hidden");
  for (const version of ["20260813185000", "20260813190000", "20260813200000"]) {
    addWhen(findings,
      production.baselines?.mtg?.required_migrations?.[version] !== true,
      `mtg_required_migration_missing:${version}`);
  }

  addWhen(findings, Number(production.lock_risk?.ungranted_locks ?? 0) !== 0,
    "ungranted_locks_present");
  addWhen(findings,
    Number(production.lock_risk?.protected_access_exclusive_locks ?? 0) !== 0,
    "protected_access_exclusive_lock_present");
  addWhen(findings, Number(production.lock_risk?.long_transactions ?? 0) !== 0,
    "long_transaction_present");
  addWhen(findings, Number(production.lock_risk?.prepared_transactions ?? 0) !== 0,
    "prepared_transaction_present");
  addWhen(findings, Number(production.lock_risk?.connection_utilization ?? 1) >= 0.8,
    "connection_utilization_high");

  return [...new Set(findings)];
}
