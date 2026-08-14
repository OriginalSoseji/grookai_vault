import {
  sha256,
  stableJson,
} from "./one_piece_st01_language_and_image_readiness_v1.mjs";

export const ONE_PIECE_FOUNDATION_VERSION =
  "ONE_PIECE_CANONICAL_CATALOG_FOUNDATION_V1";
export const ONE_PIECE_FOUNDATION_MIGRATION_VERSION = "20260814150000";
export const ONE_PIECE_FOUNDATION_MIGRATION_NAME =
  "one_piece_canonical_catalog_foundation_v1";
export const ONE_PIECE_GAME = Object.freeze({
  id: "4f504300-0000-4000-8000-000000000001",
  code: "one_piece",
  name: "One Piece Card Game",
  slug: "one-piece",
});
export const ONE_PIECE_IDENTITY_DOMAIN = "one_piece_eng_print";
export const EXPECTED_NUMBERED_CARD_COUNT = 17;

export const EXISTING_IDENTITY_DOMAINS = Object.freeze([
  "pokemon_eng_standard",
  "pokemon_ba",
  "pokemon_eng_special_print",
  "pokemon_jpn",
  "mtg_eng_paper_print",
]);

export function foundationRunPlanFingerprint(planCore) {
  return sha256(stableJson(planCore));
}

function number(value) {
  return Number(value ?? 0);
}

function constraintIncludes(definition, value) {
  return String(definition ?? "").includes(`'${value}'::text`);
}

export function evaluateOnePieceFoundationPreflightV1(readback) {
  const findings = [];
  if (readback.transaction_read_only !== true) findings.push("transaction_not_read_only");
  if (number(readback.candidate_migration_count) !== 0) {
    findings.push("candidate_migration_already_applied");
  }
  if (number(readback.later_migration_count) !== 0) {
    findings.push("later_migration_history_present");
  }
  if (readback.latest_migration !== "20260814120000") {
    findings.push("migration_history_not_at_expected_parent");
  }
  for (const field of ["game_code_count", "game_id_count", "release_control_count",
    "st01_set_count", "gv_id_collision_count", "tcgplayer_id_collision_count",
    "parent_mapping_collision_count"]) {
    if (number(readback[field]) !== 0) findings.push(`${field}_not_zero`);
  }
  if (readback.release_control_table_present !== true) {
    findings.push("release_control_table_missing");
  }
  if (number(readback.visibility_function_count) !== 4 ||
      number(readback.visibility_policy_count) !== 5) {
    findings.push("catalog_visibility_boundary_incomplete");
  }
  if (readback.release_control_rls_enabled !== true ||
      readback.anon_release_control_select === true ||
      readback.authenticated_release_control_select === true ||
      readback.service_release_control_select !== true ||
      readback.service_release_control_insert !== true) {
    findings.push("release_control_security_boundary_mismatch");
  }
  if (number(readback.normal_finish_count) !== 1) findings.push("normal_finish_missing");
  if (number(readback.staged_total_rows) !== 21 ||
      number(readback.staged_numbered_rows) !== EXPECTED_NUMBERED_CARD_COUNT ||
      number(readback.staged_don_rows) !== 1 ||
      number(readback.staged_sealed_rows) !== 3) {
    findings.push("durable_staging_scope_mismatch");
  }
  for (const domain of EXISTING_IDENTITY_DOMAINS) {
    if (!constraintIncludes(readback.identity_domain_constraint, domain)) {
      findings.push(`identity_constraint_missing:${domain}`);
    }
  }
  if (constraintIncludes(readback.identity_domain_constraint, ONE_PIECE_IDENTITY_DOMAIN)) {
    findings.push("one_piece_identity_domain_already_present");
  }
  if (number(readback.conflicting_lock_count) !== 0) {
    findings.push("conflicting_relation_lock_present");
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function evaluateOnePieceFoundationAppliedStateV1(readback) {
  const findings = [];
  if (number(readback.game_count) !== 1 ||
      stableJson(readback.game_row) !== stableJson(ONE_PIECE_GAME)) {
    findings.push("one_piece_game_readback_mismatch");
  }
  if (number(readback.release_control_count) !== 1 ||
      readback.release_control_row?.game_code !== ONE_PIECE_GAME.code ||
      readback.release_control_row?.release_status !== "hidden" ||
      readback.release_control_row?.release_version !== ONE_PIECE_FOUNDATION_VERSION) {
    findings.push("hidden_release_control_readback_mismatch");
  }
  for (const domain of [...EXISTING_IDENTITY_DOMAINS, ONE_PIECE_IDENTITY_DOMAIN]) {
    if (!constraintIncludes(readback.identity_domain_constraint, domain)) {
      findings.push(`applied_identity_constraint_missing:${domain}`);
    }
  }
  if (readback.anon_game_visible !== false ||
      readback.authenticated_game_visible !== false ||
      readback.service_game_visible !== false) {
    findings.push("one_piece_game_not_hidden");
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function compareFoundationProtectedCountsV1(before, after) {
  const findings = [];
  for (const key of Object.keys(before ?? {}).sort()) {
    if (number(after?.[key]) !== number(before[key])) {
      findings.push(`protected_count_changed:${key}`);
    }
  }
  return { valid: findings.length === 0, findings };
}
