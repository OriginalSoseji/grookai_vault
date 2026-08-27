export const CATALOG_SHADOW_AUTOMATION_VERSION =
  "CATALOG_SHADOW_AUTOMATION_V1";

export const CATALOG_SHADOW_MODE = "shadow-only";

function countBy(rows, key) {
  const counts = {};
  for (const row of rows ?? []) {
    const value = String(row?.[key] ?? "unknown");
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) =>
    left.localeCompare(right)));
}

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

export function buildCatalogShadowReconciliationV1({
  actionableGaps,
  actualHeadSha,
  discoverySummary,
  expectedHeadSha,
  masterIndexCandidates,
  promotionCandidates,
}) {
  requireArray(actionableGaps, "actionableGaps");
  requireArray(masterIndexCandidates, "masterIndexCandidates");
  requireArray(promotionCandidates, "promotionCandidates");
  if (!discoverySummary || typeof discoverySummary !== "object") {
    throw new Error("discoverySummary must be an object");
  }
  if (discoverySummary.database_mode !== "read-only transaction") {
    throw new Error("Shadow reconciliation requires read-only discovery evidence");
  }
  if (expectedHeadSha && actualHeadSha !== expectedHeadSha) {
    throw new Error("Shadow reconciliation HEAD does not match the frozen SHA");
  }

  const queue = promotionCandidates.map((candidate, index) => ({
    shadow_candidate_id: `shadow-${String(index + 1).padStart(6, "0")}`,
    authority: "evidence_only_not_canonical",
    execution_authorized: false,
    candidate,
  }));

  return {
    version: CATALOG_SHADOW_AUTOMATION_VERSION,
    mode: CATALOG_SHADOW_MODE,
    expected_head_sha: expectedHeadSha ?? null,
    actual_head_sha: actualHeadSha ?? null,
    source_discovery_version: discoverySummary.version ?? null,
    counts: {
      actionable_gap_count: actionableGaps.length,
      master_index_candidate_count: masterIndexCandidates.length,
      shadow_promotion_candidate_count: queue.length,
      by_game: countBy(promotionCandidates, "game_code"),
      by_status: countBy(promotionCandidates, "status"),
    },
    queue,
    boundaries: {
      permitted_persistence: [
        "immutable_source_evidence",
        "normalized_candidate_indexes",
        "data_only_git_history",
        "workflow_artifacts",
        "health_issues",
      ],
      canonical_writes: false,
      database_writes: false,
      storage_writes: false,
      image_pointer_writes: false,
      pricing_writes: false,
      publication_writes: false,
      vault_writes: false,
      child_writer_dispatches: false,
      promotion_execution_enabled: false,
    },
  };
}
