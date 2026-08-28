import crypto from "node:crypto";

export const COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_VERSION =
  "COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1";
export const COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_MIGRATION_VERSION =
  "20260828024500";

export const COLLECTIBLE_WAVE1_GAMES = Object.freeze([
  Object.freeze({
    id: "59474f00-0000-4000-8000-000000000001",
    code: "yugioh",
    name: "Yu-Gi-Oh!",
    slug: "yu-gi-oh",
  }),
  Object.freeze({
    id: "47434700-0000-4000-8000-000000000001",
    code: "gundam",
    name: "Gundam Card Game",
    slug: "gundam-card-game",
  }),
]);

export const COLLECTIBLE_WAVE1_RELEASE_EVIDENCE = Object.freeze({
  default: "fail_closed",
  canonical_promotion_authorizes_visibility: false,
  price_publication_authorizes_visibility: false,
  storage_upload_authorizes_visibility: false,
  foundation_scope: "game_metadata_only",
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

export function stableJsonWave1FoundationsV1(value) {
  return JSON.stringify(stable(value));
}

export function wave1FoundationFingerprintV1(value) {
  return crypto
    .createHash("sha256")
    .update(stableJsonWave1FoundationsV1(value))
    .digest("hex");
}

function number(value) {
  return Number(value ?? 0);
}

export function evaluateWave1FoundationBaselineV1(readback) {
  const findings = [];
  if (readback.transaction_read_only !== true) findings.push("transaction_not_read_only");
  if (readback.latest_migration !== "20260828021500") {
    findings.push("migration_history_not_at_expected_parent");
  }
  for (const field of [
    "candidate_migration_count",
    "candidate_game_code_count",
    "candidate_game_id_count",
    "candidate_game_slug_count",
    "candidate_release_control_count",
    "conflicting_lock_count",
  ]) {
    if (number(readback[field]) !== 0) findings.push(`${field}_not_zero`);
  }
  if (readback.games_rls_enabled !== true ||
      readback.release_controls_rls_enabled !== true ||
      readback.anon_release_control_select === true ||
      readback.authenticated_release_control_select === true ||
      readback.service_release_control_select !== true ||
      readback.service_release_control_insert !== true) {
    findings.push("release_boundary_security_mismatch");
  }
  if (number(readback.visibility_function_count) !== 4) {
    findings.push("visibility_function_boundary_incomplete");
  }
  return [...new Set(findings)];
}

export function evaluateWave1FoundationTransientV1(readback) {
  const findings = [];
  const byCode = (rows) => [...(rows ?? [])].sort((left, right) =>
    String(left.code ?? left.game_code).localeCompare(String(right.code ?? right.game_code)));
  const expectedGames = byCode(COLLECTIBLE_WAVE1_GAMES.map((row) => ({ ...row })));
  if (stableJsonWave1FoundationsV1(byCode(readback.games)) !==
      stableJsonWave1FoundationsV1(expectedGames)) {
    findings.push("game_rows_mismatch");
  }
  const expectedControls = COLLECTIBLE_WAVE1_GAMES.map((row) => ({
    game_code: row.code,
    release_status: "hidden",
    release_version: COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_VERSION,
    evidence: { ...COLLECTIBLE_WAVE1_RELEASE_EVIDENCE },
  }));
  if (stableJsonWave1FoundationsV1(byCode(readback.release_controls)) !==
      stableJsonWave1FoundationsV1(byCode(expectedControls))) {
    findings.push("hidden_release_controls_mismatch");
  }
  for (const role of ["anon", "authenticated", "service_role"]) {
    for (const game of COLLECTIBLE_WAVE1_GAMES) {
      if (readback.visibility?.[role]?.[game.code] !== false) {
        findings.push(`game_not_hidden:${role}:${game.code}`);
      }
    }
  }
  return [...new Set(findings)];
}

export function compareWave1ProtectedCountsV1(before, after, deltas = {}) {
  const findings = [];
  for (const key of Object.keys(before ?? {}).sort()) {
    const expected = number(before[key]) + number(deltas[key]);
    if (number(after?.[key]) !== expected) {
      findings.push(`protected_count_mismatch:${key}:${expected}:${number(after?.[key])}`);
    }
  }
  return findings;
}
