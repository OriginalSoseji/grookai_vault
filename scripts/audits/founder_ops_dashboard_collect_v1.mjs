import fs from 'node:fs/promises';
import path from 'node:path';

import { runRuntimePreflightV1 } from '../contracts/run_runtime_preflight_v1.mjs';
import { runRuntimeHealthV1 } from '../contracts/run_runtime_health_v1.mjs';
import { runQuarantineReportV1 } from '../contracts/run_quarantine_report_v1.mjs';
import { runDeferredReportV1 } from '../contracts/run_deferred_report_v1.mjs';

const OUT_DIR = 'docs/audits/founder_ops_dashboard_v1';
const TREND_FILE = path.join(OUT_DIR, 'trend_history_v1.json');
const TREND_RETENTION_DAYS = 90;

const REPORTS = {
  runtimePreflight: 'docs/audits/founder_ops_dashboard_v1/runtime_preflight_v1.json',
  runtimeHealth: 'docs/audits/founder_ops_dashboard_v1/runtime_health_v1.json',
  quarantine: 'docs/audits/founder_ops_dashboard_v1/quarantine_report_v1.json',
  deferred: 'docs/audits/founder_ops_dashboard_v1/deferred_report_v1.json',
  imageSurface: 'docs/audits/image_truth_v1/image_surface_consistency_scan_v1.json',
  imageHosting: 'docs/audits/image_truth_v1/self_hosted_images_wh19a_final_image_hosting_state_scan_summary_v1.json',
  newSetLatest: 'docs/audits/new_set_release_ingestion_v1/20260714_abyss_eye_pitch_black/summary_v1.json',
  masterIndexCompletion: 'docs/audits/english_master_index_completion_v1/english_master_index_completion_v1.json',
  masterIndexPublishable: 'docs/audits/english_master_index_publishable_v1/english_master_index_publishable_manifest_v1.json',
  meeLatest: 'docs/audits/market_evidence_engine_v1/mee_nightly_droplet_worker_v1_2026-07-13T19-27-52-230Z.json',
  betaReadiness: 'docs/audits/grookai_beta_hardening_readiness_v1/grookai_beta_hardening_readiness_v1.json',
  appFlow: 'docs/audits/app_flow_prod_readiness_v1/app_flow_prod_readiness_v1.json',
  webCohesion: 'docs/audits/web_cohesion_link_integrity_v1/web_cohesion_link_integrity_v1.json',
  releaseReadiness: 'docs/audits/release_hardening_v1/release_readiness_matrix_20260517.json',
  supabaseSecurity: 'docs/audits/supabase_security_linter_v1/supabase_security_warn_remediation_v2_20260521.md',
};

function numberOrZero(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

function stringOrNull(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function valueAt(value, pathParts) {
  let current = value;
  for (const part of pathParts) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = current[part];
  }
  return current;
}

function arrayAt(value, key) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Array.isArray(value[key]) ? value[key] : [];
}

function objectAt(value, key) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const child = value[key];
  return child && typeof child === 'object' && !Array.isArray(child) ? child : null;
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatPct(numerator, denominator) {
  if (!denominator) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function parseLooseJson(text) {
  const trimmed = text.trim();
  const firstObject = trimmed.indexOf('{');
  const firstArray = trimmed.indexOf('[');
  const starts = [firstObject, firstArray].filter((index) => index >= 0);
  if (starts.length === 0) return null;
  return JSON.parse(trimmed.slice(Math.min(...starts)));
}

async function readJsonReport(relativePath) {
  try {
    const raw = await fs.readFile(relativePath, 'utf8');
    return parseLooseJson(raw);
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

async function readTextReport(relativePath) {
  try {
    return await fs.readFile(relativePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

function trendCard(id, title, category, status, primaryMetric, secondaryMetric) {
  return {
    id,
    title,
    category,
    status,
    primary_metric: primaryMetric,
    secondary_metric: secondaryMetric,
  };
}

async function buildTrendCards() {
  const [
    runtimePreflight,
    runtimeHealth,
    quarantine,
    deferred,
    imageSurface,
    imageHosting,
    newSet,
    masterIndexCompletion,
    masterIndexPublishable,
    mee,
    beta,
    appFlow,
    webCohesion,
    releaseReadiness,
    supabaseSecurityText,
  ] = await Promise.all([
    readJsonReport(REPORTS.runtimePreflight),
    readJsonReport(REPORTS.runtimeHealth),
    readJsonReport(REPORTS.quarantine),
    readJsonReport(REPORTS.deferred),
    readJsonReport(REPORTS.imageSurface),
    readJsonReport(REPORTS.imageHosting),
    readJsonReport(REPORTS.newSetLatest),
    readJsonReport(REPORTS.masterIndexCompletion),
    readJsonReport(REPORTS.masterIndexPublishable),
    readJsonReport(REPORTS.meeLatest),
    readJsonReport(REPORTS.betaReadiness),
    readJsonReport(REPORTS.appFlow),
    readJsonReport(REPORTS.webCohesion),
    readJsonReport(REPORTS.releaseReadiness),
    readTextReport(REPORTS.supabaseSecurity),
  ]);

  const runtimeStatus = stringOrNull(valueAt(runtimePreflight, ['status'])) ?? 'UNKNOWN';
  const runtimeCritical = numberOrZero(valueAt(runtimePreflight, ['summary', 'critical_fail_checks']));
  const runtimeDebt = numberOrZero(valueAt(runtimePreflight, ['summary', 'known_deferred_debt_checks']));

  const healthOk = valueAt(runtimeHealth, ['ok']) === true;
  const healthFailed = numberOrZero(valueAt(runtimeHealth, ['summary', 'failed_checks']));
  const healthGaps = numberOrZero(valueAt(runtimeHealth, ['summary', 'deferred_gap_count']));

  const quarantineUnresolved = numberOrZero(valueAt(quarantine, ['summary', 'unresolved_count']));
  const quarantineStale = numberOrZero(valueAt(quarantine, ['summary', 'stale_unresolved_count']));

  const deferredTotal = numberOrZero(valueAt(deferred, ['summary', 'total']));
  const deferredBlocked = numberOrZero(valueAt(deferred, ['summary', 'should_be_blocked_from_use']));
  const deferredArchitecture = numberOrZero(valueAt(deferred, ['summary', 'architecture_blocked']));

  const imageSurfacePassed = valueAt(imageSurface, ['surface_coverage', 'passed']) === true;
  const imageSurfaceGaps = numberOrZero(valueAt(imageSurface, ['parent_missing_child_available', 'count']));

  const hostingMetrics = objectAt(imageHosting, 'metrics');
  const priorityImageGaps =
    numberOrZero(hostingMetrics?.priority_parent_rows_without_any_image_field) +
    numberOrZero(hostingMetrics?.priority_child_rows_without_any_image_field);
  const englishImageGaps = numberOrZero(hostingMetrics?.english_physical_parent_rows_without_any_image_field);

  const newSetStopFindings = arrayAt(newSet, 'stop_findings').length;
  const newSetRows = arrayAt(newSet, 'sets').reduce(
    (sum, item) => sum + numberOrZero(valueAt(item, ['acquired_rows'])),
    0,
  );
  const newSetMode = stringOrNull(valueAt(newSet, ['mode']));

  const masterTotal = numberOrZero(valueAt(masterIndexPublishable, ['summary', 'total_sets']));
  const masterComplete = numberOrZero(valueAt(masterIndexPublishable, ['summary', 'publishable_complete_sets']));
  const masterNotPublishable = numberOrZero(valueAt(masterIndexPublishable, ['summary', 'not_publishable_sets']));
  const masterSourceGaps = numberOrZero(valueAt(masterIndexCompletion, ['summary', 'source_gap_queue_items']));

  const meeFindings = arrayAt(valueAt(mee, ['preflight']), 'findings').length;
  const meeExecution = arrayAt(mee, 'execution');
  const meeFailed = meeExecution.filter((item) => numberOrZero(valueAt(item, ['status'])) !== 0 && valueAt(item, ['skipped']) !== true).length;
  const meeSkipped = meeExecution.filter((item) => valueAt(item, ['skipped']) === true).length;

  const betaBlockers = arrayAt(beta, 'launch_blockers_ranked').length;
  const betaFollowups = arrayAt(beta, 'followups_ranked').length;

  const appFlowBlockers = numberOrZero(valueAt(appFlow, ['summary', 'blockers']));
  const appFlowWarnings = numberOrZero(valueAt(appFlow, ['summary', 'warnings']));

  const webBroken = numberOrZero(valueAt(webCohesion, ['summary', 'brokenRoutes']));
  const webDead = numberOrZero(valueAt(webCohesion, ['summary', 'deadInternalLinks']));
  const webWarnings = numberOrZero(valueAt(webCohesion, ['summary', 'warnings']));

  const releaseClassification = stringOrNull(valueAt(releaseReadiness, ['classification'])) ?? 'Unknown';
  const releaseLanes = objectAt(releaseReadiness, 'lanes') ?? {};
  const releaseNonPass = Object.entries(releaseLanes).filter(
    ([, lane]) => stringOrNull(valueAt(lane, ['status'])) !== 'pass' && stringOrNull(valueAt(lane, ['status'])) !== 'known_deferred',
  ).length;

  const securityWarningBlock = supabaseSecurityText
    ? /Remaining Security Advisor warning counts after apply:[\s\S]*?```text([\s\S]*?)```/m.exec(supabaseSecurityText)?.[1] ?? ''
    : '';
  const securityWarnings = Array.from(securityWarningBlock.matchAll(/([a-z_]+)\s+(\d+)/g)).reduce(
    (sum, match) => sum + Number(match[2]),
    0,
  );
  const securityLintErrors = supabaseSecurityText ? (supabaseSecurityText.match(/^- `[^`]+`:/gm) ?? []).length : 0;

  return [
    trendCard('runtime-preflight', 'Launch Gate', 'Launch', runtimeCritical > 0 || runtimeStatus === 'FAIL' ? 'critical' : runtimeDebt > 0 ? 'warning' : 'healthy', runtimeStatus, `${runtimeCritical} critical, ${runtimeDebt} deferred`),
    trendCard('runtime-health', 'Contract Runtime', 'Launch', !healthOk || healthFailed > 0 ? 'critical' : healthGaps > 0 ? 'warning' : 'healthy', healthOk ? 'Pass' : 'Fail', `${healthGaps} deferred runtime gaps`),
    trendCard('quarantine', 'Quarantine', 'Launch', quarantineStale > 0 ? 'critical' : quarantineUnresolved > 0 ? 'warning' : 'healthy', `${formatNumber(quarantineUnresolved)} unresolved`, `${formatNumber(quarantineStale)} stale`),
    trendCard('deferred-debt', 'Known Runtime Debt', 'Launch', deferredBlocked > 0 || deferredArchitecture > 0 ? 'warning' : 'healthy', `${formatNumber(deferredTotal)} gaps`, `${formatNumber(deferredBlocked)} blocked from use`),
    trendCard('image-surface', 'Image Surface Consistency', 'Catalog', imageSurfacePassed && imageSurfaceGaps === 0 ? 'healthy' : 'critical', imageSurfacePassed ? 'Pass' : 'Fail', `${formatNumber(imageSurfaceGaps)} fallback gaps`),
    trendCard('image-hosting', 'Self-hosted Image Coverage', 'Catalog', priorityImageGaps > 0 ? 'critical' : englishImageGaps > 0 ? 'warning' : 'healthy', `${formatNumber(priorityImageGaps)} priority gaps`, `${formatNumber(englishImageGaps)} English physical gaps`),
    trendCard('new-set-ingestion', 'New Set Ingestion', 'Ingestion', newSetStopFindings > 0 ? 'critical' : newSetMode === 'dry-run' ? 'warning' : 'healthy', stringOrNull(valueAt(newSet, ['status'])) ?? 'Unknown', `${formatNumber(newSetRows)} acquired rows`),
    trendCard('master-index', 'Master Index Health', 'Catalog', masterNotPublishable > 0 || masterSourceGaps > 0 ? 'warning' : 'healthy', `${formatPct(masterComplete, masterTotal)} publishable`, `${formatNumber(masterNotPublishable)} sets not publishable`),
    trendCard('market-evidence', 'Market Evidence Engine', 'Market', meeFindings > 0 || meeFailed > 0 ? 'critical' : meeSkipped > 0 ? 'warning' : 'healthy', stringOrNull(valueAt(mee, ['mode'])) ?? 'Unknown', `${formatNumber(meeFailed)} failed phases`),
    trendCard('beta-readiness', 'Beta Readiness', 'Product', betaBlockers > 0 ? 'critical' : betaFollowups > 0 ? 'warning' : 'healthy', stringOrNull(valueAt(beta, ['summary', 'launch_posture'])) ?? 'Unknown', `${formatNumber(betaBlockers)} blockers`),
    trendCard('app-flow', 'App Flow Readiness', 'Product', appFlowBlockers > 0 ? 'critical' : appFlowWarnings > 0 ? 'warning' : 'healthy', stringOrNull(valueAt(appFlow, ['summary', 'status'])) ?? 'Unknown', `${formatNumber(appFlowBlockers)} blockers, ${formatNumber(appFlowWarnings)} warnings`),
    trendCard('web-cohesion', 'Web Cohesion', 'Product', webBroken > 0 || webDead > 0 ? 'critical' : webWarnings > 0 ? 'warning' : 'healthy', `${formatNumber(webBroken + webDead)} broken`, `${formatNumber(webWarnings)} polish warnings`),
    trendCard('release-readiness', 'Release Readiness', 'Launch', releaseClassification === 'PRODUCTION_READY' && releaseNonPass === 0 ? 'healthy' : 'warning', releaseClassification, `${formatNumber(releaseNonPass)} lane issues`),
    trendCard('supabase-security', 'Supabase Security', 'Security', securityWarnings > 0 || securityLintErrors > 0 ? 'warning' : 'healthy', `${formatNumber(securityWarnings)} warnings`, `${formatNumber(securityLintErrors)} lint errors noted`),
  ];
}

async function writeJson(name, data) {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(
    path.join(OUT_DIR, name),
    `${JSON.stringify({
      collected_at: new Date().toISOString(),
      ...data,
    }, null, 2)}\n`,
    'utf8',
  );
}

async function updateTrendHistory(collectedAt) {
  const cards = await buildTrendCards();
  let previous = null;

  try {
    previous = JSON.parse(await fs.readFile(TREND_FILE, 'utf8'));
  } catch (error) {
    if (!error || error.code !== 'ENOENT') throw error;
  }

  const cutoff = Date.now() - TREND_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const existingSnapshots = Array.isArray(previous?.snapshots) ? previous.snapshots : [];
  const snapshots = [
    ...existingSnapshots.filter((snapshot) => {
      const timestamp = Date.parse(snapshot?.collected_at ?? '');
      return Number.isFinite(timestamp) && timestamp >= cutoff;
    }),
    {
      collected_at: collectedAt,
      cards,
    },
  ].sort((left, right) => String(left.collected_at).localeCompare(String(right.collected_at)));

  await fs.writeFile(
    TREND_FILE,
    `${JSON.stringify({
      schema_version: 1,
      generated_at: collectedAt,
      retention_days: TREND_RETENTION_DAYS,
      snapshots,
    }, null, 2)}\n`,
    'utf8',
  );
}

async function main() {
  const collectedAt = new Date().toISOString();
  const [runtimePreflight, runtimeHealth, quarantineReport, deferredReport] = await Promise.all([
    runRuntimePreflightV1(),
    runRuntimeHealthV1(),
    runQuarantineReportV1(),
    runDeferredReportV1(),
  ]);

  await Promise.all([
    writeJson('runtime_preflight_v1.json', runtimePreflight),
    writeJson('runtime_health_v1.json', runtimeHealth),
    writeJson('quarantine_report_v1.json', quarantineReport),
    writeJson('deferred_report_v1.json', deferredReport),
  ]);
  await updateTrendHistory(collectedAt);

  console.log(JSON.stringify({
    ok: true,
    out_dir: OUT_DIR,
    files: [
      'runtime_preflight_v1.json',
      'runtime_health_v1.json',
      'quarantine_report_v1.json',
      'deferred_report_v1.json',
      'trend_history_v1.json',
    ],
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
