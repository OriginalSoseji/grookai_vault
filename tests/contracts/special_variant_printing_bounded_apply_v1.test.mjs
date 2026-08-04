import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  MAX_APPLY_BATCH_SIZE,
  VERSION,
  expectedApprovalToken,
  parseIntegerFlag,
  selectBatch,
} from '../../scripts/audits/special_variant_printing_bounded_apply_v1.mjs';

const TARGETS = Array.from({ length: 143 }, (_, index) => ({ index }));

test('apply batches have a hard 25-row ceiling', () => {
  assert.equal(MAX_APPLY_BATCH_SIZE, 25);
  assert.equal(selectBatch(TARGETS, 0, 25).length, 25);
  assert.throws(() => selectBatch(TARGETS, 0, 26), /between 1 and 25/);
});

test('batch selection is exact and deterministic', () => {
  assert.deepEqual(selectBatch(TARGETS, 25, 3).map((row) => row.index), [25, 26, 27]);
  assert.throws(() => selectBatch(TARGETS, 142, 2), /expected exactly 2/);
  assert.throws(() => selectBatch(TARGETS, -1, 1), /zero or greater/);
});

test('read-only reconciliation may inspect the complete frozen manifest', () => {
  assert.equal(selectBatch(TARGETS, 0, 143, { reconcileOnly: true }).length, 143);
});

test('CLI integer parsing rejects malformed batch controls', () => {
  assert.equal(parseIntegerFlag(['--batch-offset=25'], 'batch-offset', 0), 25);
  assert.equal(parseIntegerFlag([], 'batch-size', 25), 25);
  assert.throws(() => parseIntegerFlag(['--batch-size=nope'], 'batch-size', 25), /must be an integer/);
});

test('approval token binds version, manifest, offset, and size', () => {
  assert.equal(
    expectedApprovalToken('manifest-hash', 25, 25),
    `${VERSION}:manifest-hash:25:25`,
  );
  assert.notEqual(
    expectedApprovalToken('manifest-hash', 25, 25),
    expectedApprovalToken('manifest-hash', 50, 25),
  );
});

test('apply script preserves hidden review and public-boundary invariants', async () => {
  const source = await fs.readFile(
    new URL('../../scripts/audits/special_variant_printing_bounded_apply_v1.mjs', import.meta.url),
    'utf8',
  );
  assert.match(source, /SPECIAL_VARIANT_PRINTING_EXPECTED_SHA/);
  assert.match(source, /SPECIAL_VARIANT_PRINTING_EXPECTED_MANIFEST_FINGERPRINT/);
  assert.match(source, /SPECIAL_VARIANT_PRINTING_APPLY_APPROVAL/);
  assert.match(source, /assertCleanTrackedTree\(\)/);
  assert.match(source, /quarantined_candidate/);
  assert.match(source, /hidden_pending_review/);
  assert.match(source, /get_public_card_printing_options_v1/);
  assert.match(source, /Public printing option leak detected/);
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /await client\.query\('commit'\)/);
  assert.match(source, /await client\.query\('rollback'\)/);
  assert.doesNotMatch(source, /\bupdate\s+public\.card_printings\b/i);
  assert.doesNotMatch(source, /\bdelete\s+from\s+public\.card_printings\b/i);
  assert.doesNotMatch(source, /\bon\s+conflict\b/i);
});

test('manual workflow preserves bounded sequential write scopes', async () => {
  const workflow = await fs.readFile(
    new URL('../../.github/workflows/special-variant-printing-bounded-apply.yml', import.meta.url),
    'utf8',
  );
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\bpush:/);
  assert.doesNotMatch(workflow, /\bschedule:/);
  assert.match(workflow, /APPLY_SPECIAL_VARIANT_PRINTINGS_V1/);
  assert.match(workflow, /run_apply 0 25/);
  assert.match(workflow, /run_apply 25 25/);
  assert.match(workflow, /run_apply 50 25/);
  assert.match(workflow, /run_apply 75 25/);
  assert.match(workflow, /run_apply 100 25/);
  assert.match(workflow, /run_apply 125 18/);
  assert.match(workflow, /--reconcile-only --batch-offset=0 --batch-size=143/);
  assert.match(workflow, /cancel-in-progress: false/);
});
