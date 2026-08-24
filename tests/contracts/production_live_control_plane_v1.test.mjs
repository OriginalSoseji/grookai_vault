import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyRuntimeTimerStateV1,
  classifyOperationsAlertDeliveryV1,
  classifyPricingRunV1,
  classifyNewSetDiscoveryV1,
  classifyScannerIdentityV1,
  classifySourceSyncV1,
  classifyWorkflowRunV1,
  controlPlaneAlertFingerprintV1,
  controlPlaneAlertFindingsV1,
  shouldDeliverControlPlaneAlertV1
} from '../../scripts/audits/production_live_control_plane_v1.mjs';

const NOW = new Date('2026-08-24T01:00:00.000Z');

test('successful fresh GitHub workflow is healthy', () => {
  const result = classifyWorkflowRunV1(
    { max_staleness_minutes: 90 },
    {
      status: 'completed',
      conclusion: 'success',
      updated_at: '2026-08-24T00:30:00.000Z'
    },
    NOW
  );
  assert.equal(result.status, 'healthy');
});

test('public GitHub workflow collection does not require an authorization token', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    'scripts/audits/production_live_control_plane_v1.mjs',
    'utf8'
  ));
  assert.match(source, /if \(token\) headers\.Authorization/);
  assert.doesNotMatch(source, /if \(!token\) \{\s*return \{/);
});

test('new-set discovery is healthy only when the report is successful and fresh', () => {
  assert.equal(classifyNewSetDiscoveryV1({
    status: 'succeeded',
    observed_at: '2026-08-24T00:30:00.000Z',
    findings: [],
    counts: { review_required: 2 }
  }, NOW).status, 'healthy');
  assert.equal(classifyNewSetDiscoveryV1({
    status: 'failed',
    observed_at: '2026-08-24T00:30:00.000Z',
    findings: ['source_sync_stale']
  }, NOW).status, 'failed');
  assert.equal(classifyNewSetDiscoveryV1({
    status: 'succeeded',
    observed_at: '2026-08-22T00:00:00.000Z',
    findings: [],
    counts: {}
  }, NOW).status, 'stale');
});

test('failed GitHub workflow is never hidden by freshness', () => {
  const result = classifyWorkflowRunV1(
    { max_staleness_minutes: 90 },
    {
      status: 'completed',
      conclusion: 'failure',
      updated_at: '2026-08-24T00:59:00.000Z'
    },
    NOW
  );
  assert.equal(result.status, 'failed');
});

test('pricing requires terminal state, reconciliation, and freshness', () => {
  assert.equal(classifyPricingRunV1({
    state: 'verified',
    reconciliation_state: 'reconciled',
    completed_at: '2026-08-24T00:00:00.000Z'
  }, NOW).status, 'healthy');
  assert.equal(classifyPricingRunV1({
    state: 'verified',
    reconciliation_state: 'mismatch',
    completed_at: '2026-08-24T00:00:00.000Z'
  }, NOW).status, 'degraded');
  assert.equal(classifyPricingRunV1({
    state: 'failed',
    reconciliation_state: 'pending',
    failed_at: '2026-08-24T00:00:00.000Z'
  }, NOW).status, 'failed');
});

test('source sync rejects partial or row-level failures', () => {
  assert.equal(classifySourceSyncV1({
    status: 'completed',
    failed_count: 0,
    finished_at: '2026-08-24T00:00:00.000Z'
  }, NOW).status, 'healthy');
  assert.equal(classifySourceSyncV1({
    status: 'partial_success',
    failed_count: 0,
    finished_at: '2026-08-24T00:00:00.000Z'
  }, NOW).status, 'degraded');
  assert.equal(classifySourceSyncV1({
    status: 'completed',
    failed_count: 1,
    finished_at: '2026-08-24T00:00:00.000Z'
  }, NOW).status, 'failed');
});

test('scanner identity requires both active services and successful health probes', () => {
  assert.equal(classifyScannerIdentityV1({
    v3_state: 'active',
    v5_state: 'active',
    v3_health: { ok: true },
    v5_health: { ok: true }
  }).status, 'healthy');
  assert.equal(classifyScannerIdentityV1({
    v3_state: 'inactive',
    v5_state: 'active',
    v3_health: { ok: true },
    v5_health: { ok: true }
  }).status, 'failed');
  assert.equal(classifyScannerIdentityV1({
    v3_state: 'active',
    v5_state: 'active',
    v3_health: { ok: false },
    v5_health: { ok: true }
  }).status, 'failed');
});

test('an inactive timer fails a historically healthy scheduled worker', () => {
  const healthyRun = {
    component_id: 'tcgplayer-market-pipeline',
    status: 'healthy',
    reason: 'Latest run succeeded.',
    evidence: { run_id: 'run-1' }
  };
  assert.equal(applyRuntimeTimerStateV1(
    healthyRun,
    'active',
    'grookai-tcgplayer-market-pipeline.timer'
  ).status, 'healthy');
  const inactive = applyRuntimeTimerStateV1(
    healthyRun,
    'inactive',
    'grookai-tcgplayer-market-pipeline.timer'
  );
  assert.equal(inactive.status, 'failed');
  assert.match(inactive.reason, /does not prove unattended operation/);
});

test('operations alert delivery requires fresh terminal rows for every recipient', () => {
  const event = { received_at: '2026-08-24T00:20:00.000Z', recipient_count: 1 };
  assert.equal(classifyOperationsAlertDeliveryV1(event, [{
    sent_at: '2026-08-24T00:21:00.000Z',
    failed_at: null,
    failure_reason: null
  }], NOW).status, 'healthy');
  assert.equal(classifyOperationsAlertDeliveryV1(event, [{
    sent_at: null,
    failed_at: null,
    failure_reason: null
  }], NOW).status, 'degraded');
  assert.equal(classifyOperationsAlertDeliveryV1(event, [{
    sent_at: null,
    failed_at: '2026-08-24T00:21:00.000Z',
    failure_reason: 'delivery_failed'
  }], NOW).status, 'failed');
  assert.equal(classifyOperationsAlertDeliveryV1(event, [{
    sent_at: '2026-08-21T00:00:00.000Z',
    failed_at: null,
    failure_reason: null
  }], NOW).status, 'stale');
});

test('control-plane alerts include only unhealthy launch-critical components', () => {
  const findings = controlPlaneAlertFindingsV1({
    components: [
      { component_id: 'pricing', status: 'stale', reason: 'old' },
      { component_id: 'scanner', status: 'healthy', reason: 'ok' },
      { component_id: 'background', status: 'failed', reason: 'paused lane' }
    ]
  }, {
    components: [
      { id: 'pricing', criticality: 'launch_critical' },
      { id: 'scanner', criticality: 'launch_critical' },
      { id: 'background', criticality: 'background' }
    ]
  });
  assert.deepEqual(findings.map((finding) => finding.component_id), ['pricing']);
});

test('control-plane alert fingerprint ignores changing human-readable age text', () => {
  const first = controlPlaneAlertFingerprintV1([{
    component_id: 'mee-nightly',
    status: 'stale',
    reason: 'Latest evidence is 3000 minutes old.'
  }]);
  const second = controlPlaneAlertFingerprintV1([{
    component_id: 'mee-nightly',
    status: 'stale',
    reason: 'Latest evidence is 3015 minutes old.'
  }]);
  assert.equal(first, second);
});

test('control-plane alert delivery is transition-based and cooldown bounded', () => {
  assert.equal(shouldDeliverControlPlaneAlertV1({
    findingFingerprint: 'new',
    previousState: { finding_fingerprint: 'old', delivered_at: NOW.toISOString() },
    now: NOW
  }), true);
  assert.equal(shouldDeliverControlPlaneAlertV1({
    findingFingerprint: 'same',
    previousState: { finding_fingerprint: 'same', delivered_at: '2026-08-24T00:30:00.000Z' },
    now: NOW,
    cooldownMinutes: 360
  }), false);
  assert.equal(shouldDeliverControlPlaneAlertV1({
    findingFingerprint: 'same',
    previousState: { finding_fingerprint: 'same', delivered_at: '2026-08-23T18:00:00.000Z' },
    now: NOW,
    cooldownMinutes: 360
  }), true);
});
