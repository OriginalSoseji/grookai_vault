import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DIRECT_WRITE_CALLS,
  WRITE_INTENT_CLASSIFICATION,
  insertReconciliationEvent,
  invalidateCurrentStaging,
  requeueCandidateForReview,
  runStagingReconciliation,
} from '../../backend/warehouse/staging_reconciliation_v1.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE_PATH = path.join(REPO_ROOT, 'backend', 'warehouse', 'staging_reconciliation_v1.mjs');

function withEnv(updates, fn) {
  const previous = new Map();
  for (const [key, value] of Object.entries(updates)) {
    previous.set(key, process.env[key]);
    if (value === null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const [key, value] of previous.entries()) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });
}

test('staging reconciliation is blocked by default when runtime-safe env flag is not set', async () => {
  await withEnv(
    {
      ENABLE_STAGING_RECONCILIATION_RUNTIME_SAFE: null,
      SUPABASE_DB_URL: null,
    },
    async () => {
      await assert.rejects(
        runStagingReconciliation({ emitLogs: false }),
        /RUNTIME_ENFORCEMENT: staging_reconciliation_v1 is disabled until fully runtime-compliant\./,
      );
    },
  );
});

test('direct write function paths throw runtime enforcement errors', async () => {
  await assert.rejects(
    insertReconciliationEvent(),
    /RUNTIME_ENFORCEMENT: staging_reconciliation_v1 direct canon mutation is blocked\./,
  );
  await assert.rejects(
    invalidateCurrentStaging(),
    /RUNTIME_ENFORCEMENT: staging_reconciliation_v1 direct canon mutation is blocked\./,
  );
  await assert.rejects(
    requeueCandidateForReview(),
    /RUNTIME_ENFORCEMENT: staging_reconciliation_v1 direct canon mutation is blocked\./,
  );
});

test('apply mode remains blocked even when runtime-safe env flag is present', async () => {
  await withEnv(
    {
      ENABLE_STAGING_RECONCILIATION_RUNTIME_SAFE: 'true',
      SUPABASE_DB_URL: null,
    },
    async () => {
      await assert.rejects(
        runStagingReconciliation({ apply: true, emitLogs: false }),
        /RUNTIME_ENFORCEMENT: staging_reconciliation_v1 direct canon mutation is blocked\./,
      );
    },
  );
});

test('staging reconciliation source contains no direct public table mutation SQL', async () => {
  const source = await fs.readFile(SOURCE_PATH, 'utf8');

  assert.match(source, /CONTRACT_RUNTIME_ENFORCEMENT_GUARD/);
  assert.match(source, /ENABLE_STAGING_RECONCILIATION_RUNTIME_SAFE/);
  assert.doesNotMatch(source, /insert into public\./i);
  assert.doesNotMatch(source, /update public\./i);
  assert.doesNotMatch(source, /delete from public\./i);
});

test('staging reconciliation tracks blocked direct write intents explicitly', () => {
  assert.deepEqual(DIRECT_WRITE_CALLS, [
    'insertReconciliationEvent @ original lines 199-228',
    'invalidateCurrentStaging @ original lines 239-281',
    'requeueCandidateForReview @ original lines 284-302',
  ]);
  assert.equal(
    WRITE_INTENT_CLASSIFICATION.executeAliasMappingWithinTransaction,
    'alias_mapping_related',
  );
  assert.equal(
    WRITE_INTENT_CLASSIFICATION.insertReconciliationEvent,
    'reconciliation_event_log',
  );
});
