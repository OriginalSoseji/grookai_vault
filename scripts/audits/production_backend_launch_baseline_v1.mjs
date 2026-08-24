import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export const TOPOLOGY_PATH = 'backend/operations/production_topology_v1.json';
export const OUT_DIR = 'docs/audits/production_backend_launch_v1';

const VALID_CLASSES = new Set(['A', 'B', 'C']);
const VALID_CRITICALITY = new Set(['launch_critical', 'release_evidence', 'background']);
const VALID_MATRIX_STATUSES = new Set(['pass', 'fail', 'stale', 'unmeasured', 'not_applicable']);

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function unique(values) {
  return new Set(values).size === values.length;
}

export async function validateTopologyV1(topology, rootDir = process.cwd()) {
  const errors = [];
  const components = Array.isArray(topology?.components) ? topology.components : [];

  if (topology?.schema_version !== 'GROOKAI_PRODUCTION_TOPOLOGY_V1') {
    errors.push('Unexpected or missing topology schema version.');
  }
  if (topology?.contract !== 'GROOKAI_PRODUCTION_BACKEND_LAUNCH_V1') {
    errors.push('Topology must bind to GROOKAI_PRODUCTION_BACKEND_LAUNCH_V1.');
  }
  if (components.length === 0) errors.push('Topology must declare at least one component.');
  if (!unique(components.map((component) => component.id))) errors.push('Component IDs must be unique.');

  const sourceChecks = [];
  for (const component of components) {
    if (!component.id || !component.name || !component.kind) {
      errors.push('Every component requires id, name, and kind.');
    }
    if (!VALID_CLASSES.has(component.workload_class)) {
      errors.push(`${component.id}: invalid workload_class.`);
    }
    if (!VALID_CRITICALITY.has(component.criticality)) {
      errors.push(`${component.id}: invalid criticality.`);
    }
    for (const required of ['execution_plane', 'deployment_expectation', 'live_verification', 'health_probe', 'write_boundary', 'pause_policy']) {
      if (!component[required]) errors.push(`${component.id}: missing ${required}.`);
    }
    const sourceFiles = Array.isArray(component.source_files) ? component.source_files : [];
    if (sourceFiles.length === 0 && !component.source_branch) {
      errors.push(`${component.id}: requires source_files or source_branch.`);
    }
    for (const sourceFile of sourceFiles) {
      const exists = await fileExists(path.join(rootDir, sourceFile));
      sourceChecks.push({ component_id: component.id, path: sourceFile, exists });
      if (!exists) errors.push(`${component.id}: source file does not exist: ${sourceFile}`);
    }
    if (component.workload_class === 'C' && !/pause/i.test(component.pause_policy)) {
      errors.push(`${component.id}: Class C component requires an explicit pause policy.`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    source_checks: sourceChecks,
    summary: {
      components: components.length,
      class_a: components.filter((item) => item.workload_class === 'A').length,
      class_b: components.filter((item) => item.workload_class === 'B').length,
      class_c: components.filter((item) => item.workload_class === 'C').length,
      repository_sources: sourceChecks.length,
      missing_repository_sources: sourceChecks.filter((item) => !item.exists).length
    }
  };
}

function matrixRow(id, gate, status, evidence, reason, nextAction) {
  if (!VALID_MATRIX_STATUSES.has(status)) throw new Error(`Invalid matrix status: ${status}`);
  return {
    id,
    gate,
    status,
    evidence,
    reason,
    next_action: nextAction
  };
}

export function buildBaselineMatrixV1({ topologyValidation, runtimePreflight, nowIso }) {
  const runtimeObservedAt = runtimePreflight?.collected_at ?? null;
  const runtimeAgeHours = runtimeObservedAt
    ? (Date.parse(nowIso) - Date.parse(runtimeObservedAt)) / 3_600_000
    : null;
  const runtimeFresh = Number.isFinite(runtimeAgeHours) && runtimeAgeHours <= 24;
  const runtimeCritical = Number(runtimePreflight?.summary?.critical_fail_checks ?? -1);

  const rows = [
    matrixRow(
      'topology-registry',
      'Topology',
      topologyValidation.ok ? 'pass' : 'fail',
      [TOPOLOGY_PATH],
      topologyValidation.ok
        ? `${topologyValidation.summary.components} components are declared with valid repository references.`
        : `${topologyValidation.errors.length} topology validation errors remain.`,
      topologyValidation.ok ? 'Add live state and ownership to each component.' : 'Repair every topology validation error.'
    ),
    matrixRow(
      'runtime-contract-health',
      'Topology',
      runtimeFresh && runtimeCritical === 0 ? 'pass' : runtimeObservedAt ? 'stale' : 'unmeasured',
      ['docs/audits/founder_ops_dashboard_v1/runtime_preflight_v1.json'],
      runtimeFresh && runtimeCritical === 0
        ? 'Current runtime contract preflight has zero critical failures.'
        : 'Runtime contract evidence is missing, stale, or has critical failures.',
      'Keep the runtime preflight inside the live control-plane collection.'
    ),
    matrixRow(
      'live-control-plane',
      'Observability',
      'unmeasured',
      ['.github/workflows/founder-ops-dashboard.yml', 'scripts/audits/founder_ops_dashboard_collect_v1.mjs'],
      'The dashboard exists, but several domain cards consume fixed dated artifacts and do not verify live schedules or freshness.',
      'Implement a live worker registry, schedule freshness checks, and current provider probes.'
    ),
    matrixRow(
      'alert-delivery',
      'Observability',
      'unmeasured',
      ['scripts/ops/grookai_operations_webhook_v1.mjs'],
      'Alert code exists, but current SEV delivery latency and end-to-end notification proof are not established.',
      'Run bounded SEV-1/2/3 synthetic alert delivery and acknowledgement proof.'
    ),
    matrixRow(
      'mee-and-pricing',
      'Data reliability',
      'stale',
      ['docs/contracts/MEE_PRICING_PLATFORM_PRODUCTION_V1_DEFINITION_OF_DONE.md'],
      'Extensive pricing workers and canary evidence exist, but current live schedule, freshness, and publication reconciliation are not part of this baseline.',
      'Run current read-only MEE, pricing health, coverage, provenance, and publication reconciliation audits.'
    ),
    matrixRow(
      'new-set-discovery',
      'Data reliability',
      'stale',
      ['scripts/ingest/new_set_release_ingest_v1.mjs', 'docs/audits/new_set_release_ingestion_v1/20260714_abyss_eye_pitch_black/summary_v1.json'],
      'The latest dashboard source is a fixed July 14 set artifact and does not prove continuous discovery.',
      'Add a discovery cursor, supported-source watermark, schedule, and missed-release alert.'
    ),
    matrixRow(
      'image-delivery',
      'Data reliability',
      'unmeasured',
      ['docs/audits/image_truth_v1'],
      'Historical image audits exist, but launch-wide authoritative image availability and live delivery latency are not current.',
      'Run current corpus coverage plus sampled CDN delivery and client fallback checks.'
    ),
    matrixRow(
      'supabase-security',
      'Supabase',
      'stale',
      ['docs/audits/supabase_security_linter_v2/supabase_security_and_app_health_20260730.md'],
      'Prior security remediation exists, but current advisors, grants, RLS, functions, and anonymous access require readback.',
      'Run a fresh read-only Supabase security and authority audit.'
    ),
    matrixRow(
      'supabase-capacity-performance',
      'Supabase',
      'unmeasured',
      [],
      'Current database, Storage, egress, CPU, I/O, connection, cache, bloat, growth, and slow-query launch evidence is absent.',
      'Collect the Supabase capacity baseline and 30/90-day forecast before recommending plan changes.'
    ),
    matrixRow(
      'backup-restore',
      'Supabase',
      'unmeasured',
      [],
      'Repository backup utilities do not prove current managed backup retention, PITR posture, or a successful restore exercise.',
      'Document managed backup settings and complete a non-destructive restore exercise.'
    ),
    matrixRow(
      'shared-client-contracts',
      'Client contracts',
      'stale',
      ['docs/audits/release_completion_v1'],
      'Web and mobile release evidence exists, but it predates the current launch SHA and backend contract baseline.',
      'Run same-commit web, Android, iOS, search, pricing, Vault, image, and sharing journeys.'
    ),
    matrixRow(
      'load-and-failure',
      'Failure and load',
      'unmeasured',
      [],
      'No current 2x launch-load result or coordinated dependency-failure exercise is registered.',
      'Establish expected peak, run read-path load tests, and exercise provider, rate-limit, worker, and rollback failures.'
    ),
    matrixRow(
      'background-isolation',
      'Failure and load',
      'unmeasured',
      [TOPOLOGY_PATH],
      'Class C pause policies are declared, but resource-aware enforcement is not yet proven.',
      'Implement shared supervisor thresholds and prove Class C yields to Class A/B.'
    ),
    matrixRow(
      'production-canary',
      'Canary',
      'unmeasured',
      ['docs/contracts/MEE_PRICING_PLATFORM_PRODUCTION_V1_DEFINITION_OF_DONE.md'],
      'Historical canary work exists, but a current frozen-SHA, full-backend 72-hour launch observation is not registered.',
      'Start only after preceding launch-critical gates pass.'
    ),
    matrixRow(
      'rollback-and-launch-report',
      'Launch',
      'unmeasured',
      [],
      'A current deployment rollback target, restore result, migration manifest, and reconciled final launch report are not yet assembled.',
      'Build after the production candidate SHA and migration set are frozen.'
    )
  ];

  const summary = Object.fromEntries(
    [...VALID_MATRIX_STATUSES].map((status) => [status, rows.filter((row) => row.status === status).length])
  );

  return {
    schema_version: 'GROOKAI_PRODUCTION_LAUNCH_MATRIX_V1',
    generated_at: nowIso,
    launch_ready: rows.every((row) => row.status === 'pass' || row.status === 'not_applicable'),
    summary,
    rows
  };
}

function markdownReport(topologyValidation, matrix) {
  const lines = [
    '# Production Backend Launch V1 Baseline',
    '',
    `Generated: ${matrix.generated_at}`,
    '',
    `Launch ready: **${matrix.launch_ready ? 'YES' : 'NO'}**`,
    '',
    '## Summary',
    '',
    `- Topology components: ${topologyValidation.summary.components}`,
    `- Repository source references: ${topologyValidation.summary.repository_sources}`,
    `- Missing source references: ${topologyValidation.summary.missing_repository_sources}`,
    `- Passed gates: ${matrix.summary.pass}`,
    `- Failed gates: ${matrix.summary.fail}`,
    `- Stale gates: ${matrix.summary.stale}`,
    `- Unmeasured gates: ${matrix.summary.unmeasured}`,
    '',
    '## Gate Matrix',
    '',
    '| Gate | Requirement | Status | Current truth |',
    '| --- | --- | --- | --- |',
    ...matrix.rows.map((row) => `| ${row.gate} | ${row.id} | ${row.status.toUpperCase()} | ${row.reason.replaceAll('|', '\\|')} |`),
    '',
    '## Next Actions',
    '',
    ...matrix.rows
      .filter((row) => row.status !== 'pass' && row.status !== 'not_applicable')
      .map((row) => `- **${row.id}:** ${row.next_action}`),
    '',
    'This baseline is fail-closed. Historical evidence remains useful, but it cannot pass a live launch gate without a current observation time and freshness result.',
    ''
  ];
  return lines.join('\n');
}

export async function runProductionBackendLaunchBaselineV1({ rootDir = process.cwd(), now = new Date() } = {}) {
  const topology = await readJson(path.join(rootDir, TOPOLOGY_PATH));
  const topologyValidation = await validateTopologyV1(topology, rootDir);
  const runtimePreflightPath = path.join(rootDir, 'docs/audits/founder_ops_dashboard_v1/runtime_preflight_v1.json');
  const runtimePreflight = await fileExists(runtimePreflightPath) ? await readJson(runtimePreflightPath) : null;
  const matrix = buildBaselineMatrixV1({
    topologyValidation,
    runtimePreflight,
    nowIso: now.toISOString()
  });

  const outputDir = path.join(rootDir, OUT_DIR);
  await fs.mkdir(outputDir, { recursive: true });
  const topologyReport = {
    schema_version: 'GROOKAI_PRODUCTION_TOPOLOGY_REPORT_V1',
    generated_at: now.toISOString(),
    topology,
    validation: topologyValidation
  };

  await Promise.all([
    fs.writeFile(path.join(outputDir, 'production_topology_v1.json'), `${JSON.stringify(topologyReport, null, 2)}\n`),
    fs.writeFile(path.join(outputDir, 'baseline_launch_matrix_v1.json'), `${JSON.stringify(matrix, null, 2)}\n`),
    fs.writeFile(path.join(outputDir, 'BASELINE_REPORT_V1.md'), markdownReport(topologyValidation, matrix))
  ]);

  return { topologyValidation, matrix, outputDir };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runProductionBackendLaunchBaselineV1()
    .then(({ topologyValidation, matrix, outputDir }) => {
      console.log(JSON.stringify({
        ok: topologyValidation.ok,
        launch_ready: matrix.launch_ready,
        output_dir: outputDir,
        topology: topologyValidation.summary,
        matrix: matrix.summary
      }, null, 2));
      process.exitCode = topologyValidation.ok ? 0 : 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack : String(error));
      process.exitCode = 1;
    });
}
