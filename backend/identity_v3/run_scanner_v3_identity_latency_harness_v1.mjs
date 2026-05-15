import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import sharp from 'sharp';

const DEFAULT_ENDPOINT = 'https://scanner-identity.grookaivault.com';
const DEFAULT_ITERATIONS = 6;
const DEFAULT_TOP_K = 15;
const DEFAULT_TIMEOUT_MS = 120_000;

function parseArgs(argv) {
  const args = {
    endpoint: process.env.SCANNER_V3_IDENTITY_BASE_ENDPOINT || DEFAULT_ENDPOINT,
    iterations: positiveInt(process.env.SCANNER_V3_LATENCY_ITERATIONS, DEFAULT_ITERATIONS),
    cropCount: positiveInt(process.env.SCANNER_V3_LATENCY_CROP_COUNT, 1),
    topK: positiveInt(process.env.SCANNER_V3_LATENCY_TOP_K, DEFAULT_TOP_K),
    timeoutMs: positiveInt(process.env.SCANNER_V3_LATENCY_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    image: process.env.SCANNER_V3_LATENCY_IMAGE || null,
    cropType: process.env.SCANNER_V3_LATENCY_CROP_TYPE || 'latency_synthetic',
    out: process.env.SCANNER_V3_LATENCY_REPORT || null,
    mode: process.env.SCANNER_V3_LATENCY_MODE || 'latency_harness_v1',
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    const [name, inlineValue] = raw.includes('=') ? raw.split(/=(.*)/s, 2) : [raw, null];
    const nextValue = () => {
      if (inlineValue !== null) return inlineValue;
      i += 1;
      return argv[i] ?? '';
    };

    if (name === '--endpoint') {
      args.endpoint = nextValue() || DEFAULT_ENDPOINT;
    } else if (name === '--iterations') {
      args.iterations = positiveInt(nextValue(), DEFAULT_ITERATIONS);
    } else if (name === '--crop-count') {
      args.cropCount = positiveInt(nextValue(), 1);
    } else if (name === '--top-k') {
      args.topK = positiveInt(nextValue(), DEFAULT_TOP_K);
    } else if (name === '--timeout-ms') {
      args.timeoutMs = positiveInt(nextValue(), DEFAULT_TIMEOUT_MS);
    } else if (name === '--image') {
      args.image = nextValue() || null;
    } else if (name === '--crop-type') {
      args.cropType = nextValue() || 'latency_synthetic';
    } else if (name === '--out') {
      args.out = nextValue() || null;
    } else if (name === '--mode') {
      args.mode = nextValue() || 'latency_harness_v1';
    } else if (name === '--help' || name === '-h') {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  node backend/identity_v3/run_scanner_v3_identity_latency_harness_v1.mjs --endpoint https://scanner-identity.grookaivault.com --iterations 6',
    '  node backend/identity_v3/run_scanner_v3_identity_latency_harness_v1.mjs --endpoint http://127.0.0.1:8788 --image .tmp/sample.png --out .tmp/latency.json',
    '',
    'Purpose:',
    '  Measures the Scanner V3 /scanner-v3/resolve-crops service contract without changing the app or index.',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const urls = endpointUrls(args.endpoint);
  const cropImageB64 = await loadCropImageB64(args);
  const health = await getJson(urls.health, args.timeoutMs);
  const runs = [];

  for (let index = 0; index < args.iterations; index += 1) {
    runs.push(await runResolveCrops({
      index,
      url: urls.resolveCrops,
      args,
      cropImageB64,
    }));
  }

  const report = {
    generated_at: new Date().toISOString(),
    harness: 'scanner_v3_identity_latency_harness_v1',
    endpoint: urls.base,
    resolve_crops_url: urls.resolveCrops,
    health,
    request: {
      iterations: args.iterations,
      crop_count: args.cropCount,
      top_k: args.topK,
      crop_type: args.cropType,
      image_source: args.image ? path.resolve(args.image) : 'synthetic_png',
      mode: args.mode,
    },
    summary: summarizeRuns(runs),
    runs,
  };

  if (args.out) {
    const outPath = path.resolve(args.out);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log(JSON.stringify(report, null, 2));
}

async function runResolveCrops({ index, url, args, cropImageB64 }) {
  const body = {
    mode: args.mode,
    top_k: args.topK,
    crops: Array.from({ length: args.cropCount }, (_, cropIndex) => ({
      crop_type: `${args.cropType}_${cropIndex + 1}`,
      image_b64: cropImageB64,
    })),
  };
  const startedAt = performance.now();
  const { status, payload } = await postJson(url, body, args.timeoutMs);
  const totalMs = roundMs(performance.now() - startedAt);
  const crops = Array.isArray(payload?.crops) ? payload.crops : [];

  return {
    run: index + 1,
    status,
    ok: status >= 200 && status < 300 && payload?.ok === true,
    total_ms: totalMs,
    service_elapsed_ms: payload?.elapsed_ms ?? null,
    reference_count: payload?.reference_count ?? null,
    reference_view_count: payload?.reference_view_count ?? null,
    searched_reference_view_count: payload?.reference_view_count ?? null,
    crop_count: crops.length,
    successful_crop_count: crops.filter((crop) => crop.ok).length,
    crop_embedding_ms: crops.map((crop) => crop.embedding_ms).filter(isFiniteNumber),
    crop_vector_search_ms: crops.map((crop) => crop.vector_search_ms).filter(isFiniteNumber),
    crop_elapsed_ms: crops.map((crop) => crop.elapsed_ms).filter(isFiniteNumber),
    crop_ann: crops.map((crop) => crop.ann ?? null),
    errors: crops.filter((crop) => !crop.ok).map((crop) => crop.error ?? 'unknown_error'),
  };
}

function summarizeRuns(runs) {
  const warmRuns = runs.slice(1);
  const total = runs.map((run) => run.total_ms).filter(isFiniteNumber);
  const warmTotal = warmRuns.map((run) => run.total_ms).filter(isFiniteNumber);
  const embedding = runs.flatMap((run) => run.crop_embedding_ms).filter(isFiniteNumber);
  const vector = runs.flatMap((run) => run.crop_vector_search_ms).filter(isFiniteNumber);
  const cropElapsed = runs.flatMap((run) => run.crop_elapsed_ms).filter(isFiniteNumber);
  const annRows = runs.flatMap((run) => run.crop_ann ?? []).filter(Boolean);
  const latest = [...runs].reverse().find((run) => run.reference_count !== null);

  return {
    ok: runs.every((run) => run.ok),
    run_count: runs.length,
    cold_start_latency_ms: total[0] ?? null,
    total_ms_p50: percentile(total, 50),
    total_ms_p95: percentile(total, 95),
    warm_total_ms_p50: percentile(warmTotal, 50),
    warm_total_ms_p95: percentile(warmTotal, 95),
    embedding_ms_p50: percentile(embedding, 50),
    embedding_ms_p95: percentile(embedding, 95),
    vector_search_ms_p50: percentile(vector, 50),
    vector_search_ms_p95: percentile(vector, 95),
    crop_elapsed_ms_p50: percentile(cropElapsed, 50),
    crop_elapsed_ms_p95: percentile(cropElapsed, 95),
    reference_count: latest?.reference_count ?? null,
    reference_view_count: latest?.reference_view_count ?? null,
    searched_reference_view_count: latest?.searched_reference_view_count ?? null,
    ann_candidate_vector_count_p50: percentile(
      annRows.map((ann) => ann.candidate_vector_count),
      50,
    ),
    ann_exact_rerank_vector_count_p50: percentile(
      annRows.map((ann) => ann.exact_rerank_vector_count),
      50,
    ),
  };
}

async function loadCropImageB64(args) {
  const buffer = args.image
    ? await readFile(path.resolve(args.image))
    : await syntheticCropPng();
  return buffer.toString('base64');
}

async function syntheticCropPng() {
  const svg = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#f4f0e8"/>
  <rect x="38" y="42" width="436" height="428" rx="24" fill="#ffffff" stroke="#222222" stroke-width="8"/>
  <rect x="68" y="88" width="376" height="212" fill="#b9d7ee"/>
  <rect x="84" y="320" width="344" height="22" fill="#222222"/>
  <rect x="84" y="360" width="268" height="18" fill="#777777"/>
  <rect x="84" y="394" width="318" height="18" fill="#999999"/>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function getJson(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return {
      status: response.status,
      payload: await response.json(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function postJson(url, body, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      payload: await response.json(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function endpointUrls(endpoint) {
  const raw = String(endpoint ?? '').trim().replace(/\/+$/u, '');
  const resolveCrops = raw.endsWith('/scanner-v3/resolve-crops')
    ? raw
    : `${raw}/scanner-v3/resolve-crops`;
  const base = resolveCrops.replace(/\/scanner-v3\/resolve-crops$/u, '');
  return {
    base,
    health: `${base}/health`,
    resolveCrops,
  };
}

function percentile(values, pct) {
  const sorted = values.filter(isFiniteNumber).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1),
  );
  return roundMs(sorted[index]);
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function roundMs(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
