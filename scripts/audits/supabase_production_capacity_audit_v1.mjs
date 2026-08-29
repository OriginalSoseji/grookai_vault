import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const API_BASE = 'https://api.supabase.com';
const SCHEMA_VERSION = 'SUPABASE_PRODUCTION_CAPACITY_AUDIT_V1';

function argValue(argv, name, fallback = null) {
  const prefix = `--${name}=`;
  const inline = argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = argv.indexOf(`--${name}`);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function compactServiceHealth(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.services ?? payload?.result ?? [];
  return rows.map((row) => ({
    name: row.name ?? row.service ?? row.id ?? 'unknown',
    status: row.status ?? null,
    healthy: typeof row.healthy === 'boolean' ? row.healthy : null,
    error: row.error ? String(row.error).slice(0, 300) : null,
  }));
}

function serviceIsHealthy(row) {
  if (row.healthy === true) return true;
  const status = String(row.status ?? '').toLowerCase();
  return ['healthy', 'active_healthy', 'operational', 'ok'].includes(status);
}

function selectedCompute(addons) {
  const rows = Array.isArray(addons?.selected_addons) ? addons.selected_addons : [];
  const selection = rows.find((row) => {
    const type = String(row.type ?? row.addon_type ?? '').toLowerCase();
    const id = String(
      row.variant?.identifier ?? row.variant?.id ?? row.identifier ?? row.id ?? '',
    ).toLowerCase();
    return type.includes('compute') || id.startsWith('ci_');
  });
  if (!selection) return null;
  return {
    type: selection.type ?? selection.addon_type ?? null,
    variant_id:
      selection.variant?.identifier
      ?? selection.variant?.id
      ?? selection.identifier
      ?? selection.id
      ?? null,
    variant_name: selection.variant?.name ?? selection.name ?? null,
  };
}

export function buildCapacityAudit(payloads, options = {}) {
  const expected = {
    projectRef: options.projectRef,
    organizationSlug: options.organizationSlug ?? null,
    computeVariant: options.computeVariant ?? 'ci_medium',
    minDiskGb: numberOrNull(options.minDiskGb) ?? 303,
    diskType: options.diskType ?? 'gp3',
    minIops: numberOrNull(options.minIops) ?? 3000,
    minThroughputMibps: numberOrNull(options.minThroughputMibps) ?? 125,
    growthPercent: numberOrNull(options.growthPercent) ?? 50,
    maxDiskGb: numberOrNull(options.maxDiskGb) ?? 600,
    maxUtilizationPercent: numberOrNull(options.maxUtilizationPercent) ?? 85,
  };

  const project = payloads.project ?? {};
  const projectRef = project.ref ?? project.id ?? null;
  const organizationIdentity =
    project.organization_slug ?? project.organization_id ?? null;
  const compute = selectedCompute(payloads.addons);
  const disk = payloads.disk?.attributes ?? {};
  const diskMetrics = payloads.diskUtil?.metrics ?? {};
  const autoscale = payloads.autoscale ?? {};
  const health = compactServiceHealth(payloads.health);
  const rawAutoscaleGrowthPercent = numberOrNull(autoscale.growth_percent);
  const effectiveAutoscaleGrowthPercent =
    rawAutoscaleGrowthPercent ?? expected.growthPercent;
  const autoscaleGrowthSource = rawAutoscaleGrowthPercent === null
    ? 'supabase_paid_plan_default'
    : 'project_custom_config';

  const sizeBytes = numberOrNull(diskMetrics.fs_size_bytes);
  const usedBytes = numberOrNull(diskMetrics.fs_used_bytes);
  const availableBytes = numberOrNull(diskMetrics.fs_avail_bytes);
  const utilizationPercent = sizeBytes && usedBytes !== null
    ? Number(((usedBytes / sizeBytes) * 100).toFixed(2))
    : null;

  const assertions = [
    {
      id: 'production_project_identity',
      pass: projectRef === expected.projectRef,
      observed: projectRef,
      expected: expected.projectRef,
      severity: 'critical',
    },
    {
      id: 'organization_identity',
      pass: !expected.organizationSlug || organizationIdentity === expected.organizationSlug,
      observed: organizationIdentity,
      expected: expected.organizationSlug,
      severity: 'critical',
    },
    {
      id: 'project_active_healthy',
      pass: ['ACTIVE_HEALTHY', 'ACTIVE'].includes(String(project.status ?? '').toUpperCase()),
      observed: project.status ?? null,
      expected: 'ACTIVE_HEALTHY or ACTIVE',
      severity: 'critical',
    },
    {
      id: 'compute_medium_or_larger',
      pass: String(compute?.variant_id ?? '').toLowerCase() === expected.computeVariant.toLowerCase(),
      observed: compute?.variant_id ?? null,
      expected: expected.computeVariant,
      severity: 'critical',
    },
    {
      id: 'disk_configuration',
      pass: numberOrNull(disk.size_gb) >= expected.minDiskGb
        && String(disk.type ?? '').toLowerCase() === expected.diskType.toLowerCase()
        && numberOrNull(disk.iops) >= expected.minIops
        && numberOrNull(disk.throughput_mbps ?? disk.throughput_mibps)
          >= expected.minThroughputMibps,
      observed: {
        size_gb: numberOrNull(disk.size_gb),
        type: disk.type ?? null,
        iops: numberOrNull(disk.iops),
        throughput_mbps: numberOrNull(disk.throughput_mbps ?? disk.throughput_mibps),
      },
      expected: {
        min_size_gb: expected.minDiskGb,
        type: expected.diskType,
        min_iops: expected.minIops,
        min_throughput_mibps: expected.minThroughputMibps,
      },
      severity: 'critical',
    },
    {
      id: 'disk_autoscale_configuration',
      pass: effectiveAutoscaleGrowthPercent === expected.growthPercent
        && numberOrNull(autoscale.max_size_gb) >= expected.maxDiskGb,
      observed: {
        raw_growth_percent: rawAutoscaleGrowthPercent,
        effective_growth_percent: effectiveAutoscaleGrowthPercent,
        growth_source: autoscaleGrowthSource,
        min_increment_gb: numberOrNull(autoscale.min_increment_gb),
        max_size_gb: numberOrNull(autoscale.max_size_gb),
      },
      expected: {
        growth_percent: expected.growthPercent,
        min_max_size_gb: expected.maxDiskGb,
      },
      severity: 'critical',
    },
    {
      id: 'disk_utilization_headroom',
      pass: utilizationPercent !== null && utilizationPercent < expected.maxUtilizationPercent,
      observed: utilizationPercent,
      expected: `< ${expected.maxUtilizationPercent}%`,
      severity: 'critical',
    },
    {
      id: 'services_healthy',
      pass: health.length > 0 && health.every(serviceIsHealthy),
      observed: health,
      expected: 'all requested services healthy',
      severity: 'critical',
    },
  ];

  const failed = assertions.filter((assertion) => !assertion.pass);
  return {
    schema_version: SCHEMA_VERSION,
    collected_at: options.collectedAt ?? new Date().toISOString(),
    read_only: true,
    project: {
      ref: projectRef,
      organization_id: organizationIdentity,
      name: project.name ?? null,
      region: project.region ?? null,
      status: project.status ?? null,
      postgres_engine: project.database?.postgres_engine ?? null,
      database_version: project.database?.version ?? null,
    },
    compute,
    disk: {
      size_gb: numberOrNull(disk.size_gb),
      type: disk.type ?? null,
      iops: numberOrNull(disk.iops),
      throughput_mbps: numberOrNull(disk.throughput_mbps ?? disk.throughput_mibps),
      last_modified_at: payloads.disk?.last_modified_at ?? null,
      utilization: {
        observed_at: payloads.diskUtil?.timestamp ?? null,
        size_bytes: sizeBytes,
        used_bytes: usedBytes,
        available_bytes: availableBytes,
        utilization_percent: utilizationPercent,
      },
      autoscale: {
        raw_growth_percent: rawAutoscaleGrowthPercent,
        effective_growth_percent: effectiveAutoscaleGrowthPercent,
        growth_source: autoscaleGrowthSource,
        min_increment_gb: numberOrNull(autoscale.min_increment_gb),
        max_size_gb: numberOrNull(autoscale.max_size_gb),
      },
    },
    service_health: health,
    spend_cap: {
      status: 'not_exposed_by_supported_management_api',
      verification_required: 'Supabase organization billing console or invoice',
    },
    assertions,
    summary: {
      status: failed.length === 0 ? 'PASS' : 'FAIL',
      total_assertions: assertions.length,
      failed_assertions: failed.length,
      failed_ids: failed.map((assertion) => assertion.id),
    },
  };
}

export function renderCapacityAuditMarkdown(report) {
  const lines = [
    '# Supabase Production Capacity Audit',
    '',
    `- Collected: \`${report.collected_at}\``,
    `- Project: \`${report.project.ref}\``,
    `- Status: **${report.summary.status}**`,
    `- Read only: \`${report.read_only}\``,
    `- Compute: \`${report.compute?.variant_id ?? 'unknown'}\``,
    `- Disk: \`${report.disk.size_gb ?? 'unknown'} GB ${report.disk.type ?? ''}\``,
    `- Disk used: \`${report.disk.utilization.utilization_percent ?? 'unknown'}%\``,
    `- Autoscale growth: \`${report.disk.autoscale.effective_growth_percent ?? 'unknown'}% (${report.disk.autoscale.growth_source ?? 'unknown'})\``,
    `- Autoscale maximum: \`${report.disk.autoscale.max_size_gb ?? 'unknown'} GB\``,
    '',
    '## Assertions',
    '',
    '| Gate | Result |',
    '|---|---|',
    ...report.assertions.map((assertion) => `| \`${assertion.id}\` | ${assertion.pass ? 'PASS' : 'FAIL'} |`),
    '',
    '## Spend Cap',
    '',
    'Spend Cap state is not exposed by the supported project Management API endpoints. Verify it in the organization billing console or invoice; this audit does not infer it.',
    '',
    'No database or control-plane mutation was performed.',
  ];
  return `${lines.join('\n')}\n`;
}

async function fetchJson(endpoint, accessToken) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase Management API GET ${endpoint} failed (${response.status}): ${body.slice(0, 500)}`);
  }
  return body ? JSON.parse(body) : {};
}

async function main() {
  const argv = process.argv.slice(2);
  const projectRef = argValue(argv, 'project-ref', process.env.SUPABASE_PROJECT_REF);
  const organizationSlug = argValue(argv, 'organization-slug', process.env.SUPABASE_ORGANIZATION_SLUG);
  const outputDir = path.resolve(argValue(argv, 'output-dir', 'audit-artifacts/supabase-production-capacity'));
  const strict = argv.includes('--strict');
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (!projectRef) throw new Error('SUPABASE_PROJECT_REF or --project-ref is required.');
  if (!accessToken) throw new Error('SUPABASE_ACCESS_TOKEN is required.');

  const encodedRef = encodeURIComponent(projectRef);
  const [project, addons, disk, diskUtil, autoscale, health] = await Promise.all([
    fetchJson(`/v1/projects/${encodedRef}`, accessToken),
    fetchJson(`/v1/projects/${encodedRef}/billing/addons`, accessToken),
    fetchJson(`/v1/projects/${encodedRef}/config/disk`, accessToken),
    fetchJson(`/v1/projects/${encodedRef}/config/disk/util`, accessToken),
    fetchJson(`/v1/projects/${encodedRef}/config/disk/autoscale`, accessToken),
    fetchJson(`/v1/projects/${encodedRef}/health?services=auth,rest,realtime,storage,db`, accessToken),
  ]);

  const report = buildCapacityAudit(
    { project, addons, disk, diskUtil, autoscale, health },
    { projectRef, organizationSlug },
  );
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, 'capacity_audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(outputDir, 'SUMMARY.md'), renderCapacityAuditMarkdown(report), 'utf8');
  process.stdout.write(`${JSON.stringify(report.summary)}\n`);
  if (strict && report.summary.status !== 'PASS') process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
