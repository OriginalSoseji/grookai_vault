import './vendor_storefront_network_guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { runEvidenceCascade, RECOVERY_START_LIMIT_MS } from '../../apps/web/src/lib/stores/scanMatchV7.mjs';

test('accepted identities, orientation and ambiguous identities are preserved exactly', async () => {
  for (const status of ['suggestions', 'ambiguous']) {
    const candidates = [{ id: 'a', rotation: 180 }, ...(status === 'ambiguous' ? [{ id: 'b', rotation: 180 }] : [])];
    const result = await runEvidenceCascade(async () => ({ status, candidates }), async () => { throw Error('Must not rerun a reviewed result'); });
    assert.equal(result.status, status);
    assert.deepEqual(result.candidates, candidates);
    assert.equal(result.reader, 'primary');
  }
});

test('only an empty no-match can attempt the recovery reader', async () => {
  let calls = 0;
  const result = await runEvidenceCascade(async () => ({ status: 'no_match', candidates: [] }), async () => { calls++; return { status: 'ambiguous', candidates: [{ id: 'a' }, { id: 'b' }] }; });
  assert.equal(calls, 1);
  assert.equal(result.status, 'ambiguous');
  assert.equal(result.reader, 'recovery');
  for (const first of [{ status: 'error', candidates: [] }, { status: 'no_match', candidates: [{ id: 'a' }] }]) {
    await runEvidenceCascade(async () => first, async () => { throw Error('Must not recover'); });
  }
});

test('a slow primary cannot start a second OCR deadline', async () => {
  let clock = 0;
  const result = await runEvidenceCascade(async () => { clock = RECOVERY_START_LIMIT_MS; return { status: 'no_match', candidates: [] }; }, async () => { throw Error('Late recovery'); }, () => clock);
  assert.equal(result.reader, 'primary');
});

test('invalid input, worker errors and timeouts propagate without pretending to be no-match', async () => {
  await assert.rejects(runEvidenceCascade(async () => { throw Error('Matching timed out.'); }, async () => { throw Error('Must not run'); }), /Matching timed out/);
  await assert.rejects(runEvidenceCascade(async () => ({ status: 'no_match', candidates: [] }), async () => { throw Error('Decoder failed'); }), /Decoder failed/);
});
