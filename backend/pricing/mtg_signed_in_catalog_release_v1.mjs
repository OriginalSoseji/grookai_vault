export const MTG_SIGNED_IN_CATALOG_RELEASE_VERSION_V1 =
  "MTG_SIGNED_IN_CATALOG_RELEASE_V1";
export const MTG_SIGNED_IN_MINIMUM_MOBILE_BUILD_V1 = 298;
export const MTG_GAME_ID_V1 = "4d544700-0000-4000-8000-000000000001";

export const MTG_SIGNED_IN_EXPECTED_COUNTS_V1 = Object.freeze({
  games: 1,
  sets: 946,
  card_prints: 104412,
  card_print_identity: 104412,
  card_printings: 157678,
  exact_printing_mappings: 144403,
  self_hosted_fronts: 104250,
  image_faces: 108187,
  image_coverage_gaps: 162,
});

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function requireFinding(findings, condition, code, actual, expected) {
  if (!condition) findings.push({ code, actual, expected });
}

function validateCounts(findings, label, counts) {
  for (const [field, expected] of Object.entries(
    MTG_SIGNED_IN_EXPECTED_COUNTS_V1,
  )) {
    requireFinding(
      findings,
      number(counts?.[field]) === expected,
      `${label}_${field}_mismatch`,
      counts?.[field] ?? null,
      expected,
    );
  }
}

function validateAuthenticatedCounts(findings, counts) {
  for (const field of [
    "games",
    "sets",
    "card_prints",
    "card_print_identity",
    "card_printings",
    "self_hosted_fronts",
    "image_faces",
    "image_coverage_gaps",
  ]) {
    const expected = MTG_SIGNED_IN_EXPECTED_COUNTS_V1[field];
    requireFinding(
      findings,
      number(counts?.[field]) === expected,
      `authenticated_${field}_mismatch`,
      counts?.[field] ?? null,
      expected,
    );
  }
}

export function evaluateMtgSignedInReleasePlanV1({ before, deployment }) {
  const findings = [];
  const androidBuild = number(deployment?.android?.version_code);
  const iosBuild = number(deployment?.ios?.build_number);
  requireFinding(
    findings,
    before?.release_control?.release_status === "hidden",
    "baseline_release_not_hidden",
    before?.release_control?.release_status ?? null,
    "hidden",
  );
  validateCounts(findings, "baseline", before?.counts);
  requireFinding(
    findings,
    number(before?.counts?.current_pricing_rows) > 0,
    "current_mtg_pricing_empty",
    before?.counts?.current_pricing_rows ?? null,
    ">0",
  );
  requireFinding(
    findings,
    deployment?.web?.production_status === "ready" &&
      /^[0-9a-f]{40}$/.test(deployment?.web?.commit_sha ?? ""),
    "production_web_not_ready",
    deployment?.web ?? null,
    "ready deployment from an exact commit SHA",
  );
  requireFinding(
    findings,
    deployment?.android?.artifact_status === "signed" &&
      /^[0-9a-f]{64}$/.test(deployment?.android?.artifact_sha256 ?? "") &&
      deployment?.android?.commit_sha === deployment?.web?.commit_sha &&
      Number.isInteger(androidBuild) &&
      androidBuild >= MTG_SIGNED_IN_MINIMUM_MOBILE_BUILD_V1,
    "signed_android_artifact_not_ready",
    deployment?.android ?? null,
    `signed build >=${MTG_SIGNED_IN_MINIMUM_MOBILE_BUILD_V1} from the web commit`,
  );
  requireFinding(
    findings,
    deployment?.ios?.distribution_status === "in_beta_testing" &&
      deployment?.ios?.commit_sha === deployment?.web?.commit_sha &&
      Number.isInteger(iosBuild) &&
      iosBuild >= MTG_SIGNED_IN_MINIMUM_MOBILE_BUILD_V1 &&
      iosBuild === androidBuild,
    "testflight_build_not_ready",
    deployment?.ios ?? null,
    `TestFlight build matching Android and >=${MTG_SIGNED_IN_MINIMUM_MOBILE_BUILD_V1} from the web commit`,
  );
  return {
    status: findings.length === 0 ? "ready_for_apply" : "blocked",
    ready_for_apply: findings.length === 0,
    findings,
  };
}

export function evaluateMtgSignedInReleaseReadbackV1({
  before,
  after,
  anonymous,
  authenticated,
  updatedRows,
  activationPlanFingerprint,
}) {
  const findings = [];
  requireFinding(
    findings,
    updatedRows === 1,
    "release_row_count_mismatch",
    updatedRows,
    1,
  );
  requireFinding(
    findings,
    after?.release_control?.release_status === "signed_in",
    "release_not_signed_in",
    after?.release_control?.release_status ?? null,
    "signed_in",
  );
  requireFinding(
    findings,
    after?.release_control?.evidence?.activation_plan_fingerprint_sha256 ===
      activationPlanFingerprint,
    "activation_fingerprint_mismatch",
    after?.release_control?.evidence?.activation_plan_fingerprint_sha256 ??
      null,
    activationPlanFingerprint,
  );
  validateCounts(findings, "before", before?.counts);
  validateCounts(findings, "after", after?.counts);
  requireFinding(
    findings,
    before?.catalog_fingerprint === after?.catalog_fingerprint,
    "mtg_catalog_changed",
    after?.catalog_fingerprint ?? null,
    before?.catalog_fingerprint ?? null,
  );
  requireFinding(
    findings,
    before?.non_mtg_fingerprint === after?.non_mtg_fingerprint,
    "non_mtg_boundary_changed",
    after?.non_mtg_fingerprint ?? null,
    before?.non_mtg_fingerprint ?? null,
  );
  for (const [field, actual] of Object.entries(anonymous?.counts ?? {})) {
    requireFinding(
      findings,
      number(actual) === 0,
      `anonymous_${field}_leak`,
      actual,
      0,
    );
  }
  validateAuthenticatedCounts(findings, authenticated?.counts);
  requireFinding(
    findings,
    number(authenticated?.counts?.direct_card_matches) === 1,
    "authenticated_direct_card_missing",
    authenticated?.counts?.direct_card_matches ?? null,
    1,
  );
  requireFinding(
    findings,
    number(authenticated?.counts?.search_matches) >= 1,
    "authenticated_search_empty",
    authenticated?.counts?.search_matches ?? null,
    ">=1",
  );
  requireFinding(
    findings,
    number(authenticated?.counts?.direct_face_matches) >= 1,
    "authenticated_image_face_missing",
    authenticated?.counts?.direct_face_matches ?? null,
    ">=1",
  );
  requireFinding(
    findings,
    number(authenticated?.counts?.pricing_rows) >= 1,
    "authenticated_pricing_missing",
    authenticated?.counts?.pricing_rows ?? null,
    ">=1",
  );
  return {
    status:
      findings.length === 0 ? "signed_in_release_active" : "readback_failed",
    release_active: findings.length === 0,
    findings,
  };
}
