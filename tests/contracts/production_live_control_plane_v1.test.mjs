import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  applyDirectEdgeFallbackV1,
  applyRuntimeTimerStateV1,
  classifyDirectEdgeProbeV1,
  classifyOperationsAlertDeliveryV1,
  classifyPricingRunV1,
  classifyNewSetDiscoveryV1,
  classifyScannerIdentityV1,
  classifySourceSyncV1,
  classifyWorkflowRunV1,
  collectDirectEdgeProbeV1,
  collectGitHubWorkflowComponentsV1,
  controlPlaneAlertFingerprintV1,
  controlPlaneAlertFindingsV1,
  resolveRuntimeCommitShaV1,
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

test('active GitHub workflow is healthy only inside its bounded execution window', () => {
  const component = { max_staleness_minutes: 90, max_runtime_minutes: 30 };
  const active = {
    status: 'in_progress',
    run_started_at: '2026-08-24T00:50:00.000Z',
    updated_at: '2026-08-24T00:59:00.000Z'
  };
  const healthy = classifyWorkflowRunV1(component, active, NOW);
  assert.equal(healthy.status, 'healthy');
  assert.equal(healthy.runtime_minutes, 10);

  const stuck = classifyWorkflowRunV1(component, {
    ...active,
    run_started_at: '2026-08-23T23:00:00.000Z'
  }, NOW);
  assert.equal(stuck.status, 'degraded');
});

test('production edge probe avoids the top-of-hour scheduler congestion window', async () => {
  const workflow = await fs.readFile('.github/workflows/prod-edge-probe.yml', 'utf8');
  const topology = JSON.parse(await fs.readFile('backend/operations/production_topology_v1.json', 'utf8'));
  const component = topology.components.find((item) => item.id === 'prod-edge-probe');
  assert.match(workflow, /cron: '23 \* \* \* \*'/);
  assert.equal(component.schedule, '23 * * * *');
  assert.equal(component.max_staleness_minutes, 150);
});

test('public GitHub workflow collection does not require an authorization token', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    'scripts/audits/production_live_control_plane_v1.mjs',
    'utf8'
  ));
  assert.match(source, /if \(token\) headers\.Authorization/);
  assert.doesNotMatch(source, /if \(!token\) \{\s*return \{/);
  assert.match(source, /'Cache-Control': 'no-cache, no-store, max-age=0'/);
  assert.match(source, /Pragma: 'no-cache'/);
  assert.match(source, /cache_bust=\$\{cacheBust\}/);
  assert.match(source, /`\$\{now\.getTime\(\)\}-\$\{process\.pid\}`/);
});

test('components sharing one workflow use one provider payload', async () => {
  let loads = 0;
  const components = [
    { id: 'vercel-web', max_staleness_minutes: 90, source_files: ['.github/workflows/prod-edge-probe.yml'] },
    { id: 'prod-edge-probe', max_staleness_minutes: 90, source_files: ['.github/workflows/prod-edge-probe.yml'] }
  ];
  const results = await collectGitHubWorkflowComponentsV1(components, null, NOW, {
    loadPayload: async () => {
      loads += 1;
      return {
        workflow_runs: [{
          id: 123,
          status: 'completed',
          conclusion: 'success',
          updated_at: '2026-08-24T00:30:00.000Z'
        }]
      };
    }
  });
  assert.equal(loads, 1);
  assert.deepEqual(results.map((row) => row.component_id), ['vercel-web', 'prod-edge-probe']);
  assert.deepEqual(results.map((row) => row.status), ['healthy', 'healthy']);
  assert.deepEqual(results.map((row) => row.evidence.run_id), [123, 123]);
});

test('stale GitHub edge evidence is replaced by a healthy direct runtime probe', async () => {
  const secret = 'service-secret-that-must-not-be-recorded';
  let requestedUrl = null;
  const direct = await collectDirectEdgeProbeV1({
    url: 'https://example.supabase.co/',
    key: secret,
    now: NOW
  }, {
    request: async (url, options) => {
      requestedUrl = url;
      assert.equal(options.headers.apikey, secret);
      assert.equal(options.headers.Authorization, `Bearer ${secret}`);
      return { status: 200 };
    }
  });
  const [result] = applyDirectEdgeFallbackV1([{
    component_id: 'prod-edge-probe',
    provider: 'github_actions',
    status: 'stale',
    reason: 'Latest successful workflow is stale.',
    evidence: { run_id: 123 }
  }], direct);

  assert.equal(requestedUrl, 'https://example.supabase.co/functions/v1/wall_feed');
  assert.equal(result.status, 'healthy');
  assert.equal(result.provider, 'direct_supabase_edge_http');
  assert.equal(result.evidence.github_workflow.evidence.run_id, 123);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(secret));
});

test('healthy GitHub edge evidence remains authoritative without replacement', () => {
  const github = {
    component_id: 'prod-edge-probe',
    provider: 'github_actions',
    status: 'healthy',
    evidence: { run_id: 456 }
  };
  assert.deepEqual(applyDirectEdgeFallbackV1([github], {
    component_id: 'prod-edge-probe',
    provider: 'direct_supabase_edge_http',
    status: 'failed'
  }), [github]);
});

test('direct edge failures stay failed and retain GitHub evidence', () => {
  assert.equal(classifyDirectEdgeProbeV1({ httpStatus: 500 }).status, 'failed');
  assert.equal(classifyDirectEdgeProbeV1({ transportError: 'timeout' }).status, 'failed');
  const [result] = applyDirectEdgeFallbackV1([{
    component_id: 'prod-edge-probe',
    provider: 'github_actions',
    status: 'stale',
    evidence: { run_id: 789 }
  }], {
    component_id: 'prod-edge-probe',
    provider: 'direct_supabase_edge_http',
    status: 'failed',
    reason: 'Direct production edge probe returned HTTP 500.',
    evidence: { http_status: 500 }
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.evidence.github_workflow.evidence.run_id, 789);
});

test('missing direct edge credentials do not hide stale GitHub evidence', async () => {
  const direct = await collectDirectEdgeProbeV1({ url: null, key: null, now: NOW });
  const github = {
    component_id: 'prod-edge-probe',
    provider: 'github_actions',
    status: 'stale',
    evidence: { run_id: 987 }
  };
  assert.deepEqual(applyDirectEdgeFallbackV1([github], direct), [github]);
});

test('runtime provenance prefers the immutable release SHA over environment metadata', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grookai-control-plane-'));
  const releaseSha = '1'.repeat(40);
  try {
    await fs.writeFile(path.join(root, 'RELEASE_COMMIT_SHA'), `${releaseSha}\n`);
    assert.equal(await resolveRuntimeCommitShaV1(root, {
      GROOKAI_DEPLOYED_COMMIT_SHA: '2'.repeat(40),
      GITHUB_SHA: '3'.repeat(40)
    }), releaseSha);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
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
