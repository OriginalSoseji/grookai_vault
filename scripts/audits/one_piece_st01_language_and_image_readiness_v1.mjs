import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import tls from "node:tls";
import { fileURLToPath } from "node:url";

import {
  MAX_IMAGE_BYTES,
  ONE_PIECE_IMAGE_SOURCE_HOST,
  ONE_PIECE_ST01_CARD_LIST_URL,
  ONE_PIECE_ST01_OFFICIAL_HOST,
  ONE_PIECE_ST01_PRODUCT_URL,
  ONE_PIECE_ST01_READINESS_VERSION,
  evaluateSt01OfficialAuthority,
  inspectOnePieceImage,
  parseTcgplayerImageReference,
  proposedImageTarget,
  sha256,
  stableJson,
  validateReadinessRows,
} from "../../backend/pricing/one_piece_st01_language_and_image_readiness_v1.mjs";

tls.setDefaultCACertificates([
  ...tls.getCACertificates("default"),
  ...tls.getCACertificates("system"),
]);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_import_staged_identity_review_v1",
  "starter_deck_1_review_v1", "review_rows.jsonl");
const SOURCE_SHA256 =
  "effc4ccc2e71be5cab7a30356763a2ca09d2d14b73bee48203ef3766dc97927b";
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_language_and_image_readiness_v1", "st01_group_3189_v1");
const DEFAULT_CACHE = path.join(ROOT, ".tmp",
  "one_piece_st01_language_and_image_readiness_v1");
const BRANCH = "agent/one-piece-ingestion-readiness-v1";
const USER_AGENT = "Grookai One Piece ST-01 Readiness/1.0";

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const options = {
    expectedHeadSha: "",
    outDir: DEFAULT_OUT,
    cacheDir: DEFAULT_CACHE,
    concurrency: 6,
    timeoutMs: 45_000,
  };
  for (const argument of argv) {
    if (argument.startsWith("--expected-head-sha=")) {
      options.expectedHeadSha = argument.slice("--expected-head-sha=".length);
    } else if (argument.startsWith("--out-dir=")) {
      options.outDir = path.resolve(argument.slice("--out-dir=".length));
    } else if (argument.startsWith("--cache-dir=")) {
      options.cacheDir = path.resolve(argument.slice("--cache-dir=".length));
    } else if (argument.startsWith("--concurrency=")) {
      options.concurrency = Number.parseInt(argument.slice("--concurrency=".length), 10);
    } else if (argument.startsWith("--timeout-ms=")) {
      options.timeoutMs = Number.parseInt(argument.slice("--timeout-ms=".length), 10);
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(options.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 ||
      options.concurrency > 10) {
    throw new Error("Concurrency must be between 1 and 10");
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 10_000 ||
      options.timeoutMs > 120_000) {
    throw new Error("Timeout must be between 10000 and 120000 milliseconds");
  }
  const tempRoot = path.join(ROOT, ".tmp");
  if (!options.cacheDir.startsWith(`${tempRoot}${path.sep}`)) {
    throw new Error("Cache must remain under repository .tmp");
  }
  return options;
}

async function readResponseBuffer(response) {
  const declared = Number.parseInt(response.headers.get("content-length") ?? "0", 10);
  if (declared > MAX_IMAGE_BYTES) {
    throw new Error(`response_too_large_declared:${declared}`);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body ?? []) {
    const value = Buffer.from(chunk);
    size += value.length;
    if (size > MAX_IMAGE_BYTES) {
      await response.body?.cancel().catch(() => {});
      throw new Error(`response_too_large_streamed:${size}`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function fetchOfficial(url, timeoutMs) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" ||
      parsed.hostname.toLowerCase() !== ONE_PIECE_ST01_OFFICIAL_HOST) {
    throw new Error(`Official URL outside allowlist: ${url}`);
  }
  const response = await fetch(parsed, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "user-agent": USER_AGENT, accept: "text/html" },
  });
  const final = new URL(response.url);
  if (final.protocol !== "https:" ||
      final.hostname.toLowerCase() !== ONE_PIECE_ST01_OFFICIAL_HOST) {
    throw new Error(`Official redirect outside allowlist: ${response.url}`);
  }
  const body = await response.text();
  return {
    requested_url: url,
    final_url: response.url,
    http_status: response.status,
    http_ok: response.ok,
    content_type: response.headers.get("content-type"),
    bytes: Buffer.byteLength(body),
    sha256: sha256(body),
    body,
  };
}

async function fetchImage(url, timeoutMs) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" ||
      parsed.hostname.toLowerCase() !== ONE_PIECE_IMAGE_SOURCE_HOST) {
    throw new Error(`Image URL outside allowlist: ${url}`);
  }
  const response = await fetch(parsed, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "user-agent": USER_AGENT,
      accept: "image/jpeg,image/*;q=0.8,*/*;q=0.1",
    },
  });
  const final = new URL(response.url);
  if (final.protocol !== "https:" ||
      final.hostname.toLowerCase() !== ONE_PIECE_IMAGE_SOURCE_HOST) {
    throw new Error(`Image redirect outside allowlist: ${response.url}`);
  }
  const buffer = await readResponseBuffer(response);
  const inspected = inspectOnePieceImage(buffer, response.headers.get("content-type"));
  return {
    buffer,
    observation: {
      requested_url: url,
      final_url: response.url,
      http_status: response.status,
      http_ok: response.ok,
      tls_verification: "node_bundled_plus_windows_system_ca_roots",
      ...inspected,
      accepted: response.ok && inspected.valid_image,
    },
  };
}

async function mapLimit(values, limit, mapper) {
  const output = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return output;
}

async function acquireImage(row, options) {
  const source = parseTcgplayerImageReference(
    row.source_image_reference,
    row.source_product_id,
  );
  const attempts = [];
  let selected = null;
  for (const candidate of [
    ["derived_high_resolution", source.high_resolution_candidate_url],
    ["exact_staged_reference", source.exact_reference_url],
  ]) {
    const [role, url] = candidate;
    try {
      const result = await fetchImage(url, options.timeoutMs);
      attempts.push({ role, ...result.observation });
      if (result.observation.accepted) {
        selected = { role, ...result.observation, buffer: result.buffer };
        break;
      }
    } catch (error) {
      attempts.push({
        role,
        requested_url: url,
        accepted: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  if (!selected) {
    return {
      source_reference: source,
      attempts,
      selected_source: null,
      local_cache_path: null,
      target_storage_path: null,
      target_path_status: "no_valid_source",
      storage_write_performed: false,
      pointer_write_performed: false,
    };
  }
  const relativeCache = path.join(
    String(row.source_product_id),
    `${selected.sha256}.${selected.format}`,
  );
  const cachePath = path.join(options.cacheDir, relativeCache);
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, selected.buffer);
  const readback = await fs.readFile(cachePath);
  if (sha256(readback) !== selected.sha256) {
    throw new Error(`Local cache hash mismatch: ${row.source_product_id}`);
  }
  const { buffer: ignored, ...selectedSource } = selected;
  return {
    source_reference: source,
    attempts,
    selected_source: selectedSource,
    local_cache_path: path.relative(ROOT, cachePath).replaceAll("\\", "/"),
    local_cache_sha256: selected.sha256,
    ...proposedImageTarget(row, selectedSource),
    storage_collision_preflight: "required_before_future_upload",
    storage_write_performed: false,
    pointer_write_performed: false,
  };
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const repository = {
    commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
  };
  if (repository.commit_sha !== options.expectedHeadSha ||
      repository.branch !== BRANCH ||
      git("status", "--porcelain", "--untracked-files=no") !== "") {
    throw new Error("Repository is not the exact clean readiness producer");
  }
  const sourceBody = await fs.readFile(SOURCE, "utf8");
  if (sha256(sourceBody) !== SOURCE_SHA256) {
    throw new Error("Staged review source changed");
  }
  const stagedRows = sourceBody.trim().split(/\r?\n/).map(JSON.parse);
  if (stagedRows.length !== 21) throw new Error("Staged review row count changed");

  const [productResponse, cardListResponse] = await Promise.all([
    fetchOfficial(ONE_PIECE_ST01_PRODUCT_URL, options.timeoutMs),
    fetchOfficial(ONE_PIECE_ST01_CARD_LIST_URL, options.timeoutMs),
  ]);
  const authority = evaluateSt01OfficialAuthority({
    productResponse,
    cardListResponse,
    stagedRows,
  });
  const languageByProduct = new Map(authority.rows.map((row) =>
    [row.source_product_id, row]));
  const imageResults = await mapLimit(stagedRows, options.concurrency,
    (row) => acquireImage(row, options));
  const rows = stagedRows.map((row, index) => ({
    row_ordinal: row.row_ordinal,
    staging_row_id: row.staging_row_id,
    source_product_id: row.source_product_id,
    source_product_name: row.source_product_name,
    review_lane: row.review_lane,
    card_number: row.card_number,
    proposed_parent_gv_id: row.proposed_parent_gv_id,
    language_authority: languageByProduct.get(row.source_product_id),
    image: imageResults[index],
    database_write_performed: false,
    canonical_write_authorized: false,
    sealed_write_authorized: false,
    publishable: false,
  }));
  const findings = validateReadinessRows(rows);
  const duplicateImageHashes = Object.entries(rows.reduce((acc, row) => {
    const hash = row.image.selected_source?.sha256;
    if (hash) (acc[hash] ??= []).push(row.source_product_id);
    return acc;
  }, {})).filter(([, ids]) => ids.length > 1)
    .map(([image_sha256, source_product_ids]) => ({ image_sha256, source_product_ids }));
  const summaryCore = {
    version: ONE_PIECE_ST01_READINESS_VERSION,
    status: findings.length === 0
      ? "language_and_image_acquisition_readiness_passed_no_writes"
      : "language_or_image_acquisition_readiness_failed",
    repository,
    source_review_sha256: SOURCE_SHA256,
    authority_summary: authority.summary,
    counts: {
      selected_rows: rows.length,
      accepted_images: rows.filter((row) => row.image.selected_source?.accepted).length,
      preferred_resolution_images: rows.filter((row) =>
        row.image.selected_source?.preferred_self_hosted_resolution).length,
      card_or_don_proposed_paths: rows.filter((row) =>
        row.image.target_path_status === "proposed_content_addressed_card_path").length,
      sealed_paths_pending_contract: rows.filter((row) =>
        row.image.target_path_status === "pending_sealed_image_contract").length,
      duplicate_image_hash_groups: duplicateImageHashes.length,
      findings: findings.length,
    },
    findings,
    duplicate_image_hashes: duplicateImageHashes,
    boundaries: {
      source_scope: "tcgplayer_category_68_group_3189_st01_only",
      blanket_tcgplayer_category_language_authority: false,
      downloaded_bytes_cache_only: true,
      cache_root: path.relative(ROOT, options.cacheDir).replaceAll("\\", "/"),
      database_connections: 0,
      database_writes: 0,
      storage_connections: 0,
      storage_writes: 0,
      pointer_updates: 0,
      canonical_mutations: 0,
      sealed_mutations: 0,
      pricing_mutations: 0,
      publication_mutations: 0,
    },
    exact_next_gate: "freeze a separate storage collision-preflight/upload plan for 18 card/DON objects and define the sealed image contract before any sealed upload",
  };
  const summary = {
    ...summaryCore,
    readiness_fingerprint_sha256: sha256(stableJson({ summary: summaryCore, rows })),
  };
  await fs.mkdir(options.outDir, { recursive: true });
  const rowsBody = `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
  await fs.writeFile(path.join(options.outDir, "readiness_rows.jsonl"), rowsBody, "utf8");
  const summaryBody = await writeJson(path.join(options.outDir, "summary.json"), summary);
  const sourcesBody = await writeJson(path.join(options.outDir, "official_sources.json"), {
    authority_version: authority.authority_version,
    product: { ...productResponse, body: undefined },
    card_list: { ...cardListResponse, body: undefined },
    official_product_markers: authority.official_product_markers,
    official_card_matches: authority.official_card_matches,
    raw_source_content_persisted: false,
  });
  const table = rows.map((row) =>
    `| ${row.row_ordinal} | ${row.source_product_id} | ${row.source_product_name.replaceAll("|", "\\|")} | ` +
    `${row.language_authority.authority_status} | ${row.image.selected_source?.width ?? "-"}x` +
    `${row.image.selected_source?.height ?? "-"} | ${row.image.target_path_status} |`).join("\n");
  const reportBody = `# One Piece ST-01 Language And Image Readiness V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Exact English-authority rows: \`${summary.authority_summary.exact_language_authority_rows}/21\`\n` +
    `- Accepted image downloads: \`${summary.counts.accepted_images}/21\`\n` +
    `- Preferred-resolution downloads: \`${summary.counts.preferred_resolution_images}/21\`\n` +
    `- Proposed card/DON paths: \`${summary.counts.card_or_don_proposed_paths}\`\n` +
    `- Sealed paths pending a sealed image contract: \`${summary.counts.sealed_paths_pending_contract}\`\n` +
    `- Database writes: \`0\`\n- Storage writes: \`0\`\n- Pointer updates: \`0\`\n\n` +
    `No blanket English authority is granted to TCGPlayer category 68.\n\n` +
    `| # | TCGPlayer ID | Product | Language authority | Image | Target status |\n` +
    `|---:|---:|---|---|---|---|\n${table}\n`;
  await fs.writeFile(path.join(options.outDir, "REPORT.md"), reportBody, "utf8");
  const hashes = [
    ["readiness_rows.jsonl", rowsBody],
    ["summary.json", summaryBody],
    ["official_sources.json", sourcesBody],
    ["REPORT.md", reportBody],
  ].map(([artifactPath, body]) => ({
    path: artifactPath,
    bytes: Buffer.byteLength(body),
    sha256: sha256(body),
  }));
  await writeJson(path.join(options.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: hashes,
    bound_input: {
      path: path.relative(ROOT, SOURCE).replaceAll("\\", "/"),
      bytes: Buffer.byteLength(sourceBody),
      sha256: SOURCE_SHA256,
    },
  });
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    readiness_fingerprint_sha256: summary.readiness_fingerprint_sha256,
    counts: summary.counts,
    authority_summary: summary.authority_summary,
    findings,
    output_directory: path.relative(ROOT, options.outDir).replaceAll("\\", "/"),
  }, null, 2)}\n`);
  if (findings.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
