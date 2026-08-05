import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  buildWriterContract,
  CONFLICT_CONTRACT,
  EXPECTED_PREFLIGHT_FINGERPRINT,
  loadPayload,
} from '../../scripts/audits/japanese_master_index_v4/payload_writer_v1.mjs';

test('writer contract pins the exact V4 insert-only payload', async () => {
  const payload = await loadPayload();
  const contract = buildWriterContract(payload);
  assert.deepEqual(contract.counts, {
    sets: 1041,
    card_prints: 3888,
    card_print_identity: 3888,
    card_print_identity_source_evidence: 3980,
    card_print_family_review_queue: 3888,
  });
  assert.equal(
    contract.source_preflight_fingerprint_sha256,
    EXPECTED_PREFLIGHT_FINGERPRINT,
  );
  assert.equal(contract.deferred_public_child_count, 3888);
  assert.match(
    contract.payload_fingerprint_sha256,
    /^[0-9a-f]{64}$/,
  );
  assert.match(
    contract.required_approval_message,
    /I do not approve public child printing writes/,
  );
});

test('every target table fails closed and has no mutable columns', () => {
  assert.deepEqual(
    Object.keys(CONFLICT_CONTRACT).sort(),
    [
      'card_print_family_review_queue',
      'card_print_identity',
      'card_print_identity_source_evidence',
      'card_prints',
      'sets',
    ],
  );
  for (const contract of Object.values(CONFLICT_CONTRACT)) {
    assert.equal(contract.behavior, 'insert_only_fail_closed');
    assert.deepEqual(contract.mutable_columns, []);
    assert.ok(contract.immutable_columns.length > 0);
  }
});

test('writer source excludes public visibility and destructive SQL', async () => {
  const source = await fs.readFile(
    'scripts/audits/japanese_master_index_v4/payload_writer_v1.mjs',
    'utf8',
  );
  assert.doesNotMatch(source, /insert into public\.card_printings/i);
  assert.doesNotMatch(source, /insert into public\.card_print_species/i);
  assert.doesNotMatch(source, /\bdelete\s+from\b/i);
  assert.doesNotMatch(source, /\btruncate\b/i);
  assert.doesNotMatch(source, /\bupdate\s+public\./i);
});
