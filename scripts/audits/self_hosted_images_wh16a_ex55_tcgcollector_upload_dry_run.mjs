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
const MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh16a_ex55_tcgcollector_upload_manifest_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh16a_ex55_tcgcollector_upload_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh16a_ex55_tcgcollector_upload_dry_run_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-16A-EX55-TCGCOLLECTOR-UPLOAD-DRY-RUN';
const STORAGE_BUCKET = process.env.SELF_HOSTED_IMAGES_STORAGE_BUCKET ?? 'user-card-images';
const USER_AGENT = 'Grookai WH16A EX55 TCGCollector Image Audit/1.0';
const FETCH_TIMEOUT_MS = Number.parseInt(process.env.IMG_HOST_WH16A_FETCH_TIMEOUT_MS ?? '30000', 10);
const FETCH_CONCURRENCY = Math.max(1, Math.min(Number.parseInt(process.env.IMG_HOST_WH16A_FETCH_CONCURRENCY ?? '4', 10), 8));

const SOURCE_URLS = new Map([
  ['1', 'https://www.tcgcollector.com/cards/9849/treecko-poke-card-creator-pack-1-5'],
  ['2', 'https://www.tcgcollector.com/cards/9850/wurmple-poke-card-creator-pack-2-5'],
  ['3', 'https://www.tcgcollector.com/cards/9851/torchic-poke-card-creator-pack-3-5'],
  ['4', 'https://www.tcgcollector.com/cards/9852/mudkip-poke-card-creator-pack-4-5'],
  ['5', 'https://www.tcgcollector.com/cards/9853/pikachu-poke-card-creator-pack-5-5'],
]);

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

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function htmlTitle(html) {
  const match = String(html ?? '').match(/<title[^>]*>([^<]+)<\/title>/i);
  return clean(decodeHtml(match?.[1])?.replace(/\s+/g, ' '));
}

function tagAttribute(tag, attrName) {
  const match = String(tag ?? '').match(new RegExp(`\\b${attrName}=["']([^"']*)["']`, 'i'));
  return clean(decodeHtml(match?.[1]));
}

function findOgImage(html) {
  const metaTags = String(html ?? '').match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    const property = tagAttribute(tag, 'property') ?? tagAttribute(tag, 'name');
    if (String(property ?? '').toLowerCase() !== 'og:image') continue;
    const content = tagAttribute(tag, 'content');
    if (String(content ?? '').startsWith('https://static.tcgcollector.com/content/images/')) return content;
  }
  return null;
}

function imageExtensionFor(contentType, finalUrl) {
  const type = clean(contentType)?.split(';')[0].trim().toLowerCase();
  if (type === 'image/png') return 'png';
  if (type === 'image/jpeg' || type === 'image/jpg') return 'jpg';
  if (type === 'image/webp') return 'webp';
  try {
    const ext = path.extname(new URL(finalUrl).pathname).replace(/^\./, '').toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  } catch {
    // Ignore URL parsing fallback failures.
  }
  return 'img';
}

function isImageContentType(value) {
  return clean(value)?.toLowerCase().startsWith('image/') ?? false;
}

async function fetchBuffer(url, redirectCount = 0) {
  if (redirectCount > 5) throw new Error(`too_many_redirects:${url}`);
  const parsed = new URL(url);
  const client = parsed.protocol === 'http:' ? http : https;
  return new Promise((resolve, reject) => {
    const request = client.get(parsed, {
      headers: { 'user-agent': USER_AGENT },
      timeout: FETCH_TIMEOUT_MS,
      rejectUnauthorized: false,
    }, (response) => {
      const statusCode = response.statusCode ?? 0;
      const location = response.headers.location;
      if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
        response.resume();
        fetchBuffer(new URL(location, parsed).toString(), redirectCount + 1).then(resolve, reject);
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          ok: statusCode >= 200 && statusCode < 300,
          status: statusCode,
          final_url: url,
          content_type: response.headers['content-type'] ?? null,
          size_bytes: buffer.length,
          sha256: sha256Hex(buffer),
          text: buffer.toString('utf8'),
          transport_note: 'tls_verification_disabled_for_source_validation',
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
      and cp.set_code = 'ex5.5'
    order by cp.number_plain nulls last, cp.number, cp.gv_id
  `);
  return result.rows;
}

function titleMatches(row, title) {
  const normalizedTitle = normalizeText(title);
  const name = normalizeText(row.name);
  const number = String(row.number ?? '').trim();
  return normalizedTitle.includes(name)
    && normalizedTitle.includes('poke card creator pack')
    && normalizedTitle.includes(`${number}/5`)
    && normalizedTitle.includes('tcg collector')
    && !normalizedTitle.includes(' list');
}

async function acquire(row) {
  const sourceUrl = SOURCE_URLS.get(String(row.number ?? '').trim());
  const attempts = [];
  if (!sourceUrl) return { row, image: null, attempts: [{ route: 'tcgcollector_ex55', error: 'no_source_url' }] };
  try {
    const page = await fetchBuffer(sourceUrl);
    const title = htmlTitle(page.text);
    attempts.push({ route: 'tcgcollector_ex55_page', source_url: sourceUrl, status: page.status, content_type: page.content_type, title });
    if (!page.ok || !titleMatches(row, title)) {
      attempts[attempts.length - 1].error = 'title_not_exact_ex55_card_page';
      return { row, image: null, attempts };
    }
    const imageUrl = findOgImage(page.text);
    if (!imageUrl) {
      attempts[attempts.length - 1].error = 'missing_og_image';
      return { row, image: null, attempts };
    }
    const image = await fetchBuffer(imageUrl);
    attempts.push({ route: 'tcgcollector_ex55_image', source_url: imageUrl, status: image.status, content_type: image.content_type, size_bytes: image.size_bytes });
    if (!image.ok || !isImageContentType(image.content_type) || image.size_bytes <= 1024) {
      attempts[attempts.length - 1].error = 'image_url_not_valid';
      return { row, image: null, attempts };
    }
    return {
      row,
      route: 'tcgcollector_ex55_card_page',
      upstream_id: `tcgcollector:ex5.5:${row.number}`,
      upstream_set_id: 'ex5.5',
      source_page_url: sourceUrl,
      source_url: imageUrl,
      source_label: title,
      image,
      attempts,
    };
  } catch (error) {
    attempts.push({ route: 'tcgcollector_ex55', source_url: sourceUrl, error: String(error?.message ?? error) });
    return { row, image: null, attempts };
  }
}

function toManifestRow(acquired) {
  const row = acquired.row;
  const image = acquired.image;
  const ext = imageExtensionFor(image.content_type, image.final_url);
  const targetStoragePath = [
    'warehouse-derived',
    'self-hosted-images-v1',
    'card_prints',
    normalizePathSegment(row.set_code),
    normalizePathSegment(row.gv_id),
    `${image.sha256.slice(0, 24)}.${ext}`,
  ].join('/');

  return {
    package_id: PACKAGE_ID,
    audit_key: `card_prints:${row.id}:${acquired.route}:${acquired.upstream_id}`,
    source_table: 'card_prints',
    source_row_id: row.id,
    gv_id: row.gv_id,
    name: row.name,
    set_code: row.set_code,
    number: row.number,
    rarity: row.rarity,
    variant_key: row.variant_key,
    current_image_source: row.image_source,
    current_image_status: row.image_status,
    current_image_note: row.image_note,
    source_route: acquired.route,
    upstream_source: 'tcgcollector',
    upstream_card_id: acquired.upstream_id,
    upstream_set_id: acquired.upstream_set_id,
    source_page_url: acquired.source_page_url,
    source_image_value: acquired.source_url,
    source_label: acquired.source_label,
    source_final_url: image.final_url,
    source_http_status: image.status,
    source_content_type: image.content_type,
    source_size_bytes: image.size_bytes,
    source_sha256: image.sha256,
    transport_note: image.transport_note,
    target_storage_bucket: STORAGE_BUCKET,
    target_storage_path: targetStoragePath,
    upload_performed: false,
    db_write_performed: false,
    exact_image_claim_change: false,
    proposed_db_plan: {
      target_table: 'card_prints',
      target_row_id: row.id,
      proposed_image_source: 'identity',
      proposed_image_path: targetStoragePath,
      proposed_image_status: clean(row.image_status),
      proposed_image_note: clean(row.image_note),
      allowed_future_columns: ['image_source', 'image_path'],
      preserved_columns: ['image_status', 'image_note'],
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

  const acquired = await mapLimit(rows, FETCH_CONCURRENCY, acquire);
  const matched = acquired.filter((entry) => entry.route && entry.image);
  const unmatched = acquired.filter((entry) => !entry.route || !entry.image);
  const manifestRows = matched.map(toManifestRow);
  const targetPathCounts = countBy(manifestRows, (row) => row.target_storage_path);
  const duplicateTargetPaths = Object.entries(targetPathCounts).filter(([, count]) => count > 1);
  const stopFindings = [
    ...(duplicateTargetPaths.length ? ['duplicate_target_storage_paths'] : []),
    ...(unmatched.length ? ['unmatched_ex55_parent_rows'] : []),
  ];

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(MANIFEST_JSONL, `${manifestRows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'dry_run_no_write',
    candidate_parent_rows: rows.length,
    matched_manifest_rows: manifestRows.length,
    unmatched_parent_rows: unmatched.length,
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
    planned_db_columns_after_upload: ['card_prints.image_source', 'card_prints.image_path'],
    preserved_db_columns_after_upload: ['card_prints.image_status', 'card_prints.image_note'],
    by_set_code: countBy(manifestRows, (row) => row.set_code),
    by_source_route: countBy(manifestRows, (row) => row.source_route),
    by_current_image_status: countBy(manifestRows, (row) => row.current_image_status ?? 'null'),
    by_content_type: countBy(manifestRows, (row) => row.source_content_type?.split(';')[0]?.trim().toLowerCase()),
    unmatched_by_set_code: countBy(unmatched, (entry) => entry.row.set_code),
    stop_findings: stopFindings,
    ready_for_storage_apply_package: stopFindings.length === 0 && manifestRows.length > 0,
    samples: {
      manifest_rows: manifestRows.slice(0, 10),
      unmatched_rows: unmatched.map((entry) => ({
        gv_id: entry.row.gv_id,
        name: entry.row.name,
        set_code: entry.row.set_code,
        number: entry.row.number,
        attempts: entry.attempts,
      })),
    },
  };
  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    matched_manifest_rows: summary.matched_manifest_rows,
    unique_upload_objects: summary.unique_upload_objects,
    target_storage_bucket: summary.target_storage_bucket,
    planned_db_columns_after_upload: summary.planned_db_columns_after_upload,
    preserved_db_columns_after_upload: summary.preserved_db_columns_after_upload,
    manifest_rows: manifestRows.map((row) => ({
      source_row_id: row.source_row_id,
      gv_id: row.gv_id,
      source_route: row.source_route,
      upstream_card_id: row.upstream_card_id,
      source_image_value: row.source_image_value,
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
- Matched manifest rows: ${summary.matched_manifest_rows}
- Unmatched parent rows: ${summary.unmatched_parent_rows}
- Unique upload objects: ${summary.unique_upload_objects}
- Target storage bucket: ${summary.target_storage_bucket}
- Planned DB columns after upload: ${summary.planned_db_columns_after_upload.join(', ')}
- Preserved DB columns after upload: ${summary.preserved_db_columns_after_upload.join(', ')}
- Ready for storage apply package: ${summary.ready_for_storage_apply_package}
- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}
- Exact image claim changes performed: ${summary.exact_image_claim_changes_performed}

## By Set

${markdownTable(topEntries(summary.by_set_code))}

## By Source Route

${markdownTable(topEntries(summary.by_source_route))}

## Current Image Status

${markdownTable(topEntries(summary.by_current_image_status))}
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    fingerprint: summary.fingerprint,
    ready_for_storage_apply_package: summary.ready_for_storage_apply_package,
    matched_manifest_rows: summary.matched_manifest_rows,
    unmatched_parent_rows: summary.unmatched_parent_rows,
    stop_findings: summary.stop_findings,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
