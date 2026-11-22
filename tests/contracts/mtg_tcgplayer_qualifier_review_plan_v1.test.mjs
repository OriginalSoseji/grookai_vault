import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildReviewedMtgTcgplayerQualifierPlanV1,
  planReviewedMtgTcgplayerQualifierRowV1,
  stripReviewedMtgTcgplayerQualifierV1,
} from '../../backend/pricing/mtg_tcgplayer_qualifier_review_plan_v1.mjs';

function row(overrides = {}) {
  return {
    disposition: 'fast_track_review',
    source_product_id: 276650,
    source_product_name: 'Rafiq of the Many (Foil Etched)',
    source_group_id: 3070,
    source_group_name: 'Double Masters 2022',
    printed_number: '534',
    source_subtypes: ['Foil'],
    supporting_gap_row_count: 1,
    advice: {
      decision: 'lead_candidate',
      candidate_id: 'card-1',
      confidence: 0.99,
      reason_code: 'unique_field_alignment',
    },
    target: {
      candidate_id: 'card-1',
      card_print_id: 'card-1',
      gv_id: 'GV-MTG-SF-1',
      set_id: 'set-1',
      set_code: '2x2',
      canonical_name: 'Rafiq of the Many',
      canonical_number: '534',
      game: 'mtg',
      active_standard_identity_count: 1,
      active_tcgplayer_mapping_count: 0,
      candidate_evidence: {
        target_set_source: 'unique_group_set_consensus',
        number_exact: true,
        name_exact: true,
        source_name_match: 'base_name_alias',
      },
    },
    candidate_search: {
      group_consensus: { set_count: 1, set_id: 'set-1', set_code: '2x2' },
    },
    ...overrides,
  };
}

test('reviewed MTG product qualifiers strip only from the end', () => {
  assert.deepEqual(stripReviewedMtgTcgplayerQualifierV1(
    'Rafiq of the Many (Foil Etched)',
  ), { base_name: 'Rafiq of the Many', qualifier: '(Foil Etched)' });
  assert.deepEqual(stripReviewedMtgTcgplayerQualifierV1(
    'Anhelo, the Painter (Display Commander) - Thick Stock',
  ), {
    base_name: 'Anhelo, the Painter',
    qualifier: '(Display Commander) - Thick Stock',
  });
  assert.deepEqual(stripReviewedMtgTcgplayerQualifierV1(
    'Pikachu (Ace Trainer)',
  ), { base_name: 'Pikachu (Ace Trainer)', qualifier: null });
});

test('exact MTG group, coordinate and reviewed qualifier enter the review package', () => {
  const result = planReviewedMtgTcgplayerQualifierRowV1(row());
  assert.equal(result.ready, true);
  assert.equal(result.row.reviewed_qualifier, '(Foil Etched)');
  assert.equal(result.row.mapping_authority, false);
});

test('accent folding is allowed only after an approved MTG qualifier is removed', () => {
  const result = planReviewedMtgTcgplayerQualifierRowV1(row({
    source_product_name: 'Eowyn, Shieldmaiden (Display Commander) - Thick Stock',
    target: {
      ...row().target,
      canonical_name: 'Éowyn, Shieldmaiden',
      canonical_number: '81',
      candidate_evidence: {
        ...row().target.candidate_evidence,
        name_exact: false,
        source_name_match: 'token_similarity',
      },
    },
    printed_number: '81',
  }));
  assert.equal(result.ready, true);
});

test('Pokemon special variants and unknown MTG suffixes stay held', () => {
  const pokemon = planReviewedMtgTcgplayerQualifierRowV1(row({
    source_product_name: 'Basic Grass Energy - 009 (30th Celebration)',
    target: { ...row().target, game: 'pokemon' },
  }));
  assert.equal(pokemon.ready, false);
  assert.equal(pokemon.hold.reason, 'non_mtg_scope');

  const unknown = planReviewedMtgTcgplayerQualifierRowV1(row({
    source_product_name: 'Rafiq of the Many (Serialized)',
  }));
  assert.equal(unknown.ready, false);
  assert.equal(unknown.hold.reason,
    'reviewed_name_not_exact_after_qualifier_normalization');
});

test('weak evidence, global search and existing mappings fail closed', () => {
  assert.equal(planReviewedMtgTcgplayerQualifierRowV1(row({
    advice: { ...row().advice, confidence: 0.98 },
  })).ready, false);
  assert.equal(planReviewedMtgTcgplayerQualifierRowV1(row({
    target: {
      ...row().target,
      candidate_evidence: {
        ...row().target.candidate_evidence,
        target_set_source: 'global_catalog_search',
      },
    },
  })).ready, false);
  assert.equal(planReviewedMtgTcgplayerQualifierRowV1(row({
    target: { ...row().target, active_tcgplayer_mapping_count: 1 },
  })).ready, false);
});

test('batch planning holds duplicate products and duplicate targets', () => {
  const duplicateProduct = row({ source_product_id: 276650 });
  const duplicateTarget = row({
    source_product_id: 276651,
    source_product_name: 'Rafiq of the Many (Future Sight)',
  });
  const result = buildReviewedMtgTcgplayerQualifierPlanV1([
    row(), duplicateProduct, duplicateTarget,
  ]);
  assert.equal(result.counts.ready_rows, 0);
  assert.equal(result.counts.held_rows, 3);
  assert.equal(result.boundaries.mapping_writes, false);
  assert.match(result.manifest_sha256, /^[a-f0-9]{64}$/);
});

