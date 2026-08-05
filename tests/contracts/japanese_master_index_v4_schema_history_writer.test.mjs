import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  APPROVAL_ENV,
  EXPECTED_CONTRACT_FINGERPRINT,
  EXPECTED_MIGRATION_SHA256,
  stripTransactionWrapper,
} from '../../scripts/audits/japanese_master_index_v4/schema_history_writer_v1.mjs';
import {
  MIGRATION_PATH,
  MIGRATION_VERSION,
} from '../../scripts/audits/japanese_master_index_v4/schema_history_preflight_v1.mjs';

test('schema history writer pins one exact migration and approval gate', () => {
  assert.equal(MIGRATION_VERSION, '20260805100000');
  assert.match(EXPECTED_MIGRATION_SHA256, /^[0-9a-f]{64}$/);
  assert.match(EXPECTED_CONTRACT_FINGERPRINT, /^[0-9a-f]{64}$/);
  assert.equal(APPROVAL_ENV, 'JPN_V4_SCHEMA_HISTORY_APPLY_APPROVAL');
});

test('transaction wrapper removal preserves migration body only', async () => {
  const source = await fs.readFile(MIGRATION_PATH, 'utf8');
  const body = stripTransactionWrapper(source);
  assert.doesNotMatch(body, /(^|\n)\s*begin;/i);
  assert.doesNotMatch(body, /(^|\n)\s*commit;/i);
  assert.match(body, /create table if not exists/);
  assert.match(body, /set search_path = pg_catalog/);
});

test('migration has no governed table row DML', async () => {
  const source = await fs.readFile(MIGRATION_PATH, 'utf8');
  assert.doesNotMatch(
    source,
    /(^|\n)\s*(insert\s+into|update\s+public\.|delete\s+from|truncate\s+)/i,
  );
});
