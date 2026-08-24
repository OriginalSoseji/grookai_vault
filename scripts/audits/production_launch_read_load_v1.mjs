import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

import pg from 'pg';

const { Client } = pg;
export const LOAD_POLICY_VERSION = 'PRODUCTION_LAUNCH_READ_LOAD_V1';
const SEARCH_QUERIES = ['pikachu', 'charizard', 'mew', 'gengar', 'eevee'];

function clean(value) {
  const result = String(value ?? '').trim();
  return result || null;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function nearestRankPercentileV1(values, percentile) {
  if (!values.length) return null;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil((percentile / 100) * ordered.length) - 1)];
}

export function deriveLoadEnvelopeV1({ peakEventsPerMinute, targetRps }) {
  const observedPeakRps = peakEventsPerMinute / 60;
  return {
    observed_peak_events_per_minute: peakEventsPerMinute,
    observed_peak_rps: Number(observedPeakRps.toFixed(3)),
    target_rps: targetRps,
    load_multiplier: Number((targetRps / observedPeakRps).toFixed(3)),
    satisfies_2x: targetRps >= observedPeakRps * 2
  };
}

export function requestKindForIndexV1(index) {
  const slot = index % 20;
  if (slot < 8) return 'search';
  if (slot < 13) return 'pricing_detail';
  if (slot < 16) return 'pricing_grid';
  return 'image_head';
}

function summarizeKind(rows, kind, targetP95Ms) {
  const selected = rows.filter((row) => row.kind === kind);
  const successes = selected.filter((row) => row.ok);
  const latencies = selected.map((row) => row.latency_ms).filter(Number.isFinite);
  const p95 = nearestRankPercentileV1(latencies, 95);
  return {
    kind,
    request_count: selected.length,
    success_count: successes.length,
    failure_count: selected.length - successes.length,
    latency_ms: {
      p50: nearestRankPercentileV1(latencies, 50),
      p95,
      p99: nearestRankPercentileV1(latencies, 99),
      maximum: latencies.length ? Math.max(...latencies) : null
    },
    target_p95_ms: targetP95Ms,
    status: selected.length > 0 && successes.length === selected.length && p95 <= targetP95Ms
      ? 'passed'
      : 'failed'
  };
}

export function summarizeLoadV1({ rows, dbSnapshots, plannedRequests, envelope, aborted }) {
  const byKind = [
    summarizeKind(rows, 'search', 800),
    summarizeKind(rows, 'pricing_detail', 400),
    summarizeKind(rows, 'pricing_grid', 400),
    summarizeKind(rows, 'image_head', 2000)
  ];
  const failures = rows.filter((row) => !row.ok);
  const rateLimits = rows.filter((row) => row.http_status === 429);
  const maxConnectionUtilization = Math.max(
    0,
    ...dbSnapshots.map((row) => Number(row.connection_utilization ?? 0))
  );
  const waitingLocks = Math.max(0, ...dbSnapshots.map((row) => Number(row.waiting_locks ?? 0)));
  const findings = [];
  if (aborted) findings.push('load_aborted');
  if (rows.length !== plannedRequests) findings.push('request_reconciliation_mismatch');
  if (failures.length / Math.max(1, rows.length) >= 0.01) findings.push('error_rate_at_or_above_1_percent');
  if (rateLimits.length > 0) findings.push('rate_limit_observed');
  if (!envelope.satisfies_2x) findings.push('load_below_2x_observed_peak');
  if (maxConnectionUtilization >= 0.7) findings.push('connection_utilization_at_or_above_70_percent');
  if (waitingLocks > 0) findings.push('waiting_lock_observed');
  for (const row of byKind) {
    if (row.status !== 'passed') findings.push(`${row.kind}_target_failed`);
  }
  return {
    status: findings.length === 0 ? 'passed' : 'failed',
    planned_requests: plannedRequests,
    completed_requests: rows.length,
    successful_requests: rows.length - failures.length,
    failed_requests: failures.length,
    error_rate: failures.length / Math.max(1, rows.length),
    rate_limit_count: rateLimits.length,
    max_connection_utilization: maxConnectionUtilization,
    maximum_waiting_locks: waitingLocks,
    envelope,
    endpoints: byKind,
    findings
  };
}

export function shouldAbortLoadV1(rows, { minimum = 200, maxErrorRate = 0.05 } = {}) {
  if (rows.length < minimum) return false;
  const failures = rows.filter((row) => !row.ok).length;
  const rateLimits = rows.filter((row) => row.http_status === 429).length;
  return failures / rows.length > maxErrorRate || rateLimits / rows.length > 0.01;
}

function parseArgs(argv) {
  const value = (name) => argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
  const number = (name, fallback) => Number(value(name) ?? fallback);
  const args = {
    rps: number('--rps', 33),
    expectedPeakRps: number('--expected-peak-rps', 16.05),
    durationSeconds: number('--duration-seconds', 300),
    maxRequests: number('--max-requests', 10_000),
    maxInFlight: number('--max-in-flight', 100),
    timeoutMs: number('--timeout-ms', 15_000),
    monitorIntervalMs: number('--monitor-interval-ms', 5_000),
    outDir: path.resolve(value('--out-dir') ?? path.join('docs', 'audits', 'production_backend_launch_v1', 'read_load')),
    allowProduction: argv.includes('--allow-production'),
    requirePass: argv.includes('--require-pass')
  };
  for (const [key, numberValue] of Object.entries(args)) {
    if (typeof numberValue === 'number' && (!Number.isFinite(numberValue) || numberValue <= 0)) {
      throw new Error(`${key} must be positive`);
    }
  }
  if (!args.allowProduction) throw new Error('--allow-production is required');
  const planned = Math.floor(args.rps * args.durationSeconds);
  if (planned > args.maxRequests) throw new Error(`planned request count ${planned} exceeds --max-requests`);
  return { ...args, plannedRequests: planned };
}

function requiredEnvironment() {
  const result = {
    databaseUrl: clean(process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL),
    supabaseUrl: clean(process.env.SUPABASE_URL),
    publishableKey: clean(process.env.SUPABASE_PUBLISHABLE_KEY),
    secretKey: clean(process.env.SUPABASE_SECRET_KEY),
    webBaseUrl: clean(process.env.PRODUCTION_WEB_BASE_URL) ?? 'https://grookaivault.com'
  };
  if (!result.databaseUrl || !result.supabaseUrl || !result.publishableKey || !result.secretKey) {
    throw new Error('database URL, Supabase URL, publishable key, and secret key are required');
  }
  return result;
}

function gitValue(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

async function loadSamples(client) {
  const pricingRows = (await client.query(`
    select distinct current_price.card_print_id
    from public.v_market_price_current_v1 current_price
    where current_price.card_print_id is not null
    order by current_price.card_print_id
    limit 50
  `)).rows.map((row) => row.card_print_id);
  const imageRows = (await client.query(`
    select card.gv_id
    from public.card_prints card
    join public.games game on game.id = card.game_id
    where lower(game.code) = 'pokemon'
      and card.gv_id is not null
      and card.image_path is not null
      and btrim(card.image_path) <> ''
    order by card.gv_id
    limit 200
  `)).rows.map((row) => row.gv_id);
  if (pricingRows.length < 25 || imageRows.length < 100) throw new Error('load samples are incomplete');
  return { pricingRows, imageRows };
}

async function dbSnapshot(client, phase) {
  const result = await client.query(`
    select
      now() as observed_at,
      $1::text as phase,
      (select setting::int from pg_settings where name = 'max_connections') as max_connections,
      (select count(*)::int from pg_stat_activity) as current_connections,
      (select count(*)::int from pg_stat_activity where state = 'active') as active_connections,
      (select count(*)::int from pg_stat_activity where wait_event is not null) as waiting_connections,
      (select count(*)::int from pg_locks where not granted) as waiting_locks
  `, [phase]);
  const row = result.rows[0];
  return {
    ...row,
    connection_utilization: Number(row.current_connections) / Number(row.max_connections)
  };
}

async function measuredFetch(kind, url, options, validate, timeoutMs) {
  const started = performance.now();
  try {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
    const body = options.method === 'HEAD' ? '' : await response.text();
    let parsed = null;
    if (body) {
      try { parsed = JSON.parse(body); } catch { parsed = null; }
    }
    const validation = validate({ response, body, parsed });
    return {
      kind,
      ok: response.ok && validation.ok,
      http_status: response.status,
      latency_ms: Number((performance.now() - started).toFixed(3)),
      response_bytes: Buffer.byteLength(body),
      validation: validation.reason ?? null,
      error: response.ok && validation.ok ? null : validation.reason ?? `http_${response.status}`
    };
  } catch (error) {
    return {
      kind,
      ok: false,
      http_status: null,
      latency_ms: Number((performance.now() - started).toFixed(3)),
      response_bytes: 0,
      validation: null,
      error: String(error?.cause?.code ?? error?.name ?? error).slice(0, 120)
    };
  }
}

function buildRequest(index, env, samples, timeoutMs) {
  const kind = requestKindForIndexV1(index);
  if (kind === 'search') {
    const query = SEARCH_QUERIES[index % SEARCH_QUERIES.length];
    return measuredFetch(
      kind,
      `${env.supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/search_print_identity_v1`,
      {
        method: 'POST',
        headers: { apikey: env.publishableKey, Authorization: `Bearer ${env.publishableKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, set_code_in: null, number_in: null, object_type_in: null, limit_in: 50, offset_in: 0 })
      },
      ({ parsed }) => ({ ok: Array.isArray(parsed) && parsed.length > 0, reason: Array.isArray(parsed) && parsed.length > 0 ? null : 'empty_or_invalid_search' }),
      timeoutMs
    );
  }
  if (kind === 'pricing_detail' || kind === 'pricing_grid') {
    const ids = kind === 'pricing_detail'
      ? [samples.pricingRows[index % samples.pricingRows.length]]
      : samples.pricingRows.slice(0, 25);
    return measuredFetch(
      kind,
      `${env.supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/get_market_pricing_read_model_v1`,
      {
        method: 'POST',
        headers: { apikey: env.secretKey, Authorization: `Bearer ${env.secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_card_print_ids: ids, p_card_printing_ids: null })
      },
      ({ parsed }) => ({ ok: Array.isArray(parsed) && parsed.length === ids.length, reason: Array.isArray(parsed) && parsed.length === ids.length ? null : 'pricing_row_count_mismatch' }),
      timeoutMs
    );
  }
  const gvId = samples.imageRows[index % samples.imageRows.length];
  return measuredFetch(
    kind,
    `${env.webBaseUrl.replace(/\/$/, '')}/api/canon/cards/${encodeURIComponent(gvId)}/image`,
    { method: 'HEAD' },
    ({ response }) => ({ ok: /^image\//i.test(response.headers.get('content-type') ?? ''), reason: /^image\//i.test(response.headers.get('content-type') ?? '') ? null : 'non_image_response' }),
    timeoutMs
  );
}

function markdown(runPlan, summary) {
  return [
    `# ${LOAD_POLICY_VERSION}`,
    '',
    `- Commit: \`${runPlan.commit_sha}\``,
    `- Status: **${summary.status.toUpperCase()}**`,
    `- Target: \`${runPlan.rps} requests/second\` for \`${runPlan.duration_seconds} seconds\``,
    `- Planned/completed: \`${summary.planned_requests} / ${summary.completed_requests}\``,
    `- Error rate: \`${(summary.error_rate * 100).toFixed(4)}%\``,
    `- Maximum DB connection utilization: \`${(summary.max_connection_utilization * 100).toFixed(2)}%\``,
    '',
    '| Read path | Requests | Failures | p95 | Target | Status |',
    '| --- | ---: | ---: | ---: | ---: | --- |',
    ...summary.endpoints.map((row) => `| ${row.kind} | ${row.request_count} | ${row.failure_count} | ${row.latency_ms.p95} ms | ${row.target_p95_ms} ms | ${row.status} |`),
    '',
    '## Findings',
    '',
    ...(summary.findings.length ? summary.findings.map((row) => `- \`${row}\``) : ['- none']),
    '',
    '## Boundaries',
    '',
    '- Requests are read-only search, pricing, and image reads.',
    '- No Vault, canonical, pricing publication, Storage, or user-data writes.',
    '- Credentials are used in memory and never written to artifacts.',
    ''
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = requiredEnvironment();
  const envelope = deriveLoadEnvelopeV1({
    peakEventsPerMinute: args.expectedPeakRps * 60,
    targetRps: args.rps
  });
  if (!envelope.satisfies_2x) throw new Error('target load must be at least 2x expected peak');
  const client = new Client({
    connectionString: env.databaseUrl,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 30_000,
    query_timeout: 30_000
  });
  await client.connect();
  try {
    const samples = await loadSamples(client);
    await fs.mkdir(args.outDir, { recursive: true });
    const runPlan = {
      policy_version: LOAD_POLICY_VERSION,
      commit_sha: gitValue(['rev-parse', 'HEAD']),
      branch: gitValue(['branch', '--show-current']),
      written_at: new Date().toISOString(),
      rps: args.rps,
      duration_seconds: args.durationSeconds,
      planned_requests: args.plannedRequests,
      max_requests: args.maxRequests,
      max_in_flight: args.maxInFlight,
      request_mix: { search: 0.4, pricing_detail: 0.25, pricing_grid: 0.15, image_head: 0.2 },
      envelope,
      endpoint_hosts: [new URL(env.supabaseUrl).host, new URL(env.webBaseUrl).host],
      sample_hash_sha256: sha256(JSON.stringify(samples)),
      boundaries: {
        production_reads_only: true,
        database_writes: false,
        storage_writes: false,
        vault_writes: false,
        canonical_writes: false,
        pricing_publication_writes: false,
        credentials_persisted: false
      }
    };
    await fs.writeFile(path.join(args.outDir, 'run_plan.json'), `${JSON.stringify(runPlan, null, 2)}\n`);

    const rows = [];
    const dbSnapshots = [await dbSnapshot(client, 'before')];
    let stopMonitoring = false;
    const monitor = (async () => {
      while (!stopMonitoring) {
        await sleep(args.monitorIntervalMs);
        if (!stopMonitoring) dbSnapshots.push(await dbSnapshot(client, 'during'));
      }
    })();
    const inFlight = new Set();
    const started = performance.now();
    let aborted = false;
    for (let index = 0; index < args.plannedRequests; index += 1) {
      const dueAt = started + (index * 1000) / args.rps;
      const waitMs = dueAt - performance.now();
      if (waitMs > 0) await sleep(waitMs);
      if (shouldAbortLoadV1(rows)) {
        aborted = true;
        break;
      }
      if (inFlight.size >= args.maxInFlight) await Promise.race(inFlight);
      const promise = buildRequest(index, env, samples, args.timeoutMs)
        .then((result) => rows.push({ sequence: index + 1, ...result }))
        .finally(() => inFlight.delete(promise));
      inFlight.add(promise);
    }
    await Promise.all(inFlight);
    stopMonitoring = true;
    await monitor;
    dbSnapshots.push(await dbSnapshot(client, 'after'));

    const summaryBody = summarizeLoadV1({
      rows,
      dbSnapshots,
      plannedRequests: args.plannedRequests,
      envelope,
      aborted
    });
    const report = {
      ...summaryBody,
      observed_at: new Date().toISOString(),
      elapsed_seconds: Number(((performance.now() - started) / 1000).toFixed(3))
    };
    const files = {
      'summary.json': `${JSON.stringify(report, null, 2)}\n`,
      'REPORT.md': `${markdown(runPlan, report)}\n`,
      'db_snapshots.jsonl.gz': gzipSync(`${dbSnapshots.map((row) => JSON.stringify(row)).join('\n')}\n`),
      'measurements.jsonl.gz': gzipSync(`${rows.map((row) => JSON.stringify(row)).join('\n')}\n`)
    };
    const hashes = { 'run_plan.json': sha256(await fs.readFile(path.join(args.outDir, 'run_plan.json'))) };
    for (const [name, contents] of Object.entries(files)) {
      await fs.writeFile(path.join(args.outDir, name), contents);
      hashes[name] = sha256(contents);
    }
    await fs.writeFile(path.join(args.outDir, 'artifact_hashes.json'), `${JSON.stringify(hashes, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ ...report, artifact_root: args.outDir }, null, 2)}\n`);
    if (args.requirePass && report.status !== 'passed') process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`[production-launch-read-load] ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
