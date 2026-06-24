import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_img24a_curated_fallback_live_scan_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'image_truth_img24a_curated_fallback_live_scan_v1.md');
const PACKAGE_ID = 'IMG-24A-CURATED-FALLBACK-LIVE-SCAN';
const BASE_URL = (process.env.GROOKAI_WEB_BASE_URL ?? 'https://grookaivault.com').replace(/\/$/, '');

const ROUTES = [
  {
    id: 'dex_oshawott_child_fallback',
    surface: 'dex',
    path: '/dex/oshawott',
    expect: ['Oshawott', 'GV-PK-MEP-051'],
    forbid: ['Image unavailable', 'assets.tcgdex.net/en/tk/', 'assets.tcgdex.net/en/mc/2021swsh/'],
  },
  {
    id: 'card_trainer_kit_sm_lycanroc_representative',
    surface: 'card_detail',
    path: '/card/GV-PK-TK-tk-sm-l-1',
    expect: [
      'Caterpie',
      'gv-card-hero-image-stage',
      'user-card-images/warehouse-derived/self-hosted-images-v1/card_prints/tk-sm-l/gv-pk-tk-tk-sm-l-1/',
      'representative_shared',
    ],
    forbid: ['Image unavailable', 'assets.tcgdex.net/en/tk/tk-sm-l/', 'cdn.malie.io/file/malie-io/art/cards/jpg/'],
  },
  {
    id: 'card_trainer_kit_dp_lucario_representative',
    surface: 'card_detail',
    path: '/card/GV-PK-TK-tk-dp-l-1',
    expect: [
      'Geodude',
      'gv-card-hero-image-stage',
      'user-card-images/warehouse-derived/self-hosted-images-v1/card_prints/tk-dp-l/gv-pk-tk-tk-dp-l-1/',
      'representative_shared',
    ],
    forbid: ['Image unavailable', 'assets.tcgdex.net/en/tk/tk-dp-l/', 'static.tcgcollector.com/content/images/'],
  },
  {
    id: 'set_trainer_kit_sm_lycanroc_representative',
    surface: 'set_detail',
    path: '/sets/tk-sm-l',
    expect: [
      'SM Trainer Kit (Lycanroc)',
      'user-card-images/warehouse-derived/self-hosted-images-v1/card_prints/tk-sm-l/',
      'representative_shared',
    ],
    forbid: ['Image unavailable', 'assets.tcgdex.net/en/tk/tk-sm-l/', 'cdn.malie.io/file/malie-io/art/cards/jpg/'],
  },
  {
    id: 'set_trainer_kit_dp_lucario_representative',
    surface: 'set_detail',
    path: '/sets/tk-dp-l',
    expect: [
      'DP Trainer Kit (Lucario)',
      'user-card-images/warehouse-derived/self-hosted-images-v1/card_prints/tk-dp-l/',
      'representative_shared',
    ],
    forbid: ['Image unavailable', 'assets.tcgdex.net/en/tk/tk-dp-l/', 'static.tcgcollector.com/content/images/'],
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
    surface: route.surface,
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

function renderMarkdown(report) {
  const rows = report.results
    .map((row) => `| ${row.id} | ${row.surface} | ${row.status} | ${row.passed ? 'PASS' : 'FAIL'} | ${row.missing_expected.join('<br>') || 'none'} | ${row.present_forbidden.join('<br>') || 'none'} |`)
    .join('\n');
  return `# ${PACKAGE_ID}

- Generated: ${report.generated_at}
- Mode: ${report.mode}
- Base URL: \`${report.base_url}\`
- Routes scanned: ${report.summary.routes_scanned}
- Failures: ${report.failures.length}
- Proof hash: \`${report.proof_hash}\`
- DB writes performed: false
- Storage writes performed: false
- Migrations created: false

## Runtime Routes

| Probe | Surface | HTTP | Result | Missing expected signals | Forbidden signals present |
| --- | --- | ---: | --- | --- | --- |
${rows}

## Policy

- This is a non-empty curated runtime scan for fallback/representative image surfaces.
- It does not write data, upload images, repoint pointers, price anything, or call AI.
`;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const results = [];
  for (const route of ROUTES) results.push(await fetchRoute(route));
  const failures = results.filter((row) => !row.passed).map((row) => `route:${row.id}`);
  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_curated_live_runtime_scan_no_db_no_storage_no_migration',
    base_url: BASE_URL,
    summary: {
      routes_scanned: results.length,
      failed_routes: failures.length,
      surfaces: Array.from(new Set(results.map((row) => row.surface))).sort(),
    },
    results,
    failures,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
  };
  report.proof_hash = proofHash(report);
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(OUTPUT_MD, renderMarkdown(report), 'utf8');
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: path.relative(ROOT, OUTPUT_JSON),
    output_md: path.relative(ROOT, OUTPUT_MD),
    routes_scanned: results.length,
    failures,
    proof_hash: report.proof_hash,
  }, null, 2));
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
