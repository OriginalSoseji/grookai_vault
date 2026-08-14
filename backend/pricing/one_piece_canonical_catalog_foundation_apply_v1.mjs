import {
  splitSealedMigrationStatementsV1,
  stableJsonSealedSchemaApplyV1,
  stripSealedMigrationTransactionWrapperV1,
} from "./cross_tcg_sealed_product_schema_apply_v1.mjs";
import {
  EXISTING_IDENTITY_DOMAINS,
  ONE_PIECE_FOUNDATION_MIGRATION_NAME,
  ONE_PIECE_FOUNDATION_MIGRATION_VERSION,
  ONE_PIECE_FOUNDATION_VERSION,
  ONE_PIECE_GAME,
  ONE_PIECE_IDENTITY_DOMAIN,
} from "./one_piece_canonical_catalog_foundation_v1.mjs";
import { sha256 } from "./one_piece_st01_language_and_image_readiness_v1.mjs";

export const ONE_PIECE_FOUNDATION_APPLY_VERSION =
  "ONE_PIECE_CANONICAL_CATALOG_FOUNDATION_APPLY_V1";
export const ONE_PIECE_FOUNDATION_APPLY_APPROVAL_ENV =
  "ONE_PIECE_CANONICAL_FOUNDATION_APPLY_APPROVAL";
export const ONE_PIECE_FOUNDATION_EXPECTED_PARENT = "20260814120000";
export const ONE_PIECE_FOUNDATION_MIGRATION_SHA256 =
  "a072e55f5bf3362aefcf1056b37e93a4e861b64ffeb529e0fd554d046586fbba";
export const ONE_PIECE_FOUNDATION_PREFLIGHT_FINGERPRINT =
  "c3dc1ab6bdc2d6d1c434cddbc4c6a47fd447d65d396c1eec6feaf2bfb9978a1b";
export const ONE_PIECE_FOUNDATION_ROLLBACK_PROOF =
  "c055c08d0231ad99b7958afc5e915b5bb9841a5169628d8523f5c3fa29472fe1";
export const ONE_PIECE_FOUNDATION_INDEPENDENT_PROOF =
  "42fa494f412c03395a39bc3bd63b8ab9956fcdff4e8263f61ccea734c720eec5";
export const ONE_PIECE_FOUNDATION_PREFLIGHT_SUMMARY_SHA256 =
  "2ed57f833c7baca377d1df04da7185b3c8ace13c3553918b14ed96d60a4b7287";
export const ONE_PIECE_FOUNDATION_ROLLBACK_SUMMARY_SHA256 =
  "5ce5f0b841ab3639ec9c2d8c17ad9bf8d0f6bbe5dfdaaf66a06a63f0190b1637";
export const ONE_PIECE_FOUNDATION_INDEPENDENT_SUMMARY_SHA256 =
  "c37f423114e5af3aab5a7a97755508a1bf53dd54a916f5af153f8a177f9f0c91";

export const ONE_PIECE_FOUNDATION_MIGRATION_PATH =
  "supabase/migrations/20260814150000_one_piece_canonical_catalog_foundation_v1.sql";
export const ONE_PIECE_FOUNDATION_PREFLIGHT_SUMMARY_PATH =
  "docs/audits/pricing/one_piece_canonical_catalog_foundation_preflight_v1/" +
  "production_read_only_v1/summary.json";
export const ONE_PIECE_FOUNDATION_ROLLBACK_SUMMARY_PATH =
  "docs/audits/pricing/one_piece_canonical_catalog_foundation_rollback_v1/" +
  "production_rollback_attempt_2_v1/summary.json";
export const ONE_PIECE_FOUNDATION_INDEPENDENT_SUMMARY_PATH =
  "docs/audits/pricing/one_piece_canonical_catalog_foundation_rollback_v1/" +
  "independent_post_rollback_v1/summary.json";
export const ONE_PIECE_FOUNDATION_APPLY_PLAN_PATH =
  "docs/audits/pricing/one_piece_canonical_catalog_foundation_apply_v1/" +
  "foundation_apply_plan_v1/plan.json";

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function identityDomains(definition) {
  return sortedUnique([...String(definition ?? "").matchAll(/'([^']+)'::text/g)]
    .map((match) => match[1]));
}

export function buildOnePieceFoundationApplyPlanV1({
  migrationSql,
  preflightSummary,
  rollbackSummary,
  independentSummary,
  inputHashes,
}) {
  const findings = [];
  if (sha256(migrationSql) !== ONE_PIECE_FOUNDATION_MIGRATION_SHA256) {
    findings.push("migration_hash_mismatch");
  }
  if (inputHashes.preflight !== ONE_PIECE_FOUNDATION_PREFLIGHT_SUMMARY_SHA256 ||
      inputHashes.rollback !== ONE_PIECE_FOUNDATION_ROLLBACK_SUMMARY_SHA256 ||
      inputHashes.independent !== ONE_PIECE_FOUNDATION_INDEPENDENT_SUMMARY_SHA256) {
    findings.push("authority_artifact_hash_mismatch");
  }
  if (preflightSummary.status !== "foundation_preflight_passed_no_writes" ||
      preflightSummary.preflight_fingerprint_sha256 !==
        ONE_PIECE_FOUNDATION_PREFLIGHT_FINGERPRINT ||
      preflightSummary.findings?.length !== 0) {
    findings.push("preflight_authority_mismatch");
  }
  if (rollbackSummary.status !== "rollback_canary_passed_zero_durable_change" ||
      rollbackSummary.rollback_proof_sha256 !== ONE_PIECE_FOUNDATION_ROLLBACK_PROOF ||
      rollbackSummary.findings?.length !== 0) {
    findings.push("rollback_authority_mismatch");
  }
  if (independentSummary.status !== "rollback_independently_verified_zero_residue" ||
      independentSummary.independent_proof_sha256 !==
        ONE_PIECE_FOUNDATION_INDEPENDENT_PROOF ||
      independentSummary.rollback_proof_sha256 !== ONE_PIECE_FOUNDATION_ROLLBACK_PROOF ||
      independentSummary.findings?.length !== 0) {
    findings.push("independent_authority_mismatch");
  }
  if (preflightSummary.production?.latest_migration !==
      ONE_PIECE_FOUNDATION_EXPECTED_PARENT ||
      Number(preflightSummary.production?.candidate_migration_count) !== 0 ||
      Number(preflightSummary.production?.game_code_count) !== 0 ||
      Number(preflightSummary.production?.release_control_count) !== 0) {
    findings.push("preflight_state_mismatch");
  }
  if (findings.length) {
    throw new Error(`Foundation apply authority failed: ${findings.join(",")}`);
  }

  const statements = splitSealedMigrationStatementsV1(migrationSql);
  const ledgerRow = {
    version: ONE_PIECE_FOUNDATION_MIGRATION_VERSION,
    name: ONE_PIECE_FOUNDATION_MIGRATION_NAME,
    statements,
  };
  const core = {
    version: ONE_PIECE_FOUNDATION_APPLY_VERSION,
    migration: {
      version: ONE_PIECE_FOUNDATION_MIGRATION_VERSION,
      name: ONE_PIECE_FOUNDATION_MIGRATION_NAME,
      path: ONE_PIECE_FOUNDATION_MIGRATION_PATH,
      sha256: ONE_PIECE_FOUNDATION_MIGRATION_SHA256,
      statement_count: statements.length,
    },
    authority: {
      expected_migration_parent: ONE_PIECE_FOUNDATION_EXPECTED_PARENT,
      preflight_fingerprint_sha256: ONE_PIECE_FOUNDATION_PREFLIGHT_FINGERPRINT,
      preflight_summary_sha256: ONE_PIECE_FOUNDATION_PREFLIGHT_SUMMARY_SHA256,
      rollback_proof_sha256: ONE_PIECE_FOUNDATION_ROLLBACK_PROOF,
      rollback_summary_sha256: ONE_PIECE_FOUNDATION_ROLLBACK_SUMMARY_SHA256,
      independent_proof_sha256: ONE_PIECE_FOUNDATION_INDEPENDENT_PROOF,
      independent_summary_sha256: ONE_PIECE_FOUNDATION_INDEPENDENT_SUMMARY_SHA256,
    },
    target: {
      game: ONE_PIECE_GAME,
      release_status: "hidden",
      release_version: ONE_PIECE_FOUNDATION_VERSION,
      identity_domains: sortedUnique([
        ...EXISTING_IDENTITY_DOMAINS,
        ONE_PIECE_IDENTITY_DOMAIN,
      ]),
    },
    ledger_row: ledgerRow,
    timeouts: {
      lock_timeout: "5s",
      statement_timeout: "180s",
      idle_in_transaction_session_timeout: "60s",
    },
    boundaries: {
      foundation_schema_and_seed_only: true,
      migration_ledger_rows: 1,
      game_rows: 1,
      hidden_release_control_rows: 1,
      identity_constraint_replacements: 1,
      set_rows: 0,
      card_rows: 0,
      identity_rows: 0,
      printing_rows: 0,
      mapping_rows: 0,
      sealed_rows: 0,
      storage_writes: 0,
      pointer_writes: 0,
      pricing_writes: 0,
      publication_writes: 0,
      vault_writes: 0,
      app_visibility_enabled: false,
    },
  };
  const applyPlanFingerprint = sha256(stableJsonSealedSchemaApplyV1(core));
  return {
    ...core,
    apply_plan_fingerprint_sha256: applyPlanFingerprint,
    approval_env: ONE_PIECE_FOUNDATION_APPLY_APPROVAL_ENV,
    guard_token: [
      "EXECUTE_ONE_PIECE_CANONICAL_FOUNDATION_ONLY",
      ONE_PIECE_FOUNDATION_MIGRATION_SHA256,
      ONE_PIECE_FOUNDATION_ROLLBACK_PROOF,
      ONE_PIECE_FOUNDATION_INDEPENDENT_PROOF,
      applyPlanFingerprint,
      "KEEP_ONE_PIECE_HIDDEN",
      "ZERO_CANONICAL_CARD_ROWS",
    ].join(":"),
  };
}

export function evaluateOnePieceFoundationDurableReadbackV1({
  plan,
  readback,
  beforeProtectedCounts = null,
  requireReadOnly = true,
}) {
  const findings = [];
  if (Number(readback.game_count) !== 1 ||
      stableJsonSealedSchemaApplyV1(readback.game_row) !==
        stableJsonSealedSchemaApplyV1(plan.target.game)) {
    findings.push("game_readback_mismatch");
  }
  if (Number(readback.release_control_count) !== 1 ||
      readback.release_control_row?.game_code !== plan.target.game.code ||
      readback.release_control_row?.release_status !== "hidden" ||
      readback.release_control_row?.release_version !== plan.target.release_version) {
    findings.push("hidden_release_readback_mismatch");
  }
  if (stableJsonSealedSchemaApplyV1(identityDomains(
    readback.identity_domain_constraint)) !==
      stableJsonSealedSchemaApplyV1(plan.target.identity_domains)) {
    findings.push("identity_domain_constraint_mismatch");
  }
  if (readback.anon_game_visible !== false ||
      readback.authenticated_game_visible !== false ||
      readback.service_game_visible !== false) {
    findings.push("one_piece_visibility_not_hidden");
  }
  if (stableJsonSealedSchemaApplyV1(readback.migration_ledger ?? []) !==
      stableJsonSealedSchemaApplyV1([plan.ledger_row])) {
    findings.push("migration_ledger_mismatch");
  }
  for (const [key, value] of Object.entries({
    set_count: 0,
    card_count: 0,
    identity_count: 0,
    printing_count: 0,
    sealed_count: 0,
  })) {
    if (Number(readback[key] ?? 0) !== value) findings.push(`${key}_not_zero`);
  }
  if (Number(readback.staged_total_rows) !== 21 ||
      Number(readback.staged_numbered_rows) !== 17 ||
      Number(readback.staged_don_rows) !== 1 ||
      Number(readback.staged_sealed_rows) !== 3) {
    findings.push("staging_scope_changed");
  }
  if (beforeProtectedCounts) {
    const expected = {
      ...beforeProtectedCounts,
      games: Number(beforeProtectedCounts.games) + 1,
      catalog_game_release_controls:
        Number(beforeProtectedCounts.catalog_game_release_controls) + 1,
    };
    for (const key of Object.keys(expected).sort()) {
      if (Number(readback.protected_counts?.[key]) !== Number(expected[key])) {
        findings.push(`protected_count_mismatch:${key}`);
      }
    }
  }
  if (requireReadOnly && readback.transaction_read_only !== undefined &&
      readback.transaction_read_only !== true) {
    findings.push("readback_transaction_not_read_only");
  }
  return [...new Set(findings)];
}

export {
  splitSealedMigrationStatementsV1 as splitFoundationMigrationStatementsV1,
  stableJsonSealedSchemaApplyV1 as stableJsonFoundationApplyV1,
  stripSealedMigrationTransactionWrapperV1 as stripFoundationMigrationWrapperV1,
};
