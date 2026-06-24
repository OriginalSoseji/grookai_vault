import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import process from 'node:process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const SOURCE_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh11a_residual_parent_source_upload_dry_run_summary_v1.json');
const MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh11a_residual_parent_source_upload_manifest_v1.jsonl');
const PLAN_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh11b_residual_parent_source_storage_upload_apply_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh11b_residual_parent_source_storage_upload_apply_plan_v1.md');
const RESULT_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh11b_residual_parent_source_storage_upload_apply_result_v1.jsonl');
const RESULT_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh11b_residual_parent_source_storage_upload_apply_result_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh11b_residual_parent_source_storage_upload_apply_result_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-11B-RESIDUAL-PARENT-SOURCE-STORAGE-UPLOAD-APPLY';
const USER_AGENT = 'Grookai WH11B Residual Parent Image Upload Apply/1.0';

function parseArgs(argv) {
  const args = {
    apply: false,
    fingerprint: null,
    concurrency: Number.parseInt(process.env.SELF_HOSTED_IMAGES_UPLOAD_CONCURRENCY ?? '4', 10),
    timeoutMs: Number.parseInt(process.env.SELF_HOSTED_IMAGES_UPLOAD_TIMEOUT_MS ?? '45000', 10),
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--fingerprint') args.fingerprint = argv[++index] ?? null;
    else if (arg === '--concurrency') args.concurrency = Number.parseInt(argv[++index] ?? '4', 10);
    else if (arg === '--timeout-ms') args.timeoutMs = Number.parseInt(argv[++index] ?? '45000', 10);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.concurrency = Math.max(1, Math.min(args.concurrency || 4, 8));
  args.timeoutMs = Math.max(10000, args.timeoutMs || 45000);
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

function uniqueUploadObjects(manifestRows) {
  const byPath = new Map();
  for (const row of manifestRows) {
    const key = `${row.target_storage_bucket}:${row.target_storage_path}`;
    const existing = byPath.get(key);
    const object = {
      target_storage_bucket: row.target_storage_bucket,
      target_storage_path: row.target_storage_path,
      source_final_url: row.source_final_url,
      source_content_type: row.source_content_type,
      source_sha256: row.source_sha256,
      source_size_bytes: row.source_size_bytes,
      source_http_status: row.source_http_status,
      manifest_row_count: 1,
      sample_rows: [row.audit_key],
    };
    if (!existing) {
      byPath.set(key, object);
      continue;
    }
    existing.manifest_row_count += 1;
    if (existing.sample_rows.length < 10) existing.sample_rows.push(row.audit_key);
    if (
      existing.source_final_url !== object.source_final_url ||
      existing.source_sha256 !== object.source_sha256 ||
      existing.source_size_bytes !== object.source_size_bytes ||
      existing.source_content_type !== object.source_content_type
    ) {
      existing.conflict = true;
    }
  }
  return [...byPath.values()].sort((left, right) => left.target_storage_path.localeCompare(right.target_storage_path));
}

function buildPlan(summary, manifestRows, uploadObjects, args) {
  const conflicts = uploadObjects.filter((row) => row.conflict);
  const missing = uploadObjects.filter((row) => !row.source_final_url || !row.target_storage_path || !row.source_sha256 || !row.source_size_bytes);
  const plan = {
    package_id: PACKAGE_ID,
    mode: args.apply ? 'guarded_apply' : 'plan_only',
    generated_at: new Date().toISOString(),
    source_dry_run_fingerprint: summary.fingerprint,
    source_summary_json: path.relative(ROOT, SOURCE_SUMMARY_JSON),
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    manifest_rows: manifestRows.length,
    unique_upload_objects: uploadObjects.length,
    target_storage_buckets: [...new Set(uploadObjects.map((row) => row.target_storage_bucket))].sort(),
    conflict_count: conflicts.length,
    missing_required_metadata_count: missing.length,
    db_writes_performed: false,
    storage_uploads_planned: uploadObjects.length,
    storage_uploads_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    parent_overwrites_performed: false,
    stop_findings: [
      ...(summary.ready_for_storage_apply_package !== true ? ['source_dry_run_not_apply_ready'] : []),
      ...(summary.matched_manifest_rows !== manifestRows.length ? ['manifest_row_count_mismatch'] : []),
      ...(conflicts.length ? ['conflicting_target_storage_paths'] : []),
      ...(missing.length ? ['missing_required_upload_metadata'] : []),
    ],
  };
  plan.fingerprint = summary.fingerprint;
  plan.ready_for_apply = plan.stop_findings.length === 0;
  return plan;
}

function renderPlanMarkdown(plan) {
  return `# ${PACKAGE_ID}

- Generated: ${plan.generated_at}
- Mode: ${plan.mode}
- Source dry-run fingerprint: \`${plan.source_dry_run_fingerprint}\`
- Approval fingerprint: \`${plan.fingerprint}\`
- Manifest rows: ${plan.manifest_rows}
- Unique upload objects: ${plan.unique_upload_objects}
- Target storage buckets: ${plan.target_storage_buckets.join(', ')}
- Ready for apply: ${plan.ready_for_apply}
- Stop findings: ${plan.stop_findings.length ? plan.stop_findings.join(', ') : 'none'}

## Policy

- Storage uploads only when run with \`--apply --fingerprint <fingerprint>\`.
- No database writes.
- No migrations.
- No parent overwrites.
- No exact image claim changes.
- No identity-table writes.
- No price writes.
- No deletes or merges.
`;
}

async function fetchBuffer(url, timeoutMs, redirectCount = 0) {
  if (redirectCount > 5) throw new Error(`too_many_redirects:${url}`);
  const parsed = new URL(url);
  const client = parsed.protocol === 'http:' ? http : https;
  return new Promise((resolve, reject) => {
    const request = client.get(parsed, {
      headers: { 'user-agent': USER_AGENT },
      timeout: timeoutMs,
      rejectUnauthorized: false,
    }, (response) => {
      const statusCode = response.statusCode ?? 0;
      const location = response.headers.location;
      if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
        response.resume();
        fetchBuffer(new URL(location, parsed).toString(), timeoutMs, redirectCount + 1).then(resolve, reject);
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        resolve({
          ok: statusCode >= 200 && statusCode < 300,
          status: statusCode,
          final_url: url,
          content_type: response.headers['content-type'] ?? null,
          buffer: Buffer.concat(chunks),
          transport_note: 'tls_verification_disabled_after_manifest_validation',
        });
      });
    });
    request.on('timeout', () => request.destroy(new Error(`request_timeout:${url}`)));
    request.on('error', reject);
  });
}

function isImageContentType(value) {
  return clean(value)?.toLowerCase().startsWith('image/') ?? false;
}

async function storageObjectExists(supabase, bucket, storagePath) {
  const slashIndex = storagePath.lastIndexOf('/');
  const folder = slashIndex >= 0 ? storagePath.slice(0, slashIndex) : '';
  const fileName = slashIndex >= 0 ? storagePath.slice(slashIndex + 1) : storagePath;
  const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 100, search: fileName });
  if (error) throw new Error(`storage_probe_failed:${storagePath}:${error.message}`);
  return (data ?? []).some((entry) => entry.name === fileName);
}

async function uploadOne(supabase, object, timeoutMs) {
  const exists = await storageObjectExists(supabase, object.target_storage_bucket, object.target_storage_path);
  if (exists) {
    return {
      target_storage_bucket: object.target_storage_bucket,
      target_storage_path: object.target_storage_path,
      source_final_url: object.source_final_url,
      status: 'skipped_existing_object',
      uploaded: false,
      sha256: object.source_sha256,
    };
  }

  const fetched = await fetchBuffer(object.source_final_url, timeoutMs);
  const sha = sha256Hex(fetched.buffer);
  const errors = [];
  if (!fetched.ok) errors.push(`http_${fetched.status}`);
  if (!isImageContentType(fetched.content_type)) errors.push('non_image_content_type');
  if (sha !== object.source_sha256) errors.push('sha256_mismatch');
  if (fetched.buffer.length !== Number(object.source_size_bytes)) errors.push('size_mismatch');
  if (errors.length > 0) {
    return {
      target_storage_bucket: object.target_storage_bucket,
      target_storage_path: object.target_storage_path,
      source_final_url: object.source_final_url,
      status: 'failed_validation_before_upload',
      uploaded: false,
      errors,
      expected_sha256: object.source_sha256,
      actual_sha256: sha,
      expected_size_bytes: object.source_size_bytes,
      actual_size_bytes: fetched.buffer.length,
      http_status: fetched.status,
      content_type: fetched.content_type,
      transport_note: fetched.transport_note,
    };
  }

  const { error } = await supabase.storage
    .from(object.target_storage_bucket)
    .upload(object.target_storage_path, fetched.buffer, {
      upsert: false,
      contentType: object.source_content_type || fetched.content_type || 'application/octet-stream',
    });

  if (error) {
    return {
      target_storage_bucket: object.target_storage_bucket,
      target_storage_path: object.target_storage_path,
      source_final_url: object.source_final_url,
      status: 'failed_storage_upload',
      uploaded: false,
      errors: [error.message],
    };
  }

  return {
    target_storage_bucket: object.target_storage_bucket,
    target_storage_path: object.target_storage_path,
    source_final_url: object.source_final_url,
    status: 'uploaded',
    uploaded: true,
    sha256: sha,
    size_bytes: fetched.buffer.length,
    content_type: object.source_content_type || fetched.content_type,
    http_status: fetched.status,
    transport_note: fetched.transport_note,
  };
}

async function uploadOneSafe(supabase, object, timeoutMs) {
  try {
    return await uploadOne(supabase, object, timeoutMs);
  } catch (error) {
    return {
      target_storage_bucket: object.target_storage_bucket,
      target_storage_path: object.target_storage_path,
      source_final_url: object.source_final_url,
      status: 'failed_exception',
      uploaded: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  let completed = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
      completed += 1;
      if (completed % 50 === 0) {
        console.log(JSON.stringify({ package_id: PACKAGE_ID, processed: completed, total: items.length }));
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function main() {
  const args = parseArgs(process.argv);
  const summary = await readJson(SOURCE_SUMMARY_JSON);
  const manifestRows = await readJsonl(MANIFEST_JSONL);
  const uploadObjects = uniqueUploadObjects(manifestRows);
  const plan = buildPlan(summary, manifestRows, uploadObjects, args);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
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

  const supabase = createStorageClient();
  const startedAt = new Date().toISOString();
  const existingRows = await readExistingResultRows();
  const completedPaths = new Set(
    existingRows
      .filter((row) => row.status === 'uploaded' || row.status === 'skipped_existing_object')
      .map((row) => `${row.target_storage_bucket}:${row.target_storage_path}`),
  );
  const pendingUploadObjects = uploadObjects.filter(
    (object) => !completedPaths.has(`${object.target_storage_bucket}:${object.target_storage_path}`),
  );
  const results = await mapWithConcurrency(pendingUploadObjects, args.concurrency, async (object) => {
    const result = await uploadOneSafe(supabase, object, args.timeoutMs);
    await appendResultJsonl({ ...result, checked_at: new Date().toISOString(), fingerprint: plan.fingerprint });
    return result;
  });

  const allResultRows = await readExistingResultRows();
  const latestByPath = new Map();
  for (const row of allResultRows) latestByPath.set(`${row.target_storage_bucket}:${row.target_storage_path}`, row);
  const latestRows = [...latestByPath.values()];
  const uploadedLatest = latestRows.filter((row) => row.uploaded);
  const skippedLatest = latestRows.filter((row) => row.status === 'skipped_existing_object');
  const failedLatest = latestRows.filter((row) => !row.uploaded && row.status !== 'skipped_existing_object');
  const uploadedThisRun = results.filter((row) => row.uploaded);
  const skippedThisRun = results.filter((row) => row.status === 'skipped_existing_object');
  const failedThisRun = results.filter((row) => !row.uploaded && row.status !== 'skipped_existing_object');

  const result = {
    package_id: PACKAGE_ID,
    mode: 'guarded_apply_result',
    started_at: startedAt,
    ended_at: new Date().toISOString(),
    fingerprint: plan.fingerprint,
    source_dry_run_fingerprint: summary.fingerprint,
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    result_jsonl: path.relative(ROOT, RESULT_JSONL),
    db_writes_performed: false,
    storage_uploads_performed: uploadedThisRun.length > 0,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    parent_overwrites_performed: false,
    upload_objects_in_scope: uploadObjects.length,
    pending_objects_this_run: pendingUploadObjects.length,
    previously_completed_count: completedPaths.size,
    uploaded_count_this_run: uploadedThisRun.length,
    skipped_existing_count_this_run: skippedThisRun.length,
    failed_count_this_run: failedThisRun.length,
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

  await fs.writeFile(RESULT_JSON, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await fs.writeFile(RESULT_MD, `# ${PACKAGE_ID}

- Completed: ${result.ended_at}
- Fingerprint: \`${result.fingerprint}\`
- Proof hash: \`${result.proof_hash}\`
- Upload objects in scope: ${result.upload_objects_in_scope}
- Pending objects this run: ${result.pending_objects_this_run}
- Previously completed: ${result.previously_completed_count}
- Uploaded this run: ${result.uploaded_count_this_run}
- Skipped existing this run: ${result.skipped_existing_count_this_run}
- Failed this run: ${result.failed_count_this_run}
- Completed total: ${result.completed_count_total}
- Uploaded total: ${result.uploaded_count_total}
- Skipped existing total: ${result.skipped_existing_count_total}
- Failed latest: ${result.failed_count_latest}
- DB writes performed: ${result.db_writes_performed}
- Migrations created: ${result.migrations_created}
- Exact image claim changes performed: ${result.exact_image_claim_changes_performed}
`, 'utf8');

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

  if (failedLatest.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
