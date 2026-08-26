import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
export const AUDIT_VERSION = 'PRODUCTION_SUPABASE_MANAGED_CONTROL_AUDIT_V1';
const DEFAULT_MAX_BACKUP_AGE_HOURS = 36;

function clean(value) {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
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
  const projectRef = clean(value('--project-ref') ?? process.env.SUPABASE_PROJECT_REF);
  if (!projectRef || !/^[a-z0-9]{20}$/.test(projectRef)) throw new Error('--project-ref must be a 20-character Supabase project ref');
  const maxBackupAgeHours = Number(value('--max-backup-age-hours') ?? DEFAULT_MAX_BACKUP_AGE_HOURS);
  if (!Number.isFinite(maxBackupAgeHours) || maxBackupAgeHours <= 0) throw new Error('--max-backup-age-hours must be positive');
  return {
    projectRef,
    maxBackupAgeHours,
    outDir: path.resolve(value('--out-dir') ?? path.join('docs', 'audits', 'production_backend_launch_v1', 'supabase_managed')),
    restoreEvidencePath: clean(value('--restore-evidence')) ? path.resolve(value('--restore-evidence')) : null
  };
}

function hoursBetween(later, earlier) {
  return (Date.parse(later) - Date.parse(earlier)) / 3_600_000;
}

function finding(severity, code, detail, evidence = {}) {
  return { severity, code, detail, evidence };
}

export function verifyRestoreEvidenceV1(restoreEvidence, projectRef) {
  if (!restoreEvidence || !projectRef) return false;

  const legacyEvidenceVerified = Boolean(
    restoreEvidence.status === 'succeeded'
      && restoreEvidence.production_source_project_ref === projectRef
      && restoreEvidence.target_environment === 'nonproduction'
      && restoreEvidence.production_mutations === false
      && restoreEvidence.reconciliation?.mismatches === 0
  );
  if (legacyEvidenceVerified) return true;

  const sourceRef = restoreEvidence.source?.project_ref ?? null;
  const destinationRef = restoreEvidence.destination?.project_ref ?? null;
  const reconciliation = restoreEvidence.reconciliation ?? {};
  const reconciliationChecks = [
    'migration_ledger_match',
    'schema_match',
    'schema_column_match',
    'rls_policy_match',
    'function_match',
    'relation_grant_match',
    'routine_grant_match'
  ];

  return Boolean(
    restoreEvidence.status === 'passed'
      && sourceRef === projectRef
      && destinationRef
      && destinationRef !== sourceRef
      && restoreEvidence.source?.production_writes === false
      && restoreEvidence.boundaries?.production_database_writes === false
      && restoreEvidence.boundaries?.production_restore_in_place === false
      && restoreEvidence.schedule_isolation?.result === 'passed'
      && restoreEvidence.schedule_isolation?.production_target_executions === 0
      && reconciliation.status === 'passed'
      && reconciliationChecks.every((key) => reconciliation[key] === true)
      && restoreEvidence.signed_in_smoke?.status === 'passed'
  );
}

export function evaluateManagedControlV1({ project, backupInventory, restoreEvidence = null, now = new Date(), maxBackupAgeHours = DEFAULT_MAX_BACKUP_AGE_HOURS }) {
  const findings = [];
  if (!project) findings.push(finding('critical', 'project_missing', 'The requested Supabase project was not returned by the management plane.'));
  else if (project.status !== 'ACTIVE_HEALTHY') findings.push(finding('high', 'project_not_active_healthy', `Project status is ${project.status ?? 'unknown'}.`));

  const completed = [...(backupInventory?.backups ?? [])]
    .filter((row) => row.status === 'COMPLETED' && row.is_physical_backup === true)
    .sort((left, right) => Date.parse(right.inserted_at) - Date.parse(left.inserted_at));
  const latest = completed[0] ?? null;
  const latestAgeHours = latest ? hoursBetween(now.toISOString(), latest.inserted_at) : null;
  if (!latest) findings.push(finding('critical', 'completed_physical_backup_missing', 'No completed physical backup is available.'));
  else if (!Number.isFinite(latestAgeHours) || latestAgeHours > maxBackupAgeHours) {
    findings.push(finding('high', 'latest_physical_backup_stale', 'The latest completed physical backup exceeds the launch freshness target.', { age_hours: latestAgeHours }));
  }
  if (backupInventory?.walg_enabled !== true) findings.push(finding('high', 'walg_not_enabled', 'Managed WAL-G backup support is not enabled.'));
  if (backupInventory?.pitr_enabled !== true) findings.push(finding('medium', 'pitr_disabled', 'Point-in-time recovery is disabled; recovery is limited to completed physical backup points.'));

  const gaps = completed.slice(1).map((row, index) => hoursBetween(completed[index].inserted_at, row.inserted_at));
  const maximumGapHours = gaps.length ? Math.max(...gaps) : null;
  if (completed.length < 7) findings.push(finding('medium', 'backup_retention_under_seven_points', 'Fewer than seven completed physical backup points are visible.', { count: completed.length }));
  if (Number.isFinite(maximumGapHours) && maximumGapHours > maxBackupAgeHours) {
    findings.push(finding('high', 'physical_backup_continuity_gap', 'A physical backup interval exceeds the permitted continuity window.', { maximum_gap_hours: maximumGapHours }));
  }

  const restoreVerified = verifyRestoreEvidenceV1(restoreEvidence, project?.ref);
  if (!restoreVerified) findings.push(finding('unmeasured', 'nonproduction_restore_exercise_unmeasured', 'A reconciled non-production restore exercise has not been supplied.'));

  const blockers = findings.filter((row) => ['critical', 'high'].includes(row.severity));
  const warnings = findings.filter((row) => row.severity === 'medium');
  const unmeasured = findings.filter((row) => row.severity === 'unmeasured');
  return {
    status: blockers.length ? 'failed' : warnings.length || unmeasured.length ? 'incomplete' : 'healthy',
    findings,
    summary: {
      critical: findings.filter((row) => row.severity === 'critical').length,
      high: findings.filter((row) => row.severity === 'high').length,
      medium: warnings.length,
      unmeasured: unmeasured.length
    },
    metrics: {
      completed_physical_backup_count: completed.length,
      latest_completed_physical_backup_at: latest?.inserted_at ?? null,
      latest_completed_physical_backup_age_hours: latestAgeHours,
      maximum_completed_backup_gap_hours: maximumGapHours,
      pitr_enabled: backupInventory?.pitr_enabled ?? null,
      walg_enabled: backupInventory?.walg_enabled ?? null,
      restore_exercise_verified: restoreVerified
    }
  };
}

async function supabaseJson(args) {
  const { stdout } = await execFileAsync('supabase', args, {
    timeout: 60_000,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
    env: process.env
  });
  return JSON.parse(stdout);
}

async function readJsonOrNull(file) {
  if (!file) return null;
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function markdown(report) {
  return [
    `# ${AUDIT_VERSION}`,
    '',
    `- Observed: \`${report.observed_at}\``,
    `- Project: \`${report.project.ref}\``,
    `- Project status: \`${report.project.status}\``,
    `- Audit status: **${report.status.toUpperCase()}**`,
    `- Completed physical backups: \`${report.metrics.completed_physical_backup_count}\``,
    `- Latest backup age: \`${report.metrics.latest_completed_physical_backup_age_hours?.toFixed(2) ?? 'unknown'} hours\``,
    `- PITR enabled: \`${report.metrics.pitr_enabled}\``,
    `- WAL-G enabled: \`${report.metrics.walg_enabled}\``,
    `- Restore exercise verified: \`${report.metrics.restore_exercise_verified}\``,
    '',
    '## Findings',
    '',
    ...report.findings.map((row) => `- **${row.severity.toUpperCase()} ${row.code}:** ${row.detail}`),
    '',
    '## Boundaries',
    '',
    '- Supabase operations: project list and backup list only',
    '- Project configuration changes: none',
    '- Backup restore started: no',
    '- Database writes: none',
    '- Storage writes: none',
    ''
  ].join('\n');
}

export async function runManagedControlAuditV1({ argv = process.argv.slice(2), now = new Date() } = {}) {
  const args = parseArgs(argv);
  const [projects, backupInventory, restoreEvidence] = await Promise.all([
    supabaseJson(['projects', 'list', '--output', 'json']),
    supabaseJson(['backups', 'list', '--project-ref', args.projectRef, '--output', 'json']),
    readJsonOrNull(args.restoreEvidencePath)
  ]);
  const project = projects.find((row) => row.ref === args.projectRef) ?? null;
  const evaluation = evaluateManagedControlV1({ project, backupInventory, restoreEvidence, now, maxBackupAgeHours: args.maxBackupAgeHours });
  const body = {
    schema_version: AUDIT_VERSION,
    observed_at: now.toISOString(),
    project: project
      ? {
          ref: project.ref,
          name: project.name,
          organization_id: project.organization_id,
          region: project.region,
          status: project.status,
          postgres_engine: project.database?.postgres_engine ?? null,
          postgres_version: project.database?.version ?? null
        }
      : { ref: args.projectRef, status: null },
    ...evaluation,
    backup_inventory: backupInventory,
    restore_evidence: restoreEvidence,
    boundaries: {
      management_api_reads_only: true,
      project_configuration_changes: false,
      restore_started: false,
      database_writes: false,
      storage_writes: false
    }
  };
  const report = { ...body, report_fingerprint_sha256: sha256(body) };
  const jsonContent = `${JSON.stringify(report, null, 2)}\n`;
  await fs.mkdir(args.outDir, { recursive: true });
  const jsonPath = path.join(args.outDir, 'production_supabase_managed_control_audit_v1.json');
  await Promise.all([
    fs.writeFile(jsonPath, jsonContent),
    fs.writeFile(`${jsonPath}.sha256`, `${sha256(jsonContent)}  ${path.basename(jsonPath)}\n`),
    fs.writeFile(path.join(args.outDir, 'PRODUCTION_SUPABASE_MANAGED_CONTROL_AUDIT_V1.md'), markdown(report))
  ]);
  process.stdout.write(`${JSON.stringify({ status: report.status, summary: report.summary, metrics: report.metrics, report_fingerprint_sha256: report.report_fingerprint_sha256, json_path: jsonPath }, null, 2)}\n`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runManagedControlAuditV1().catch((error) => {
    console.error(`[production-supabase-managed-control-audit] ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
