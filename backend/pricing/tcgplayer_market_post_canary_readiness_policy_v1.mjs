export const TCGPLAYER_MARKET_POST_CANARY_READINESS_POLICY_V1 =
  "TCGPLAYER_MARKET_POST_CANARY_READINESS_POLICY_V1";

export const TCGPLAYER_MARKET_POST_CANARY_MIGRATIONS_V1 = Object.freeze([
  Object.freeze({
    id: "20260728130000",
    path: "supabase/migrations/20260728130000_tcgplayer_market_read_model_contract_completion_v1.sql",
    sha256: "028c94a4b86cf2e29fcd74dba4e5111c24ce70512019db3688c6d1e5b1632681",
  }),
  Object.freeze({
    id: "20260728133000",
    path: "supabase/migrations/20260728133000_vault_exact_market_pricing_targets_v1.sql",
    sha256: "a66c7ae4aa3903077ad70d81bd1aeaa595f90a27ad30dd5b5604198eb7975cd7",
  }),
  Object.freeze({
    id: "20260730180000",
    path: "supabase/migrations/20260730180000_tcgplayer_market_parent_summary_runtime_repair_v1.sql",
    sha256: "2cca3f5634a40ee68489944fc08e026f8de840a276f159e43546cd3458ea31cf",
  }),
]);

export const TCGPLAYER_MARKET_POST_CANARY_SURFACES_V1 = Object.freeze([
  "web_card_detail",
  "web_search",
  "web_explore",
  "web_set_grid",
  "web_compare",
  "web_private_vault",
  "web_public_vault",
  "web_vault_item",
  "web_market_history",
  "flutter_card_detail",
  "flutter_search_or_grid",
  "flutter_set_grid",
  "flutter_compare",
  "flutter_private_vault",
  "flutter_public_collector",
  "flutter_network",
  "flutter_vault_item",
]);

function normalizedPath(value) {
  return String(value ?? "").trim().replaceAll("\\", "/");
}

export function classifyTcgplayerMarketIntegrationPathV1(value) {
  const filePath = normalizedPath(value);
  if (!filePath) return "unknown";

  if (/^supabase\/migrations\//.test(filePath)) {
    return "database_migration";
  }
  if (
    /^backend\/pricing\//.test(filePath) ||
    /^scripts\/(audits|workers)\/tcgplayer_market_/.test(filePath) ||
    /^deploy\/(env|systemd)\//.test(filePath) ||
    /^deploy\/install-tcgplayer-market/.test(filePath) ||
    /^deploy\/verify-tcgplayer-market/.test(filePath)
  ) {
    return "pricing_runtime";
  }
  if (/^apps\/web\//.test(filePath)) {
    return "web_client";
  }
  if (/^(lib|test)\//.test(filePath)) {
    return "flutter_client";
  }
  if (
    /^tests\/contracts\/.*(tcgplayer_market|pricing)/.test(filePath) ||
    /^test\/.*pricing/.test(filePath)
  ) {
    return "contract_test";
  }
  if (/^docs\/(contracts|runbooks|system)\//.test(filePath)) {
    return "governing_documentation";
  }
  if (/^docs\/(audits|checkpoints)\//.test(filePath)) {
    return "audit_evidence";
  }
  if (/^(\.github|package\.json|deno\.lock|supabase\/config\.toml)/.test(filePath)) {
    return "shared_infrastructure";
  }
  return "manual_review";
}

export function summarizeTcgplayerMarketIntegrationPathsV1(entries) {
  const counts = {};
  for (const entry of entries ?? []) {
    const classification = classifyTcgplayerMarketIntegrationPathV1(
      entry?.path ?? entry,
    );
    counts[classification] = (counts[classification] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
}

export function evaluateTcgplayerMarketPostCanaryReadinessV1(input) {
  const migrationResults = Array.isArray(input?.migrationResults)
    ? input.migrationResults
    : [];
  const conflictFiles = Array.isArray(input?.conflictFiles)
    ? input.conflictFiles
    : [];
  const surfaces = Array.isArray(input?.requiredSurfaces)
    ? input.requiredSurfaces
    : [];
  const findings = [];

  if (
    migrationResults.length !==
      TCGPLAYER_MARKET_POST_CANARY_MIGRATIONS_V1.length ||
    migrationResults.some(
      (migration) => !migration.exists || !migration.hash_matches,
    )
  ) {
    findings.push("post_canary_migration_package_mismatch");
  }
  if (
    surfaces.length !== TCGPLAYER_MARKET_POST_CANARY_SURFACES_V1.length ||
    new Set(surfaces).size !== surfaces.length
  ) {
    findings.push("product_surface_contract_mismatch");
  }
  if (conflictFiles.length > 0) {
    findings.push("manual_integration_conflicts_present");
  }

  return {
    policy_version: TCGPLAYER_MARKET_POST_CANARY_READINESS_POLICY_V1,
    status: findings.length === 0 ? "integration_ready" : "rehearsal_ready",
    migration_package_ready: !findings.includes(
      "post_canary_migration_package_mismatch",
    ),
    surface_contract_ready: !findings.includes(
      "product_surface_contract_mismatch",
    ),
    manual_conflict_count: conflictFiles.length,
    findings,
    boundaries: {
      database_reads_only: true,
      database_writes: false,
      production_deploy: false,
      migration_apply: false,
      publication_activation: false,
      canary_configuration_changes: false,
    },
  };
}
