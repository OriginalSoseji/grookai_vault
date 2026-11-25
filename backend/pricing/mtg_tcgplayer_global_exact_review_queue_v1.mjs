import { createHash } from 'node:crypto';

import {
  candidateSearchNamesForTcgplayerOllamaRowV1,
  normalizeTcgplayerOllamaCandidateTextV1,
} from './tcgplayer_ollama_candidate_enrichment_v1.mjs';
import {
  normalizeTcgplayerMappingNumberV1,
} from './tcgplayer_market_exact_mapping_plan_policy_v1.mjs';

export const MTG_TCGPLAYER_GLOBAL_EXACT_REVIEW_QUEUE_V1 =
  'MTG_TCGPLAYER_GLOBAL_EXACT_REVIEW_QUEUE_V1';
export const MTG_TCGPLAYER_GLOBAL_EXACT_REVIEW_BATCH_LIMIT_V1 = 50;

const SCRYFALL_PARENT_KEY =
  /^scryfall:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value) {
  return String(value ?? '').trim();
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hold(row, reason) {
  return {
    source_product_id: Number(row?.source_product_id ?? 0) || null,
    source_product_name: text(row?.source_product_name),
    source_group_id: Number(row?.source_group_id ?? 0) || null,
    source_group_name: text(row?.source_group_name),
    target_card_print_id: text(row?.target?.card_print_id),
    reason,
    mapping_authority: false,
    publication_authority: false,
  };
}

export function planMtgTcgplayerGlobalExactReviewRowV1(row) {
  if (row?.disposition !== 'review_queue') {
    return { ready: false, hold: hold(row, 'not_collision_free_review_queue') };
  }
  if (text(row?.target?.game).toLocaleLowerCase('en-US') !== 'mtg') {
    return { ready: false, hold: hold(row, 'non_mtg_scope') };
  }
  const evidence = row?.target?.candidate_evidence ?? {};
  const search = row?.candidate_search ?? {};
  if (
    row?.advice?.decision !== 'lead_candidate'
    || row?.advice?.reason_code !== 'unique_field_alignment'
    || Number(row?.advice?.confidence ?? 0) < 0.99
    || text(row?.advice?.candidate_id) !== text(row?.target?.candidate_id)
  ) {
    return { ready: false, hold: hold(row, 'model_lead_not_exactly_bound') };
  }
  if (
    search?.version !== 'TCGPLAYER_OLLAMA_CANDIDATE_ENRICHMENT_V1'
    || search?.database_reads_only !== true
    || search?.mapping_authority !== false
    || search?.publication_authority !== false
    || search?.likely_sealed_product !== false
    || search?.no_candidate_reason != null
  ) {
    return { ready: false, hold: hold(row, 'candidate_search_proof_invalid') };
  }
  if (
    evidence?.target_set_source !== 'global_catalog_search'
    || Number(search?.candidate_pool_count ?? 0) < 1
    || Number(search?.discovered_candidate_count ?? 0) !== 1
    || Number(search?.diagnostic_reference_count ?? 0) !== 0
    || Number(search?.group_consensus?.set_count ?? 0) === 1
  ) {
    return { ready: false, hold: hold(row, 'global_search_not_unique') };
  }
  if (
    text(row?.target?.identity_domain) !== 'mtg_eng_paper_print'
    || Number(row?.target?.active_standard_identity_count) !== 1
    || Number(row?.target?.active_tcgplayer_mapping_count) !== 0
    || !SCRYFALL_PARENT_KEY.test(text(row?.target?.variant_key))
  ) {
    return { ready: false, hold: hold(row, 'target_identity_or_mapping_state_invalid') };
  }
  const sourceNumber = normalizeTcgplayerMappingNumberV1(row?.printed_number);
  const targetNumber = normalizeTcgplayerMappingNumberV1(row?.target?.canonical_number);
  if (!sourceNumber || sourceNumber !== targetNumber || evidence?.number_exact !== true) {
    return { ready: false, hold: hold(row, 'printed_coordinate_not_exact') };
  }
  const targetName = normalizeTcgplayerOllamaCandidateTextV1(
    row?.target?.canonical_name,
  );
  const sourceNames = candidateSearchNamesForTcgplayerOllamaRowV1(row);
  if (
    !targetName
    || !sourceNames.includes(targetName)
    || evidence?.name_exact !== true
    || Number(evidence?.name_similarity ?? 0) !== 1
    || !['exact_source_name', 'base_name_alias'].includes(
      text(evidence?.source_name_match),
    )
  ) {
    return { ready: false, hold: hold(row, 'normalized_name_not_exact') };
  }
  const targetId = text(row?.target?.card_print_id);
  const targetGvId = text(row?.target?.gv_id);
  const targetSetId = text(row?.target?.set_id);
  const targetSetCode = text(row?.target?.set_code);
  const targetSetName = text(row?.target?.set_name);
  const sourceProductId = Number(row?.source_product_id);
  const sourceGroupId = Number(row?.source_group_id);
  const supportingGapRowCount = Number(row?.supporting_gap_row_count);
  const sourceSubtypes = [...(row?.source_subtypes ?? [])]
    .map(text).filter(Boolean).sort();
  if (
    !Number.isSafeInteger(sourceProductId)
    || sourceProductId <= 0
    || !Number.isSafeInteger(sourceGroupId)
    || sourceGroupId <= 0
    || !Number.isSafeInteger(supportingGapRowCount)
    || supportingGapRowCount <= 0
    || !text(row?.source_product_name)
    || !text(row?.source_group_name)
    || sourceSubtypes.length === 0
    || !targetId
    || text(row?.target?.candidate_id) !== targetId
    || !targetGvId
    || !targetSetId
    || !targetSetCode
    || !targetSetName
  ) {
    return { ready: false, hold: hold(row, 'source_or_target_identity_incomplete') };
  }
  return {
    ready: true,
    row: {
      policy_version: MTG_TCGPLAYER_GLOBAL_EXACT_REVIEW_QUEUE_V1,
      source_product_id: sourceProductId,
      source_product_name: text(row.source_product_name),
      source_group_id: sourceGroupId,
      source_group_name: text(row.source_group_name),
      printed_number: text(row.printed_number),
      source_subtypes: sourceSubtypes,
      supporting_gap_row_count: supportingGapRowCount,
      target_card_print_id: targetId,
      target_gv_id: targetGvId,
      target_set_id: targetSetId,
      target_set_code: targetSetCode,
      target_set_name: targetSetName,
      canonical_name: text(row.target.canonical_name),
      canonical_number: text(row.target.canonical_number),
      target_variant_key: text(row.target.variant_key),
      target_set_source: text(evidence.target_set_source),
      target_name_match: text(evidence.source_name_match),
      target_name_similarity: Number(evidence.name_similarity),
      active_standard_identity_count:
        Number(row.target.active_standard_identity_count),
      active_tcgplayer_mapping_count:
        Number(row.target.active_tcgplayer_mapping_count),
      candidate_pool_count: Number(search.candidate_pool_count),
      discovered_candidate_count: Number(search.discovered_candidate_count),
      group_consensus_set_count:
        search.group_consensus == null
          ? null
          : Number(search.group_consensus.set_count),
      group_consensus_set_code:
        search.group_consensus == null
          ? null
          : text(search.group_consensus.set_code) || null,
      model_reason_code: text(row.advice.reason_code),
      mapping_method: 'exact_mtg_global_name_number_unique_review_v1',
      mapping_confidence: 0.99,
      mapping_authority: false,
      publication_authority: false,
    },
  };
}

export function mtgTcgplayerGlobalExactReviewManifestRowV1(row) {
  return {
    source_product_id: row.source_product_id,
    source_product_name: row.source_product_name,
    source_group_id: row.source_group_id,
    source_group_name: row.source_group_name,
    printed_number: row.printed_number,
    source_subtypes: row.source_subtypes,
    supporting_gap_row_count: row.supporting_gap_row_count,
    target_card_print_id: row.target_card_print_id,
    target_gv_id: row.target_gv_id,
    target_set_id: row.target_set_id,
    target_set_code: row.target_set_code,
    target_set_name: row.target_set_name,
    canonical_name: row.canonical_name,
    canonical_number: row.canonical_number,
    target_variant_key: row.target_variant_key,
    target_set_source: row.target_set_source,
    target_name_match: row.target_name_match,
    target_name_similarity: row.target_name_similarity,
    active_standard_identity_count: row.active_standard_identity_count,
    active_tcgplayer_mapping_count: row.active_tcgplayer_mapping_count,
    candidate_pool_count: row.candidate_pool_count,
    discovered_candidate_count: row.discovered_candidate_count,
    group_consensus_set_count: row.group_consensus_set_count,
    group_consensus_set_code: row.group_consensus_set_code,
    model_reason_code: row.model_reason_code,
    mapping_method: row.mapping_method,
    mapping_confidence: row.mapping_confidence,
  };
}

export function buildMtgTcgplayerGlobalExactReviewQueueV1(rows) {
  const candidates = [];
  const held = [];
  for (const source of rows ?? []) {
    const planned = planMtgTcgplayerGlobalExactReviewRowV1(source);
    if (!planned.ready) {
      held.push(planned.hold);
      continue;
    }
    candidates.push({ source, row: planned.row });
  }

  const productCounts = new Map();
  const targetCounts = new Map();
  for (const candidate of candidates) {
    productCounts.set(
      candidate.row.source_product_id,
      (productCounts.get(candidate.row.source_product_id) ?? 0) + 1,
    );
    targetCounts.set(
      candidate.row.target_card_print_id,
      (targetCounts.get(candidate.row.target_card_print_id) ?? 0) + 1,
    );
  }

  const ready = [];
  for (const candidate of candidates) {
    if (productCounts.get(candidate.row.source_product_id) > 1) {
      held.push(hold(candidate.source, 'duplicate_source_product'));
    } else if (targetCounts.get(candidate.row.target_card_print_id) > 1) {
      held.push(hold(candidate.source, 'duplicate_target_card_print'));
    } else {
      ready.push(candidate.row);
    }
  }
  ready.sort((left, right) =>
    left.source_group_id - right.source_group_id
    || left.source_product_id - right.source_product_id);
  held.sort((left, right) =>
    (left.source_group_id ?? 0) - (right.source_group_id ?? 0)
    || (left.source_product_id ?? 0) - (right.source_product_id ?? 0));

  const batches = [];
  for (
    let offset = 0;
    offset < ready.length;
    offset += MTG_TCGPLAYER_GLOBAL_EXACT_REVIEW_BATCH_LIMIT_V1
  ) {
    const batchRows = ready.slice(
      offset,
      offset + MTG_TCGPLAYER_GLOBAL_EXACT_REVIEW_BATCH_LIMIT_V1,
    );
    const batchIndex = batches.length + 1;
    const manifest = batchRows.map(mtgTcgplayerGlobalExactReviewManifestRowV1);
    batches.push({
      batch_index: batchIndex,
      batch_id: `mtg-global-exact-${String(batchIndex).padStart(4, '0')}`,
      row_count: batchRows.length,
      manifest_sha256: sha256(JSON.stringify(manifest)),
      rows: batchRows,
      founder_review_required: true,
      mapping_authority: false,
      publication_authority: false,
    });
  }

  const manifest = ready.map(mtgTcgplayerGlobalExactReviewManifestRowV1);
  return {
    policy_version: MTG_TCGPLAYER_GLOBAL_EXACT_REVIEW_QUEUE_V1,
    status: ready.length
      ? 'ready_for_founder_review_batches'
      : 'no_ready_rows',
    ready,
    held,
    batches,
    counts: {
      input_rows: Number(rows?.length ?? 0),
      ready_rows: ready.length,
      held_rows: held.length,
      batch_count: batches.length,
      max_batch_rows: MTG_TCGPLAYER_GLOBAL_EXACT_REVIEW_BATCH_LIMIT_V1,
      source_products: new Set(ready.map((row) => row.source_product_id)).size,
      target_card_prints: new Set(
        ready.map((row) => row.target_card_print_id),
      ).size,
      projected_price_observations: ready.reduce(
        (sum, row) => sum + row.supporting_gap_row_count,
        0,
      ),
    },
    manifest_sha256: sha256(JSON.stringify(manifest)),
    boundaries: {
      database_reads: false,
      database_writes: false,
      canonical_writes: false,
      mapping_writes: false,
      publication_writes: false,
      vault_writes: false,
      founder_review_required: true,
      mapping_outcome_preflight_required: true,
      second_founder_approval_required: true,
      transactional_revalidation_required: true,
      durable_reconciliation_required: true,
    },
  };
}
