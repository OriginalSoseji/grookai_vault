import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import tls from "node:tls";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import {
  ONE_PIECE_OFFICIAL_CARD_LIST_HOST,
  ONE_PIECE_OFFICIAL_CARD_LIST_ROOT,
  ONE_PIECE_REQUIRED_NUMBERED_SET_CODES,
  buildOnePieceOfficialCatalogAuthorityResultV1,
  parseOnePieceOfficialCardListHtmlV1,
  parseOnePieceOfficialSeriesOptionsV1,
  validateOnePieceOfficialCatalogAuthorityV1,
} from "../../backend/pricing/one_piece_complete_official_catalog_authority_v1.mjs";
import { sha256 } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

tls.setDefaultCACertificates([
  ...tls.getCACertificates("default"),
  ...tls.getCACertificates("system"),
]);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RECONCILIATION_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_canonical_reconciliation_v1", "frozen_reconciliation_v1");
const SUMMARY_PATH = path.join(RECONCILIATION_DIR, "summary.json");
const NUMBERED_PATH = path.join(RECONCILIATION_DIR,
  "current_numbered_candidates.jsonl.gz");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_official_catalog_authority_v1", "official_english_v1");
const DEFAULT_CACHE = path.join(ROOT, ".tmp",
  "one_piece_complete_official_catalog_authority_v1");
const USER_AGENT = "Grookai One Piece Official Catalog Authority/1.0";

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
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" ||
      parsed.hostname.toLowerCase() !== ONE_PIECE_OFFICIAL_CARD_LIST_HOST) {
    throw new Error(`Official URL outside allowlist: ${url}`);
  }
  const response = await fetch(parsed, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "user-agent": USER_AGENT, accept: "text/html" },
  });
  const final = new URL(response.url);
  if (final.protocol !== "https:" ||
      final.hostname.toLowerCase() !== ONE_PIECE_OFFICIAL_CARD_LIST_HOST) {
    throw new Error(`Official redirect outside allowlist: ${response.url}`);
  }
  const body = await response.text();
  if (!response.ok || !/^text\/html/i.test(response.headers.get("content-type") ?? "")) {
    throw new Error(`Official source failed: ${url} HTTP ${response.status}`);
  }
  return {
    requested_url: url,
    final_url: response.url,
    http_status: response.status,
    content_type: response.headers.get("content-type"),
    bytes: Buffer.byteLength(body),
    sha256: sha256(body),
    body,
  };
}

async function cachedOfficial(series, options) {
  const safeSeriesId = String(series.series_id).replace(/[^a-z0-9._-]+/gi, "-");
  const cachePath = path.join(options.cacheDir, `${safeSeriesId}.html`);
  try {
    const body = await fs.readFile(cachePath, "utf8");
    return {
      requested_url: series.url,
      final_url: series.url,
      http_status: 200,
      content_type: "text/html; cached",
      bytes: Buffer.byteLength(body),
      sha256: sha256(body),
      body,
      cache_status: "reused",
    };
  } catch {
    const result = await fetchOfficial(series.url, options.timeoutMs);
    await fs.mkdir(options.cacheDir, { recursive: true });
    await fs.writeFile(cachePath, result.body, "utf8");
    return { ...result, cache_status: "downloaded" };
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

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function jsonl(values) {
  return `${values.map((value) => JSON.stringify(value)).join("\n")}\n`;
}

function gzipJsonl(values) {
  return gzipSync(Buffer.from(jsonl(values), "utf8"), { level: 9 });
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
  const [summaryBody, numberedBody] = await Promise.all([
    fs.readFile(SUMMARY_PATH, "utf8"),
    fs.readFile(NUMBERED_PATH),
  ]);
  const reconciliation = JSON.parse(summaryBody);
  if (reconciliation.status !==
      "complete_offline_reconciliation_passed_no_writes" ||
      reconciliation.counts?.current_numbered_products !== 6547) {
    throw new Error("Complete canonical reconciliation is not frozen and passing");
  }

  const root = await fetchOfficial(ONE_PIECE_OFFICIAL_CARD_LIST_ROOT,
    options.timeoutMs);
  const allSeries = parseOnePieceOfficialSeriesOptionsV1(root.body);
  const requiredCodes = new Set(ONE_PIECE_REQUIRED_NUMBERED_SET_CODES);
  const selectedSeries = allSeries.filter((series) =>
    series.set_codes.some((code) => requiredCodes.has(code)) ||
    series.supplemental_scope === true);
  const covered = new Set(selectedSeries.flatMap((series) => series.set_codes));
  const missing = [...requiredCodes].filter((code) => !covered.has(code));
  if (missing.length > 0) {
    throw new Error(`Official series options lack required codes: ${missing.join(",")}`);
  }

  const responses = await mapLimit(selectedSeries, options.concurrency,
    (series) => cachedOfficial(series, options));
  const initialOfficialRecords = responses.flatMap((response, index) =>
    parseOnePieceOfficialCardListHtmlV1({
      html: response.body,
      series: selectedSeries[index],
      finalUrl: response.final_url,
    }));
  const numberedCandidates = lines(gunzipSync(numberedBody).toString("utf8"));
  const initialResult = buildOnePieceOfficialCatalogAuthorityResultV1({
    repository,
    sourceReconciliationFingerprint:
      reconciliation.reconciliation_fingerprint_sha256,
    numberedCandidates,
    officialRecords: initialOfficialRecords,
    series: selectedSeries,
    rootSource: {
      requested_url: root.requested_url,
      final_url: root.final_url,
      http_status: root.http_status,
      content_type: root.content_type,
      bytes: root.bytes,
      sha256: root.sha256,
    },
  });
  const missingNumbers = [...new Set(initialResult.bindings.filter((row) =>
    row.official_authority_status === "official_number_not_found")
    .map((row) => row.card_number))].sort((left, right) =>
      left.localeCompare(right, undefined, { numeric: true }));
  const supplementalSeries = missingNumbers.map((cardNumber) => ({
    series_id: `search-${cardNumber}`,
    label: `Official card-list search: ${cardNumber}`,
    set_codes: [cardNumber.split("-")[0]],
    supplemental_scope: true,
    supplemental_search: true,
    url: `${ONE_PIECE_OFFICIAL_CARD_LIST_ROOT}?freewords=${encodeURIComponent(cardNumber)}`,
  }));
  const supplementalResponses = await mapLimit(supplementalSeries,
    options.concurrency, (series) => cachedOfficial(series, options));
  const supplementalRecords = supplementalResponses.flatMap((response, index) =>
    parseOnePieceOfficialCardListHtmlV1({
      html: response.body,
      series: supplementalSeries[index],
      finalUrl: response.final_url,
    }));
  const allBoundSeries = [...selectedSeries, ...supplementalSeries];
  const result = buildOnePieceOfficialCatalogAuthorityResultV1({
    repository,
    sourceReconciliationFingerprint:
      reconciliation.reconciliation_fingerprint_sha256,
    numberedCandidates,
    officialRecords: [...initialOfficialRecords, ...supplementalRecords],
    series: allBoundSeries,
    officialCatalogGapsBecomeExplicitHolds: true,
    rootSource: {
      requested_url: root.requested_url,
      final_url: root.final_url,
      http_status: root.http_status,
      content_type: root.content_type,
      bytes: root.bytes,
      sha256: root.sha256,
    },
  });
  const validation = validateOnePieceOfficialCatalogAuthorityV1(result);
  await fs.mkdir(options.outDir, { recursive: true });
  const artifacts = {};
  const summary = {
    version: result.version,
    recorded_at: new Date().toISOString(),
    status: validation.valid
      ? "official_english_catalog_authority_passed_no_writes"
      : "official_english_catalog_authority_incomplete_no_writes",
    repository,
    authority_fingerprint_sha256: result.authority_fingerprint_sha256,
    source_reconciliation_fingerprint_sha256:
      result.source_reconciliation_fingerprint_sha256,
    counts: {
      selected_series: selectedSeries.length,
      supplemental_searches: supplementalSeries.length,
      covered_set_codes: covered.size,
      official_variant_records: result.official_records.length,
      official_number_authorities: result.official_number_authorities.length,
      official_conflicts: result.official_conflicts.length,
      ...result.binding_summary,
    },
    findings: validation.findings,
    boundaries: result.boundaries,
    exact_next_gate: validation.valid
      ? "freeze the complete hidden numbered-card canonical promotion payload"
      : "resolve only the recorded official-number or source-name authority gaps offline",
  };
  artifacts["summary.json"] = await writeJson(
    path.join(options.outDir, "summary.json"), summary);
  artifacts["series_sources.json"] = await writeJson(
    path.join(options.outDir, "series_sources.json"), {
      root: result.root_source,
      series: [
        ...selectedSeries.map((series, index) => ({
          ...series,
          http_status: responses[index].http_status,
          bytes: responses[index].bytes,
          sha256: responses[index].sha256,
          cache_status: responses[index].cache_status,
          raw_html_persisted_in_audit: false,
        })),
        ...supplementalSeries.map((series, index) => ({
          ...series,
          http_status: supplementalResponses[index].http_status,
          bytes: supplementalResponses[index].bytes,
          sha256: supplementalResponses[index].sha256,
          cache_status: supplementalResponses[index].cache_status,
          raw_html_persisted_in_audit: false,
        })),
      ],
    });
  artifacts["official_number_authorities.jsonl.gz"] = gzipJsonl(
    result.official_number_authorities);
  artifacts["official_variant_records.jsonl.gz"] = gzipJsonl(
    result.official_records);
  artifacts["numbered_product_bindings.jsonl.gz"] = gzipJsonl(result.bindings);
  for (const name of ["official_number_authorities.jsonl.gz",
    "official_variant_records.jsonl.gz", "numbered_product_bindings.jsonl.gz"]) {
    await fs.writeFile(path.join(options.outDir, name), artifacts[name]);
  }
  artifacts["official_conflicts.json"] = await writeJson(
    path.join(options.outDir, "official_conflicts.json"),
    result.official_conflicts);
  const unresolved = result.bindings.filter((row) =>
    !row.canonical_promotion_eligible);
  artifacts["unresolved_bindings.jsonl"] = jsonl(unresolved);
  await fs.writeFile(path.join(options.outDir, "unresolved_bindings.jsonl"),
    artifacts["unresolved_bindings.jsonl"], "utf8");
  artifacts["authority_holds.jsonl"] = jsonl(result.bindings.filter((row) =>
    row.official_authority_status === "official_catalog_gap_hold"));
  await fs.writeFile(path.join(options.outDir, "authority_holds.jsonl"),
    artifacts["authority_holds.jsonl"], "utf8");
  const reportBody = `# Complete One Piece Official English Catalog Authority V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Official series pages: \`${summary.counts.selected_series}\`\n` +
    `- Supplemental exact-number searches: \`${summary.counts.supplemental_searches}\`\n` +
    `- Printed-number code families covered: \`${summary.counts.covered_set_codes}/59\`\n` +
    `- Official variant records: \`${summary.counts.official_variant_records}\`\n` +
    `- Official printed-number authorities: \`${summary.counts.official_number_authorities}\`\n` +
    `- Product bindings eligible: \`${summary.counts.promotion_eligible_products}/6547\`\n` +
    `- Explicit official-catalog gap holds: \`${summary.counts.official_catalog_gap_holds}\`\n` +
    `- Source-name mismatches: \`${summary.counts.source_name_mismatches}\`\n` +
    `- Missing official numbers: \`${summary.counts.official_number_missing}\`\n` +
    `- Official conflicts: \`${summary.counts.official_conflicts}\`\n` +
    `- Database/Storage/image writes: \`0 / 0 / 0\`\n`;
  await fs.writeFile(path.join(options.outDir, "REPORT.md"), reportBody, "utf8");
  artifacts["REPORT.md"] = reportBody;
  await writeJson(path.join(options.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: Object.entries(artifacts).map(([artifactPath, body]) => ({
      path: artifactPath,
      bytes: Buffer.byteLength(body),
      sha256: sha256(body),
    })),
    bound_inputs: [
      { path: path.relative(ROOT, SUMMARY_PATH).replaceAll("\\", "/"),
        sha256: sha256(summaryBody) },
      { path: path.relative(ROOT, NUMBERED_PATH).replaceAll("\\", "/"),
        sha256: sha256(numberedBody) },
    ],
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!validation.valid) process.exitCode = 1;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { parseArgs };
