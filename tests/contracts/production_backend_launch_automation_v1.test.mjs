import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  evaluateSupabaseProviderSnapshotV1
} from '../../scripts/audits/production_supabase_provider_snapshot_v1.mjs';
import {
  calculateCpuUtilizationV1,
  derivePointMetricsV1,
  evaluateMetricsSeriesV1,
  parsePrometheusV1
} from '../../scripts/audits/production_supabase_metrics_snapshot_v1.mjs';
import {
  evaluateBackendLaunchAutomationV1,
  reconcileExternalControlPlaneEvidenceV1,
  reconcileDiskAutoscaleEvidenceV1
} from '../../scripts/audits/production_backend_launch_automation_v1.mjs';
import {
  summarizeControlPlaneComponentsV1
} from '../../scripts/audits/production_live_control_plane_v1.mjs';

const NOW = new Date('2026-08-24T20:00:00.000Z');

function providerInput(overrides = {}) {
  return {
    project: { id: 'ycdxbpibncqcchqiihfz', status: 'ACTIVE_HEALTHY' },
    addons: {
      selected_addons: [{
        type: 'compute_instance',
        variant: { id: 'ci_medium', name: 'Medium', meta: { cpu_cores: 2, memory_gb: 4, connections_direct: 120, connections_pooler: 600 } }
      }]
    },
    disk: { attributes: { size_gb: 303 } },
    diskUtil: { metrics: { fs_size_bytes: 1000, fs_used_bytes: 650, fs_avail_bytes: 350 } },
    autoscale: { growth_percent: 50, min_increment_gb: 4, max_size_gb: 60000 },
    readonly: { enabled: false, override_enabled: false },
    backups: {
      pitr_enabled: true,
      walg_enabled: true,
      backups: Array.from({ length: 7 }, (_, index) => ({
        is_physical_backup: true,
        status: 'COMPLETED',
        inserted_at: new Date(NOW.getTime() - index * 86_400_000).toISOString()
      }))
    },
    expectedCompute: 'ci_medium',
    now: NOW,
    ...overrides
  };
}

test('provider snapshot accepts Medium and blocks compute below Medium', () => {
  const medium = evaluateSupabaseProviderSnapshotV1(providerInput());
  const smallInput = providerInput();
  smallInput.addons.selected_addons[0].variant.id = 'ci_small';
  smallInput.addons.selected_addons[0].variant.name = 'Small';
  const small = evaluateSupabaseProviderSnapshotV1(smallInput);
  assert.equal(medium.status, 'healthy');
  assert.equal(small.status, 'blocked');
  assert.ok(small.findings.some((row) => row.code === 'compute_below_launch_minimum'));
});

test('provider snapshot blocks read-only mode and disk at 80 percent', () => {
  const readonly = evaluateSupabaseProviderSnapshotV1(providerInput({ readonly: { enabled: true, override_enabled: false } }));
  const disk = evaluateSupabaseProviderSnapshotV1(providerInput({ diskUtil: { metrics: { fs_size_bytes: 1000, fs_used_bytes: 800 } } }));
  assert.equal(readonly.status, 'blocked');
  assert.equal(disk.status, 'blocked');
});

test('provider snapshot keeps 70 percent disk and absent autoscale incomplete', () => {
  const result = evaluateSupabaseProviderSnapshotV1(providerInput({
    diskUtil: { metrics: { fs_size_bytes: 1000, fs_used_bytes: 720 } },
    autoscale: { growth_percent: null, min_increment_gb: null, max_size_gb: null }
  }));
  assert.equal(result.status, 'incomplete');
  assert.equal(result.metrics.disk_autoscale_provider_confirmed, false);
  assert.ok(result.findings.some((row) => row.code === 'disk_autoscale_not_provider_confirmed'));
});

test('Prometheus parser derives memory, disk, and interval CPU without persisting secrets', () => {
  const first = parsePrometheusV1(`
node_cpu_seconds_total{service_type="db",cpu="0",mode="idle"} 80
node_cpu_seconds_total{service_type="db",cpu="0",mode="user"} 20
node_memory_MemTotal_bytes{service_type="db"} 1000
node_memory_MemAvailable_bytes{service_type="db"} 600
node_filesystem_size_bytes{service_type="db",mountpoint="/data"} 1000
node_filesystem_avail_bytes{service_type="db",mountpoint="/data"} 300
node_cpu_online{service_type="db",cpu="0"} 1
node_load15{service_type="db"} 0.5
`);
  const second = parsePrometheusV1(`
node_cpu_seconds_total{service_type="db",cpu="0",mode="idle"} 88
node_cpu_seconds_total{service_type="db",cpu="0",mode="user"} 22
`);
  const point = derivePointMetricsV1(first);
  assert.equal(point.memory_utilization, 0.4);
  assert.equal(point.data_filesystem_utilization, 0.7);
  assert.ok(Math.abs(calculateCpuUtilizationV1(first, second) - 0.2) < 1e-9);
});

test('metrics policy blocks a 99 percent CPU interval', () => {
  const result = evaluateMetricsSeriesV1([
    { memory_utilization: 0.5, online_cpu_count: 2, load_15m: 0.2 },
    { cpu_utilization: 0.99, memory_utilization: 0.5, online_cpu_count: 2, load_15m: 0.2 }
  ]);
  assert.equal(result.status, 'blocked');
  assert.ok(result.findings.some((row) => row.code === 'cpu_utilization_at_or_above_90_percent'));
});

function launchInput(overrides = {}) {
  return {
    provider: { status: 'healthy', metrics: { disk_size_gb: 303, disk_utilization: 0.65, disk_autoscale_provider_confirmed: true, project_readonly: false } },
    metrics: { status: 'healthy', metrics: { cpu_utilization_maximum: 0.4, memory_utilization_maximum: 0.5 } },
    database: { status: 'healthy' },
    managed: { status: 'healthy', metrics: { restore_exercise_verified: true } },
    controlPlane: { overall_status: 'healthy', summary: { healthy: 18 } },
    loadEvidence: { status: 'passed', failed_requests: 0, rate_limit_count: 0, error_rate: 0 },
    billingEvidence: {
      observed_at: NOW.toISOString(),
      quota_restriction_notice_active: false,
      spend_cap_enabled: false,
      uncached_egress_gb: 100,
      cached_egress_gb: 100
    },
    sameCandidateEvidence: { status: 'passed' },
    gitState: { tracked_worktree_clean: true },
    now: NOW,
    ...overrides
  };
}

test('active quota restriction and Spend Cap block launch', () => {
  const input = launchInput();
  input.billingEvidence.quota_restriction_notice_active = true;
  input.billingEvidence.spend_cap_enabled = true;
  const result = evaluateBackendLaunchAutomationV1(input);
  assert.equal(result.status, 'blocked');
  assert.equal(result.launch_allowed, false);
  assert.ok(result.findings.some((row) => row.code === 'organization_quota_restriction_notice_active'));
  assert.ok(result.findings.some((row) => row.code === 'spend_cap_blocks_disk_autoscale'));
});

test('null billing egress stays unmeasured instead of coercing to zero', () => {
  const input = launchInput();
  input.billingEvidence.uncached_egress_gb = null;
  input.billingEvidence.cached_egress_gb = null;
  const result = evaluateBackendLaunchAutomationV1(input);
  assert.ok(result.findings.some((row) => row.code === 'billing_egress_exact_values_unmeasured'));
  assert.equal(result.launch_allowed, false);
});

test('missing billing, restore, and client evidence fails closed as incomplete', () => {
  const result = evaluateBackendLaunchAutomationV1(launchInput({
    billingEvidence: null,
    managed: { status: 'incomplete', metrics: { restore_exercise_verified: false } },
    sameCandidateEvidence: null
  }));
  assert.equal(result.status, 'incomplete');
  assert.equal(result.launch_allowed, false);
});

test('fresh signed-in autoscale evidence reconciles omitted Management API fields', () => {
  const input = launchInput();
  input.provider.metrics.disk_autoscale_provider_confirmed = false;
  input.provider.provider_evidence = {
    disk_autoscale: { growth_percent: null, min_increment_gb: null, max_size_gb: 600 }
  };
  input.billingEvidence = {
    ...input.billingEvidence,
    source: 'signed_in_supabase_dashboard_live_verification',
    disk_autoscale: {
      growth_percent: 50,
      minimum_increment_gb: 4,
      maximum_disk_size_gb: 600
    }
  };
  const reconciliation = reconcileDiskAutoscaleEvidenceV1(input);
  const result = evaluateBackendLaunchAutomationV1(input);
  assert.equal(reconciliation.confirmed, true);
  assert.equal(result.evidence_reconciliation.disk_autoscale.confirmed, true);
  assert.ok(!result.findings.some((row) => row.code === 'disk_autoscale_not_confirmed'));
});

test('autoscale evidence fails closed when dashboard and Management API maxima differ', () => {
  const input = launchInput();
  input.provider.metrics.disk_autoscale_provider_confirmed = false;
  input.provider.provider_evidence = {
    disk_autoscale: { growth_percent: null, min_increment_gb: null, max_size_gb: 600 }
  };
  input.billingEvidence = {
    ...input.billingEvidence,
    source: 'signed_in_supabase_dashboard_live_verification',
    disk_autoscale: {
      growth_percent: 50,
      minimum_increment_gb: 4,
      maximum_disk_size_gb: 1000
    }
  };
  const result = evaluateBackendLaunchAutomationV1(input);
  assert.ok(result.findings.some((row) => row.code === 'disk_autoscale_not_confirmed'));
  assert.equal(result.launch_allowed, false);
});

test('background unmeasured components remain visible without blocking launch-critical health', () => {
  const topology = {
    components: [
      { id: 'supabase-core', workload_class: 'A', criticality: 'launch_critical' },
      { id: 'japanese-master-index', workload_class: 'C', criticality: 'background' }
    ]
  };
  const controlPlane = summarizeControlPlaneComponentsV1([
    { component_id: 'supabase-core', status: 'healthy' },
    { component_id: 'japanese-master-index', status: 'unmeasured' }
  ], topology);
  assert.equal(controlPlane.overall_status, 'incomplete');
  assert.equal(controlPlane.launch_status, 'healthy');
  assert.equal(controlPlane.launch_summary.unmeasured, 0);
  const result = evaluateBackendLaunchAutomationV1(launchInput({ controlPlane }));
  assert.ok(!result.findings.some((row) => row.code === 'control_plane_incomplete'));
});

test('unmeasured launch-critical control-plane evidence still fails closed', () => {
  const topology = {
    components: [{ id: 'scanner-identity', workload_class: 'A', criticality: 'launch_critical' }]
  };
  const controlPlane = summarizeControlPlaneComponentsV1([
    { component_id: 'scanner-identity', status: 'unmeasured' }
  ], topology);
  const result = evaluateBackendLaunchAutomationV1(launchInput({ controlPlane }));
  assert.equal(controlPlane.launch_status, 'incomplete');
  assert.ok(result.findings.some((row) => row.code === 'control_plane_incomplete'));
});

test('fresh external control-plane evidence is reconciled against local topology', () => {
  const topology = {
    components: [
      { id: 'scanner-identity', workload_class: 'A', criticality: 'launch_critical' },
      { id: 'japanese-master-index', workload_class: 'C', criticality: 'background' }
    ]
  };
  const report = {
    schema_version: 'GROOKAI_PRODUCTION_LIVE_CONTROL_PLANE_V1',
    observed_at: new Date(NOW.getTime() - 5 * 60_000).toISOString(),
    commit_sha: 'abc123',
    overall_status: 'incomplete',
    summary: { healthy: 1, degraded: 0, failed: 0, stale: 0, unmeasured: 1 },
    components: [
      { component_id: 'scanner-identity', status: 'healthy' },
      { component_id: 'japanese-master-index', status: 'unmeasured' }
    ]
  };
  const reconciled = reconcileExternalControlPlaneEvidenceV1({ report, topology, now: NOW });
  assert.equal(reconciled.launch_status, 'healthy');
  assert.equal(reconciled.launch_summary.unmeasured, 0);
  assert.equal(reconciled.external_evidence_validation.status, 'passed');
});

test('stale or structurally inconsistent external control-plane evidence fails closed', () => {
  const topology = { components: [{ id: 'scanner-identity', workload_class: 'A', criticality: 'launch_critical' }] };
  const stale = {
    schema_version: 'GROOKAI_PRODUCTION_LIVE_CONTROL_PLANE_V1',
    observed_at: new Date(NOW.getTime() - 31 * 60_000).toISOString(),
    summary: { healthy: 1, degraded: 0, failed: 0, stale: 0, unmeasured: 0 },
    components: [{ component_id: 'scanner-identity', status: 'healthy' }]
  };
  assert.throws(
    () => reconcileExternalControlPlaneEvidenceV1({ report: stale, topology, now: NOW }),
    /not fresh/
  );
  const duplicate = {
    ...stale,
    observed_at: NOW.toISOString(),
    summary: { healthy: 2, degraded: 0, failed: 0, stale: 0, unmeasured: 0 },
    components: [
      { component_id: 'scanner-identity', status: 'healthy' },
      { component_id: 'scanner-identity', status: 'healthy' }
    ]
  };
  assert.throws(
    () => reconcileExternalControlPlaneEvidenceV1({ report: duplicate, topology, now: NOW }),
    /duplicate component IDs/
  );
});

test('clean evidence allows the launch gate', () => {
  const result = evaluateBackendLaunchAutomationV1(launchInput());
  assert.equal(result.status, 'ready_for_launch_gate');
  assert.equal(result.launch_allowed, true);
  assert.equal(result.findings.length, 0);
});

test('production topology governs every explicit control-plane component', () => {
  const topology = JSON.parse(fs.readFileSync('backend/operations/production_topology_v1.json', 'utf8'));
  const topologyIds = new Set(topology.components.map((component) => component.id));
  const source = fs.readFileSync('scripts/audits/production_live_control_plane_v1.mjs', 'utf8');
  const explicitComponentIds = [...source.matchAll(/component_id:\s*'([^']+)'/g)].map((match) => match[1]);
  const missing = [...new Set(explicitComponentIds)].filter((componentId) => !topologyIds.has(componentId));
  assert.deepEqual(missing, []);
  assert.equal(topology.components.find((component) => component.id === 'tcgplayer-source-sync')?.criticality, 'launch_critical');
});

test('automation sources enforce read-only provider methods and do not persist credentials', () => {
  const provider = fs.readFileSync('scripts/audits/production_supabase_provider_snapshot_v1.mjs', 'utf8');
  const metrics = fs.readFileSync('scripts/audits/production_supabase_metrics_snapshot_v1.mjs', 'utf8');
  const adapter = fs.readFileSync('scripts/ops/supabase_management_get_v1.ps1', 'utf8');
  for (const source of [provider, metrics, adapter]) {
    assert.doesNotMatch(source, /fs\.writeFile\([^\n]*(?:SUPABASE_ACCESS_TOKEN|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY)/);
  }
  assert.match(provider, /method: 'GET'/);
  assert.match(metrics, /method: 'GET'/);
  assert.match(adapter, /-Method Get/);
  assert.doesNotMatch(adapter, /-Method (?:Post|Patch|Put|Delete)/i);
});

test('scheduled readiness and founder monitors upload artifacts without source pushes', () => {
  const readiness = fs.readFileSync('.github/workflows/production-backend-launch-readiness.yml', 'utf8');
  const founder = fs.readFileSync('.github/workflows/founder-ops-dashboard.yml', 'utf8');
  assert.match(readiness, /permissions:\s+contents: read/);
  assert.match(readiness, /actions\/upload-artifact@v4/);
  assert.match(readiness, /--require-ready/);
  assert.doesNotMatch(readiness, /git (?:commit|push)/);
  assert.match(founder, /permissions:\s+contents: read/);
  assert.match(founder, /actions\/upload-artifact@v4/);
  assert.doesNotMatch(founder, /git (?:commit|push)/);
});
