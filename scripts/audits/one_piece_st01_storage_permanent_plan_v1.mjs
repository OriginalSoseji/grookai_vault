import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ONE_PIECE_ST01_STORAGE_PERMANENT_VERSION,
  ONE_PIECE_ST01_STORAGE_PREFLIGHT_CACHE_READBACK_SHA256,
  ONE_PIECE_ST01_STORAGE_PREFLIGHT_COLLISION_ROWS_SHA256,
  ONE_PIECE_ST01_STORAGE_PREFLIGHT_FINGERPRINT,
  ONE_PIECE_ST01_STORAGE_PREFLIGHT_RUN_PLAN_SHA256,
  ONE_PIECE_ST01_STORAGE_PREFLIGHT_SUMMARY_SHA256,
  buildOnePieceSt01PermanentAssets,
  computeOnePieceSt01StorageCodeBundle,
  permanentStorageApprovalFingerprint,
  permanentStorageApprovalPayload,
  permanentStoragePlanHash,
} from "../../backend/pricing/one_piece_st01_storage_permanent_v1.mjs";
import {
  inspectOnePieceImage,
  sha256,
  stableJson,
} from "../../backend/pricing/one_piece_st01_language_and_image_readiness_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PREFLIGHT_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_storage_collision_preflight_v1", "st01_18_objects_v1");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_storage_permanent_plan_v1", "st01_18_objects_v1");
const BRANCH = "agent/one-piece-ingestion-readiness-v1";

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const options = { expectedHeadSha: "", outDir: DEFAULT_OUT };
  for (const argument of argv) {
    if (argument.startsWith("--expected-head-sha=")) {
      options.expectedHeadSha = argument.slice("--expected-head-sha=".length);
    } else if (argument.startsWith("--out-dir=")) {
      options.outDir = path.resolve(argument.slice("--out-dir=".length));
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(options.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return options;
}

async function readAndVerify(relativeName, expectedSha256) {
  const body = await fs.readFile(path.join(PREFLIGHT_DIR, relativeName));
  if (sha256(body) !== expectedSha256) {
    throw new Error(`Preflight artifact changed: ${relativeName}`);
  }
  return body;
}

async function verifyLocalCache(assets) {
  const rows = [];
  for (const asset of assets) {
    const bytes = await fs.readFile(path.join(ROOT, asset.local_cache_path));
    const observed = inspectOnePieceImage(bytes, asset.source_expected.content_type);
    const mismatches = ["size_bytes", "sha256", "width", "height", "format"]
      .filter((field) => observed[field] !== asset.source_expected[field]);
    rows.push({
      source_product_id: asset.source_product_id,
      local_cache_path: asset.local_cache_path,
      observed,
      verified: mismatches.length === 0,
      mismatches,
    });
  }
  if (rows.some((row) => !row.verified)) {
    throw new Error("Permanent Storage local cache verification failed");
  }
  return rows;
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
    throw new Error("Repository is not the exact clean permanent-plan producer");
  }

  const [runPlanBody, collisionBody, cacheBody, summaryBody] = await Promise.all([
    readAndVerify("run_plan.json", ONE_PIECE_ST01_STORAGE_PREFLIGHT_RUN_PLAN_SHA256),
    readAndVerify("collision_rows.jsonl",
      ONE_PIECE_ST01_STORAGE_PREFLIGHT_COLLISION_ROWS_SHA256),
    readAndVerify("local_cache_readback.json",
      ONE_PIECE_ST01_STORAGE_PREFLIGHT_CACHE_READBACK_SHA256),
    readAndVerify("summary.json", ONE_PIECE_ST01_STORAGE_PREFLIGHT_SUMMARY_SHA256),
  ]);
  const preflightPlan = JSON.parse(runPlanBody.toString("utf8"));
  const collisionRows = collisionBody.toString("utf8").trim().split(/\r?\n/).map(JSON.parse);
  const preflightSummary = JSON.parse(summaryBody.toString("utf8"));
  JSON.parse(cacheBody.toString("utf8"));
  if (preflightSummary.preflight_fingerprint_sha256 !==
      ONE_PIECE_ST01_STORAGE_PREFLIGHT_FINGERPRINT ||
      preflightSummary.status !== "storage_collision_preflight_passed_no_writes" ||
      preflightSummary.counts.storage_collisions !== 0 ||
      collisionRows.length !== 18 ||
      collisionRows.some((row) => row.storage_object_already_exists ||
        !row.ready_for_future_upload)) {
    throw new Error("Collision preflight does not authorize permanent planning");
  }

  const assets = buildOnePieceSt01PermanentAssets(preflightPlan.assets);
  const [localCacheReadback, codeBundle] = await Promise.all([
    verifyLocalCache(assets),
    computeOnePieceSt01StorageCodeBundle(ROOT),
  ]);
  const approvalPayload = permanentStorageApprovalPayload({
    assets,
    codeBundleSha256: codeBundle.sha256,
  });
  const approvalFingerprint = permanentStorageApprovalFingerprint(approvalPayload);
  const planHash = permanentStoragePlanHash({
    approvalFingerprint,
    codeBundleSha256: codeBundle.sha256,
  });
  const plan = {
    version: ONE_PIECE_ST01_STORAGE_PERMANENT_VERSION,
    status: "permanent_upload_plan_frozen_no_storage_access",
    generated_at: new Date().toISOString(),
    repository,
    source_preflight: {
      fingerprint_sha256: ONE_PIECE_ST01_STORAGE_PREFLIGHT_FINGERPRINT,
      run_plan_sha256: ONE_PIECE_ST01_STORAGE_PREFLIGHT_RUN_PLAN_SHA256,
      collision_rows_sha256: ONE_PIECE_ST01_STORAGE_PREFLIGHT_COLLISION_ROWS_SHA256,
      cache_readback_sha256: ONE_PIECE_ST01_STORAGE_PREFLIGHT_CACHE_READBACK_SHA256,
      summary_sha256: ONE_PIECE_ST01_STORAGE_PREFLIGHT_SUMMARY_SHA256,
    },
    target: approvalPayload.target,
    assets,
    code_bundle: codeBundle,
    approval_fingerprint_sha256: approvalFingerprint,
    storage_plan_hash_sha256: planHash,
    execution_policy: approvalPayload.execution_policy,
    local_cache_readback: {
      verified_assets: localCacheReadback.filter((row) => row.verified).length,
      rows: localCacheReadback,
    },
    execution_boundary: {
      storage_access: false,
      storage_writes: false,
      database_connections: false,
      database_writes: false,
      pointer_writes: false,
      sealed_assets: 0,
      durable_objects_created: 0,
    },
    ready_for_separate_permanent_upload_authorization: true,
  };
  await fs.mkdir(options.outDir, { recursive: true });
  const planBody = await writeJson(path.join(options.outDir, "permanent_upload_plan.json"), plan);
  const reportBody = `# One Piece ST-01 Permanent Storage Plan V1\n\n` +
    `- Status: \`${plan.status}\`\n` +
    `- Producer SHA: \`${repository.commit_sha}\`\n` +
    `- Exact assets: \`${assets.length}\`\n` +
    `- Local cache verified: \`${plan.local_cache_readback.verified_assets}\`\n` +
    `- Approval fingerprint: \`${approvalFingerprint}\`\n` +
    `- Storage plan hash: \`${planHash}\`\n` +
    `- Code bundle hash: \`${codeBundle.sha256}\`\n` +
    `- Storage access/writes: \`0 / 0\`\n` +
    `- Database connections/writes: \`0 / 0\`\n` +
    `- Pointer writes: \`0\`\n` +
    `- Sealed assets: \`0\`\n\n` +
    `The apply runner remains inert unless \`--apply\`, this approval ` +
    `fingerprint, and this plan hash are supplied together.\n`;
  await fs.writeFile(path.join(options.outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(options.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
      { path: "permanent_upload_plan.json", bytes: Buffer.byteLength(planBody),
        sha256: sha256(planBody) },
      { path: "REPORT.md", bytes: Buffer.byteLength(reportBody),
        sha256: sha256(reportBody) },
    ],
    plan_evidence_fingerprint_sha256: sha256(stableJson({
      approval_fingerprint_sha256: approvalFingerprint,
      storage_plan_hash_sha256: planHash,
      producer_sha: repository.commit_sha,
    })),
  });
  process.stdout.write(`${JSON.stringify({
    status: plan.status,
    producer_sha: repository.commit_sha,
    exact_assets: assets.length,
    approval_fingerprint_sha256: approvalFingerprint,
    storage_plan_hash_sha256: planHash,
    code_bundle_sha256: codeBundle.sha256,
    boundaries: plan.execution_boundary,
    output_directory: path.relative(ROOT, options.outDir).replaceAll("\\", "/"),
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
