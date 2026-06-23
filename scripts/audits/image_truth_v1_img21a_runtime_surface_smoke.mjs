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
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_img21a_runtime_surface_smoke_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'image_truth_img21a_runtime_surface_smoke_v1.md');
const PACKAGE_ID = 'IMG-21A-RUNTIME-IMAGE-SURFACE-SMOKE';
const DEFAULT_PORT = Number.parseInt(process.env.IMAGE_TRUTH_SMOKE_PORT ?? '3087', 10);

const ROUTES = [
  {
    id: 'card_mcd2021_oshawott',
    path: '/card/GV-PK-MCD-21',
    expect: [
      'Oshawott',
      'user-card-images/warehouse-derived/self-hosted-images-v1/card_prints/2021swsh/gv-pk-mcd-21',
    ],
    forbid: ['Image unavailable', 'assets.tcgdex.net/en/mc/2021swsh/21/high.webp'],
  },
  {
    id: 'set_mcd2021',
    path: '/sets/2021swsh',
    expect: [
      "McDonald's Collection 2021",
      'user-card-images/warehouse-derived/self-hosted-images-v1/card_prints/mcd21/',
    ],
    forbid: ['Image unavailable', 'assets.tcgdex.net/en/mc/2021swsh/'],
  },
  {
    id: 'dex_oshawott_child_fallback',
    path: '/dex/oshawott',
    expect: ['Oshawott', 'GV-PK-MEP-051'],
    forbid: ['assets.tcgdex.net/en/tk/', 'assets.tcgdex.net/en/mc/2021swsh/'],
  },
  {
    id: 'card_mep_oshawott_exact',
    path: '/card/GV-PK-MEP-051',
    expect: ['Oshawott', 'gv-card-hero-image-stage'],
    forbid: ['Image unavailable'],
  },
  {
    id: 'set_trainer_kit_sm_lycanroc',
    path: '/sets/tk-sm-l',
    expect: ['SM Trainer Kit (Lycanroc)', 'cdn.malie.io/file/malie-io/art/cards/jpg/'],
    forbid: ['Image unavailable', 'assets.tcgdex.net/en/tk/tk-sm-l/'],
  },
  {
    id: 'set_trainer_kit_dp_lucario_residual',
    path: '/sets/tk-dp-l',
    expect: ['DP Trainer Kit (Lucario)', 'static.tcgcollector.com/content/images/'],
    forbid: ['Image unavailable', 'assets.tcgdex.net/en/tk/tk-dp-l/'],
  },
  {
    id: 'card_trainer_kit_ex_latios_alias',
    path: '/card/GV-PK-TK-tk-ex-latio-1',
    expect: ['Electrike', 'images.pokemontcg.io/tk1b/1_hires.png'],
    forbid: ['Image unavailable', 'assets.tcgdex.net/en/tk/tk-ex-latio/1/high.webp'],
  },
  {
    id: 'card_trainer_kit_hs_gyarados_residual',
    path: '/card/GV-PK-TK-tk-hs-g-20',
    expect: ['Gyarados', 'static.tcgcollector.com/content/images/57/c4/81/'],
    forbid: ['assets.tcgdex.net/en/tk/tk-hs-g/20/high.webp'],
  },
  {
    id: 'card_wrong_rc5_blocked',
    path: '/card/GV-PK-LTR-RC5',
    expect: ['Torchic', 'Image unavailable'],
    forbid: ['images.pokemontcg.io/bw11/5_hires.png', 'Carnivine'],
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
  throw new Error('image_truth_runtime_smoke_server_not_ready');
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
    .map(
      (row) =>
        `| ${row.id} | ${row.status} | ${row.passed ? 'PASS' : 'FAIL'} | ${row.missing_expected.join('<br>') || 'none'} | ${row.present_forbidden.join('<br>') || 'none'} |`,
    )
    .join('\n');

  return `# ${PACKAGE_ID}

- Generated: ${report.generated_at}
- Mode: ${report.mode}
- Base URL: \`${report.base_url}\`
- Proof hash: \`${report.proof_hash}\`
- Failures: ${report.failures.length}

## Runtime Routes

| Route | Status | Result | Missing expected signals | Forbidden signals present |
| --- | ---: | --- | --- | --- |
${resultRows}

## Policy

- No database writes.
- No image uploads.
- This smoke checks rendered runtime behavior only.
- RC5 Torchic is expected to remain blocked until a verified exact/replacement image is sourced.
`;
}

async function runAgainst(baseUrl, server = null) {
  await waitForServer(baseUrl);
  const results = [];
  for (const route of ROUTES) {
    results.push(await fetchRoute(baseUrl, route));
  }

  const failures = results
    .filter((row) => !row.passed)
    .map((row) => `${row.id}: status=${row.status}, missing=${row.missing_expected.join(',') || 'none'}, forbidden=${row.present_forbidden.join(',') || 'none'}`);

  const payloadForHash = {
    routes: ROUTES.map(({ id, path, expect, forbid }) => ({ id, path, expect, forbid })),
    results,
    failures,
  };
  const report = {
    package_id: PACKAGE_ID,
    mode: 'read_only_runtime_http_smoke',
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
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
    routes: results.length,
    failures: failures.length,
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
