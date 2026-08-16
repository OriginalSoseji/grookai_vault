import { deterministicUuidV5 } from
  "./one_piece_canonical_import_staging_v1.mjs";
import {
  hashOnePieceSealedPricingLineageV1,
  stableJsonOnePieceSealedPricingLineageV1,
} from "./one_piece_sealed_pricing_lineage_v1.mjs";

export const ONE_PIECE_SEALED_PRICING_QUALIFICATION_PLAN_VERSION =
  "ONE_PIECE_SEALED_PRICING_QUALIFICATION_DATABASE_PLAN_V1";
export const ONE_PIECE_SEALED_PRICING_QUALIFICATION_CONTRACT_VERSION =
  "ONE_PIECE_SEALED_PRICING_QUALIFICATION_V1";
export const ONE_PIECE_SEALED_PRICING_SOURCE_AUDIT_FINGERPRINT =
  "a22c8ea9d2a84ab63ac9c90d558a5749cf0f402ae79f947aeb6ac752a20db5ae";

const EXPECTED_STATUS_COUNTS = Object.freeze({
  qualified_exact: 332,
  blocked_stale: 4,
  blocked_missing_price: 38,
});

function qualificationId(row) {
  return deterministicUuidV5([
    "one-piece",
    "sealed-pricing-qualification-v1",
    row.source_mapping_id,
    row.source_price_row_identity,
    row.observed_on,
    ONE_PIECE_SEALED_PRICING_QUALIFICATION_CONTRACT_VERSION,
  ].join(":"));
}

function databaseRow(row, sourceAuditFingerprint) {
  return {
    id: qualificationId(row),
    variant_id: row.variant_id,
    source_mapping_id: row.source_mapping_id,
    source_price_row_identity: row.source_price_row_identity,
    source_subtype_name_normalized: row.source_subtype_name_normalized,
    observed_on: row.observed_on,
    currency: row.currency,
    qualification_status: row.qualification_status,
    qualification_evidence: {
      source_audit_fingerprint_sha256: sourceAuditFingerprint,
      authority: {
        provider: "tcgplayer",
        price_field: "market_price",
        freshness_days_inclusive: 7,
        authority_observed_on: row.authority_observed_on,
        fallback_price_authorized: false,
      },
      canonical_lineage: {
        family_id: row.family_id,
        source_product_id: row.source_product_id,
        source_product_name: row.source_product_name,
        package_form: row.package_form,
        language_code: row.language_code,
        source_active: row.source_active,
        catalog_metadata_status: row.catalog_metadata_status,
        canonical_lineage_exact: row.canonical_lineage_exact,
      },
      observation: {
        latest_price_row_count: row.latest_price_row_count,
        observation_age_days: row.observation_age_days,
        market_price: row.market_price,
        low_price: row.low_price,
      },
      decision: {
        status: row.qualification_status,
        reason: row.qualification_reason,
        publication_authority: false,
      },
    },
    source_observation_fingerprint: row.source_observation_fingerprint,
    qualification_contract_version:
      ONE_PIECE_SEALED_PRICING_QUALIFICATION_CONTRACT_VERSION,
    publication_authority: false,
  };
}

function countStatuses(rows) {
  return Object.fromEntries(Object.keys(EXPECTED_STATUS_COUNTS).map((status) =>
    [status, rows.filter((row) => row.qualification_status === status).length]));
}

export function buildOnePieceSealedPricingQualificationPlanV1({
  repository,
  sourcePlan,
  sourceArtifactSha256,
}) {
  const sourceAuditFingerprint = sourcePlan?.source_audit_fingerprint_sha256;
  const qualificationRows = [...(sourcePlan?.qualification_rows ?? [])]
    .sort((left, right) => String(left.variant_id).localeCompare(
      String(right.variant_id)))
    .map((row) => databaseRow(row, sourceAuditFingerprint));
  const holds = [...(sourcePlan?.missing_observation_holds ?? [])]
    .sort((left, right) => String(left.variant_id).localeCompare(
      String(right.variant_id)));
  const payload = {
    qualification_rows: qualificationRows,
    missing_observation_holds: holds,
  };
  const core = {
    version: ONE_PIECE_SEALED_PRICING_QUALIFICATION_PLAN_VERSION,
    qualification_contract_version:
      ONE_PIECE_SEALED_PRICING_QUALIFICATION_CONTRACT_VERSION,
    repository,
    source_audit_fingerprint_sha256: sourceAuditFingerprint,
    source_qualification_artifact_sha256: sourceArtifactSha256,
    counts: {
      qualification_rows: qualificationRows.length,
      missing_observation_holds: holds.length,
      qualification_statuses: countStatuses(qualificationRows),
    },
    mutation_contract: {
      target_table: "sealed_product_pricing_lane_qualifications",
      operation: "single_transaction_insert_only",
      planned_inserts: qualificationRows.length,
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
    },
    payload,
    payload_fingerprint_sha256:
      hashOnePieceSealedPricingLineageV1(payload),
    plan_only: true,
    database_connections: 0,
    database_writes: 0,
    apply_executed: false,
  };
  return { ...core, plan_fingerprint_sha256:
    hashOnePieceSealedPricingLineageV1(core) };
}

export function validateOnePieceSealedPricingQualificationPlanV1(plan) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const rows = plan?.payload?.qualification_rows ?? [];
  const holds = plan?.payload?.missing_observation_holds ?? [];
  const { plan_fingerprint_sha256: fingerprint, ...core } = plan ?? {};
  add(plan?.version !== ONE_PIECE_SEALED_PRICING_QUALIFICATION_PLAN_VERSION,
    "version_mismatch");
  add(plan?.qualification_contract_version !==
    ONE_PIECE_SEALED_PRICING_QUALIFICATION_CONTRACT_VERSION,
  "qualification_contract_version_mismatch");
  add(plan?.source_audit_fingerprint_sha256 !==
    ONE_PIECE_SEALED_PRICING_SOURCE_AUDIT_FINGERPRINT,
  "source_audit_fingerprint_mismatch");
  add(fingerprint !== hashOnePieceSealedPricingLineageV1(core),
    "plan_fingerprint_mismatch");
  add(plan?.payload_fingerprint_sha256 !==
    hashOnePieceSealedPricingLineageV1(plan?.payload),
  "payload_fingerprint_mismatch");
  add(rows.length !== 374, "qualification_row_count_mismatch");
  add(holds.length !== 16, "missing_observation_hold_count_mismatch");
  const counts = countStatuses(rows);
  for (const [status, expected] of Object.entries(EXPECTED_STATUS_COUNTS)) {
    add(counts[status] !== expected, `status_count_mismatch:${status}`);
  }
  add(new Set(rows.map((row) => row.id)).size !== rows.length,
    "duplicate_qualification_id");
  add(new Set(rows.map((row) => [row.source_mapping_id,
    row.source_price_row_identity, row.observed_on,
    row.qualification_contract_version].join("|"))).size !== rows.length,
  "duplicate_database_qualification_key");
  add(new Set(rows.map((row) => row.variant_id)).size !== rows.length,
    "duplicate_variant_id");
  for (const row of rows) {
    const prefix = row.variant_id ?? "unknown";
    add(!row.id || !row.variant_id || !row.source_mapping_id ||
      !row.source_price_row_identity || !row.source_subtype_name_normalized ||
      !row.observed_on || !row.currency || !row.source_observation_fingerprint,
    `missing_required_source_evidence:${prefix}`);
    add(row.publication_authority !== false,
      `publication_authority_overclaim:${prefix}`);
    add(row.qualification_contract_version !==
      ONE_PIECE_SEALED_PRICING_QUALIFICATION_CONTRACT_VERSION,
    `row_contract_version_mismatch:${prefix}`);
    add(!(row.qualification_status in EXPECTED_STATUS_COUNTS),
      `unsupported_status:${prefix}`);
    add(row.qualification_evidence?.decision?.status !==
      row.qualification_status,
    `decision_status_mismatch:${prefix}`);
    add(row.qualification_evidence?.decision?.publication_authority !== false,
      `decision_publication_authority_overclaim:${prefix}`);
    add(row.id !== qualificationId(row),
      `non_deterministic_qualification_id:${prefix}`);
  }
  for (const hold of holds) {
    const prefix = hold.variant_id ?? "unknown";
    add(hold.qualification_status !== "blocked_missing_observation" ||
      hold.persistable_in_existing_qualification_table !== false ||
      hold.source_price_row_identity !== null || hold.observed_on !== null ||
      hold.source_observation_fingerprint !== null,
    `invalid_missing_observation_hold:${prefix}`);
  }
  for (const key of ["updates", "deletes", "release_writes",
    "release_member_writes", "release_pointer_writes", "publication_writes",
    "card_writes", "storage_writes", "vault_writes",
    "app_visibility_changes"]) {
    add(plan?.mutation_contract?.[key] !== 0, `forbidden_scope:${key}`);
  }
  add(plan?.mutation_contract?.planned_inserts !== 374,
    "planned_insert_count_mismatch");
  add(plan?.plan_only !== true || plan?.database_connections !== 0 ||
    plan?.database_writes !== 0 || plan?.apply_executed !== false,
  "offline_plan_boundary_mismatch");
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function stableJsonOnePieceSealedPricingQualificationPlanV1(value) {
  return stableJsonOnePieceSealedPricingLineageV1(value);
}

export function hashOnePieceSealedPricingQualificationPlanV1(value) {
  return hashOnePieceSealedPricingLineageV1(value);
}
