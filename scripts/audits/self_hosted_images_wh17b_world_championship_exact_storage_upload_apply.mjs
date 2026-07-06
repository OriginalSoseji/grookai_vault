import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const SOURCE_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh17a_world_championship_pricecharting_exact_probe_summary_v1.json');
const MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh17a_world_championship_pricecharting_exact_upload_manifest_v1.jsonl');
const PLAN_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh17b_world_championship_exact_storage_upload_apply_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh17b_world_championship_exact_storage_upload_apply_plan_v1.md');
const RESULT_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh17b_world_championship_exact_storage_upload_apply_result_v1.jsonl');
const RESULT_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh17b_world_championship_exact_storage_upload_apply_result_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh17b_world_championship_exact_storage_upload_apply_result_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-17B-WORLD-CHAMPIONSHIP-EXACT-STORAGE-UPLOAD-APPLY';
const STORAGE_BUCKET = 'user-card-images';

function parseArgs(argv) {
  const args = { apply: false, fingerprint: null };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--fingerprint') args.fingerprint = argv[++index] ?? null;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function proofHash(value) {
  return sha256Hex(JSON.stringify(canonicalizeJson(value)));
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function readJsonl(file) {
  const raw = await fs.readFile(file, 'utf8');
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

async function readExistingResultRows() {
  try {
    return await readJsonl(RESULT_JSONL);
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

async function appendResultJsonl(row) {
  await fs.appendFile(RESULT_JSONL, `${JSON.stringify(row)}\n`, 'utf8');
}

function createStorageClient() {
  const url = clean(process.env.SUPABASE_URL);
  const key = clean(process.env.SUPABASE_SECRET_KEY);
  if (!url) throw new Error('Missing SUPABASE_URL.');
  if (!key) throw new Error('Missing SUPABASE_SECRET_KEY.');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function storageObjectExists(supabase, storagePath) {
  const slashIndex = storagePath.lastIndexOf('/');
  const folder = slashIndex >= 0 ? storagePath.slice(0, slashIndex) : '';
  const fileName = slashIndex >= 0 ? storagePath.slice(slashIndex + 1) : storagePath;
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(folder, { limit: 100, search: fileName });
  if (error) throw new Error(`storage_probe_failed:${storagePath}:${error.message}`);
  return (data ?? []).some((entry) => entry.name === fileName);
}

async function uploadObjectsFromManifest(manifestRows) {
  const objects = [];
  const seen = new Set();
  for (const row of manifestRows) {
    if (row.status !== 'exact_candidate_staged') continue;
    const asset = row.asset ?? {};
    const key = `${asset.target_storage_bucket}:${asset.target_storage_path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    objects.push({
      gv_id: row.gv_id,
      name: row.name,
      number: row.number,
      set_code: row.set_code,
      source_url: row.source_url,
      asset_url: row.asset_url,
      target_storage_bucket: asset.target_storage_bucket,
      target_storage_path: asset.target_storage_path,
      local_nonproduction_asset_path: asset.local_nonproduction_asset_path,
      normalized_sha256: asset.normalized_sha256,
      normalized_size_bytes: asset.normalized_size_bytes,
      content_type: asset.content_type,
    });
  }
  return objects.sort((left, right) => left.target_storage_path.localeCompare(right.target_storage_path));
}

async function validateObjects(uploadObjects) {
  const stopFindings = [];
  for (const object of uploadObjects) {
    if (object.target_storage_bucket !== STORAGE_BUCKET) stopFindings.push(`unsupported_bucket:${object.target_storage_bucket}:${object.gv_id}`);
    if (!object.target_storage_path) stopFindings.push(`missing_storage_path:${object.gv_id}`);
    if (!object.local_nonproduction_asset_path) stopFindings.push(`missing_local_asset:${object.gv_id}`);
    if (!object.normalized_sha256) stopFindings.push(`missing_sha256:${object.gv_id}`);
    if (!object.normalized_size_bytes) stopFindings.push(`missing_size:${object.gv_id}`);
    if (!clean(object.content_type)?.startsWith('image/')) stopFindings.push(`non_image_content_type:${object.gv_id}`);
    try {
      const buffer = await fs.readFile(path.join(ROOT, object.local_nonproduction_asset_path));
      const actualSha = sha256Hex(buffer);
      if (actualSha !== object.normalized_sha256) stopFindings.push(`local_asset_sha256_mismatch:${object.gv_id}`);
      if (buffer.length !== Number(object.normalized_size_bytes)) stopFindings.push(`local_asset_size_mismatch:${object.gv_id}`);
    } catch {
      stopFindings.push(`local_asset_not_readable:${object.gv_id}`);
    }
  }
  return [...new Set(stopFindings)].slice(0, 200);
}

async function buildPlan(args, summary, manifestRows, uploadObjects) {
  const stopFindings = await validateObjects(uploadObjects);
  if (summary.package_id !== 'IMG-HOST-WH-17A-WORLD-CHAMPIONSHIP-PRICECHARTING-EXACT-PROBE') {
    stopFindings.push('source_summary_package_mismatch');
  }
  if (summary.exact_image_candidate_rows !== manifestRows.length) {
    stopFindings.push('manifest_row_count_mismatch');
  }
  if (summary.storage_writes_performed !== false || summary.db_writes_performed !== false) {
    stopFindings.push('source_summary_write_flag_unexpected');
  }

  const plan = {
    package_id: PACKAGE_ID,
    mode: args.apply ? 'guarded_apply' : 'plan_only',
    generated_at: new Date().toISOString(),
    source_probe_fingerprint: summary.fingerprint,
    source_summary_json: path.relative(ROOT, SOURCE_SUMMARY_JSON),
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    manifest_rows: manifestRows.length,
    unique_upload_objects: uploadObjects.length,
    target_storage_bucket: STORAGE_BUCKET,
    db_writes_performed: false,
    storage_uploads_planned: uploadObjects.length,
    storage_uploads_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    parent_overwrites_performed: false,
    exact_image_claim_changes_performed: false,
    stop_findings: stopFindings,
  };
  plan.ready_for_apply = plan.stop_findings.length === 0 && plan.unique_upload_objects > 0;
  plan.fingerprint = summary.fingerprint;
  return plan;
}

function renderPlanMarkdown(plan) {
  return `# ${PACKAGE_ID}

- Generated: ${plan.generated_at}
- Mode: ${plan.mode}
- Fingerprint: \`${plan.fingerprint}\`
- Manifest rows: ${plan.manifest_rows}
- Unique upload objects: ${plan.unique_upload_objects}
- Target storage bucket: ${plan.target_storage_bucket}
- Ready for apply: ${plan.ready_for_apply}
- Stop findings: ${plan.stop_findings.length ? plan.stop_findings.join(', ') : 'none'}
- DB writes performed: ${plan.db_writes_performed}
- Storage uploads planned: ${plan.storage_uploads_planned}
- Migrations created: ${plan.migrations_created}
- Exact image claim changes performed: ${plan.exact_image_claim_changes_performed}
`;
}

async function uploadOne(supabase, object) {
  const exists = await storageObjectExists(supabase, object.target_storage_path);
  if (exists) {
    return {
      gv_id: object.gv_id,
      target_storage_bucket: object.target_storage_bucket,
      target_storage_path: object.target_storage_path,
      status: 'skipped_existing_object',
      uploaded: false,
      sha256: object.normalized_sha256,
    };
  }
  const buffer = await fs.readFile(path.join(ROOT, object.local_nonproduction_asset_path));
  const actualSha = sha256Hex(buffer);
  if (actualSha !== object.normalized_sha256) throw new Error(`sha256_mismatch:${object.gv_id}`);
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(object.target_storage_path, buffer, {
    upsert: false,
    contentType: object.content_type,
  });
  if (error) throw new Error(`storage_upload_failed:${object.gv_id}:${error.message}`);
  return {
    gv_id: object.gv_id,
    target_storage_bucket: object.target_storage_bucket,
    target_storage_path: object.target_storage_path,
    status: 'uploaded',
    uploaded: true,
    sha256: object.normalized_sha256,
    size_bytes: buffer.length,
    content_type: object.content_type,
  };
}

async function applyUploads(plan, uploadObjects) {
  const supabase = createStorageClient();
  const startedAt = new Date().toISOString();
  const existingRows = await readExistingResultRows();
  const completed = new Set(existingRows
    .filter((row) => row.status === 'uploaded' || row.status === 'skipped_existing_object')
    .map((row) => `${row.target_storage_bucket}:${row.target_storage_path}`));
  const pending = uploadObjects.filter((object) => !completed.has(`${object.target_storage_bucket}:${object.target_storage_path}`));

  const results = [];
  for (const object of pending) {
    try {
      const result = await uploadOne(supabase, object);
      results.push(result);
      await appendResultJsonl({ ...result, checked_at: new Date().toISOString(), fingerprint: plan.fingerprint });
    } catch (error) {
      const result = {
        gv_id: object.gv_id,
        target_storage_bucket: object.target_storage_bucket,
        target_storage_path: object.target_storage_path,
        status: 'failed_exception',
        uploaded: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
      results.push(result);
      await appendResultJsonl({ ...result, checked_at: new Date().toISOString(), fingerprint: plan.fingerprint });
    }
  }

  const allRows = await readExistingResultRows();
  const latestByPath = new Map();
  for (const row of allRows) latestByPath.set(`${row.target_storage_bucket}:${row.target_storage_path}`, row);
  const latestRows = [...latestByPath.values()];
  const failedLatest = latestRows.filter((row) => !row.uploaded && row.status !== 'skipped_existing_object');
  const uploadedLatest = latestRows.filter((row) => row.uploaded);
  const skippedLatest = latestRows.filter((row) => row.status === 'skipped_existing_object');
  const uploadedThisRun = results.filter((row) => row.uploaded);

  const result = {
    package_id: PACKAGE_ID,
    mode: 'guarded_apply_result',
    started_at: startedAt,
    ended_at: new Date().toISOString(),
    fingerprint: plan.fingerprint,
    source_probe_fingerprint: plan.source_probe_fingerprint,
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    result_jsonl: path.relative(ROOT, RESULT_JSONL),
    db_writes_performed: false,
    storage_uploads_performed: uploadedThisRun.length > 0,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    parent_overwrites_performed: false,
    exact_image_claim_changes_performed: false,
    upload_objects_in_scope: uploadObjects.length,
    pending_objects_this_run: pending.length,
    uploaded_count_this_run: uploadedThisRun.length,
    failed_count_this_run: results.filter((row) => !row.uploaded && row.status !== 'skipped_existing_object').length,
    uploaded_count_total: uploadedLatest.length,
    skipped_existing_count_total: skippedLatest.length,
    failed_count_latest: failedLatest.length,
    completed_count_total: uploadedLatest.length + skippedLatest.length,
    failures: failedLatest.slice(0, 50),
  };
  result.proof_hash = proofHash({
    package_id: result.package_id,
    fingerprint: result.fingerprint,
    upload_objects_in_scope: result.upload_objects_in_scope,
    completed_count_total: result.completed_count_total,
    uploaded_count_total: result.uploaded_count_total,
    skipped_existing_count_total: result.skipped_existing_count_total,
    failed_count_latest: result.failed_count_latest,
  });
  return result;
}

function renderResultMarkdown(result) {
  return `# ${PACKAGE_ID}

- Completed: ${result.ended_at}
- Fingerprint: \`${result.fingerprint}\`
- Proof hash: \`${result.proof_hash}\`
- Upload objects in scope: ${result.upload_objects_in_scope}
- Pending objects this run: ${result.pending_objects_this_run}
- Uploaded this run: ${result.uploaded_count_this_run}
- Failed this run: ${result.failed_count_this_run}
- Completed total: ${result.completed_count_total}
- Uploaded total: ${result.uploaded_count_total}
- Skipped existing total: ${result.skipped_existing_count_total}
- Failed latest: ${result.failed_count_latest}
- DB writes performed: ${result.db_writes_performed}
- Migrations created: ${result.migrations_created}
- Exact image claim changes performed: ${result.exact_image_claim_changes_performed}
`;
}

async function main() {
  const args = parseArgs(process.argv);
  const summary = await readJson(SOURCE_SUMMARY_JSON);
  const manifestRows = await readJsonl(MANIFEST_JSONL);
  const uploadObjects = await uploadObjectsFromManifest(manifestRows);
  const plan = await buildPlan(args, summary, manifestRows, uploadObjects);

  await fs.writeFile(PLAN_JSON, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  await fs.writeFile(PLAN_MD, renderPlanMarkdown(plan), 'utf8');

  if (!args.apply) {
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      mode: 'plan_only',
      plan_json: path.relative(ROOT, PLAN_JSON),
      plan_md: path.relative(ROOT, PLAN_MD),
      fingerprint: plan.fingerprint,
      ready_for_apply: plan.ready_for_apply,
      unique_upload_objects: plan.unique_upload_objects,
      stop_findings: plan.stop_findings,
    }, null, 2));
    return;
  }

  if (!plan.ready_for_apply) throw new Error(`Plan is not apply-ready: ${plan.stop_findings.join(', ')}`);
  if (args.fingerprint !== plan.fingerprint) throw new Error(`Fingerprint mismatch. Expected ${plan.fingerprint}.`);

  const result = await applyUploads(plan, uploadObjects);
  await fs.writeFile(RESULT_JSON, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await fs.writeFile(RESULT_MD, renderResultMarkdown(result), 'utf8');
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    result_json: path.relative(ROOT, RESULT_JSON),
    result_md: path.relative(ROOT, RESULT_MD),
    result_jsonl: path.relative(ROOT, RESULT_JSONL),
    proof_hash: result.proof_hash,
    completed_count_total: result.completed_count_total,
    uploaded_count_total: result.uploaded_count_total,
    skipped_existing_count_total: result.skipped_existing_count_total,
    failed_count_latest: result.failed_count_latest,
  }, null, 2));
  if (result.failed_count_latest > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
