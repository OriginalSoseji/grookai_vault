import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  buildTargets,
  deterministicUuid,
} from '../../scripts/audits/special_variant_printing_transactional_rollback_v1.mjs';

test('deterministic UUIDs are stable and distinct by purpose', () => {
  const first = deterministicUuid('child:GV-PK-TEST-HOLO');
  assert.equal(first, deterministicUuid('child:GV-PK-TEST-HOLO'));
  assert.notEqual(first, deterministicUuid('review:GV-PK-TEST-HOLO'));
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('builds rollback targets only from live-ready manifest rows', () => {
  const row = {
    live_status: 'ready_for_transactional_rollback_dry_run',
    card_print_id: 'parent-id',
    parent_gv_id: 'GV-PK-TEST',
    name: 'Test',
    number: '1',
    set_code: 'test',
    variant_key: 'prerelease_stamp',
    finish_key: 'holo',
    printing_gv_id: 'GV-PK-TEST-HOLO',
    image_status: 'representative_shared_stamp',
    provenance_source: 'tcgcsv_tcgplayer_catalog',
    provenance_ref: 'source-ref',
    discovery_external_id: 'discovery-id',
    source_product_id: 123,
    source_url: 'https://example.test/123',
    source_product_title: 'Test (Prerelease)',
    source_product_payload_hash: 'product-hash',
    source_finish_payload_hashes: ['finish-hash'],
    authority_fingerprint_sha256: 'authority-hash',
    required_truth_review: {
      review_status: 'quarantined_candidate',
      public_visibility: 'hidden_pending_review',
    },
  };
  const targets = buildTargets({ rows: [row, { ...row, live_status: 'blocked_live_invariant' }] });
  assert.equal(targets.length, 1);
  assert.equal(targets[0].required_review_status, 'quarantined_candidate');
  assert.equal(targets[0].required_public_visibility, 'hidden_pending_review');
});

test('rollback proof has no apply or commit path', async () => {
  const source = await fs.readFile(
    new URL('../../scripts/audits/special_variant_printing_transactional_rollback_v1.mjs', import.meta.url),
    'utf8',
  );
  assert.equal(/client\.query\(\s*['"]commit['"]\s*\)/i.test(source), false);
  assert.equal(source.includes("process.argv.includes('--apply')"), true);
  assert.equal(source.includes("await client.query('rollback')"), true);
});
