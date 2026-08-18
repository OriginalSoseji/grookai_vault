import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

import { createClient } from '@supabase/supabase-js';
import {
  MTG_CARD_IMAGE_BUCKET,
  MTG_CARD_IMAGE_PLAN_LOGICAL_SHA256,
  MTG_CARD_IMAGE_PLAN_ROWS,
  MTG_CARD_IMAGE_PLAN_SHA256,
  MTG_CARD_IMAGE_SELF_HOST_VERSION,
  buildMtgHostedImagePointerV1,
  inspectImageBytesV1,
  inspectMtgImageSourceUrlV1,
  inspectMtgImagePlanRowV1,
  selectMtgImageCanaryV1,
  sha256MtgImageV1,
  stableJsonMtgImageV1,
} from '../../backend/pricing/mtg_card_image_self_host_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PLAN_DIR = path.join(ROOT, 'docs', 'audits', 'mtg_self_hosted_image_readiness_v1',
  '2026-08-13_full_offline_plan');
const PLAN_PATH = path.join(PLAN_DIR, 'image_assets.jsonl.gz');
const USER_AGENT = 'Grookai MTG Exact Image Self Host/1.0';

tls.setDefaultCACertificates([
  ...tls.getCACertificates('default'),
  ...tls.getCACertificates('system'),
]);

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function parseArgs(argv) {
  const args = { mode: null, startIndex: 0, maxAssets: null, concurrency: 10,
    sourceDelayMs: 120, timeoutMs: 45_000, quality: 'large', outDir: null,
    expectedHeadSha: null };
  for (const argument of argv) {
    const match = /^--([a-z-]+)=(.+)$/.exec(argument);
    if (!match) throw new Error(`Unsupported argument: ${argument}`);
    const [, key, value] = match;
    if (key === 'mode') args.mode = value;
    else if (key === 'start-index') args.startIndex = Number(value);
    else if (key === 'max-assets') args.maxAssets = Number(value);
    else if (key === 'concurrency') args.concurrency = Number(value);
    else if (key === 'source-delay-ms') args.sourceDelayMs = Number(value);
    else if (key === 'timeout-ms') args.timeoutMs = Number(value);
    else if (key === 'quality') args.quality = value;
    else if (key === 'out-dir') args.outDir = path.resolve(value);
    else if (key === 'expected-head-sha') args.expectedHeadSha = value.toLowerCase();
    else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!['plan', 'measure-canary', 'storage-canary', 'upload', 'verify'].includes(args.mode)) {
    throw new Error('--mode=plan|measure-canary|storage-canary|upload|verify required');
  }
  if (!Number.isInteger(args.startIndex) || args.startIndex < 0) throw new Error('Invalid start index');
  if (args.maxAssets !== null && (!Number.isInteger(args.maxAssets) || args.maxAssets < 1)) {
    throw new Error('Invalid max assets');
  }
  if (!Number.isInteger(args.concurrency) || args.concurrency < 1 || args.concurrency > 20) {
    throw new Error('Concurrency must be 1..20');
  }
  if (!Number.isInteger(args.sourceDelayMs) || args.sourceDelayMs < 100) {
    throw new Error('Source delay must be at least 100ms');
  }
  if (!['large', 'normal'].includes(args.quality)) throw new Error('Permanent quality must be JPEG');
  if (args.expectedHeadSha && !/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error('Invalid expected head SHA');
  }
  args.outDir ??= path.join(ROOT, '.tmp', 'mtg-card-image-storage-v1',
    `${args.mode}-${args.startIndex}-${args.maxAssets ?? 'all'}`);
  return args;
}

function repository(args) {
  const state = { branch: git('branch', '--show-current'), commit_sha: git('rev-parse', 'HEAD'),
    tracked_worktree_clean: git('status', '--porcelain', '--untracked-files=no') === '' };
  if (args.expectedHeadSha && state.commit_sha !== args.expectedHeadSha) {
    throw new Error('Producer commit mismatch');
  }
  if (!state.tracked_worktree_clean) throw new Error('Tracked worktree must be clean');
  return state;
}

async function loadPlan() {
  const compressed = await fs.readFile(PLAN_PATH);
  if (sha256MtgImageV1(compressed) !== MTG_CARD_IMAGE_PLAN_SHA256) {
    throw new Error('Compressed image plan hash mismatch');
  }
  const body = gunzipSync(compressed);
  if (sha256MtgImageV1(body) !== MTG_CARD_IMAGE_PLAN_LOGICAL_SHA256) {
    throw new Error('Logical image plan hash mismatch');
  }
  const rows = body.toString('utf8').trimEnd().split('\n').map((line) => JSON.parse(line));
  if (rows.length !== MTG_CARD_IMAGE_PLAN_ROWS) throw new Error('Image plan row count mismatch');
  const invalid = rows.find((row) => !inspectMtgImagePlanRowV1(row).valid);
  if (invalid) throw new Error(`Invalid frozen plan row: ${invalid.scryfall_print_id}`);
  return rows;
}

function range(rows, args) {
  const count = args.maxAssets ?? rows.length - args.startIndex;
  const selected = rows.slice(args.startIndex, args.startIndex + count);
  if (selected.length !== Math.min(count, Math.max(0, rows.length - args.startIndex))) {
    throw new Error('Range selection mismatch');
  }
  return selected;
}

async function writeArtifacts(dir, files, repositoryState) {
  await fs.mkdir(dir, { recursive: true });
  const hashes = {};
  for (const [name, value] of Object.entries(files)) {
    const body = Buffer.isBuffer(value) ? value : Buffer.from(name.endsWith('.json')
      ? `${JSON.stringify(value, null, 2)}\n` : String(value));
    await fs.writeFile(path.join(dir, name), body);
    hashes[name] = { bytes: body.length, sha256: sha256MtgImageV1(body) };
  }
  const manifest = { hash_algorithm: 'sha256', producer: repositoryState, artifacts: hashes };
  await fs.writeFile(path.join(dir, 'artifact_hashes.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

function storageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key || new URL(url).hostname !== 'ycdxbpibncqcchqiihfz.supabase.co') {
    throw new Error('Exact production Storage credentials are required');
  }
  return {
    client: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'user-agent': USER_AGENT } } }),
    publicBase: `${url}/storage/v1/object/public/${MTG_CARD_IMAGE_BUCKET}`,
  };
}

function createRateLimiter(delayMs) {
  let next = 0;
  let chain = Promise.resolve();
  return async () => {
    let release;
    const previous = chain;
    chain = new Promise((resolve) => { release = resolve; });
    await previous;
    const wait = Math.max(0, next - Date.now());
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    next = Date.now() + delayMs;
    release();
  };
}

async function readResponse(response, maxBytes = 12_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body ?? []) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) throw new Error('image_exceeds_limit');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

async function fetchExact(row, quality, limiter, timeoutMs) {
  const url = row.source_urls[quality];
  const failures = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await limiter();
      const response = await fetch(url, { redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'user-agent': USER_AGENT, accept: 'image/jpeg,image/png' } });
      const finalIdentity = inspectMtgImageSourceUrlV1(row, quality, response.url);
      if (!response.ok || !finalIdentity.valid) throw new Error(
        `source_http_or_redirect:${response.status}:${finalIdentity.findings.join(',')}`,
      );
      const buffer = await readResponse(response);
      const image = inspectImageBytesV1(buffer, response.headers.get('content-type'));
      if (!image.valid) throw new Error(`invalid_image:${image.findings.join(',')}`);
      return { buffer, image, requested_url: url, final_url: response.url, attempt };
    } catch (error) {
      failures.push(error.cause?.message ? `${error.message}:${error.cause.message}` : error.message);
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw new Error(`source_fetch_exhausted:${failures.join('|')}`);
}

async function exists(client, imagePath) {
  const split = imagePath.lastIndexOf('/');
  const folder = imagePath.slice(0, split);
  const name = imagePath.slice(split + 1);
  const { data, error } = await client.storage.from(MTG_CARD_IMAGE_BUCKET)
    .list(folder, { search: name, limit: 2 });
  if (error) throw new Error(`storage_list:${error.message}`);
  return (data ?? []).some((row) => row.name === name);
}

export async function uploadAndConfirm(client, pointer, buffer, {
  attempts = 4,
  retryDelayMs = 750,
} = {}) {
  const failures = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const { error } = await client.storage.from(MTG_CARD_IMAGE_BUCKET)
      .upload(pointer.image_path, buffer, { upsert: false,
        contentType: pointer.content_type, cacheControl: '31536000' });
    if (!error) return { attempt, ambiguous_response_recovered: false };
    failures.push(error.message);
    try {
      // A proxy can return a non-JSON response after Storage accepted the body.
      // Treat existence as provisional success; exact byte readback follows.
      if (await exists(client, pointer.image_path)) {
        return { attempt, ambiguous_response_recovered: true };
      }
    } catch (existenceError) {
      failures.push(`existence_check:${existenceError.message}`);
    }
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, attempt * retryDelayMs));
    }
  }
  throw new Error(`storage_upload_exhausted:${failures.join('|')}`);
}

export async function downloadAndInspect(client, pointer, {
  attempts = 3,
  retryDelayMs = 750,
} = {}) {
  const failures = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const { data, error } = await client.storage.from(MTG_CARD_IMAGE_BUCKET)
        .download(pointer.image_path);
      if (error || !data) {
        throw new Error(`storage_download:${error?.message ?? 'missing'}`);
      }
      const buffer = Buffer.from(await data.arrayBuffer());
      const image = inspectImageBytesV1(buffer, pointer.content_type);
      if (!image.valid || image.sha256 !== pointer.image_hash
        || image.size_bytes !== pointer.size_bytes || image.width !== pointer.width
        || image.height !== pointer.height) {
        throw new Error(`storage_readback_mismatch:${pointer.image_path}`);
      }
      return image;
    } catch (error) {
      failures.push(error.message);
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * retryDelayMs));
      }
    }
  }
  throw new Error(`storage_readback_exhausted:${failures.join('|')}`);
}

async function mapLimit(values, limit, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      try { results[index] = { ok: true, value: await mapper(values[index], index) }; }
      catch (error) { results[index] = { ok: false, error: error.message, row: values[index] }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

async function storeOne(client, publicBase, row, quality, limiter, timeoutMs, allowExisting,
  onCreated = null) {
  const fetched = await fetchExact(row, quality, limiter, timeoutMs);
  const pointer = buildMtgHostedImagePointerV1(row, fetched.image, quality, publicBase);
  const present = await exists(client, pointer.image_path);
  if (present && !allowExisting) throw new Error(`target_collision:${pointer.image_path}`);
  let created = false;
  if (!present) {
    await uploadAndConfirm(client, pointer, fetched.buffer);
    created = true;
    if (onCreated) await onCreated(pointer);
  }
  await downloadAndInspect(client, pointer);
  return { pointer, created, reused_verified: present };
}

function manifestBuffer(pointers) {
  const body = pointers.map((row) => stableJsonMtgImageV1(row)).join('\n') + '\n';
  return { body, gzip: gzipSync(Buffer.from(body), { level: 9, mtime: 0 }),
    logical_sha256: sha256MtgImageV1(body) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  const rows = await loadPlan();
  const selected = range(rows, args);
  const frozenPlan = { version: MTG_CARD_IMAGE_SELF_HOST_VERSION, repository: repo,
    source_plan: { rows: MTG_CARD_IMAGE_PLAN_ROWS, compressed_sha256: MTG_CARD_IMAGE_PLAN_SHA256,
      logical_sha256: MTG_CARD_IMAGE_PLAN_LOGICAL_SHA256 }, operation: args.mode,
    start_index: args.startIndex, max_assets: args.maxAssets, selected_assets: selected.length,
    quality: args.quality, concurrency: args.concurrency, source_delay_ms: args.sourceDelayMs,
    boundaries: { database_reads: 0, database_writes: 0, image_pointer_writes: 0,
      release_writes: 0, pricing_writes: 0, vault_writes: 0 } };

  if (args.mode === 'plan') {
    await writeArtifacts(args.outDir, { 'run_plan.json': frozenPlan,
      'summary.json': { status: 'range_plan_frozen_no_network', ...frozenPlan } }, repo);
    process.stdout.write(`${JSON.stringify(frozenPlan, null, 2)}\n`);
    return;
  }

  const canaryRows = selectMtgImageCanaryV1(rows, 20);
  const limiter = createRateLimiter(args.sourceDelayMs);
  if (args.mode === 'measure-canary') {
    const measurements = await mapLimit(canaryRows, args.concurrency, async (row) => {
      const png = await fetchExact(row, 'png', limiter, args.timeoutMs);
      const large = await fetchExact(row, 'large', limiter, args.timeoutMs);
      return { card_print_id: row.card_print_id, face_role: row.face_role,
        png: png.image, large: large.image, large_to_png_bytes_ratio:
          large.image.size_bytes / png.image.size_bytes };
    });
    const failures = measurements.filter((row) => !row.ok);
    const values = measurements.filter((row) => row.ok).map((row) => row.value);
    const sums = values.reduce((acc, row) => ({ png: acc.png + row.png.size_bytes,
      large: acc.large + row.large.size_bytes }), { png: 0, large: 0 });
    const summary = { status: failures.length ? 'measurement_failed' : 'measurement_complete',
      ...frozenPlan, selected_assets: canaryRows.length, measured: values.length, failures,
      average_png_bytes: values.length ? sums.png / values.length : null,
      average_large_bytes: values.length ? sums.large / values.length : null,
      projected_png_bytes: values.length ? sums.png / values.length * rows.length : null,
      projected_large_bytes: values.length ? sums.large / values.length * rows.length : null,
      storage_writes: 0 };
    await writeArtifacts(args.outDir, { 'run_plan.json': { ...frozenPlan,
      selected_asset_keys: canaryRows.map((row) => `${row.scryfall_print_id}:${row.face_index}`) },
    'measurements.json': values, 'summary.json': summary }, repo);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    if (failures.length) throw new Error('Measurement canary failed');
    return;
  }

  const { client, publicBase } = storageClient();
  if (args.mode === 'storage-canary') {
    const createdByPath = new Map();
    const results = await mapLimit(canaryRows, args.concurrency,
      (row) => storeOne(client, publicBase, row, args.quality, limiter, args.timeoutMs, false,
        (pointer) => { createdByPath.set(pointer.image_path, pointer); }));
    const created = [...createdByPath.values()];
    const readbackVerified = results.filter((row) => row.ok && row.value.created).length;
    let removeError = null;
    if (created.length) {
      const { error } = await client.storage.from(MTG_CARD_IMAGE_BUCKET)
        .remove(created.map((row) => row.image_path));
      removeError = error?.message ?? null;
    }
    const absent = await Promise.all(created.map(async (row) => !(await exists(client, row.image_path))));
    const failures = results.filter((row) => !row.ok);
    const passed = !failures.length && !removeError && readbackVerified === canaryRows.length
      && absent.every(Boolean);
    const summary = { status: passed ? 'storage_canary_passed_zero_residue'
      : 'storage_canary_failed', ...frozenPlan, selected_assets: canaryRows.length,
    uploaded_and_readback_verified: readbackVerified, uploaded_cleanup_candidates: created.length,
    removed_verified_absent:
      absent.filter(Boolean).length, failures, remove_error: removeError, database_writes: 0 };
    await writeArtifacts(args.outDir, { 'run_plan.json': { ...frozenPlan,
      selected_asset_keys: canaryRows.map((row) => `${row.scryfall_print_id}:${row.face_index}`) },
    'summary.json': summary }, repo);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    if (!passed) throw new Error('Storage canary failed');
    return;
  }

  if (args.mode === 'upload') {
    const results = await mapLimit(selected, args.concurrency,
      (row) => storeOne(client, publicBase, row, args.quality, limiter, args.timeoutMs, true));
    const failures = results.filter((row) => !row.ok);
    const pointers = results.filter((row) => row.ok).map((row) => row.value.pointer);
    const manifest = manifestBuffer(pointers);
    const summary = { status: failures.length ? 'storage_upload_incomplete'
      : 'storage_upload_complete_and_verified', ...frozenPlan, verified: pointers.length,
    created: results.filter((row) => row.ok && row.value.created).length,
    reused_verified: results.filter((row) => row.ok && row.value.reused_verified).length,
    failures, manifest_logical_sha256: manifest.logical_sha256,
    database_writes: 0, image_pointer_writes: 0 };
    await writeArtifacts(args.outDir, { 'run_plan.json': frozenPlan,
      'image_pointers.jsonl.gz': manifest.gzip, 'failures.json': failures,
      'summary.json': summary }, repo);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    if (failures.length) throw new Error('Storage upload incomplete');
    return;
  }

  throw new Error('Verify requires a bound pointer manifest and is implemented by the aggregate gate');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
