import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCapacityAudit,
  renderCapacityAuditMarkdown,
} from '../../scripts/audits/supabase_production_capacity_audit_v1.mjs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const auditSource = readFileSync(
  path.join(ROOT, 'scripts', 'audits', 'supabase_production_capacity_audit_v1.mjs'),
  'utf8',
);

function healthyPayloads() {
  return {
    project: {
      id: 'ycdxbpibncqcchqiihfz',
      organization_id: 'rksadomjkuoxvrbhsmxu',
      name: "OriginalSoseji's Project",
      region: 'us-east-2',
      status: 'ACTIVE_HEALTHY',
      database: { postgres_engine: '17', version: '17.4' },
    },
    addons: {
      selected_addons: [
        { type: 'compute_instance', variant: { identifier: 'ci_medium', name: 'Medium' } },
      ],
    },
    disk: {
      attributes: { size_gb: 303, type: 'gp3', iops: 3000, throughput_mbps: 125 },
      last_modified_at: '2026-08-27T00:00:00Z',
    },
    diskUtil: {
      timestamp: '2026-08-29T00:00:00Z',
      metrics: { fs_size_bytes: 303_000, fs_used_bytes: 218_160, fs_avail_bytes: 84_840 },
    },
    autoscale: { growth_percent: 50, min_increment_gb: 4, max_size_gb: 600 },
    health: [
      { name: 'auth', healthy: true },
      { name: 'rest', healthy: true },
      { name: 'db', healthy: true },
    ],
  };
}

const options = {
  projectRef: 'ycdxbpibncqcchqiihfz',
  organizationSlug: 'rksadomjkuoxvrbhsmxu',
  collectedAt: '2026-08-29T00:00:00.000Z',
};

test('healthy purchased production capacity passes every gate', () => {
  const report = buildCapacityAudit(healthyPayloads(), options);
  assert.equal(report.summary.status, 'PASS');
  assert.equal(report.summary.failed_assertions, 0);
  assert.equal(report.read_only, true);
  assert.equal(report.compute.variant_id, 'ci_medium');
  assert.equal(report.disk.utilization.utilization_percent, 72);
});

test('wrong project identity fails closed', () => {
  const payloads = healthyPayloads();
  payloads.project.id = 'restore-drill-project';
  const report = buildCapacityAudit(payloads, options);
  assert.equal(report.summary.status, 'FAIL');
  assert.ok(report.summary.failed_ids.includes('production_project_identity'));
});

test('capacity regression is reported without mutating payloads', () => {
  const payloads = healthyPayloads();
  payloads.disk.attributes.size_gb = 100;
  payloads.autoscale.max_size_gb = 500;
  payloads.health[0].healthy = false;
  const before = JSON.stringify(payloads);
  const report = buildCapacityAudit(payloads, options);
  assert.equal(report.summary.status, 'FAIL');
  assert.deepEqual(
    report.summary.failed_ids.sort(),
    ['disk_autoscale_configuration', 'disk_configuration', 'services_healthy'].sort(),
  );
  assert.equal(JSON.stringify(payloads), before);
});

test('markdown makes the non-observable Spend Cap boundary explicit', () => {
  const markdown = renderCapacityAuditMarkdown(buildCapacityAudit(healthyPayloads(), options));
  assert.match(markdown, /Spend Cap state is not exposed/);
  assert.match(markdown, /No database or control-plane mutation was performed/);
});

test('health request omits the Management API timeout serialization trap', () => {
  assert.match(auditSource, /health\?services=auth,rest,realtime,storage,db/);
  assert.doesNotMatch(auditSource, /health\?[^`]*timeout_ms=/);
});
