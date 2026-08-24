import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

import '../../backend/env.mjs';
import { TOPOLOGY_PATH } from './production_backend_launch_baseline_v1.mjs';
import { summarizeControlPlaneComponentsV1 } from './production_live_control_plane_v1.mjs';

const execFileAsync = promisify(execFile);
export const AUTOMATION_VERSION = 'PRODUCTION_BACKEND_LAUNCH_AUTOMATION_V1';
const DEFAULT_PROJECT_REF = 'ycdxbpibncqcchqiihfz';
const DEFAULT_ORGANIZATION_ID = 'rksadomjkuoxvrbhsmxu';

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

function stamp(date) {
  return date.toISOString().replaceAll(':', '-').replaceAll('.', '-');
}

function parseArgs(argv, now) {
  const value = (name) => argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
  const localDefault = process.platform === 'win32'
    ? path.join('C:\\secure-ops', 'production-backend-launch', 'automated-readiness')
    : path.join('artifacts', 'production-backend-launch', 'automated-readiness');
  const root = path.resolve(value('--out-root') ?? process.env.GROOKAI_LAUNCH_READINESS_ROOT ?? localDefault);
  return {
    projectRef: text(value('--project-ref') ?? process.env.SUPABASE_PROJECT_REF) ?? DEFAULT_PROJECT_REF,
    organizationId: text(value('--organization-id') ?? process.env.SUPABASE_ORGANIZATION_ID) ?? DEFAULT_ORGANIZATION_ID,
    expectedCompute: text(value('--expected-compute')) ?? 'ci_medium',
    metricsSamples: Number(value('--metrics-samples') ?? 6),
    metricsIntervalSeconds: Number(value('--metrics-interval-seconds') ?? 15),
    billingEvidence: text(value('--billing-evidence')) ? path.resolve(value('--billing-evidence')) : null,
    restoreEvidence: text(value('--restore-evidence')) ? path.resolve(value('--restore-evidence')) : null,
    sameCandidateEvidence: text(value('--same-candidate-evidence')) ? path.resolve(value('--same-candidate-evidence')) : null,
    loadEvidence: text(value('--load-evidence')) ? path.resolve(value('--load-evidence')) : null,
    controlPlaneEvidence: text(value('--control-plane-evidence')) ? path.resolve(value('--control-plane-evidence')) : null,
    requireReady: argv.includes('--require-ready'),
    outDir: path.join(root, `${stamp(now)}_read_only`)
  };
}

async function git(args) {
  const { stdout } = await execFileAsync('git', args, { encoding: 'utf8', timeout: 30_000, windowsHide: true });
  return stdout.trim();
}

async function readJsonOrNull(file) {
  if (!file) return null;
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function findLatestLoadEvidence() {
  if (process.platform !== 'win32') return null;
  const root = path.join('C:\\secure-ops', 'production-backend-launch', 'read-load');
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const candidates = [];
    for (const entry of entries.filter((row) => row.isDirectory())) {
      const summaryPath = path.join(root, entry.name, 'summary.json');
      const report = await readJsonOrNull(summaryPath);
      if (report?.status === 'passed') candidates.push({ summaryPath, observedAt: Date.parse(report.observed_at ?? '') });
    }
    candidates.sort((left, right) => right.observedAt - left.observedAt);
    return candidates[0]?.summaryPath ?? null;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function runNode(script, args, { env = process.env } = {}) {
  const { stdout } = await execFileAsync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
    timeout: 10 * 60_000,
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true
  });
  return stdout.trim();
}

function finding(severity, code, detail, evidence = {}) {
  return { severity, code, detail, evidence };
}

function ageHours(timestamp, now) {
  const parsed = Date.parse(timestamp ?? '');
  return Number.isFinite(parsed) ? (now.getTime() - parsed) / 3_600_000 : null;
}

function hasFiniteEvidenceNumber(value) {
  return value !== null
    && value !== undefined
    && String(value).trim() !== ''
    && Number.isFinite(Number(value));
}

export function reconcileExternalControlPlaneEvidenceV1({ report, topology, now = new Date(), maxAgeMinutes = 30 }) {
  if (report?.schema_version !== 'GROOKAI_PRODUCTION_LIVE_CONTROL_PLANE_V1') {
    throw new Error('External control-plane evidence has an unsupported schema version.');
  }
  if (!Array.isArray(report.components) || report.components.length === 0) {
    throw new Error('External control-plane evidence has no components.');
  }
  if (!Array.isArray(topology?.components) || topology.components.length === 0) {
    throw new Error('Production topology is missing or empty.');
  }
  const observedAt = Date.parse(report.observed_at ?? '');
  const ageMinutes = Number.isFinite(observedAt) ? (now.getTime() - observedAt) / 60_000 : null;
  if (!Number.isFinite(ageMinutes) || ageMinutes < -5 || ageMinutes > maxAgeMinutes) {
    throw new Error(`External control-plane evidence is not fresh (age_minutes=${ageMinutes}).`);
  }
  const componentIds = report.components.map((component) => text(component?.component_id));
  if (componentIds.some((componentId) => !componentId)) {
    throw new Error('External control-plane evidence contains a component without an ID.');
  }
  if (new Set(componentIds).size !== componentIds.length) {
    throw new Error('External control-plane evidence contains duplicate component IDs.');
  }
  const topologyIds = new Set(topology.components.map((component) => component.id));
  const unknownIds = componentIds.filter((componentId) => !topologyIds.has(componentId));
  if (unknownIds.length) {
    throw new Error(`External control-plane evidence contains unknown component IDs: ${unknownIds.join(', ')}.`);
  }
  const reconciliation = summarizeControlPlaneComponentsV1(report.components, topology);
  if (JSON.stringify(stable(report.summary)) !== JSON.stringify(stable(reconciliation.summary))) {
    throw new Error('External control-plane component counts do not reconcile with its summary.');
  }
  return {
    ...report,
    ...reconciliation,
    external_evidence_validation: {
      status: 'passed',
      age_minutes: ageMinutes,
      max_age_minutes: maxAgeMinutes,
      component_count: componentIds.length,
      source_commit_sha: report.commit_sha ?? null,
      source_report_fingerprint_sha256: sha256(report)
    }
  };
}

export function reconcileDiskAutoscaleEvidenceV1({ provider, billingEvidence, now = new Date() }) {
  const operator = billingEvidence?.disk_autoscale ?? null;
  const management = provider?.provider_evidence?.disk_autoscale ?? null;
  const currentSizeGb = Number(provider?.metrics?.disk_size_gb);
  const evidenceAgeHours = ageHours(billingEvidence?.observed_at, now);
  const operatorGrowthPercent = Number(operator?.growth_percent);
  const operatorMinIncrementGb = Number(operator?.minimum_increment_gb);
  const operatorMaxSizeGb = Number(operator?.maximum_disk_size_gb);
  const managementMaxSizeGb = Number(management?.max_size_gb);
  const confirmed = billingEvidence?.source === 'signed_in_supabase_dashboard_live_verification'
    && Number.isFinite(evidenceAgeHours)
    && evidenceAgeHours <= 24
    && billingEvidence?.spend_cap_enabled === false
    && Number.isFinite(currentSizeGb)
    && operatorGrowthPercent > 0
    && operatorMinIncrementGb > 0
    && operatorMaxSizeGb > currentSizeGb
    && managementMaxSizeGb === operatorMaxSizeGb;
  return {
    confirmed,
    evidence_age_hours: evidenceAgeHours,
    source: billingEvidence?.source ?? null,
    current_size_gb: Number.isFinite(currentSizeGb) ? currentSizeGb : null,
    operator: operator
      ? {
          growth_percent: Number.isFinite(operatorGrowthPercent) ? operatorGrowthPercent : null,
          minimum_increment_gb: Number.isFinite(operatorMinIncrementGb) ? operatorMinIncrementGb : null,
          maximum_disk_size_gb: Number.isFinite(operatorMaxSizeGb) ? operatorMaxSizeGb : null
        }
      : null,
    management_api: management
      ? {
          growth_percent: management.growth_percent ?? null,
          min_increment_gb: management.min_increment_gb ?? null,
          max_size_gb: Number.isFinite(managementMaxSizeGb) ? managementMaxSizeGb : null
        }
      : null
  };
}

export function evaluateBackendLaunchAutomationV1({
  provider,
  metrics,
  database,
  managed,
  controlPlane,
  loadEvidence,
  billingEvidence,
  sameCandidateEvidence,
  gitState,
  now = new Date()
}) {
  const findings = [];
  const autoscaleReconciliation = reconcileDiskAutoscaleEvidenceV1({ provider, billingEvidence, now });
  if (gitState?.tracked_worktree_clean !== true) findings.push(finding('high', 'tracked_worktree_not_clean', 'The run was not produced from a clean tracked working tree.'));
  for (const [name, report] of [['provider', provider], ['metrics', metrics], ['database', database], ['managed', managed]]) {
    if (!report) findings.push(finding('critical', `${name}_report_missing`, `${name} evidence is missing.`));
    else if (['blocked', 'failed'].includes(report.status)) findings.push(finding('high', `${name}_gate_not_healthy`, `${name} gate status is ${report.status}.`));
  }
  const controlPlaneLaunchStatus = controlPlane?.launch_status ?? controlPlane?.overall_status;
  const controlPlaneLaunchSummary = controlPlane?.launch_summary ?? controlPlane?.summary;
  if (!controlPlane) findings.push(finding('unmeasured', 'control_plane_report_missing', 'The production control-plane report is missing.'));
  else if (controlPlaneLaunchStatus === 'failed') findings.push(finding('high', 'control_plane_failed', 'At least one launch-critical production control-plane component failed.'));
  else if (controlPlaneLaunchStatus !== 'healthy') findings.push(finding('unmeasured', 'control_plane_incomplete', `Launch-critical control-plane status is ${controlPlaneLaunchStatus}.`, { summary: controlPlaneLaunchSummary }));

  if (loadEvidence?.status !== 'passed') findings.push(finding('unmeasured', 'launch_read_load_gate_missing', 'A passing launch read-load artifact was not supplied.'));
  else if (loadEvidence.failed_requests !== 0 || loadEvidence.rate_limit_count !== 0 || loadEvidence.error_rate !== 0) {
    findings.push(finding('high', 'launch_read_load_reconciliation_failed', 'The supplied load artifact contains failures or rate limits.'));
  }

  if (!billingEvidence) {
    findings.push(finding('unmeasured', 'billing_usage_unmeasured', 'Billing-cycle egress, quota restriction, and Spend Cap evidence are not available through the public Management API.'));
  } else {
    const billingAge = ageHours(billingEvidence.observed_at, now);
    if (!Number.isFinite(billingAge) || billingAge > 24) findings.push(finding('unmeasured', 'billing_evidence_stale', 'Billing evidence is older than 24 hours.', { age_hours: billingAge }));
    if (billingEvidence.quota_restriction_notice_active === true) findings.push(finding('critical', 'organization_quota_restriction_notice_active', 'Supabase reports that the organization exceeded quota and is scheduled for restriction.', { restriction_date: billingEvidence.restriction_date ?? null }));
    if (billingEvidence.spend_cap_enabled === true && provider?.metrics?.disk_size_gb > 8) findings.push(finding('critical', 'spend_cap_blocks_disk_autoscale', 'Spend Cap is enabled while the database requires paid disk above the included limit.'));
    if (!hasFiniteEvidenceNumber(billingEvidence.uncached_egress_gb) || !hasFiniteEvidenceNumber(billingEvidence.cached_egress_gb)) {
      findings.push(finding('unmeasured', 'billing_egress_exact_values_unmeasured', 'Exact cached and uncached billing-cycle egress values were not recorded.'));
    }
  }

  if (managed?.metrics?.restore_exercise_verified !== true) {
    findings.push(finding('unmeasured', 'restore_exercise_not_verified', 'A reconciled non-production restore exercise is still required.'));
  }
  if (!sameCandidateEvidence || sameCandidateEvidence.status !== 'passed') {
    findings.push(finding('unmeasured', 'same_candidate_clients_not_verified', 'Web, Android, and iOS have not all been verified against one frozen candidate.'));
  }

  const diskRatio = provider?.metrics?.disk_utilization;
  if (Number.isFinite(diskRatio) && diskRatio >= 0.7) findings.push(finding('medium', 'disk_headroom_below_launch_target', 'Provider disk utilization is above the 70% launch target.', { ratio: diskRatio }));
  if (provider?.metrics?.disk_autoscale_provider_confirmed !== true && autoscaleReconciliation.confirmed !== true) {
    findings.push(finding('unmeasured', 'disk_autoscale_not_confirmed', 'An effective provider disk autoscale policy is not confirmed.', { reconciliation: autoscaleReconciliation }));
  }
  const blockers = findings.filter((row) => ['critical', 'high'].includes(row.severity));
  const incomplete = findings.filter((row) => ['medium', 'unmeasured'].includes(row.severity));
  const status = blockers.length ? 'blocked' : incomplete.length ? 'incomplete' : 'ready_for_launch_gate';
  return {
    status,
    launch_allowed: status === 'ready_for_launch_gate',
    load_rerun_allowed: status !== 'blocked'
      && metrics?.status === 'healthy'
      && provider?.metrics?.disk_utilization < 0.8
      && provider?.metrics?.project_readonly === false,
    evidence_reconciliation: {
      disk_autoscale: autoscaleReconciliation
    },
    findings,
    summary: {
      critical: findings.filter((row) => row.severity === 'critical').length,
      high: findings.filter((row) => row.severity === 'high').length,
      medium: findings.filter((row) => row.severity === 'medium').length,
      unmeasured: findings.filter((row) => row.severity === 'unmeasured').length
    }
  };
}

function markdown(report) {
  return [
    `# ${AUTOMATION_VERSION}`,
    '',
    `- Run: \`${report.run_id}\``,
    `- Observed: \`${report.observed_at}\``,
    `- Commit: \`${report.git.commit_sha}\``,
    `- Branch: \`${report.git.branch}\``,
    `- Status: **${report.status.toUpperCase()}**`,
    `- Launch allowed: \`${report.launch_allowed}\``,
    `- Load rerun allowed: \`${report.load_rerun_allowed}\``,
    '',
    '## Verified Now',
    '',
    `- Supabase project: \`${report.inputs.provider?.project?.status ?? 'unmeasured'}\``,
    `- Compute: \`${report.inputs.provider?.metrics?.compute_name ?? 'unmeasured'}\``,
    `- CPU maximum: \`${Number.isFinite(report.inputs.metrics?.metrics?.cpu_utilization_maximum) ? `${(report.inputs.metrics.metrics.cpu_utilization_maximum * 100).toFixed(2)}%` : 'unmeasured'}\``,
    `- Memory maximum: \`${Number.isFinite(report.inputs.metrics?.metrics?.memory_utilization_maximum) ? `${(report.inputs.metrics.metrics.memory_utilization_maximum * 100).toFixed(2)}%` : 'unmeasured'}\``,
    `- Disk utilization: \`${Number.isFinite(report.inputs.provider?.metrics?.disk_utilization) ? `${(report.inputs.provider.metrics.disk_utilization * 100).toFixed(2)}%` : 'unmeasured'}\``,
    `- Read-only: \`${report.inputs.provider?.metrics?.project_readonly ?? 'unmeasured'}\``,
    `- Latest backup: \`${report.inputs.provider?.metrics?.latest_physical_backup_at ?? 'unmeasured'}\``,
    `- Read-load gate: \`${report.inputs.load?.status ?? 'unmeasured'}\``,
    '',
    '## Remaining Work',
    '',
    ...report.findings.map((row) => `- **${row.severity.toUpperCase()} ${row.code}:** ${row.detail}`),
    '',
    '## Automated Boundaries',
    '',
    '- Supabase Management API: GET only',
    '- Supabase Metrics API: GET only',
    '- Database audit transaction: read only',
    '- Database or Storage writes: none',
    '- Billing/add-on changes: none',
    '- Restore started: no',
    '- Deployments or public rollout: none',
    ''
  ].join('\n');
}

async function hashArtifacts(root) {
  const rows = [];
  async function visit(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(fullPath);
      else if (entry.name !== 'artifact_hashes.json') {
        const content = await fs.readFile(fullPath);
        rows.push({ path: path.relative(root, fullPath).replaceAll('\\', '/'), sha256: sha256(content), bytes: content.length });
      }
    }
  }
  await visit(root);
  rows.sort((left, right) => left.path.localeCompare(right.path));
  return rows;
}

export async function runBackendLaunchAutomationV1({ argv = process.argv.slice(2), now = new Date() } = {}) {
  const args = parseArgs(argv, now);
  const commitSha = await git(['rev-parse', 'HEAD']);
  const branch = await git(['branch', '--show-current']);
  const trackedChanges = await git(['status', '--short', '--untracked-files=no']);
  const runId = path.basename(args.outDir);
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlan = {
    schema_version: `${AUTOMATION_VERSION}_RUN_PLAN`,
    run_id: runId,
    created_at: now.toISOString(),
    git: { commit_sha: commitSha, branch, tracked_worktree_clean: trackedChanges.length === 0 },
    project_ref: args.projectRef,
    organization_id: args.organizationId,
    expected_compute: args.expectedCompute,
    metrics_sampling: { samples: args.metricsSamples, interval_seconds: args.metricsIntervalSeconds },
    supplied_evidence: {
      billing: args.billingEvidence,
      restore: args.restoreEvidence,
      same_candidate: args.sameCandidateEvidence,
      load: args.loadEvidence,
      control_plane: args.controlPlaneEvidence
    },
    boundaries: {
      provider_get_only: true,
      database_read_only: true,
      database_writes: false,
      storage_writes: false,
      billing_changes: false,
      restore_started: false,
      deployment_changes: false,
      public_rollout: false
    }
  };
  await fs.writeFile(path.join(args.outDir, 'run_plan.json'), `${JSON.stringify(runPlan, null, 2)}\n`);

  const providerDir = path.join(args.outDir, 'provider');
  const metricsDir = path.join(args.outDir, 'metrics');
  const databaseDir = path.join(args.outDir, 'database');
  const managedDir = path.join(args.outDir, 'managed');
  const controlPlaneDir = path.join(args.outDir, 'control_plane');
  await runNode('scripts/audits/production_supabase_provider_snapshot_v1.mjs', [
    `--project-ref=${args.projectRef}`,
    `--organization-id=${args.organizationId}`,
    `--expected-compute=${args.expectedCompute}`,
    `--out-dir=${providerDir}`
  ]);
  const provider = await readJsonOrNull(path.join(providerDir, 'production_supabase_provider_snapshot_v1.json'));
  await runNode('scripts/audits/production_supabase_metrics_snapshot_v1.mjs', [
    `--project-ref=${args.projectRef}`,
    `--samples=${args.metricsSamples}`,
    `--interval-seconds=${args.metricsIntervalSeconds}`,
    `--out-dir=${metricsDir}`
  ]);
  const metrics = await readJsonOrNull(path.join(metricsDir, 'production_supabase_metrics_snapshot_v1.json'));
  const databaseEnv = {
    ...process.env,
    SUPABASE_DATABASE_CAPACITY_BYTES: String(provider?.metrics?.disk_filesystem_bytes ?? ''),
    ...(process.env.SUPABASE_STORAGE_CAPACITY_BYTES ? {} : { SUPABASE_STORAGE_CAPACITY_BYTES: '100000000000' })
  };
  await runNode('scripts/audits/production_supabase_launch_audit_v1.mjs', [`--out-dir=${databaseDir}`], { env: databaseEnv });
  const database = await readJsonOrNull(path.join(databaseDir, 'production_supabase_launch_audit_v1.json'));
  const managedArgs = [`--project-ref=${args.projectRef}`, `--out-dir=${managedDir}`];
  if (args.restoreEvidence) managedArgs.push(`--restore-evidence=${args.restoreEvidence}`);
  await runNode('scripts/audits/production_supabase_managed_control_audit_v1.mjs', managedArgs);
  const managed = await readJsonOrNull(path.join(managedDir, 'production_supabase_managed_control_audit_v1.json'));
  let controlPlane;
  if (args.controlPlaneEvidence) {
    const [externalControlPlane, topology] = await Promise.all([
      readJsonOrNull(args.controlPlaneEvidence),
      readJsonOrNull(path.resolve(TOPOLOGY_PATH))
    ]);
    controlPlane = reconcileExternalControlPlaneEvidenceV1({ report: externalControlPlane, topology, now });
    await fs.mkdir(controlPlaneDir, { recursive: true });
    await Promise.all([
      fs.copyFile(args.controlPlaneEvidence, path.join(controlPlaneDir, 'live_control_plane_v1.remote_source.json')),
      fs.writeFile(path.join(controlPlaneDir, 'live_control_plane_v1.json'), `${JSON.stringify(controlPlane, null, 2)}\n`)
    ]);
  } else {
    await runNode('scripts/audits/production_live_control_plane_v1.mjs', [], {
      env: { ...process.env, GROOKAI_CONTROL_PLANE_OUTPUT_DIR: controlPlaneDir }
    });
    controlPlane = await readJsonOrNull(path.join(controlPlaneDir, 'live_control_plane_v1.json'));
  }
  const loadPath = args.loadEvidence ?? await findLatestLoadEvidence();
  const [loadEvidence, billingEvidence, sameCandidateEvidence] = await Promise.all([
    readJsonOrNull(loadPath),
    readJsonOrNull(args.billingEvidence),
    readJsonOrNull(args.sameCandidateEvidence)
  ]);
  const evaluation = evaluateBackendLaunchAutomationV1({
    provider,
    metrics,
    database,
    managed,
    controlPlane,
    loadEvidence,
    billingEvidence,
    sameCandidateEvidence,
    gitState: runPlan.git,
    now
  });
  const body = {
    schema_version: AUTOMATION_VERSION,
    run_id: runId,
    observed_at: new Date().toISOString(),
    git: runPlan.git,
    ...evaluation,
    inputs: {
      provider,
      metrics,
      database: database ? { status: database.status, summary: database.summary, metrics: database.metrics, report_fingerprint_sha256: database.report_fingerprint_sha256 } : null,
      managed: managed ? { status: managed.status, summary: managed.summary, metrics: managed.metrics, report_fingerprint_sha256: managed.report_fingerprint_sha256 } : null,
      control_plane: controlPlane ? {
        overall_status: controlPlane.overall_status,
        summary: controlPlane.summary,
        launch_status: controlPlane.launch_status ?? controlPlane.overall_status,
        launch_summary: controlPlane.launch_summary ?? controlPlane.summary,
        commit_sha: controlPlane.commit_sha,
        external_evidence_validation: controlPlane.external_evidence_validation ?? null
      } : null,
      load: loadEvidence,
      billing: billingEvidence,
      same_candidate: sameCandidateEvidence
    },
    evidence_paths: {
      load: loadPath,
      billing: args.billingEvidence,
      restore: args.restoreEvidence,
      same_candidate: args.sameCandidateEvidence,
      control_plane: args.controlPlaneEvidence
    },
    boundaries: runPlan.boundaries
  };
  const report = { ...body, report_fingerprint_sha256: sha256(body) };
  const summaryPath = path.join(args.outDir, 'summary.json');
  await Promise.all([
    fs.writeFile(summaryPath, `${JSON.stringify(report, null, 2)}\n`),
    fs.writeFile(path.join(args.outDir, 'REMAINING_PLAN.md'), markdown(report))
  ]);
  const hashes = await hashArtifacts(args.outDir);
  await fs.writeFile(path.join(args.outDir, 'artifact_hashes.json'), `${JSON.stringify({ schema_version: `${AUTOMATION_VERSION}_ARTIFACT_HASHES`, run_id: runId, artifacts: hashes }, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    launch_allowed: report.launch_allowed,
    load_rerun_allowed: report.load_rerun_allowed,
    summary: report.summary,
    output_dir: args.outDir,
    report_fingerprint_sha256: report.report_fingerprint_sha256
  }, null, 2)}\n`);
  if (args.requireReady && !report.launch_allowed) process.exitCode = 1;
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runBackendLaunchAutomationV1().catch((error) => {
    console.error(`[production-backend-launch-automation] ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
