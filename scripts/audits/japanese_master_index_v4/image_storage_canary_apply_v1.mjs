import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

import { readVerifiedArtifact } from './artifact_rows_v1.mjs';
import { contentFingerprint, stableJson } from './deterministic_artifact_v1.mjs';
import { inspectImageBuffer } from './image_acquisition_readiness_v1.mjs';
import {
  IMAGE_STORAGE_CANARY_PLAN_VERSION,
  TARGET_STORAGE_BUCKET,
  TARGET_SUPABASE_PROJECT_REF,
  approvalPayload,
  computeStorageCanaryCodeBundle,
  storagePlanHash,
} from './image_storage_canary_plan_v1.mjs';

const PACKAGE_ID = 'JPN-MASTER-INDEX-V4-IMAGE-STORAGE-CANARY-APPLY-V1';
const PLAN_ARTIFACT =
  'docs/audits/japanese_master_index_v4/image_storage_canary_plan_v1/'
  + 'jpn_image_storage_canary_plan_v1.json';
const RESULT_ROOT =
  'docs/audits/japanese_master_index_v4/image_storage_canary_apply_v1';
const USER_AGENT = 'Grookai Japanese V4 Transient Storage Canary/1.0';
const FETCH_TIMEOUT_MS = 45_000;

function parseArgs(argv) {
  const args = { apply: false, fingerprint: null, planHash: null };
  for (const argument of argv) {
    if (argument === '--apply') args.apply = true;
    else if (argument.startsWith('--fingerprint=')) {
      args.fingerprint = argument.slice('--fingerprint='.length);
    } else if (argument.startsWith('--plan-hash=')) {
      args.planHash = argument.slice('--plan-hash='.length);
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  return args;
}

async function loadAssets(descriptor) {
  const rows = [];
  for (const shardPath of descriptor.shard_paths) {
    const { artifact } = await readVerifiedArtifact(shardPath);
    rows.push(...artifact.content.rows);
  }
  if (rows.length !== descriptor.row_count
    || contentFingerprint(rows) !== descriptor.content_fingerprint_sha256) {
    throw new Error('Storage canary asset dataset verification failed.');
  }
  return rows;
}

function projectRefFromUrl(value) {
  const parsed = new URL(value);
  const match = parsed.hostname.toLowerCase().match(
    /^([a-z0-9]+)\.supabase\.co$/,
  );
  if (parsed.protocol !== 'https:' || !match) {
    throw new Error('SUPABASE_URL is not a project-scoped HTTPS origin.');
  }
  return match[1];
}

function storageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Storage credentials are unavailable.');
  const projectRef = projectRefFromUrl(url);
  if (projectRef !== TARGET_SUPABASE_PROJECT_REF) {
    throw new Error(`Wrong Supabase project: ${projectRef}`);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function fetchSource(asset) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(asset.source_url, {
      headers: { 'user-agent': USER_AGENT },
      redirect: 'follow',
      signal: controller.signal,
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    const observed = inspectImageBuffer(
      buffer,
      response.headers.get('content-type'),
    );
    const expected = asset.source_expected;
    const errors = [];
    if (!response.ok) errors.push(`http_status:${response.status}`);
    if (!observed.valid_image) errors.push('invalid_image');
    for (const key of ['size_bytes', 'sha256', 'width', 'height', 'format']) {
      if (observed[key] !== expected[key]) errors.push(`${key}_mismatch`);
    }
    if (errors.length) {
      throw new Error(`${asset.gv_id}:${errors.join(',')}`);
    }
    return { asset, buffer, observed };
  } finally {
    clearTimeout(timer);
  }
}

function folderAndName(storagePath) {
  const index = storagePath.lastIndexOf('/');
  return {
    folder: storagePath.slice(0, index),
    name: storagePath.slice(index + 1),
  };
}

async function objectExists(client, asset) {
  const { folder, name } = folderAndName(asset.target_storage_path);
  const { data, error } = await client.storage
    .from(asset.target_storage_bucket)
    .list(folder, { limit: 100, search: name });
  if (error) throw new Error(`Storage list failed: ${error.message}`);
  return (data ?? []).some((row) => row.name === name);
}

async function downloadAndVerify(client, staged) {
  const { data, error } = await client.storage
    .from(staged.asset.target_storage_bucket)
    .download(staged.asset.target_storage_path);
  if (error || !data) {
    throw new Error(`Storage download failed: ${error?.message ?? 'no data'}`);
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  const observed = inspectImageBuffer(
    buffer,
    staged.asset.source_expected.content_type,
  );
  const expected = staged.asset.source_expected;
  for (const key of ['size_bytes', 'sha256', 'width', 'height', 'format']) {
    if (observed[key] !== expected[key]) {
      throw new Error(`${staged.asset.gv_id}:readback_${key}_mismatch`);
    }
  }
  return observed;
}

async function removeAndVerifyAbsent(client, assets) {
  if (assets.length === 0) return { removed: 0, absent_verified: 0 };
  const paths = assets.map((asset) => asset.target_storage_path);
  const { error } = await client.storage.from(TARGET_STORAGE_BUCKET).remove(paths);
  if (error) throw new Error(`Storage rollback failed: ${error.message}`);
  const states = await Promise.all(assets.map((asset) => objectExists(client, asset)));
  if (states.some(Boolean)) throw new Error('Storage rollback absence check failed.');
  return { removed: assets.length, absent_verified: assets.length };
}

async function writeResult(result) {
  await fs.mkdir(RESULT_ROOT, { recursive: true });
  await fs.writeFile(
    path.join(RESULT_ROOT, 'jpn_image_storage_canary_apply_v1.json'),
    stableJson(result),
  );
  await fs.writeFile(
    path.join(RESULT_ROOT, 'jpn_image_storage_canary_apply_v1.md'),
    `# Japanese Master Index V4 Image Storage Canary Apply V1

- Status: \`${result.status}\`
- Assets staged: ${result.assets_staged}
- Uploaded: ${result.uploaded}
- Readback verified: ${result.readback_verified}
- Removed: ${result.removed}
- Post-remove absence verified: ${result.absent_verified}
- Durable objects after run: ${result.durable_objects_after_run}
- Database reads/writes: 0 / 0
- Image-pointer writes: 0
`,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { artifact: planArtifact } = await readVerifiedArtifact(PLAN_ARTIFACT, {
    expectedPackageId: IMAGE_STORAGE_CANARY_PLAN_VERSION,
  });
  const plan = planArtifact.content;
  const assets = await loadAssets(plan.asset_dataset);
  const currentBundle = await computeStorageCanaryCodeBundle();
  if (currentBundle.hash !== plan.code_bundle.hash) {
    throw new Error('Storage canary code bundle changed after plan generation.');
  }
  const recomputedApproval = contentFingerprint(
    approvalPayload(assets, currentBundle.hash),
  );
  const recomputedPlanHash = storagePlanHash(
    recomputedApproval,
    currentBundle.hash,
  );
  if (recomputedApproval !== plan.approval_fingerprint_sha256
    || recomputedPlanHash !== plan.storage_plan_hash_sha256) {
    throw new Error('Storage plan fingerprints do not reconcile.');
  }
  if (!args.apply) {
    process.stdout.write(stableJson({
      package_id: PACKAGE_ID,
      mode: 'plan_only',
      assets: assets.length,
      approval_fingerprint_sha256: recomputedApproval,
      storage_plan_hash_sha256: recomputedPlanHash,
      storage_access_performed: false,
    }));
    return;
  }
  if (args.fingerprint !== recomputedApproval
    || args.planHash !== recomputedPlanHash) {
    throw new Error('Explicit Storage approval fingerprint or plan hash mismatch.');
  }

  dotenv.config({
    path: process.env.IMG_HOST_ENV_FILE ?? '.env.local',
    quiet: true,
  });
  dotenv.config({ quiet: true });

  // Fetch and verify every source before the first Storage call.
  const staged = await Promise.all(assets.map(fetchSource));
  const client = storageClient();
  const existing = await Promise.all(assets.map((asset) => objectExists(client, asset)));
  if (existing.some(Boolean)) {
    throw new Error('A target object already exists; stopped before first upload.');
  }

  const uploadedAssets = [];
  const readbacks = [];
  let runError = null;
  let rollback = { removed: 0, absent_verified: 0 };
  try {
    for (const entry of staged) {
      const { error } = await client.storage
        .from(entry.asset.target_storage_bucket)
        .upload(entry.asset.target_storage_path, entry.buffer, {
          upsert: false,
          contentType: entry.asset.source_expected.content_type,
          cacheControl: '31536000',
        });
      if (error) throw new Error(`Storage upload failed: ${error.message}`);
      uploadedAssets.push(entry.asset);
      readbacks.push(await downloadAndVerify(client, entry));
    }
  } catch (error) {
    runError = error;
  } finally {
    try {
      rollback = await removeAndVerifyAbsent(client, uploadedAssets);
    } catch (error) {
      runError = runError
        ? new AggregateError([runError, error], 'Canary and rollback failed.')
        : error;
    }
  }

  const result = {
    package_id: PACKAGE_ID,
    completed_at: new Date().toISOString(),
    status: runError ? 'failed_or_rollback_incomplete' : 'passed_and_rolled_back',
    approval_fingerprint_sha256: recomputedApproval,
    storage_plan_hash_sha256: recomputedPlanHash,
    target: plan.target,
    assets_staged: staged.length,
    uploaded: uploadedAssets.length,
    readback_verified: readbacks.length,
    removed: rollback.removed,
    absent_verified: rollback.absent_verified,
    durable_objects_after_run:
      uploadedAssets.length - rollback.absent_verified,
    database_reads: 0,
    database_writes: 0,
    image_pointer_writes: 0,
    error: runError?.message ?? null,
  };
  result.proof_hash_sha256 = contentFingerprint(result);
  await writeResult(result);
  process.stdout.write(stableJson(result));
  if (runError) throw runError;
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
