import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh02a_valid_external_upload_manifest_v1.jsonl');
const UPLOAD_RESULT_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh02b_valid_external_storage_upload_apply_result_v1.jsonl');
const PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh03a_db_pointer_repoint_plan_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh03a_db_pointer_repoint_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh03a_db_pointer_repoint_dry_run_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-03A-DB-POINTER-REPOINT-DRY-RUN';
const STORAGE_BUCKET = process.env.SELF_HOSTED_IMAGES_STORAGE_BUCKET ?? 'user-card-images';

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

async function readJsonl(file) {
  const raw = await fs.readFile(file, 'utf8');
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function topEntries(counts, limit = 25) {
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

function storagePublicUrl(storagePath) {
  const base = clean(process.env.SUPABASE_URL);
  if (!base) throw new Error('Missing SUPABASE_URL.');
  const encodedPath = String(storagePath)
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${encodeURIComponent(STORAGE_BUCKET)}/${encodedPath}`;
}

function latestUploadResults(rows) {
  const latest = new Map();
  for (const row of rows) {
    latest.set(`${row.target_storage_bucket}:${row.target_storage_path}`, row);
  }
  return latest;
}

function isCompletedUpload(row) {
  return row?.uploaded === true || row?.status === 'skipped_existing_object';
}

function preferredParentImagePath(rows) {
  const exactRows = rows.filter((row) => row.source_field_name === 'image_url');
  if (exactRows.length) return exactRows[0].target_storage_path;
  const representativeRows = rows.filter((row) => row.source_field_name === 'representative_image_url');
  if (representativeRows.length) return representativeRows[0].target_storage_path;
  const altRows = rows.filter((row) => row.source_field_name === 'image_alt_url');
  return altRows[0]?.target_storage_path ?? null;
}

function proposedImageStatus(row) {
  return row.proposed_db_plan?.proposed_image_status ?? row.image_status ?? 'exact';
}

function proposedImageNote(row) {
  return `Self-hosted copy uploaded by IMG-HOST-WH-02B; original external source preserved in ${path.relative(ROOT, MANIFEST_JSONL)}.`;
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function fetchCurrentRows(client, tableName, ids) {
  if (!ids.length) return new Map();
  const select = tableName === 'card_prints'
    ? 'id, image_url, image_alt_url, representative_image_url, image_source, image_path, image_status, image_note'
    : 'id, image_url, image_alt_url, image_source, image_path, image_status, image_note';
  const output = new Map();
  for (const batch of chunk(ids, 1000)) {
    const result = await client.query(
      `select ${select} from public.${tableName} where id = any($1::uuid[])`,
      [batch],
    );
    for (const row of result.rows) output.set(row.id, row);
  }
  return output;
}

function fieldPlanForManifestRow(row, currentRow) {
  const sourceField = row.source_field_name;
  const currentValue = clean(currentRow?.[sourceField]);
  const expectedCurrentValue = clean(row.source_image_value);
  const publicUrl = storagePublicUrl(row.target_storage_path);
  const staleCurrentValue = currentValue !== expectedCurrentValue;
  return {
    plan_type: 'runtime_field_repoint',
    target_table: row.source_table,
    target_row_id: row.source_row_id,
    source_field_name: sourceField,
    current_value: currentValue,
    expected_current_value: expectedCurrentValue,
    proposed_value: publicUrl,
    stale_current_value: staleCurrentValue,
    blocked_without_fresh_current_match: staleCurrentValue,
  };
}

function metadataPlanForRows(rows, currentRow) {
  const representative = rows.find((row) => row.source_field_name === 'representative_image_url') ?? rows[0];
  const preferredPath = representative.source_table === 'card_prints'
    ? preferredParentImagePath(rows)
    : representative.target_storage_path;
  return {
    plan_type: 'metadata_pointer_repoint',
    target_table: representative.source_table,
    target_row_id: representative.source_row_id,
    proposed_values: {
      image_source: 'identity',
      image_path: preferredPath,
      image_status: proposedImageStatus(representative),
      image_note: proposedImageNote(representative),
    },
    current_values: {
      image_source: clean(currentRow?.image_source),
      image_path: clean(currentRow?.image_path),
      image_status: clean(currentRow?.image_status),
      image_note: clean(currentRow?.image_note),
    },
    source_field_names: rows.map((row) => row.source_field_name).sort(),
    blocked_without_fresh_current_match: false,
  };
}

function mergePlansByRow(manifestRows, currentRowsByTable) {
  const byRow = new Map();
  for (const row of manifestRows) {
    const key = `${row.source_table}:${row.source_row_id}`;
    const bucket = byRow.get(key) ?? [];
    bucket.push(row);
    byRow.set(key, bucket);
  }

  const plans = [];
  for (const [key, rows] of byRow.entries()) {
    const [tableName, rowId] = key.split(':');
    const currentRow = currentRowsByTable[tableName]?.get(rowId) ?? null;
    for (const row of rows) {
      plans.push({
        package_id: PACKAGE_ID,
        audit_key: row.audit_key,
        gv_id: row.gv_id,
        printing_gv_id: row.printing_gv_id,
        name: row.name,
        set_code: row.set_code,
        number: row.number,
        target_storage_bucket: row.target_storage_bucket,
        target_storage_path: row.target_storage_path,
        source_final_url: row.source_final_url,
        source_sha256: row.source_sha256,
        exact_image_claim_change: false,
        db_write_performed: false,
        ...fieldPlanForManifestRow(row, currentRow),
      });
    }
    plans.push({
      package_id: PACKAGE_ID,
      audit_key: `${tableName}:${rowId}:metadata_pointer`,
      gv_id: rows[0].gv_id,
      printing_gv_id: rows[0].printing_gv_id,
      name: rows[0].name,
      set_code: rows[0].set_code,
      number: rows[0].number,
      target_storage_bucket: rows[0].target_storage_bucket,
      target_storage_path: preferredParentImagePath(rows) ?? rows[0].target_storage_path,
      exact_image_claim_change: false,
      db_write_performed: false,
      ...metadataPlanForRows(rows, currentRow),
    });
  }
  return plans;
}

async function main() {
  const manifestRows = await readJsonl(MANIFEST_JSONL);
  const uploadRows = await readJsonl(UPLOAD_RESULT_JSONL);
  const latestUploads = latestUploadResults(uploadRows);
  const completedManifestRows = manifestRows.filter((row) => (
    isCompletedUpload(latestUploads.get(`${row.target_storage_bucket}:${row.target_storage_path}`))
  ));
  const incompleteManifestRows = manifestRows.filter((row) => (
    !isCompletedUpload(latestUploads.get(`${row.target_storage_bucket}:${row.target_storage_path}`))
  ));

  const idsByTable = {};
  for (const row of completedManifestRows) {
    (idsByTable[row.source_table] ??= new Set()).add(row.source_row_id);
  }

  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let currentRowsByTable;
  try {
    currentRowsByTable = {
      card_prints: await fetchCurrentRows(client, 'card_prints', [...(idsByTable.card_prints ?? [])]),
      card_printings: await fetchCurrentRows(client, 'card_printings', [...(idsByTable.card_printings ?? [])]),
    };
  } finally {
    await client.end();
  }

  const plans = mergePlansByRow(completedManifestRows, currentRowsByTable);
  const runtimePlans = plans.filter((row) => row.plan_type === 'runtime_field_repoint');
  const metadataPlans = plans.filter((row) => row.plan_type === 'metadata_pointer_repoint');
  const staleRuntimePlans = runtimePlans.filter((row) => row.stale_current_value);
  const missingCurrentRows = plans.filter((row) => {
    const map = currentRowsByTable[row.target_table];
    return !map?.has(row.target_row_id);
  });
  const stopFindings = [
    ...(incompleteManifestRows.length ? ['incomplete_storage_uploads'] : []),
    ...(staleRuntimePlans.length ? ['stale_current_runtime_image_values'] : []),
    ...(missingCurrentRows.length ? ['missing_current_db_rows'] : []),
  ];

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(PLAN_JSONL, plans.map((row) => JSON.stringify(row)).join('\n') + '\n', 'utf8');

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'dry_run_no_write',
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    upload_result_jsonl: path.relative(ROOT, UPLOAD_RESULT_JSONL),
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    manifest_rows: manifestRows.length,
    completed_manifest_rows: completedManifestRows.length,
    incomplete_manifest_rows: incompleteManifestRows.length,
    unique_db_rows_in_scope: Object.values(idsByTable).reduce((sum, set) => sum + set.size, 0),
    runtime_field_repoint_plan_rows: runtimePlans.length,
    metadata_pointer_plan_rows: metadataPlans.length,
    total_plan_rows: plans.length,
    stale_current_runtime_image_values: staleRuntimePlans.length,
    missing_current_db_rows: missingCurrentRows.length,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    target_tables: countBy(plans, (row) => row.target_table),
    runtime_fields: countBy(runtimePlans, (row) => `${row.target_table}.${row.source_field_name}`),
    metadata_tables: countBy(metadataPlans, (row) => row.target_table),
    stale_runtime_fields: countBy(staleRuntimePlans, (row) => `${row.target_table}.${row.source_field_name}`),
    stop_findings: stopFindings,
    ready_for_apply_package: stopFindings.length === 0,
    samples: {
      runtime_field_repoint: runtimePlans.slice(0, 10),
      metadata_pointer_repoint: metadataPlans.slice(0, 10),
      stale_current_runtime_image_values: staleRuntimePlans.slice(0, 20),
    },
  };
  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    completed_manifest_rows: summary.completed_manifest_rows,
    runtime_field_repoint_plan_rows: summary.runtime_field_repoint_plan_rows,
    metadata_pointer_plan_rows: summary.metadata_pointer_plan_rows,
    target_tables: summary.target_tables,
    runtime_fields: summary.runtime_fields,
    stale_current_runtime_image_values: summary.stale_current_runtime_image_values,
    missing_current_db_rows: summary.missing_current_db_rows,
    plan_rows: plans.map((row) => ({
      plan_type: row.plan_type,
      target_table: row.target_table,
      target_row_id: row.target_row_id,
      source_field_name: row.source_field_name ?? null,
      proposed_value: row.proposed_value ?? null,
      proposed_values: row.proposed_values ?? null,
      stale_current_value: row.stale_current_value ?? false,
    })),
  });

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Manifest rows: ${summary.manifest_rows}
- Completed manifest rows: ${summary.completed_manifest_rows}
- Incomplete manifest rows: ${summary.incomplete_manifest_rows}
- Unique DB rows in scope: ${summary.unique_db_rows_in_scope}
- Runtime field repoint plan rows: ${summary.runtime_field_repoint_plan_rows}
- Metadata pointer plan rows: ${summary.metadata_pointer_plan_rows}
- Total plan rows: ${summary.total_plan_rows}
- Stale current runtime image values: ${summary.stale_current_runtime_image_values}
- Missing current DB rows: ${summary.missing_current_db_rows}
- Ready for apply package: ${summary.ready_for_apply_package}
- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}
- Exact image claim changes performed: ${summary.exact_image_claim_changes_performed}

## Target Tables

${markdownTable(topEntries(summary.target_tables))}

## Runtime Fields

${markdownTable(topEntries(summary.runtime_fields))}

## Metadata Tables

${markdownTable(topEntries(summary.metadata_tables))}

## Stale Runtime Fields

${markdownTable(topEntries(summary.stale_runtime_fields))}
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    fingerprint: summary.fingerprint,
    ready_for_apply_package: summary.ready_for_apply_package,
    stop_findings: summary.stop_findings,
    runtime_field_repoint_plan_rows: summary.runtime_field_repoint_plan_rows,
    metadata_pointer_plan_rows: summary.metadata_pointer_plan_rows,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
