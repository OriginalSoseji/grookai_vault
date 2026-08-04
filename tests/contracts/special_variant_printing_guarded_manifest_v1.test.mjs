import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  buildCandidates,
  evaluateCandidate,
  printingGvId,
} from '../../scripts/audits/special_variant_printing_guarded_manifest_v1.mjs';

const authorityRow = {
  status: 'authoritative_candidate_ready_for_guarded_dry_run',
  card_print_id: 'parent-1',
  gv_id: 'GV-PK-BLW-25-PRERELEASE-STAMP',
  name: 'Darmanitan',
  number: '25',
  set_code: 'bw1',
  variant_key: 'prerelease_stamp',
  authority: {
    expected_finishes: ['holo'],
    observed_finishes: ['holo'],
    discovery_product_id: 228483,
    master_evidence: [{ finish_key: 'stamped' }],
  },
  tcgcsv_product: {
    source_url: 'https://www.tcgplayer.com/product/228483',
    name: 'Darmanitan - 25/114 (Prerelease)',
    payload_hash: 'product-hash',
  },
  tcgcsv_finish_observations: [{ finish_key: 'holo', payload_hash: 'finish-hash' }],
  discovery_evidence: { external_id: 'justtcg-darmanitan-prerelease' },
};
const authorityReport = {
  fingerprint_sha256: 'authority-fingerprint',
  rows: [authorityRow],
};

test('builds one deterministic hidden-review candidate per accepted finish', () => {
  const candidates = buildCandidates(authorityReport);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].printing_gv_id, 'GV-PK-BLW-25-PRERELEASE-STAMP-HOLO');
  assert.equal(candidates[0].required_truth_review.review_status, 'quarantined_candidate');
  assert.equal(candidates[0].required_truth_review.review_disposition, 'needs_review');
  assert.equal(candidates[0].required_truth_review.public_visibility, 'hidden_pending_review');
});

test('printing GV-ID generation is stable and finish-specific', () => {
  assert.equal(printingGvId('GV-PK-TEST', 'cracked_ice'), 'GV-PK-TEST-CRACKED-ICE');
});

function liveInputs(candidate) {
  return {
    candidate,
    parent: {
      id: candidate.card_print_id,
      gv_id: candidate.parent_gv_id,
      name: candidate.name,
      number: candidate.number,
      set_code: candidate.set_code,
      variant_key: candidate.variant_key,
    },
    existingChildren: [],
    gvCollision: null,
    finish: { key: candidate.finish_key, is_active: true },
    activeIdentities: [{ id: 'identity-1' }],
    exactMappingCount: 1,
  };
}

test('live invariants qualify a candidate only for a rollback dry run', () => {
  const candidate = buildCandidates(authorityReport)[0];
  const result = evaluateCandidate(liveInputs(candidate));
  assert.equal(result.live_status, 'ready_for_transactional_rollback_dry_run');
  assert.deepEqual(result.blockers, []);
});

test('existing child and GV-ID collisions block a candidate', () => {
  const candidate = buildCandidates(authorityReport)[0];
  const result = evaluateCandidate({
    ...liveInputs(candidate),
    existingChildren: [{ finish_key: 'holo' }],
    gvCollision: { id: 'collision' },
  });
  assert.equal(result.live_status, 'blocked_live_invariant');
  assert.ok(result.blockers.includes('parent_finish_child_already_exists'));
  assert.ok(result.blockers.includes('printing_gv_id_collision'));
});

test('synthetic stamped finish and public-by-default review policy are prohibited', () => {
  const candidate = {
    ...buildCandidates(authorityReport)[0],
    finish_key: 'stamped',
    required_truth_review: { review_status: 'approved', public_visibility: 'public' },
  };
  const result = evaluateCandidate({ ...liveInputs(candidate), finish: { key: 'stamped', is_active: true } });
  assert.ok(result.blockers.includes('synthetic_stamped_finish_prohibited'));
  assert.ok(result.blockers.includes('future_apply_visibility_guard_missing'));
});

test('manifest has no database mutation path', async () => {
  const source = await fs.readFile(
    new URL('../../scripts/audits/special_variant_printing_guarded_manifest_v1.mjs', import.meta.url),
    'utf8',
  );
  assert.equal(/\.from\([^)]*\)\s*\.\s*(?:insert|upsert|update|delete)\s*\(/s.test(source), false);
  assert.equal(/\.rpc\s*\(/.test(source), false);
});
