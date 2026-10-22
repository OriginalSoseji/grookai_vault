import {
  OPERATIONS_AGENT_PROTOCOL_VERSION,
  validateOperationsAgentV1,
} from './operations_control_plane_v1.mjs';

export const TCGPLAYER_PRICING_COMPLETION_AGENT_KEY =
  'tcgplayer-pricing-completion-v1';
export const TCGPLAYER_PRICING_COMPLETION_AGENT_VERSION =
  'TCGPLAYER_PRICING_COMPLETION_AGENT_V3';

function integer(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

export function buildTcgplayerPricingCompletionAgentV1() {
  return validateOperationsAgentV1({
    agent_key: TCGPLAYER_PRICING_COMPLETION_AGENT_KEY,
    display_name: 'TCGPlayer Pricing Completion',
    domain: 'pricing',
    owner_label: 'Grookai Pricing Operations',
    description:
      'Continuously measures the production pricing backlog and advances verified repair batches through governed publication.',
    execution_platform: 'github_actions',
    source_locator: '.github/workflows/tcgplayer-pricing-completion-agent.yml',
    schedule_kind: 'cron',
    schedule_expression: '*/15 * * * *',
    heartbeat_interval_seconds: 900,
    stale_after_seconds: 3600,
    allowed_work_item_types: ['tcgplayer_pricing_backlog_repair'],
    allowed_command_actions: ['advance_tcgplayer_pricing_backlog'],
    contract_version: OPERATIONS_AGENT_PROTOCOL_VERSION,
    executor_version: TCGPLAYER_PRICING_COMPLETION_AGENT_VERSION,
    escalation_policy: {
      stale_severity: 'high',
      failure_severity: 'high',
      recovery_notification: true,
      founder_pause_allowed: true,
    },
  });
}

export function buildTcgplayerIdentityProductQueueV1(gaps = []) {
  const products = new Map();
  for (const gap of gaps) {
    if (String(gap?.product_scope_result ?? '').trim() !== 'in_scope') continue;
    const sourceProductId = integer(gap?.source_product_id);
    const sourceCategoryId = integer(gap?.source_category_id);
    if (!sourceProductId || !sourceCategoryId) continue;
    const key = `${sourceCategoryId}:${sourceProductId}`;
    const current = products.get(key) ?? {
      schema_version: 'TCGPLAYER_IDENTITY_PRODUCT_QUEUE_V1',
      source_product_id: sourceProductId,
      source_product_name: String(gap.source_product_name ?? '').trim(),
      source_category_id: sourceCategoryId,
      source_category_name: String(gap.source_category_name ?? '').trim(),
      source_group_id: integer(gap.source_group_id),
      source_group_name: String(gap.source_group_name ?? '').trim(),
      product_scope_result: String(gap.product_scope_result ?? '').trim(),
      agent_key: String(gap.agent_key ?? '').trim(),
      primary_gap_reasons: new Set(),
      source_subtypes: new Set(),
      supporting_gap_observation_ids: new Set(),
    };
    current.primary_gap_reasons.add(String(gap.primary_gap_reason ?? '').trim());
    current.source_subtypes.add(String(gap.source_subtype_name ?? '').trim());
    current.supporting_gap_observation_ids.add(
      String(gap.source_observation_id ?? '').trim(),
    );
    products.set(key, current);
  }
  return [...products.values()].map((row) => ({
    ...row,
    primary_gap_reasons: [...row.primary_gap_reasons].filter(Boolean).sort(),
    source_subtypes: [...row.source_subtypes].filter(Boolean).sort(),
    supporting_gap_observation_ids:
      [...row.supporting_gap_observation_ids].filter(Boolean).sort(),
    supporting_gap_row_count: row.supporting_gap_observation_ids.size,
    disposition: 'queued_for_category_identity_repair',
    mapping_authority: false,
    publication_authority: false,
  })).sort((left, right) =>
    left.source_category_id - right.source_category_id
    || left.source_group_id - right.source_group_id
    || left.source_product_id - right.source_product_id);
}

function categoryLane(worklist, categoryId, queue) {
  const category = Array.isArray(worklist.categories)
    ? worklist.categories.find((row) => integer(row.source_category_id) === categoryId)
    : null;
  const queuedProducts = queue.filter((row) => row.source_category_id === categoryId).length;
  return {
    agent_key: category?.agent_key ?? (categoryId === 1
      ? 'mtg-tcgplayer-identity-repair-v1'
      : 'pokemon-tcgplayer-identity-repair-v1'),
    backlog_rows: integer(category?.backlog_rows),
    source_products: integer(category?.source_products),
    source_groups: integer(category?.source_groups),
    queued_products: queuedProducts,
  };
}

export function summarizeTcgplayerPricingCompletionRunV1(
  report,
  { exactPlan = null, identityProductQueue = [] } = {},
) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw new Error('Pricing backlog report is required');
  }
  if (!['complete', 'incomplete'].includes(report.status)) {
    throw new Error(`Pricing backlog report is invalid: ${report.status ?? 'missing'}`);
  }
  if (!report.run?.id || !report.run?.run_key) {
    throw new Error('Pricing backlog report source run is missing');
  }
  const counts = report.counts ?? {};
  const worklist = report.identity_mapping_worklist ?? {};
  if (worklist.status !== 'ready') {
    throw new Error(`Pricing identity worklist is invalid: ${worklist.status ?? 'missing'}`);
  }
  const largestUnreviewedGroup = Array.isArray(worklist.top_groups)
    ? worklist.top_groups[0] ?? null
    : null;
  if (exactPlan && exactPlan.status !== 'passed') {
    throw new Error(`Exact mapping plan is invalid: ${exactPlan.status ?? 'missing'}`);
  }
  const exactCandidates = Array.isArray(exactPlan?.candidates)
    ? exactPlan.candidates
    : [];
  const nextCandidate = exactCandidates[0] ?? null;
  const mtgLane = categoryLane(worklist, 1, identityProductQueue);
  const pokemonLane = categoryLane(worklist, 3, identityProductQueue);
  return {
    agent_version: TCGPLAYER_PRICING_COMPLETION_AGENT_VERSION,
    completion_status: report.status,
    source_pricing_run_id: report.run.id,
    source_pricing_run_key: report.run.run_key,
    source_sync_run_id: report.run.source_sync_run_id ?? null,
    selected_count: integer(counts.selected),
    published_count: integer(counts.published),
    non_published_count: integer(counts.non_published),
    identity_mapping_backlog_count: integer(worklist.counts?.backlog_rows),
    identity_mapping_source_products: integer(worklist.counts?.source_products),
    identity_mapping_source_groups: integer(worklist.counts?.source_groups),
    verified_mapping_candidates: integer(exactPlan?.counts?.candidates),
    verified_projected_gap_rows: integer(exactPlan?.counts?.projected_gap_rows),
    blocked_mapping_products: integer(exactPlan?.counts?.blocked),
    identity_repair_lanes: {
      mtg: mtgLane,
      pokemon: pokemonLane,
    },
    next_group: nextCandidate
      ? {
          source_group_id: integer(nextCandidate.source_group_id),
          source_group_name: String(nextCandidate.source_group_name ?? '').trim(),
          backlog_rows: integer(nextCandidate.supporting_gap_row_count),
          source_products: exactCandidates.filter((row) =>
            integer(row.source_group_id) === integer(nextCandidate.source_group_id)).length,
        }
      : null,
    largest_unreviewed_group: largestUnreviewedGroup
      ? {
          source_group_id: integer(largestUnreviewedGroup.source_group_id),
          source_group_name: String(largestUnreviewedGroup.source_group_name ?? '').trim(),
          backlog_rows: integer(largestUnreviewedGroup.backlog_rows),
          source_products: integer(largestUnreviewedGroup.source_products),
        }
      : null,
    next_action: exactCandidates.length > 0
      ? 'prepare_verified_mapping_batch'
      : mtgLane.queued_products > 0
        ? 'advance_mtg_identity_repair_queue'
      : report.status === 'complete'
        ? null
        : 'expand_reviewed_pokemon_set_authority',
    completion_reached: report.status === 'complete',
    canonical_writes: false,
    publication_writes: false,
  };
}
