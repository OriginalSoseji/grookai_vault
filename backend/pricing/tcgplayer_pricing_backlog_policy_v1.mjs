export const TCGPLAYER_PRICING_BACKLOG_POLICY_V1 =
  "TCGPLAYER_PRICING_BACKLOG_POLICY_V1";

const REASON_LANES = Object.freeze({
  missing_active_source_mapping: {
    lane: "identity_mapping",
    agent_key: "tcgplayer-identity-mapping-repair-v1",
    action: "Create one verified active source-to-card mapping.",
  },
  missing_mapping_method: {
    lane: "identity_mapping",
    agent_key: "tcgplayer-identity-mapping-repair-v1",
    action: "Repair incomplete mapping provenance.",
  },
  missing_printed_number_evidence: {
    lane: "catalog_evidence",
    agent_key: "catalog-printing-evidence-repair-v1",
    action: "Acquire and verify the printed card number.",
  },
  missing_canonical_printing_identity: {
    lane: "exact_printing",
    agent_key: "exact-printing-repair-v1",
    action: "Create or bind the exact canonical printing.",
  },
  missing_positive_market_price: {
    lane: "source_price",
    agent_key: "market-price-source-recovery-v1",
    action: "Recover a positive source market price or retain a documented no-market state.",
  },
  cosmos_assignment_required: {
    lane: "finish_assignment",
    agent_key: "printing-finish-assignment-repair-v1",
    action: "Assign the exact Cosmos printing finish.",
  },
  cosmos_exact_finish_required: {
    lane: "finish_assignment",
    agent_key: "printing-finish-assignment-repair-v1",
    action: "Bind the source product to the exact Cosmos finish.",
  },
  special_variant_v1_1: {
    lane: "variant_support",
    agent_key: "special-variant-pricing-expansion-v1",
    action: "Qualify the special variant for the supported pricing policy.",
  },
});

function integer(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function reasonOwner(reason) {
  return REASON_LANES[reason] ?? {
    lane: "unclassified",
    agent_key: "pricing-backlog-triage-v1",
    action: "Classify this reason and assign a deterministic repair lane.",
  };
}

export function evaluateTcgplayerPricingBacklogV1({
  run,
  primaryReasons = [],
  reasonOccurrences = [],
}) {
  const selected = integer(run?.selected_count);
  const eligible = integer(run?.eligible_count);
  const snapshots = integer(run?.snapshot_count);
  const excluded = integer(run?.excluded_count);
  const quarantined = integer(run?.quarantined_count);
  const delayed = integer(run?.delayed_count);
  const suppressed = integer(run?.suppressed_count);
  const nonPublished = Math.max(0, selected - snapshots);
  const reasonTotal = primaryReasons.reduce(
    (sum, row) => sum + integer(row.count),
    0,
  );
  const decisionLaneTotal = excluded + quarantined + delayed + suppressed;
  const findings = [];
  if (!run?.id) findings.push("pricing_run_missing");
  if (selected !== eligible + decisionLaneTotal) {
    findings.push("decision_lane_reconciliation_mismatch");
  }
  if (eligible !== snapshots) {
    findings.push("eligible_snapshot_reconciliation_mismatch");
  }
  if (reasonTotal !== nonPublished) {
    findings.push("primary_reason_partition_mismatch");
  }

  const byLane = new Map();
  const reasons = primaryReasons.map((row) => {
    const reason = String(row.primary_reason ?? "unclassified");
    const owner = reasonOwner(reason);
    const count = integer(row.count);
    const lane = byLane.get(owner.lane) ?? {
      lane_id: owner.lane,
      agent_key: owner.agent_key,
      backlog_count: 0,
      reasons: [],
    };
    lane.backlog_count += count;
    lane.reasons.push({ reason, decision: row.decision, count, action: owner.action });
    byLane.set(owner.lane, lane);
    return {
      decision: row.decision,
      primary_reason: reason,
      count,
      lane_id: owner.lane,
      agent_key: owner.agent_key,
      action: owner.action,
    };
  });
  const lanes = [...byLane.values()].sort(
    (left, right) => right.backlog_count - left.backlog_count
      || left.lane_id.localeCompare(right.lane_id),
  );

  return {
    policy_version: TCGPLAYER_PRICING_BACKLOG_POLICY_V1,
    status: findings.length > 0
      ? "invalid"
      : nonPublished === 0
        ? "complete"
        : "incomplete",
    run: {
      id: run?.id ?? null,
      run_key: run?.run_key ?? null,
      completed_at: run?.completed_at ?? null,
    },
    counts: {
      selected,
      eligible,
      snapshots,
      published: snapshots,
      non_published: nonPublished,
      excluded,
      quarantined,
      delayed,
      suppressed,
      primary_reason_rows: reasonTotal,
    },
    findings,
    lanes,
    primary_reasons: reasons,
    reason_occurrences: reasonOccurrences.map((row) => ({
      decision: row.decision,
      reason: row.reason,
      count: integer(row.count),
    })),
    boundaries: {
      primary_reasons_are_mutually_exclusive: true,
      reason_occurrences_can_overlap: true,
      completion_rule: "non_published = 0",
    },
  };
}
