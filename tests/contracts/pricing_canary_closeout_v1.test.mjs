import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { CANARY_CLOSEOUT_ROOT_V1, CANARY_WORKFLOW_V1, readPricingCanaryCloseoutV1,
  applyPricingCanaryCloseoutV1 } from '../../backend/operations/pricing_canary_closeout_v1.mjs';
const rootDir = process.cwd();
const now = new Date('2026-09-29T20:00:00Z');
test('permanent completed gate is verified without renewing its historical timestamp', async () => {
  const result = await readPricingCanaryCloseoutV1({ rootDir, now });
  assert.equal(result.status, 'healthy'); assert.equal(result.lifecycle, 'completed');
  assert.equal(result.evidence.historical_as_of, '2026-08-16T18:47:26.299Z');
  assert.equal(result.evidence.current_pricing_health_claimed, false);
});
for (const name of ['summary.json', 'evidence.json', 'run_plan.json', 'REPORT.md', 'artifact_hashes.json']) {
  test(`changed ${name} cannot certify the closed canary`, async () => {
    const result = await readPricingCanaryCloseoutV1({ rootDir, now, readFile: async file => {
      const body = await fs.readFile(file);
      return file === path.join(rootDir, CANARY_CLOSEOUT_ROOT_V1, name) ? Buffer.concat([body, Buffer.from('changed')]) : body;
    } });
    assert.equal(result.status, 'failed');
  });
}
test('missing closeout files remain failed', async () => {
  const result = await readPricingCanaryCloseoutV1({ rootDir, now, readFile: async () => { throw new Error('missing'); } });
  assert.equal(result.status, 'failed');
});
test('a replacement canary cannot inherit the old gate completion', async () => {
  const result = await readPricingCanaryCloseoutV1({ rootDir, now, readFile: async file => {
    const body = await fs.readFile(file);
    return file === path.join(rootDir, CANARY_WORKFLOW_V1) ? Buffer.from('new canary workflow') : body;
  } });
  assert.equal(result.status, 'failed');
});
test('future evidence cannot certify an earlier observation', async () => {
  assert.equal((await readPricingCanaryCloseoutV1({ rootDir, now: new Date('2026-08-15T00:00:00Z') })).status, 'failed');
});
test('stale/failed GitHub history remains attached and current pricing failures remain authoritative', async () => {
  const canary = { component_id: 'pricing-canary-observer', status: 'stale', evidence: { updated_at: '2026-09-29T13:00:00Z' } };
  const pricing = { component_id: 'tcgplayer-market-pipeline', status: 'failed', reason: 'pricing failed' };
  const closeout = await readPricingCanaryCloseoutV1({ rootDir, now });
  const results = applyPricingCanaryCloseoutV1([canary, pricing], closeout);
  assert.equal(results[0].status, 'healthy');
  assert.deepEqual(results[0].evidence.github_workflow_evidence, canary);
  assert.equal(results[1], pricing); assert.equal(results[1].status, 'failed');
  const failed = applyPricingCanaryCloseoutV1([canary], { status: 'failed', lifecycle: 'closeout_unverified', evidence: {} });
  assert.equal(failed[0].status, 'failed');
});
