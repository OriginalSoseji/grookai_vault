import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

import {
  ONE_PIECE_ST01_READINESS_ROWS_SHA256,
  ONE_PIECE_ST01_STORAGE_PREFLIGHT_VERSION,
  TARGET_STORAGE_BUCKET,
  TARGET_SUPABASE_PROJECT_REF,
  buildOnePieceSt01StorageAssets,
  buildOnePieceSt01StorageRunPlan,
  validateOnePieceSt01StorageRunPlan,
} from "../../backend/pricing/one_piece_st01_storage_collision_preflight_v1.mjs";
import {
  sha256,
  stableJson,
} from "../../backend/pricing/one_piece_st01_language_and_image_readiness_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_language_and_image_readiness_v1", "st01_group_3189_v1",
  "readiness_rows.jsonl");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_storage_collision_preflight_v1", "st01_18_objects_v1");
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

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

async function verifyLocalCache(assets) {
  const rows = [];
  for (const asset of assets) {
    const bytes = await fs.readFile(path.join(ROOT, asset.local_cache_path));
    const observedSha = sha256(bytes);
    const verified = observedSha === asset.source_expected.sha256 &&
      bytes.length === asset.source_expected.size_bytes;
    rows.push({
      source_product_id: asset.source_product_id,
      local_cache_path: asset.local_cache_path,
      expected_sha256: asset.source_expected.sha256,
      observed_sha256: observedSha,
      expected_size_bytes: asset.source_expected.size_bytes,
      observed_size_bytes: bytes.length,
      verified,
    });
  }
  if (rows.some((row) => !row.verified)) {
    throw new Error("Local image cache does not match the frozen readiness proof");
  }
  return rows;
}

function createStorageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
  const parsed = new URL(url);
  const projectRef = parsed.hostname.split(".")[0];
  if (parsed.protocol !== "https:" || projectRef !== TARGET_SUPABASE_PROJECT_REF) {
    throw new Error("Supabase Storage target project mismatch");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "user-agent": "Grookai One Piece Storage Preflight/1.0" } },
  });
}

async function storageObjectExists(supabase, storagePath) {
  const slash = storagePath.lastIndexOf("/");
  const folder = storagePath.slice(0, slash);
  const fileName = storagePath.slice(slash + 1);
  const { data, error } = await supabase.storage.from(TARGET_STORAGE_BUCKET)
    .list(folder, { limit: 100, search: fileName });
  if (error) {
    throw new Error(`Storage collision read failed for ${storagePath}: ${error.message}`);
  }
  return (data ?? []).some((entry) => entry.name === fileName);
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
    throw new Error("Repository is not the exact clean preflight producer");
  }
  const sourceBody = await fs.readFile(SOURCE, "utf8");
  if (sha256(sourceBody) !== ONE_PIECE_ST01_READINESS_ROWS_SHA256) {
    throw new Error("Readiness rows changed");
  }
  const readinessRows = sourceBody.trim().split(/\r?\n/).map(JSON.parse);
  const assets = buildOnePieceSt01StorageAssets(readinessRows);
  const cacheReadback = await verifyLocalCache(assets);
  const runPlan = buildOnePieceSt01StorageRunPlan({ repository, assets });
  const planFindings = validateOnePieceSt01StorageRunPlan(runPlan);
  if (planFindings.length > 0) {
    throw new Error(`Storage run plan invalid: ${planFindings.join(",")}`);
  }

  await fs.mkdir(options.outDir, { recursive: true });
  const runPlanBody = await writeJson(path.join(options.outDir, "run_plan.json"), runPlan);

  const supabase = createStorageClient();
  const collisionRows = [];
  for (const asset of assets) {
    const exists = await storageObjectExists(supabase, asset.target_storage_path);
    collisionRows.push({
      position: asset.position,
      source_product_id: asset.source_product_id,
      proposed_parent_gv_id: asset.proposed_parent_gv_id,
      target_storage_bucket: asset.target_storage_bucket,
      target_storage_path: asset.target_storage_path,
      expected_sha256: asset.source_expected.sha256,
      storage_object_already_exists: exists,
      ready_for_future_upload: !exists,
    });
  }
  const collisions = collisionRows.filter((row) =>
    row.storage_object_already_exists).length;
  const summaryCore = {
    version: ONE_PIECE_ST01_STORAGE_PREFLIGHT_VERSION,
    status: collisions === 0
      ? "storage_collision_preflight_passed_no_writes"
      : "storage_collision_preflight_blocked_existing_objects",
    repository,
    run_plan_fingerprint_sha256: runPlan.plan_fingerprint_sha256,
    source_readiness_rows_sha256: ONE_PIECE_ST01_READINESS_ROWS_SHA256,
    target: runPlan.target,
    counts: {
      selected_assets: assets.length,
      local_cache_verified: cacheReadback.filter((row) => row.verified).length,
      storage_list_requests: collisionRows.length,
      storage_collisions: collisions,
      ready_for_future_upload: collisionRows.filter((row) =>
        row.ready_for_future_upload).length,
    },
    boundaries: {
      run_plan_written_before_storage_access: true,
      storage_reads: collisionRows.length,
      storage_downloads: 0,
      storage_uploads: 0,
      storage_removals: 0,
      database_connections: 0,
      database_writes: 0,
      pointer_updates: 0,
      canonical_mutations: 0,
      sealed_assets_included: 0,
    },
    exact_next_gate: collisions === 0
      ? "freeze a separately guarded permanent upload writer for these exact 18 objects with upsert false and exact post-upload readback"
      : "resolve existing target objects without overwrite before planning any upload",
  };
  const summary = {
    ...summaryCore,
    preflight_fingerprint_sha256: sha256(stableJson({
      summary: summaryCore,
      collision_rows: collisionRows,
      cache_readback: cacheReadback,
    })),
  };
  const collisionsBody = `${collisionRows.map((row) => JSON.stringify(row)).join("\n")}\n`;
  await fs.writeFile(path.join(options.outDir, "collision_rows.jsonl"), collisionsBody, "utf8");
  const cacheBody = await writeJson(path.join(options.outDir, "local_cache_readback.json"), {
    rows: cacheReadback,
  });
  const summaryBody = await writeJson(path.join(options.outDir, "summary.json"), summary);
  const table = collisionRows.map((row) =>
    `| ${row.position} | ${row.source_product_id} | ${row.proposed_parent_gv_id} | ` +
    `${row.storage_object_already_exists ? "collision" : "absent"} | ` +
    `${row.target_storage_path} |`).join("\n");
  const reportBody = `# One Piece ST-01 Storage Collision Preflight V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Assets: \`${summary.counts.selected_assets}\`\n` +
    `- Local cache verified: \`${summary.counts.local_cache_verified}\`\n` +
    `- Storage collisions: \`${summary.counts.storage_collisions}\`\n` +
    `- Storage list reads: \`${summary.boundaries.storage_reads}\`\n` +
    `- Storage uploads/removals: \`0 / 0\`\n` +
    `- Database connections/writes: \`0 / 0\`\n` +
    `- Pointer updates: \`0\`\n` +
    `- Sealed assets: \`0\`\n\n` +
    `| # | Product | Proposed GV-ID | Result | Target path |\n` +
    `|---:|---:|---|---|---|\n${table}\n`;
  await fs.writeFile(path.join(options.outDir, "REPORT.md"), reportBody, "utf8");
  const artifacts = [
    ["run_plan.json", runPlanBody],
    ["collision_rows.jsonl", collisionsBody],
    ["local_cache_readback.json", cacheBody],
    ["summary.json", summaryBody],
    ["REPORT.md", reportBody],
  ].map(([artifactPath, body]) => ({
    path: artifactPath,
    bytes: Buffer.byteLength(body),
    sha256: sha256(body),
  }));
  await writeJson(path.join(options.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts,
    bound_input: {
      path: path.relative(ROOT, SOURCE).replaceAll("\\", "/"),
      bytes: Buffer.byteLength(sourceBody),
      sha256: ONE_PIECE_ST01_READINESS_ROWS_SHA256,
    },
  });
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    preflight_fingerprint_sha256: summary.preflight_fingerprint_sha256,
    counts: summary.counts,
    boundaries: summary.boundaries,
    output_directory: path.relative(ROOT, options.outDir).replaceAll("\\", "/"),
  }, null, 2)}\n`);
  if (collisions > 0) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
