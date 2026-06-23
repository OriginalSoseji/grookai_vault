import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'master_index_world_championship_decks_v1');
const OUT_JSON = path.join(OUT_DIR, 'world_championship_decks_09f_runtime_search_smoke_v1.json');
const OUT_MD = path.join(OUT_DIR, 'world_championship_decks_09f_runtime_search_smoke_v1.md');
const PACKAGE_ID = 'MASTER-INDEX-WORLD-CHAMPIONSHIP-DECKS-09F-RUNTIME-SEARCH-SMOKE';
const DEFAULT_PORT = Number.parseInt(process.env.WCD_SMOKE_PORT ?? '3091', 10);

const DB_PROBES = [
  {
    id: 'exact_gv_id_magma_spirit_groudon',
    query: 'GV-PK-WCD-2004-MAGMA_SPIRIT-01-EX_TEAM_MAGMA_VS-9-TEAM_MAGMAS_GROUDON',
    expect_prefix: 'GV-PK-WCD-2004-MAGMA_SPIRIT-01-',
  },
  {
    id: 'deck_name_magma_spirit',
    query: 'Magma Spirit',
    expect_prefix: 'GV-PK-WCD-2004-MAGMA_SPIRIT-',
  },
  {
    id: 'deck_name_pikarom_judge',
    query: 'Pikarom Judge',
    expect_prefix: 'GV-PK-WCD-2019-PIKAROM_JUDGE-',
  },
  {
    id: 'deck_name_ancient_toolbox',
    query: 'Ancient Toolbox',
    expect_prefix: 'GV-PK-WCD-2024-ANCIENT_TOOLBOX-',
  },
  {
    id: 'deck_name_pult_bomb',
    query: 'Pult Bomb',
    expect_prefix: 'GV-PK-WCD-2025-PULT_BOMB-',
  },
];

const HTTP_ROUTES = [
  {
    id: 'set_magma_spirit',
    path: '/sets/wcd2004-magma-spirit',
    expect: ['2004 World Championships Deck: Magma Spirit'],
    forbid: ['assets.tcgdex.net', 'user-card-images/warehouse-derived/self-hosted-images-v1'],
  },
  {
    id: 'set_pikarom_judge',
    path: '/sets/wcd2019-pikarom-judge',
    expect: ['2019 World Championships Deck: Pikarom Judge'],
    forbid: ['assets.tcgdex.net', 'user-card-images/warehouse-derived/self-hosted-images-v1'],
  },
  {
    id: 'set_pult_bomb',
    path: '/sets/wcd2025-pult-bomb',
    expect: ['2025 World Championships Deck: Pult Bomb'],
    forbid: ['assets.tcgdex.net', 'user-card-images/warehouse-derived/self-hosted-images-v1'],
  },
  {
    id: 'card_magma_spirit_groudon',
    path: '/card/GV-PK-WCD-2004-MAGMA_SPIRIT-01-EX_TEAM_MAGMA_VS-9-TEAM_MAGMAS_GROUDON',
    expect: ['Team Magma', 'Groudon', 'Image unavailable'],
    forbid: ['card_prints/wcd2004-magma-spirit', 'GV-PK-WCD-2004-MAGMA_SPIRIT-01-EX_TEAM_MAGMA_VS-9-TEAM_MAGMAS_GROUDON/'],
  },
  {
    id: 'card_pikarom_pikachu_zekrom',
    path: '/card/GV-PK-WCD-2019-PIKAROM_JUDGE-01-TEAM-33-PIKACHU_AND_ZEKROM_GX',
    expect: ['Pikachu', 'Zekrom', 'Image unavailable'],
    forbid: ['card_prints/wcd2019-pikarom-judge', 'GV-PK-WCD-2019-PIKAROM_JUDGE-01-TEAM-33-PIKACHU_AND_ZEKROM_GX/'],
  },
];

const HTTP_REDIRECTS = [
  {
    id: 'search_alias_magma_spirit',
    path: '/search?q=Magma%20Spirit',
    expect_location_path: '/sets/wcd2004-magma-spirit',
  },
  {
    id: 'search_alias_pikarom_judge',
    path: '/search?q=Pikarom%20Judge',
    expect_location_path: '/sets/wcd2019-pikarom-judge',
  },
  {
    id: 'search_alias_pult_bomb_deck',
    path: '/search?q=Pult%20Bomb%20deck',
    expect_location_path: '/sets/wcd2025-pult-bomb',
  },
  {
    id: 'search_alias_world_championship_decks',
    path: '/search?q=world%20championship%20decks',
    expect_location_path: '/sets',
    expect_location_query: 'q=world+championship+decks',
  },
];

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
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

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/%3A/gi, ':')
    .replace(/%2F/gi, '/')
    .replace(/%3F/gi, '?')
    .replace(/%3D/gi, '=')
    .replace(/%26/gi, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\\u0026/g, '&')
    .replace(/\\u0027/g, "'");
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
      // Wait for Next to boot.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('wcd_runtime_smoke_server_not_ready');
}

async function runDbProbes() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query('begin transaction read only');
  try {
    const counts = await client.query(`
      select
        (select count(*)::int from public.sets where code like 'wcd20%' and source->'grookai'->>'apply_family' = 'MASTER-INDEX-WORLD-CHAMPIONSHIP-DECKS-V1') as set_rows,
        (select count(*)::int from public.card_prints where gv_id like 'GV-PK-WCD-%' and external_ids->'grookai'->>'apply_family' = 'MASTER-INDEX-WORLD-CHAMPIONSHIP-DECKS-V1') as card_print_rows,
        (select count(*)::int from public.card_printings cpi join public.card_prints cp on cp.id = cpi.card_print_id where cp.gv_id like 'GV-PK-WCD-%') as child_rows,
        (select count(*)::int from public.card_prints where gv_id like 'GV-PK-WCD-%' and (image_status <> 'missing' or image_source is not null or image_url is not null or image_path is not null)) as forbidden_image_rows
    `);
    const probes = [];
    for (const probe of DB_PROBES) {
      const result = await client.query(
        `
          select parent_gv_id, display_name, route_path, object_type
          from public.search_print_identity_v1(
            q => $1,
            set_code_in => null,
            number_in => null,
            object_type_in => null,
            limit_in => 10,
            offset_in => 0
          )
        `,
        [probe.query],
      );
      const matchingRows = result.rows.filter((row) => String(row.parent_gv_id ?? '').startsWith(probe.expect_prefix));
      probes.push({
        id: probe.id,
        query: probe.query,
        expect_prefix: probe.expect_prefix,
        result_count: result.rows.length,
        matching_rows: matchingRows.length,
        top_parent_gv_id: result.rows[0]?.parent_gv_id ?? null,
        top_display_name: result.rows[0]?.display_name ?? null,
        passed: matchingRows.length > 0,
        sample_results: result.rows.slice(0, 5),
      });
    }
    await client.query('commit');
    return {
      counts: counts.rows[0],
      probes,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

async function fetchRoute(baseUrl, route) {
  const response = await fetch(`${baseUrl}${route.path}`, { redirect: 'manual' });
  const body = await response.text();
  const haystack = `${body}\n${decodeHtml(body)}`;
  const missingExpected = route.expect.filter((needle) => !haystack.includes(needle));
  const presentForbidden = route.forbid.filter((needle) => haystack.includes(needle));
  return {
    id: route.id,
    path: route.path,
    status: response.status,
    body_length: body.length,
    expected_signals: route.expect,
    missing_expected: missingExpected,
    forbidden_signals: route.forbid,
    present_forbidden: presentForbidden,
    passed: response.status === 200 && missingExpected.length === 0 && presentForbidden.length === 0,
  };
}

async function fetchRedirect(baseUrl, redirectProbe) {
  const response = await fetch(`${baseUrl}${redirectProbe.path}`, { redirect: 'manual' });
  const location = response.headers.get('location') ?? '';
  let locationUrl = null;
  try {
    locationUrl = new URL(location, baseUrl);
  } catch {
    locationUrl = null;
  }
  const locationPath = locationUrl?.pathname ?? '';
  const locationQuery = locationUrl?.searchParams.toString() ?? '';
  const statusPassed = response.status >= 300 && response.status < 400;
  const pathPassed = locationPath === redirectProbe.expect_location_path;
  const queryPassed = redirectProbe.expect_location_query
    ? locationQuery === redirectProbe.expect_location_query
    : true;

  return {
    id: redirectProbe.id,
    path: redirectProbe.path,
    status: response.status,
    location,
    expected_location_path: redirectProbe.expect_location_path,
    actual_location_path: locationPath,
    expected_location_query: redirectProbe.expect_location_query ?? null,
    actual_location_query: locationQuery,
    passed: statusPassed && pathPassed && queryPassed,
  };
}

async function runHttpProbes(baseUrl) {
  await waitForServer(baseUrl);
  const routes = [];
  for (const route of HTTP_ROUTES) {
    routes.push(await fetchRoute(baseUrl, route));
  }
  const redirects = [];
  for (const redirectProbe of HTTP_REDIRECTS) {
    redirects.push(await fetchRedirect(baseUrl, redirectProbe));
  }
  return { routes, redirects };
}

function renderMarkdown(report) {
  const dbRows = report.db.probes
    .map((row) => `| ${row.id} | ${row.query} | ${row.passed ? 'PASS' : 'FAIL'} | ${row.matching_rows} | ${row.top_parent_gv_id ?? ''} |`)
    .join('\n');
  const routeRows = report.http.routes
    .map((row) => `| ${row.id} | ${row.status} | ${row.passed ? 'PASS' : 'FAIL'} | ${row.missing_expected.join('<br>') || 'none'} | ${row.present_forbidden.join('<br>') || 'none'} |`)
    .join('\n');
  const redirectRows = report.http.redirects
    .map((row) => `| ${row.id} | ${row.status} | ${row.passed ? 'PASS' : 'FAIL'} | ${row.actual_location_path}${row.actual_location_query ? `?${row.actual_location_query}` : ''} |`)
    .join('\n');
  return `# ${PACKAGE_ID}

- Generated: ${report.generated_at}
- Mode: ${report.mode}
- Base URL: \`${report.http.base_url}\`
- Proof hash: \`${report.proof_hash}\`
- Failures: ${report.failures.length}
- DB writes performed: false
- Storage writes performed: false
- Migrations created: false

## DB Readback

- WCD set rows: ${report.db.counts.set_rows}
- WCD parent card_print rows: ${report.db.counts.card_print_rows}
- WCD child rows: ${report.db.counts.child_rows}
- WCD forbidden image rows: ${report.db.counts.forbidden_image_rows}

## Search Probes

| Probe | Query | Result | Matching rows | Top parent GV ID |
| --- | --- | --- | ---: | --- |
${dbRows}

## Runtime Routes

| Route | HTTP | Result | Missing expected signals | Forbidden signals present |
| --- | ---: | --- | --- | --- |
${routeRows}

## Runtime Redirects

| Probe | HTTP | Result | Location |
| --- | ---: | --- | --- |
${redirectRows}

## Notes

- Deck-name search proves WCD parent rows are discoverable and deck aliases route to deterministic set pages when unambiguous.
- All runtime probes forbid external image URLs and self-hosted exact paths because these WCD rows intentionally have no exact images yet.
`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const explicitBaseUrl = process.env.GROOKAI_WEB_BASE_URL ?? process.env.WEB_BASE_URL ?? null;
  const baseUrl = explicitBaseUrl ?? `http://127.0.0.1:${DEFAULT_PORT}`;
  const server = explicitBaseUrl ? null : startServer(DEFAULT_PORT);

  try {
    const db = await runDbProbes();
    const http = await runHttpProbes(baseUrl);
    const failures = [
      ...(Number(db.counts.set_rows) === 80 ? [] : [`db_set_rows_expected_80_actual_${db.counts.set_rows}`]),
      ...(Number(db.counts.card_print_rows) === 1944 ? [] : [`db_card_print_rows_expected_1944_actual_${db.counts.card_print_rows}`]),
      ...(Number(db.counts.child_rows) === 0 ? [] : [`db_child_rows_expected_0_actual_${db.counts.child_rows}`]),
      ...(Number(db.counts.forbidden_image_rows) === 0 ? [] : [`db_forbidden_image_rows_expected_0_actual_${db.counts.forbidden_image_rows}`]),
      ...db.probes.filter((row) => !row.passed).map((row) => `db_probe_failed:${row.id}`),
      ...http.routes.filter((row) => !row.passed).map((row) => `http_route_failed:${row.id}`),
      ...http.redirects.filter((row) => !row.passed).map((row) => `http_redirect_failed:${row.id}`),
    ];
    const report = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      mode: 'read_only_db_and_runtime_surface_smoke',
      db,
      http: {
        base_url: baseUrl,
        server_started_by_script: !explicitBaseUrl,
        routes: http.routes,
        redirects: http.redirects,
      },
      db_writes_performed: false,
      storage_writes_performed: false,
      migrations_created: false,
      failures,
    };
    report.proof_hash = proofHash({
      db: report.db,
      http: report.http.routes,
      failures,
    });

    await fs.writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await fs.writeFile(OUT_MD, renderMarkdown(report), 'utf8');
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      proof_hash: report.proof_hash,
      failures: report.failures,
      db_counts: report.db.counts,
      http_routes: report.http.routes.map((row) => ({ id: row.id, status: row.status, passed: row.passed })),
      http_redirects: report.http.redirects.map((row) => ({ id: row.id, status: row.status, passed: row.passed, location: row.location })),
      report_md: path.relative(ROOT, OUT_MD),
    }, null, 2));
    if (failures.length > 0) process.exitCode = 1;
  } finally {
    if (server) {
      await stopServer(server.child);
    }
  }
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
