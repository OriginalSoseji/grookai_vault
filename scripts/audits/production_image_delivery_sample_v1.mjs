import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

import pg from 'pg';

const { Client } = pg;
export const AUDIT_VERSION = 'PRODUCTION_IMAGE_DELIVERY_SAMPLE_V1';
const DEFAULT_SAMPLE_SIZE = 3000;
const DEFAULT_BODY_SAMPLE_SIZE = 100;
const DEFAULT_PROXY_SAMPLE_SIZE = 100;
const DEFAULT_CONCURRENCY = 30;
const PROXY_AUDIENCES = new Set(['anonymous_public', 'signed_in']);
const PRIVATE_BUCKET = 'user-card-images';
const EXTERNAL_BUCKET = 'external-card-images';
const WAREHOUSE_PREFIXES = [
  'warehouse-derived/self-hosted-images-v1/',
  'warehouse-derived/image-truth-v1/'
];
const ONE_PIECE_PATH = /^one-piece\/card-prints\/(?:official|tcgplayer)\/[1-9]\d*\/[0-9a-f]{32}\.(?:png|jpe?g|webp)$/i;

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function percentile(values, quantile) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * quantile) - 1));
  return sorted[index];
}

export function upperFailureRate95V1(failures, sampleSize) {
  if (sampleSize <= 0) return null;
  if (failures === 0) return 1 - Math.pow(0.05, 1 / sampleSize);
  const z = 1.959963984540054;
  const p = failures / sampleSize;
  const denominator = 1 + (z * z) / sampleSize;
  const center = p + (z * z) / (2 * sampleSize);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * sampleSize)) / sampleSize);
  return (center + margin) / denominator;
}

function hashOrder(seed, row) {
  return sha256(`${seed}|${row.gv_id}|${row.image_path}`);
}

export function selectDeterministicSampleV1(rows, { sampleSize = DEFAULT_SAMPLE_SIZE, seed = AUDIT_VERSION, representativeMinimum = 500 } = {}) {
  const unique = [...new Map(rows.map((row) => [`${row.gv_id}|${row.image_path}`, row])).values()];
  const ordered = unique
    .map((row) => ({ ...row, selection_hash: hashOrder(seed, row) }))
    .sort((left, right) => left.selection_hash.localeCompare(right.selection_hash));
  const representatives = ordered.filter((row) => clean(row.image_status)?.toLowerCase().startsWith('representative'));
  const target = Math.min(sampleSize, ordered.length);
  const representativeTarget = Math.min(representatives.length, representativeMinimum, target);
  const selectedRepresentatives = representatives.slice(0, representativeTarget);
  const selectedKeys = new Set(selectedRepresentatives.map((row) => `${row.gv_id}|${row.image_path}`));
  const remainder = ordered.filter((row) => !selectedKeys.has(`${row.gv_id}|${row.image_path}`));
  return [...selectedRepresentatives, ...remainder.slice(0, target - representativeTarget)]
    .sort((left, right) => left.selection_hash.localeCompare(right.selection_hash));
}

export function cardVisibleToProxyAudienceV1(row, audience = 'anonymous_public') {
  if (!PROXY_AUDIENCES.has(audience)) return false;
  const gameCode = clean(row?.game_code)?.toLowerCase();
  const releaseStatus = clean(row?.release_status)?.toLowerCase();
  if (gameCode === 'pokemon') return true;
  if (releaseStatus === 'public') return true;
  return audience === 'signed_in' && releaseStatus === 'signed_in';
}

export function resolveStorageLocationV1(imagePath) {
  const normalized = clean(imagePath)?.replace(/^\/+/, '') ?? null;
  if (!normalized || normalized.includes('..') || normalized.length > 512) return null;
  if (WAREHOUSE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return { bucket: PRIVATE_BUCKET, path: normalized };
  }
  if (ONE_PIECE_PATH.test(normalized)) return { bucket: EXTERNAL_BUCKET, path: normalized };
  return null;
}

function imageMagicMatches(buffer) {
  if (!buffer || buffer.length < 12) return false;
  const hex = buffer.subarray(0, 12).toString('hex');
  return hex.startsWith('ffd8ff')
    || hex.startsWith('89504e470d0a1a0a')
    || (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP')
    || hex.startsWith('47494638');
}

export function classifyImageResponseV1({ status, contentType, contentLength, body = null }) {
  const imageType = /^image\/(?:avif|gif|jpeg|png|webp)(?:;|$)/i.test(contentType ?? '');
  const length = Number(contentLength);
  const statusOk = status >= 200 && status < 300;
  const bodyOk = body == null ? null : imageMagicMatches(body);
  return {
    ok: statusOk && imageType && (bodyOk == null || bodyOk),
    status_ok: statusOk,
    content_type_ok: imageType,
    content_length_bytes: Number.isFinite(length) && length >= 0 ? length : null,
    body_magic_ok: bodyOk
  };
}

function encodeObjectPath(objectPath) {
  return objectPath.split('/').map(encodeURIComponent).join('/');
}

async function mapPool(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function fetchMeasured(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return { response, latency_ms: performance.now() - started, error: null };
  } catch (error) {
    return { response: null, latency_ms: performance.now() - started, error: error.name === 'AbortError' ? 'timeout' : error.message };
  } finally {
    clearTimeout(timer);
  }
}

async function probeStorage(row, { supabaseUrl, serviceKey, fullBody, timeoutMs }) {
  const location = resolveStorageLocationV1(row.image_path);
  if (!location) return { ...row, target: 'storage', ok: false, error: 'unsupported_storage_path' };
  const url = `${supabaseUrl}/storage/v1/object/authenticated/${encodeURIComponent(location.bucket)}/${encodeObjectPath(location.path)}`;
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const measured = await fetchMeasured(url, { method: fullBody ? 'GET' : 'HEAD', headers }, timeoutMs);
  if (!measured.response) return { ...row, target: fullBody ? 'storage_body' : 'storage_head', bucket: location.bucket, ok: false, latency_ms: measured.latency_ms, error: measured.error };
  const body = fullBody ? Buffer.from(await measured.response.arrayBuffer()) : null;
  const classification = classifyImageResponseV1({
    status: measured.response.status,
    contentType: measured.response.headers.get('content-type'),
    contentLength: measured.response.headers.get('content-length') ?? body?.length,
    body
  });
  return {
    gv_id: row.gv_id,
    image_status: row.image_status,
    image_path: row.image_path,
    selection_hash: row.selection_hash,
    target: fullBody ? 'storage_body' : 'storage_head',
    bucket: location.bucket,
    status: measured.response.status,
    content_type: measured.response.headers.get('content-type'),
    latency_ms: measured.latency_ms,
    body_bytes: body?.length ?? null,
    ...classification,
    error: classification.ok ? null : 'invalid_image_response'
  };
}

async function probeProxy(row, { webBaseUrl, timeoutMs, bearerToken = null }) {
  const url = `${webBaseUrl}/api/canon/cards/${encodeURIComponent(row.gv_id)}/image`;
  const headers = { 'Cache-Control': 'no-cache' };
  if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;
  const measured = await fetchMeasured(url, { method: 'HEAD', headers }, timeoutMs);
  if (!measured.response) return { gv_id: row.gv_id, target: 'web_proxy_head', ok: false, latency_ms: measured.latency_ms, error: measured.error };
  const classification = classifyImageResponseV1({
    status: measured.response.status,
    contentType: measured.response.headers.get('content-type'),
    contentLength: measured.response.headers.get('content-length')
  });
  return {
    gv_id: row.gv_id,
    image_status: row.image_status,
    image_path: row.image_path,
    selection_hash: row.selection_hash,
    target: 'web_proxy_head',
    status: measured.response.status,
    content_type: measured.response.headers.get('content-type'),
    latency_ms: measured.latency_ms,
    ...classification,
    error: classification.ok ? null : 'invalid_image_response'
  };
}

function summarize(results) {
  const failures = results.filter((row) => !row.ok);
  const latencies = results.filter((row) => Number.isFinite(row.latency_ms)).map((row) => row.latency_ms);
  return {
    sample_count: results.length,
    success_count: results.length - failures.length,
    failure_count: failures.length,
    observed_failure_rate: results.length ? failures.length / results.length : null,
    upper_failure_rate_95: upperFailureRate95V1(failures.length, results.length),
    latency_ms: {
      p50: percentile(latencies, 0.5),
      p95: percentile(latencies, 0.95),
      p99: percentile(latencies, 0.99),
      maximum: latencies.length ? Math.max(...latencies) : null
    }
  };
}

function parseArgs(argv) {
  const value = (name) => argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
  const integer = (name, fallback) => {
    const parsed = Number.parseInt(value(name) ?? String(fallback), 10);
    if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
    return parsed;
  };
  const proxyAudience = value('--proxy-audience') ?? 'anonymous_public';
  if (!PROXY_AUDIENCES.has(proxyAudience)) {
    throw new Error('--proxy-audience must be anonymous_public or signed_in');
  }
  return {
    sampleSize: integer('--sample-size', DEFAULT_SAMPLE_SIZE),
    bodySampleSize: integer('--body-sample-size', DEFAULT_BODY_SAMPLE_SIZE),
    proxySampleSize: integer('--proxy-sample-size', DEFAULT_PROXY_SAMPLE_SIZE),
    concurrency: integer('--concurrency', DEFAULT_CONCURRENCY),
    timeoutMs: integer('--timeout-ms', 15_000),
    seed: value('--seed') ?? `${AUDIT_VERSION}_20260824`,
    proxyAudience,
    webBaseUrl: (value('--web-base-url') ?? 'https://grookaivault.com').replace(/\/+$/, ''),
    outDir: path.resolve(value('--out-dir') ?? path.join('docs', 'audits', 'production_backend_launch_v1', 'image_delivery'))
  };
}

async function loadRows(dbUrl) {
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false }, statement_timeout: 120_000 });
  await client.connect();
  try {
    const result = await client.query(`
      select
        card.id as card_print_id,
        card.gv_id,
        card.image_path,
        card.image_status,
        card.image_source,
        game.code as game_code,
        coalesce(control.release_status, 'hidden') as release_status
      from public.card_prints card
      left join public.games game on game.id = card.game_id
      left join public.catalog_game_release_controls control
        on lower(control.game_code) = lower(game.code)
      where card.gv_id is not null
        and card.image_path is not null
        and btrim(card.image_path) <> ''
        and (
          card.image_path like 'warehouse-derived/self-hosted-images-v1/%'
          or card.image_path like 'warehouse-derived/image-truth-v1/%'
          or card.image_path ~* '^one-piece/card-prints/(official|tcgplayer)/[1-9][0-9]*/[0-9a-f]{32}\\.(png|jpe?g|webp)$'
        )
    `);
    return result.rows;
  } finally {
    await client.end();
  }
}

function markdown(report) {
  const line = (label, summary) => `| ${label} | ${summary.sample_count} | ${summary.failure_count} | ${(summary.observed_failure_rate * 100).toFixed(4)}% | ${(summary.upper_failure_rate_95 * 100).toFixed(4)}% | ${summary.latency_ms.p95?.toFixed(1) ?? 'n/a'} ms |`;
  return [
    `# ${AUDIT_VERSION}`,
    '',
    `- Observed: \`${report.observed_at}\``,
    `- Commit: \`${report.commit_sha}\``,
    `- Status: **${report.status.toUpperCase()}**`,
    `- Eligible self-hosted rows: \`${report.selection.eligible_rows}\``,
    `- Selection hash: \`${report.selection.selection_sha256}\``,
    '',
    '| Probe | Sample | Failures | Observed failure | 95% upper bound | p95 latency |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
    line('Direct Storage HEAD', report.summaries.storage_head),
    line('Direct Storage full body', report.summaries.storage_body),
    line(`Production web proxy HEAD (${report.proxy_selection.audience})`, report.summaries.web_proxy_head),
    '',
    '## Boundaries',
    '',
    '- Database: one read-only catalog query.',
    '- Storage: authenticated HEAD/GET reads only.',
    `- Web: image-proxy HEAD reads only for the \`${report.proxy_selection.audience}\` release cohort.`,
    '- Database writes, Storage writes, pointer changes, canonical changes, and user-data changes: none.',
    ''
  ].join('\n');
}

export async function runImageDeliverySampleV1({ argv = process.argv.slice(2), now = new Date() } = {}) {
  const args = parseArgs(argv);
  const supabaseUrl = clean(process.env.SUPABASE_URL);
  const serviceKey = clean(process.env.SUPABASE_SECRET_KEY);
  const dbUrl = clean(process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL);
  if (!supabaseUrl || !serviceKey || !dbUrl) throw new Error('SUPABASE_URL, service key, and database URL are required');
  const proxyBearerToken = clean(process.env.CARD_IMAGE_PROXY_BEARER_TOKEN);
  if (args.proxyAudience === 'signed_in' && !proxyBearerToken) {
    throw new Error('CARD_IMAGE_PROXY_BEARER_TOKEN is required for the signed_in proxy audience');
  }
  const eligible = await loadRows(dbUrl);
  const selected = selectDeterministicSampleV1(eligible, { sampleSize: args.sampleSize, seed: args.seed });
  const storageHead = await mapPool(selected, args.concurrency, (row) => probeStorage(row, { supabaseUrl, serviceKey, fullBody: false, timeoutMs: args.timeoutMs }));
  const storageBodyRows = selected.slice(0, Math.min(args.bodySampleSize, selected.length));
  const storageBody = await mapPool(storageBodyRows, Math.min(10, args.concurrency), (row) => probeStorage(row, { supabaseUrl, serviceKey, fullBody: true, timeoutMs: args.timeoutMs }));
  const proxyEligible = eligible.filter((row) => cardVisibleToProxyAudienceV1(row, args.proxyAudience));
  const proxyRows = selectDeterministicSampleV1(proxyEligible, {
    sampleSize: args.proxySampleSize,
    seed: `${args.seed}|proxy|${args.proxyAudience}`,
    representativeMinimum: 0
  });
  const webProxy = await mapPool(proxyRows, Math.min(10, args.concurrency), (row) => probeProxy(row, {
    webBaseUrl: args.webBaseUrl,
    timeoutMs: args.timeoutMs,
    bearerToken: proxyBearerToken
  }));
  const summaries = {
    storage_head: summarize(storageHead),
    storage_body: summarize(storageBody),
    web_proxy_head: summarize(webProxy)
  };
  const status = summaries.storage_head.sample_count >= 3000
    && summaries.storage_head.failure_count === 0
    && summaries.storage_head.upper_failure_rate_95 <= 0.001
    && summaries.storage_body.failure_count === 0
    && summaries.web_proxy_head.sample_count === args.proxySampleSize
    && summaries.web_proxy_head.failure_count === 0
    ? 'passed'
    : 'failed';
  const commitSha = clean(process.env.GROOKAI_DEPLOYED_COMMIT_SHA ?? process.env.GITHUB_SHA) ?? null;
  const body = {
    schema_version: AUDIT_VERSION,
    observed_at: now.toISOString(),
    commit_sha: commitSha,
    status,
    selection: {
      seed: args.seed,
      eligible_rows: eligible.length,
      selected_rows: selected.length,
      representative_rows: selected.filter((row) => clean(row.image_status)?.toLowerCase().startsWith('representative')).length,
      selection_sha256: sha256(selected.map((row) => `${row.gv_id}|${row.image_path}`).join('\n'))
    },
    proxy_selection: {
      audience: args.proxyAudience,
      eligible_rows: proxyEligible.length,
      selected_rows: proxyRows.length,
      selection_sha256: sha256(proxyRows.map((row) => `${row.gv_id}|${row.image_path}`).join('\n'))
    },
    summaries,
    failures: [...storageHead, ...storageBody, ...webProxy].filter((row) => !row.ok),
    boundaries: {
      database_reads_only: true,
      storage_reads_only: true,
      web_reads_only: true,
      web_proxy_audience: args.proxyAudience,
      database_writes: false,
      storage_writes: false,
      image_pointer_writes: false,
      canonical_writes: false,
      vault_writes: false
    }
  };
  const report = { ...body, report_fingerprint_sha256: sha256(JSON.stringify(body)) };
  await fs.mkdir(args.outDir, { recursive: true });
  const summaryPath = path.join(args.outDir, 'production_image_delivery_sample_v1.json');
  const results = [...storageHead, ...storageBody, ...webProxy];
  await Promise.all([
    fs.writeFile(summaryPath, `${JSON.stringify(report, null, 2)}\n`),
    fs.writeFile(path.join(args.outDir, 'PRODUCTION_IMAGE_DELIVERY_SAMPLE_V1.md'), markdown(report)),
    fs.writeFile(path.join(args.outDir, 'image_probe_results.jsonl.gz'), gzipSync(`${results.map((row) => JSON.stringify(row)).join('\n')}\n`)),
    fs.writeFile(path.join(args.outDir, 'selected_images.jsonl.gz'), gzipSync(`${selected.map((row) => JSON.stringify(row)).join('\n')}\n`))
  ]);
  process.stdout.write(`${JSON.stringify({ status, selection: report.selection, summaries, failure_count: report.failures.length, report_fingerprint_sha256: report.report_fingerprint_sha256, summary_path: summaryPath }, null, 2)}\n`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runImageDeliverySampleV1()
    .then((report) => {
      if (report.status !== 'passed') process.exitCode = 1;
    })
    .catch((error) => {
      console.error(`[production-image-delivery-sample] ${error.stack ?? error.message}`);
      process.exitCode = 1;
    });
}
