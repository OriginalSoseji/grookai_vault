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
const MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh06b_mcdonalds_dextcg_upload_manifest_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh06b_mcdonalds_dextcg_upload_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh06b_mcdonalds_dextcg_upload_dry_run_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-06B-MCDONALDS-DEXTCG-UPLOAD-DRY-RUN';
const STORAGE_BUCKET = process.env.SELF_HOSTED_IMAGES_STORAGE_BUCKET ?? 'user-card-images';
const USER_AGENT = 'Grookai McDonalds DexTCG Image Audit/1.0';
const SET_CODE_TO_DEXTCG = {
  mcd14: 'mcd14',
  mcd15: 'mcd15',
  mcd17: 'mcd17',
  mcd18: 'mcd18',
  '2023sv': 'mcd23',
  '2024sv': 'mcd24',
};

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
  return Object.keys(value).sort((left, right) => left.localeCompare(right)).reduce((acc, key) => {
    acc[key] = canonicalizeJson(value[key]);
    return acc;
  }, {});
}

function proofHash(value) {
  return sha256Hex(JSON.stringify(canonicalizeJson(value)));
}

function normalizePathSegment(value, fallback = 'unknown') {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || fallback;
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
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5), format: 'jpg' };
    }
    offset += 2 + length;
  }
  return null;
}

function imageDimensions(buffer) {
  return pngDimensions(buffer) ?? jpegDimensions(buffer);
}

function looksLikeHtml(buffer) {
  const prefix = buffer.subarray(0, Math.min(buffer.length, 256)).toString('utf8').trim().toLowerCase();
  return prefix.startsWith('<!doctype html') || prefix.startsWith('<html') || prefix.includes('<body');
}

function fetchBuffer(url, redirects = 4) {
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
        const status = response.statusCode ?? 0;
        const location = response.headers.location;
        if (status >= 300 && status < 400 && location && redirects > 0) {
          fetchBuffer(new URL(location, url).toString(), redirects - 1).then(resolve, reject);
          return;
        }
        resolve({
          ok: status >= 200 && status < 300,
          status,
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
    request.on('timeout', () => request.destroy(new Error('request_timeout')));
    request.on('error', reject);
  });
}

async function queryRows() {
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
        cp.image_path,
        cp.image_note
      from public.card_prints cp
      left join public.sets s on s.id = cp.set_id
      where cp.set_code = any($1::text[])
        and nullif(cp.image_path, '') is null
      order by cp.set_code,
        nullif(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\\D', '', 'g'), '')::int nulls last,
        cp.number,
        cp.name
    `, [Object.keys(SET_CODE_TO_DEXTCG)]);
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

function markdownTable(rows) {
  if (!rows.length) return '_None._';
  return [
    '| key | count |',
    '| --- | ---: |',
    ...rows.map((row) => `| ${String(row.key).replace(/\|/g, '\\|')} | ${row.count} |`),
  ].join('\n');
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
  return [...buckets.entries()].filter(([, bucket]) => bucket.length > 1).map(([key, bucket]) => ({ key, count: bucket.length }));
}

function numericNumber(row) {
  const number = clean(row.number_plain) ?? clean(row.number);
  return number && /^\d+$/.test(number) ? String(Number(number)) : null;
}

function candidateForRow(row) {
  const setCode = clean(row.set_code);
  const dextcgSetCode = setCode ? SET_CODE_TO_DEXTCG[setCode] : null;
  const number = numericNumber(row);
  if (!dextcgSetCode || !number) return null;
  const currentStatus = clean(row.image_status);
  const proposedStatus = currentStatus === 'exact' ? 'exact' : 'representative_shared';
  return {
    card_print_id: row.id,
    gv_id: clean(row.gv_id),
    name: clean(row.name),
    set_code: setCode,
    dextcg_set_code: dextcgSetCode,
    set_name: clean(row.set_name),
    number: clean(row.number),
    number_plain: clean(row.number_plain),
    current_image_source: clean(row.image_source),
    current_image_path: clean(row.image_path),
    current_image_status: currentStatus,
    current_image_note: clean(row.image_note),
    source_lane: 'external_dextcg',
    source_url: `https://static.dextcg.com/cards/${encodeURIComponent(dextcgSetCode)}/${encodeURIComponent(number)}.png`,
    proposed_image_status: proposedStatus,
    proposed_display_image_kind: proposedStatus === 'exact' ? 'exact' : 'representative',
    exact_image_claim_change: currentStatus !== 'exact' && proposedStatus === 'exact',
    proposed_image_note: proposedStatus === 'exact'
      ? `Self-hosted exact McDonald's image planned by ${PACKAGE_ID}; source URL is DexTCG and prior row already carried exact status.`
      : `Self-hosted representative McDonald's image planned by ${PACKAGE_ID}; source URL is DexTCG and exact image claim is not changed.`,
  };
}

async function validateCandidate(candidate) {
  try {
    const response = await fetchBuffer(candidate.source_url);
    const buffer = response.buffer;
    const dimensions = imageDimensions(buffer);
    const warnings = [];
    if (!response.ok) warnings.push(`http_${response.status}`);
    if (looksLikeHtml(buffer)) warnings.push('html_response_body');
    if (!response.contentType?.toLowerCase().startsWith('image/')) warnings.push('non_image_content_type');
    if (!dimensions) warnings.push('dimensions_unreadable');
    if (buffer.length < 1024) warnings.push('very_small_image_payload');
    const sha = sha256Hex(buffer);
    const targetStoragePath = [
      'warehouse-derived',
      'self-hosted-images-v1',
      'card_prints',
      normalizePathSegment(candidate.set_code),
      normalizePathSegment(candidate.gv_id ?? candidate.card_print_id),
      `${sha.slice(0, 24)}.png`,
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
    exact_image_claim_change: row.exact_image_claim_change,
  };
}

function manifestRow(row) {
  return {
    package_id: PACKAGE_ID,
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    name: row.name,
    set_code: row.set_code,
    dextcg_set_code: row.dextcg_set_code,
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
    exact_image_claim_change: row.exact_image_claim_change,
    proposed_db_plan: proposedDbPlan(row),
  };
}

async function main() {
  const rows = await queryRows();
  const candidates = rows.map(candidateForRow).filter(Boolean);
  const checkedRows = await mapLimit(candidates, 8, validateCandidate);
  const readyRows = checkedRows.filter((row) => row.fetch_ok && row.target_storage_path);
  const manifestRows = readyRows.map(manifestRow);
  const failedRows = checkedRows.filter((row) => !row.fetch_ok);
  const duplicateTargetPaths = duplicateGroups(manifestRows, (row) => row.target_storage_path);
  const duplicateTargets = duplicateGroups(manifestRows, (row) => row.card_print_id);
  const conflictingTargetPaths = duplicateTargetPaths.filter((group) => {
    const hashes = new Set(manifestRows.filter((row) => row.target_storage_path === group.key).map((row) => row.source_sha256));
    return hashes.size > 1;
  });
  const stopFindings = [];
  if (failedRows.length) stopFindings.push('source_fetch_failures');
  if (conflictingTargetPaths.length) stopFindings.push('conflicting_duplicate_target_storage_paths');
  if (duplicateTargets.length) stopFindings.push('duplicate_card_print_targets');
  if (manifestRows.some((row) => row.exact_image_claim_change)) stopFindings.push('exact_image_claim_change_planned');

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
    runtime_public_url_field_writes_planned: false,
    exact_image_claim_changes_performed: false,
    exact_image_claim_changes_planned: manifestRows.some((row) => row.exact_image_claim_change),
    candidate_rows: candidates.length,
    fetch_checked_rows: checkedRows.length,
    fetch_ready_rows: readyRows.length,
    upload_manifest_rows: manifestRows.length,
    failed_fetch_rows: failedRows.length,
    duplicate_target_path_groups: duplicateTargetPaths.length,
    conflicting_target_path_groups: conflictingTargetPaths.length,
    duplicate_card_print_target_groups: duplicateTargets.length,
    stop_findings: stopFindings,
    ready_for_storage_upload_apply: stopFindings.length === 0 && manifestRows.length > 0,
    by_set_code: countBy(manifestRows, (row) => row.set_code),
    by_dextcg_set_code: countBy(manifestRows, (row) => row.dextcg_set_code),
    by_image_status: countBy(manifestRows, (row) => row.proposed_image_status),
    by_display_image_kind: countBy(manifestRows, (row) => row.proposed_display_image_kind),
    failures: failedRows.slice(0, 40).map((row) => ({
      gv_id: row.gv_id,
      name: row.name,
      set_code: row.set_code,
      number: row.number,
      failure_reason: row.failure_reason,
      source_url: row.source_url,
    })),
    sample_manifest_rows: manifestRows.slice(0, 20),
  };
  const summary = { ...summaryBase, proof_hash: proofHash(summaryBase) };

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, [
    `# ${PACKAGE_ID}`,
    '',
    `- Generated: ${summary.generated_at}`,
    `- Mode: ${summary.mode}`,
    `- Proof hash: \`${summary.proof_hash}\``,
    `- Manifest: \`${summary.manifest_jsonl}\``,
    `- Candidate rows: ${summary.candidate_rows}`,
    `- Upload manifest rows: ${summary.upload_manifest_rows}`,
    `- Failed fetch rows: ${summary.failed_fetch_rows}`,
    `- Ready for storage upload apply: ${summary.ready_for_storage_upload_apply}`,
    `- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}`,
    `- Exact image claim changes planned: ${summary.exact_image_claim_changes_planned}`,
    '',
    '## By Set',
    '',
    markdownTable(topEntries(summary.by_set_code)),
    '',
    '## By DexTCG Set',
    '',
    markdownTable(topEntries(summary.by_dextcg_set_code)),
    '',
    '## By Image Status',
    '',
    markdownTable(topEntries(summary.by_image_status)),
    '',
    '## Policy',
    '',
    '- Write scope: none.',
    '- Storage scope: none.',
    '- DB scope: none.',
    '- Future apply scope should upload manifest objects only.',
    '- Future DB apply scope should update card_prints image_source/image_path/image_status/image_note only.',
    '- No exact-image claim changes are planned.',
    '',
  ].join('\n'), 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    proof_hash: summary.proof_hash,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    upload_manifest_rows: summary.upload_manifest_rows,
    failed_fetch_rows: summary.failed_fetch_rows,
    ready_for_storage_upload_apply: summary.ready_for_storage_upload_apply,
    stop_findings: summary.stop_findings,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] failed`, error);
  process.exitCode = 1;
});
