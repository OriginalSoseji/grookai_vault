export const CATALOG_PRICING_COMPLETION_POLICY_V1 =
  "CATALOG_PRICING_COMPLETION_POLICY_V1";

const COMPLETE = "complete";
const INCOMPLETE = "incomplete";
const UNMEASURED = "unmeasured";

function integer(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function measuredInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function percent(numerator, denominator) {
  if (denominator <= 0) return null;
  return Number(((numerator / denominator) * 100).toFixed(3));
}

function componentById(report, componentId) {
  return (Array.isArray(report?.components) ? report.components : [])
    .find((component) => component?.component_id === componentId) ?? null;
}

function componentMetrics(component) {
  return component?.evidence?.worker?.metrics ?? {};
}

function componentCoverage(component) {
  return component?.evidence?.worker?.coverage ?? {};
}

function catalogLane({
  component,
  componentId,
  agentKey,
  objective,
  completionRule,
}) {
  if (!component) {
    return {
      lane_id: componentId,
      status: UNMEASURED,
      agent_key: agentKey,
      agent_state: "missing_evidence",
      objective,
      completion_rule: completionRule,
      backlog: null,
      next_action: `Restore ${componentId} evidence before repair work can be measured.`,
    };
  }

  const metrics = componentMetrics(component);
  const coverage = componentCoverage(component);
  const cards = integer(metrics.cards ?? component.evidence?.card_count);
  const mappedCards = integer(metrics.mapped_cards);
  const exactPrintings = integer(metrics.cards_with_exact_printings);
  const identityUnmapped = integer(coverage.unmapped_cards ?? cards - mappedCards);
  const exactPrintingMissing = integer(
    coverage.cards_without_exact_printings ?? cards - exactPrintings,
  );
  const imageMissing = integer(coverage.missing_images ?? metrics.missing_image);
  const completenessProven = component.evidence?.worker?.catalog_completeness_proven === true;
  const isComplete = completenessProven
    && identityUnmapped === 0
    && exactPrintingMissing === 0
    && imageMissing === 0;

  return {
    lane_id: componentId,
    status: isComplete ? COMPLETE : INCOMPLETE,
    agent_key: agentKey,
    agent_state: "required_not_registered",
    source_component_status: component.status ?? null,
    objective,
    completion_rule: completionRule,
    backlog: {
      cards,
      identity_unmapped: identityUnmapped,
      exact_printing_missing: exactPrintingMissing,
      image_missing: imageMissing,
    },
    coverage: {
      identity_mapped_percent: percent(cards - identityUnmapped, cards),
      exact_printing_percent: percent(cards - exactPrintingMissing, cards),
      image_percent: percent(cards - imageMissing, cards),
      catalog_completeness_proven: completenessProven,
    },
    next_action: isComplete
      ? null
      : `Assign ${agentKey} to consume this lane until every backlog dimension reaches zero.`,
  };
}

function pricingLane(component) {
  const evidence = component?.evidence;
  const requiredCounters = [
    "selected_count",
    "mapped_count",
    "eligible_count",
    "snapshot_count",
  ];
  if (!evidence || requiredCounters.some((key) => !measuredInteger(evidence[key]))) {
    return {
      lane_id: "tcgplayer-pricing-completion",
      status: UNMEASURED,
      agent_key: "tcgplayer-pricing-completion-v1",
      agent_state: "missing_evidence",
      objective: "Publish a fresh exact price for every selected TCGPlayer product.",
      completion_rule: "selected = mapped = eligible = snapshot",
      backlog: null,
      next_action: "Restore current TCGPlayer publication evidence.",
    };
  }

  const selected = evidence.selected_count;
  const mapped = evidence.mapped_count;
  const eligible = evidence.eligible_count;
  const snapshots = evidence.snapshot_count;
  const unmapped = Math.max(0, selected - mapped);
  const mappedIneligible = Math.max(0, mapped - eligible);
  const eligibleUnpublished = Math.max(0, eligible - snapshots);
  const withoutSnapshot = Math.max(0, selected - snapshots);
  const counterIntegrity = selected >= mapped
    && mapped >= eligible
    && eligible >= snapshots;
  const isComplete = selected > 0
    && selected === mapped
    && mapped === eligible
    && eligible === snapshots;

  return {
    lane_id: "tcgplayer-pricing-completion",
    status: isComplete ? COMPLETE : INCOMPLETE,
    agent_key: "tcgplayer-pricing-completion-v1",
    agent_state: "required_not_registered",
    source_component_status: component.status ?? null,
    objective: "Publish a fresh exact price for every selected TCGPlayer product.",
    completion_rule: "selected = mapped = eligible = snapshot",
    backlog: {
      selected,
      mapped,
      eligible,
      snapshots,
      unmapped,
      mapped_but_ineligible: mappedIneligible,
      eligible_but_unpublished: eligibleUnpublished,
      without_published_snapshot: withoutSnapshot,
    },
    coverage: {
      mapped_percent: counterIntegrity ? percent(mapped, selected) : null,
      published_snapshot_percent: counterIntegrity ? percent(snapshots, selected) : null,
      counter_integrity: counterIntegrity,
    },
    next_action: isComplete
      ? null
      : counterIntegrity
        ? "Resolve unmapped products first, classify every ineligible row, then publish all newly eligible snapshots."
        : "Repair inconsistent pricing counters before completion can be evaluated.",
  };
}

function newSetLane(component) {
  const counts = component?.evidence?.counts;
  if (!counts
    || !measuredInteger(counts.candidate_backlog)
    || !measuredInteger(counts.review_required)) {
    return {
      lane_id: "new-set-admission",
      status: UNMEASURED,
      agent_key: "new-set-admission-v1",
      agent_state: "missing_evidence",
      objective: "Admit every verified new set and close its discovery candidate.",
      completion_rule: "candidate backlog = 0 and review required = 0",
      backlog: null,
      next_action: "Restore current new-set discovery evidence.",
    };
  }
  const candidateBacklog = counts.candidate_backlog;
  const reviewRequired = counts.review_required;
  const isComplete = candidateBacklog === 0 && reviewRequired === 0;
  return {
    lane_id: "new-set-admission",
    status: isComplete ? COMPLETE : INCOMPLETE,
    agent_key: "new-set-admission-v1",
    agent_state: "required_not_registered",
    source_component_status: component.status ?? null,
    objective: "Admit every verified new set and close its discovery candidate.",
    completion_rule: "candidate backlog = 0 and review required = 0",
    backlog: {
      candidate_backlog: candidateBacklog,
      review_required: reviewRequired,
      newly_observed_review_required: integer(
        counts.newly_observed_review_required,
      ),
    },
    next_action: isComplete
      ? null
      : "Turn verified discovery candidates into bounded admission packages and close each candidate after readback.",
  };
}

function sealedLane(component) {
  if (!component) {
    return {
      lane_id: "cross-tcg-sealed-completion",
      status: UNMEASURED,
      agent_key: "cross-tcg-sealed-completion-v1",
      agent_state: "missing_evidence",
      objective: "Resolve every sealed-product review candidate and mapping gap.",
      completion_rule: "pending review candidates = 0 and unmapped variants = 0",
      backlog: null,
      next_action: "Restore current cross-TCG sealed evidence.",
    };
  }
  const coverage = componentCoverage(component);
  const pending = integer(coverage.pending_review_candidates);
  const unmapped = integer(coverage.unmapped_variants);
  const isComplete = component.evidence?.worker?.catalog_completeness_proven === true
    && pending === 0
    && unmapped === 0;
  return {
    lane_id: "cross-tcg-sealed-completion",
    status: isComplete ? COMPLETE : INCOMPLETE,
    agent_key: "cross-tcg-sealed-completion-v1",
    agent_state: "required_not_registered",
    source_component_status: component.status ?? null,
    objective: "Resolve every sealed-product review candidate and mapping gap.",
    completion_rule: "pending review candidates = 0 and unmapped variants = 0",
    backlog: {
      families: integer(component.evidence?.family_count),
      variants: integer(component.evidence?.variant_count),
      pending_review_candidates: pending,
      unmapped_variants: unmapped,
    },
    next_action: isComplete
      ? null
      : "Adjudicate each pending sealed candidate and verify the resulting canonical mapping.",
  };
}

function funkoLane(component) {
  if (!component) {
    return {
      lane_id: "funko-catalog-completion",
      status: UNMEASURED,
      agent_key: "funko-catalog-completion-v1",
      agent_state: "missing_evidence",
      source_component_status: null,
      objective: "Build and continuously expand the canonical Funko catalog.",
      completion_rule: "implemented catalog contract with measured source coverage",
      backlog: null,
      next_action: "Register the Funko catalog component and publish measured source coverage.",
    };
  }
  const implemented = component.status === "healthy"
    && !/not implemented/i.test(String(component.reason ?? ""))
    && component.evidence?.catalog_completeness_proven === true;
  return {
    lane_id: "funko-catalog-completion",
    status: implemented ? COMPLETE : INCOMPLETE,
    agent_key: "funko-catalog-completion-v1",
    agent_state: "required_not_registered",
    source_component_status: component.status ?? null,
    objective: "Build and continuously expand the canonical Funko catalog.",
    completion_rule: "implemented catalog contract with measured source coverage",
    backlog: implemented ? { implementation_missing: 0 } : { implementation_missing: 1 },
    next_action: implemented
      ? null
      : "Implement the Funko catalog contract, source coverage audit, and guarded ingestion worker.",
  };
}

export function evaluateCatalogPricingCompletionV1(controlPlane) {
  const lanes = [
    pricingLane(componentById(controlPlane, "tcgplayer-market-pipeline")),
    catalogLane({
      component: componentById(controlPlane, "japanese-master-index"),
      componentId: "japanese-master-index-completion",
      agentKey: "japanese-master-index-completion-v1",
      objective: "Map every Japanese catalog card to a canonical exact printing and image.",
      completionRule: "unmapped cards = 0, missing exact printings = 0, missing images = 0",
    }),
    catalogLane({
      component: componentById(controlPlane, "one-piece-expansion"),
      componentId: "one-piece-catalog-completion",
      agentKey: "one-piece-catalog-completion-v1",
      objective: "Give every One Piece catalog card an exact printing and image.",
      completionRule: "unmapped cards = 0, missing exact printings = 0, missing images = 0",
    }),
    sealedLane(componentById(controlPlane, "cross-tcg-sealed")),
    newSetLane(componentById(controlPlane, "new-set-discovery")),
    funkoLane(componentById(controlPlane, "funko-catalog")),
  ];
  const counts = {
    completion_lanes: lanes.length,
    complete: lanes.filter((lane) => lane.status === COMPLETE).length,
    incomplete: lanes.filter((lane) => lane.status === INCOMPLETE).length,
    unmeasured: lanes.filter((lane) => lane.status === UNMEASURED).length,
    registered_runtime_components: Array.isArray(controlPlane?.components)
      ? controlPlane.components.length
      : 0,
    completion_agents_registered: lanes.filter(
      (lane) => lane.agent_state === "registered",
    ).length,
  };
  const status = counts.unmeasured > 0
    ? UNMEASURED
    : counts.incomplete > 0
      ? INCOMPLETE
      : COMPLETE;

  return {
    schema_version: CATALOG_PRICING_COMPLETION_POLICY_V1,
    observed_at: controlPlane?.observed_at ?? null,
    source_control_plane_status: controlPlane?.overall_status ?? null,
    status,
    completion_allowed: status === COMPLETE,
    counts,
    lanes,
    interpretation: {
      runtime_health_is_completion: false,
      note: "A healthy source component proves that its latest bounded run worked. Completion requires every lane backlog to reach zero.",
      overlapping_catalog_dimensions: true,
    },
  };
}
