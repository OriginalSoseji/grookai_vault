import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
export const SNAPSHOT_VERSION = 'PRODUCTION_SUPABASE_PROVIDER_SNAPSHOT_V1';
const API_ROOT = 'https://api.supabase.com';
const COMPUTE_ORDER = [
  'ci_micro',
  'ci_small',
  'ci_medium',
  'ci_large',
  'ci_xlarge',
  'ci_2xlarge',
  'ci_4xlarge',
  'ci_8xlarge',
  'ci_12xlarge',
  'ci_16xlarge'
];
const ALLOWED_PATHS = [
  /^\/v1\/projects\/[a-z0-9]{20}$/,
  /^\/v1\/projects\/[a-z0-9]{20}\/billing\/addons$/,
  /^\/v1\/projects\/[a-z0-9]{20}\/config\/disk$/,
  /^\/v1\/projects\/[a-z0-9]{20}\/config\/disk\/util$/,
  /^\/v1\/projects\/[a-z0-9]{20}\/config\/disk\/autoscale$/,
  /^\/v1\/projects\/[a-z0-9]{20}\/readonly$/,
  /^\/v1\/projects\/[a-z0-9]{20}\/database\/backups$/,
  /^\/v1\/organizations\/[a-z0-9]{20}\/entitlements$/
];

function text(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length ? normalized : null;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sha256(value) {
  const content = typeof value === 'string' ? value : JSON.stringify(stable(value));
  return crypto.createHash('sha256').update(content).digest('hex');
}

function parseArgs(argv) {
  const value = (name) => argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
  const projectRef = text(value('--project-ref') ?? process.env.SUPABASE_PROJECT_REF);
  const organizationId = text(value('--organization-id') ?? process.env.SUPABASE_ORGANIZATION_ID);
  if (!/^[a-z0-9]{20}$/.test(projectRef ?? '')) throw new Error('--project-ref must be a 20-character Supabase project ref');
  if (!/^[a-z0-9]{20}$/.test(organizationId ?? '')) throw new Error('--organization-id must be a 20-character Supabase organization id');
  return {
    projectRef,
    organizationId,
    expectedCompute: text(value('--expected-compute')) ?? 'ci_medium',
    outDir: path.resolve(value('--out-dir') ?? path.join('docs', 'audits', 'production_backend_launch_v1', 'supabase_provider'))
  };
}

function assertAllowedPath(apiPath) {
  if (!ALLOWED_PATHS.some((pattern) => pattern.test(apiPath))) {
    throw new Error(`Management API path is not allowlisted: ${apiPath}`);
  }
}

async function managementGet(apiPath) {
  assertAllowedPath(apiPath);
  const token = text(process.env.SUPABASE_ACCESS_TOKEN);
  if (token) {
    const response = await fetch(`${API_ROOT}${apiPath}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'grookai-production-readiness-v1'
      },
      signal: AbortSignal.timeout(45_000)
    });
    if (!response.ok) throw new Error(`Supabase Management API GET ${apiPath} returned HTTP ${response.status}`);
    return response.json();
  }

  if (process.platform !== 'win32') {
    throw new Error('SUPABASE_ACCESS_TOKEN is required outside Windows');
  }
  const script = path.resolve('scripts', 'ops', 'supabase_management_get_v1.ps1');
  const { stdout } = await execFileAsync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-Path', apiPath],
    { timeout: 60_000, maxBuffer: 16 * 1024 * 1024, windowsHide: true }
  );
  return JSON.parse(stdout);
}

function finding(severity, code, detail, evidence = {}) {
  return { severity, code, detail, evidence };
}

function rankCompute(value) {
  return COMPUTE_ORDER.indexOf(value);
}

function hoursBetween(later, earlier) {
  return (Date.parse(later) - Date.parse(earlier)) / 3_600_000;
}

export function evaluateSupabaseProviderSnapshotV1({
  project,
  addons,
  disk,
  diskUtil,
  autoscale,
  readonly,
  backups,
  expectedCompute = 'ci_medium',
  now = new Date()
}) {
  const findings = [];
  const compute = addons?.selected_addons?.find((row) => row.type === 'compute_instance')?.variant ?? null;
  const activeRank = rankCompute(compute?.id);
  const expectedRank = rankCompute(expectedCompute);
  if (project?.status !== 'ACTIVE_HEALTHY') {
    findings.push(finding('critical', 'project_not_active_healthy', `Project status is ${project?.status ?? 'unavailable'}.`));
  }
  if (activeRank < 0) {
    findings.push(finding('critical', 'compute_addon_unmeasured', 'The active compute add-on could not be identified.'));
  } else if (expectedRank < 0 || activeRank < expectedRank) {
    findings.push(finding('critical', 'compute_below_launch_minimum', `Active compute ${compute.id} is below required ${expectedCompute}.`, { active: compute.id, required: expectedCompute }));
  }
  if (readonly?.enabled === true || readonly?.override_enabled === true) {
    findings.push(finding('critical', 'project_readonly', 'The production project is in read-only mode.', { readonly }));
  }

  const fsSize = Number(diskUtil?.metrics?.fs_size_bytes);
  const fsUsed = Number(diskUtil?.metrics?.fs_used_bytes);
  const diskRatio = Number.isFinite(fsSize) && fsSize > 0 && Number.isFinite(fsUsed) ? fsUsed / fsSize : null;
  if (diskRatio === null) {
    findings.push(finding('unmeasured', 'disk_utilization_unmeasured', 'Provider filesystem utilization was not returned.'));
  } else if (diskRatio >= 0.9) {
    findings.push(finding('critical', 'disk_utilization_at_or_above_90_percent', 'Disk utilization has reached the provider autoscale threshold.', { ratio: diskRatio }));
  } else if (diskRatio >= 0.8) {
    findings.push(finding('high', 'disk_utilization_at_or_above_80_percent', 'Disk utilization exceeds the launch ceiling.', { ratio: diskRatio }));
  } else if (diskRatio >= 0.7) {
    findings.push(finding('medium', 'disk_utilization_at_or_above_70_percent', 'Disk utilization exceeds the launch target.', { ratio: diskRatio }));
  }

  const autoscaleConfigured = Number(autoscale?.growth_percent) > 0
    && Number(autoscale?.min_increment_gb) > 0
    && Number(autoscale?.max_size_gb) > Number(disk?.attributes?.size_gb ?? 0);
  if (!autoscaleConfigured) {
    findings.push(finding('unmeasured', 'disk_autoscale_not_provider_confirmed', 'The Management API did not confirm an effective disk autoscale policy.', { autoscale }));
  }

  const completedBackups = [...(backups?.backups ?? [])]
    .filter((row) => row.status === 'COMPLETED' && row.is_physical_backup === true)
    .sort((left, right) => Date.parse(right.inserted_at) - Date.parse(left.inserted_at));
  const latestBackup = completedBackups[0] ?? null;
  const latestBackupAgeHours = latestBackup ? hoursBetween(now.toISOString(), latestBackup.inserted_at) : null;
  if (!latestBackup) {
    findings.push(finding('critical', 'completed_physical_backup_missing', 'No completed physical backup was returned.'));
  } else if (!Number.isFinite(latestBackupAgeHours) || latestBackupAgeHours > 36) {
    findings.push(finding('high', 'latest_physical_backup_stale', 'The latest physical backup is older than 36 hours.', { age_hours: latestBackupAgeHours }));
  }
  if (backups?.walg_enabled !== true) findings.push(finding('high', 'walg_not_enabled', 'Managed WAL-G backups are not enabled.'));
  if (backups?.pitr_enabled !== true) findings.push(finding('medium', 'pitr_disabled', 'Point-in-time recovery is not enabled.'));

  const blockers = findings.filter((row) => ['critical', 'high'].includes(row.severity));
  const incomplete = findings.filter((row) => ['medium', 'unmeasured'].includes(row.severity));
  return {
    status: blockers.length ? 'blocked' : incomplete.length ? 'incomplete' : 'healthy',
    findings,
    metrics: {
      compute_id: compute?.id ?? null,
      compute_name: compute?.name ?? null,
      cpu_cores: compute?.meta?.cpu_cores ?? null,
      memory_gb: compute?.meta?.memory_gb ?? null,
      connections_direct: compute?.meta?.connections_direct ?? null,
      connections_pooler: compute?.meta?.connections_pooler ?? null,
      disk_size_gb: disk?.attributes?.size_gb ?? null,
      disk_used_bytes: Number.isFinite(fsUsed) ? fsUsed : null,
      disk_filesystem_bytes: Number.isFinite(fsSize) ? fsSize : null,
      disk_utilization: diskRatio,
      disk_autoscale_provider_confirmed: autoscaleConfigured,
      project_readonly: readonly?.enabled ?? null,
      completed_physical_backup_count: completedBackups.length,
      latest_physical_backup_at: latestBackup?.inserted_at ?? null,
      latest_physical_backup_age_hours: latestBackupAgeHours,
      pitr_enabled: backups?.pitr_enabled ?? null,
      walg_enabled: backups?.walg_enabled ?? null
    }
  };
}

function sanitizeEntitlements(payload) {
  const relevant = new Set([
    'instances.compute_update_available_sizes',
    'instances.read_replicas',
    'instances.disk_modifications',
    'instances.high_availability',
    'backup.retention_days',
    'backup.restore_to_new_project',
    'pitr.available_variants',
    'observability.dashboard_advanced_metrics'
  ]);
  return (payload?.entitlements ?? []).filter((row) => relevant.has(row?.feature?.key));
}

function markdown(report) {
  return [
    `# ${SNAPSHOT_VERSION}`,
    '',
    `- Observed: \`${report.observed_at}\``,
    `- Status: **${report.status.toUpperCase()}**`,
    `- Project: \`${report.project.id}\` (${report.project.status})`,
    `- Compute: **${report.metrics.compute_name ?? 'unmeasured'}** (\`${report.metrics.compute_id ?? 'unmeasured'}\`)`,
    `- Memory: \`${report.metrics.memory_gb ?? 'unmeasured'} GB\``,
    `- Direct connections: \`${report.metrics.connections_direct ?? 'unmeasured'}\``,
    `- Disk: \`${report.metrics.disk_size_gb ?? 'unmeasured'} GB\`, ${(100 * (report.metrics.disk_utilization ?? 0)).toFixed(2)}% used`,
    `- Disk autoscale provider-confirmed: \`${report.metrics.disk_autoscale_provider_confirmed}\``,
    `- Read-only: \`${report.metrics.project_readonly}\``,
    `- Completed physical backups: \`${report.metrics.completed_physical_backup_count}\``,
    '',
    '## Findings',
    '',
    ...(report.findings.length ? report.findings.map((row) => `- **${row.severity.toUpperCase()} ${row.code}:** ${row.detail}`) : ['- none']),
    '',
    '## Boundaries',
    '',
    '- Supabase Management API methods: GET only',
    '- Billing or add-on changes: none',
    '- Database writes: none',
    '- Storage writes: none',
    '- Restore started: no',
    ''
  ].join('\n');
}

export async function runSupabaseProviderSnapshotV1({ argv = process.argv.slice(2), now = new Date() } = {}) {
  const args = parseArgs(argv);
  const paths = {
    project: `/v1/projects/${args.projectRef}`,
    addons: `/v1/projects/${args.projectRef}/billing/addons`,
    disk: `/v1/projects/${args.projectRef}/config/disk`,
    disk_util: `/v1/projects/${args.projectRef}/config/disk/util`,
    disk_autoscale: `/v1/projects/${args.projectRef}/config/disk/autoscale`,
    readonly: `/v1/projects/${args.projectRef}/readonly`,
    entitlements: `/v1/organizations/${args.organizationId}/entitlements`,
    backups: `/v1/projects/${args.projectRef}/database/backups`
  };
  const raw = {};
  for (const [name, apiPath] of Object.entries(paths)) raw[name] = await managementGet(apiPath);
  const evaluation = evaluateSupabaseProviderSnapshotV1({
    project: raw.project,
    addons: raw.addons,
    disk: raw.disk,
    diskUtil: raw.disk_util,
    autoscale: raw.disk_autoscale,
    readonly: raw.readonly,
    backups: raw.backups,
    expectedCompute: args.expectedCompute,
    now
  });
  const selectedAddons = (raw.addons?.selected_addons ?? []).map((row) => ({
    type: row.type,
    variant: {
      id: row.variant?.id ?? null,
      name: row.variant?.name ?? null,
      meta: row.variant?.meta ?? null
    }
  }));
  const body = {
    schema_version: SNAPSHOT_VERSION,
    observed_at: now.toISOString(),
    project: {
      id: raw.project?.id ?? args.projectRef,
      organization_id: raw.project?.organization_id ?? args.organizationId,
      name: raw.project?.name ?? null,
      region: raw.project?.region ?? null,
      status: raw.project?.status ?? null
    },
    expected_compute: args.expectedCompute,
    ...evaluation,
    provider_evidence: {
      selected_addons: selectedAddons,
      disk: raw.disk,
      disk_utilization: raw.disk_util,
      disk_autoscale: raw.disk_autoscale,
      readonly: raw.readonly,
      backups: raw.backups,
      relevant_entitlements: sanitizeEntitlements(raw.entitlements)
    },
    boundaries: {
      management_api_get_only: true,
      project_configuration_changes: false,
      billing_changes: false,
      database_writes: false,
      storage_writes: false,
      restore_started: false
    }
  };
  const report = { ...body, report_fingerprint_sha256: sha256(body) };
  await fs.mkdir(args.outDir, { recursive: true });
  const jsonPath = path.join(args.outDir, 'production_supabase_provider_snapshot_v1.json');
  const markdownPath = path.join(args.outDir, 'PRODUCTION_SUPABASE_PROVIDER_SNAPSHOT_V1.md');
  const jsonContent = `${JSON.stringify(report, null, 2)}\n`;
  await Promise.all([
    fs.writeFile(jsonPath, jsonContent),
    fs.writeFile(`${jsonPath}.sha256`, `${sha256(jsonContent)}  ${path.basename(jsonPath)}\n`),
    fs.writeFile(markdownPath, markdown(report))
  ]);
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    metrics: report.metrics,
    report_fingerprint_sha256: report.report_fingerprint_sha256,
    artifacts: { json: jsonPath, markdown: markdownPath }
  }, null, 2)}\n`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runSupabaseProviderSnapshotV1().catch((error) => {
    console.error(`[production-supabase-provider-snapshot] ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
