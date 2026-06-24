import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import process from 'node:process';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh10a_residual_parent_direct_url_upload_manifest_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh10a_residual_parent_direct_url_upload_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh10a_residual_parent_direct_url_upload_dry_run_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-10A-RESIDUAL-PARENT-DIRECT-URL-UPLOAD-DRY-RUN';
const STORAGE_BUCKET = process.env.SELF_HOSTED_IMAGES_STORAGE_BUCKET ?? 'user-card-images';
const USER_AGENT = 'Grookai Residual Parent Direct URL Image Audit/1.0';
const FETCH_TIMEOUT_MS = Number.parseInt(process.env.IMG_HOST_WH10A_FETCH_TIMEOUT_MS ?? '30000', 10);
const FETCH_CONCURRENCY = Math.max(1, Math.min(Number.parseInt(process.env.IMG_HOST_WH10A_FETCH_CONCURRENCY ?? '6', 10), 10));

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function requireDbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
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

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function topEntries(counts, limit = 30) {
  return Object.entries(counts)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function markdownTable(rows) {
  if (!rows.length) return '_None._';
  return [
    '| key | count |',
    '| --- | ---: |',
    ...rows.map((row) => `| ${String(row.key).replace(/\|/g, '\\|')} | ${row.count} |`),
  ].join('\n');
}

function normalizePathSegment(value, fallback = 'unknown') {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || fallback;
}

function extensionFor(contentType, finalUrl) {
  const type = clean(contentType)?.split(';')[0].trim().toLowerCase();
  if (type === 'image/webp') return 'webp';
  if (type === 'image/png') return 'png';
  if (type === 'image/jpeg' || type === 'image/jpg') return 'jpg';
  try {
    const ext = path.extname(new URL(finalUrl).pathname).replace(/^\./, '').toLowerCase();
    if (['webp', 'png', 'jpg', 'jpeg'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  } catch {
    // Ignore URL parsing fallback failures.
  }
  return 'img';
}

function isImageContentType(contentType) {
  return clean(contentType)?.toLowerCase().startsWith('image/') ?? false;
}

function sourceFieldsFor(row) {
  return [
    ['image_url', row.image_url],
    ['image_alt_url', row.image_alt_url],
    ['representative_image_url', row.representative_image_url],
  ]
    .map(([fieldName, value]) => ({ field_name: fieldName, source_image_value: clean(value) }))
    .filter((entry) => entry.source_image_value);
}

function proposedStatus(row, fieldName) {
  const current = clean(row.image_status);
  if (current) return current;
  return fieldName === 'representative_image_url' ? 'representative_shared' : 'exact';
}

function proposedNote(row, fieldName) {
  const current = clean(row.image_note);
  if (current) return current;
  if (fieldName === 'representative_image_url') {
    return `Self-hosted representative parent image planned by ${PACKAGE_ID}; exact image claim is not changed.`;
  }
  return `Self-hosted exact parent image planned by ${PACKAGE_ID}; exact image claim is not changed.`;
}

async function fetchImage(url) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'user-agent': USER_AGENT },
    });
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return {
      ok: response.ok,
      status: response.status,
      final_url: response.url,
      content_type: response.headers.get('content-type'),
      size_bytes: buffer.length,
      sha256: sha256Hex(buffer),
      transport_note: null,
    };
  } catch (error) {
    if (error?.cause?.code !== 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') throw error;
    return fetchImageWithNodeClient(url, {
      rejectUnauthorized: false,
      transportNote: 'tls_verification_disabled_after_direct_url_validation_failure',
    });
  }
}

async function fetchImageWithNodeClient(url, options = {}, redirectCount = 0) {
  if (redirectCount > 5) throw new Error(`too_many_redirects:${url}`);
  const parsed = new URL(url);
  const client = parsed.protocol === 'http:' ? http : https;
  return new Promise((resolve, reject) => {
    const request = client.get(parsed, {
      headers: { 'user-agent': USER_AGENT },
      timeout: FETCH_TIMEOUT_MS,
      rejectUnauthorized: options.rejectUnauthorized,
    }, (response) => {
      const statusCode = response.statusCode ?? 0;
      const location = response.headers.location;
      if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
        response.resume();
        const nextUrl = new URL(location, parsed).toString();
        fetchImageWithNodeClient(nextUrl, options, redirectCount + 1).then(resolve, reject);
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          ok: statusCode >= 200 && statusCode < 300,
          status: statusCode,
          final_url: url,
          content_type: response.headers['content-type'] ?? null,
          size_bytes: buffer.length,
          sha256: sha256Hex(buffer),
          transport_note: options.transportNote ?? null,
        });
      });
    });
    request.on('timeout', () => request.destroy(new Error(`timeout:${url}`)));
    request.on('error', reject);
  });
}

async function mapLimit(values, limit, mapper) {
  const output = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()));
  return output;
}

async function fetchRows(client) {
  const result = await client.query(`
    select
      cp.id,
      cp.gv_id,
      cp.name,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.rarity,
      cp.variant_key,
      cp.image_source,
      cp.image_status,
      cp.image_note,
      cp.image_path,
      cp.image_url,
      cp.image_alt_url,
      cp.representative_image_url
    from public.card_prints cp
    where cp.image_path is null
      and (
        cp.image_url is not null
        or cp.image_alt_url is not null
        or cp.representative_image_url is not null
      )
    order by cp.set_code nulls last, cp.number_plain nulls last, cp.number, cp.name, cp.gv_id
  `);
  return result.rows;
}

function toCandidate(row, field) {
  return {
    source_table: 'card_prints',
    source_row_id: row.id,
    gv_id: row.gv_id,
    name: row.name,
    set_code: row.set_code,
    number: row.number,
    rarity: row.rarity,
    variant_key: row.variant_key,
    image_source: row.image_source,
    image_status: row.image_status,
    image_note: row.image_note,
    field_name: field.field_name,
    source_image_value: field.source_image_value,
    audit_key: `card_prints:${row.id}:${field.field_name}:${sha256Hex(field.source_image_value).slice(0, 24)}`,
  };
}

function toManifestRow(candidate, fetched) {
  const ext = extensionFor(fetched.content_type, fetched.final_url);
  const targetPath = [
    'warehouse-derived',
    'self-hosted-images-v1',
    'card_prints',
    normalizePathSegment(candidate.set_code),
    normalizePathSegment(candidate.gv_id),
    `${fetched.sha256.slice(0, 24)}.${ext}`,
  ].join('/');

  return {
    package_id: PACKAGE_ID,
    audit_key: candidate.audit_key,
    source_table: candidate.source_table,
    source_row_id: candidate.source_row_id,
    gv_id: candidate.gv_id,
    name: candidate.name,
    set_code: candidate.set_code,
    number: candidate.number,
    rarity: candidate.rarity,
    variant_key: candidate.variant_key,
    source_field_name: candidate.field_name,
    source_image_value: candidate.source_image_value,
    source_final_url: fetched.final_url,
    source_content_type: fetched.content_type,
    source_size_bytes: fetched.size_bytes,
    source_sha256: fetched.sha256,
    transport_note: fetched.transport_note,
    target_storage_bucket: STORAGE_BUCKET,
    target_storage_path: targetPath,
    upload_performed: false,
    db_write_performed: false,
    exact_image_claim_change: false,
    proposed_db_plan: {
      target_table: candidate.source_table,
      target_row_id: candidate.source_row_id,
      current_field_name: candidate.field_name,
      current_image_value: candidate.source_image_value,
      proposed_image_source: 'identity',
      proposed_image_path: targetPath,
      proposed_image_status: proposedStatus(candidate, candidate.field_name),
      proposed_image_note: proposedNote(candidate, candidate.field_name),
      allowed_future_columns: ['image_source', 'image_path', 'image_status', 'image_note'],
      blocked_future_columns: ['id', 'gv_id', 'name', 'set_code', 'number', 'image_url', 'image_alt_url', 'representative_image_url'],
      parent_overwrite_allowed: true,
    },
  };
}

async function main() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let rows;
  try {
    rows = await fetchRows(client);
  } finally {
    await client.end();
  }

  const candidates = rows.flatMap((row) => sourceFieldsFor(row).map((field) => toCandidate(row, field)));
  const fetched = await mapLimit(candidates, FETCH_CONCURRENCY, async (candidate) => {
    try {
      const result = await fetchImage(candidate.source_image_value);
      const valid = result.ok && isImageContentType(result.content_type) && result.size_bytes > 1024;
      return { candidate, result, valid, error: null };
    } catch (error) {
      return { candidate, result: null, valid: false, error: String(error?.message ?? error) };
    }
  });

  const validRows = fetched.filter((row) => row.valid);
  const failedRows = fetched.filter((row) => !row.valid);
  const manifestRows = validRows.map((row) => toManifestRow(row.candidate, row.result));
  const targetPathCounts = countBy(manifestRows, (row) => row.target_storage_path);
  const conflictingTargetPaths = Object.entries(targetPathCounts).filter(([, count]) => count > 1);
  const stopFindings = [
    ...(conflictingTargetPaths.length ? ['duplicate_target_storage_paths'] : []),
  ];

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(MANIFEST_JSONL, `${manifestRows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'dry_run_no_write',
    candidate_parent_rows: rows.length,
    candidate_source_url_rows: candidates.length,
    validated_manifest_rows: manifestRows.length,
    failed_source_url_rows: failedRows.length,
    unique_upload_objects: new Set(manifestRows.map((row) => row.target_storage_path)).size,
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    target_storage_bucket: STORAGE_BUCKET,
    by_set_code: countBy(manifestRows, (row) => row.set_code),
    by_source_field: countBy(manifestRows, (row) => row.source_field_name),
    by_proposed_image_status: countBy(manifestRows, (row) => row.proposed_db_plan.proposed_image_status),
    by_content_type: countBy(manifestRows, (row) => row.source_content_type?.split(';')[0]?.trim().toLowerCase()),
    failures_by_set_code: countBy(failedRows, (row) => row.candidate.set_code),
    failures_by_source_field: countBy(failedRows, (row) => row.candidate.field_name),
    stop_findings: stopFindings,
    ready_for_storage_apply_package: stopFindings.length === 0 && manifestRows.length > 0,
    samples: {
      manifest_rows: manifestRows.slice(0, 10),
      failed_source_url_rows: failedRows.slice(0, 20).map((row) => ({
        gv_id: row.candidate.gv_id,
        name: row.candidate.name,
        set_code: row.candidate.set_code,
        number: row.candidate.number,
        field_name: row.candidate.field_name,
        source_image_value: row.candidate.source_image_value,
        status: row.result?.status ?? null,
        content_type: row.result?.content_type ?? null,
        size_bytes: row.result?.size_bytes ?? null,
        error: row.error,
      })),
    },
  };
  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    validated_manifest_rows: summary.validated_manifest_rows,
    unique_upload_objects: summary.unique_upload_objects,
    target_storage_bucket: summary.target_storage_bucket,
    manifest_rows: manifestRows.map((row) => ({
      source_row_id: row.source_row_id,
      source_field_name: row.source_field_name,
      source_image_value: row.source_image_value,
      source_final_url: row.source_final_url,
      source_sha256: row.source_sha256,
      source_size_bytes: row.source_size_bytes,
      target_storage_path: row.target_storage_path,
      proposed_db_plan: row.proposed_db_plan,
    })),
  });

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Candidate parent rows: ${summary.candidate_parent_rows}
- Candidate source URL rows: ${summary.candidate_source_url_rows}
- Validated manifest rows: ${summary.validated_manifest_rows}
- Failed source URL rows: ${summary.failed_source_url_rows}
- Unique upload objects: ${summary.unique_upload_objects}
- Target storage bucket: ${summary.target_storage_bucket}
- Ready for storage apply package: ${summary.ready_for_storage_apply_package}
- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}
- Exact image claim changes performed: ${summary.exact_image_claim_changes_performed}

## By Set

${markdownTable(topEntries(summary.by_set_code))}

## By Source Field

${markdownTable(topEntries(summary.by_source_field))}

## By Proposed Image Status

${markdownTable(topEntries(summary.by_proposed_image_status))}

## Failures By Set

${markdownTable(topEntries(summary.failures_by_set_code))}
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    fingerprint: summary.fingerprint,
    ready_for_storage_apply_package: summary.ready_for_storage_apply_package,
    validated_manifest_rows: summary.validated_manifest_rows,
    failed_source_url_rows: summary.failed_source_url_rows,
    stop_findings: summary.stop_findings,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
