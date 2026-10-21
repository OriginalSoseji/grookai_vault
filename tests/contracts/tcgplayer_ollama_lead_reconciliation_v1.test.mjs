import assert from 'node:assert/strict';
import test from 'node:test';

import { reconcileTcgplayerOllamaLeadsV1 } from '../../backend/pricing/tcgplayer_ollama_lead_reconciliation_v1.mjs';

function source(id, overrides = {}) {
  return {
    source_product_id: id, source_product_name: `Card ${id}`, source_group_id: 1,
    source_group_name: 'Set', printed_number: String(id), source_subtypes: ['Normal'],
    supporting_gap_row_count: 1, reason: 'no_exact_set_number_name_target', ...overrides,
  };
}

function lead(id, target, overrides = {}) {
  return {
    source_product_id: id,
    disposition: 'review_required',
    advice: { decision: 'lead_candidate', confidence: 0.99, reason_code: 'unique_field_alignment' },
    lead_target: {
      candidate_id: target, card_print_id: target, active_standard_identity_count: 1,
      active_tcgplayer_mapping_count: 0,
      candidate_evidence: { number_exact: true, name_exact: true, target_set_source: 'unique_group_set_consensus' },
    },
    ...overrides,
  };
}

test('duplicate target leads are held as one collision group', () => {
  const result = reconcileTcgplayerOllamaLeadsV1([source(1), source(2)], [lead(1, 'same'), lead(2, 'same')]);
  assert.equal(result.reviewQueue.length, 0);
  assert.equal(result.collisionHolds.length, 2);
  assert.deepEqual(result.collisionHolds[0].collision_source_product_ids, [1, 2]);
});

test('unique exact evidence enters fast review without gaining mapping authority', () => {
  const result = reconcileTcgplayerOllamaLeadsV1([source(1)], [lead(1, 'unique')]);
  assert.equal(result.fastTrack.length, 1);
  assert.equal(result.fastTrack[0].disposition, 'fast_track_review');
});

test('missing coordinates and global searches stay in manual review', () => {
  const result = reconcileTcgplayerOllamaLeadsV1(
    [source(1, { printed_number: '' })],
    [lead(1, 'unique', { lead_target: { ...lead(1, 'unique').lead_target, candidate_evidence: { number_exact: false, name_exact: true, target_set_source: 'global_catalog_search' } } })],
  );
  assert.equal(result.fastTrack.length, 0);
  assert.equal(result.manualReview.length, 1);
});
