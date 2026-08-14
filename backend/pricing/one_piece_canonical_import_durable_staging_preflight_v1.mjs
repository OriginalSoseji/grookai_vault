import { createHash } from "node:crypto";

export const ONE_PIECE_DURABLE_STAGING_PREFLIGHT_VERSION =
  "ONE_PIECE_CANONICAL_IMPORT_DURABLE_STAGING_PREFLIGHT_V1";
export const ONE_PIECE_DURABLE_STAGING_MIGRATION_SHA256 =
  "7bef0427bcdf9bc4bcf9814c1a29b409ea3c8f6815f66f0b17bd5faf56ff829a";
export const ONE_PIECE_DURABLE_STAGING_ROLLBACK_SHA256 =
  "60a17c8daeae7a7e306dec74178fd8b7f95368f701b41d8b5ed18447740b9bc1";
export const ONE_PIECE_DURABLE_STAGING_PLAN_FINGERPRINT =
  "75187d3758b726426aadcae8533ddb9ecd4083cb413850fd1c50dca5e4ad3d46";
export const ONE_PIECE_DURABLE_STAGING_MIGRATION_VERSION = "20260814120000";
export const ONE_PIECE_DURABLE_STAGING_MIGRATION_NAME =
  "one_piece_canonical_import_durable_staging_v1";

export const ONE_PIECE_DURABLE_STAGING_TABLES = Object.freeze([
  "one_piece_canonical_import_batches",
  "one_piece_canonical_import_rows",
]);
export const ONE_PIECE_DURABLE_STAGING_FUNCTIONS = Object.freeze([
  "one_piece_canonical_import_reject_mutation_v1",
]);
export const ONE_PIECE_DURABLE_STAGING_INDEXES = Object.freeze([
  "one_piece_canonical_import_batches_group_idx",
  "one_piece_canonical_import_rows_batch_idx",
]);
export const ONE_PIECE_DURABLE_STAGING_POLICIES = Object.freeze([
  "one_piece_import_batches_service_select",
  "one_piece_import_batches_service_insert",
  "one_piece_import_rows_service_select",
  "one_piece_import_rows_service_insert",
]);
export const ONE_PIECE_DURABLE_STAGING_TRIGGERS = Object.freeze([
  "one_piece_canonical_import_batches_immutable",
  "one_piece_canonical_import_rows_immutable",
]);

export const ONE_PIECE_PREFLIGHT_PROTECTED_RELATIONS = Object.freeze([
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

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stable(entry)]));
  }
  return value;
}

export function stableJsonOnePiecePreflightV1(value) {
  return JSON.stringify(stable(value));
}

export function sha256OnePiecePreflightV1(value) {
  return createHash("sha256").update(value).digest("hex");
}

function add(findings, condition, code) {
  if (condition) findings.push(code);
}

export function evaluateOnePieceDurableStagingPreflightV1({ local, production }) {
  const findings = [];
  add(findings, local.migration_sha256 !== ONE_PIECE_DURABLE_STAGING_MIGRATION_SHA256,
    "migration_sha256_mismatch");
  add(findings, local.rollback_sha256 !== ONE_PIECE_DURABLE_STAGING_ROLLBACK_SHA256,
    "rollback_sha256_mismatch");
  add(findings, local.plan_fingerprint_sha256 !==
    ONE_PIECE_DURABLE_STAGING_PLAN_FINGERPRINT, "plan_fingerprint_mismatch");
  add(findings, local.target_migration_present === true,
    "target_migration_already_present");
  add(findings, Number(local.duplicate_migration_versions) !== 0,
    "local_duplicate_migration_versions");
  add(findings, String(local.latest_migration_version ?? "") >=
    ONE_PIECE_DURABLE_STAGING_MIGRATION_VERSION,
  "proposed_migration_not_after_local_history");

  add(findings, production.guard?.transaction_read_only !== "on",
    "transaction_not_read_only");
  add(findings, production.guard?.default_transaction_read_only !== "on",
    "session_not_fail_closed_read_only");
  add(findings, production.guard?.transaction_closed_before_artifacts !== true,
    "transaction_not_closed_before_artifacts");

  for (const [key, expected] of [
    ["tables", ONE_PIECE_DURABLE_STAGING_TABLES.length],
    ["functions", ONE_PIECE_DURABLE_STAGING_FUNCTIONS.length],
    ["indexes", ONE_PIECE_DURABLE_STAGING_INDEXES.length],
    ["policies", ONE_PIECE_DURABLE_STAGING_POLICIES.length],
    ["triggers", ONE_PIECE_DURABLE_STAGING_TRIGGERS.length],
  ]) {
    add(findings, Number(production.collisions?.expected_counts?.[key]) !== expected,
      `expected_${key}_inventory_mismatch`);
    add(findings, (production.collisions?.[key] ?? []).length !== 0,
      `one_piece_${key}_collision`);
  }

  add(findings, production.migration_history?.schema_present !== true,
    "migration_history_schema_missing");
  add(findings, production.migration_history?.table_present !== true,
    "migration_history_table_missing");
  add(findings, Number(production.migration_history?.reserved_version_rows) !== 0,
    "reserved_migration_version_collision");
  add(findings, Number(production.migration_history?.reserved_name_rows) !== 0,
    "reserved_migration_name_collision");
  add(findings, Number(production.migration_history?.later_migration_rows) !== 0,
    "later_production_migration_present");
  add(findings, Number(production.migration_history?.duplicate_versions) !== 0,
    "production_duplicate_migration_versions");

  const roles = new Set((production.requirements?.roles ?? []).map((row) => row.role_name));
  for (const role of ["anon", "authenticated", "authenticator", "service_role"]) {
    add(findings, !roles.has(role), `required_role_missing:${role}`);
  }
  add(findings, production.requirements?.current_user_can_create_public !== true,
    "preflight_user_cannot_create_public_schema");
  add(findings, production.security_boundary?.default_acl_captured !== true,
    "default_acl_not_captured");
  add(findings,
    (production.security_boundary?.candidate_object_grants ?? []).length !== 0,
    "candidate_object_grant_collision");
  for (const row of production.security_boundary?.schema_create_privileges ?? []) {
    if (["anon", "authenticated"].includes(row.role_name) && row.has_create) {
      findings.push(`unsafe_schema_create_privilege:${row.role_name}`);
    }
  }

  for (const relation of production.baselines?.missing_relations ?? []) {
    findings.push(`protected_relation_missing:${relation}`);
  }
  add(findings, !/^[0-9a-f]{64}$/.test(
    production.baselines?.schema_fingerprint_sha256 ?? ""),
  "protected_schema_fingerprint_missing");
  add(findings, Number(production.baselines?.row_counts?.card_prints ?? 0) <= 0,
    "card_print_baseline_empty");
  add(findings, Number(production.baselines?.row_counts?.card_printings ?? 0) <= 0,
    "card_printing_baseline_empty");
  for (const table of ONE_PIECE_PREFLIGHT_PROTECTED_RELATIONS
    .filter((entry) => entry.startsWith("sealed_product_"))) {
    add(findings, Number(production.baselines?.row_counts?.[table] ?? -1) !== 0,
      `sealed_domain_not_empty:${table}`);
  }
  add(findings, production.baselines?.sealed_migration_present !== true,
    "sealed_domain_migration_missing");
  add(findings, Number(production.baselines?.mtg?.game_count ?? 0) !== 1,
    "mtg_game_count_mismatch");
  add(findings, Number(production.baselines?.mtg?.set_count ?? 0) <= 0,
    "mtg_set_baseline_empty");
  add(findings, production.baselines?.mtg?.release_status !== "hidden",
    "mtg_release_not_hidden");
  add(findings, Number(production.baselines?.one_piece_active_source_products ?? 0) <= 0,
    "one_piece_source_warehouse_empty");

  add(findings, Number(production.lock_risk?.ungranted_locks ?? 0) !== 0,
    "ungranted_locks_present");
  add(findings, Number(production.lock_risk?.protected_access_exclusive_locks ?? 0) !== 0,
    "protected_access_exclusive_lock_present");
  add(findings, Number(production.lock_risk?.long_transactions ?? 0) !== 0,
    "long_transaction_present");
  add(findings, Number(production.lock_risk?.prepared_transactions ?? 0) !== 0,
    "prepared_transaction_present");
  add(findings, Number(production.lock_risk?.connection_utilization ?? 1) >= 0.8,
    "connection_utilization_high");
  return [...new Set(findings)];
}
