import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh06d_mcdonalds_dextcg_db_pointer_repoint_plan_v1.jsonl');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh06f_mcdonalds_runtime_surface_smoke_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh06f_mcdonalds_runtime_surface_smoke_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-06F-MCDONALDS-RUNTIME-SURFACE-SMOKE';
const DEFAULT_PORT = Number.parseInt(process.env.MCDONALDS_RUNTIME_SMOKE_PORT ?? '3088', 10);

const SET_ROUTE_BY_CODE = {
  mcd14: '/sets/mcd14',
  mcd15: '/sets/mcd15',
  mcd17: '/sets/mcd17',
  mcd18: '/sets/mcd18',
  '2023sv': '/sets/2023sv',
  '2024sv': '/sets/2024sv',
};

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

async function readJsonl(file) {
  const raw = await fs.readFile(file, 'utf8');
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
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
  throw new Error('mcdonalds_runtime_smoke_server_not_ready');
}

function buildRoutes(planRows) {
  const firstRowsBySet = new Map();
  for (const row of planRows) {
    if (!firstRowsBySet.has(row.set_code)) firstRowsBySet.set(row.set_code, row);
  }

  const routes = [];
  for (const [setCode, routePath] of Object.entries(SET_ROUTE_BY_CODE)) {
    const firstRow = firstRowsBySet.get(setCode);
    const storageFragment = `user-card-images/warehouse-derived/self-hosted-images-v1/card_prints/${setCode}/`;
    routes.push({
      id: `set_${setCode}`,
      path: routePath,
      expect: [firstRow.set_name, storageFragment],
      forbid: ['Image unavailable', 'assets.tcgdex.net/en/mc/', 'images.pokemontcg.io/'],
    });
    routes.push({
      id: `card_${firstRow.gv_id}`,
      path: `/card/${firstRow.gv_id}`,
      expect: [
        firstRow.name,
        'gv-card-hero-image-stage',
        `user-card-images/${firstRow.target_storage_path}`,
      ],
      forbid: ['assets.tcgdex.net/en/mc/'],
    });
  }
  return routes;
}

async function fetchRoute(baseUrl, route) {
  const response = await fetch(`${baseUrl}${route.path}`, { redirect: 'manual' });
  const body = await response.text();
  const decodedBody = body
    .replace(/%3A/gi, ':')
    .replace(/%2F/gi, '/')
    .replace(/%3F/gi, '?')
    .replace(/%3D/gi, '=')
    .replace(/%26/gi, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
  const haystack = `${body}\n${decodedBody}`;
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

function renderMarkdown(report) {
  const resultRows = report.results
    .map((row) =>
      `| ${row.id} | ${row.status} | ${row.passed ? 'PASS' : 'FAIL'} | ${row.missing_expected.join('<br>') || 'none'} | ${row.present_forbidden.join('<br>') || 'none'} |`)
    .join('\n');

  return `# ${PACKAGE_ID}

- Generated: ${report.generated_at}
- Mode: ${report.mode}
- Base URL: \`${report.base_url}\`
- Proof hash: \`${report.proof_hash}\`
- Routes: ${report.results.length}
- Failures: ${report.failures.length}
- DB writes performed: false
- Storage writes performed: false
- Migrations created: false

## Runtime Routes

| Route | Status | Result | Missing expected signals | Forbidden signals present |
| --- | ---: | --- | --- | --- |
${resultRows}
`;
}

async function runAgainst(baseUrl, server, routes) {
  await waitForServer(baseUrl);
  const results = [];
  for (const route of routes) results.push(await fetchRoute(baseUrl, route));
  const failures = results
    .filter((row) => !row.passed)
    .map((row) => `${row.id}: status=${row.status}, missing=${row.missing_expected.join(',') || 'none'}, forbidden=${row.present_forbidden.join(',') || 'none'}`);

  const report = {
    package_id: PACKAGE_ID,
    mode: 'read_only_runtime_http_smoke',
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    results,
    failures,
    server_output_tail: server?.getOutput().slice(-2000) ?? null,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    proof_hash: proofHash({ routes, results, failures }),
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(OUTPUT_MD, renderMarkdown(report), 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: path.relative(ROOT, OUTPUT_JSON),
    output_md: path.relative(ROOT, OUTPUT_MD),
    proof_hash: report.proof_hash,
    routes: results.length,
    failures: failures.length,
  }, null, 2));

  if (failures.length > 0) process.exitCode = 1;
}

async function main() {
  const planRows = await readJsonl(PLAN_JSONL);
  const routes = buildRoutes(planRows);
  const externalBaseUrl = process.env.GROOKAI_IMAGE_SURFACE_SMOKE_BASE_URL ?? process.env.GROOKAI_WEB_BASE_URL ?? null;
  if (externalBaseUrl) {
    await runAgainst(externalBaseUrl.replace(/\/$/, ''), null, routes);
    return;
  }

  const baseUrl = `http://127.0.0.1:${DEFAULT_PORT}`;
  const server = startServer(DEFAULT_PORT);
  try {
    await runAgainst(baseUrl, server, routes);
  } finally {
    await stopServer(server.child);
  }
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
