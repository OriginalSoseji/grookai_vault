import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const JSON_OUT = path.join(OUT_DIR, 'canon_image_full_db_playbook_scan_v1.json');
const MD_OUT = path.join(OUT_DIR, 'canon_image_full_db_playbook_scan_v1.md');
const PACKAGE_ID = 'CANON-IMAGE-FULL-DB-PLAYBOOK-SCAN-V1';
const STORAGE_BUCKET = process.env.SELF_HOSTED_IMAGES_STORAGE_BUCKET ?? 'user-card-images';
const CANON_IMAGE_PREFIXES = [
  'warehouse-derived/self-hosted-images-v1/',
  'warehouse-derived/image-truth-v1/',
];
const BAD_SELECTED_IMAGE_PATTERNS = [
  /PitchBlack/i,
  /card-placeholder/i,
  /placeholder-small/i,
  /\/images\/card-placeholder/i,
];

function clean(value) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

function dbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = clean(fn(row)) ?? 'unknown';
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

function sampleRows(rows, limit = 50) {
  return rows.slice(0, limit).map((row) => ({
    row_type: row.row_type,
    row_id: row.row_id,
    gv_id: row.gv_id,
    printing_gv_id: row.printing_gv_id,
    name: row.name,
    set_code: row.set_code,
    number: row.number,
    finish_key: row.finish_key,
    image_source: row.image_source,
    image_status: row.image_status,
    image_path: row.image_path,
    image_url: row.image_url,
    image_alt_url: row.image_alt_url,
    representative_image_url: row.representative_image_url,
  }));
}

function isCanonImagePath(value) {
  const imagePath = clean(value);
  return Boolean(imagePath && CANON_IMAGE_PREFIXES.some((prefix) => imagePath.startsWith(prefix)));
}

function selectedImageText(row) {
  return [
    row.image_path,
    row.image_url,
    row.image_alt_url,
    row.representative_image_url,
  ].filter(Boolean).join(' ');
}

function badPatternMatches(row) {
  const text = selectedImageText(row);
  return BAD_SELECTED_IMAGE_PATTERNS
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
}

function hasImageEvidence(row) {
  return Boolean(
    clean(row.image_path)
      || clean(row.image_url)
      || clean(row.image_alt_url)
      || clean(row.representative_image_url)
  );
}

function proofHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(row[column] ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

async function query(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

function buildMarkdown(report) {
  return `# Canon Image Full DB Playbook Scan V1

- Generated: ${report.generated_at}
- Package: ${report.package_id}
- Storage bucket: ${report.storage_bucket}
- Fingerprint: \`${report.fingerprint}\`

## Summary

- Parent rows scanned: ${report.metrics.parent_rows_scanned}
- Child rows scanned: ${report.metrics.child_rows_scanned}
- Parent rows with any image evidence: ${report.metrics.parent_rows_with_any_image_evidence}
- Child rows with any image evidence: ${report.metrics.child_rows_with_any_image_evidence}
- Identity rows with canon image paths: ${report.metrics.identity_rows_with_canon_image_path}
- Missing storage objects for identity paths: ${report.metrics.identity_paths_missing_storage_objects}
- Identity paths with non-image storage metadata: ${report.metrics.identity_paths_with_non_image_metadata}
- Identity paths with zero-byte storage objects: ${report.metrics.identity_paths_with_zero_byte_storage_objects}
- Rows with selected bad image patterns: ${report.metrics.rows_with_selected_bad_image_patterns}
- Japanese rows with selected bad image patterns: ${report.metrics.japanese_rows_with_selected_bad_image_patterns}
- Unreferenced canon storage objects: ${report.metrics.unreferenced_canon_storage_objects}
- Unreferenced suspicious storage objects: ${report.metrics.unreferenced_suspicious_storage_objects}

## Missing Storage Objects By Table

${markdownTable(topEntries(report.counts.missing_storage_by_row_type), ['key', 'count'])}

## Bad Selected Image Pattern Counts

${markdownTable(topEntries(report.counts.bad_selected_patterns), ['key', 'count'])}

## Bad Selected Image Pattern Samples

${markdownTable(report.samples.bad_selected_image_rows.map((row) => ({
  row_type: row.row_type,
  gv_id: row.gv_id ?? row.printing_gv_id,
  set_code: row.set_code,
  number: row.number,
  image_path: row.image_path,
  image_url: row.image_url,
})), ['row_type', 'gv_id', 'set_code', 'number', 'image_path', 'image_url'])}

## Missing Storage Samples

${markdownTable(report.samples.missing_storage_rows.map((row) => ({
  row_type: row.row_type,
  gv_id: row.gv_id ?? row.printing_gv_id,
  set_code: row.set_code,
  number: row.number,
  image_path: row.image_path,
})), ['row_type', 'gv_id', 'set_code', 'number', 'image_path'])}

## Unreferenced Suspicious Storage Samples

${markdownTable(report.samples.unreferenced_suspicious_storage_objects, ['name', 'size', 'mimetype', 'updated_at'])}
`;
}

async function main() {
  const url = dbUrl();
  if (!url) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let imageRows;
  let storageObjects;
  try {
    imageRows = await query(client, `
      select
        'card_prints' as row_type,
        cp.id::text as row_id,
        cp.gv_id,
        null::text as printing_gv_id,
        cp.name,
        cp.set_code,
        cp.number,
        null::text as finish_key,
        cp.identity_domain,
        cp.image_source,
        cp.image_path,
        cp.image_url,
        cp.image_alt_url,
        cp.representative_image_url,
        cp.image_status,
        cp.image_note
      from public.card_prints cp
      union all
      select
        'card_printings' as row_type,
        cpg.id::text as row_id,
        cp.gv_id,
        cpg.printing_gv_id,
        cp.name,
        cp.set_code,
        cp.number,
        cpg.finish_key,
        cp.identity_domain,
        cpg.image_source,
        cpg.image_path,
        cpg.image_url,
        cpg.image_alt_url,
        null::text as representative_image_url,
        cpg.image_status,
        cpg.image_note
      from public.card_printings cpg
      join public.card_prints cp on cp.id = cpg.card_print_id
    `);

    storageObjects = await query(client, `
      select
        name,
        updated_at,
        created_at,
        metadata->>'mimetype' as mimetype,
        nullif(metadata->>'size', '')::bigint as size
      from storage.objects
      where bucket_id = $1
        and (
          name like 'warehouse-derived/self-hosted-images-v1/%'
          or name like 'warehouse-derived/image-truth-v1/%'
        )
    `, [STORAGE_BUCKET]);
  } finally {
    await client.end();
  }

  const storageByPath = new Map(storageObjects.map((row) => [row.name, row]));
  const referencedPaths = new Set(
    imageRows
      .map((row) => clean(row.image_path))
      .filter((imagePath) => imagePath && isCanonImagePath(imagePath)),
  );
  const identityRows = imageRows.filter((row) => clean(row.image_source)?.toLowerCase() === 'identity');
  const identityRowsWithCanonPath = identityRows.filter((row) => isCanonImagePath(row.image_path));
  const identityRowsMissingStorage = identityRowsWithCanonPath.filter((row) => !storageByPath.has(clean(row.image_path)));
  const identityRowsWithStorage = identityRowsWithCanonPath.filter((row) => storageByPath.has(clean(row.image_path)));
  const identityRowsWithNonImageMetadata = identityRowsWithStorage.filter((row) => {
    const object = storageByPath.get(clean(row.image_path));
    return clean(object?.mimetype) && !clean(object?.mimetype).startsWith('image/');
  });
  const identityRowsWithZeroByteStorage = identityRowsWithStorage.filter((row) => Number(storageByPath.get(clean(row.image_path))?.size ?? 0) === 0);
  const rowsWithBadPatterns = imageRows
    .map((row) => ({ ...row, bad_patterns: badPatternMatches(row) }))
    .filter((row) => row.bad_patterns.length > 0);
  const japaneseRowsWithBadPatterns = rowsWithBadPatterns.filter((row) => {
    const gvId = clean(row.gv_id ?? row.printing_gv_id)?.toUpperCase() ?? '';
    const identityDomain = clean(row.identity_domain)?.toLowerCase() ?? '';
    return gvId.startsWith('GV-PK-JPN-') || identityDomain === 'pokemon_jpn';
  });
  const unreferencedCanonStorageObjects = storageObjects.filter((row) => !referencedPaths.has(row.name));
  const unreferencedSuspiciousStorageObjects = unreferencedCanonStorageObjects.filter((row) => BAD_SELECTED_IMAGE_PATTERNS.some((pattern) => pattern.test(row.name)));

  const badPatternCounts = {};
  for (const row of rowsWithBadPatterns) {
    for (const pattern of row.bad_patterns) {
      badPatternCounts[pattern] = (badPatternCounts[pattern] ?? 0) + 1;
    }
  }

  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    storage_bucket: STORAGE_BUCKET,
    metrics: {
      parent_rows_scanned: imageRows.filter((row) => row.row_type === 'card_prints').length,
      child_rows_scanned: imageRows.filter((row) => row.row_type === 'card_printings').length,
      parent_rows_with_any_image_evidence: imageRows.filter((row) => row.row_type === 'card_prints' && hasImageEvidence(row)).length,
      child_rows_with_any_image_evidence: imageRows.filter((row) => row.row_type === 'card_printings' && hasImageEvidence(row)).length,
      storage_objects_scanned: storageObjects.length,
      identity_rows: identityRows.length,
      identity_rows_with_canon_image_path: identityRowsWithCanonPath.length,
      identity_paths_missing_storage_objects: identityRowsMissingStorage.length,
      identity_paths_with_non_image_metadata: identityRowsWithNonImageMetadata.length,
      identity_paths_with_zero_byte_storage_objects: identityRowsWithZeroByteStorage.length,
      rows_with_selected_bad_image_patterns: rowsWithBadPatterns.length,
      japanese_rows_with_selected_bad_image_patterns: japaneseRowsWithBadPatterns.length,
      unreferenced_canon_storage_objects: unreferencedCanonStorageObjects.length,
      unreferenced_suspicious_storage_objects: unreferencedSuspiciousStorageObjects.length,
    },
    counts: {
      missing_storage_by_row_type: countBy(identityRowsMissingStorage, (row) => row.row_type),
      missing_storage_by_set_code: countBy(identityRowsMissingStorage, (row) => row.set_code),
      bad_selected_patterns: badPatternCounts,
      bad_selected_by_set_code: countBy(rowsWithBadPatterns, (row) => row.set_code),
      bad_selected_by_row_type: countBy(rowsWithBadPatterns, (row) => row.row_type),
      unreferenced_storage_by_top_folder: countBy(unreferencedCanonStorageObjects, (row) => row.name.split('/').slice(0, 3).join('/')),
    },
    samples: {
      missing_storage_rows: sampleRows(identityRowsMissingStorage, 100),
      non_image_metadata_rows: sampleRows(identityRowsWithNonImageMetadata, 50),
      zero_byte_storage_rows: sampleRows(identityRowsWithZeroByteStorage, 50),
      bad_selected_image_rows: sampleRows(rowsWithBadPatterns, 100),
      japanese_bad_selected_image_rows: sampleRows(japaneseRowsWithBadPatterns, 100),
      unreferenced_suspicious_storage_objects: unreferencedSuspiciousStorageObjects.slice(0, 100).map((row) => ({
        name: row.name,
        size: row.size,
        mimetype: row.mimetype,
        updated_at: row.updated_at,
      })),
    },
  };
  report.fingerprint = proofHash(report);

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(MD_OUT, buildMarkdown(report), 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    json: path.relative(ROOT, JSON_OUT),
    markdown: path.relative(ROOT, MD_OUT),
    fingerprint: report.fingerprint,
    metrics: report.metrics,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal`, error);
  process.exit(1);
});
