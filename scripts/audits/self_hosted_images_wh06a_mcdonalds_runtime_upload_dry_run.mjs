import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import https from 'node:https';
import process from 'node:process';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh06a_mcdonalds_runtime_upload_manifest_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh06a_mcdonalds_runtime_upload_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh06a_mcdonalds_runtime_upload_dry_run_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-06A-MCDONALDS-RUNTIME-REPLACEMENT-UPLOAD-DRY-RUN';
const STORAGE_BUCKET = process.env.SELF_HOSTED_IMAGES_STORAGE_BUCKET ?? 'user-card-images';
const USER_AGENT = 'Grookai McDonalds Self Hosted Image Audit/1.0';

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

function normalizePathSegment(value, fallback = 'unknown') {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || fallback;
}

function extensionFor(contentType, url) {
  const type = String(contentType ?? '').toLowerCase();
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('gif')) return 'gif';
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
  try {
    const ext = path.posix.extname(new URL(url).pathname).replace(/^\./, '').toLowerCase();
    if (/^(png|webp|gif|jpe?g)$/.test(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  } catch {
    // Fall through.
  }
  return 'bin';
}

function pngDimensions(buffer) {
  if (buffer.length < 24) return null;
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), format: 'png' };
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof && offset + 8 < buffer.length) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5),
        format: 'jpg',
      };
    }
    offset += 2 + length;
  }
  return null;
}

function webpDimensions(buffer) {
  if (buffer.length < 30) return null;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X' && buffer.length >= 30) {
    return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3), format: 'webp' };
  }
  if (chunk === 'VP8 ' && buffer.length >= 30) {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff, format: 'webp' };
  }
  if (chunk === 'VP8L' && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, format: 'webp' };
  }
  return { width: null, height: null, format: 'webp' };
}

function imageDimensions(buffer) {
  return pngDimensions(buffer) ?? jpegDimensions(buffer) ?? webpDimensions(buffer) ?? null;
}

function looksLikeHtml(buffer) {
  const prefix = buffer.subarray(0, Math.min(buffer.length, 256)).toString('utf8').trim().toLowerCase();
  return prefix.startsWith('<!doctype html') || prefix.startsWith('<html') || prefix.includes('<body');
}

function fetchImageBuffer(url, redirects = 4) {
  const agent = new https.Agent({ rejectUnauthorized: false });
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      agent,
      headers: { 'user-agent': USER_AGENT },
      timeout: 30000,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const statusCode = response.statusCode ?? 0;
        const location = response.headers.location;
        if (statusCode >= 300 && statusCode < 400 && location && redirects > 0) {
          const redirectedUrl = new URL(location, url).toString();
          fetchImageBuffer(redirectedUrl, redirects - 1).then(resolve, reject);
          return;
        }
        resolve({
          ok: statusCode >= 200 && statusCode < 300,
          status: statusCode,
          finalUrl: url,
          contentType: Array.isArray(response.headers['content-type'])
            ? response.headers['content-type'][0]
            : response.headers['content-type'] ?? null,
          contentLength: Array.isArray(response.headers['content-length'])
            ? response.headers['content-length'][0]
            : response.headers['content-length'] ?? null,
          buffer: Buffer.concat(chunks),
        });
      });
    });
    request.on('timeout', () => {
      request.destroy(new Error('request_timeout'));
    });
    request.on('error', reject);
  });
}

async function queryMcDonaldsRows() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(`
      select
        cp.id,
        cp.gv_id,
        cp.name,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.number_plain,
        cp.image_source,
        cp.image_status,
        cp.image_url,
        cp.image_alt_url,
        cp.image_path,
        cp.representative_image_url,
        cp.image_note
      from public.card_prints cp
      left join public.sets s on s.id = cp.set_id
      where (
        lower(coalesce(s.name, '')) like '%mcdonald%'
        or cp.set_code in ('mcd11','mcd12','mcd14','mcd15','mcd16','mcd17','mcd18','mcd19','mcd21','mcd22','2021swsh','2022swsh','2023sv','2024sv')
        or cp.set_code ~ '^mcd[0-9]+'
      )
      order by cp.set_code,
        nullif(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\\D', '', 'g'), '')::int nulls last,
        cp.number,
        cp.name
    `);
    return result.rows;
  } finally {
    await client.end();
  }
}

async function mapLimit(rows, limit, worker) {
  const output = new Array(rows.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, rows.length) }, async () => {
    while (next < rows.length) {
      const index = next;
      next += 1;
      output[index] = await worker(rows[index], index);
    }
  });
  await Promise.all(workers);
  return output;
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

function duplicateGroups(rows, keyFn) {
  const buckets = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    const bucket = buckets.get(key) ?? [];
    bucket.push(row);
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .filter(([, bucket]) => bucket.length > 1)
    .map(([key, bucket]) => ({ key, count: bucket.length }));
}

function markdownTable(rows, columns = [
  { label: 'key', value: (row) => row.key },
  { label: 'count', value: (row) => row.count },
]) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function candidateForRow(row) {
  const sourceUrl = clean(row.image_url) ?? clean(row.image_alt_url);
  if (!sourceUrl) return null;
  return {
    card_print_id: row.id,
    gv_id: clean(row.gv_id),
    name: clean(row.name),
    set_code: clean(row.set_code),
    set_name: clean(row.set_name),
    number: clean(row.number),
    number_plain: clean(row.number_plain),
    current_image_source: clean(row.image_source),
    current_image_path: clean(row.image_path),
    current_image_status: clean(row.image_status),
    current_image_note: clean(row.image_note),
    source_lane: clean(row.image_source) ?? 'pokemonapi',
    source_url: sourceUrl,
    proposed_image_status: clean(row.image_status) ?? 'exact',
    proposed_display_image_kind: 'exact',
    proposed_image_note:
      `Self-hosted exact McDonald's image planned by ${PACKAGE_ID}; source URL already present on card_prints.`,
  };
}

async function fetchImage(candidate) {
  try {
    const response = await fetchImageBuffer(candidate.source_url);
    const buffer = response.buffer;
    const dimensions = imageDimensions(buffer);
    const warnings = [];
    if (!response.ok) warnings.push(`http_${response.status}`);
    if (looksLikeHtml(buffer)) warnings.push('html_response_body');
    if (!response.contentType?.toLowerCase().startsWith('image/')) warnings.push('non_image_content_type');
    if (!dimensions) warnings.push('dimensions_unreadable');
    if (buffer.length < 1024) warnings.push('very_small_image_payload');

    const sha = sha256Hex(buffer);
    const extension = extensionFor(response.contentType, response.finalUrl);
    const targetStoragePath = [
      'warehouse-derived',
      'self-hosted-images-v1',
      'card_prints',
      normalizePathSegment(candidate.set_code),
      normalizePathSegment(candidate.gv_id ?? candidate.card_print_id),
      `${sha.slice(0, 24)}.${extension}`,
    ].join('/');

    return {
      ...candidate,
      checked_at: new Date().toISOString(),
      fetch_ok: response.ok && warnings.length === 0,
      failure_reason: response.ok && warnings.length === 0 ? null : warnings.join(',') || `http_${response.status}`,
      http_status: response.status,
      source_final_url: response.finalUrl,
      source_content_type: response.contentType,
      source_content_length_header: response.contentLength,
      source_size_bytes: buffer.length,
      source_sha256: sha,
      source_dimensions: dimensions,
      target_storage_bucket: STORAGE_BUCKET,
      target_storage_path: response.ok && warnings.length === 0 ? targetStoragePath : null,
      validation_warnings: warnings,
    };
  } catch (error) {
    return {
      ...candidate,
      checked_at: new Date().toISOString(),
      fetch_ok: false,
      failure_reason: error instanceof Error ? error.message : String(error),
      http_status: null,
      source_final_url: null,
      source_content_type: null,
      source_content_length_header: null,
      source_size_bytes: null,
      source_sha256: null,
      source_dimensions: null,
      target_storage_bucket: STORAGE_BUCKET,
      target_storage_path: null,
      validation_warnings: ['fetch_failed'],
    };
  }
}

function proposedDbPlan(row) {
  return {
    target_table: 'card_prints',
    target_row_id: row.card_print_id,
    current_image_source: row.current_image_source,
    current_image_path: row.current_image_path,
    current_image_status: row.current_image_status,
    current_image_note: row.current_image_note,
    proposed_image_source: 'identity',
    proposed_image_path: row.target_storage_path,
    proposed_image_status: row.proposed_image_status,
    proposed_image_note: row.proposed_image_note,
    allowed_future_columns: ['image_source', 'image_path', 'image_status', 'image_note'],
    blocked_future_columns: ['id', 'gv_id', 'name', 'set_code', 'number', 'image_url', 'image_alt_url', 'representative_image_url'],
    exact_image_claim_change: false,
  };
}

function manifestRow(row) {
  return {
    package_id: PACKAGE_ID,
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    name: row.name,
    set_code: row.set_code,
    set_name: row.set_name,
    number: row.number,
    source_lane: row.source_lane,
    source_url: row.source_url,
    source_final_url: row.source_final_url,
    source_content_type: row.source_content_type,
    source_size_bytes: row.source_size_bytes,
    source_sha256: row.source_sha256,
    source_dimensions: row.source_dimensions,
    target_storage_bucket: row.target_storage_bucket,
    target_storage_path: row.target_storage_path,
    proposed_image_source: 'identity',
    proposed_image_status: row.proposed_image_status,
    proposed_display_image_kind: row.proposed_display_image_kind,
    proposed_image_note: row.proposed_image_note,
    storage_upload_performed: false,
    db_write_performed: false,
    exact_image_claim_change: false,
    proposed_db_plan: proposedDbPlan(row),
  };
}

function unresolvedReason(row) {
  if (clean(row.image_path)) return null;
  if (!clean(row.image_url) && !clean(row.image_alt_url)) return 'missing_source_url';
  return 'source_url_not_validated';
}

async function main() {
  const rows = await queryMcDonaldsRows();
  const missingRows = rows.filter((row) => !clean(row.image_path));
  const candidates = missingRows.map(candidateForRow).filter(Boolean);
  const checkedRows = await mapLimit(candidates, 8, fetchImage);
  const readyRows = checkedRows.filter((row) => row.fetch_ok && row.target_storage_path);
  const manifestRows = readyRows.map(manifestRow);
  const duplicateTargetPaths = duplicateGroups(manifestRows, (row) => row.target_storage_path);
  const duplicateTargetRows = duplicateGroups(manifestRows, (row) => row.card_print_id);
  const conflictingTargetPaths = duplicateTargetPaths.filter((group) => {
    const hashes = new Set(manifestRows
      .filter((row) => row.target_storage_path === group.key)
      .map((row) => row.source_sha256));
    return hashes.size > 1;
  });

  const unresolvedRows = missingRows
    .filter((row) => !manifestRows.some((manifest) => manifest.card_print_id === row.id))
    .map((row) => ({
      card_print_id: row.id,
      gv_id: clean(row.gv_id),
      name: clean(row.name),
      set_code: clean(row.set_code),
      set_name: clean(row.set_name),
      number: clean(row.number),
      unresolved_reason: unresolvedReason(row),
      has_image_url: Boolean(clean(row.image_url)),
      has_image_alt_url: Boolean(clean(row.image_alt_url)),
    }));

  const stopFindings = [];
  if (checkedRows.some((row) => !row.fetch_ok)) stopFindings.push('source_fetch_failures');
  if (conflictingTargetPaths.length > 0) stopFindings.push('conflicting_duplicate_target_storage_paths');
  if (duplicateTargetRows.length > 0) stopFindings.push('duplicate_card_print_targets');

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(MANIFEST_JSONL, manifestRows.map((row) => JSON.stringify(row)).join('\n') + (manifestRows.length ? '\n' : ''), 'utf8');

  const summaryBase = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_upload_manifest_dry_run',
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    target_storage_bucket: STORAGE_BUCKET,
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    deletes_or_merges_performed: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    exact_image_claim_changes_performed: false,
    runtime_public_url_field_writes_planned: false,
    mcdonalds_rows_total: rows.length,
    mcdonalds_rows_missing_image_path: missingRows.length,
    source_backed_candidate_rows: candidates.length,
    fetch_checked_rows: checkedRows.length,
    fetch_ready_rows: readyRows.length,
    upload_manifest_rows: manifestRows.length,
    unresolved_rows: unresolvedRows.length,
    failed_fetch_rows: checkedRows.length - readyRows.length,
    duplicate_target_path_groups: duplicateTargetPaths.length,
    conflicting_target_path_groups: conflictingTargetPaths.length,
    duplicate_card_print_target_groups: duplicateTargetRows.length,
    stop_findings: stopFindings,
    ready_for_storage_upload_apply: stopFindings.length === 0 && manifestRows.length > 0,
    by_source_lane: countBy(manifestRows, (row) => row.source_lane),
    by_set_code: countBy(manifestRows, (row) => row.set_code),
    unresolved_by_set_code: countBy(unresolvedRows, (row) => row.set_code),
    unresolved_by_reason: countBy(unresolvedRows, (row) => row.unresolved_reason),
    failures: checkedRows
      .filter((row) => !row.fetch_ok)
      .slice(0, 40)
      .map((row) => ({
        gv_id: row.gv_id,
        name: row.name,
        set_code: row.set_code,
        number: row.number,
        source_lane: row.source_lane,
        failure_reason: row.failure_reason,
        source_url: row.source_url,
      })),
    unresolved_samples: unresolvedRows.slice(0, 40),
    sample_manifest_rows: manifestRows.slice(0, 20),
  };
  const summary = {
    ...summaryBase,
    proof_hash: proofHash(summaryBase),
  };

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, [
    `# ${PACKAGE_ID}`,
    '',
    `- Generated: ${summary.generated_at}`,
    `- Mode: ${summary.mode}`,
    `- Proof hash: \`${summary.proof_hash}\``,
    `- Manifest: \`${summary.manifest_jsonl}\``,
    `- McDonald's rows total: ${summary.mcdonalds_rows_total}`,
    `- Missing image_path rows: ${summary.mcdonalds_rows_missing_image_path}`,
    `- Source-backed candidate rows: ${summary.source_backed_candidate_rows}`,
    `- Upload manifest rows: ${summary.upload_manifest_rows}`,
    `- Unresolved rows: ${summary.unresolved_rows}`,
    `- Failed fetch rows: ${summary.failed_fetch_rows}`,
    `- Ready for storage upload apply: ${summary.ready_for_storage_upload_apply}`,
    `- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}`,
    '',
    '## By Source Lane',
    '',
    markdownTable(topEntries(summary.by_source_lane)),
    '',
    '## By Set',
    '',
    markdownTable(topEntries(summary.by_set_code)),
    '',
    '## Unresolved By Set',
    '',
    markdownTable(topEntries(summary.unresolved_by_set_code)),
    '',
    '## Unresolved By Reason',
    '',
    markdownTable(topEntries(summary.unresolved_by_reason)),
    '',
    '## Policy',
    '',
    '- Write scope: none.',
    '- Storage scope: none.',
    '- DB scope: none.',
    '- Exact image claims: no exact-image claim changes.',
    '- Future apply scope should upload manifest objects, then update card_prints image_source/image_path/image_status/image_note only.',
    '- 2023/2024 McDonald rows are intentionally left unresolved until a verified image source is available.',
    '',
  ].join('\n'), 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    proof_hash: summary.proof_hash,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    upload_manifest_rows: summary.upload_manifest_rows,
    unresolved_rows: summary.unresolved_rows,
    failed_fetch_rows: summary.failed_fetch_rows,
    ready_for_storage_upload_apply: summary.ready_for_storage_upload_apply,
    stop_findings: summary.stop_findings,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] failed`, error);
  process.exitCode = 1;
});
