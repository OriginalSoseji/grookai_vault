import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

import {
  ONE_PIECE_ST01_STORAGE_PERMANENT_VERSION,
  buildOnePieceSt01PermanentAssets,
  resultProofHash,
} from "../../backend/pricing/one_piece_st01_storage_permanent_v1.mjs";
import {
  inspectOnePieceImage,
  sha256,
  stableJson,
} from "../../backend/pricing/one_piece_st01_language_and_image_readiness_v1.mjs";
import {
  EXPECTED_ASSET_COUNT,
  TARGET_STORAGE_BUCKET,
  TARGET_SUPABASE_PROJECT_REF,
} from "../../backend/pricing/one_piece_st01_storage_collision_preflight_v1.mjs";

export const ONE_PIECE_ST01_STORAGE_READBACK_VERSION =
  "ONE_PIECE_ST01_STORAGE_PERMANENT_READBACK_V1";
export const EXPECTED_APPLY_RESULT_SHA256 =
  "ca68cbf35f0a38ea2dc71bff69c8ea00d46d7a8e7f81edd5567c8a493ee10c46";
export const EXPECTED_APPLY_PROOF_SHA256 =
  "7355e97c0f3e7d6bd68fe2364ab0247b283ab5a71c987e6e82743e6318f92c1f";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BRANCH = "agent/one-piece-ingestion-readiness-v1";
const PLAN = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_storage_permanent_plan_v1", "st01_18_objects_v1",
  "permanent_upload_plan.json");
const APPLY_RESULT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_storage_permanent_apply_v1",
  "2026-08-14T14-34-07.207Z_uploaded_verified_and_retained.json");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_storage_permanent_readback_v1", "st01_18_objects_v1");

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

function createStorageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase Storage credentials are unavailable");
  const parsed = new URL(url);
  const projectRef = parsed.hostname.match(/^([a-z0-9]+)\.supabase\.co$/)?.[1];
  if (parsed.protocol !== "https:" || projectRef !== TARGET_SUPABASE_PROJECT_REF) {
    throw new Error("Supabase Storage target project mismatch");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "user-agent": "Grookai One Piece ST-01 Storage Readback/1.0" } },
  });
}

function folderAndName(storagePath) {
  const split = storagePath.lastIndexOf("/");
  return { folder: storagePath.slice(0, split), name: storagePath.slice(split + 1) };
}

async function listExactObject(client, asset) {
  const { folder, name } = folderAndName(asset.target_storage_path);
  const { data, error } = await client.storage.from(TARGET_STORAGE_BUCKET)
    .list(folder, { limit: 100, search: name });
  if (error) throw new Error(`Storage list failed: ${error.message}`);
  const exact = (data ?? []).filter((entry) => entry.name === name);
  return { exists_exactly_once: exact.length === 1, matches: exact.length };
}

async function downloadExactObject(client, asset) {
  const { data, error } = await client.storage.from(TARGET_STORAGE_BUCKET)
    .download(asset.target_storage_path);
  if (error || !data) throw new Error(`Storage download failed: ${error?.message ?? "no data"}`);
  const buffer = Buffer.from(await data.arrayBuffer());
  const observed = inspectOnePieceImage(buffer, asset.source_expected.content_type);
  const mismatches = ["size_bytes", "sha256", "width", "height", "format"]
    .filter((field) => observed[field] !== asset.source_expected[field]);
  return { observed, mismatches, verified: mismatches.length === 0 };
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
    throw new Error("Repository is not the exact clean readback producer");
  }
  const [planBody, applyBody] = await Promise.all([
    fs.readFile(PLAN),
    fs.readFile(APPLY_RESULT),
  ]);
  if (sha256(applyBody) !== EXPECTED_APPLY_RESULT_SHA256) {
    throw new Error("Permanent apply result changed");
  }
  const plan = JSON.parse(planBody.toString("utf8"));
  const applyResult = JSON.parse(applyBody.toString("utf8"));
  if (plan.version !== ONE_PIECE_ST01_STORAGE_PERMANENT_VERSION ||
      applyResult.status !== "uploaded_verified_and_retained" ||
      applyResult.proof_hash_sha256 !== EXPECTED_APPLY_PROOF_SHA256 ||
      resultProofHash(applyResult) !== EXPECTED_APPLY_PROOF_SHA256 ||
      applyResult.durable_objects_after_run !== EXPECTED_ASSET_COUNT) {
    throw new Error("Permanent apply proof is not an exact successful execution");
  }
  const assets = buildOnePieceSt01PermanentAssets(plan.assets);
  const runPlanCore = {
    version: ONE_PIECE_ST01_STORAGE_READBACK_VERSION,
    repository,
    source_plan_sha256: sha256(planBody),
    source_apply_result_sha256: EXPECTED_APPLY_RESULT_SHA256,
    source_apply_proof_sha256: EXPECTED_APPLY_PROOF_SHA256,
    target: plan.target,
    assets,
    boundaries: {
      exact_assets: EXPECTED_ASSET_COUNT,
      storage_list_reads_allowed: true,
      storage_downloads_allowed: true,
      storage_uploads_allowed: false,
      storage_removals_allowed: false,
      database_connections_allowed: false,
      database_writes_allowed: false,
      pointer_writes_allowed: false,
      sealed_assets_allowed: false,
    },
  };
  const runPlan = {
    ...runPlanCore,
    run_plan_fingerprint_sha256: sha256(stableJson(runPlanCore)),
  };
  await fs.mkdir(options.outDir, { recursive: true });
  const runPlanOutput = await writeJson(path.join(options.outDir, "run_plan.json"), runPlan);

  const client = createStorageClient();
  const rows = [];
  for (const asset of assets) {
    const listing = await listExactObject(client, asset);
    if (!listing.exists_exactly_once) {
      throw new Error(`${asset.source_product_id}:target_object_not_exactly_once`);
    }
    const download = await downloadExactObject(client, asset);
    rows.push({
      position: asset.position,
      source_product_id: asset.source_product_id,
      proposed_parent_gv_id: asset.proposed_parent_gv_id,
      target_storage_path: asset.target_storage_path,
      expected: asset.source_expected,
      listing,
      observed: download.observed,
      verified: download.verified,
      mismatches: download.mismatches,
    });
  }
  const findings = rows.flatMap((row) => row.verified
    ? []
    : row.mismatches.map((item) => `${row.source_product_id}:${item}`));
  const summaryCore = {
    version: ONE_PIECE_ST01_STORAGE_READBACK_VERSION,
    status: findings.length === 0
      ? "independent_storage_readback_passed"
      : "independent_storage_readback_failed",
    repository,
    run_plan_fingerprint_sha256: runPlan.run_plan_fingerprint_sha256,
    source_apply_result_sha256: EXPECTED_APPLY_RESULT_SHA256,
    source_apply_proof_sha256: EXPECTED_APPLY_PROOF_SHA256,
    counts: {
      planned: assets.length,
      listed_exactly_once: rows.filter((row) => row.listing.exists_exactly_once).length,
      downloaded: rows.length,
      verified: rows.filter((row) => row.verified).length,
      findings: findings.length,
    },
    boundaries: {
      run_plan_written_before_storage_access: true,
      storage_list_reads: rows.length,
      storage_downloads: rows.length,
      storage_uploads: 0,
      storage_removals: 0,
      database_connections: 0,
      database_writes: 0,
      pointer_writes: 0,
      sealed_assets: 0,
    },
    findings,
    exact_next_gate: findings.length === 0
      ? "freeze a separate database image-pointer plan for only canonical card rows that pass identity promotion"
      : "stop and reconcile Storage evidence without overwriting or deleting existing objects",
  };
  const summary = {
    ...summaryCore,
    readback_fingerprint_sha256: sha256(stableJson({ summary: summaryCore, rows })),
  };
  const rowsBody = `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
  await fs.writeFile(path.join(options.outDir, "readback_rows.jsonl"), rowsBody, "utf8");
  const summaryBody = await writeJson(path.join(options.outDir, "summary.json"), summary);
  const reportBody = `# One Piece ST-01 Permanent Storage Readback V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Planned/listed/downloaded/verified: ` +
    `\`${assets.length} / ${summary.counts.listed_exactly_once} / ` +
    `${summary.counts.downloaded} / ${summary.counts.verified}\`\n` +
    `- Findings: \`${findings.length}\`\n` +
    `- Storage list/download requests: \`${rows.length} / ${rows.length}\`\n` +
    `- Storage uploads/removals: \`0 / 0\`\n` +
    `- Database connections/writes: \`0 / 0\`\n` +
    `- Pointer writes: \`0\`\n` +
    `- Sealed assets: \`0\`\n` +
    `- Readback fingerprint: \`${summary.readback_fingerprint_sha256}\`\n`;
  await fs.writeFile(path.join(options.outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(options.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
      { path: "run_plan.json", bytes: Buffer.byteLength(runPlanOutput),
        sha256: sha256(runPlanOutput) },
      { path: "readback_rows.jsonl", bytes: Buffer.byteLength(rowsBody),
        sha256: sha256(rowsBody) },
      { path: "summary.json", bytes: Buffer.byteLength(summaryBody),
        sha256: sha256(summaryBody) },
      { path: "REPORT.md", bytes: Buffer.byteLength(reportBody),
        sha256: sha256(reportBody) },
    ],
  });
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    readback_fingerprint_sha256: summary.readback_fingerprint_sha256,
    counts: summary.counts,
    boundaries: summary.boundaries,
    output_directory: path.relative(ROOT, options.outDir).replaceAll("\\", "/"),
  }, null, 2)}\n`);
  if (findings.length > 0) process.exitCode = 1;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
