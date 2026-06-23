import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import http from 'node:http';
import https from 'node:https';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh02a_valid_external_upload_manifest_v1.jsonl');
const PLAN_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh02b_valid_external_storage_upload_apply_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh02b_valid_external_storage_upload_apply_plan_v1.md');
const RESULT_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh02b_valid_external_storage_upload_apply_result_v1.jsonl');
const RESULT_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh02b_valid_external_storage_upload_apply_result_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh02b_valid_external_storage_upload_apply_result_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-02B-VALID-EXTERNAL-STORAGE-UPLOAD-APPLY';
const USER_AGENT = 'Grookai Self Hosted Image Upload Apply/1.0';

function parseArgs(argv) {
  const args = {
    apply: false,
    fingerprint: null,
    limit: Number.parseInt(process.env.SELF_HOSTED_IMAGES_UPLOAD_LIMIT ?? '0', 10),
    concurrency: Number.parseInt(process.env.SELF_HOSTED_IMAGES_UPLOAD_CONCURRENCY ?? '3', 10),
    timeoutMs: Number.parseInt(process.env.SELF_HOSTED_IMAGES_UPLOAD_TIMEOUT_MS ?? '45000', 10),
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--fingerprint') args.fingerprint = argv[++index] ?? null;
    else if (arg === '--limit') args.limit = Number.parseInt(argv[++index] ?? '0', 10);
    else if (arg === '--concurrency') args.concurrency = Number.parseInt(argv[++index] ?? '3', 10);
    else if (arg === '--timeout-ms') args.timeoutMs = Number.parseInt(argv[++index] ?? '45000', 10);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  args.concurrency = Math.max(1, Math.min(args.concurrency || 3, 8));
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

function hostnameFor(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function insecureTlsFallbackHost(url) {
  const host = hostnameFor(url);
  if (host === 'assets.tcgdex.net') return 'tcgdex';
  if (host === 'images.pokemontcg.io') return 'pokemontcg';
  return null;
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

function uniqueUploadObjects(manifestRows) {
  const byPath = new Map();
  for (const row of manifestRows) {
    const existing = byPath.get(row.target_storage_path);
    if (!existing) {
      byPath.set(row.target_storage_path, {
        target_storage_bucket: row.target_storage_bucket,
        target_storage_path: row.target_storage_path,
        source_final_url: row.source_final_url,
        source_content_type: row.source_content_type,
        source_sha256: row.source_sha256,
        source_size_bytes: row.source_size_bytes,
        source_dimensions: row.source_dimensions,
        manifest_row_count: 1,
        sample_rows: [row.audit_key],
      });
      continue;
    }
    existing.manifest_row_count += 1;
    if (existing.sample_rows.length < 10) existing.sample_rows.push(row.audit_key);
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
  const missing = uploadObjects.filter((row) => !row.source_final_url || !row.target_storage_path || !row.source_sha256);
  const limitedUploadObjects = args.limit > 0 ? uploadObjects.slice(0, args.limit) : uploadObjects;
  const payload = {
    package_id: PACKAGE_ID,
    mode: args.apply ? 'guarded_apply' : 'plan_only',
    generated_at: new Date().toISOString(),
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    manifest_rows: manifestRows.length,
    unique_upload_objects_total: uploadObjects.length,
    unique_upload_objects_in_scope: limitedUploadObjects.length,
    upload_limit: args.limit > 0 ? args.limit : null,
    target_storage_buckets: [...new Set(uploadObjects.map((row) => row.target_storage_bucket))].sort(),
    conflict_count: conflicts.length,
    missing_required_metadata_count: missing.length,
    db_writes_performed: false,
    storage_uploads_planned: limitedUploadObjects.length,
    storage_uploads_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    concurrency: args.concurrency,
    stop_findings: [
      ...(conflicts.length ? ['conflicting_target_storage_paths'] : []),
      ...(missing.length ? ['missing_required_upload_metadata'] : []),
    ],
  };
  payload.fingerprint = proofHash({
    package_id: payload.package_id,
    manifest_rows: payload.manifest_rows,
    unique_upload_objects_total: payload.unique_upload_objects_total,
    unique_upload_objects_in_scope: payload.unique_upload_objects_in_scope,
    upload_limit: payload.upload_limit,
    target_storage_buckets: payload.target_storage_buckets,
    conflict_count: payload.conflict_count,
    missing_required_metadata_count: payload.missing_required_metadata_count,
    upload_objects: limitedUploadObjects.map((row) => ({
      target_storage_bucket: row.target_storage_bucket,
      target_storage_path: row.target_storage_path,
      source_final_url: row.source_final_url,
      source_sha256: row.source_sha256,
      source_size_bytes: row.source_size_bytes,
      source_content_type: row.source_content_type,
    })),
  });
  payload.ready_for_apply = payload.stop_findings.length === 0;
  return { payload, uploadObjects: limitedUploadObjects };
}

function renderPlanMarkdown(plan) {
  return `# ${PACKAGE_ID}

- Generated: ${plan.generated_at}
- Mode: ${plan.mode}
- Fingerprint: \`${plan.fingerprint}\`
- Manifest JSONL: \`${plan.manifest_jsonl}\`
- Manifest rows: ${plan.manifest_rows}
- Unique upload objects total: ${plan.unique_upload_objects_total}
- Unique upload objects in scope: ${plan.unique_upload_objects_in_scope}
- Upload limit: ${plan.upload_limit ?? 'none'}
- Target storage buckets: ${plan.target_storage_buckets.join(', ')}
- Ready for apply: ${plan.ready_for_apply}
- Stop findings: ${plan.stop_findings.length ? plan.stop_findings.join(', ') : 'none'}

## Policy

- Storage upload only when run with \`--apply --fingerprint <fingerprint>\`.
- No database writes.
- No migrations.
- No exact image claim changes.
- No identity-table writes.
- No price writes.
- No deletes or merges.
- The manifest preserves original source URLs and expected SHA-256 metadata.
`;
}

async function fetchBuffer(url, timeoutMs) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'user-agent': USER_AGENT },
    });
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return {
      ok: response.ok,
      status: response.status,
      final_url: response.url,
      content_type: response.headers.get('content-type'),
      buffer,
      transport_note: null,
    };
  } catch (error) {
    const fallbackHost = insecureTlsFallbackHost(url);
    if (!fallbackHost) throw error;
    return fetchBufferWithNodeClient(url, timeoutMs, {
      rejectUnauthorized: false,
      transportNote: `${fallbackHost}_tls_verification_disabled_after_manifest_validation`,
    });
  }
}

async function fetchBufferWithNodeClient(url, timeoutMs, options = {}, redirectCount = 0) {
  if (redirectCount > 5) throw new Error(`too_many_redirects:${url}`);
  const parsed = new URL(url);
  const client = parsed.protocol === 'http:' ? http : https;
  return new Promise((resolve, reject) => {
    const request = client.get(parsed, {
      headers: { 'user-agent': USER_AGENT },
      timeout: timeoutMs,
      rejectUnauthorized: options.rejectUnauthorized,
    }, (response) => {
      const location = response.headers.location;
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        location
      ) {
        response.resume();
        const nextUrl = new URL(location, parsed).toString();
        fetchBufferWithNodeClient(nextUrl, timeoutMs, options, redirectCount + 1).then(resolve, reject);
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          final_url: url,
          content_type: response.headers['content-type'] ?? null,
          buffer,
          transport_note: options.transportNote ?? null,
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
      status: 'skipped_existing_object',
      uploaded: false,
      sha256: object.source_sha256,
    };
  }

  const fetched = await fetchBuffer(object.source_final_url, timeoutMs);
  const sha = sha256Hex(fetched.buffer);
  const errors = [];
  if (!fetched.ok) errors.push(`http_${fetched.status}`);
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
      if (completed % 100 === 0) {
        console.log(JSON.stringify({ package_id: PACKAGE_ID, processed: completed, total: items.length }));
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function main() {
  const args = parseArgs(process.argv);
  const manifestRows = await readJsonl(MANIFEST_JSONL);
  const allUploadObjects = uniqueUploadObjects(manifestRows);
  const { payload: plan, uploadObjects } = buildPlan(manifestRows, allUploadObjects, args);

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
      unique_upload_objects_in_scope: plan.unique_upload_objects_in_scope,
      stop_findings: plan.stop_findings,
    }, null, 2));
    return;
  }

  if (!plan.ready_for_apply) throw new Error(`Plan is not apply-ready: ${plan.stop_findings.join(', ')}`);
  if (args.fingerprint !== plan.fingerprint) {
    throw new Error(`Fingerprint mismatch. Expected ${plan.fingerprint}.`);
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
  const uploaded = results.filter((row) => row.uploaded);
  const skipped = results.filter((row) => row.status === 'skipped_existing_object');
  const failed = results.filter((row) => !row.uploaded && row.status !== 'skipped_existing_object');
  const allResultRows = await readExistingResultRows();
  const allUploaded = allResultRows.filter((row) => row.uploaded);
  const allSkipped = allResultRows.filter((row) => row.status === 'skipped_existing_object');
  const latestByPath = new Map();
  for (const row of allResultRows) {
    latestByPath.set(`${row.target_storage_bucket}:${row.target_storage_path}`, row);
  }
  const allLatestRows = [...latestByPath.values()];
  const allFailed = allLatestRows.filter((row) => !row.uploaded && row.status !== 'skipped_existing_object');
  const result = {
    package_id: PACKAGE_ID,
    mode: 'guarded_apply_result',
    started_at: startedAt,
    ended_at: new Date().toISOString(),
    fingerprint: plan.fingerprint,
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    result_jsonl: path.relative(ROOT, RESULT_JSONL),
    db_writes_performed: false,
    storage_uploads_performed: uploaded.length > 0,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    upload_objects_in_scope: uploadObjects.length,
    pending_objects_this_run: pendingUploadObjects.length,
    previously_completed_count: completedPaths.size,
    uploaded_count_this_run: uploaded.length,
    skipped_existing_count_this_run: skipped.length,
    failed_count_this_run: failed.length,
    uploaded_count_total: allUploaded.length,
    skipped_existing_count_total: allSkipped.length,
    failed_count_latest: allFailed.length,
    completed_count_total: allUploaded.length + allSkipped.length,
    failures: allFailed.slice(0, 100),
    results_this_run: results,
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

  if (allFailed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
