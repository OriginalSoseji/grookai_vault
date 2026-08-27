import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  COLLECTIBLE_SHADOW_ADAPTER_REGISTRY_VERSION,
  COLLECTIBLE_SHADOW_ADAPTERS,
  collectibleRegistryFingerprintV1,
  validateCollectibleShadowAdapterRegistryV1,
} from "../../backend/catalog/collectible_shadow_adapter_registry_v1.mjs";

export const COLLECTIBLE_SHADOW_ADAPTER_PROBE_VERSION =
  "COLLECTIBLE_SHADOW_ADAPTER_PROBE_V1";

const USER_AGENT = "GrookaiVaultCollectibleShadow/1.0 (+https://grookai.com)";
const MAX_RESPONSE_BYTES = 25 * 1024 * 1024;

function parseArgs(argv) {
  const options = {
    adapterIds: null,
    expectedHeadSha: process.env.GITHUB_SHA ?? null,
    fixtureDir: null,
    maxConcurrency: 4,
    outDir: null,
    requestTimeoutMs: 30_000,
  };
  for (const token of argv) {
    if (token.startsWith("--adapter-ids=")) {
      options.adapterIds = new Set(token.slice(14).split(",").map((value) => value.trim()).filter(Boolean));
    } else if (token.startsWith("--expected-head-sha=")) {
      options.expectedHeadSha = token.slice(20);
    } else if (token.startsWith("--fixture-dir=")) {
      options.fixtureDir = path.resolve(token.slice(14));
    } else if (token.startsWith("--max-concurrency=")) {
      options.maxConcurrency = Number.parseInt(token.slice(18), 10);
    } else if (token.startsWith("--out-dir=")) {
      options.outDir = path.resolve(token.slice(10));
    } else if (token.startsWith("--request-timeout-ms=")) {
      options.requestTimeoutMs = Number.parseInt(token.slice(21), 10);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  if (!options.outDir) throw new Error("--out-dir is required");
  if (!Number.isInteger(options.maxConcurrency) || options.maxConcurrency < 1 || options.maxConcurrency > 8) {
    throw new Error("--max-concurrency must be between 1 and 8");
  }
  if (!Number.isInteger(options.requestTimeoutMs) || options.requestTimeoutMs < 1_000 || options.requestTimeoutMs > 120_000) {
    throw new Error("--request-timeout-ms must be between 1000 and 120000");
  }
  if (options.expectedHeadSha && !/^[0-9a-f]{40}$/.test(options.expectedHeadSha)) {
    throw new Error("--expected-head-sha must be a lowercase 40-character SHA");
  }
  return options;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function serializeProbeError(error) {
  return {
    message: String(error?.message ?? error),
    code: error?.code ?? null,
    cause_message: error?.cause?.message ?? null,
    cause_code: error?.cause?.code ?? null,
  };
}

function currentHeadSha() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  await fs.writeFile(file, bytes);
  return bytes;
}

async function mapPool(values, concurrency, task) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

async function probeFixture(adapterRow, fixtureDir) {
  const fixturePath = path.join(fixtureDir, `${adapterRow.adapter_id}.html`);
  const bytes = await fs.readFile(fixturePath);
  return {
    adapter_id: adapterRow.adapter_id,
    catalog_key: adapterRow.catalog_key,
    domain: adapterRow.domain,
    source_url: adapterRow.official_source_url,
    final_url: adapterRow.official_source_url,
    status: "healthy",
    http_status: 200,
    content_type: "text/html; fixture=true",
    content_length_header: String(bytes.length),
    response_bytes: bytes.length,
    response_sha256: sha256(bytes),
    etag: null,
    last_modified: null,
    persistence: "hash_and_metadata_only",
    body_persisted: false,
    fixture: true,
  };
}

async function probeNetwork(adapterRow, requestTimeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(adapterRow.official_source_url, {
      headers: {
        Accept: "application/json,text/html;q=0.9,*/*;q=0.8",
        "User-Agent": USER_AGENT,
      },
      redirect: "follow",
      signal: controller.signal,
    });
    const declaredLength = Number.parseInt(response.headers.get("content-length") ?? "0", 10);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
      throw new Error(`response exceeds ${MAX_RESPONSE_BYTES} bytes`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_RESPONSE_BYTES) {
      throw new Error(`response exceeds ${MAX_RESPONSE_BYTES} bytes`);
    }
    return {
      adapter_id: adapterRow.adapter_id,
      catalog_key: adapterRow.catalog_key,
      domain: adapterRow.domain,
      source_url: adapterRow.official_source_url,
      final_url: response.url,
      status: response.ok ? "healthy" : "source_error",
      http_status: response.status,
      content_type: response.headers.get("content-type"),
      content_length_header: response.headers.get("content-length"),
      response_bytes: bytes.length,
      response_sha256: sha256(bytes),
      etag: response.headers.get("etag"),
      last_modified: response.headers.get("last-modified"),
      persistence: "hash_and_metadata_only",
      body_persisted: false,
      fixture: false,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function probeAdapter(adapterRow, options) {
  const startedAt = new Date().toISOString();
  try {
    const result = options.fixtureDir
      ? await probeFixture(adapterRow, options.fixtureDir)
      : await probeNetwork(adapterRow, options.requestTimeoutMs);
    return { ...result, started_at: startedAt, completed_at: new Date().toISOString() };
  } catch (error) {
    return {
      adapter_id: adapterRow.adapter_id,
      catalog_key: adapterRow.catalog_key,
      domain: adapterRow.domain,
      source_url: adapterRow.official_source_url,
      status: "probe_failed",
      error: serializeProbeError(error),
      persistence: "hash_and_metadata_only",
      body_persisted: false,
      fixture: Boolean(options.fixtureDir),
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    };
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (process.env.CATALOG_AUTOMATION_MODE !== "shadow-only") {
    throw new Error("CATALOG_AUTOMATION_MODE must equal shadow-only");
  }
  const registrySummary = validateCollectibleShadowAdapterRegistryV1();
  const actualHeadSha = currentHeadSha();
  if (options.expectedHeadSha && options.expectedHeadSha !== actualHeadSha) {
    throw new Error("Current HEAD does not match --expected-head-sha");
  }
  const selected = COLLECTIBLE_SHADOW_ADAPTERS.filter((row) =>
    row.probe_enabled && (!options.adapterIds || options.adapterIds.has(row.adapter_id)));
  if (options.adapterIds) {
    const selectedIds = new Set(selected.map((row) => row.adapter_id));
    const missing = [...options.adapterIds].filter((id) => !selectedIds.has(id));
    if (missing.length > 0) throw new Error(`Unknown or non-probe adapters: ${missing.join(",")}`);
  }
  if (selected.length === 0) throw new Error("No probe adapters selected");

  const runPlan = {
    version: COLLECTIBLE_SHADOW_ADAPTER_PROBE_VERSION,
    mode: "shadow-only",
    registry_version: COLLECTIBLE_SHADOW_ADAPTER_REGISTRY_VERSION,
    registry_fingerprint_sha256: collectibleRegistryFingerprintV1(),
    expected_head_sha: options.expectedHeadSha,
    actual_head_sha: actualHeadSha,
    adapter_ids: selected.map((row) => row.adapter_id),
    max_concurrency: options.maxConcurrency,
    request_timeout_ms: options.requestTimeoutMs,
    fixture_mode: Boolean(options.fixtureDir),
    runtime: {
      node_version: process.version,
      platform: process.platform,
      system_ca_enabled: String(process.env.NODE_OPTIONS ?? "")
        .split(/\s+/).includes("--use-system-ca"),
    },
    boundaries: {
      database_access: false,
      database_writes: false,
      storage_writes: false,
      image_downloads: false,
      raw_source_body_persistence: false,
      canonical_writes: false,
      writer_dispatches: false,
    },
  };
  const artifacts = [];
  const planBytes = await writeJson(path.join(options.outDir, "run_plan.json"), runPlan);
  artifacts.push({ path: "run_plan.json", bytes: planBytes.length, sha256: sha256(planBytes) });

  const results = await mapPool(selected, options.maxConcurrency, (row) =>
    probeAdapter(row, options));
  const failed = results.filter((row) => row.status !== "healthy");
  const summary = {
    version: COLLECTIBLE_SHADOW_ADAPTER_PROBE_VERSION,
    mode: "shadow-only",
    status: failed.length === 0 ? "completed" : "completed_with_source_failures",
    registry: registrySummary,
    selected_adapter_count: selected.length,
    healthy_adapter_count: results.length - failed.length,
    failed_adapter_count: failed.length,
    failed_adapter_ids: failed.map((row) => row.adapter_id),
    boundaries: runPlan.boundaries,
    completed_at: new Date().toISOString(),
  };
  for (const [name, value] of [
    ["registry_snapshot.json", {
      version: COLLECTIBLE_SHADOW_ADAPTER_REGISTRY_VERSION,
      fingerprint_sha256: collectibleRegistryFingerprintV1(),
      adapters: COLLECTIBLE_SHADOW_ADAPTERS,
    }],
    ["source_snapshots.json", results],
    ["summary.json", summary],
  ]) {
    const bytes = await writeJson(path.join(options.outDir, name), value);
    artifacts.push({ path: name, bytes: bytes.length, sha256: sha256(bytes) });
  }
  await writeJson(path.join(options.outDir, "artifact_hashes.json"), {
    algorithm: "sha256",
    artifacts,
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
