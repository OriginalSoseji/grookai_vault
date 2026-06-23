import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import pg from 'pg';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const RESULT_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh01a_results_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh01a_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh01a_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-01A-WAREHOUSE-IMAGE-STORAGE-AUDIT-DRY-RUN';
const DEFAULT_STORAGE_BUCKET = process.env.SELF_HOSTED_IMAGES_STORAGE_BUCKET ?? 'user-card-images';
const USER_AGENT = 'Grookai Self Hosted Image Audit/1.0';

function parseArgs(argv) {
  const args = {
    resume: true,
    limit: Number.parseInt(process.env.SELF_HOSTED_IMAGES_AUDIT_LIMIT ?? '0', 10),
    concurrency: Number.parseInt(process.env.SELF_HOSTED_IMAGES_AUDIT_CONCURRENCY ?? '5', 10),
    timeoutMs: Number.parseInt(process.env.SELF_HOSTED_IMAGES_AUDIT_TIMEOUT_MS ?? '30000', 10),
    maxHours: Number.parseFloat(process.env.SELF_HOSTED_IMAGES_AUDIT_MAX_HOURS ?? '8'),
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--no-resume') args.resume = false;
    else if (arg === '--limit') args.limit = Number.parseInt(argv[++index] ?? '0', 10);
    else if (arg === '--concurrency') args.concurrency = Number.parseInt(argv[++index] ?? '5', 10);
    else if (arg === '--timeout-ms') args.timeoutMs = Number.parseInt(argv[++index] ?? '30000', 10);
    else if (arg === '--max-hours') args.maxHours = Number.parseFloat(argv[++index] ?? '8');
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.concurrency = Math.max(1, Math.min(args.concurrency || 5, 20));
  args.timeoutMs = Math.max(5000, args.timeoutMs || 30000);
  args.maxHours = Math.max(0.05, args.maxHours || 8);
  return args;
}

function requireDbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function createStorageClient() {
  const url = clean(process.env.SUPABASE_URL);
  const key = clean(process.env.SUPABASE_SECRET_KEY);
  if (!url) throw new Error('Missing SUPABASE_URL.');
  if (!key) throw new Error('Missing SUPABASE_SECRET_KEY.');
  return createClient(url, key, { auth: { persistSession: false } });
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

function normalizePathSegment(value, fallback = 'unknown') {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || fallback;
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value ?? '').trim());
}

function storagePublicUrl(storagePath) {
  const base = clean(process.env.SUPABASE_URL);
  if (!base) return null;
  const encodedPath = String(storagePath)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${DEFAULT_STORAGE_BUCKET}/${encodedPath}`;
}

function resolveImageUrl(value) {
  const normalized = clean(value);
  if (!normalized) return null;
  if (isHttpUrl(normalized)) return normalized;
  return storagePublicUrl(normalized);
}

function hostnameFor(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function sourceLane(value) {
  const normalized = clean(value);
  if (!normalized) return 'missing';
  if (!isHttpUrl(normalized)) return 'supabase_storage_path';
  const host = hostnameFor(normalized);
  if (host?.includes('supabase.co')) return 'supabase_public_url';
  if (host?.includes('pokemontcg.io')) return 'external_pokemontcg';
  if (host?.includes('tcgplayer')) return 'external_tcgplayer';
  if (host?.includes('tcgcollector.com')) return 'external_tcgcollector';
  if (host?.includes('malie.io')) return 'external_malie';
  if (host?.includes('assets.tcgdex.net')) return 'external_tcgdex';
  return 'external_other';
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
    const isSof = (
      marker >= 0xc0 && marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker)
    );
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
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
      format: 'webp',
    };
  }
  if (chunk === 'VP8 ' && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
      format: 'webp',
    };
  }
  if (chunk === 'VP8L' && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
      format: 'webp',
    };
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

async function loadCompletedKeys() {
  const completed = new Set();
  try {
    const raw = await fs.readFile(RESULT_JSONL, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed?.audit_key) completed.add(parsed.audit_key);
      } catch {
        // Ignore partial/truncated lines from interrupted runs.
      }
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return completed;
}

async function queryImageRows(limit) {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL');

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(`
      with parent_images as (
        select
          'card_prints'::text as source_table,
          cp.id::text as source_row_id,
          cp.id::text as card_print_id,
          null::text as card_printing_id,
          cp.gv_id,
          null::text as printing_gv_id,
          cp.name,
          cp.set_code,
          cp.number,
          cp.image_status,
          cp.image_source,
          values.field_name,
          values.image_value
        from public.card_prints cp
        cross join lateral (
          values
            ('image_path'::text, cp.image_path),
            ('image_url'::text, cp.image_url),
            ('image_alt_url'::text, cp.image_alt_url),
            ('representative_image_url'::text, cp.representative_image_url)
        ) as values(field_name, image_value)
        where nullif(trim(coalesce(values.image_value, '')), '') is not null
      ),
      child_images as (
        select
          'card_printings'::text as source_table,
          cpi.id::text as source_row_id,
          cpi.card_print_id::text as card_print_id,
          cpi.id::text as card_printing_id,
          cp.gv_id,
          cpi.printing_gv_id,
          cp.name,
          cp.set_code,
          cp.number,
          cpi.image_status,
          cpi.image_source,
          values.field_name,
          values.image_value
        from public.card_printings cpi
        join public.card_prints cp on cp.id = cpi.card_print_id
        cross join lateral (
          values
            ('image_path'::text, cpi.image_path),
            ('image_url'::text, cpi.image_url),
            ('image_alt_url'::text, cpi.image_alt_url)
        ) as values(field_name, image_value)
        where nullif(trim(coalesce(values.image_value, '')), '') is not null
      )
      select *
      from (
        select * from parent_images
        union all
        select * from child_images
      ) images
      order by source_table, set_code nulls last, number nulls last, gv_id nulls last, printing_gv_id nulls last, field_name
      ${limit > 0 ? 'limit $1' : ''}
    `, limit > 0 ? [limit] : []);

    return result.rows.map((row) => {
      const rawValue = clean(row.image_value);
      const resolvedUrl = resolveImageUrl(rawValue);
      const auditKey = [
        row.source_table,
        row.source_row_id,
        row.field_name,
        sha256Hex(rawValue ?? '').slice(0, 24),
      ].join(':');
      return {
        audit_key: auditKey,
        source_table: row.source_table,
        source_row_id: row.source_row_id,
        card_print_id: row.card_print_id,
        card_printing_id: row.card_printing_id,
        gv_id: clean(row.gv_id),
        printing_gv_id: clean(row.printing_gv_id),
        name: clean(row.name),
        set_code: clean(row.set_code),
        number: clean(row.number),
        image_status: clean(row.image_status),
        image_source: clean(row.image_source),
        field_name: row.field_name,
        raw_image_value: rawValue,
        resolved_url: resolvedUrl,
        source_lane: sourceLane(rawValue),
      };
    });
  } finally {
    await client.end();
  }
}

async function fetchExternalImage(row, timeoutMs) {
  if (!row.resolved_url || !isHttpUrl(row.raw_image_value)) {
    return {
      ...row,
      checked_at: new Date().toISOString(),
      fetch_ok: false,
      failure_reason: 'external_url_missing',
      http_status: null,
      content_type: null,
      content_length_header: null,
      size_bytes: null,
      sha256: null,
      dimensions: null,
      proposed_storage_bucket: DEFAULT_STORAGE_BUCKET,
      proposed_storage_path: null,
      validation_warnings: ['external_url_missing'],
    };
  }

  try {
    const response = await fetch(row.resolved_url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'user-agent': USER_AGENT },
    });
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sha = sha256Hex(buffer);
    const dimensions = imageDimensions(buffer);
    const warnings = [];
    if (!response.ok) warnings.push(`http_${response.status}`);
    if (looksLikeHtml(buffer)) warnings.push('html_response_body');
    if (!contentType?.toLowerCase().startsWith('image/')) warnings.push('non_image_content_type');
    if (!dimensions) warnings.push('dimensions_unreadable');
    if (buffer.length < 1024) warnings.push('very_small_image_payload');

    const extension = extensionFor(contentType, row.resolved_url);
    const identity = normalizePathSegment(row.printing_gv_id ?? row.gv_id ?? row.source_row_id);
    const setCode = normalizePathSegment(row.set_code);
    const proposedStoragePath = [
      'warehouse-derived',
      'self-hosted-images-v1',
      row.source_table,
      setCode,
      identity,
      `${sha.slice(0, 24)}.${extension}`,
    ].join('/');

    return {
      ...row,
      checked_at: new Date().toISOString(),
      fetch_ok: response.ok && warnings.length === 0,
      failure_reason: response.ok && warnings.length === 0 ? null : warnings.join(',') || `http_${response.status}`,
      http_status: response.status,
      final_url: response.url,
      content_type: contentType,
      content_length_header: contentLength,
      size_bytes: buffer.length,
      sha256: sha,
      dimensions,
      proposed_storage_bucket: DEFAULT_STORAGE_BUCKET,
      proposed_storage_path: proposedStoragePath,
      validation_warnings: warnings,
    };
  } catch (error) {
    return {
      ...row,
      checked_at: new Date().toISOString(),
      fetch_ok: false,
      failure_reason: error instanceof Error ? error.message : String(error),
      http_status: null,
      content_type: null,
      content_length_header: null,
      size_bytes: null,
      sha256: null,
      dimensions: null,
      proposed_storage_bucket: DEFAULT_STORAGE_BUCKET,
      proposed_storage_path: null,
      validation_warnings: ['fetch_failed'],
    };
  }
}

async function fetchStorageImage(row, supabase) {
  const storagePath = clean(row.raw_image_value);
  if (!storagePath) {
    return {
      ...row,
      checked_at: new Date().toISOString(),
      fetch_ok: false,
      failure_reason: 'storage_path_missing',
      http_status: null,
      content_type: null,
      content_length_header: null,
      size_bytes: null,
      sha256: null,
      dimensions: null,
      proposed_storage_bucket: DEFAULT_STORAGE_BUCKET,
      proposed_storage_path: null,
      validation_warnings: ['storage_path_missing'],
    };
  }

  try {
    const { data, error } = await supabase.storage.from(DEFAULT_STORAGE_BUCKET).download(storagePath);
    if (error || !data) {
      return {
        ...row,
        checked_at: new Date().toISOString(),
        fetch_ok: false,
        failure_reason: error?.message ?? 'storage_download_failed',
        http_status: null,
        content_type: null,
        content_length_header: null,
        size_bytes: null,
        sha256: null,
        dimensions: null,
        proposed_storage_bucket: DEFAULT_STORAGE_BUCKET,
        proposed_storage_path: null,
        validation_warnings: ['storage_download_failed'],
      };
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = data.type || null;
    const sha = sha256Hex(buffer);
    const dimensions = imageDimensions(buffer);
    const warnings = [];
    if (looksLikeHtml(buffer)) warnings.push('html_response_body');
    if (contentType && !contentType.toLowerCase().startsWith('image/')) warnings.push('non_image_content_type');
    if (!dimensions) warnings.push('dimensions_unreadable');
    if (buffer.length < 1024) warnings.push('very_small_image_payload');

    return {
      ...row,
      checked_at: new Date().toISOString(),
      fetch_ok: warnings.length === 0,
      failure_reason: warnings.length === 0 ? null : warnings.join(','),
      http_status: null,
      final_url: null,
      content_type: contentType,
      content_length_header: null,
      size_bytes: buffer.length,
      sha256: sha,
      dimensions,
      proposed_storage_bucket: DEFAULT_STORAGE_BUCKET,
      proposed_storage_path: storagePath,
      validation_warnings: warnings,
    };
  } catch (error) {
    return {
      ...row,
      checked_at: new Date().toISOString(),
      fetch_ok: false,
      failure_reason: error instanceof Error ? error.message : String(error),
      http_status: null,
      content_type: null,
      content_length_header: null,
      size_bytes: null,
      sha256: null,
      dimensions: null,
      proposed_storage_bucket: DEFAULT_STORAGE_BUCKET,
      proposed_storage_path: null,
      validation_warnings: ['storage_download_exception'],
    };
  }
}

async function fetchImage(row, timeoutMs, supabase) {
  if (row.source_lane === 'supabase_storage_path') {
    return fetchStorageImage(row, supabase);
  }
  return fetchExternalImage(row, timeoutMs);
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    const value = row[key] ?? 'null';
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function markdownTable(rows) {
  if (rows.length === 0) return '| none | 0 |\n| --- | ---: |';
  return ['| key | count |', '| --- | ---: |', ...rows.map(([key, value]) => `| ${key} | ${value} |`)].join('\n');
}

async function writeSummary({ args, queriedRows, skippedRows, runRows, endReason, startedAt, endedAt }) {
  let allRows = [];
  try {
    const raw = await fs.readFile(RESULT_JSONL, 'utf8');
    allRows = raw
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const failedRows = allRows.filter((row) => !row.fetch_ok);
  const successfulRows = allRows.filter((row) => row.fetch_ok);
  const storageReadyRows = successfulRows.filter((row) => !['supabase_storage_path', 'supabase_public_url'].includes(row.source_lane));
  const summary = {
    package_id: PACKAGE_ID,
    mode: 'read_only_dry_run_manifest',
    started_at: startedAt,
    ended_at: endedAt,
    end_reason: endReason,
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    args,
    result_jsonl: path.relative(ROOT, RESULT_JSONL),
    queried_image_field_rows: queriedRows.length,
    skipped_already_completed_this_run: skippedRows,
    processed_this_run: runRows.length,
    total_result_rows: allRows.length,
    successful_fetch_rows: successfulRows.length,
    failed_fetch_rows: failedRows.length,
    storage_ready_external_rows: storageReadyRows.length,
    by_source_lane: countBy(allRows, 'source_lane'),
    by_source_table: countBy(allRows, 'source_table'),
    by_field_name: countBy(allRows, 'field_name'),
    by_failure_reason: countBy(failedRows, 'failure_reason'),
    sample_failures: failedRows.slice(0, 50).map((row) => ({
      audit_key: row.audit_key,
      source_table: row.source_table,
      gv_id: row.gv_id,
      printing_gv_id: row.printing_gv_id,
      field_name: row.field_name,
      source_lane: row.source_lane,
      raw_image_value: row.raw_image_value,
      resolved_url: row.resolved_url,
      failure_reason: row.failure_reason,
      http_status: row.http_status,
    })),
  };
  summary.proof_hash = proofHash({
    package_id: summary.package_id,
    mode: summary.mode,
    total_result_rows: summary.total_result_rows,
    successful_fetch_rows: summary.successful_fetch_rows,
    failed_fetch_rows: summary.failed_fetch_rows,
    storage_ready_external_rows: summary.storage_ready_external_rows,
    by_source_lane: summary.by_source_lane,
    by_source_table: summary.by_source_table,
    by_field_name: summary.by_field_name,
    by_failure_reason: summary.by_failure_reason,
  });

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.ended_at}
- Mode: ${summary.mode}
- Proof hash: \`${summary.proof_hash}\`
- Result JSONL: \`${summary.result_jsonl}\`
- DB writes performed: ${summary.db_writes_performed}
- Storage uploads performed: ${summary.storage_uploads_performed}
- Migrations created: ${summary.migrations_created}
- End reason: ${summary.end_reason}

## Counts

- Queried image field rows: ${summary.queried_image_field_rows}
- Processed this run: ${summary.processed_this_run}
- Total result rows: ${summary.total_result_rows}
- Successful fetch rows: ${summary.successful_fetch_rows}
- Failed fetch rows: ${summary.failed_fetch_rows}
- Storage-ready external rows: ${summary.storage_ready_external_rows}

## Source Lanes

${markdownTable(Object.entries(summary.by_source_lane))}

## Failure Reasons

${markdownTable(Object.entries(summary.by_failure_reason))}

## Policy

- Read-only audit.
- No database writes.
- No storage uploads.
- No migrations.
- No exact image claims are changed.
- Proposed storage paths are manifest-only and require a separate approved apply.
`, 'utf8');

  return summary;
}

async function appendJsonl(row) {
  await fs.appendFile(RESULT_JSONL, `${JSON.stringify(row)}\n`, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv);
  const startedAt = new Date().toISOString();
  const deadline = Date.now() + args.maxHours * 60 * 60 * 1000;
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const completed = args.resume ? await loadCompletedKeys() : new Set();
  const supabase = createStorageClient();
  const queriedRows = await queryImageRows(args.limit);
  const queue = queriedRows.filter((row) => !completed.has(row.audit_key));
  const skippedRows = queriedRows.length - queue.length;
  const runRows = [];
  let cursor = 0;
  let endReason = 'queue_exhausted';

  async function worker() {
    while (cursor < queue.length) {
      if (Date.now() > deadline) {
        endReason = 'max_hours_reached';
        return;
      }
      const index = cursor;
      cursor += 1;
      const row = await fetchImage(queue[index], args.timeoutMs, supabase);
      runRows.push(row);
      await appendJsonl(row);
      if (runRows.length % 100 === 0) {
        console.log(JSON.stringify({
          package_id: PACKAGE_ID,
          processed_this_run: runRows.length,
          remaining_this_run: queue.length - cursor,
          latest_audit_key: row.audit_key,
          latest_ok: row.fetch_ok,
        }));
      }
    }
  }

  await Promise.all(Array.from({ length: args.concurrency }, () => worker()));
  const endedAt = new Date().toISOString();
  const summary = await writeSummary({ args, queriedRows, skippedRows, runRows, endReason, startedAt, endedAt });
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    result_jsonl: path.relative(ROOT, RESULT_JSONL),
    proof_hash: summary.proof_hash,
    processed_this_run: summary.processed_this_run,
    total_result_rows: summary.total_result_rows,
    failed_fetch_rows: summary.failed_fetch_rows,
    end_reason: summary.end_reason,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
