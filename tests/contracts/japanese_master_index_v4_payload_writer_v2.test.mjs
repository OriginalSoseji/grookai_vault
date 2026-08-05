import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  APPROVAL_ENV_V2,
  buildWriterV2Plan,
  EXPECTED_PREFLIGHT_V2_FINGERPRINT,
  PAYLOAD_WRITER_V2_VERSION,
} from '../../scripts/audits/japanese_master_index_v4/payload_writer_v2.mjs';

test('V2 writer pins the exact final 5,336-card payload', async () => {
  const { contract } = await buildWriterV2Plan();
  assert.deepEqual(contract.counts, {
    sets: 1_041,
    card_prints: 5_336,
    card_print_identity: 5_336,
    card_print_identity_source_evidence: 5_461,
    card_print_family_review_queue: 5_336,
  });
  assert.equal(
    contract.source_preflight_fingerprint_sha256,
    EXPECTED_PREFLIGHT_V2_FINGERPRINT,
  );
  assert.equal(contract.deferred_public_child_count, 5_336);
  assert.match(contract.payload_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.match(
    contract.required_approval_message,
    /I do not approve public child printing writes/,
  );
});

test('V2 writer has an independent exact approval boundary', () => {
  assert.equal(
    PAYLOAD_WRITER_V2_VERSION,
    'JPN-MASTER-INDEX-V4-PAYLOAD-WRITER-V2',
  );
  assert.equal(APPROVAL_ENV_V2, 'JPN_V4_PAYLOAD_V2_APPLY_APPROVAL');
  assert.match(EXPECTED_PREFLIGHT_V2_FINGERPRINT, /^[0-9a-f]{64}$/);
});

test('V2 writer source excludes public and destructive write paths', async () => {
  const source = await fs.readFile(
    'scripts/audits/japanese_master_index_v4/payload_writer_v2.mjs',
    'utf8',
  );
  assert.doesNotMatch(source, /insert into public\.card_printings/i);
  assert.doesNotMatch(source, /insert into public\.card_print_species/i);
  assert.doesNotMatch(source, /\bdelete\s+from\b/i);
  assert.doesNotMatch(source, /\btruncate\b/i);
  assert.doesNotMatch(source, /\bupdate\s+public\./i);
});
