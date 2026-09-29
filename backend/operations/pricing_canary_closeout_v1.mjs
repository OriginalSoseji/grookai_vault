import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const CANARY_CLOSEOUT_ROOT_V1 = 'docs/audits/pricing/mee_pricing_platform_production_v1/canary_final_pass_20260818/github_main_replay_32194979152';
export const CANARY_WORKFLOW_V1 = '.github/workflows/tcgplayer-market-canary-observation.yml';
const WORKFLOW_SHA256 = '2f5a35ce2b8bb4afd0255a48a6eb235d975c607f152dafed0c62b74cfdb9dd6f';
const EXPECTED = Object.freeze({
  'run_plan.json': '4fbcb620527c4d3703412cb308f7799064ac0d3388d4769cba8c8d6ba576418b',
  'evidence.json': '1f106826969314f610a814331226b4dad9c8011f169a6b38b07e20d8d00026b6',
  'summary.json': '6c37bbb2a48830a5c13cb68ada3f7bd8a9f0643c27a522fe3b1b467479327d32',
  'REPORT.md': '3881f90f98357ddd1f702c13e8f04a876ff77be4935555c916fa3e1739bb28f1',
});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// This is a completed release gate, not a fresh pricing observation. Pin both
// the permanent closeout and the exact old workflow so a replacement canary
// cannot inherit this completion. Never renew the historical evidence date.
export async function readPricingCanaryCloseoutV1({ rootDir, now = new Date(), readFile = fs.readFile } = {}) {
  try {
    assert.equal(hash(await readFile(path.join(rootDir, CANARY_WORKFLOW_V1))), WORKFLOW_SHA256);
    const recordedHashes = JSON.parse(await readFile(path.join(rootDir, CANARY_CLOSEOUT_ROOT_V1, 'artifact_hashes.json')));
    assert.deepEqual(recordedHashes, EXPECTED);
    const bodies = {};
    for (const [name, expected] of Object.entries(EXPECTED)) {
      const bytes = await readFile(path.join(rootDir, CANARY_CLOSEOUT_ROOT_V1, name));
      assert.equal(hash(bytes), expected); bodies[name] = bytes;
    }
    const summary = JSON.parse(bodies['summary.json']);
    const plan = JSON.parse(bodies['run_plan.json']);
    assert.equal(summary.status, 'passed'); assert.deepEqual(summary.findings, []);
    assert.equal(summary.window.elapsed, true); assert.equal(summary.window.required_hours, 72);
    assert.equal(summary.window.as_of, '2026-08-16T18:47:26.299Z');
    assert.ok(now.getTime() >= Date.parse(summary.window.as_of));
    assert.equal(plan.expected_commit_sha, '6b729441bf8944048885ade5d9905e23166d9d46');
    assert.equal(plan.activation_run_id, 'e902fb55-c0ac-49d5-a9b4-9412d694900e');
    assert.equal(plan.frozen_evidence.sha256, '7b84a452de3afff671fbbc83801f779020c5e9c1f2ad4edab5c4969999916013');
    assert.equal(summary.schedule.matched_slots.length, 3);
    assert.deepEqual(summary.schedule.missing_slots, []);
    assert.equal(summary.terminal_alert_count, 0);
    return { status: 'healthy', lifecycle: 'completed',
      reason: 'The 72-hour canary gate is closed with hash-verified final evidence; recurring canary observations are no longer required.',
      evidence: { final_run_id: '32194979152', historical_as_of: summary.window.as_of,
        historical_window_end: summary.window.required_end_at, final_status: summary.status,
        artifact_root: CANARY_CLOSEOUT_ROOT_V1, artifact_hashes: EXPECTED,
        frozen_workflow_sha256: WORKFLOW_SHA256, current_pricing_health_claimed: false } };
  } catch {
    return { status: 'failed', lifecycle: 'closeout_unverified',
      reason: 'Completed-canary evidence is missing, changed, premature, or belongs to a different workflow; closeout cannot be certified.',
      evidence: { error_code: 'CANARY_CLOSEOUT_UNVERIFIED', current_pricing_health_claimed: false } };
  }
}

export function applyPricingCanaryCloseoutV1(results, closeout) {
  return results.map(result => result.component_id === 'pricing-canary-observer'
    ? { ...result, provider: 'hash_verified_release_closeout', status: closeout.status,
      lifecycle: closeout.lifecycle, reason: closeout.reason,
      evidence: { github_workflow_evidence: result, release_closeout: closeout.evidence } }
    : result);
}
