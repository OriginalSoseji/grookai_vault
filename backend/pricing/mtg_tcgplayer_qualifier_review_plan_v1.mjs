import { createHash } from 'node:crypto';

import {
  normalizeTcgplayerMappingNumberV1,
} from './tcgplayer_market_exact_mapping_plan_policy_v1.mjs';

export const MTG_TCGPLAYER_QUALIFIER_REVIEW_PLAN_V1 =
  'MTG_TCGPLAYER_QUALIFIER_REVIEW_PLAN_V1';

const MTG_PRODUCT_QUALIFIERS = Object.freeze([
  '(Display Commander) (Foil Etched) - Thick Stock',
  '(Display Commander) (Ripple Foil) - Thick Stock',
  '(Display Commander) - Thick Stock',
  '(Retro Frame) (Foil Etched)',
  '(Foil Etched) (Gold)',
  '(Foil Etched)',
  '(Future Sight)',
]);

function text(value) {
  return String(value ?? '').trim();
}

function foldedName(value) {
  return text(value)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('en-US')
    .replace(/\s+/g, ' ')
    .trim();
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function stripReviewedMtgTcgplayerQualifierV1(value) {
  const source = text(value);
  for (const qualifier of MTG_PRODUCT_QUALIFIERS) {
    if (source.endsWith(` ${qualifier}`)) {
      return {
        base_name: source.slice(0, -(qualifier.length + 1)).trim(),
        qualifier,
      };
    }
  }
  return { base_name: source, qualifier: null };
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

export function planReviewedMtgTcgplayerQualifierRowV1(row) {
  if (row?.disposition !== 'fast_track_review') {
    return { ready: false, hold: hold(row, 'not_fast_track_review') };
  }
  if (text(row?.target?.game).toLocaleLowerCase('en-US') !== 'mtg') {
    return { ready: false, hold: hold(row, 'non_mtg_scope') };
  }
  const evidence = row?.target?.candidate_evidence ?? {};
  const consensus = row?.candidate_search?.group_consensus ?? {};
  if (
    row?.advice?.decision !== 'lead_candidate'
    || row?.advice?.reason_code !== 'unique_field_alignment'
    || Number(row?.advice?.confidence ?? 0) < 0.99
    || text(row?.advice?.candidate_id) !== text(row?.target?.candidate_id)
  ) {
    return { ready: false, hold: hold(row, 'model_lead_not_exactly_bound') };
  }
  if (
    Number(consensus?.set_count) !== 1
    || !text(consensus?.set_id)
    || text(consensus?.set_id) !== text(row?.target?.set_id)
    || evidence?.target_set_source !== 'unique_group_set_consensus'
  ) {
    return { ready: false, hold: hold(row, 'unique_group_set_consensus_missing') };
  }
  if (
    Number(row?.target?.active_standard_identity_count) !== 1
    || Number(row?.target?.active_tcgplayer_mapping_count) !== 0
  ) {
    return { ready: false, hold: hold(row, 'target_identity_or_mapping_state_invalid') };
  }
  const sourceNumber = normalizeTcgplayerMappingNumberV1(row?.printed_number);
  const targetNumber = normalizeTcgplayerMappingNumberV1(row?.target?.canonical_number);
  if (!sourceNumber || sourceNumber !== targetNumber || evidence?.number_exact !== true) {
    return { ready: false, hold: hold(row, 'printed_coordinate_not_exact') };
  }
  const normalized = stripReviewedMtgTcgplayerQualifierV1(row?.source_product_name);
  const sourceName = foldedName(normalized.base_name);
  const targetName = foldedName(row?.target?.canonical_name);
  if (!sourceName || sourceName !== targetName) {
    return { ready: false, hold: hold(row, 'reviewed_name_not_exact_after_qualifier_normalization') };
  }
  const sourceNameMatch = text(evidence?.source_name_match);
  const evidenceSupportsReviewedName = normalized.qualifier
    ? ['exact_source_name', 'base_name_alias', 'token_similarity'].includes(sourceNameMatch)
    : evidence?.name_exact === true
      && ['exact_source_name', 'base_name_alias'].includes(sourceNameMatch);
  if (!evidenceSupportsReviewedName) {
    return { ready: false, hold: hold(row, 'candidate_name_evidence_not_exact') };
  }
  const targetId = text(row?.target?.card_print_id);
  const targetGvId = text(row?.target?.gv_id);
  if (!targetId || !targetGvId || !text(row?.target?.set_code)) {
    return { ready: false, hold: hold(row, 'target_identity_incomplete') };
  }
  return {
    ready: true,
    row: {
      policy_version: MTG_TCGPLAYER_QUALIFIER_REVIEW_PLAN_V1,
      source_product_id: Number(row.source_product_id),
      source_product_name: text(row.source_product_name),
      source_group_id: Number(row.source_group_id),
      source_group_name: text(row.source_group_name),
      printed_number: text(row.printed_number),
      source_subtypes: [...(row.source_subtypes ?? [])].map(text).filter(Boolean).sort(),
      supporting_gap_row_count: Number(row.supporting_gap_row_count ?? 0),
      target_card_print_id: targetId,
      target_gv_id: targetGvId,
      target_set_id: text(row.target.set_id),
      target_set_code: text(row.target.set_code),
      canonical_name: text(row.target.canonical_name),
      canonical_number: text(row.target.canonical_number),
      normalized_base_name: normalized.base_name,
      reviewed_qualifier: normalized.qualifier,
      mapping_method: normalized.qualifier
        ? 'exact_mtg_group_number_name_product_qualifier_review_v1'
        : 'exact_mtg_group_number_name_review_v1',
      mapping_confidence: 0.99,
      mapping_authority: false,
      publication_authority: false,
    },
  };
}

export function buildReviewedMtgTcgplayerQualifierPlanV1(rows) {
  const candidates = [];
  const held = [];
  for (const source of rows ?? []) {
    const planned = planReviewedMtgTcgplayerQualifierRowV1(source);
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
  const manifest = ready.map((row) => ({
    source_product_id: row.source_product_id,
    source_group_id: row.source_group_id,
    target_card_print_id: row.target_card_print_id,
    target_gv_id: row.target_gv_id,
    mapping_method: row.mapping_method,
  }));
  return {
    policy_version: MTG_TCGPLAYER_QUALIFIER_REVIEW_PLAN_V1,
    status: ready.length ? 'ready_for_founder_review' : 'no_ready_rows',
    ready,
    held,
    counts: {
      input_rows: Number(rows?.length ?? 0),
      ready_rows: ready.length,
      held_rows: held.length,
      source_products: new Set(ready.map((row) => row.source_product_id)).size,
      target_card_prints: new Set(ready.map((row) => row.target_card_print_id)).size,
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
      transactional_revalidation_required: true,
    },
  };
}

