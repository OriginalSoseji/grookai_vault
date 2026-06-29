import { getMarketEvidenceSourceV1 } from './market_evidence_source_registry_v1.mjs';

const DEFAULT_SOURCES = [
  'pokemontcg_io_reference',
  'tcgcsv_reference',
  'ebay_user_export',
  'tcgplayer_user_export',
  'manual_review_candidate',
];

function normalizeText(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSources(sources) {
  if (sources === null || sources === undefined) {
    return DEFAULT_SOURCES;
  }
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error('[market-evidence-acquisition-batch] sources must be a non-empty array');
  }

  return sources.map((source) => {
    const normalized = normalizeText(source);
    if (!normalized || !getMarketEvidenceSourceV1(normalized)) {
      throw new Error(`[market-evidence-acquisition-batch] unknown source: ${source}`);
    }
    return normalized;
  });
}

function assertQueryPlan(queryPlan) {
  if (!queryPlan || typeof queryPlan !== 'object') {
    throw new Error('[market-evidence-acquisition-batch] queryPlan is required');
  }
  if (queryPlan.contract !== 'MARKET_EVIDENCE_ENGINE_V1') {
    throw new Error('[market-evidence-acquisition-batch] queryPlan contract mismatch');
  }
  if (!Array.isArray(queryPlan.targets)) {
    throw new Error('[market-evidence-acquisition-batch] queryPlan.targets must be an array');
  }
}

function buildBatchItem({ target, query, ordinal }) {
  const source = getMarketEvidenceSourceV1(query.source);
  if (!source) {
    throw new Error(`[market-evidence-acquisition-batch] query source is not registered: ${query.source}`);
  }

  return {
    ordinal,
    card_print_id: target.card_print_id,
    gv_id: target.gv_id,
    name: target.name,
    set_code: target.set_code ?? null,
    number_plain: target.number_plain ?? null,
    priority_score: target.priority_score ?? null,
    source: query.source,
    source_type: query.source_type,
    acquisition_mode: query.acquisition_mode,
    query_kind: query.query_kind,
    query_text: query.query_text,
    source_url_template: query.search_url_template ?? null,
    acquisition_status: 'queued_not_fetched',
    evidence_status: 'not_created',
    storage_target: 'local_artifact_only',
    candidate_contract: 'MARKET_EVIDENCE_OBJECT_CONTRACT_V1',
    can_publish_price_directly: false,
    needs_review: true,
    requires_review_before_truth: source.requires_review_before_truth,
    inclusion_hints: Array.isArray(query.inclusion_hints) ? query.inclusion_hints : [],
    exclusion_hints: Array.isArray(query.exclusion_hints) ? query.exclusion_hints : [],
    worklist_reasons: Array.isArray(target.worklist_reasons) ? target.worklist_reasons : [],
  };
}

export function buildMarketEvidenceAcquisitionBatchV1({
  queryPlan,
  sources,
  limit = 100,
  generatedAt = new Date().toISOString(),
  batchLabel = 'MEE-04C',
} = {}) {
  assertQueryPlan(queryPlan);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('[market-evidence-acquisition-batch] limit must be a positive integer');
  }

  const selectedSources = normalizeSources(sources);
  const selectedSourceSet = new Set(selectedSources);
  const items = [];

  for (const target of queryPlan.targets) {
    if (!Array.isArray(target.source_queries)) {
      continue;
    }

    for (const query of target.source_queries) {
      if (!selectedSourceSet.has(query.source)) {
        continue;
      }
      items.push(buildBatchItem({
        target,
        query,
        ordinal: items.length + 1,
      }));
      if (items.length >= limit) {
        break;
      }
    }

    if (items.length >= limit) {
      break;
    }
  }

  const sourceCounts = {};
  for (const item of items) {
    sourceCounts[item.source] = (sourceCounts[item.source] ?? 0) + 1;
  }

  return {
    generated_at: generatedAt,
    contract: 'MARKET_EVIDENCE_ENGINE_V1',
    phase: 'MEE-04C_RAW_EVIDENCE_ACQUISITION_BATCH_V1',
    mode: 'dry_run_acquisition_batch_only',
    batch_label: batchLabel,
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_rollups: false,
      migration_apply: false,
      public_price_publication: false,
      raw_evidence_objects_created: false,
    },
    options: {
      limit,
      sources: selectedSources,
      query_plan_generated_at: queryPlan.generated_at ?? null,
    },
    summary: {
      queued_item_count: items.length,
      source_counts: sourceCounts,
      target_count: new Set(items.map((item) => item.card_print_id)).size,
    },
    items,
  };
}
