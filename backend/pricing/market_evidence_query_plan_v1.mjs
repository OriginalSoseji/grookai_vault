import {
  MARKET_EVIDENCE_SOURCE_REGISTRY_V1,
  getMarketEvidenceSourceV1,
} from './market_evidence_source_registry_v1.mjs';

const DEFAULT_SOURCES = [
  'ebay_active',
  'ebay_sold_candidate',
  'ebay_user_export',
  'pokemontcg_io_reference',
  'pricecharting_reference',
  'tcgcsv_reference',
  'tcgplayer_reference_candidate',
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

function compactSpaces(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function encodeQuery(value) {
  return encodeURIComponent(compactSpaces(value));
}

function buildCardSearchIdentity(target) {
  const name = normalizeText(target?.name);
  const setCode = normalizeText(target?.set_code);
  const number = normalizeText(target?.number_plain);

  if (!normalizeText(target?.card_print_id)) {
    throw new Error('[market-evidence-query-plan] target.card_print_id is required');
  }
  if (!normalizeText(target?.gv_id)) {
    throw new Error('[market-evidence-query-plan] target.gv_id is required');
  }
  if (!name) {
    throw new Error(`[market-evidence-query-plan] target.name is required for ${target?.gv_id ?? target?.card_print_id}`);
  }

  const numberPart = number ? `#${number}` : '';
  const setPart = setCode ? setCode : '';
  const baseTerms = compactSpaces(['Pokemon card', name, setPart, numberPart].filter(Boolean).join(' '));
  const exactTerms = compactSpaces(['Pokemon', name, setPart, number].filter(Boolean).join(' '));

  return {
    name,
    set_code: setCode,
    number_plain: number,
    base_terms: baseTerms,
    exact_terms: exactTerms,
  };
}

function buildSourceQuery(target, source) {
  const registryEntry = getMarketEvidenceSourceV1(source);
  if (!registryEntry) {
    throw new Error(`[market-evidence-query-plan] unknown source: ${source}`);
  }

  const identity = buildCardSearchIdentity(target);
  const common = {
    card_print_id: target.card_print_id,
    gv_id: target.gv_id,
    source,
    source_type: registryEntry.source_type,
    acquisition_mode: registryEntry.acquisition_mode,
    can_publish_price_directly: false,
    requires_review_before_truth: registryEntry.requires_review_before_truth,
    query_status: 'planned_not_fetched',
  };

  if (source === 'ebay_active') {
    const query = compactSpaces(`${identity.exact_terms} -proxy -custom -reprint -lot -bundle -sealed`);
    return {
      ...common,
      query_kind: 'api_search_terms',
      query_text: query,
      search_url_template: `https://www.ebay.com/sch/i.html?_nkw=${encodeQuery(query)}`,
      inclusion_hints: ['name', 'set_code', 'number_plain', 'pokemon_card'],
      exclusion_hints: ['lot_or_bundle', 'sealed_product', 'proxy_or_reprint', 'foreign_language', 'graded_or_slab'],
      evidence_goal: 'active asking-price candidates only',
    };
  }

  if (source === 'ebay_sold_candidate') {
    const query = compactSpaces(`${identity.exact_terms} -proxy -custom -reprint -lot -bundle -sealed`);
    return {
      ...common,
      query_kind: 'approved_path_required',
      query_text: query,
      search_url_template: `https://www.ebay.com/sch/i.html?_nkw=${encodeQuery(query)}&LH_Sold=1&LH_Complete=1`,
      inclusion_hints: ['name', 'set_code', 'number_plain', 'sold_completed_signal'],
      exclusion_hints: ['lot_or_bundle', 'sealed_product', 'proxy_or_reprint', 'foreign_language'],
      evidence_goal: 'sold comp candidates only after approved access path',
    };
  }

  if (source === 'pricecharting_reference') {
    const query = compactSpaces(`${identity.name} ${identity.set_code ?? ''} ${identity.number_plain ?? ''} Pokemon`);
    return {
      ...common,
      query_kind: 'reference_search_terms',
      query_text: query,
      search_url_template: `https://www.pricecharting.com/search-products?q=${encodeQuery(query)}&type=prices`,
      inclusion_hints: ['name', 'set_code_or_set_family', 'number_plain'],
      exclusion_hints: ['wrong_set', 'wrong_number', 'wrong_finish', 'wrong_print_run'],
      evidence_goal: 'reference price page candidate for corroboration',
    };
  }

  if (source === 'pokemontcg_io_reference') {
    const query = compactSpaces(`${identity.name} ${identity.set_code ?? ''} ${identity.number_plain ?? ''}`);
    return {
      ...common,
      query_kind: 'free_api_card_reference_lookup',
      query_text: query,
      search_url_template: null,
      inclusion_hints: ['card_print_id', 'pokemonapi_external_id_or_set_number_name', 'tcgplayer_price_hash', 'cardmarket_price_hash'],
      exclusion_hints: ['wrong_set', 'wrong_number', 'wrong_finish', 'wrong_print_run', 'ambiguous_variant'],
      evidence_goal: 'free reference price buckets from PokemonTCG.io embedded TCGplayer/Cardmarket data',
    };
  }

  if (source === 'ebay_user_export') {
    const query = compactSpaces(`${identity.exact_terms} ${target.rarity ?? ''}`);
    return {
      ...common,
      query_kind: 'user_uploaded_export_lookup',
      query_text: query,
      search_url_template: null,
      inclusion_hints: ['name', 'set_code_or_set_name', 'number_plain', 'sold_or_listing_export_row'],
      exclusion_hints: ['lot_or_bundle', 'sealed_product', 'proxy_or_reprint', 'foreign_language', 'graded_or_slab', 'ambiguous_variant'],
      evidence_goal: 'map user/admin-owned eBay export rows without live API dependence',
    };
  }

  if (source === 'tcgplayer_reference_candidate') {
    const query = compactSpaces(`${identity.name} ${identity.set_code ?? ''} ${identity.number_plain ?? ''}`);
    return {
      ...common,
      query_kind: 'reference_search_terms',
      query_text: query,
      search_url_template: `https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=${encodeQuery(query)}`,
      inclusion_hints: ['name', 'set_code_or_set_name', 'number_plain'],
      exclusion_hints: ['wrong_set', 'wrong_number', 'wrong_finish', 'ambiguous_variant'],
      evidence_goal: 'marketplace product candidate for reference and identity corroboration',
    };
  }

  if (source === 'tcgcsv_reference') {
    const query = compactSpaces(`${identity.name} ${identity.set_code ?? ''} ${identity.number_plain ?? ''}`);
    return {
      ...common,
      query_kind: 'public_snapshot_group_lookup',
      query_text: query,
      search_url_template: null,
      inclusion_hints: ['tcgcsv_group', 'product_name', 'product_number', 'price_subtype'],
      exclusion_hints: ['wrong_set', 'wrong_number', 'wrong_finish', 'wrong_print_run', 'ambiguous_variant'],
      evidence_goal: 'free TCGCSV TCGplayer product/price snapshot reference buckets',
    };
  }

  if (source === 'tcgplayer_user_export') {
    const query = compactSpaces(`${identity.name} ${identity.set_code ?? ''} ${identity.number_plain ?? ''} ${target.rarity ?? ''}`);
    return {
      ...common,
      query_kind: 'user_uploaded_export_lookup',
      query_text: query,
      search_url_template: null,
      inclusion_hints: ['name', 'set_code_or_set_name', 'number_plain', 'condition_or_marketplace_bucket'],
      exclusion_hints: ['wrong_set', 'wrong_number', 'wrong_finish', 'ambiguous_variant'],
      evidence_goal: 'map user/admin-owned TCGplayer export rows without API dependence',
    };
  }

  if (source === 'manual_review_candidate') {
    const query = compactSpaces(`${identity.base_terms} ${target.rarity ?? ''}`);
    return {
      ...common,
      query_kind: 'operator_review_seed',
      query_text: query,
      search_url_template: null,
      inclusion_hints: ['name', 'set_code', 'number_plain', 'rarity', 'collector_context'],
      exclusion_hints: ['source_terms_unclear', 'manual_review_required'],
      evidence_goal: 'human review seed for ambiguous or high-value cards',
    };
  }

  throw new Error(`[market-evidence-query-plan] source has no query builder: ${source}`);
}

export function buildMarketEvidenceQueryPlanV1({
  targets,
  sources = DEFAULT_SOURCES,
  limit = targets?.length ?? 0,
  generatedAt = new Date().toISOString(),
} = {}) {
  if (!Array.isArray(targets)) {
    throw new Error('[market-evidence-query-plan] targets must be an array');
  }
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error('[market-evidence-query-plan] sources must be a non-empty array');
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('[market-evidence-query-plan] limit must be a positive integer');
  }

  for (const source of sources) {
    if (!getMarketEvidenceSourceV1(source)) {
      throw new Error(`[market-evidence-query-plan] unknown source: ${source}`);
    }
  }

  const selectedTargets = targets.slice(0, limit);
  const plannedTargets = selectedTargets.map((target, index) => ({
    ordinal: index + 1,
    card_print_id: target.card_print_id,
    gv_id: target.gv_id,
    name: target.name,
    set_code: target.set_code ?? null,
    number_plain: target.number_plain ?? null,
    rarity: target.rarity ?? null,
    priority_score: target.priority_score ?? null,
    worklist_reasons: Array.isArray(target.reasons) ? target.reasons : [],
    source_queries: sources.map((source) => buildSourceQuery(target, source)),
  }));

  return {
    generated_at: generatedAt,
    contract: 'MARKET_EVIDENCE_ENGINE_V1',
    phase: 'MEE-04B_MULTI_SOURCE_QUERY_PLAN_V1',
    mode: 'local_query_plan_only',
    boundary: {
      provider_calls: false,
      db_writes: false,
      pricing_rollups: false,
      migration_apply: false,
      source_urls_are_templates_only: true,
    },
    registry_sources: MARKET_EVIDENCE_SOURCE_REGISTRY_V1.map((entry) => ({
      source: entry.source,
      source_type: entry.source_type,
      pricing_lane: entry.pricing_lane,
      acquisition_mode: entry.acquisition_mode,
      can_publish_price_directly: entry.can_publish_price_directly,
    })),
    options: {
      limit,
      sources,
    },
    summary: {
      target_count: plannedTargets.length,
      source_count: sources.length,
      planned_query_count: plannedTargets.length * sources.length,
    },
    targets: plannedTargets,
  };
}
