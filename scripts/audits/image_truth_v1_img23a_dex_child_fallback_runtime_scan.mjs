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
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_img23a_dex_child_fallback_runtime_scan_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'image_truth_img23a_dex_child_fallback_runtime_scan_v1.md');
const PACKAGE_ID = 'IMG-23A-DEX-CHILD-FALLBACK-RUNTIME-SCAN';
const DEFAULT_PORT = Number.parseInt(process.env.IMAGE_TRUTH_DEX_FALLBACK_SCAN_PORT ?? '3088', 10);
const CONCURRENCY = Number.parseInt(process.env.IMAGE_TRUTH_DEX_FALLBACK_SCAN_CONCURRENCY ?? '4', 10);
const ROUTE_LIMIT = Number.parseInt(process.env.IMAGE_TRUTH_DEX_FALLBACK_SCAN_LIMIT ?? '0', 10);
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
  throw new Error('image_truth_dex_fallback_scan_server_not_ready');
}

async function queryCandidates() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) {
    throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL');
  }

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
        v.species_slug,
        v.species_display_name,
        v.card_print_id,
        v.gv_id,
        v.name,
        v.set_code,
        v.set_name,
        v.number,
        cp.image_status as parent_image_status,
        child.child_image_rows,
        child.child_images
      from public.v_grookai_dex_card_prints_v1 v
      join public.card_prints cp on cp.id = v.card_print_id
      join child on child.card_print_id = v.card_print_id and child.child_image_rows > 0
      where v.mapping_active = true
        and v.card_print_id is not null
        and v.species_slug is not null
        and coalesce(cp.image_status, '') <> 'blocked'
        and v.gv_id <> all($1::text[])
        and nullif(trim(coalesce(v.image_path, '')), '') is null
        and nullif(trim(coalesce(v.image_url, '')), '') is null
        and nullif(trim(coalesce(v.image_alt_url, '')), '') is null
        and nullif(trim(coalesce(v.representative_image_url, '')), '') is null
      order by v.species_slug, v.set_code, v.number, v.gv_id
    `, [Array.from(HISTORICAL_WRONG_IMAGE_SENTINEL_GV_IDS)]);
    return result.rows.map((row) => ({
      ...row,
      image_signals: imageSignals(row.child_images),
    }));
  } finally {
    await client.end();
  }
}

function groupBySpecies(candidates) {
  const groups = new Map();
  for (const candidate of candidates) {
    const slug = clean(candidate.species_slug);
    if (!slug) continue;
    const existing = groups.get(slug) ?? {
      species_slug: slug,
      species_display_name: clean(candidate.species_display_name),
      path: `/dex/${slug}`,
      candidates: [],
    };
    existing.candidates.push(candidate);
    groups.set(slug, existing);
  }
  const routes = Array.from(groups.values());
  return ROUTE_LIMIT > 0 ? routes.slice(0, ROUTE_LIMIT) : routes;
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
  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, () => worker()),
  );
  return results;
}

async function fetchRoute(baseUrl, route) {
  const response = await fetch(`${baseUrl}${route.path}`, { redirect: 'manual' });
  const body = await response.text();
  const haystack = `${body}\n${decodeBody(body)}`;
  const candidateResults = route.candidates.map((candidate) => {
    const gvId = clean(candidate.gv_id);
    const name = clean(candidate.name);
    const hrefSignal = gvId ? `/card/${gvId}` : null;
    const hrefIndex = hrefSignal ? haystack.indexOf(hrefSignal) : -1;
    const gvIndex = gvId ? haystack.indexOf(gvId) : -1;
    const nameIndex = name ? haystack.indexOf(name) : -1;
    const cardSignalIndex = hrefIndex >= 0 ? hrefIndex : gvIndex >= 0 ? gvIndex : nameIndex;
    const cardSignalPresent = cardSignalIndex >= 0;
    const cardSnippet =
      cardSignalIndex >= 0
        ? haystack.slice(Math.max(0, cardSignalIndex - 500), cardSignalIndex + 1500)
        : '';
    const cardTileHasImage = /<img\s/i.test(cardSnippet);
    const imageSignal = candidate.image_signals.find((signal) => haystack.includes(signal)) ?? null;
    return {
      card_print_id: candidate.card_print_id,
      gv_id: gvId,
      name,
      set_code: clean(candidate.set_code),
      number: clean(candidate.number),
      child_image_rows: candidate.child_image_rows,
      image_signal_count: candidate.image_signals.length,
      matched_image_signal: imageSignal,
      card_signal_present: cardSignalPresent,
      card_tile_has_image: cardTileHasImage,
      passed: cardSignalPresent && (Boolean(imageSignal) || cardTileHasImage),
    };
  });
  const failures = candidateResults.filter((candidate) => !candidate.passed);
  const presentForbidden = [
    'assets.tcgdex.net/en/tk/',
    'assets.tcgdex.net/en/mc/2021swsh/',
    'assets.tcgdex.net/en/ex/ex5.5/',
  ].filter((signal) => haystack.includes(signal));

  return {
    path: route.path,
    species_slug: route.species_slug,
    species_display_name: route.species_display_name,
    status: response.status,
    body_length: body.length,
    candidate_count: route.candidates.length,
    passed_candidate_count: candidateResults.length - failures.length,
    failed_candidate_count: failures.length,
    forbidden_signals_present: presentForbidden,
    passed: response.status === 200 && failures.length === 0 && presentForbidden.length === 0,
    failures: failures.slice(0, 20),
  };
}

function renderMarkdown(report) {
  const routeRows = report.results
    .map(
      (row) =>
        `| ${row.path} | ${row.status} | ${row.candidate_count} | ${row.passed_candidate_count} | ${row.failed_candidate_count} | ${row.forbidden_signals_present.join('<br>') || 'none'} | ${row.passed ? 'PASS' : 'FAIL'} |`,
    )
    .join('\n');
  const failureRows = report.failures.length
    ? report.failures
        .slice(0, 50)
        .map(
          (row) =>
            `| ${row.path} | ${row.gv_id ?? ''} | ${row.name ?? ''} | ${row.set_code ?? ''} | ${row.number ?? ''} | ${row.reason} |`,
        )
        .join('\n')
    : '_None._';

  return `# ${PACKAGE_ID}

- Generated: ${report.generated_at}
- Mode: ${report.mode}
- Base URL: \`${report.base_url}\`
- Proof hash: \`${report.proof_hash}\`
- Candidate parent rows: ${report.summary.candidate_parent_rows}
- Species routes scanned: ${report.summary.species_routes_scanned}
- Failed routes: ${report.summary.failed_routes}
- Failed candidate rows: ${report.summary.failed_candidate_rows}

## Runtime Routes

| Route | Status | Candidates | Passed candidates | Failed candidates | Forbidden signals | Result |
| --- | ---: | ---: | ---: | ---: | --- | --- |
${routeRows}

## Candidate Failures

| Route | GV ID | Name | Set | Number | Reason |
| --- | --- | --- | --- | --- | --- |
${failureRows}

## Policy

- No database writes.
- No image uploads.
- This scan verifies Dex runtime fallback rendering for parent rows that have no parent image but do have child printing image evidence.
- Representative child fallback imagery remains explicitly non-exact.
- Historical wrong-image sentinel rows with dedicated surface-smoke coverage are excluded from this fallback-candidate scan: ${Array.from(HISTORICAL_WRONG_IMAGE_SENTINEL_GV_IDS).join(', ')}.
`;
}

async function runAgainst(baseUrl, server = null) {
  const candidates = await queryCandidates();
  const routes = groupBySpecies(candidates);
  await waitForServer(baseUrl);
  const results = await mapWithConcurrency(routes, CONCURRENCY, (route) => fetchRoute(baseUrl, route));
  const failures = [];
  for (const result of results) {
    for (const failure of result.failures) {
      failures.push({
        path: result.path,
        gv_id: failure.gv_id,
        name: failure.name,
        set_code: failure.set_code,
        number: failure.number,
        reason: !failure.card_signal_present
          ? 'card_signal_missing'
          : failure.card_tile_has_image
            ? 'card_tile_image_present_but_expected_image_signal_missing'
            : 'card_present_but_no_runtime_image',
      });
    }
    for (const forbidden of result.forbidden_signals_present) {
      failures.push({
        path: result.path,
        gv_id: null,
        name: null,
        set_code: null,
        number: null,
        reason: `forbidden_signal_present:${forbidden}`,
      });
    }
  }

  const summary = {
    candidate_parent_rows: candidates.length,
    species_routes_total: groupBySpecies(candidates).length,
    species_routes_scanned: routes.length,
    route_limit: ROUTE_LIMIT > 0 ? ROUTE_LIMIT : null,
    failed_routes: results.filter((row) => !row.passed).length,
    failed_candidate_rows: failures.length,
  };
  const payloadForHash = {
    package_id: PACKAGE_ID,
    summary,
    results: results.map(({ server_output_tail: _tail, ...result }) => result),
    failures,
  };
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

  if (failures.length > 0) {
    process.exitCode = 1;
  }
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
