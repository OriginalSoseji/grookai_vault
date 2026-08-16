import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";

import {
  buildOnePieceCompleteStagingReleaseV1,
  ONE_PIECE_COMPLETE_STAGING_MANIFEST_COMPRESSED_SHA256,
  ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256,
  ONE_PIECE_COMPLETE_STAGING_PLAN_VERSION,
  ONE_PIECE_COMPLETE_STAGING_PRIOR_PAYLOAD_PROOF_SHA256,
  ONE_PIECE_COMPLETE_STAGING_SCHEMA_PROOF_SHA256,
  ONE_PIECE_COMPLETE_STAGING_SOURCE_SUMMARY_SHA256,
  validateOnePieceCompleteStagingReleaseV1,
} from "../../backend/pricing/one_piece_complete_staging_release_v1.mjs";
import {
  sha256,
} from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_catalog_readiness_v1",
  "current_complete_source_2026-08-14_v1");
const MANIFEST_PATH = path.join(SOURCE_DIR, "source_product_manifest.jsonl.gz");
const SUMMARY_PATH = path.join(SOURCE_DIR, "summary.json");
const SCHEMA_PROOF_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_import_durable_staging_schema_apply_v1",
  "production_schema_apply_v1_independent_verify", "summary.json");
const PRIOR_PAYLOAD_PROOF_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_import_durable_payload_apply_v1",
  "production_apply_v1_independent_verify", "summary.json");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_staging_release_v1", "frozen_plan_v1");

function parseArgs(argv) {
  const args = { expectedHeadSha: "", outDir: DEFAULT_OUT };
  for (const arg of argv) {
    if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice(20).trim().toLowerCase();
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = path.resolve(arg.slice(10));
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return args;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
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
    throw new Error("Repository is not the exact clean offline-plan producer");
  }

  const [compressedManifest, summaryText, schemaProofText, priorProofText] =
    await Promise.all([
      fs.readFile(MANIFEST_PATH),
      fs.readFile(SUMMARY_PATH, "utf8"),
      fs.readFile(SCHEMA_PROOF_PATH, "utf8"),
      fs.readFile(PRIOR_PAYLOAD_PROOF_PATH, "utf8"),
    ]);
  const logicalManifest = gunzipSync(compressedManifest).toString("utf8");
  if (sha256(compressedManifest) !==
      ONE_PIECE_COMPLETE_STAGING_MANIFEST_COMPRESSED_SHA256 ||
      sha256(logicalManifest) !== ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256 ||
      sha256(summaryText) !== ONE_PIECE_COMPLETE_STAGING_SOURCE_SUMMARY_SHA256 ||
      sha256(schemaProofText) !== ONE_PIECE_COMPLETE_STAGING_SCHEMA_PROOF_SHA256 ||
      sha256(priorProofText) !==
        ONE_PIECE_COMPLETE_STAGING_PRIOR_PAYLOAD_PROOF_SHA256) {
    throw new Error("One or more frozen One Piece authorities changed");
  }
  const sourceSummary = JSON.parse(summaryText);
  const schemaProof = JSON.parse(schemaProofText);
  const priorPayloadProof = JSON.parse(priorProofText);
  if (schemaProof.status !== "pass" || priorPayloadProof.status !== "pass") {
    throw new Error("Prior durable staging proofs are not passing");
  }
  const manifestRows = logicalManifest.trim().split(/\r?\n/).map(JSON.parse);
  const release = buildOnePieceCompleteStagingReleaseV1({
    repository,
    asOfDate: sourceSummary.as_of_date,
    manifestRows,
    manifestLogicalSha256: ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256,
    manifestCompressedSha256:
      ONE_PIECE_COMPLETE_STAGING_MANIFEST_COMPRESSED_SHA256,
    sourceSummarySha256: ONE_PIECE_COMPLETE_STAGING_SOURCE_SUMMARY_SHA256,
    schemaProofSha256: ONE_PIECE_COMPLETE_STAGING_SCHEMA_PROOF_SHA256,
    priorPayloadProofSha256:
      ONE_PIECE_COMPLETE_STAGING_PRIOR_PAYLOAD_PROOF_SHA256,
    warehouseSourceGroupCount: sourceSummary.source.group_count,
  });
  const validation = validateOnePieceCompleteStagingReleaseV1(release);
  if (!validation.valid) {
    throw new Error(`Release plan failed: ${validation.findings.join(",")}`);
  }

  await fs.mkdir(args.outDir, { recursive: true });
  const bodies = {};
  bodies["plan.json"] = await writeJson(path.join(args.outDir, "plan.json"),
    release.plan);
  const batchIndexBody = `${release.plan.batch_index
    .map((batch) => JSON.stringify(batch)).join("\n")}\n`;
  await fs.writeFile(path.join(args.outDir, "batch_index.jsonl"), batchIndexBody,
    "utf8");
  bodies["batch_index.jsonl"] = batchIndexBody;
  const summary = {
    version: ONE_PIECE_COMPLETE_STAGING_PLAN_VERSION,
    recorded_at: new Date().toISOString(),
    status: "frozen_offline_plan_passed",
    repository,
    plan_fingerprint_sha256: release.plan.plan_fingerprint_sha256,
    release_payload_fingerprint_sha256:
      release.plan.release_payload_fingerprint_sha256,
    aggregate_counts: release.plan.aggregate_counts,
    empty_source_group_policy: release.plan.empty_source_group_policy,
    findings: validation.findings,
    boundaries: release.plan.boundaries,
    exact_next_gate: "read-only collision/schema/source preflight",
  };
  bodies["summary.json"] = await writeJson(path.join(args.outDir, "summary.json"),
    summary);
  const report = `# One Piece Complete Staging Release Plan V1\n\n` +
    `- Status: **PASS**\n` +
    `- Producer: \`${repository.commit_sha}\`\n` +
    `- Manifest rows: \`${release.plan.aggregate_counts.source_products}\`\n` +
    `- Warehouse groups: \`${release.plan.aggregate_counts.warehouse_source_groups}\`\n` +
    `- Positive-row batches: \`${release.plan.aggregate_counts.materialized_source_groups}\`\n` +
    `- Singles / DON / sealed / quarantine: ` +
    `\`${release.plan.aggregate_counts.numbered_cards}\` / ` +
    `\`${release.plan.aggregate_counts.don_cards}\` / ` +
    `\`${release.plan.aggregate_counts.sealed_product_candidates}\` / ` +
    `\`${release.plan.aggregate_counts.ambiguous_quarantined}\`\n` +
    `- Future/presale holds preserved: ` +
    `\`${release.plan.aggregate_counts.future_or_presale_holds}\`\n` +
    `- Canonical, public, pricing, Storage, pointer, and Vault writes: \`0\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), report, "utf8");
  bodies["REPORT.md"] = report;
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: Object.entries(bodies).map(([artifactPath, body]) => ({
      path: artifactPath,
      bytes: Buffer.byteLength(body),
      sha256: sha256(body),
    })),
  });
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    plan_fingerprint_sha256: summary.plan_fingerprint_sha256,
    release_payload_fingerprint_sha256:
      summary.release_payload_fingerprint_sha256,
    batch_rows: summary.aggregate_counts.materialized_source_groups,
    staging_rows: summary.aggregate_counts.source_products,
    out_dir: path.relative(ROOT, args.outDir).replaceAll("\\", "/"),
  }, null, 2)}\n`);
}

const invoked = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invoked === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
