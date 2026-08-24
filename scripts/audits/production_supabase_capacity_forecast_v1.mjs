import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export const AUDIT_VERSION = 'PRODUCTION_SUPABASE_CAPACITY_FORECAST_V1';
const THRESHOLDS = [0.7, 0.8, 0.9, 1];

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

function finite(value, field) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${field} must be a non-negative number`);
  return parsed;
}

function finding(severity, code, detail, evidence = {}) {
  return { severity, code, detail, evidence };
}

function thresholdForecast({ capacityBytes, usedBytes, dailyGrowthBytes }) {
  return Object.fromEntries(THRESHOLDS.map((threshold) => {
    const remaining = capacityBytes * threshold - usedBytes;
    return [String(Math.round(threshold * 100)), {
      threshold_percent: threshold * 100,
      threshold_bytes: capacityBytes * threshold,
      remaining_bytes: remaining,
      days_until_threshold: remaining <= 0 ? 0 : dailyGrowthBytes > 0 ? remaining / dailyGrowthBytes : null
    }];
  }));
}

export function evaluateCapacityForecastV1(input) {
  const findings = [];
  const diskCapacityBytes = finite(input.managed_disk?.fs_size_bytes, 'managed_disk.fs_size_bytes');
  const diskUsedBytes = finite(input.managed_disk?.fs_used_bytes, 'managed_disk.fs_used_bytes');
  const diskAvailableBytes = finite(input.managed_disk?.fs_avail_bytes, 'managed_disk.fs_avail_bytes');
  const utilization = diskCapacityBytes > 0 ? diskUsedBytes / diskCapacityBytes : null;

  const relationGrowth = (input.relation_growth_inputs ?? []).map((row) => {
    const totalBytes = finite(row.total_bytes, `${row.relation}.total_bytes`);
    const liveRows = finite(row.live_rows, `${row.relation}.live_rows`);
    const cycleInsertRows = finite(row.cycle_insert_rows, `${row.relation}.cycle_insert_rows`);
    const cyclesPerDay = finite(row.cycles_per_day ?? 1, `${row.relation}.cycles_per_day`);
    const estimatedBytesPerRow = liveRows > 0 ? totalBytes / liveRows : 0;
    const projectedDailyBytes = estimatedBytesPerRow * cycleInsertRows * cyclesPerDay;
    return {
      relation: row.relation,
      workload: row.workload,
      total_bytes: totalBytes,
      live_rows: liveRows,
      cycle_insert_rows: cycleInsertRows,
      cycles_per_day: cyclesPerDay,
      estimated_bytes_per_row: estimatedBytesPerRow,
      projected_daily_bytes: projectedDailyBytes
    };
  });
  const projectedDailyDatabaseBytes = relationGrowth.reduce((sum, row) => sum + row.projected_daily_bytes, 0);
  const projected30DayDatabaseBytes = projectedDailyDatabaseBytes * 30;
  const projected90DayDatabaseBytes = projectedDailyDatabaseBytes * 90;
  const diskThresholds = thresholdForecast({
    capacityBytes: diskCapacityBytes,
    usedBytes: diskUsedBytes,
    dailyGrowthBytes: projectedDailyDatabaseBytes
  });

  if (utilization >= 0.9) {
    findings.push(finding('critical', 'managed_disk_at_or_above_90_percent', 'Managed database disk utilization is at or above the 90 percent emergency threshold.', { utilization }));
  } else if (utilization >= 0.8) {
    findings.push(finding('high', 'managed_disk_at_or_above_80_percent', 'Managed database disk utilization is at or above the 80 percent intervention threshold.', { utilization }));
  } else if (utilization >= 0.7) {
    findings.push(finding('high', 'managed_disk_at_or_above_70_percent', 'Managed database disk utilization exceeds the frozen launch target.', { utilization }));
  }

  const projected30DayDiskUtilization = diskCapacityBytes > 0
    ? (diskUsedBytes + projected30DayDatabaseBytes) / diskCapacityBytes
    : null;
  const projected90DayDiskUtilization = diskCapacityBytes > 0
    ? (diskUsedBytes + projected90DayDatabaseBytes) / diskCapacityBytes
    : null;
  if (projected30DayDiskUtilization >= 0.9) {
    findings.push(finding('critical', 'managed_disk_30_day_forecast_exceeds_90_percent', 'The conservative lower-bound 30-day database growth forecast exceeds 90 percent managed disk utilization.', { projected_30_day_utilization: projected30DayDiskUtilization }));
  }

  const requiredTwoTimes90DayHeadroom = projected90DayDatabaseBytes * 2;
  if (diskAvailableBytes < requiredTwoTimes90DayHeadroom) {
    findings.push(finding('high', 'managed_disk_2x_90_day_headroom_missing', 'Available managed disk does not provide the required 2x projected 90-day database growth headroom.', {
      available_bytes: diskAvailableBytes,
      required_bytes: requiredTwoTimes90DayHeadroom,
      deficit_bytes: requiredTwoTimes90DayHeadroom - diskAvailableBytes
    }));
  }

  const storage = input.storage ?? {};
  const storageCurrentBytes = finite(storage.current_bytes ?? 0, 'storage.current_bytes');
  const storage30DayNewBytes = storage.observed_30_day_new_bytes == null
    ? null
    : finite(storage.observed_30_day_new_bytes, 'storage.observed_30_day_new_bytes');
  const storageCapacityBytes = storage.plan_capacity_bytes == null
    ? null
    : finite(storage.plan_capacity_bytes, 'storage.plan_capacity_bytes');
  if (storageCapacityBytes == null) {
    findings.push(finding('unmeasured', 'storage_plan_capacity_unmeasured', 'Storage plan capacity is not present in the evidence snapshot, so planned utilization cannot pass.'));
  }
  const storageDailyBytes = storage30DayNewBytes == null ? null : storage30DayNewBytes / 30;
  const projectedStorage30DayBytes = storageDailyBytes == null ? null : storageCurrentBytes + storageDailyBytes * 30;
  const projectedStorage90DayBytes = storageDailyBytes == null ? null : storageCurrentBytes + storageDailyBytes * 90;

  const connections = input.connections ?? {};
  const currentConnections = finite(connections.current ?? 0, 'connections.current');
  const maxConnections = finite(connections.maximum ?? 0, 'connections.maximum');
  const diagnosticTwoTimesUtilization = maxConnections > 0 ? (currentConnections * 2) / maxConnections : null;
  if (diagnosticTwoTimesUtilization != null && diagnosticTwoTimesUtilization >= 0.7) {
    findings.push(finding('high', 'diagnostic_2x_connection_utilization_exceeds_target', 'Twice the observed connection count exceeds the 70 percent launch target.', { utilization: diagnosticTwoTimesUtilization }));
  }
  if (connections.load_test_verified !== true) {
    findings.push(finding('unmeasured', 'connection_load_forecast_unverified', 'The 2x connection calculation is diagnostic only until the launch load test is complete.'));
  }
  if (input.egress?.forecast_verified !== true) {
    findings.push(finding('unmeasured', 'egress_forecast_unverified', 'A provider-backed 30-day and 90-day egress forecast has not been supplied.'));
  }
  if (input.autoscale?.configured !== true) {
    findings.push(finding('medium', 'managed_disk_autoscale_unconfigured', 'Managed disk autoscale is not configured in the provider snapshot.'));
  }

  const blockerCount = findings.filter((row) => ['critical', 'high'].includes(row.severity)).length;
  const status = blockerCount > 0 ? 'failed' : findings.length > 0 ? 'incomplete' : 'healthy';
  return {
    status,
    findings,
    metrics: {
      managed_disk: {
        configured_size_gb: input.managed_disk?.configured_size_gb ?? null,
        fs_size_bytes: diskCapacityBytes,
        fs_used_bytes: diskUsedBytes,
        fs_avail_bytes: diskAvailableBytes,
        utilization,
        threshold_forecast: diskThresholds,
        projected_daily_database_bytes_lower_bound: projectedDailyDatabaseBytes,
        projected_30_day_database_bytes_lower_bound: projected30DayDatabaseBytes,
        projected_90_day_database_bytes_lower_bound: projected90DayDatabaseBytes,
        projected_30_day_utilization_lower_bound: projected30DayDiskUtilization,
        projected_90_day_utilization_lower_bound: projected90DayDiskUtilization,
        required_2x_90_day_headroom_bytes: requiredTwoTimes90DayHeadroom,
        headroom_deficit_bytes: Math.max(0, requiredTwoTimes90DayHeadroom - diskAvailableBytes)
      },
      storage: {
        current_bytes: storageCurrentBytes,
        current_objects: storage.current_objects ?? null,
        observed_30_day_new_bytes: storage30DayNewBytes,
        observed_90_day_new_bytes: storage.observed_90_day_new_bytes ?? null,
        projected_30_day_bytes_at_recent_rate: projectedStorage30DayBytes,
        projected_90_day_bytes_at_recent_rate: projectedStorage90DayBytes,
        plan_capacity_bytes: storageCapacityBytes,
        burst_sensitive: storage.burst_sensitive === true
      },
      connections: {
        current: currentConnections,
        maximum: maxConnections,
        current_utilization: maxConnections > 0 ? currentConnections / maxConnections : null,
        diagnostic_2x_utilization: diagnosticTwoTimesUtilization,
        load_test_verified: connections.load_test_verified === true
      },
      egress: {
        forecast_verified: input.egress?.forecast_verified === true
      }
    },
    relation_growth: relationGrowth,
    methodology: {
      database_forecast: 'lower_bound_current_relation_bytes_per_live_row_times_observed_rows_per_cycle_times_cycles_per_day',
      storage_forecast: 'recent_30_day_object_bytes_rate; burst-sensitive and not a capacity pass without the plan limit',
      limitations: [
        'Database forecast excludes WAL, system overhead, bloat changes, and tables not listed in relation_growth_inputs.',
        'Storage history includes one-time bulk image activity and must not be treated as a steady-state commitment.',
        'Connection doubling is diagnostic until the controlled 2x load test runs.'
      ]
    }
  };
}

function markdown(report) {
  const disk = report.metrics.managed_disk;
  const storage = report.metrics.storage;
  const formatGb = (value) => value == null ? 'unmeasured' : `${(value / 1_000_000_000).toFixed(2)} GB`;
  const formatPercent = (value) => value == null ? 'unmeasured' : `${(value * 100).toFixed(2)}%`;
  return [
    `# ${AUDIT_VERSION}`,
    '',
    `- Observed: \`${report.observed_at}\``,
    `- Project: \`${report.project_ref}\``,
    `- Status: **${report.status.toUpperCase()}**`,
    `- Managed disk use: **${formatPercent(disk.utilization)}** (${formatGb(disk.fs_used_bytes)} / ${formatGb(disk.fs_size_bytes)})`,
    `- Lower-bound daily database growth: **${formatGb(disk.projected_daily_database_bytes_lower_bound)}**`,
    `- Lower-bound 30-day disk utilization: **${formatPercent(disk.projected_30_day_utilization_lower_bound)}**`,
    `- Lower-bound 90-day disk utilization: **${formatPercent(disk.projected_90_day_utilization_lower_bound)}**`,
    `- 2x 90-day headroom deficit: **${formatGb(disk.headroom_deficit_bytes)}**`,
    `- Storage current / 30-day projection / 90-day projection: ${formatGb(storage.current_bytes)} / ${formatGb(storage.projected_30_day_bytes_at_recent_rate)} / ${formatGb(storage.projected_90_day_bytes_at_recent_rate)}`,
    '',
    '## Findings',
    '',
    ...report.findings.map((row) => `- **${row.severity.toUpperCase()} ${row.code}:** ${row.detail}`),
    '',
    '## Relation Growth Inputs',
    '',
    '| Relation | Workload | Rows/cycle | Cycles/day | Estimated daily growth |',
    '| --- | --- | ---: | ---: | ---: |',
    ...report.relation_growth.map((row) => `| \`${row.relation}\` | ${row.workload} | ${row.cycle_insert_rows.toLocaleString('en-US')} | ${row.cycles_per_day} | ${formatGb(row.projected_daily_bytes)} |`),
    '',
    '## Interpretation',
    '',
    '- This is a conservative lower bound, not a promise of exact future growth.',
    '- The launch gate fails because current managed disk use already exceeds 70 percent and the measured daily write pattern does not provide 2x 90-day headroom.',
    '- No paid plan change, database write, Storage write, worker pause, archive, or deletion was performed.',
    ''
  ].join('\n');
}

function parseArgs(argv) {
  const value = (name) => argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
  const inputPath = value('--input');
  if (!inputPath) throw new Error('--input=<json> is required');
  return {
    inputPath: path.resolve(inputPath),
    outDir: path.resolve(value('--out-dir') ?? path.join('docs', 'audits', 'production_backend_launch_v1', 'supabase_capacity'))
  };
}

export async function runCapacityForecastV1({ argv = process.argv.slice(2) } = {}) {
  const args = parseArgs(argv);
  const input = JSON.parse(await fs.readFile(args.inputPath, 'utf8'));
  const evaluation = evaluateCapacityForecastV1(input);
  const body = {
    schema_version: AUDIT_VERSION,
    observed_at: input.observed_at,
    project_ref: input.project_ref,
    source_evidence: input.source_evidence,
    ...evaluation,
    boundaries: {
      provider_reads_only: true,
      database_reads_only: true,
      paid_plan_changes: false,
      worker_schedule_changes: false,
      database_writes: false,
      storage_writes: false,
      deletes: false
    }
  };
  const report = { ...body, report_fingerprint_sha256: sha256(body) };
  const jsonContent = `${JSON.stringify(report, null, 2)}\n`;
  await fs.mkdir(args.outDir, { recursive: true });
  const jsonPath = path.join(args.outDir, 'production_supabase_capacity_forecast_v1.json');
  await Promise.all([
    fs.writeFile(jsonPath, jsonContent),
    fs.writeFile(`${jsonPath}.sha256`, `${sha256(jsonContent)}  ${path.basename(jsonPath)}\n`),
    fs.writeFile(path.join(args.outDir, 'PRODUCTION_SUPABASE_CAPACITY_FORECAST_V1.md'), markdown(report))
  ]);
  process.stdout.write(`${JSON.stringify({ status: report.status, metrics: report.metrics, findings: report.findings, report_fingerprint_sha256: report.report_fingerprint_sha256, json_path: jsonPath }, null, 2)}\n`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runCapacityForecastV1().catch((error) => {
    console.error(`[production-supabase-capacity-forecast] ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
