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

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const INPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_img07a_cardtrader_representative_missing_display_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_img07b_cardtrader_representative_storage_readiness_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'image_truth_img07b_cardtrader_representative_storage_readiness_v1.md');
const STORAGE_BUCKET = 'user-card-images';
const PACKAGE_ID = 'IMG-07B-CARDTRADER-REPRESENTATIVE-STORAGE-READINESS-NO-UPLOAD';

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function sha256Hex(bufferOrText) {
  return crypto.createHash('sha256').update(bufferOrText).digest('hex');
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function proofHash(value) {
  return sha256Hex(JSON.stringify(canonicalizeJson(value)));
}

function requireDbUrl() {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    null
  );
}

function createStorageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url) throw new Error('Missing SUPABASE_URL for storage readiness.');
  if (!key) throw new Error('Missing SUPABASE_SECRET_KEY for storage readiness.');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function storageObjectExists(supabase, storagePath) {
  const normalizedPath = clean(storagePath);
  if (!normalizedPath) throw new Error('storage_probe_missing_path');
  const slashIndex = normalizedPath.lastIndexOf('/');
  const folder = slashIndex >= 0 ? normalizedPath.slice(0, slashIndex) : '';
  const fileName = slashIndex >= 0 ? normalizedPath.slice(slashIndex + 1) : normalizedPath;
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(folder, {
    limit: 100,
    search: fileName,
  });
  if (error) {
    throw new Error(`storage_probe_failed:${storagePath}:${error.message ?? JSON.stringify(error)}`);
  }
  return (data ?? []).some((entry) => entry.name === fileName);
}

async function verifyDbBlankTargets(rows) {
  const connectionString = requireDbUrl();
  if (!connectionString) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for DB target verification.');

  const ids = rows.map((row) => row.card_printing_id);
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(
      `
        select count(*)::int as rows_with_any_image_field
        from public.card_printings
        where id = any($1::uuid[])
          and (
            nullif(image_source,'') is not null
            or nullif(image_path,'') is not null
            or nullif(image_url,'') is not null
            or nullif(image_alt_url,'') is not null
            or nullif(image_status,'') is not null
            or nullif(image_note,'') is not null
          )
      `,
      [ids],
    );
    return Number(result.rows[0]?.rows_with_any_image_field ?? 0);
  } finally {
    await client.end();
  }
}

async function buildRows(inputRows) {
  const supabase = createStorageClient();
  const rows = [];

  for (const row of inputRows) {
    const localPath = clean(row.normalized_asset?.local_nonproduction_asset_path);
    const storagePath = clean(row.normalized_asset?.planned_normalized_front_storage_path);
    const expectedSha = clean(row.normalized_asset?.normalized_sha256);
    const expectedSize = Number(row.normalized_asset?.normalized_size_bytes ?? 0);

    let localExists = false;
    let localSha = null;
    let localSize = null;
    let localMatchesManifest = false;
    let objectAlreadyExists = null;
    let blockedReason = null;

    if (!localPath || !storagePath || !expectedSha || expectedSize <= 0) {
      blockedReason = 'missing_asset_manifest_fields';
    } else {
      try {
        const buffer = await fs.readFile(localPath);
        localExists = true;
        localSha = sha256Hex(buffer);
        localSize = buffer.length;
        localMatchesManifest = localSha === expectedSha && localSize === expectedSize;
        if (!localMatchesManifest) blockedReason = 'local_asset_hash_or_size_mismatch';
      } catch {
        blockedReason = 'local_asset_missing';
      }
    }

    if (!blockedReason && storagePath) {
      objectAlreadyExists = await storageObjectExists(supabase, storagePath);
      if (objectAlreadyExists) blockedReason = 'planned_storage_object_already_exists';
    }

    rows.push({
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      set_name: row.set_name,
      card_name: row.card_name,
      number: row.number,
      finish_key: row.finish_key,
      source_key: row.source_key,
      source_url: row.source_url,
      image_confidence: row.image_confidence,
      storage_bucket: STORAGE_BUCKET,
      planned_storage_path: storagePath,
      local_nonproduction_asset_path: localPath,
      expected_sha256: expectedSha,
      local_sha256: localSha,
      expected_size_bytes: expectedSize,
      local_size_bytes: localSize,
      local_asset_exists: localExists,
      local_asset_matches_manifest: localMatchesManifest,
      storage_object_already_exists: objectAlreadyExists,
      ready_for_storage_upload: !blockedReason,
      blocked_reason: blockedReason,
    });
  }

  return rows;
}

function markdownTable(rows, columns) {
  if (rows.length === 0) return '_None._';
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => {
    const cells = columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|'));
    return `| ${cells.join(' | ')} |`;
  });
  return [header, divider, ...body].join('\n');
}

function buildMarkdown(report) {
  return `# Image Truth V1 IMG-07B CardTrader Representative Storage Readiness

This is a no-upload, no-DB-write readiness packet for the IMG-07A CardTrader representative child-image candidates.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- storage_uploads_performed: ${report.storage_uploads_performed}
- migrations_created: ${report.migrations_created}
- target_table: ${report.target_table}
- parent_overwrite_allowed: ${report.parent_overwrite_allowed}
- storage_bucket: ${report.storage_bucket}

## Summary

- source_rows: ${report.source_rows}
- ready_for_storage_upload_rows: ${report.ready_for_storage_upload_rows}
- blocked_rows: ${report.blocked_rows}
- db_rows_with_any_image_field: ${report.db_rows_with_any_image_field}
- storage_collision_rows: ${report.storage_collision_rows}
- local_asset_mismatch_rows: ${report.local_asset_mismatch_rows}
- ready_for_upload_then_apply: ${report.ready_for_upload_then_apply}
- proof_hash: \`${report.proof_hash}\`

## Rows

${markdownTable(report.rows, [
  { label: 'status', value: (row) => row.ready_for_storage_upload ? 'ready' : row.blocked_reason },
  { label: 'set', value: (row) => row.set_code },
  { label: 'card', value: (row) => row.card_name },
  { label: 'number', value: (row) => row.number },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'storage path', value: (row) => row.planned_storage_path },
  { label: 'source', value: (row) => row.source_url },
])}

## Next Gate

If approved later, the apply sequence must upload exactly these local assets to \`${STORAGE_BUCKET}\`, then update only the matching \`public.card_printings\` image fields with representative image status after a fresh target recheck.
`;
}

async function main() {
  const input = JSON.parse(await fs.readFile(INPUT_JSON, 'utf8'));
  const sourceRows = (input.rows ?? [])
    .filter((row) => row.dry_run_status === 'rollback_update_verified')
    .filter((row) => row.image_confidence === 'representative')
    .filter((row) => row.parent_overwrite_allowed === false);

  const rows = await buildRows(sourceRows);
  const dbRowsWithAnyImageField = await verifyDbBlankTargets(rows);

  const proof = {
    package_id: PACKAGE_ID,
    source_proof_hash: input.proof_hash,
    storage_bucket: STORAGE_BUCKET,
    rows: rows.map((row) => ({
      card_printing_id: row.card_printing_id,
      planned_storage_path: row.planned_storage_path,
      local_sha256: row.local_sha256,
      local_size_bytes: row.local_size_bytes,
      ready_for_storage_upload: row.ready_for_storage_upload,
      blocked_reason: row.blocked_reason,
    })),
    db_rows_with_any_image_field: dbRowsWithAnyImageField,
  };

  const report = {
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    package_id: PACKAGE_ID,
    source_dry_run_report: INPUT_JSON,
    source_proof_hash: input.proof_hash,
    target_table: 'card_printings',
    parent_overwrite_allowed: false,
    storage_bucket: STORAGE_BUCKET,
    source_rows: rows.length,
    ready_for_storage_upload_rows: rows.filter((row) => row.ready_for_storage_upload).length,
    blocked_rows: rows.filter((row) => !row.ready_for_storage_upload).length,
    db_rows_with_any_image_field: dbRowsWithAnyImageField,
    storage_collision_rows: rows.filter((row) => row.storage_object_already_exists === true).length,
    local_asset_mismatch_rows: rows.filter((row) => row.local_asset_matches_manifest !== true).length,
    ready_for_upload_then_apply:
      rows.length > 0 &&
      rows.every((row) => row.ready_for_storage_upload) &&
      dbRowsWithAnyImageField === 0,
    rows,
    proof,
    proof_hash: proofHash(proof),
  };

  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, buildMarkdown(report));

  console.log(JSON.stringify({
    generated: [OUTPUT_JSON, OUTPUT_MD],
    source_rows: report.source_rows,
    ready_for_storage_upload_rows: report.ready_for_storage_upload_rows,
    blocked_rows: report.blocked_rows,
    db_rows_with_any_image_field: report.db_rows_with_any_image_field,
    storage_collision_rows: report.storage_collision_rows,
    ready_for_upload_then_apply: report.ready_for_upload_then_apply,
    proof_hash: report.proof_hash,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
