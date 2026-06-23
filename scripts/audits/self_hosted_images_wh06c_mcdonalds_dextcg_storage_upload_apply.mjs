import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import https from 'node:https';
import process from 'node:process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh06b_mcdonalds_dextcg_upload_manifest_v1.jsonl');
const PLAN_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh06c_mcdonalds_dextcg_storage_upload_apply_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh06c_mcdonalds_dextcg_storage_upload_apply_plan_v1.md');
const RESULT_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh06c_mcdonalds_dextcg_storage_upload_apply_result_v1.jsonl');
const RESULT_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh06c_mcdonalds_dextcg_storage_upload_apply_result_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh06c_mcdonalds_dextcg_storage_upload_apply_result_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-06C-MCDONALDS-DEXTCG-STORAGE-UPLOAD-APPLY';
const APPROVED_DRY_RUN_FINGERPRINT = '389bf9d798397beba886ce665867e9c2e5ee7dc0218c4124d7babf12475dfdcf';
const USER_AGENT = 'Grookai McDonalds DexTCG Storage Upload Apply/1.0';
const ALLOWED_SET_CODES = new Set(['mcd14', 'mcd15', 'mcd17', 'mcd18', '2023sv', '2024sv']);

function parseArgs(argv) {
  const args = {
    apply: false,
    fingerprint: null,
    concurrency: Number.parseInt(process.env.MCD_DEXTCG_UPLOAD_CONCURRENCY ?? '4', 10),
    timeoutMs: Number.parseInt(process.env.MCD_DEXTCG_UPLOAD_TIMEOUT_MS ?? '45000', 10),
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
  return Object.keys(value).sort((left, right) => left.localeCompare(right)).reduce((acc, key) => {
    acc[key] = canonicalizeJson(value[key]);
    return acc;
  }, {});
}

function proofHash(value) {
  return sha256Hex(JSON.stringify(canonicalizeJson(value)));
}

function createStorageClient() {
  const url = clean(process.env.SUPABASE_URL);
  const key = clean(process.env.SUPABASE_SECRET_KEY);
  if (!url) throw new Error('Missing SUPABASE_URL.');
  if (!key) throw new Error('Missing SUPABASE_SECRET_KEY.');
  return createClient(url, key, { auth: { persistSession: false } });
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

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function uniqueUploadObjects(manifestRows) {
  const byPath = new Map();
  for (const row of manifestRows) {
    const key = `${row.target_storage_bucket}:${row.target_storage_path}`;
    const existing = byPath.get(key);
    if (!existing) {
      byPath.set(key, {
        target_storage_bucket: row.target_storage_bucket,
        target_storage_path: row.target_storage_path,
        source_url: row.source_final_url ?? row.source_url,
        source_content_type: row.source_content_type,
        source_sha256: row.source_sha256,
        source_size_bytes: row.source_size_bytes,
        source_dimensions: row.source_dimensions,
        source_lane: row.source_lane,
        set_code: row.set_code,
        dextcg_set_code: row.dextcg_set_code,
        proposed_image_status: row.proposed_image_status,
        proposed_display_image_kind: row.proposed_display_image_kind,
        exact_image_claim_change: row.exact_image_claim_change,
        manifest_row_count: 1,
        sample_rows: [row.gv_id],
      });
      continue;
    }
    existing.manifest_row_count += 1;
    if (existing.sample_rows.length < 10) existing.sample_rows.push(row.gv_id);
    if (
      existing.source_sha256 !== row.source_sha256 ||
      existing.source_size_bytes !== row.source_size_bytes ||
      existing.source_content_type !== row.source_content_type
    ) {
      existing.conflict = true;
    }
  }
  return [...byPath.values()].sort((left, right) => left.target_storage_path.localeCompare(right.target_storage_path));
}

function buildPlan(manifestRows, uploadObjects, args) {
  const conflicts = uploadObjects.filter((row) => row.conflict);
  const missing = uploadObjects.filter((row) =>
    !row.target_storage_bucket ||
    !row.target_storage_path ||
    !row.source_url ||
    !row.source_sha256 ||
    !Number.isFinite(Number(row.source_size_bytes)));
  const exactClaimChanges = manifestRows.filter((row) => row.exact_image_claim_change === true);
  const disallowedSetRows = manifestRows.filter((row) => !ALLOWED_SET_CODES.has(String(row.set_code ?? '')));
  const disallowedSourceRows = manifestRows.filter((row) => row.source_lane !== 'external_dextcg');
  const disallowedBucketRows = manifestRows.filter((row) => row.target_storage_bucket !== 'user-card-images');

  const payload = {
    package_id: PACKAGE_ID,
    mode: args.apply ? 'guarded_apply' : 'plan_only',
    generated_at: new Date().toISOString(),
    source_dry_run_fingerprint: APPROVED_DRY_RUN_FINGERPRINT,
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    manifest_rows: manifestRows.length,
    unique_upload_objects_total: uploadObjects.length,
    target_storage_buckets: [...new Set(uploadObjects.map((row) => row.target_storage_bucket))].sort(),
    source_lanes: [...new Set(manifestRows.map((row) => row.source_lane))].sort(),
    set_codes: countBy(manifestRows, (row) => row.set_code),
    proposed_image_statuses: countBy(manifestRows, (row) => row.proposed_image_status),
    conflict_count: conflicts.length,
    missing_required_metadata_count: missing.length,
    exact_image_claim_change_rows: exactClaimChanges.length,
    disallowed_set_rows: disallowedSetRows.length,
    disallowed_source_rows: disallowedSourceRows.length,
    disallowed_bucket_rows: disallowedBucketRows.length,
    db_writes_performed: false,
    storage_uploads_planned: uploadObjects.length,
    storage_uploads_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    global_apply_performed: false,
    concurrency: args.concurrency,
    stop_findings: [
      ...(conflicts.length ? ['conflicting_target_storage_paths'] : []),
      ...(missing.length ? ['missing_required_upload_metadata'] : []),
      ...(exactClaimChanges.length ? ['exact_image_claim_changes_present'] : []),
      ...(disallowedSetRows.length ? ['disallowed_set_rows_present'] : []),
      ...(disallowedSourceRows.length ? ['disallowed_source_rows_present'] : []),
      ...(disallowedBucketRows.length ? ['disallowed_bucket_rows_present'] : []),
    ],
  };
  payload.fingerprint = APPROVED_DRY_RUN_FINGERPRINT;
  payload.plan_hash = proofHash({
    package_id: payload.package_id,
    source_dry_run_fingerprint: payload.source_dry_run_fingerprint,
    manifest_rows: payload.manifest_rows,
    unique_upload_objects_total: payload.unique_upload_objects_total,
    target_storage_buckets: payload.target_storage_buckets,
    source_lanes: payload.source_lanes,
    set_codes: payload.set_codes,
    proposed_image_statuses: payload.proposed_image_statuses,
    upload_objects: uploadObjects.map((row) => ({
      target_storage_bucket: row.target_storage_bucket,
      target_storage_path: row.target_storage_path,
      source_url: row.source_url,
      source_sha256: row.source_sha256,
      source_size_bytes: row.source_size_bytes,
      source_content_type: row.source_content_type,
    })),
  });
  payload.ready_for_apply = payload.stop_findings.length === 0;
  return payload;
}

function renderPlanMarkdown(plan) {
  return `# ${PACKAGE_ID}

- Generated: ${plan.generated_at}
- Mode: ${plan.mode}
- Fingerprint: \`${plan.fingerprint}\`
- Plan hash: \`${plan.plan_hash}\`
- Manifest JSONL: \`${plan.manifest_jsonl}\`
- Manifest rows: ${plan.manifest_rows}
- Unique upload objects: ${plan.unique_upload_objects_total}
- Target storage buckets: ${plan.target_storage_buckets.join(', ')}
- Source lanes: ${plan.source_lanes.join(', ')}
- Ready for apply: ${plan.ready_for_apply}
- Stop findings: ${plan.stop_findings.length ? plan.stop_findings.join(', ') : 'none'}

## Policy

- Storage upload only when run with \`--apply --fingerprint ${APPROVED_DRY_RUN_FINGERPRINT}\`.
- No database writes.
- No migrations.
- No exact image claim changes.
- No identity-table writes.
- No price writes.
- No deletes or merges.
- Source bytes are re-fetched and verified against expected SHA-256 and size before upload.
`;
}

function fetchBuffer(url, timeoutMs, redirects = 4) {
  const agent = new https.Agent({ rejectUnauthorized: false });
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      agent,
      headers: { 'user-agent': USER_AGENT },
      timeout: timeoutMs,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location;
        if (status >= 300 && status < 400 && location && redirects > 0) {
          fetchBuffer(new URL(location, url).toString(), timeoutMs, redirects - 1).then(resolve, reject);
          return;
        }
        resolve({
          ok: status >= 200 && status < 300,
          status,
          final_url: url,
          content_type: Array.isArray(response.headers['content-type'])
            ? response.headers['content-type'][0]
            : response.headers['content-type'] ?? null,
          buffer: Buffer.concat(chunks),
          transport_note: 'dextcg_tls_verification_disabled_after_manifest_validation',
        });
      });
    });
    request.on('timeout', () => request.destroy(new Error(`request_timeout:${url}`)));
    request.on('error', reject);
  });
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
      source_url: object.source_url,
      status: 'skipped_existing_object',
      uploaded: false,
      sha256: object.source_sha256,
    };
  }

  const fetched = await fetchBuffer(object.source_url, timeoutMs);
  const sha = sha256Hex(fetched.buffer);
  const errors = [];
  if (!fetched.ok) errors.push(`http_${fetched.status}`);
  if (sha !== object.source_sha256) errors.push('sha256_mismatch');
  if (fetched.buffer.length !== Number(object.source_size_bytes)) errors.push('size_mismatch');
  if (errors.length > 0) {
    return {
      target_storage_bucket: object.target_storage_bucket,
      target_storage_path: object.target_storage_path,
      source_url: object.source_url,
      status: 'failed_validation_before_upload',
      uploaded: false,
      errors,
      expected_sha256: object.source_sha256,
      actual_sha256: sha,
      expected_size_bytes: object.source_size_bytes,
      actual_size_bytes: fetched.buffer.length,
      http_status: fetched.status,
      transport_note: fetched.transport_note,
    };
  }

  const { error } = await supabase.storage
    .from(object.target_storage_bucket)
    .upload(object.target_storage_path, fetched.buffer, {
      upsert: false,
      contentType: object.source_content_type || fetched.content_type || 'image/png',
    });

  if (error) {
    return {
      target_storage_bucket: object.target_storage_bucket,
      target_storage_path: object.target_storage_path,
      source_url: object.source_url,
      status: 'failed_storage_upload',
      uploaded: false,
      errors: [error.message],
    };
  }

  return {
    target_storage_bucket: object.target_storage_bucket,
    target_storage_path: object.target_storage_path,
    source_url: object.source_url,
    status: 'uploaded',
    uploaded: true,
    sha256: sha,
    size_bytes: fetched.buffer.length,
    content_type: object.source_content_type || fetched.content_type,
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
      source_url: object.source_url,
      status: 'failed_exception',
      uploaded: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function main() {
  const args = parseArgs(process.argv);
  const manifestRows = await readJsonl(MANIFEST_JSONL);
  const uploadObjects = uniqueUploadObjects(manifestRows);
  const plan = buildPlan(manifestRows, uploadObjects, args);

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
      plan_hash: plan.plan_hash,
      ready_for_apply: plan.ready_for_apply,
      unique_upload_objects: plan.unique_upload_objects_total,
      stop_findings: plan.stop_findings,
    }, null, 2));
    return;
  }

  if (!plan.ready_for_apply) throw new Error(`Plan is not apply-ready: ${plan.stop_findings.join(', ')}`);
  if (args.fingerprint !== APPROVED_DRY_RUN_FINGERPRINT) {
    throw new Error(`Fingerprint mismatch. Expected ${APPROVED_DRY_RUN_FINGERPRINT}.`);
  }

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
  const results = await mapWithConcurrency(
    pendingUploadObjects,
    args.concurrency,
    async (object) => {
      const result = await uploadOneSafe(supabase, object, args.timeoutMs);
      await appendResultJsonl({ ...result, checked_at: new Date().toISOString(), fingerprint: plan.fingerprint });
      return result;
    },
  );

  const allResultRows = await readExistingResultRows();
  const latestByPath = new Map();
  for (const row of allResultRows) {
    latestByPath.set(`${row.target_storage_bucket}:${row.target_storage_path}`, row);
  }
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
    plan_hash: plan.plan_hash,
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
    global_apply_performed: false,
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
    failures: failedLatest.slice(0, 100),
  };
  result.proof_hash = proofHash({
    package_id: result.package_id,
    fingerprint: result.fingerprint,
    plan_hash: result.plan_hash,
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
- Plan hash: \`${result.plan_hash}\`
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
- Parent overwrites performed: ${result.parent_overwrites_performed}
- Global apply performed: ${result.global_apply_performed}
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
