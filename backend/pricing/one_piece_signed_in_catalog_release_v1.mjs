import { ONE_PIECE_EXPECTED_COUNTS_V1 } from "./one_piece_signed_in_catalog_readiness_v1.mjs";

export const ONE_PIECE_SIGNED_IN_CATALOG_RELEASE_VERSION_V1 = "ONE_PIECE_SIGNED_IN_CATALOG_RELEASE_V1";
export const ONE_PIECE_SIGNED_IN_MOBILE_BUILD_V1 = "297";

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function finding(findings, condition, code, actual, expected) {
  if (!condition) findings.push({ code, actual, expected });
}

function validateCatalogCounts(findings, label, counts) {
  for (const [field, expected] of Object.entries(ONE_PIECE_EXPECTED_COUNTS_V1)) {
    if (field === "active_sealed_release_members") continue;
    finding(
      findings,
      numeric(counts?.[field]) === expected,
      `${label}_${field}_mismatch`,
      counts?.[field] ?? null,
      expected,
    );
  }
}

export function evaluateOnePieceSignedInCatalogReleasePlanV1({ before, deployment }) {
  const findings = [];
  finding(
    findings,
    before?.release_control?.release_status === "hidden",
    "baseline_release_not_hidden",
    before?.release_control?.release_status ?? null,
    "hidden",
  );
  validateCatalogCounts(findings, "baseline", before?.counts);
  finding(
    findings,
    deployment?.web?.production_status === "ready" && /^[0-9a-f]{40}$/.test(deployment?.web?.commit_sha ?? ""),
    "production_web_not_ready",
    deployment?.web ?? null,
    "ready deployment from an exact 40-character commit SHA",
  );
  finding(
    findings,
    deployment?.android?.artifact_status === "signed" &&
      /^[0-9a-f]{64}$/.test(deployment?.android?.artifact_sha256 ?? "") &&
      deployment?.android?.commit_sha === deployment?.web?.commit_sha &&
      String(deployment?.android?.version_code ?? "") === ONE_PIECE_SIGNED_IN_MOBILE_BUILD_V1,
    "signed_android_artifact_not_ready",
    deployment?.android ?? null,
    `signed artifact with exact SHA-256 from committed build ${ONE_PIECE_SIGNED_IN_MOBILE_BUILD_V1}`,
  );
  finding(
    findings,
    deployment?.ios?.distribution_status === "in_beta_testing" &&
      /^\d+$/.test(String(deployment?.ios?.build_number ?? "")) &&
      deployment?.ios?.commit_sha === deployment?.web?.commit_sha &&
      String(deployment?.ios?.build_number) === String(deployment?.android?.version_code) &&
      String(deployment?.ios?.build_number) === ONE_PIECE_SIGNED_IN_MOBILE_BUILD_V1,
    "testflight_build_not_ready",
    deployment?.ios ?? null,
    `processed build ${ONE_PIECE_SIGNED_IN_MOBILE_BUILD_V1} in beta testing from the same commit and version as Android`,
  );

  return {
    status: findings.length === 0 ? "ready_for_apply" : "blocked",
    ready_for_apply: findings.length === 0,
    findings,
  };
}

export function evaluateOnePieceSignedInCatalogReleaseReadbackV1({
  before,
  after,
  anonymous,
  authenticated,
  privileges,
  updatedRows,
  activationPlanFingerprint,
}) {
  const findings = [];
  finding(findings, updatedRows === 1, "release_row_count_mismatch", updatedRows, 1);
  finding(
    findings,
    before?.release_control?.release_status === "hidden",
    "baseline_release_not_hidden",
    before?.release_control?.release_status ?? null,
    "hidden",
  );
  finding(
    findings,
    after?.release_control?.release_status === "signed_in",
    "release_not_signed_in",
    after?.release_control?.release_status ?? null,
    "signed_in",
  );
  finding(
    findings,
    after?.release_control?.evidence?.activation_plan_fingerprint_sha256 === activationPlanFingerprint,
    "activation_fingerprint_mismatch",
    after?.release_control?.evidence?.activation_plan_fingerprint_sha256 ?? null,
    activationPlanFingerprint,
  );
  validateCatalogCounts(findings, "before", before?.counts);
  validateCatalogCounts(findings, "after", after?.counts);
  finding(
    findings,
    before?.catalog_fingerprint === after?.catalog_fingerprint,
    "one_piece_catalog_changed",
    after?.catalog_fingerprint ?? null,
    before?.catalog_fingerprint ?? null,
  );
  finding(
    findings,
    before?.non_one_piece_fingerprint === after?.non_one_piece_fingerprint,
    "non_one_piece_boundary_changed",
    after?.non_one_piece_fingerprint ?? null,
    before?.non_one_piece_fingerprint ?? null,
  );

  for (const [field, actual] of Object.entries(anonymous?.counts ?? {})) {
    finding(findings, numeric(actual) === 0, `anonymous_${field}_leak`, actual, 0);
  }
  validateCatalogCounts(findings, "authenticated", authenticated?.counts);
  finding(
    findings,
    numeric(authenticated?.counts?.direct_card_matches) === 1,
    "authenticated_direct_card_missing",
    authenticated?.counts?.direct_card_matches ?? null,
    1,
  );
  finding(
    findings,
    numeric(authenticated?.counts?.legacy_search_matches) >= 1,
    "authenticated_search_empty",
    authenticated?.counts?.legacy_search_matches ?? null,
    ">=1",
  );
  finding(
    findings,
    numeric(authenticated?.counts?.sealed_pricing_rows) === 100,
    "authenticated_sealed_pricing_read_failed",
    authenticated?.counts?.sealed_pricing_rows ?? null,
    100,
  );
  finding(
    findings,
    numeric(privileges?.active_sealed_release_members) === ONE_PIECE_EXPECTED_COUNTS_V1.active_sealed_release_members,
    "sealed_release_member_count_mismatch",
    privileges?.active_sealed_release_members ?? null,
    ONE_PIECE_EXPECTED_COUNTS_V1.active_sealed_release_members,
  );
  finding(
    findings,
    privileges?.anonymous_sealed_rpc_execute === false,
    "anonymous_sealed_rpc_execute_not_denied",
    privileges?.anonymous_sealed_rpc_execute ?? null,
    false,
  );

  return {
    status: findings.length === 0 ? "signed_in_release_active" : "readback_failed",
    release_active: findings.length === 0,
    findings,
  };
}
