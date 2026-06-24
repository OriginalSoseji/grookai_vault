import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'master_index_world_championship_decks_v1');
const OUT_JSON = path.join(OUT_DIR, 'world_championship_decks_09g_live_prod_smoke_v1.json');
const OUT_MD = path.join(OUT_DIR, 'world_championship_decks_09g_live_prod_smoke_v1.md');
const PACKAGE_ID = 'MASTER-INDEX-WORLD-CHAMPIONSHIP-DECKS-09G-LIVE-PROD-SMOKE';
const BASE_URL = (process.env.GROOKAI_WEB_BASE_URL ?? 'https://grookaivault.com').replace(/\/$/, '');

const ROUTES = [
  {
    id: 'set_magma_spirit',
    path: '/sets/wcd2004-magma-spirit',
    expect: [
      '2004 World Championships Deck: Magma Spirit',
      'user-card-images/warehouse-derived/self-hosted-images-v1/card_prints/',
    ],
    forbid: ['assets.tcgdex.net', 'Image unavailable'],
  },
  {
    id: 'set_pikarom_judge',
    path: '/sets/wcd2019-pikarom-judge',
    expect: [
      '2019 World Championships Deck: Pikarom Judge',
      'user-card-images/warehouse-derived/self-hosted-images-v1/card_prints/',
    ],
    forbid: ['assets.tcgdex.net', 'Image unavailable'],
  },
  {
    id: 'set_pult_bomb',
    path: '/sets/wcd2025-pult-bomb',
    expect: [
      '2025 World Championships Deck: Pult Bomb',
      'user-card-images/warehouse-derived/self-hosted-images-v1/card_prints/',
    ],
    forbid: ['assets.tcgdex.net', 'Image unavailable'],
  },
  {
    id: 'card_magma_spirit_groudon',
    path: '/card/GV-PK-WCD-2004-MAGMA_SPIRIT-01-EX_TEAM_MAGMA_VS-9-TEAM_MAGMAS_GROUDON',
    expect: [
      'Team Magma',
      'Groudon',
      'gv-card-hero-image-stage',
      'user-card-images/warehouse-derived/self-hosted-images-v1/card_prints/',
    ],
    forbid: ['assets.tcgdex.net', 'Image unavailable'],
  },
  {
    id: 'card_pikarom_pikachu_zekrom',
    path: '/card/GV-PK-WCD-2019-PIKAROM_JUDGE-01-TEAM-33-PIKACHU_AND_ZEKROM_GX',
    expect: [
      'Pikachu',
      'Zekrom',
      'gv-card-hero-image-stage',
      'user-card-images/warehouse-derived/self-hosted-images-v1/card_prints/',
    ],
    forbid: ['assets.tcgdex.net', 'Image unavailable'],
  },
];

const REDIRECTS = [
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

function decodeBody(body) {
  return String(body ?? '')
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

async function fetchRoute(route) {
  const response = await fetch(`${BASE_URL}${route.path}`, { redirect: 'manual' });
  const body = await response.text();
  const haystack = `${body}\n${decodeBody(body)}`;
  const missingExpected = route.expect.filter((signal) => !haystack.includes(signal));
  const presentForbidden = route.forbid.filter((signal) => haystack.includes(signal));

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

async function fetchRedirect(probe) {
  const response = await fetch(`${BASE_URL}${probe.path}`, { redirect: 'manual' });
  const location = response.headers.get('location') ?? '';
  let parsed = null;
  try {
    parsed = new URL(location, BASE_URL);
  } catch {
    parsed = null;
  }
  const actualPath = parsed?.pathname ?? '';
  const actualQuery = parsed?.searchParams.toString() ?? '';
  const passed =
    response.status >= 300 &&
    response.status < 400 &&
    actualPath === probe.expect_location_path &&
    (probe.expect_location_query ? actualQuery === probe.expect_location_query : true);

  return {
    id: probe.id,
    path: probe.path,
    status: response.status,
    location,
    expected_location_path: probe.expect_location_path,
    actual_location_path: actualPath,
    expected_location_query: probe.expect_location_query ?? null,
    actual_location_query: actualQuery,
    passed,
  };
}

function renderMarkdown(report) {
  const routeRows = report.routes
    .map((row) => `| ${row.id} | ${row.status} | ${row.passed ? 'PASS' : 'FAIL'} | ${row.missing_expected.join('<br>') || 'none'} | ${row.present_forbidden.join('<br>') || 'none'} |`)
    .join('\n');
  const redirectRows = report.redirects
    .map((row) => `| ${row.id} | ${row.status} | ${row.passed ? 'PASS' : 'FAIL'} | ${row.actual_location_path}${row.actual_location_query ? `?${row.actual_location_query}` : ''} |`)
    .join('\n');

  return `# ${PACKAGE_ID}

- Generated: ${report.generated_at}
- Mode: ${report.mode}
- Base URL: \`${report.base_url}\`
- Failures: ${report.failures.length}
- Proof hash: \`${report.proof_hash}\`
- DB writes performed: false
- Storage writes performed: false
- Migrations created: false

## Runtime Routes

| Route | HTTP | Result | Missing expected signals | Forbidden signals present |
| --- | ---: | --- | --- | --- |
${routeRows}

## Runtime Redirects

| Probe | HTTP | Result | Location |
| --- | ---: | --- | --- |
${redirectRows}
`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const routes = [];
  for (const route of ROUTES) routes.push(await fetchRoute(route));
  const redirects = [];
  for (const redirect of REDIRECTS) redirects.push(await fetchRedirect(redirect));
  const failures = [
    ...routes.filter((row) => !row.passed).map((row) => `route:${row.id}`),
    ...redirects.filter((row) => !row.passed).map((row) => `redirect:${row.id}`),
  ];
  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_live_production_http_smoke_no_db_no_storage_no_migration',
    base_url: BASE_URL,
    routes,
    redirects,
    failures,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
  };
  report.proof_hash = proofHash(report);

  await fs.writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(OUT_MD, renderMarkdown(report), 'utf8');
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: path.relative(ROOT, OUT_JSON),
    output_md: path.relative(ROOT, OUT_MD),
    routes: routes.length,
    redirects: redirects.length,
    failures,
    proof_hash: report.proof_hash,
  }, null, 2));
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
