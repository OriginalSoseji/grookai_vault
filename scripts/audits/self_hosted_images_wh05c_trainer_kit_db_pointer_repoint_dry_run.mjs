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
const MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh05a_trainer_kit_runtime_upload_manifest_v1.jsonl');
const UPLOAD_RESULT_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh05b_trainer_kit_runtime_storage_upload_apply_result_v1.jsonl');
const PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh05c_trainer_kit_db_pointer_repoint_plan_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh05c_trainer_kit_db_pointer_repoint_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh05c_trainer_kit_db_pointer_repoint_dry_run_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-05C-TRAINER-KIT-DB-POINTER-REPOINT-DRY-RUN';
const SOURCE_UPLOAD_PACKAGE_ID = 'IMG-HOST-WH-05B-TRAINER-KIT-RUNTIME-REPLACEMENT-STORAGE-UPLOAD-APPLY';
const SOURCE_UPLOAD_PROOF_HASH = 'e962a3a3539ec0db84dcf43d3dac2f9725463040e94ba408726bd023016a9b73';

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

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
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

async function fetchCurrentRows(client, ids) {
  if (!ids.length) return new Map();
  const output = new Map();
  for (const batch of chunk(ids, 1000)) {
    const result = await client.query(
      `select id, gv_id, name, set_code, number, image_source, image_path, image_status, image_note
       from public.card_prints
       where id = any($1::uuid[])`,
      [batch],
    );
    for (const row of result.rows) output.set(row.id, row);
  }
  return output;
}

function proposedImageNote(row) {
  return clean(row.proposed_image_note)
    ?? `Self-hosted representative Trainer Kit image uploaded by ${SOURCE_UPLOAD_PACKAGE_ID}; exact image claim is not changed.`;
}

function planForManifestRow(row, currentRow) {
  const currentValues = {
    image_source: clean(currentRow?.image_source),
    image_path: clean(currentRow?.image_path),
    image_status: clean(currentRow?.image_status),
    image_note: clean(currentRow?.image_note),
  };
  const proposedValues = {
    image_source: 'identity',
    image_path: clean(row.target_storage_path),
    image_status: clean(row.proposed_image_status),
    image_note: proposedImageNote(row),
  };
  const changedColumns = Object.keys(proposedValues).filter((key) =>
    clean(currentValues[key]) !== clean(proposedValues[key]));

  return {
    package_id: PACKAGE_ID,
    plan_type: 'metadata_pointer_repoint',
    source_upload_package_id: SOURCE_UPLOAD_PACKAGE_ID,
    source_upload_proof_hash: SOURCE_UPLOAD_PROOF_HASH,
    target_table: 'card_prints',
    target_row_id: row.card_print_id,
    gv_id: row.gv_id,
    name: row.name,
    set_code: row.set_code,
    set_name: row.set_name,
    number: row.number,
    source_lane: row.source_lane,
    source_url: row.source_url,
    target_storage_bucket: row.target_storage_bucket,
    target_storage_path: row.target_storage_path,
    source_sha256: row.source_sha256,
    proposed_display_image_kind: row.proposed_display_image_kind,
    current_values: currentValues,
    proposed_values: proposedValues,
    changed_columns: changedColumns,
    exact_image_claim_change: false,
    db_write_performed: false,
    storage_write_performed: false,
    runtime_public_url_field_write_planned: false,
    allowed_future_columns: ['image_source', 'image_path', 'image_status', 'image_note'],
    blocked_future_columns: ['id', 'gv_id', 'name', 'set_code', 'number', 'image_url', 'image_alt_url', 'representative_image_url'],
  };
}

async function main() {
  const manifestRows = await readJsonl(MANIFEST_JSONL);
  const uploadRows = await readJsonl(UPLOAD_RESULT_JSONL);
  const latestUploads = latestUploadResults(uploadRows);

  const completedManifestRows = manifestRows.filter((row) =>
    isCompletedUpload(latestUploads.get(`${row.target_storage_bucket}:${row.target_storage_path}`)));
  const incompleteManifestRows = manifestRows.filter((row) =>
    !isCompletedUpload(latestUploads.get(`${row.target_storage_bucket}:${row.target_storage_path}`)));
  const unsupportedRows = completedManifestRows.filter((row) =>
    !row.card_print_id ||
    !String(row.set_code ?? '').startsWith('tk-') ||
    row.proposed_display_image_kind !== 'representative' ||
    row.proposed_image_status !== 'representative_shared' ||
    row.exact_image_claim_change === true);

  const uniqueRowIds = [...new Set(completedManifestRows.map((row) => row.card_print_id).filter(Boolean))].sort();
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let currentRows;
  try {
    currentRows = await fetchCurrentRows(client, uniqueRowIds);
  } finally {
    await client.end();
  }

  const plans = completedManifestRows.map((row) => planForManifestRow(row, currentRows.get(row.card_print_id)));
  const missingCurrentRows = plans.filter((row) => !currentRows.has(row.target_row_id));
  const missingProposedPathRows = plans.filter((row) => !clean(row.proposed_values.image_path));
  const missingProposedSourceRows = plans.filter((row) => !clean(row.proposed_values.image_source));
  const noOpRows = plans.filter((row) => row.changed_columns.length === 0);
  const effectiveRows = plans.filter((row) => row.changed_columns.length > 0);
  const rowsChangingStatus = plans.filter((row) => row.changed_columns.includes('image_status'));
  const rowsChangingNote = plans.filter((row) => row.changed_columns.includes('image_note'));

  const stopFindings = [
    ...(incompleteManifestRows.length ? ['incomplete_upload_rows'] : []),
    ...(unsupportedRows.length ? ['unsupported_manifest_rows'] : []),
    ...(missingCurrentRows.length ? ['missing_current_db_rows'] : []),
    ...(missingProposedPathRows.length ? ['missing_proposed_storage_paths'] : []),
    ...(missingProposedSourceRows.length ? ['missing_proposed_image_sources'] : []),
  ];

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(PLAN_JSONL, plans.map((row) => JSON.stringify(row)).join('\n') + (plans.length ? '\n' : ''), 'utf8');

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'dry_run_no_write',
    source_upload_package_id: SOURCE_UPLOAD_PACKAGE_ID,
    source_upload_proof_hash: SOURCE_UPLOAD_PROOF_HASH,
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    upload_result_jsonl: path.relative(ROOT, UPLOAD_RESULT_JSONL),
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    manifest_rows: manifestRows.length,
    completed_manifest_rows: completedManifestRows.length,
    incomplete_upload_rows: incompleteManifestRows.length,
    unsupported_manifest_rows: unsupportedRows.length,
    unique_card_print_rows_in_scope: uniqueRowIds.length,
    metadata_pointer_plan_rows: plans.length,
    no_op_plan_rows: noOpRows.length,
    effective_metadata_pointer_updates: effectiveRows.length,
    rows_changing_image_status: rowsChangingStatus.length,
    rows_changing_image_note: rowsChangingNote.length,
    missing_current_db_rows: missingCurrentRows.length,
    missing_proposed_storage_paths: missingProposedPathRows.length,
    missing_proposed_image_sources: missingProposedSourceRows.length,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    runtime_public_url_field_writes_planned: false,
    planned_columns: ['image_source', 'image_path', 'image_status', 'image_note'],
    blocked_columns: ['id', 'gv_id', 'name', 'set_code', 'number', 'image_url', 'image_alt_url', 'representative_image_url'],
    target_tables: countBy(plans, (row) => row.target_table),
    proposed_image_sources: countBy(plans, (row) => row.proposed_values.image_source),
    proposed_image_statuses: countBy(plans, (row) => row.proposed_values.image_status),
    source_lanes: countBy(plans, (row) => row.source_lane),
    set_codes: countBy(plans, (row) => row.set_code),
    changed_column_sets: countBy(plans, (row) => row.changed_columns.join(',') || 'no_op'),
    stop_findings: stopFindings,
    ready_for_apply_package: stopFindings.length === 0,
    samples: {
      metadata_pointer_repoint: plans.slice(0, 20),
      no_op_plan_rows: noOpRows.slice(0, 20),
    },
  };
  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    source_upload_package_id: summary.source_upload_package_id,
    source_upload_proof_hash: summary.source_upload_proof_hash,
    completed_manifest_rows: summary.completed_manifest_rows,
    unique_card_print_rows_in_scope: summary.unique_card_print_rows_in_scope,
    effective_metadata_pointer_updates: summary.effective_metadata_pointer_updates,
    planned_columns: summary.planned_columns,
    target_tables: summary.target_tables,
    proposed_image_sources: summary.proposed_image_sources,
    proposed_image_statuses: summary.proposed_image_statuses,
    source_lanes: summary.source_lanes,
    plan_rows: plans.map((row) => ({
      target_table: row.target_table,
      target_row_id: row.target_row_id,
      proposed_values: row.proposed_values,
      changed_columns: row.changed_columns,
    })),
  });

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Source upload proof hash: \`${summary.source_upload_proof_hash}\`
- Manifest rows: ${summary.manifest_rows}
- Completed manifest rows: ${summary.completed_manifest_rows}
- Incomplete upload rows: ${summary.incomplete_upload_rows}
- Unsupported manifest rows: ${summary.unsupported_manifest_rows}
- Unique card_print rows in scope: ${summary.unique_card_print_rows_in_scope}
- Metadata pointer plan rows: ${summary.metadata_pointer_plan_rows}
- No-op plan rows: ${summary.no_op_plan_rows}
- Effective metadata pointer updates: ${summary.effective_metadata_pointer_updates}
- Rows changing image_status: ${summary.rows_changing_image_status}
- Rows changing image_note: ${summary.rows_changing_image_note}
- Ready for apply package: ${summary.ready_for_apply_package}
- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}
- Runtime public URL field writes planned: ${summary.runtime_public_url_field_writes_planned}
- Planned columns: ${summary.planned_columns.join(', ')}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}
- Exact image claim changes performed: ${summary.exact_image_claim_changes_performed}

## Target Tables

${markdownTable(topEntries(summary.target_tables))}

## Proposed Image Sources

${markdownTable(topEntries(summary.proposed_image_sources))}

## Proposed Image Statuses

${markdownTable(topEntries(summary.proposed_image_statuses))}

## Source Lanes

${markdownTable(topEntries(summary.source_lanes))}

## Sets

${markdownTable(topEntries(summary.set_codes, 40))}
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    fingerprint: summary.fingerprint,
    ready_for_apply_package: summary.ready_for_apply_package,
    stop_findings: summary.stop_findings,
    effective_metadata_pointer_updates: summary.effective_metadata_pointer_updates,
    planned_columns: summary.planned_columns,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
