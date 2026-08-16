import { execFile, execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import {
  buildOnePieceSealedOnlineEvidenceResolutionV1,
  validateOnePieceSealedOnlineEvidenceResolutionV1,
} from "../../backend/pricing/one_piece_sealed_online_evidence_resolution_v1.mjs";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CANDIDATE_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_sealed_candidate_v1", "frozen_plan_v1");
const REVIEW_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_identity_review_v1", "frozen_offline_review_v1");
const OFFICIAL_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_official_authority_v1", "official_english_snapshot_v1");
const DEFAULT_OUT_ROOT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_online_evidence_resolution_v1");
const SOURCE_DOCS_URL = "https://tcgcsv.com/docs";
const DIRECT_EXPORT_PATTERN =
  /bulk of the information offered here from TCGplayer is a direct export from their API endpoints/i;

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function sha256(body) {
  return crypto.createHash("sha256").update(body).digest("hex");
}

function parseArgs(argv) {
  const args = {
    expectedHeadSha: "",
    outDir: "",
    concurrency: 10,
    timeoutMs: 30_000,
  };
  for (const arg of argv) {
    if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice("--expected-head-sha=".length).trim();
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = path.resolve(arg.slice("--out-dir=".length));
    } else if (arg.startsWith("--concurrency=")) {
      args.concurrency = Number(arg.slice("--concurrency=".length));
    } else if (arg.startsWith("--timeout-ms=")) {
      args.timeoutMs = Number(arg.slice("--timeout-ms=".length));
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  if (!Number.isInteger(args.concurrency) || args.concurrency < 1 ||
      args.concurrency > 20) {
    throw new Error("--concurrency must be an integer from 1 through 20");
  }
  if (!Number.isInteger(args.timeoutMs) || args.timeoutMs < 5_000 ||
      args.timeoutMs > 120_000) {
    throw new Error("--timeout-ms must be an integer from 5000 through 120000");
  }
  return args;
}

function jsonlGzip(body) {
  return gunzipSync(body).toString("utf8").trim().split(/\r?\n/)
    .filter(Boolean).map(JSON.parse);
}

async function verifyArtifacts(directory) {
  const manifest = JSON.parse(await fs.readFile(
    path.join(directory, "artifact_hashes.json"), "utf8"));
  const entries = manifest.artifacts ?? manifest;
  for (const [name, expected] of Object.entries(entries)) {
    if (["hash_algorithm", "producer_commit_sha", "bound_inputs"].includes(name)) {
      continue;
    }
    const body = await fs.readFile(path.join(directory, name));
    const expectedHash = typeof expected === "string"
      ? expected
      : expected?.sha256;
    const expectedBytes = typeof expected === "string"
      ? null
      : expected?.bytes;
    if (sha256(body) !== expectedHash ||
        (expectedBytes !== null && body.length !== expectedBytes)) {
      throw new Error(`Frozen input artifact mismatch: ${directory}/${name}`);
    }
  }
}

function isLocalTlsChainError(error) {
  const text = `${error?.message ?? ""} ${error?.cause?.code ?? ""}`;
  return /UNABLE_TO_VERIFY_LEAF_SIGNATURE|SELF_SIGNED_CERT|CERT_HAS_EXPIRED|DEPTH_ZERO_SELF_SIGNED_CERT/i
    .test(text);
}

async function curlText(url, timeoutMs) {
  const command = process.platform === "win32" ? "curl.exe" : "curl";
  const args = ["-L", "-sS", "--max-time", String(Math.ceil(timeoutMs / 1000))];
  if (process.platform === "win32") args.push("--ssl-no-revoke");
  args.push(url);
  const { stdout } = await execFileAsync(command, args, {
    encoding: "utf8",
    maxBuffer: 25 * 1024 * 1024,
    timeout: timeoutMs + 5_000,
  });
  return stdout;
}

async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "GrookaiVault/1.0 sealed-evidence-audit" },
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return { body: await response.text(), transport: "node_fetch_tls_verified" };
  } catch (error) {
    if (!isLocalTlsChainError(error)) throw error;
    return {
      body: await curlText(url, timeoutMs),
      transport: "curl_windows_revocation_workaround_tls_verified",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function concurrentMap(values, concurrency, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= values.length) return;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) },
    () => worker()));
  return results;
}

function candidateProductShape(product) {
  return {
    productId: Number(product.productId),
    name: product.name,
    cleanName: product.cleanName ?? null,
    imageUrl: product.imageUrl ?? null,
    categoryId: Number(product.categoryId),
    groupId: Number(product.groupId),
    url: product.url ?? null,
    modifiedOn: product.modifiedOn ?? null,
    imageCount: Number(product.imageCount ?? 0),
    presaleInfo: product.presaleInfo ?? null,
    extendedData: product.extendedData ?? [],
  };
}

function renderReport(result, sourceSummary) {
  return `# One Piece Sealed Online Evidence Resolution V1

- Status: \`online_evidence_resolution_passed_no_writes\`
- Candidates: ${result.counts.candidates}
- Fresh TCGPlayer catalog matches: ${result.counts.exact_source_identities}
- Auto-resolved current English products: ${result.counts.statuses.auto_resolved_current_english}
- Non-English scope holds: ${result.counts.statuses.scope_held_non_english}
- Future/presale scope holds: ${result.counts.statuses.scope_held_future_or_presale}
- Evidence gaps requiring human review: ${result.counts.human_review_required}
- Planned families: ${result.counts.canonical_families_planned}
- Planned variants and exact source mappings: ${result.counts.canonical_variants_planned}
- Source groups fetched: ${sourceSummary.group_count}
- Source fetch failures: ${sourceSummary.failures}
- Local TLS transport fallback requests: ${sourceSummary.tls_fallback_requests}
- Database writes: 0
- Storage writes: 0
- Apply authority: false
- Pricing/publication authority: false

## Decision

Fresh TCGCSV exports reproduced every preserved TCGPlayer catalog identity with
the exact category, group, product ID, product name, product URL, and
product-specific image identity. Exact source evidence now replaces blanket
human review for current English products. Scope holds remain holds, not review
failures.

## Next Gate

Run a production read-only collision and schema preflight against this exact
resolution fingerprint. Do not write canonical sealed rows until a separately
frozen apply plan passes rollback proof.
`;
}

const args = parseArgs(process.argv.slice(2));
const head = git("rev-parse", "HEAD");
if (head !== args.expectedHeadSha) {
  throw new Error(`HEAD mismatch: expected ${args.expectedHeadSha}, found ${head}`);
}
if (git("branch", "--show-current") !== "agent/one-piece-ingestion-readiness-v1") {
  throw new Error("Wrong branch for One Piece sealed evidence resolution");
}
if (git("status", "--porcelain")) {
  throw new Error("Tracked worktree must be clean before online acquisition");
}

await Promise.all([
  verifyArtifacts(CANDIDATE_DIR),
  verifyArtifacts(REVIEW_DIR),
  verifyArtifacts(OFFICIAL_DIR),
]);
const candidatePlan = JSON.parse(gunzipSync(await fs.readFile(
  path.join(CANDIDATE_DIR, "candidate_plan.json.gz"))));
const reviewRows = jsonlGzip(await fs.readFile(
  path.join(REVIEW_DIR, "review_rows.jsonl.gz")));
const officialBindings = jsonlGzip(await fs.readFile(
  path.join(OFFICIAL_DIR, "candidate_official_bindings.jsonl.gz")));
const candidates = candidatePlan.payload.candidates;
const candidatesByGroup = new Map();
for (const candidate of candidates) {
  const key = `${candidate.source_category_id}:${candidate.source_group_id}`;
  if (!candidatesByGroup.has(key)) candidatesByGroup.set(key, []);
  candidatesByGroup.get(key).push(candidate);
}

const docsResponse = await fetchText(SOURCE_DOCS_URL, args.timeoutMs);
if (!DIRECT_EXPORT_PATTERN.test(docsResponse.body)) {
  throw new Error("TCGCSV direct TCGPlayer API export declaration not found");
}
const sourceDeclaration = {
  source_url: SOURCE_DOCS_URL,
  response_sha256: sha256(docsResponse.body),
  fetched_at: new Date().toISOString(),
  transport: docsResponse.transport,
  direct_tcgplayer_api_export: true,
  declaration_key: "tcgcsv_bulk_tcgplayer_data_direct_api_export",
  raw_body_persisted: false,
};

const groupKeys = [...candidatesByGroup.keys()].sort((a, b) => {
  const [ac, ag] = a.split(":").map(Number);
  const [bc, bg] = b.split(":").map(Number);
  return ac - bc || ag - bg;
});
const groupSnapshots = await concurrentMap(groupKeys, args.concurrency,
  async (key) => {
    const [categoryId, groupId] = key.split(":").map(Number);
    const sourceUrl = `https://tcgcsv.com/tcgplayer/${categoryId}/${groupId}/products`;
    const response = await fetchText(sourceUrl, args.timeoutMs);
    const parsed = JSON.parse(response.body);
    if (parsed.success !== true || !Array.isArray(parsed.results)) {
      throw new Error(`Invalid TCGCSV products response for ${key}`);
    }
    const targetIds = new Set(candidatesByGroup.get(key).map((row) =>
      Number(row.source_product_id)));
    const products = parsed.results.filter((row) =>
      targetIds.has(Number(row.productId))).map(candidateProductShape)
      .sort((a, b) => a.productId - b.productId);
    return {
      category_id: categoryId,
      group_id: groupId,
      source_url: sourceUrl,
      fetched_at: new Date().toISOString(),
      transport: response.transport,
      response_sha256: sha256(response.body),
      response_total_items: Number(parsed.totalItems),
      candidate_products: products,
      candidate_product_count: products.length,
      raw_response_persisted: false,
    };
  });

const result = buildOnePieceSealedOnlineEvidenceResolutionV1({
  repository: {
    commit_sha: head,
    branch: git("branch", "--show-current"),
    tracked_worktree_clean: true,
  },
  candidatePlan,
  reviewRows,
  officialBindings,
  groupSnapshots,
  sourceDeclaration,
});
const validation = validateOnePieceSealedOnlineEvidenceResolutionV1(result);
if (!validation.valid) {
  throw new Error(`Resolution validation failed: ${validation.findings.join(", ")}`);
}

const sourceSummary = {
  group_count: groupSnapshots.length,
  failures: 0,
  candidate_products: groupSnapshots.reduce((sum, row) =>
    sum + row.candidate_product_count, 0),
  tls_fallback_requests: [sourceDeclaration, ...groupSnapshots].filter((row) =>
    row.transport === "curl_windows_revocation_workaround_tls_verified").length,
  raw_response_bodies_persisted: 0,
};
const outDir = args.outDir || path.join(DEFAULT_OUT_ROOT, "frozen_live_resolution_v1");
if (!args.outDir) await fs.mkdir(DEFAULT_OUT_ROOT, { recursive: true });
await fs.mkdir(outDir, { recursive: false });

const artifacts = new Map([
  ["summary.json", Buffer.from(`${JSON.stringify({
    version: result.version,
    recorded_at: new Date().toISOString(),
    status: "online_evidence_resolution_passed_no_writes",
    repository: result.repository,
    resolution_fingerprint_sha256: result.resolution_fingerprint_sha256,
    candidate_plan_fingerprint_sha256:
      result.candidate_plan_fingerprint_sha256,
    source_declaration: result.source_declaration,
    source_summary: sourceSummary,
    counts: result.counts,
    validation,
    boundaries: result.boundaries,
    exact_next_gate:
      "production read-only collision/schema preflight, then separately frozen rollback-tested apply plan",
  }, null, 2)}\n`)],
  ["REPORT.md", Buffer.from(renderReport(result, sourceSummary))],
  ["source_group_snapshots.jsonl.gz", gzipSync(`${groupSnapshots.map((row) =>
    JSON.stringify(row)).join("\n")}\n`)],
  ["resolutions.jsonl.gz", gzipSync(`${result.payload.resolutions.map((row) =>
    JSON.stringify(row)).join("\n")}\n`)],
  ["canonical_plan.json.gz", gzipSync(`${JSON.stringify({
    version: result.version,
    resolution_fingerprint_sha256: result.resolution_fingerprint_sha256,
    counts: result.counts,
    payload: result.payload.canonical_plan,
    apply_authority: false,
    pricing_authority: false,
    publication_authority: false,
  })}\n`)],
  ["held_or_residual.jsonl.gz", gzipSync(`${result.payload.held_or_residual
    .map((row) => JSON.stringify(row)).join("\n")}\n`)],
]);
for (const [name, body] of artifacts) {
  await fs.writeFile(path.join(outDir, name), body);
}
const artifactHashes = Object.fromEntries([...artifacts].map(([name, body]) => [
  name,
  { sha256: sha256(body), bytes: body.length },
]));
await fs.writeFile(path.join(outDir, "artifact_hashes.json"),
  `${JSON.stringify({
    hash_algorithm: "sha256",
    producer_commit_sha: head,
    bound_inputs: {
      candidate_plan_fingerprint_sha256:
        result.candidate_plan_fingerprint_sha256,
      source_declaration_response_sha256: sourceDeclaration.response_sha256,
    },
    artifacts: artifactHashes,
  }, null, 2)}\n`);

console.log(JSON.stringify({
  status: "online_evidence_resolution_passed_no_writes",
  out_dir: path.relative(ROOT, outDir),
  resolution_fingerprint_sha256: result.resolution_fingerprint_sha256,
  source_summary: sourceSummary,
  counts: result.counts,
  boundaries: result.boundaries,
}, null, 2));
