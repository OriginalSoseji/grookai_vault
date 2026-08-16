export const ONE_PIECE_SIGNED_IN_CATALOG_READINESS_VERSION_V1 =
  "ONE_PIECE_SIGNED_IN_CATALOG_READINESS_V1";

export const ONE_PIECE_GAME_ID_V1 =
  "4f504300-0000-4000-8000-000000000001";

export const ONE_PIECE_EXPECTED_COUNTS_V1 = Object.freeze({
  games: 1,
  sets: 60,
  card_prints: 6730,
  card_print_identity: 6730,
  card_printings: 14,
  self_hosted_images: 6553,
  image_coverage_gaps: 177,
  active_sealed_release_members: 332,
});

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function finding(findings, condition, code, actual, expected) {
  if (condition) return;
  findings.push({ code, actual, expected });
}

function assertExpectedCatalogCounts(findings, label, counts) {
  for (const [field, expected] of Object.entries(
    ONE_PIECE_EXPECTED_COUNTS_V1,
  )) {
    if (field === "active_sealed_release_members") continue;
    finding(
      findings,
      number(counts?.[field]) === expected,
      `${label}_${field}_mismatch`,
      counts?.[field] ?? null,
      expected,
    );
  }
}

export function evaluateOnePieceSignedInCatalogReadinessV1({
  before,
  simulatedControl,
  anonymous,
  authenticated,
  privileges,
  afterRollback,
}) {
  const findings = [];

  finding(
    findings,
    before?.release_control?.release_status === "hidden",
    "baseline_release_not_hidden",
    before?.release_control?.release_status ?? null,
    "hidden",
  );
  finding(
    findings,
    simulatedControl?.release_status === "signed_in",
    "simulated_release_not_signed_in",
    simulatedControl?.release_status ?? null,
    "signed_in",
  );
  assertExpectedCatalogCounts(findings, "baseline", before?.counts);

  for (const [field, actual] of Object.entries(anonymous?.counts ?? {})) {
    finding(
      findings,
      number(actual) === 0,
      `anonymous_${field}_leak`,
      actual,
      0,
    );
  }
  finding(
    findings,
    privileges?.anonymous_sealed_rpc_execute === false,
    "anonymous_sealed_rpc_execute_not_denied",
    privileges?.anonymous_sealed_rpc_execute ?? null,
    false,
  );
  finding(
    findings,
    privileges?.authenticated_sealed_rpc_execute === true,
    "authenticated_sealed_rpc_execute_missing",
    privileges?.authenticated_sealed_rpc_execute ?? null,
    true,
  );

  assertExpectedCatalogCounts(findings, "authenticated", authenticated?.counts);
  finding(
    findings,
    number(authenticated?.counts?.print_identity_search_matches) >= 1,
    "authenticated_print_identity_search_empty",
    authenticated?.counts?.print_identity_search_matches ?? null,
    ">=1",
  );
  finding(
    findings,
    number(authenticated?.counts?.legacy_search_matches) >= 1,
    "authenticated_legacy_search_empty",
    authenticated?.counts?.legacy_search_matches ?? null,
    ">=1",
  );
  finding(
    findings,
    number(authenticated?.counts?.direct_card_matches) === 1,
    "authenticated_direct_card_missing",
    authenticated?.counts?.direct_card_matches ?? null,
    1,
  );
  finding(
    findings,
    number(authenticated?.counts?.sealed_pricing_rows) === 100,
    "authenticated_sealed_pricing_read_failed",
    authenticated?.counts?.sealed_pricing_rows ?? null,
    100,
  );
  finding(
    findings,
    number(authenticated?.counts?.sealed_release_members) ===
      ONE_PIECE_EXPECTED_COUNTS_V1.active_sealed_release_members,
    "authenticated_sealed_release_member_count_mismatch",
    authenticated?.counts?.sealed_release_members ?? null,
    ONE_PIECE_EXPECTED_COUNTS_V1.active_sealed_release_members,
  );
  finding(
    findings,
    authenticated?.sample?.image_url_self_hosted === true,
    "authenticated_sample_image_not_self_hosted",
    authenticated?.sample?.image_url ?? null,
    "self-hosted exact image URL",
  );
  finding(
    findings,
    authenticated?.sample?.image_status === "exact",
    "authenticated_sample_image_not_exact",
    authenticated?.sample?.image_status ?? null,
    "exact",
  );

  finding(
    findings,
    afterRollback?.release_control?.release_status === "hidden",
    "release_control_not_restored_hidden",
    afterRollback?.release_control?.release_status ?? null,
    "hidden",
  );
  finding(
    findings,
    before?.release_fingerprint === afterRollback?.release_fingerprint,
    "release_control_rollback_mismatch",
    afterRollback?.release_fingerprint ?? null,
    before?.release_fingerprint ?? null,
  );
  finding(
    findings,
    before?.catalog_fingerprint === afterRollback?.catalog_fingerprint,
    "one_piece_catalog_rollback_mismatch",
    afterRollback?.catalog_fingerprint ?? null,
    before?.catalog_fingerprint ?? null,
  );
  finding(
    findings,
    before?.non_one_piece_fingerprint ===
      afterRollback?.non_one_piece_fingerprint,
    "non_one_piece_boundary_changed",
    afterRollback?.non_one_piece_fingerprint ?? null,
    before?.non_one_piece_fingerprint ?? null,
  );
  assertExpectedCatalogCounts(findings, "post_rollback", afterRollback?.counts);

  return {
    status:
      findings.length === 0
        ? "signed_in_catalog_readiness_passed_zero_residue"
        : "signed_in_catalog_readiness_failed",
    ready_for_signed_in_activation: findings.length === 0,
    findings,
  };
}

export function buildOnePieceSignedInCatalogReadinessReportV1(summary) {
  const lines = [
    "# One Piece Signed-In Catalog Readiness V1",
    "",
    `- Result: **${summary.status.toUpperCase()}**`,
    `- Producer commit: \`${summary.repository.commit_sha}\``,
    `- Branch: \`${summary.repository.branch}\``,
    `- Transaction committed: \`${summary.transaction.committed}\``,
    `- Durable database writes: \`${summary.boundaries.durable_database_writes}\``,
    "",
    "## Catalog Truth",
    "",
    `- Games: \`${summary.before.counts.games}\``,
    `- Sets: \`${summary.before.counts.sets}\``,
    `- Parent cards: \`${summary.before.counts.card_prints}\``,
    `- Active identities: \`${summary.before.counts.card_print_identity}\``,
    `- Child printings: \`${summary.before.counts.card_printings}\``,
    `- Exact self-hosted images: \`${summary.before.counts.self_hosted_images}\``,
    `- Explicit image coverage gaps: \`${summary.before.counts.image_coverage_gaps}\``,
    "",
    "## Visibility Proof",
    "",
    `- Anonymous One Piece games/sets/cards: \`${summary.anonymous.counts.games}/${summary.anonymous.counts.sets}/${summary.anonymous.counts.card_prints}\``,
    `- Authenticated One Piece games/sets/cards: \`${summary.authenticated.counts.games}/${summary.authenticated.counts.sets}/${summary.authenticated.counts.card_prints}\``,
    `- Print-identity search matches: \`${summary.authenticated.counts.print_identity_search_matches}\``,
    `- Legacy search matches: \`${summary.authenticated.counts.legacy_search_matches}\``,
    `- Direct card matches: \`${summary.authenticated.counts.direct_card_matches}\``,
    `- Signed-in sealed prices returned: \`${summary.authenticated.counts.sealed_pricing_rows}\``,
    `- Anonymous sealed RPC execute: \`${summary.privileges.anonymous_sealed_rpc_execute}\``,
    "",
    "## Rollback Proof",
    "",
    `- Release control restored hidden: \`${summary.after_rollback.release_control.release_status === "hidden"}\``,
    `- Release fingerprint unchanged: \`${summary.before.release_fingerprint === summary.after_rollback.release_fingerprint}\``,
    `- One Piece catalog fingerprint unchanged: \`${summary.before.catalog_fingerprint === summary.after_rollback.catalog_fingerprint}\``,
    `- Non-One Piece boundary unchanged: \`${summary.before.non_one_piece_fingerprint === summary.after_rollback.non_one_piece_fingerprint}\``,
    "",
    "## Decision",
    "",
    summary.ready_for_signed_in_activation
      ? "The database visibility boundary is ready for a separately governed signed-in activation. The catalog remains hidden after this rollback-only proof."
      : "The signed-in catalog boundary is not ready. Keep One Piece hidden and resolve every finding before activation.",
    "",
    "## Findings",
    "",
    ...(summary.findings.length > 0
      ? summary.findings.map(
          (entry) =>
            `- \`${entry.code}\`: actual \`${JSON.stringify(entry.actual)}\`, expected \`${JSON.stringify(entry.expected)}\``,
        )
      : ["- None."]),
  ];
  return `${lines.join("\n")}\n`;
}
