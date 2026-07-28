export const TCGPLAYER_MARKET_COMPLETION_POLICY_V1 =
  "TCGPLAYER_MARKET_COMPLETION_POLICY_V1";

export const TCGPLAYER_MARKET_COMPLETION_REQUIREMENTS_V1 = Object.freeze([
  "selectable_goal_registered",
  "warehouse_worktree_preserved",
  "implementation_worktree_isolated",
  "migration_history_reconciled",
  "production_schema_migration_parity",
  "qualification_decision_model",
  "immutable_publication_snapshots",
  "current_and_history_views",
  "versioned_database_read_model",
  "durable_resumable_current_pipeline",
  "current_history_operational_separation",
  "one_authoritative_current_schedule",
  "operations_telemetry",
  "human_failure_notification",
  "detail_and_batch_api_contract",
  "all_supported_surfaces_shared_interface",
  "grookai_value_retired_from_v1_product_path",
  "exact_printing_and_freshness_enforced",
  "supporting_metrics_and_asks_cannot_change_close",
  "verification_matrix_passed",
  "three_shadow_cycles",
  "verified_100_printing_canary",
  "authenticated_72_hour_canary",
  "seven_unattended_full_eligible_cycles",
  "minimum_95_percent_exact_mapping_coverage",
  "all_remaining_gaps_deterministic",
  "production_runbooks_complete",
  "pricing_checkpoints_complete",
  "public_rollout_gates_before_anonymous_access",
  "source_licensing_attribution_display_confirmed",
]);

const ALLOWED_STATUSES = new Set([
  "passed",
  "pending",
  "blocked_external",
]);

export function evaluateTcgplayerMarketCompletionV1(rows = []) {
  const findings = [];
  const byId = new Map();
  for (const row of rows) {
    const id = String(row?.requirement_id ?? "").trim();
    if (!id) {
      findings.push("requirement_missing_id");
      continue;
    }
    if (byId.has(id)) {
      findings.push(`duplicate_requirement:${id}`);
      continue;
    }
    byId.set(id, row);
    if (!ALLOWED_STATUSES.has(row.status)) {
      findings.push(`invalid_requirement_status:${id}:${row.status}`);
    }
    if (!String(row.current_truth ?? "").trim()) {
      findings.push(`requirement_missing_current_truth:${id}`);
    }
    if (!Array.isArray(row.evidence) || row.evidence.length === 0) {
      findings.push(`requirement_missing_evidence:${id}`);
    } else if (
      row.evidence.some((evidence) => !String(evidence ?? "").trim())
    ) {
      findings.push(`requirement_has_blank_evidence:${id}`);
    }
    if (
      row.status !== "passed" &&
      !String(row.next_gate ?? "").trim()
    ) {
      findings.push(`open_requirement_missing_next_gate:${id}`);
    }
  }

  for (const id of TCGPLAYER_MARKET_COMPLETION_REQUIREMENTS_V1) {
    if (!byId.has(id)) findings.push(`missing_requirement:${id}`);
  }
  for (const id of byId.keys()) {
    if (!TCGPLAYER_MARKET_COMPLETION_REQUIREMENTS_V1.includes(id)) {
      findings.push(`unknown_requirement:${id}`);
    }
  }

  const normalizedRows = TCGPLAYER_MARKET_COMPLETION_REQUIREMENTS_V1
    .map((id) => byId.get(id))
    .filter(Boolean);
  const counts = {
    required: TCGPLAYER_MARKET_COMPLETION_REQUIREMENTS_V1.length,
    represented: normalizedRows.length,
    passed: normalizedRows.filter((row) => row.status === "passed").length,
    pending: normalizedRows.filter((row) => row.status === "pending").length,
    blocked_external: normalizedRows.filter(
      (row) => row.status === "blocked_external",
    ).length,
  };

  let status = "complete";
  if (findings.length > 0) status = "invalid";
  else if (counts.pending > 0) status = "in_progress";
  else if (counts.blocked_external > 0) status = "blocked_external";

  return {
    policy_version: TCGPLAYER_MARKET_COMPLETION_POLICY_V1,
    status,
    completion_allowed: status === "complete",
    counts,
    findings: [...new Set(findings)].sort(),
    requirements: normalizedRows,
  };
}
