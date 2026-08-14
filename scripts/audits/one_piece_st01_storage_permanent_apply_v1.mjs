import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

import {
  ONE_PIECE_ST01_STORAGE_PERMANENT_VERSION,
  buildOnePieceSt01PermanentAssets,
  computeOnePieceSt01StorageCodeBundle,
  permanentStorageApprovalFingerprint,
  permanentStorageApprovalPayload,
  permanentStoragePlanHash,
  resultProofHash,
} from "../../backend/pricing/one_piece_st01_storage_permanent_v1.mjs";
import {
  inspectOnePieceImage,
  stableJson,
} from "../../backend/pricing/one_piece_st01_language_and_image_readiness_v1.mjs";
import {
  EXPECTED_ASSET_COUNT,
  TARGET_STORAGE_BUCKET,
  TARGET_SUPABASE_PROJECT_REF,
} from "../../backend/pricing/one_piece_st01_storage_collision_preflight_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PLAN = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_storage_permanent_plan_v1", "st01_18_objects_v1",
  "permanent_upload_plan.json");
const DEFAULT_RESULT_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_storage_permanent_apply_v1");

function parseArgs(argv) {
  const options = { apply: false, fingerprint: "", planHash: "", resultDir: DEFAULT_RESULT_DIR };
  for (const argument of argv) {
    if (argument === "--apply") options.apply = true;
    else if (argument.startsWith("--fingerprint=")) {
      options.fingerprint = argument.slice("--fingerprint=".length);
    } else if (argument.startsWith("--plan-hash=")) {
      options.planHash = argument.slice("--plan-hash=".length);
    } else if (argument.startsWith("--result-dir=")) {
      options.resultDir = path.resolve(argument.slice("--result-dir=".length));
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  return options;
}

function createStorageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase Storage credentials are unavailable");
  const parsed = new URL(url);
  const projectRef = parsed.hostname.match(/^([a-z0-9]+)\.supabase\.co$/)?.[1];
  if (parsed.protocol !== "https:" || projectRef !== TARGET_SUPABASE_PROJECT_REF) {
    throw new Error("Supabase Storage target project mismatch");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "user-agent": "Grookai One Piece ST-01 Permanent Upload/1.0" } },
  });
}

function folderAndName(storagePath) {
  const split = storagePath.lastIndexOf("/");
  return { folder: storagePath.slice(0, split), name: storagePath.slice(split + 1) };
}

async function objectExists(client, asset) {
  const { folder, name } = folderAndName(asset.target_storage_path);
  const { data, error } = await client.storage.from(TARGET_STORAGE_BUCKET)
    .list(folder, { limit: 100, search: name });
  if (error) throw new Error(`Storage list failed: ${error.message}`);
  return (data ?? []).some((entry) => entry.name === name);
}

async function stageAsset(asset) {
  const buffer = await fs.readFile(path.join(ROOT, asset.local_cache_path));
  const observed = inspectOnePieceImage(buffer, asset.source_expected.content_type);
  for (const field of ["size_bytes", "sha256", "width", "height", "format"]) {
    if (observed[field] !== asset.source_expected[field]) {
      throw new Error(`${asset.source_product_id}:staged_${field}_mismatch`);
    }
  }
  return { asset, buffer };
}

async function downloadAndVerify(client, staged) {
  const { data, error } = await client.storage.from(TARGET_STORAGE_BUCKET)
    .download(staged.asset.target_storage_path);
  if (error || !data) throw new Error(`Storage download failed: ${error?.message ?? "no data"}`);
  const buffer = Buffer.from(await data.arrayBuffer());
  const observed = inspectOnePieceImage(buffer, staged.asset.source_expected.content_type);
  for (const field of ["size_bytes", "sha256", "width", "height", "format"]) {
    if (observed[field] !== staged.asset.source_expected[field]) {
      throw new Error(`${staged.asset.source_product_id}:readback_${field}_mismatch`);
    }
  }
  return observed;
}

async function removeAndVerifyAbsent(client, assets) {
  if (assets.length === 0) return { removed: 0, absent_verified: 0 };
  const { error } = await client.storage.from(TARGET_STORAGE_BUCKET)
    .remove(assets.map((asset) => asset.target_storage_path));
  if (error) throw new Error(`Storage rollback remove failed: ${error.message}`);
  const states = await Promise.all(assets.map((asset) => objectExists(client, asset)));
  if (states.some(Boolean)) throw new Error("Storage rollback absence verification failed");
  return { removed: assets.length, absent_verified: assets.length };
}

async function writeResult(directory, result) {
  await fs.mkdir(directory, { recursive: true });
  const base = `${result.completed_at.replaceAll(":", "-")}_${result.status}`;
  await fs.writeFile(path.join(directory, `${base}.json`), `${JSON.stringify(result, null, 2)}\n`);
  await fs.writeFile(path.join(directory, `${base}.md`),
    `# One Piece ST-01 Permanent Storage Apply V1\n\n` +
    `- Status: \`${result.status}\`\n` +
    `- Planned/staged: \`${result.assets_planned} / ${result.assets_staged}\`\n` +
    `- Initially absent: \`${result.initially_absent}\`\n` +
    `- Uploaded/readback verified: \`${result.uploaded} / ${result.readback_verified}\`\n` +
    `- Rollback removed/absent: \`${result.rollback_removed} / ${result.rollback_absent_verified}\`\n` +
    `- Durable objects after run: \`${result.durable_objects_after_run}\`\n` +
    `- Database and pointer writes: \`0\`\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const plan = JSON.parse(await fs.readFile(PLAN, "utf8"));
  if (plan.version !== ONE_PIECE_ST01_STORAGE_PERMANENT_VERSION ||
      plan.status !== "permanent_upload_plan_frozen_no_storage_access") {
    throw new Error("Permanent Storage plan is not executable");
  }
  const assets = buildOnePieceSt01PermanentAssets(plan.assets);
  if (assets.length !== EXPECTED_ASSET_COUNT) throw new Error("Permanent scope changed");
  const bundle = await computeOnePieceSt01StorageCodeBundle(ROOT);
  if (bundle.sha256 !== plan.code_bundle.sha256) {
    throw new Error("Permanent Storage code bundle changed after plan generation");
  }
  const approvalFingerprint = permanentStorageApprovalFingerprint(
    permanentStorageApprovalPayload({ assets, codeBundleSha256: bundle.sha256 }),
  );
  const planHash = permanentStoragePlanHash({
    approvalFingerprint,
    codeBundleSha256: bundle.sha256,
  });
  if (approvalFingerprint !== plan.approval_fingerprint_sha256 ||
      planHash !== plan.storage_plan_hash_sha256) {
    throw new Error("Permanent Storage plan fingerprints do not reconcile");
  }
  if (!options.apply) {
    process.stdout.write(`${JSON.stringify({
      mode: "plan_only",
      assets: assets.length,
      approval_fingerprint_sha256: approvalFingerprint,
      storage_plan_hash_sha256: planHash,
      storage_access: false,
      database_access: false,
    }, null, 2)}\n`);
    return;
  }
  if (options.fingerprint !== approvalFingerprint || options.planHash !== planHash) {
    throw new Error("Explicit permanent Storage approval fingerprint or plan hash mismatch");
  }

  let staged = [];
  let client = null;
  let initiallyAbsent = 0;
  const uploadedAssets = [];
  const readbacks = [];
  let runError = null;
  let rollback = { removed: 0, absent_verified: 0 };
  try {
    staged = await Promise.all(assets.map(stageAsset));
    client = createStorageClient();
    const existing = await Promise.all(assets.map((asset) => objectExists(client, asset)));
    initiallyAbsent = existing.filter((value) => !value).length;
    if (existing.some(Boolean)) {
      throw new Error("A target object exists; stopped before first upload");
    }
    for (const entry of staged) {
      const { error } = await client.storage.from(TARGET_STORAGE_BUCKET)
        .upload(entry.asset.target_storage_path, entry.buffer, {
          upsert: false,
          contentType: entry.asset.source_expected.content_type,
          cacheControl: "31536000",
        });
      if (error) throw new Error(`Storage upload failed: ${error.message}`);
      uploadedAssets.push(entry.asset);
      readbacks.push(await downloadAndVerify(client, entry));
    }
  } catch (error) {
    runError = error;
  } finally {
    if (runError && client && uploadedAssets.length > 0) {
      try {
        rollback = await removeAndVerifyAbsent(client, uploadedAssets);
      } catch (rollbackError) {
        runError = new AggregateError([runError, rollbackError],
          "Permanent upload and rollback both failed");
      }
    }
  }

  const rollbackComplete = !runError || rollback.absent_verified === uploadedAssets.length;
  const result = {
    version: ONE_PIECE_ST01_STORAGE_PERMANENT_VERSION,
    completed_at: new Date().toISOString(),
    status: !runError
      ? "uploaded_verified_and_retained"
      : rollbackComplete ? "failed_and_rolled_back" : "failed_rollback_incomplete",
    approval_fingerprint_sha256: approvalFingerprint,
    storage_plan_hash_sha256: planHash,
    assets_planned: assets.length,
    assets_staged: staged.length,
    initially_absent: initiallyAbsent,
    uploaded: uploadedAssets.length,
    readback_verified: readbacks.length,
    rollback_removed: rollback.removed,
    rollback_absent_verified: rollback.absent_verified,
    durable_objects_after_run: runError
      ? uploadedAssets.length - rollback.absent_verified
      : uploadedAssets.length,
    storage_list_requests: initiallyAbsent + rollback.absent_verified,
    storage_downloads: readbacks.length,
    storage_uploads: uploadedAssets.length,
    storage_removals: rollback.removed,
    database_connections: 0,
    database_reads: 0,
    database_writes: 0,
    pointer_writes: 0,
    sealed_assets: 0,
    error: runError?.message ?? null,
  };
  result.proof_hash_sha256 = resultProofHash(result);
  await writeResult(options.resultDir, result);
  process.stdout.write(`${stableJson(result)}\n`);
  if (runError) throw runError;
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
