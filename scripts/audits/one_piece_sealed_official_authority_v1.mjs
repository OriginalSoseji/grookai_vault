import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import tls from "node:tls";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import {
  ONE_PIECE_OFFICIAL_PRODUCT_HOST,
  ONE_PIECE_OFFICIAL_PRODUCT_ROOT,
  buildOnePieceSealedOfficialAuthorityResultV1,
  parseOnePieceOfficialProductDetailV1,
  parseOnePieceOfficialProductIndexV1,
  validateOnePieceSealedOfficialAuthorityResultV1,
} from "../../backend/pricing/one_piece_sealed_official_authority_v1.mjs";
import { sha256 } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

tls.setDefaultCACertificates([
  ...tls.getCACertificates("default"),
  ...tls.getCACertificates("system"),
]);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REVIEW_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_identity_review_v1", "frozen_offline_review_v1");
const REVIEW_SUMMARY_PATH = path.join(REVIEW_DIR, "summary.json");
const REVIEW_ROWS_PATH = path.join(REVIEW_DIR, "review_rows.jsonl.gz");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_official_authority_v1", "official_english_snapshot_v1");
const DEFAULT_CACHE = path.join(ROOT, ".tmp",
  "one_piece_sealed_official_authority_v1");
const USER_AGENT = "Grookai One Piece Sealed Official Authority/1.0";

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const args = {
    expectedHeadSha: "",
    outDir: DEFAULT_OUT,
    cacheDir: DEFAULT_CACHE,
    concurrency: 4,
    timeoutMs: 60_000,
  };
  for (const arg of argv) {
    if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice("--expected-head-sha=".length).trim();
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = path.resolve(arg.slice("--out-dir=".length));
    } else if (arg.startsWith("--cache-dir=")) {
      args.cacheDir = path.resolve(arg.slice("--cache-dir=".length));
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
      args.concurrency > 6) {
    throw new Error("Concurrency must be between 1 and 6");
  }
  if (!Number.isInteger(args.timeoutMs) || args.timeoutMs < 10_000 ||
      args.timeoutMs > 120_000) {
    throw new Error("Timeout must be between 10000 and 120000 milliseconds");
  }
  if (!args.cacheDir.startsWith(`${path.join(ROOT, ".tmp")}${path.sep}`)) {
    throw new Error("Cache must remain under repository .tmp");
  }
  return args;
}

async function fetchOfficial(url, timeoutMs) {
  const requested = new URL(url);
  if (requested.protocol !== "https:" ||
      requested.hostname.toLowerCase() !== ONE_PIECE_OFFICIAL_PRODUCT_HOST) {
    throw new Error(`Official request outside allowlist: ${url}`);
  }
  const response = await fetch(requested, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "user-agent": USER_AGENT, accept: "text/html" },
  });
  const final = new URL(response.url);
  if (final.protocol !== "https:" ||
      final.hostname.toLowerCase() !== ONE_PIECE_OFFICIAL_PRODUCT_HOST) {
    throw new Error(`Official redirect outside allowlist: ${response.url}`);
  }
  const body = await response.text();
  if (!response.ok || !/^text\/html/i.test(response.headers.get("content-type") ?? "")) {
    throw new Error(`Official source failed: ${url} HTTP ${response.status}`);
  }
  return {
    requested_url: requested.toString(),
    final_url: final.toString(),
    http_status: response.status,
    content_type: response.headers.get("content-type"),
    bytes: Buffer.byteLength(body),
    sha256: sha256(body),
    body,
    cache_status: "downloaded",
  };
}

async function cachedOfficial(url, options) {
  const key = sha256(url);
  const htmlPath = path.join(options.cacheDir, `${key}.html`);
  const metadataPath = path.join(options.cacheDir, `${key}.json`);
  try {
    const [body, metadataBody] = await Promise.all([
      fs.readFile(htmlPath, "utf8"),
      fs.readFile(metadataPath, "utf8"),
    ]);
    const metadata = JSON.parse(metadataBody);
    if (metadata.sha256 !== sha256(body) || metadata.requested_url !== url) {
      throw new Error("cached official response hash mismatch");
    }
    return { ...metadata, body, cache_status: "reused" };
  } catch {
    const result = await fetchOfficial(url, options.timeoutMs);
    await fs.mkdir(options.cacheDir, { recursive: true });
    const { body, ...metadata } = result;
    await Promise.all([
      fs.writeFile(htmlPath, body, "utf8"),
      fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8"),
    ]);
    return result;
  }
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

function lines(body) {
  return body.trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
}

function gzipJsonl(values) {
  const body = `${values.map((value) => JSON.stringify(value)).join("\n")}\n`;
  return gzipSync(Buffer.from(body), { level: 9, mtime: 0 });
}

function sourceMetadata(response) {
  return {
    requested_url: response.requested_url,
    final_url: response.final_url,
    http_status: response.http_status,
    content_type: response.content_type,
    bytes: response.bytes,
    sha256: response.sha256,
    cache_status: response.cache_status,
    raw_html_persisted_in_audit: false,
  };
}

function report(summary) {
  return `${[
    "# One Piece Sealed Official Product Authority V1",
    "",
    `- Status: \`${summary.status}\``,
    `- Producer commit: \`${summary.repository.commit_sha}\``,
    `- Official index pages: \`${summary.counts.index_pages}\``,
    `- Parsed official products: \`${summary.counts.official_records}\``,
    `- Detail-page failures: \`${summary.counts.detail_failures}\``,
    `- Candidate review rows: \`${summary.counts.review_rows}\``,
    `- Unique official family-support candidates: \`${summary.counts.unique_family_support_candidates}\``,
    `- Ambiguous family-support candidates: \`${summary.counts.ambiguous_family_support_candidates}\``,
    `- No official family support found: \`${summary.counts.family_support_not_found}\``,
    "- Exact variant/source-mapping authorities: `0 / 0`",
    "- Database, Storage, pricing, publication, and app writes: `0`",
    "",
    "## Authority Boundary",
    "",
    "Official pages may support a product family, manufacturer, release date, contents, and reference images. They do not prove that a TCGPlayer box, case, display, language, or wave row is the exact official variant. Every source binding remains review-only.",
    "",
    "## Exact Next Gate",
    "",
    "Build an image-assisted residual review packet, confirm exact source-to-variant ownership, and preserve unresolved rows as candidates. Do not apply sealed family, variant, mapping, pricing, or release rows before that review.",
  ].join("\n")}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const repository = {
    commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "",
  };
  if (repository.commit_sha !== options.expectedHeadSha ||
      repository.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      !repository.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean official-authority producer");
  }
  const [reviewSummaryBody, reviewRowsBody] = await Promise.all([
    fs.readFile(REVIEW_SUMMARY_PATH, "utf8"),
    fs.readFile(REVIEW_ROWS_PATH),
  ]);
  const reviewSummary = JSON.parse(reviewSummaryBody);
  const reviewRows = lines(gunzipSync(reviewRowsBody).toString("utf8"));
  if (reviewSummary.status !== "sealed_identity_review_plan_passed_no_writes" ||
      reviewRows.length !== 403) {
    throw new Error("Frozen sealed identity review plan is missing or incomplete");
  }

  const firstUrl = `${ONE_PIECE_OFFICIAL_PRODUCT_ROOT}?subcategory=all&page=1`;
  const firstResponse = await cachedOfficial(firstUrl, options);
  const firstParsed = parseOnePieceOfficialProductIndexV1({
    html: firstResponse.body,
    pageUrl: firstResponse.final_url,
  });
  const pageNumbers = Array.from({ length: firstParsed.maximum_page },
    (_, index) => index + 1);
  const remainingResponses = await mapLimit(pageNumbers.slice(1),
    options.concurrency, (page) => cachedOfficial(
      `${ONE_PIECE_OFFICIAL_PRODUCT_ROOT}?subcategory=all&page=${page}`,
      options,
    ));
  const indexResponses = [firstResponse, ...remainingResponses];
  const parsedIndexes = indexResponses.map((response) =>
    parseOnePieceOfficialProductIndexV1({
      html: response.body,
      pageUrl: response.final_url,
    }));
  const entryByUrl = new Map();
  for (const parsed of parsedIndexes) {
    for (const entry of parsed.entries) entryByUrl.set(entry.official_url, entry);
  }
  const entries = [...entryByUrl.values()].sort((left, right) =>
    left.official_url.localeCompare(right.official_url));

  const detailResults = await mapLimit(entries, options.concurrency,
    async (entry) => {
      try {
        const response = await cachedOfficial(entry.official_url, options);
        return {
          record: parseOnePieceOfficialProductDetailV1({
            html: response.body,
            finalUrl: response.final_url,
            indexEntry: entry,
            sourcePage: sourceMetadata(response),
          }),
          failure: null,
        };
      } catch (error) {
        return {
          record: null,
          failure: {
            official_url: entry.official_url,
            official_index_title: entry.official_index_title,
            error: error.message,
          },
        };
      }
    });
  const recordByUrl = new Map();
  for (const result of detailResults) {
    if (result.record) recordByUrl.set(result.record.official_url, result.record);
  }
  const detailFailures = detailResults.map((result) => result.failure).filter(Boolean);
  const authority = buildOnePieceSealedOfficialAuthorityResultV1({
    repository,
    reviewPlanFingerprint: reviewSummary.plan_fingerprint_sha256,
    indexSources: indexResponses.map(sourceMetadata),
    officialRecords: [...recordByUrl.values()],
    reviewRows,
    detailFailures,
  });
  const validation = validateOnePieceSealedOfficialAuthorityResultV1(authority);
  const complete = validation.valid && detailFailures.length === 0;
  const summary = {
    version: authority.version,
    recorded_at: new Date().toISOString(),
    status: complete
      ? "official_product_authority_passed_no_writes"
      : "official_product_authority_incomplete_no_writes",
    repository,
    review_plan_fingerprint_sha256: authority.review_plan_fingerprint_sha256,
    authority_fingerprint_sha256: authority.authority_fingerprint_sha256,
    counts: authority.counts,
    findings: [
      ...validation.findings,
      ...(detailFailures.length > 0 ? ["official_detail_page_failures"] : []),
    ],
    boundaries: authority.boundaries,
    exact_next_gate: complete
      ? "image-assisted residual review and exact source-to-variant confirmation"
      : "repair only the recorded official source acquisition failures and rerun from the same cache",
  };
  const officialRecords = gzipJsonl(authority.official_records);
  const bindings = gzipJsonl(authority.bindings);
  const residual = gzipJsonl(authority.bindings.filter((row) =>
    row.binding_status !== "official_family_support_candidate_unique"));
  const artifacts = new Map([
    ["summary.json", Buffer.from(`${JSON.stringify(summary, null, 2)}\n`)],
    ["index_sources.json", Buffer.from(`${JSON.stringify({
      maximum_page: firstParsed.maximum_page,
      unique_index_entries: entries.length,
      sources: authority.index_sources,
    }, null, 2)}\n`)],
    ["official_product_records.jsonl.gz", officialRecords],
    ["candidate_official_bindings.jsonl.gz", bindings],
    ["residual_review_queue.jsonl.gz", residual],
    ["detail_failures.json", Buffer.from(`${JSON.stringify(detailFailures, null, 2)}\n`)],
    ["REPORT.md", Buffer.from(report(summary))],
  ]);
  await fs.mkdir(options.outDir, { recursive: true });
  for (const [name, body] of artifacts) {
    await fs.writeFile(path.join(options.outDir, name), body);
  }
  await fs.writeFile(path.join(options.outDir, "artifact_hashes.json"),
    `${JSON.stringify({
      hash_algorithm: "sha256",
      producer_commit_sha: repository.commit_sha,
      bound_inputs: [
        { path: path.relative(ROOT, REVIEW_SUMMARY_PATH).replaceAll("\\", "/"),
          sha256: sha256(reviewSummaryBody) },
        { path: path.relative(ROOT, REVIEW_ROWS_PATH).replaceAll("\\", "/"),
          sha256: sha256(reviewRowsBody) },
      ],
      artifacts: Object.fromEntries([...artifacts.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, body]) => [name, { sha256: sha256(body), bytes: body.length }])),
    }, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!complete) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
