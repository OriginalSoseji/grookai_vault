import assert from 'node:assert/strict';
import test from 'node:test';
import { assertionDisposition, hasCurrentProvenance } from '../../scripts/audits/japanese_master_index_v4/current_provenance_v1.mjs';

test('current provenance excludes retained inactive evidence', () => {
  const card = { independent_source_count: 0, baseline_evidence_ids: ['old'], active_baseline_evidence_ids: [] };
  assert.equal(hasCurrentProvenance(card), false);
  assert.equal(hasCurrentProvenance({ ...card, active_baseline_evidence_ids: ['new'] }), true);
  assert.equal(hasCurrentProvenance({ ...card, independent_source_count: 1 }), true);
});

test('linked inactive assertions remain excluded from support', () => {
  const identity = { disposition: 'existing' };
  const mapping = { existing: 'supports_existing' };
  assert.equal(assertionDisposition(identity, { assertion_lane: 'preserved_inactive_evidence' }, mapping), 'excluded_source_assertion');
  assert.equal(assertionDisposition(identity, { assertion_lane: 'preserved_live_evidence' }, mapping), 'supports_existing');
  assert.equal(assertionDisposition(null, { final_disposition: 'conflict_blocked' }, mapping), 'source_group_conflict');
  assert.throws(() => assertionDisposition({ disposition: 'unknown' }, {}, mapping), /Missing assertion disposition/);
});

test('legacy artifacts retain their previous provenance behavior', () => {
  assert.equal(hasCurrentProvenance({ independent_source_count: 0, baseline_evidence_ids: ['old'] }), true);
  assert.equal(hasCurrentProvenance({ independent_source_count: 0, baseline_evidence_ids: [] }), false);
});
