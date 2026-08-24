import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import '../../backend/env.mjs';

export const METRICS_VERSION = 'PRODUCTION_SUPABASE_METRICS_SNAPSHOT_V1';

function text(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length ? normalized : null;
}

function parseArgs(argv) {
  const value = (name) => argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
  const projectRef = text(value('--project-ref') ?? process.env.SUPABASE_PROJECT_REF);
  if (!/^[a-z0-9]{20}$/.test(projectRef ?? '')) throw new Error('--project-ref must be a 20-character Supabase project ref');
  const samples = Number(value('--samples') ?? 6);
  const intervalSeconds = Number(value('--interval-seconds') ?? 15);
  if (!Number.isInteger(samples) || samples < 2 || samples > 20) throw new Error('--samples must be an integer from 2 through 20');
  if (!Number.isFinite(intervalSeconds) || intervalSeconds < 1 || intervalSeconds > 60) throw new Error('--interval-seconds must be from 1 through 60');
  return {
    projectRef,
    samples,
    intervalSeconds,
    outDir: path.resolve(value('--out-dir') ?? path.join('docs', 'audits', 'production_backend_launch_v1', 'supabase_metrics'))
  };
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

function labelsFrom(textValue = '') {
  const labels = {};
  for (const match of textValue.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)="((?:\\.|[^"])*)"/g)) {
    labels[match[1]] = match[2].replaceAll('\\"', '"').replaceAll('\\\\', '\\');
  }
  return labels;
}

export function parsePrometheusV1(source) {
  const rows = [];
  for (const rawLine of String(source).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{(.*)\})?\s+([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?|NaN|Inf|-Inf)(?:\s+\d+)?$/);
    if (!match) continue;
    rows.push({ name: match[1], labels: labelsFrom(match[2]), value: Number(match[3]) });
  }
  return rows;
}

function byName(rows, name, predicate = () => true) {
  return rows.filter((row) => row.name === name && predicate(row));
}

function scalar(rows, name, predicate = () => true) {
  return byName(rows, name, predicate)[0]?.value ?? null;
}

function counterKey(row) {
  return `${row.labels.cpu ?? ''}:${row.labels.mode ?? ''}`;
}

export function calculateCpuUtilizationV1(previousRows, currentRows) {
  const previous = new Map(byName(previousRows, 'node_cpu_seconds_total', (row) => row.labels.service_type === 'db').map((row) => [counterKey(row), row.value]));
  let totalDelta = 0;
  let idleDelta = 0;
  for (const row of byName(currentRows, 'node_cpu_seconds_total', (candidate) => candidate.labels.service_type === 'db')) {
    const oldValue = previous.get(counterKey(row));
    if (!Number.isFinite(oldValue) || row.value < oldValue) continue;
    const delta = row.value - oldValue;
    totalDelta += delta;
    if (['idle', 'iowait'].includes(row.labels.mode)) idleDelta += delta;
  }
  if (totalDelta <= 0) return null;
  return Math.max(0, Math.min(1, 1 - idleDelta / totalDelta));
}

export function derivePointMetricsV1(rows) {
  const isDb = (row) => row.labels.service_type === 'db';
  const totalMemory = scalar(rows, 'node_memory_MemTotal_bytes', isDb);
  const availableMemory = scalar(rows, 'node_memory_MemAvailable_bytes', isDb);
  const memoryUtilization = Number.isFinite(totalMemory) && totalMemory > 0 && Number.isFinite(availableMemory)
    ? 1 - availableMemory / totalMemory
    : null;
  const dataSize = scalar(rows, 'node_filesystem_size_bytes', (row) => isDb(row) && row.labels.mountpoint === '/data');
  const dataAvailable = scalar(rows, 'node_filesystem_avail_bytes', (row) => isDb(row) && row.labels.mountpoint === '/data');
  const dataUtilization = Number.isFinite(dataSize) && dataSize > 0 && Number.isFinite(dataAvailable)
    ? 1 - dataAvailable / dataSize
    : null;
  const onlineCpuCount = byName(rows, 'node_cpu_online', isDb).filter((row) => row.value === 1).length;
  return {
    memory_total_bytes: totalMemory,
    memory_available_bytes: availableMemory,
    memory_utilization: memoryUtilization,
    load_1m: scalar(rows, 'node_load1', isDb),
    load_5m: scalar(rows, 'node_load5', isDb),
    load_15m: scalar(rows, 'node_load15', isDb),
    online_cpu_count: onlineCpuCount || null,
    data_filesystem_bytes: dataSize,
    data_filesystem_utilization: dataUtilization
  };
}

function finding(severity, code, detail, evidence = {}) {
  return { severity, code, detail, evidence };
}

export function evaluateMetricsSeriesV1(series) {
  const findings = [];
  const cpuValues = series.slice(1).map((row) => row.cpu_utilization).filter(Number.isFinite);
  const memoryValues = series.map((row) => row.memory_utilization).filter(Number.isFinite);
  const maxCpu = cpuValues.length ? Math.max(...cpuValues) : null;
  const averageCpu = cpuValues.length ? cpuValues.reduce((sum, value) => sum + value, 0) / cpuValues.length : null;
  const maxMemory = memoryValues.length ? Math.max(...memoryValues) : null;
  const latest = series.at(-1) ?? {};
  if (maxCpu === null) findings.push(finding('unmeasured', 'cpu_utilization_unmeasured', 'CPU utilization could not be derived from successive counter scrapes.'));
  else if (maxCpu >= 0.9) findings.push(finding('critical', 'cpu_utilization_at_or_above_90_percent', 'Observed CPU utilization reached 90%.', { maximum: maxCpu, average: averageCpu }));
  else if (maxCpu >= 0.8) findings.push(finding('high', 'cpu_utilization_at_or_above_80_percent', 'Observed CPU utilization reached the launch warning threshold.', { maximum: maxCpu, average: averageCpu }));
  if (maxMemory === null) findings.push(finding('unmeasured', 'memory_utilization_unmeasured', 'Memory utilization could not be derived.'));
  else if (maxMemory >= 0.9) findings.push(finding('critical', 'memory_utilization_at_or_above_90_percent', 'Observed memory utilization reached 90%.', { maximum: maxMemory }));
  else if (maxMemory >= 0.8) findings.push(finding('high', 'memory_utilization_at_or_above_80_percent', 'Observed memory utilization reached the launch warning threshold.', { maximum: maxMemory }));
  if (Number.isFinite(latest.load_15m) && Number.isFinite(latest.online_cpu_count) && latest.load_15m > latest.online_cpu_count * 1.5) {
    findings.push(finding('high', 'load_15m_above_cpu_capacity', 'The 15-minute load average exceeds 1.5 times online CPU count.', { load_15m: latest.load_15m, online_cpu_count: latest.online_cpu_count }));
  }
  const blockers = findings.filter((row) => ['critical', 'high'].includes(row.severity));
  return {
    status: blockers.length ? 'blocked' : findings.length ? 'incomplete' : 'healthy',
    findings,
    metrics: {
      sample_count: series.length,
      cpu_interval_count: cpuValues.length,
      cpu_utilization_average: averageCpu,
      cpu_utilization_maximum: maxCpu,
      memory_utilization_maximum: maxMemory,
      memory_utilization_latest: latest.memory_utilization ?? null,
      load_1m_latest: latest.load_1m ?? null,
      load_5m_latest: latest.load_5m ?? null,
      load_15m_latest: latest.load_15m ?? null,
      online_cpu_count: latest.online_cpu_count ?? null,
      data_filesystem_utilization: latest.data_filesystem_utilization ?? null
    }
  };
}

async function scrape(projectRef) {
  const secret = text(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!secret) throw new Error('SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required');
  const authorization = Buffer.from(`service_role:${secret}`).toString('base64');
  const response = await fetch(`https://${projectRef}.supabase.co/customer/v1/privileged/metrics`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${authorization}`,
      Accept: 'text/plain',
      'User-Agent': 'grookai-server-monitor/1.0'
    },
    signal: AbortSignal.timeout(45_000)
  });
  if (!response.ok) throw new Error(`Supabase Metrics API returned HTTP ${response.status}`);
  return parsePrometheusV1(await response.text());
}

function markdown(report) {
  const percent = (value) => Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : 'unmeasured';
  return [
    `# ${METRICS_VERSION}`,
    '',
    `- Observed: \`${report.observed_at}\``,
    `- Status: **${report.status.toUpperCase()}**`,
    `- Samples: \`${report.metrics.sample_count}\` over \`${report.sample_window_seconds} seconds\``,
    `- CPU average: \`${percent(report.metrics.cpu_utilization_average)}\``,
    `- CPU maximum: \`${percent(report.metrics.cpu_utilization_maximum)}\``,
    `- Memory maximum: \`${percent(report.metrics.memory_utilization_maximum)}\``,
    `- Data filesystem: \`${percent(report.metrics.data_filesystem_utilization)}\``,
    '',
    '## Findings',
    '',
    ...(report.findings.length ? report.findings.map((row) => `- **${row.severity.toUpperCase()} ${row.code}:** ${row.detail}`) : ['- none']),
    '',
    '## Boundaries',
    '',
    '- Metrics endpoint requests: GET only',
    '- Raw Prometheus payload persisted: no',
    '- Credentials persisted: no',
    '- Provider configuration changes: none',
    '- Database writes: none',
    ''
  ].join('\n');
}

export async function runSupabaseMetricsSnapshotV1({ argv = process.argv.slice(2), now = new Date() } = {}) {
  const args = parseArgs(argv);
  const series = [];
  let previousRows = null;
  for (let index = 0; index < args.samples; index += 1) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, args.intervalSeconds * 1000));
    const rows = await scrape(args.projectRef);
    const point = derivePointMetricsV1(rows);
    series.push({
      observed_at: new Date().toISOString(),
      ...point,
      cpu_utilization: previousRows ? calculateCpuUtilizationV1(previousRows, rows) : null
    });
    previousRows = rows;
  }
  const evaluation = evaluateMetricsSeriesV1(series);
  const body = {
    schema_version: METRICS_VERSION,
    observed_at: now.toISOString(),
    project_ref: args.projectRef,
    sample_window_seconds: (args.samples - 1) * args.intervalSeconds,
    ...evaluation,
    series,
    boundaries: {
      metrics_api_get_only: true,
      raw_prometheus_persisted: false,
      credentials_persisted: false,
      provider_configuration_changes: false,
      database_writes: false
    }
  };
  const report = { ...body, report_fingerprint_sha256: sha256(body) };
  await fs.mkdir(args.outDir, { recursive: true });
  const jsonPath = path.join(args.outDir, 'production_supabase_metrics_snapshot_v1.json');
  const markdownPath = path.join(args.outDir, 'PRODUCTION_SUPABASE_METRICS_SNAPSHOT_V1.md');
  const jsonContent = `${JSON.stringify(report, null, 2)}\n`;
  await Promise.all([
    fs.writeFile(jsonPath, jsonContent),
    fs.writeFile(`${jsonPath}.sha256`, `${sha256(jsonContent)}  ${path.basename(jsonPath)}\n`),
    fs.writeFile(markdownPath, markdown(report))
  ]);
  process.stdout.write(`${JSON.stringify({ status: report.status, metrics: report.metrics, report_fingerprint_sha256: report.report_fingerprint_sha256, artifacts: { json: jsonPath, markdown: markdownPath } }, null, 2)}\n`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runSupabaseMetricsSnapshotV1().catch((error) => {
    console.error(`[production-supabase-metrics-snapshot] ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
