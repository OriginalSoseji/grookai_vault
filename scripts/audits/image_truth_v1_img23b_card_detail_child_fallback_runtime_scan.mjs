import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_img23b_card_detail_child_fallback_runtime_scan_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'image_truth_img23b_card_detail_child_fallback_runtime_scan_v1.md');
const PACKAGE_ID = 'IMG-23B-CARD-DETAIL-CHILD-FALLBACK-RUNTIME-SCAN';
const DEFAULT_PORT = Number.parseInt(process.env.IMAGE_TRUTH_CARD_DETAIL_FALLBACK_SCAN_PORT ?? '3089', 10);
const CONCURRENCY = Number.parseInt(process.env.IMAGE_TRUTH_CARD_DETAIL_FALLBACK_SCAN_CONCURRENCY ?? '2', 10);
const ROUTE_LIMIT = Number.parseInt(process.env.IMAGE_TRUTH_CARD_DETAIL_FALLBACK_SCAN_LIMIT ?? '0', 10);
const RETRIES = Number.parseInt(process.env.IMAGE_TRUTH_CARD_DETAIL_FALLBACK_SCAN_RETRIES ?? '2', 10);
const HISTORICAL_WRONG_IMAGE_SENTINEL_GV_IDS = new Set(['GV-PK-LTR-RC5']);

function requireDbUrl() {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    null
  );
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function proofHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalizeJson(value))).digest('hex');
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function decodeBody(body) {
  return body
    .replace(/%3A/gi, ':')
    .replace(/%2F/gi, '/')
    .replace(/%3F/gi, '?')
    .replace(/%3D/gi, '=')
    .replace(/%26/gi, '&')
    .replace(/%2B/gi, '+')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

function signalFromUrl(value) {
  const normalized = clean(value);
  if (!normalized) return [];
  const signals = [normalized];
  try {
    const parsed = new URL(normalized);
    const basename = path.posix.basename(parsed.pathname);
    if (basename) signals.push(basename);
    signals.push(parsed.hostname);
  } catch {
    const basename = path.posix.basename(normalized.replaceAll('\\', '/'));
    if (basename) signals.push(basename);
  }
  return Array.from(new Set(signals.filter(Boolean)));
}

function imageSignals(childImages) {
  const signals = [];
  for (const child of childImages ?? []) {
    for (const key of ['image_path', 'image_url', 'image_alt_url']) {
      signals.push(...signalFromUrl(child?.[key]));
    }
  }
  return Array.from(new Set(signals.filter((signal) => signal && signal.length >= 8)));
}

function startServer(port) {
  const nextBin = path.join(ROOT, 'apps', 'web', 'node_modules', 'next', 'dist', 'bin', 'next');
  const env = {
    ...process.env,
    GROOKAI_DEX_V1_ENABLED: 'true',
    NODE_OPTIONS: process.env.NODE_OPTIONS?.includes('--use-system-ca')
      ? process.env.NODE_OPTIONS
      : `${process.env.NODE_OPTIONS ?? ''} --use-system-ca`.trim(),
  };

  const child = spawn(process.execPath, [nextBin, 'start', '-p', String(port)], {
    cwd: path.join(ROOT, 'apps', 'web'),
    env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  return { child, getOutput: () => output };
}

async function stopServer(child) {
  child.kill('SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if (!child.killed) child.kill('SIGKILL');
}

async function waitForServer(baseUrl) {
  for (let index = 0; index < 60; index += 1) {
    try {
      const response = await fetch(`${baseUrl}/login`, { redirect: 'manual' });
      if (response.status < 500) return;
    } catch {
      // Retry until Next finishes booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('image_truth_card_detail_fallback_scan_server_not_ready');
}

async function queryCandidates() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL');

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(`
      with child as (
        select
          card_print_id,
          jsonb_agg(
            jsonb_build_object(
              'printing_gv_id', printing_gv_id,
              'finish_key', finish_key,
              'image_path', image_path,
              'image_url', image_url,
              'image_alt_url', image_alt_url,
              'image_status', image_status
            )
            order by printing_gv_id nulls last, finish_key nulls last
          ) filter (
            where nullif(trim(coalesce(image_path, '')), '') is not null
               or nullif(trim(coalesce(image_url, '')), '') is not null
               or nullif(trim(coalesce(image_alt_url, '')), '') is not null
          ) as child_images,
          count(*) filter (
            where nullif(trim(coalesce(image_path, '')), '') is not null
               or nullif(trim(coalesce(image_url, '')), '') is not null
               or nullif(trim(coalesce(image_alt_url, '')), '') is not null
          )::int as child_image_rows
        from public.card_printings
        group by card_print_id
      )
      select
        cp.id as card_print_id,
        cp.gv_id,
        cp.name,
        cp.set_code,
        cp.number,
        cp.image_status as parent_image_status,
        child.child_image_rows,
        child.child_images
      from public.card_prints cp
      join child on child.card_print_id = cp.id and child.child_image_rows > 0
      where cp.gv_id is not null
        and coalesce(cp.image_status, '') <> 'blocked'
        and cp.gv_id <> all($1::text[])
        and nullif(trim(coalesce(cp.image_path, '')), '') is null
        and nullif(trim(coalesce(cp.image_url, '')), '') is null
        and nullif(trim(coalesce(cp.image_alt_url, '')), '') is null
        and nullif(trim(coalesce(cp.representative_image_url, '')), '') is null
      order by cp.set_code, cp.number, cp.gv_id
    `, [Array.from(HISTORICAL_WRONG_IMAGE_SENTINEL_GV_IDS)]);
    const candidates = result.rows.map((row) => ({
      ...row,
      path: `/card/${encodeURIComponent(row.gv_id)}`,
      image_signals: imageSignals(row.child_images),
    }));
    return ROUTE_LIMIT > 0 ? candidates.slice(0, ROUTE_LIMIT) : candidates;
  } finally {
    await client.end();
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
  return results;
}

async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function heroSnippet(haystack) {
  const marker = 'gv-card-hero-image-stage';
  const markerIndex = haystack.indexOf(marker);
  if (markerIndex < 0) return '';
  return haystack.slice(Math.max(0, markerIndex - 1000), markerIndex + 5000);
}

async function fetchCard(baseUrl, candidate) {
  let response;
  let body;
  try {
    response = await fetch(`${baseUrl}${candidate.path}`, { redirect: 'manual' });
    body = await response.text();
  } catch (error) {
    return {
      path: candidate.path,
      gv_id: candidate.gv_id,
      name: candidate.name,
      set_code: clean(candidate.set_code),
      number: clean(candidate.number),
      status: 0,
      body_length: 0,
      child_image_rows: candidate.child_image_rows,
      image_signal_count: candidate.image_signals.length,
      matched_image_signal: null,
      card_signal_present: false,
      hero_marker_present: false,
      hero_has_image: false,
      hero_says_unavailable: false,
      forbidden_signals_present: [],
      fetch_error: error instanceof Error ? error.message : String(error),
      passed: false,
    };
  }
  const haystack = `${body}\n${decodeBody(body)}`;
  const hero = heroSnippet(haystack);
  const matchedImageSignal = candidate.image_signals.find((signal) => haystack.includes(signal)) ?? null;
  const heroHasImage = /<img\s/i.test(hero) || /"src":"https?:\/\//i.test(hero);
  const heroSaysUnavailable = hero.includes('Image unavailable');
  const presentForbidden = [
    'assets.tcgdex.net/en/tk/',
    'assets.tcgdex.net/en/mc/2021swsh/',
    'assets.tcgdex.net/en/ex/ex5.5/',
  ].filter((signal) => haystack.includes(signal));
  const cardSignalPresent =
    haystack.includes(candidate.gv_id) &&
    haystack.toLowerCase().includes(String(candidate.name ?? '').toLowerCase());

  return {
    path: candidate.path,
    gv_id: candidate.gv_id,
    name: candidate.name,
    set_code: clean(candidate.set_code),
    number: clean(candidate.number),
    status: response.status,
    body_length: body.length,
    child_image_rows: candidate.child_image_rows,
    image_signal_count: candidate.image_signals.length,
    matched_image_signal: matchedImageSignal,
    card_signal_present: cardSignalPresent,
    hero_marker_present: Boolean(hero),
    hero_has_image: heroHasImage,
    hero_says_unavailable: heroSaysUnavailable,
    forbidden_signals_present: presentForbidden,
    passed:
      response.status === 200 &&
      cardSignalPresent &&
      Boolean(hero) &&
      (heroHasImage || Boolean(matchedImageSignal)) &&
      !heroSaysUnavailable &&
      presentForbidden.length === 0,
  };
}

function failureReason(row) {
  if (row.fetch_error) return `fetch_error:${row.fetch_error}`;
  if (row.status !== 200) return `status_${row.status}`;
  if (!row.card_signal_present) return 'card_signal_missing';
  if (!row.hero_marker_present) return 'hero_marker_missing';
  if (row.hero_says_unavailable) return 'hero_says_image_unavailable';
  if (!row.hero_has_image && !row.matched_image_signal) return 'hero_image_missing';
  if (row.forbidden_signals_present.length > 0) return `forbidden_signal_present:${row.forbidden_signals_present.join(',')}`;
  return 'unknown';
}

function renderMarkdown(report) {
  const routeRows = report.results
    .slice(0, 80)
    .map(
      (row) =>
        `| ${row.path} | ${row.status} | ${row.hero_has_image || row.matched_image_signal ? 'yes' : 'no'} | ${row.hero_says_unavailable ? 'yes' : 'no'} | ${row.forbidden_signals_present.join('<br>') || 'none'} | ${row.passed ? 'PASS' : 'FAIL'} |`,
    )
    .join('\n');
  const failureRows = report.failures.length
    ? report.failures
        .map((row) => `| ${row.path} | ${row.gv_id} | ${row.name} | ${row.set_code ?? ''} | ${row.number ?? ''} | ${row.reason} |`)
        .join('\n')
    : '_None._';

  return `# ${PACKAGE_ID}

- Generated: ${report.generated_at}
- Mode: ${report.mode}
- Base URL: \`${report.base_url}\`
- Proof hash: \`${report.proof_hash}\`
- Candidate card routes scanned: ${report.summary.card_routes_scanned}
- Failed routes: ${report.summary.failed_routes}

## Runtime Route Sample

| Route | Status | Runtime image signal | Unavailable copy | Forbidden signals | Result |
| --- | ---: | --- | --- | --- | --- |
${routeRows}

## Failures

| Route | GV ID | Name | Set | Number | Reason |
| --- | --- | --- | --- | --- | --- |
${failureRows}

## Policy

- No database writes.
- No image uploads.
- This scan verifies card detail hero rendering for parent rows that have no parent image but do have child printing image evidence.
- Representative child fallback imagery remains explicitly non-exact.
- Historical wrong-image sentinel rows with dedicated surface-smoke coverage are excluded from this fallback-candidate scan: ${Array.from(HISTORICAL_WRONG_IMAGE_SENTINEL_GV_IDS).join(', ')}.
`;
}

async function runAgainst(baseUrl, server = null) {
  const candidates = await queryCandidates();
  await waitForServer(baseUrl);
  let results = await mapWithConcurrency(candidates, CONCURRENCY, (candidate) => fetchCard(baseUrl, candidate));
  const candidateByPath = new Map(candidates.map((candidate) => [candidate.path, candidate]));
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    const failedResults = results.filter((row) => !row.passed);
    if (failedResults.length === 0) break;
    await delay(1000 * attempt);
    for (const failed of failedResults) {
      const candidate = candidateByPath.get(failed.path);
      if (!candidate) continue;
      const replacement = await fetchCard(baseUrl, candidate);
      const index = results.findIndex((row) => row.path === failed.path);
      if (index >= 0) {
        results[index] = {
          ...replacement,
          retry_attempts: attempt,
          first_failure_reason: failureReason(failed),
        };
      }
    }
  }
  const failures = results
    .filter((row) => !row.passed)
    .map((row) => ({
      path: row.path,
      gv_id: row.gv_id,
      name: row.name,
      set_code: row.set_code,
      number: row.number,
      reason: failureReason(row),
    }));
  const summary = {
    card_routes_scanned: results.length,
    route_limit: ROUTE_LIMIT > 0 ? ROUTE_LIMIT : null,
    failed_routes: failures.length,
  };
  const payloadForHash = { package_id: PACKAGE_ID, summary, results, failures };
  const report = {
    package_id: PACKAGE_ID,
    mode: 'read_only_runtime_http_scan',
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    concurrency: CONCURRENCY,
    summary,
    results,
    failures,
    server_output_tail: server?.getOutput().slice(-2000) ?? null,
    proof_hash: proofHash(payloadForHash),
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(OUTPUT_MD, renderMarkdown(report), 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: path.relative(ROOT, OUTPUT_JSON),
    output_md: path.relative(ROOT, OUTPUT_MD),
    proof_hash: report.proof_hash,
    ...summary,
  }, null, 2));

  if (failures.length > 0) process.exitCode = 1;
}

async function main() {
  const externalBaseUrl = process.env.GROOKAI_IMAGE_SURFACE_SMOKE_BASE_URL ?? process.env.GROOKAI_WEB_BASE_URL ?? null;
  if (externalBaseUrl) {
    await runAgainst(externalBaseUrl.replace(/\/$/, ''));
    return;
  }

  const baseUrl = `http://127.0.0.1:${DEFAULT_PORT}`;
  const server = startServer(DEFAULT_PORT);
  try {
    await runAgainst(baseUrl, server);
  } finally {
    await stopServer(server.child);
  }
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
