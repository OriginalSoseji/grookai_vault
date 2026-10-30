import {
  OPERATIONS_AGENT_PROTOCOL_VERSION,
  operationsSha256V1,
  validateFounderWorkItemV1,
  validateOperationsAgentV1,
} from './operations_control_plane_v1.mjs';
import {
  classifyTcgplayerMarketProductScopeV1_5,
} from '../pricing/tcgplayer_market_product_scope_v1.mjs';

export const TCGPLAYER_PRICING_COMPLETION_AGENT_KEY =
  'tcgplayer-pricing-completion-v1';
export const TCGPLAYER_PRICING_COMPLETION_AGENT_VERSION =
  'TCGPLAYER_PRICING_COMPLETION_AGENT_V4';

export const TCGPLAYER_POKEMON_MAPPING_REVIEW_VERSION =
  'TCGPLAYER_POKEMON_MAPPING_REVIEW_V1';

export const TCGPLAYER_POKEMON_REVIEWED_HOLDS_VERSION =
  'TCGPLAYER_POKEMON_REVIEWED_HOLDS_V1';

export const TCGPLAYER_FUTURE_RELEASE_GROUP_HOLDS_V1 = Object.freeze([
  Object.freeze({
    source_group_id: 24831,
    source_group_name: 'ME06: Delta Reign',
    release_date: '2026-11-06',
    official_source_url:
      'https://www.pokemon.com/us/features/sneak-a-peek-at-cards-from-the-mega-evolution-delta-reign-expansion',
    evidence:
      'The official Pokemon announcement identifies Mega Evolution—Delta Reign as available November 6, 2026.',
  }),
]);

function integer(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function isoDay(value, label) {
  const day = String(value ?? '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)
      || !Number.isFinite(Date.parse(`${day}T00:00:00.000Z`))) {
    throw new Error(`${label} must contain an ISO date`);
  }
  return day;
}

export function classifyTcgplayerFutureReleaseBlocksV1(
  blockedRows,
  { observedOn } = {},
) {
  if (!Array.isArray(blockedRows)) {
    throw new Error('Exact mapping blocked rows must be an array');
  }
  const observedDay = isoDay(observedOn, 'observedOn');
  const holdByGroup = new Map(TCGPLAYER_FUTURE_RELEASE_GROUP_HOLDS_V1.map(
    (hold) => [hold.source_group_id, hold],
  ));
  const futureReleaseHolds = [];
  const actionableBlocks = [];
  const sourceProducts = new Set();
  for (const row of blockedRows) {
    const sourceProductId = integer(row?.source_product_id);
    if (!sourceProductId || sourceProducts.has(sourceProductId)) {
      throw new Error('Exact mapping blocked rows require unique source products');
    }
    sourceProducts.add(sourceProductId);
    const groupId = integer(row?.source_group_id);
    const groupName = String(row?.source_group_name ?? '').trim();
    const hold = holdByGroup.get(groupId);
    const isFutureReleaseHold = hold
      && row?.reason === 'missing_unique_set_authority'
      && groupName === hold.source_group_name
      && observedDay < hold.release_date;
    if (!isFutureReleaseHold) {
      actionableBlocks.push(row);
      continue;
    }
    futureReleaseHolds.push({
      schema_version: 'TCGPLAYER_FUTURE_RELEASE_CATALOG_HOLD_V1',
      disposition: 'future_release_catalog_hold',
      source_product_id: sourceProductId,
      source_product_name: String(row?.source_product_name ?? '').trim(),
      source_group_id: groupId,
      source_group_name: groupName,
      printed_number: String(row?.printed_number ?? '').trim(),
      source_subtypes: [...new Set(row?.source_subtypes ?? [])].sort(),
      supporting_gap_observation_ids:
        [...new Set(row?.supporting_gap_observation_ids ?? [])].sort(),
      supporting_gap_row_count: integer(row?.supporting_gap_row_count),
      blocked_reason: String(row?.reason ?? '').trim(),
      observed_on: observedDay,
      release_date: hold.release_date,
      official_source_url: hold.official_source_url,
      evidence: hold.evidence,
      mapping_authority: false,
      catalog_write_authority: false,
      pricing_write_authority: false,
    });
  }
  const heldGroups = new Map();
  for (const row of futureReleaseHolds) {
    const current = heldGroups.get(row.source_group_id) ?? {
      source_group_id: row.source_group_id,
      source_group_name: row.source_group_name,
      release_date: row.release_date,
      source_products: 0,
      supporting_gap_rows: 0,
    };
    current.source_products += 1;
    current.supporting_gap_rows += row.supporting_gap_row_count;
    heldGroups.set(row.source_group_id, current);
  }
  return {
    observed_on: observedDay,
    future_release_holds: futureReleaseHolds,
    actionable_blocks: actionableBlocks,
    summary: {
      blocked_products: blockedRows.length,
      future_release_hold_products: futureReleaseHolds.length,
      actionable_blocked_products: actionableBlocks.length,
      future_release_groups: [...heldGroups.values()].sort((left, right) =>
        left.release_date.localeCompare(right.release_date)
        || left.source_group_id - right.source_group_id),
      canonical_writes: false,
      mapping_writes: false,
      pricing_writes: false,
    },
  };
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
    const currentProductScope = [1, 3].includes(sourceCategoryId)
      ? classifyTcgplayerMarketProductScopeV1_5({
          category_id: sourceCategoryId,
          source_product_name: gap.source_product_name,
          source_group_name: gap.source_group_name,
          has_printed_number_evidence:
            gap.has_printed_number_evidence === true,
        })
      : null;
    if (currentProductScope && !currentProductScope.in_scope) continue;
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
      product_scope_policy_version:
        currentProductScope?.policy_version
        ?? (String(gap.product_scope_policy_version ?? '').trim() || null),
      product_scope_rule_id:
        currentProductScope?.rule_id
        ?? (String(gap.product_scope_rule_id ?? '').trim() || null),
      has_printed_number_evidence:
        gap.has_printed_number_evidence === true,
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

function reviewCandidate(row) {
  const targets = Array.isArray(row?.review_targets) ? row.review_targets : [];
  return {
    source_product_id: integer(row?.source_product_id),
    source_product_name: String(row?.source_product_name ?? '').trim(),
    source_group_id: integer(row?.source_group_id),
    source_group_name: String(row?.source_group_name ?? '').trim(),
    printed_number: String(row?.printed_number ?? '').trim(),
    source_subtypes: [...new Set((row?.source_subtypes ?? []).map((value) =>
      String(value ?? '').trim()).filter(Boolean))].sort(),
    supporting_gap_observation_ids: [...new Set(
      (row?.supporting_gap_observation_ids ?? []).map((value) =>
        String(value ?? '').trim()).filter(Boolean),
    )].sort(),
    review_targets: targets.map((target) => ({
      card_print_id: String(target?.card_print_id ?? '').trim(),
      gv_id: String(target?.gv_id ?? '').trim(),
      set_id: String(target?.set_id ?? '').trim(),
      set_code: String(target?.set_code ?? '').trim(),
      set_name: String(target?.set_name ?? '').trim(),
      canonical_name: String(target?.canonical_name ?? '').trim(),
      canonical_number: String(target?.canonical_number ?? '').trim(),
      variant_key: String(target?.variant_key ?? '').trim(),
      candidate_score: integer(target?.candidate_score),
      candidate_evidence: target?.candidate_evidence ?? {},
    })),
  };
}

export function pokemonPricingMappingReviewEvidenceV1(row) {
  const candidate = reviewCandidate(row);
  return {
    source_product_id: candidate.source_product_id,
    source_product_name: candidate.source_product_name,
    source_group_id: candidate.source_group_id,
    source_group_name: candidate.source_group_name,
    printed_number: candidate.printed_number,
    source_subtypes: candidate.source_subtypes,
    review_targets: candidate.review_targets.map((target) => ({
      card_print_id: target.card_print_id,
      gv_id: target.gv_id,
      set_id: target.set_id,
      set_code: target.set_code,
      canonical_name: target.canonical_name,
      canonical_number: target.canonical_number,
      variant_key: target.variant_key,
    })),
  };
}

export function pokemonPricingMappingReviewEvidenceFingerprintV1(row) {
  return operationsSha256V1(pokemonPricingMappingReviewEvidenceV1(row));
}

export function applyPokemonPricingMappingReviewedHoldsV1(candidates, registry) {
  if (!Array.isArray(candidates)) throw new Error('Pokemon mapping candidates must be an array');
  if (registry?.version !== TCGPLAYER_POKEMON_REVIEWED_HOLDS_VERSION
      || !Array.isArray(registry?.holds)) {
    throw new Error('Pokemon reviewed hold registry is invalid');
  }
  const holds = new Map();
  for (const hold of registry.holds) {
    const productId = integer(hold?.source_product_id);
    const reason = String(hold?.reason ?? '').trim();
    const fingerprint = String(hold?.candidate_fingerprint ?? '').trim();
    if (!productId || !reason || !/^[a-f0-9]{64}$/.test(fingerprint)) {
      throw new Error('Pokemon reviewed hold entry is invalid');
    }
    if (holds.has(productId)) {
      throw new Error(`Pokemon reviewed hold product is duplicated: ${productId}`);
    }
    holds.set(productId, { reason, fingerprint });
  }
  const eligible = [];
  const held = [];
  const heldByReason = {};
  const changedEvidence = [];
  for (const candidate of candidates) {
    const productId = integer(candidate?.source_product_id);
    const hold = holds.get(productId);
    if (!hold) {
      eligible.push(candidate);
      continue;
    }
    const fingerprint = pokemonPricingMappingReviewEvidenceFingerprintV1(candidate);
    if (fingerprint !== hold.fingerprint) {
      changedEvidence.push(candidate);
      eligible.push(candidate);
      continue;
    }
    const reason = `reviewed_${hold.reason}`;
    heldByReason[reason] = (heldByReason[reason] ?? 0) + 1;
    held.push(candidate);
  }
  return {
    eligible,
    held,
    held_count: held.length,
    held_by_reason: Object.fromEntries(Object.entries(heldByReason).sort()),
    changed_evidence_count: changedEvidence.length,
  };
}

export function selectPokemonPricingMappingReviewBatchV1(candidates, limit = 50) {
  if (!Array.isArray(candidates)) throw new Error('Pokemon mapping candidates must be an array');
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    throw new Error('Pokemon mapping review limit must be between 1 and 50');
  }
  const selected = [];
  const sourceProducts = new Set();
  const targetParents = new Set();
  const heldByReason = {};
  const hold = (reason) => { heldByReason[reason] = (heldByReason[reason] ?? 0) + 1; };
  const ordered = [...candidates].sort((left, right) =>
    integer(left?.source_product_id) - integer(right?.source_product_id));
  for (const candidate of ordered) {
    const productId = integer(candidate?.source_product_id);
    const targets = Array.isArray(candidate?.review_targets) ? candidate.review_targets : [];
    if (!productId || targets.length !== 1) { hold('not_single_target'); continue; }
    const target = targets[0] ?? {};
    const targetId = String(target.card_print_id ?? '').trim();
    if (!targetId || !String(target.gv_id ?? '').trim()
        || !String(target.set_id ?? '').trim()
        || !String(target.set_code ?? '').trim()
        || !String(target.canonical_name ?? '').trim()
        || !String(target.canonical_number ?? '').trim()) {
      hold('incomplete_target_evidence'); continue;
    }
    if (sourceProducts.has(productId)) { hold('duplicate_source_product'); continue; }
    if (targetParents.has(targetId)) { hold('duplicate_target_parent'); continue; }
    if (selected.length >= limit) { hold('batch_limit'); continue; }
    sourceProducts.add(productId);
    targetParents.add(targetId);
    selected.push(candidate);
  }
  return {
    selected,
    selected_count: selected.length,
    held_count: ordered.length - selected.length,
    held_by_reason: Object.fromEntries(Object.entries(heldByReason).sort()),
  };
}

export function buildPokemonPricingMappingReviewWorkItemV1({
  candidates,
  sourcePricingRunId,
  sourceSyncRunId,
  sourceCompletedAt,
  sourceCommitSha = null,
  sourceRunUri = null,
  expiresAt = new Date(Date.now() + 7 * 86400_000).toISOString(),
} = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  if (candidates.length > 50) {
    throw new Error('Pokemon mapping review batch exceeds 50 candidates');
  }
  if (!String(sourcePricingRunId ?? '').trim()
      || !String(sourceSyncRunId ?? '').trim()
      || !Number.isFinite(Date.parse(String(sourceCompletedAt ?? '')))) {
    throw new Error('Pokemon mapping review requires bound source-run evidence');
  }
  const rows = candidates.map(reviewCandidate).sort((left, right) =>
    left.source_product_id - right.source_product_id);
  const sourceProducts = new Set();
  const targetParents = new Set();
  for (const row of rows) {
    const target = row.review_targets[0];
    if (!row.source_product_id || row.review_targets.length !== 1
        || !target.card_print_id || !target.gv_id || !target.set_id
        || !target.set_code || !target.canonical_name || !target.canonical_number) {
      throw new Error('Pokemon mapping review requires one proposed target per product');
    }
    if (sourceProducts.has(row.source_product_id) || targetParents.has(target.card_print_id)) {
      throw new Error('Pokemon mapping review contains duplicate product or parent');
    }
    sourceProducts.add(row.source_product_id);
    targetParents.add(target.card_print_id);
  }
  const planPayload = {
    proposal_kind: 'pokemon_tcgplayer_mapping_review',
    proposal_version: TCGPLAYER_POKEMON_MAPPING_REVIEW_VERSION,
    source_pricing_run_id: String(sourcePricingRunId ?? '').trim(),
    source_sync_run_id: String(sourceSyncRunId ?? '').trim(),
    source_completed_at: String(sourceCompletedAt ?? '').trim(),
    source_commit_sha: String(sourceCommitSha ?? '').trim() || null,
    review_candidates: rows,
    review_boundary: {
      database_writes: false,
      mapping_writes: false,
      publication_writes: false,
      writer_dispatches: false,
      approval_records_review_only: true,
    },
  };
  const planFingerprint = operationsSha256V1(planPayload);
  return validateFounderWorkItemV1({
    work_item_key: `pokemon-pricing-mapping-review:${planPayload.source_sync_run_id}`,
    work_item_type: 'tcgplayer_pricing_backlog_repair',
    action_type: 'advance_tcgplayer_pricing_backlog',
    agent_key: TCGPLAYER_PRICING_COMPLETION_AGENT_KEY,
    title: `Review ${rows.length} Pokemon price mapping ${rows.length === 1 ? 'lead' : 'leads'}`,
    summary: 'Exact set and card-number evidence found one existing grookai parent per TCGPlayer product. Review the identity matches before mapping authority is issued.',
    domain: 'pricing',
    risk_level: 'medium',
    scope: {
      game: 'pokemon',
      source: 'tcgplayer',
      candidate_count: rows.length,
      source_group_count: new Set(rows.map((row) => row.source_group_id)).size,
      source_pricing_run_id: planPayload.source_pricing_run_id,
      source_sync_run_id: planPayload.source_sync_run_id,
    },
    exclusions: [
      'no automatic approval of ambiguous identities',
      'no canonical card or printing creation',
      'no mapping or price writes from this review item',
      'no customer state writes',
    ],
    plan_payload: planPayload,
    plan_fingerprint: planFingerprint,
    source_commit_sha: planPayload.source_commit_sha,
    source_run_uri: String(sourceRunUri ?? '').trim() || null,
    contract_version: 'FOUNDER_WORK_ITEM_COMMAND_V1',
    executor_version: null,
    requires_recent_auth: false,
    command_policy: {
      execution_enabled: false,
      reason: 'review_only_until_exact_mapping_authority_is_frozen',
    },
    expires_at: expiresAt,
    evidence: [],
  });
}

export function buildPokemonPricingMappingAuthorityReviewWorkItemV1({
  candidates,
  exactMappingCandidates,
  masterMappingAuthority,
  sourcePricingRunId,
  sourceSyncRunId,
  sourceCompletedAt,
  sourceCommitSha = null,
  sourceRunUri = null,
  expiresAt = new Date(Date.now() + 7 * 86400_000).toISOString(),
} = {}) {
  const base = buildPokemonPricingMappingReviewWorkItemV1({
    candidates,
    sourcePricingRunId,
    sourceSyncRunId,
    sourceCompletedAt,
    sourceCommitSha,
    sourceRunUri,
    expiresAt,
  });
  if (!base) return null;
  if (!Array.isArray(exactMappingCandidates) || exactMappingCandidates.length !== candidates.length) {
    throw new Error('Pokemon authority review requires exact mapping candidates');
  }
  if (masterMappingAuthority?.version !== 'MASTER_INDEX_MAPPING_AUTHORITY_V1') {
    throw new Error('Pokemon authority review requires Master Index mapping authority');
  }
  const planPayload = {
    ...base.plan_payload,
    proposal_version: 'TCGPLAYER_POKEMON_MAPPING_AUTHORITY_REVIEW_V1',
    exact_mapping_candidates: exactMappingCandidates,
    master_mapping_authority: masterMappingAuthority,
  };
  return validateFounderWorkItemV1({
    ...base,
    work_item_key: `${base.work_item_key}:master-authority-batch-01`,
    title: `Approve ${candidates.length} evidence-bound Pokemon price mappings`,
    summary: 'Each source product is bound to one live grookai parent, one matching Master Index finish, and frozen source bytes. Approval enables the guarded mapping outcome preflight.',
    plan_payload: planPayload,
    plan_fingerprint: operationsSha256V1(planPayload),
  });
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
  const pokemonCatalogCoverage = report.pokemon_catalog_coverage ?? null;
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
    pokemon_catalog_coverage: pokemonCatalogCoverage,
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
