import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import tls from "node:tls";
import { fileURLToPath } from "node:url";
import { gzipSync, gunzipSync } from "node:zlib";

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import pg from "pg";

import {
  ONE_PIECE_CARD_IMAGE_BUCKET,
  ONE_PIECE_CARD_IMAGE_COUNT,
  ONE_PIECE_CARD_IMAGE_SELF_HOST_VERSION,
  buildOnePieceCardImagePointerV1,
  buildOnePieceCardImageSourcePlanV1,
  hashOnePieceCardImageV1,
  validateOnePieceCardImagePointersV1,
  validateOnePieceCardImageSourcePlanV1,
} from "../../backend/pricing/one_piece_card_image_self_host_v1.mjs";
import { inspectOnePieceImage } from
  "../../backend/pricing/one_piece_st01_language_and_image_readiness_v1.mjs";
import { pgSslConfig } from
  "./japanese_master_index_v4/read_only_guard_v1.mjs";

tls.setDefaultCACertificates([
  ...tls.getCACertificates("default"),
  ...tls.getCACertificates("system"),
]);

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AUDIT_ROOT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_card_image_self_host_v1");
const SOURCE_PLAN_PATH = path.join(AUDIT_ROOT, "source_plan_v1",
  "source_plan.json.gz");
const ASSET_MANIFEST_PATH = path.join(AUDIT_ROOT, "storage_upload_v1",
  "asset_manifest.json.gz");
const CACHE_ROOT = path.join(ROOT, ".tmp", "one_piece_card_image_self_host_v1");
const USER_AGENT = "Grookai One Piece Card Image Self Host/1.0";

const git = (...args) => execFileSync("git", args,
  { cwd: ROOT, encoding: "utf8" }).trim();

function parseArgs(argv) {
  const args = { mode: "", expectedHeadSha: "", expectedPlanFingerprint: "",
    concurrency: 20, timeoutMs: 45_000,
    envFile: "C:\\grookai_vault\\.env.local", outDir: "" };
  for (const argument of argv) {
    if (argument.startsWith("--mode=")) args.mode = argument.slice(7);
    else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--expected-plan-fingerprint=")) {
      args.expectedPlanFingerprint = argument.slice(28).trim().toLowerCase();
    } else if (argument.startsWith("--concurrency=")) {
      args.concurrency = Number(argument.slice(14));
    } else if (argument.startsWith("--timeout-ms=")) {
      args.timeoutMs = Number(argument.slice(13));
    } else if (argument.startsWith("--env-file=")) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!["plan", "canary", "upload", "verify"].includes(args.mode)) {
    throw new Error("--mode=plan|canary|upload|verify is required");
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha) ||
      (args.mode !== "plan" &&
       !/^[0-9a-f]{64}$/.test(args.expectedPlanFingerprint))) {
    throw new Error("Exact head and source plan fingerprints are required");
  }
  if (!Number.isInteger(args.concurrency) || args.concurrency < 1 ||
      args.concurrency > 50) throw new Error("Concurrency must be 1..50");
  args.outDir ||= path.join(AUDIT_ROOT, `${args.mode}_v1`);
  return args;
}

function repository(args) {
  const result = { branch: git("branch", "--show-current"),
    commit_sha: git("rev-parse", "HEAD"), tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "" };
  if (result.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      result.commit_sha !== args.expectedHeadSha ||
      !result.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean image producer");
  }
  return result;
}

function dbOptions(connectionString, name) {
  return { connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000, query_timeout: 180_000,
    statement_timeout: 180_000, application_name: name };
}

async function sourceRows(connectionString) {
  const client = new Client(dbOptions(connectionString,
    "one-piece-card-image-source-plan-v1"));
  await client.connect();
  try {
    await client.query("begin read only");
    const rows = (await client.query(`select cp.id::text card_print_id,
      cp.gv_id,cp.name canonical_name,sp.product_id source_product_id,
      sp.image_url source_image_url
      from public.card_prints cp
      join public.games game on game.id=cp.game_id and game.code='one_piece'
      join public.external_mappings mapping
        on mapping.card_print_id=cp.id and mapping.source='tcgplayer'
      join public.tcgcsv_source_products sp
        on sp.product_id=mapping.external_id::bigint and sp.category_id=68
      where cp.image_url is null and cp.image_path is null
        and cp.image_source is null and cp.image_hash is null
      order by sp.product_id`)).rows;
    await client.query("commit");
    return rows;
  } finally {
    await client.end();
  }
}

async function writeArtifacts(dir, files, producer) {
  await fs.mkdir(dir, { recursive: true });
  const hashes = {};
  for (const [name, value] of Object.entries(files)) {
    const body = Buffer.isBuffer(value) ? value : Buffer.from(name.endsWith(".json")
      ? `${JSON.stringify(value, null, 2)}\n` : String(value));
    await fs.writeFile(path.join(dir, name), body);
    hashes[name] = { bytes: body.length, sha256: hashOnePieceCardImageV1(body) };
  }
  await fs.writeFile(path.join(dir, "artifact_hashes.json"),
    `${JSON.stringify({ hash_algorithm: "sha256", producer_commit_sha: producer,
      artifacts: hashes }, null, 2)}\n`);
}

async function readBoundPlan(args) {
  const body = await fs.readFile(SOURCE_PLAN_PATH);
  const plan = JSON.parse(gunzipSync(body));
  const validation = validateOnePieceCardImageSourcePlanV1(plan);
  if (!validation.valid || plan.plan_fingerprint_sha256 !==
      args.expectedPlanFingerprint) throw new Error("Source plan binding failed");
  return { plan, body };
}

function storageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || new URL(url).hostname !==
      "ycdxbpibncqcchqiihfz.supabase.co") {
    throw new Error("Exact production Storage credentials are required");
  }
  return { client: createClient(url, key, { auth: { persistSession: false,
    autoRefreshToken: false }, global: { headers: { "user-agent": USER_AGENT } } }),
  publicBase: `${url}/storage/v1/object/public/${ONE_PIECE_CARD_IMAGE_BUCKET}` };
}

async function responseBuffer(response) {
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body ?? []) {
    const value = Buffer.from(chunk);
    size += value.length;
    if (size > 8_000_000) throw new Error("image_exceeds_8mb");
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function fetchImage(source, timeoutMs) {
  const attempts = [["high_resolution", source.high_resolution_url],
    ["exact_200w_fallback", source.source_image_url]];
  const errors = [];
  for (const [role, url] of attempts) {
    try {
      const response = await fetch(url, { redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs), headers: {
          "user-agent": USER_AGENT, accept: "image/jpeg,image/png,image/*",
        } });
      if (new URL(response.url).hostname.toLowerCase() !==
          "tcgplayer-cdn.tcgplayer.com" || !response.ok) {
        throw new Error(`http_or_redirect:${response.status}`);
      }
      const buffer = await responseBuffer(response);
      const image = inspectOnePieceImage(buffer,
        response.headers.get("content-type"));
      if (!image.valid_image) throw new Error(image.diagnostics.join(","));
      return { buffer, image: { ...image, source_download_role: role,
        requested_url: url, final_url: response.url } };
    } catch (error) {
      errors.push(`${role}:${error.message}`);
    }
  }
  throw new Error(errors.join("|"));
}

async function downloadStored(client, pointer) {
  const { data, error } = await client.storage.from(ONE_PIECE_CARD_IMAGE_BUCKET)
    .download(pointer.image_path);
  if (error || !data) throw new Error(`storage_download:${error?.message}`);
  const buffer = Buffer.from(await data.arrayBuffer());
  const observed = inspectOnePieceImage(buffer, pointer.content_type);
  if (observed.sha256 !== pointer.image_hash ||
      observed.size_bytes !== pointer.size_bytes ||
      observed.width !== pointer.width || observed.height !== pointer.height) {
    throw new Error(`storage_readback_mismatch:${pointer.gv_id}`);
  }
  return true;
}

async function exists(client, pointer) {
  const split = pointer.image_path.lastIndexOf("/");
  const folder = pointer.image_path.slice(0, split);
  const name = pointer.image_path.slice(split + 1);
  const { data, error } = await client.storage.from(ONE_PIECE_CARD_IMAGE_BUCKET)
    .list(folder, { search: name, limit: 10 });
  if (error) throw new Error(`storage_list:${error.message}`);
  return (data ?? []).some((row) => row.name === name);
}

async function processOne(storage, publicBase, source, args, allowExisting) {
  const fetched = await fetchImage(source, args.timeoutMs);
  const pointer = buildOnePieceCardImagePointerV1(source, fetched.image,
    publicBase);
  const wasPresent = await exists(storage, pointer);
  if (wasPresent && !allowExisting) throw new Error("canary_target_collision");
  let created = false;
  if (!wasPresent) {
    const { error } = await storage.storage.from(ONE_PIECE_CARD_IMAGE_BUCKET)
      .upload(pointer.image_path, fetched.buffer, { upsert: false,
        contentType: pointer.content_type, cacheControl: "31536000" });
    if (error) throw new Error(`storage_upload:${error.message}`);
    created = true;
  }
  await downloadStored(storage, pointer);
  return { pointer, created, reused_verified: wasPresent };
}

async function mapLimit(values, limit, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      try { results[index] = { ok: true, value: await mapper(values[index]) }; }
      catch (error) { results[index] = { ok: false, error: error.message,
        source: values[index] }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) },
    worker));
  return results;
}

async function cachePointer(pointer) {
  await fs.mkdir(CACHE_ROOT, { recursive: true });
  const target = path.join(CACHE_ROOT, `${pointer.source_product_id}.json`);
  const temp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(pointer)}\n`);
  await fs.rename(temp, target);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  dotenv.config({ path: args.envFile, quiet: true });
  if (args.mode === "plan") {
    if (!process.env.SUPABASE_DB_URL) throw new Error("SUPABASE_DB_URL required");
    const rows = await sourceRows(process.env.SUPABASE_DB_URL);
    const plan = buildOnePieceCardImageSourcePlanV1(rows);
    const validation = validateOnePieceCardImageSourcePlanV1(plan);
    if (!validation.valid) throw new Error(validation.findings.join(","));
    const compressed = gzipSync(Buffer.from(`${JSON.stringify(plan)}\n`));
    const summary = { status: "source_plan_frozen_read_only", repository: repo,
      plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
      item_count: plan.items.length, database_writes: 0, storage_writes: 0 };
    await writeArtifacts(args.outDir, { "source_plan.json.gz": compressed,
      "summary.json": summary, "REPORT.md":
        `# One Piece Card Image Source Plan V1\n\n- Status: \`${summary.status}\`\n- Images: \`6730\`\n` }, repo.commit_sha);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }
  const { plan } = await readBoundPlan(args);
  const { client, publicBase } = storageClient();
  if (args.mode === "canary") {
    const selected = plan.items.filter((_, index) => index % 269 === 0)
      .slice(0, 25);
    const results = await mapLimit(selected, Math.min(args.concurrency, 10),
      (source) => processOne(client, publicBase, source, args, false));
    const created = results.filter((row) => row.ok && row.value.created)
      .map((row) => row.value.pointer);
    let rollbackError = null;
    if (created.length) {
      const { error } = await client.storage.from(ONE_PIECE_CARD_IMAGE_BUCKET)
        .remove(created.map((row) => row.image_path));
      if (error) rollbackError = error.message;
    }
    const absent = await Promise.all(created.map(async (pointer) =>
      !(await exists(client, pointer))));
    const failures = results.filter((row) => !row.ok);
    const valid = failures.length === 0 && !rollbackError &&
      created.length === selected.length && absent.every(Boolean);
    const summary = { status: valid ? "storage_canary_passed_zero_residue" :
      "storage_canary_failed", repository: repo,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    selected: selected.length, uploaded_verified: created.length,
    removed_verified_absent: absent.filter(Boolean).length,
    failures, rollback_error: rollbackError, database_writes: 0 };
    await writeArtifacts(args.outDir, { "summary.json": summary,
      "REPORT.md": `# One Piece Card Image Storage Canary V1\n\n- Status: \`${summary.status}\`\n` }, repo.commit_sha);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    if (!valid) throw new Error("Storage canary failed");
    return;
  }
  if (args.mode === "upload") {
    await fs.mkdir(CACHE_ROOT, { recursive: true });
    const results = await mapLimit(plan.items, args.concurrency, async (source) => {
      const cachedPath = path.join(CACHE_ROOT, `${source.source_product_id}.json`);
      try {
        const pointer = JSON.parse(await fs.readFile(cachedPath, "utf8"));
        await downloadStored(client, pointer);
        return { pointer, created: false, reused_verified: true };
      } catch {}
      const result = await processOne(client, publicBase, source, args, true);
      await cachePointer(result.pointer);
      return result;
    });
    const failures = results.filter((row) => !row.ok);
    const pointers = results.filter((row) => row.ok).map((row) => row.value.pointer)
      .sort((left, right) => left.source_product_id - right.source_product_id);
    const validation = validateOnePieceCardImagePointersV1(pointers);
    const valid = failures.length === 0 && validation.valid;
    const compressed = gzipSync(Buffer.from(`${JSON.stringify({
      version: ONE_PIECE_CARD_IMAGE_SELF_HOST_VERSION,
      source_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
      pointers,
      pointer_payload_fingerprint_sha256:
        hashOnePieceCardImageV1(pointers),
    })}\n`));
    const summary = { status: valid ? "storage_upload_complete_and_verified" :
      "storage_upload_incomplete", repository: repo,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    planned: plan.items.length, verified: pointers.length,
    created: results.filter((row) => row.ok && row.value.created).length,
    reused_verified: results.filter((row) => row.ok &&
      row.value.reused_verified).length, failures, validation,
    database_writes: 0, pointer_writes: 0 };
    await writeArtifacts(args.outDir, { "asset_manifest.json.gz": compressed,
      "summary.json": summary, "REPORT.md":
        `# One Piece Card Image Storage Upload V1\n\n- Status: \`${summary.status}\`\n- Verified: \`${pointers.length}/6730\`\n` }, repo.commit_sha);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    if (!valid) throw new Error("Storage upload incomplete");
    return;
  }
  const manifest = JSON.parse(gunzipSync(await fs.readFile(ASSET_MANIFEST_PATH)));
  if (manifest.source_plan_fingerprint_sha256 !== plan.plan_fingerprint_sha256 ||
      manifest.pointer_payload_fingerprint_sha256 !==
        hashOnePieceCardImageV1(manifest.pointers) ||
      !validateOnePieceCardImagePointersV1(manifest.pointers).valid) {
    throw new Error("Asset manifest binding failed");
  }
  const results = await mapLimit(manifest.pointers, args.concurrency,
    (pointer) => downloadStored(client, pointer));
  const failures = results.filter((row) => !row.ok);
  const summary = { status: failures.length === 0 ?
    "independent_storage_readback_passed" :
    "independent_storage_readback_failed", repository: repo,
  plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
  verified: results.length - failures.length, failures,
  database_writes: 0, pointer_writes: 0 };
  await writeArtifacts(args.outDir, { "summary.json": summary,
    "REPORT.md": `# One Piece Card Image Storage Readback V1\n\n- Status: \`${summary.status}\`\n` }, repo.commit_sha);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (failures.length) throw new Error("Independent Storage readback failed");
}

await main();
