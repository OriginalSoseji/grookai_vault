import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import tls from "node:tls";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import { sha256 } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

tls.setDefaultCACertificates([
  ...tls.getCACertificates("default"),
  ...tls.getCACertificates("system"),
]);

export const ONE_PIECE_SEALED_REVIEW_IMAGE_AVAILABILITY_VERSION =
  "ONE_PIECE_SEALED_REVIEW_IMAGE_AVAILABILITY_V1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKET_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_image_review_packet_v1", "frozen_review_packet_v1");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_review_image_availability_v1", "live_probe_v1");
const ALLOWED_HOSTS = new Set([
  "tcgplayer-cdn.tcgplayer.com",
  "en.onepiece-cardgame.com",
]);
const USER_AGENT = "Grookai One Piece Sealed Review Image Probe/1.0";

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const args = {
    expectedHeadSha: "",
    outDir: DEFAULT_OUT,
    concurrency: 10,
    timeoutMs: 30_000,
  };
  for (const arg of argv) {
    if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice("--expected-head-sha=".length).trim();
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = path.resolve(arg.slice("--out-dir=".length));
    } else if (arg.startsWith("--concurrency=")) {
      args.concurrency = Number.parseInt(arg.slice("--concurrency=".length), 10);
    } else if (arg.startsWith("--timeout-ms=")) {
      args.timeoutMs = Number.parseInt(arg.slice("--timeout-ms=".length), 10);
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  if (!Number.isInteger(args.concurrency) || args.concurrency < 1 ||
      args.concurrency > 12) {
    throw new Error("Concurrency must be between 1 and 12");
  }
  if (!Number.isInteger(args.timeoutMs) || args.timeoutMs < 5_000 ||
      args.timeoutMs > 60_000) {
    throw new Error("Timeout must be between 5000 and 60000 milliseconds");
  }
  return args;
}

export function buildOnePieceSealedReviewImageTargetsV1(items) {
  const grouped = new Map();
  function add(url, role, item) {
    if (!url) return;
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" ||
        !ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
      throw new Error(`Review image outside allowlist: ${url}`);
    }
    const normalized = parsed.toString();
    const current = grouped.get(normalized) ?? {
      url: normalized,
      roles: new Set(),
      candidate_ids: new Set(),
      source_product_ids: new Set(),
    };
    current.roles.add(role);
    current.candidate_ids.add(item.candidate_id);
    current.source_product_ids.add(item.source_product_id);
    grouped.set(normalized, current);
  }
  for (const item of items) {
    add(item.source_image?.url, "tcgplayer_source_reference", item);
    add(item.official_evidence?.reference_image_url,
      "bandai_official_family_reference", item);
  }
  return [...grouped.values()].map((target) => ({
    url: target.url,
    roles: [...target.roles].sort(),
    candidate_ids: [...target.candidate_ids].sort(),
    source_product_ids: [...target.source_product_ids].sort((a, b) => a - b),
    url_sha256: sha256(target.url),
  })).sort((left, right) => left.url.localeCompare(right.url));
}

async function probeImage(target, timeoutMs) {
  try {
    const response = await fetch(target.url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "user-agent": USER_AGENT,
        accept: "image/*",
        range: "bytes=0-0",
      },
    });
    const finalUrl = new URL(response.url);
    const finalHostAllowed = finalUrl.protocol === "https:" &&
      ALLOWED_HOSTS.has(finalUrl.hostname.toLowerCase());
    const contentType = response.headers.get("content-type");
    const isImage = /^image\//i.test(contentType ?? "");
    await response.body?.cancel();
    return {
      ...target,
      status: !finalHostAllowed
        ? "redirect_host_rejected"
        : response.ok && isImage
          ? "available"
          : response.ok
            ? "non_image_response"
            : "http_error",
      http_status: response.status,
      final_url: finalUrl.toString(),
      final_host_allowed: finalHostAllowed,
      content_type: contentType,
      content_length: response.headers.get("content-length"),
      response_body_persisted: false,
      identity_authority: false,
      image_pointer_authority: false,
    };
  } catch (error) {
    return {
      ...target,
      status: "request_error",
      http_status: null,
      final_url: null,
      final_host_allowed: false,
      content_type: null,
      content_length: null,
      error_class: error?.name ?? "Error",
      error_message: String(error?.message ?? error).slice(0, 300),
      response_body_persisted: false,
      identity_authority: false,
      image_pointer_authority: false,
    };
  }
}

async function mapLimit(values, limit, mapper) {
  const output = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return output;
}

export function summarizeOnePieceSealedReviewImageProbeV1({ targets, results }) {
  const byRole = {};
  for (const role of [
    "tcgplayer_source_reference",
    "bandai_official_family_reference",
  ]) {
    const rows = results.filter((result) => result.roles.includes(role));
    byRole[role] = {
      unique_urls: rows.length,
      available: rows.filter((result) => result.status === "available").length,
      unavailable: rows.filter((result) => result.status !== "available").length,
    };
  }
  return {
    target_references: targets.reduce((sum, target) =>
      sum + target.candidate_ids.length, 0),
    unique_urls: targets.length,
    available: results.filter((result) => result.status === "available").length,
    unavailable: results.filter((result) => result.status !== "available").length,
    redirect_host_rejected: results.filter((result) =>
      result.status === "redirect_host_rejected").length,
    non_image_response: results.filter((result) =>
      result.status === "non_image_response").length,
    http_error: results.filter((result) => result.status === "http_error").length,
    request_error: results.filter((result) =>
      result.status === "request_error").length,
    by_role: byRole,
  };
}

export function validateOnePieceSealedReviewImageProbeV1({ targets, results }) {
  const findings = [];
  if (targets.length !== results.length) findings.push("result_count_mismatch");
  if (new Set(targets.map((target) => target.url)).size !== targets.length) {
    findings.push("duplicate_target_url");
  }
  if (new Set(results.map((result) => result.url)).size !== results.length) {
    findings.push("duplicate_result_url");
  }
  const expected = new Set(targets.map((target) => target.url));
  for (const result of results) {
    if (!expected.has(result.url)) findings.push("unexpected_result_url");
    if (result.identity_authority !== false ||
        result.image_pointer_authority !== false ||
        result.response_body_persisted !== false) {
      findings.push(`authority_overclaim:${result.url_sha256}`);
    }
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

function report(summary) {
  return `${[
    "# One Piece Sealed Review Image Availability V1",
    "",
    `- Status: \`${summary.status}\``,
    `- Producer commit: \`${summary.repository.commit_sha}\``,
    `- Unique image URLs: \`${summary.counts.unique_urls}\``,
    `- Available image URLs: \`${summary.counts.available}\``,
    `- Unavailable image URLs: \`${summary.counts.unavailable}\``,
    `- Redirect-host rejections: \`${summary.counts.redirect_host_rejected}\``,
    "- Response bodies persisted: `0`",
    "- Database, Storage, pricing, publication, and app writes: `0`",
    "",
    "Availability proves only that a reference URL returned an image response. It grants no identity, equivalence, image-pointer, Storage, pricing, or publication authority.",
  ].join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = {
    commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "",
  };
  if (repository.commit_sha !== args.expectedHeadSha ||
      repository.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      !repository.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean image-probe producer");
  }
  const [packetSummaryBody, itemBody] = await Promise.all([
    fs.readFile(path.join(PACKET_DIR, "summary.json")),
    fs.readFile(path.join(PACKET_DIR, "review_items.jsonl.gz")),
  ]);
  const packetSummary = JSON.parse(packetSummaryBody);
  const items = gunzipSync(itemBody).toString("utf8").trim().split(/\r?\n/)
    .filter(Boolean).map(JSON.parse);
  const targets = buildOnePieceSealedReviewImageTargetsV1(items);
  const results = await mapLimit(targets, args.concurrency, (target) =>
    probeImage(target, args.timeoutMs));
  const validation = validateOnePieceSealedReviewImageProbeV1({ targets, results });
  if (!validation.valid) {
    throw new Error(`Image probe invalid: ${validation.findings.join(",")}`);
  }
  const counts = summarizeOnePieceSealedReviewImageProbeV1({ targets, results });
  const resultBody = Buffer.from(`${results.map((result) =>
    JSON.stringify(result)).join("\n")}\n`);
  const resultGzip = gzipSync(resultBody, { level: 9, mtime: 0 });
  const unavailable = results.filter((result) => result.status !== "available");
  const unavailableBody = Buffer.from(`${JSON.stringify(unavailable, null, 2)}\n`);
  const summary = {
    version: ONE_PIECE_SEALED_REVIEW_IMAGE_AVAILABILITY_VERSION,
    recorded_at: new Date().toISOString(),
    status: counts.unavailable === 0
      ? "all_review_images_available_no_writes"
      : "review_image_gaps_preserved_no_writes",
    repository,
    review_packet_fingerprint_sha256:
      packetSummary.packet_fingerprint_sha256,
    counts,
    findings: validation.findings,
    boundaries: {
      network_reads: true,
      response_bodies_persisted: 0,
      database_connections: 0,
      database_writes: 0,
      storage_writes: 0,
      identity_authority: false,
      image_pointer_authority: false,
      pricing_authority: false,
      publication_authority: false,
      app_visibility_enabled: false,
    },
    exact_next_gate: "review available images and preserve unavailable references as evidence gaps",
  };
  const artifacts = new Map([
    ["summary.json", Buffer.from(`${JSON.stringify(summary, null, 2)}\n`)],
    ["image_probe_results.jsonl.gz", resultGzip],
    ["unavailable_images.json", unavailableBody],
    ["REPORT.md", Buffer.from(report(summary))],
  ]);
  await fs.mkdir(args.outDir, { recursive: true });
  for (const [name, body] of artifacts) {
    await fs.writeFile(path.join(args.outDir, name), body);
  }
  await fs.writeFile(path.join(args.outDir, "artifact_hashes.json"),
    `${JSON.stringify({
      hash_algorithm: "sha256",
      producer_commit_sha: repository.commit_sha,
      bound_inputs: [
        { path: path.relative(ROOT, path.join(PACKET_DIR, "summary.json")).replaceAll("\\", "/"), sha256: sha256(packetSummaryBody) },
        { path: path.relative(ROOT, path.join(PACKET_DIR, "review_items.jsonl.gz")).replaceAll("\\", "/"), sha256: sha256(itemBody) },
      ],
      artifacts: Object.fromEntries([...artifacts.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, body]) => [name, { sha256: sha256(body), bytes: body.length }])),
    }, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
