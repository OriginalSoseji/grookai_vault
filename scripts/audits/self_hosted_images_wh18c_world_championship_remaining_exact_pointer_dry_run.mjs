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
const MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh18a_world_championship_remaining_exact_upload_manifest_v1.jsonl');
const UPLOAD_RESULT_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh18b_world_championship_remaining_exact_storage_upload_apply_result_v1.json');
const UPLOAD_RESULT_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh18b_world_championship_remaining_exact_storage_upload_apply_result_v1.jsonl');
const PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh18c_world_championship_remaining_exact_pointer_plan_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh18c_world_championship_remaining_exact_pointer_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh18c_world_championship_remaining_exact_pointer_dry_run_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-18C-WORLD-CHAMPIONSHIP-REMAINING-EXACT-POINTER-DRY-RUN';

const APPLY_SQL = `
with updates(id, image_source, image_path, image_status, image_note) as (
  values %VALUES%
)
update public.card_prints cp
set
  image_source = updates.image_source,
  image_path = updates.image_path,
  image_status = updates.image_status,
  image_note = updates.image_note
from updates
where cp.id = updates.id::uuid
  and (
    cp.image_source is distinct from updates.image_source
    or cp.image_path is distinct from updates.image_path
    or cp.image_status is distinct from updates.image_status
    or cp.image_note is distinct from updates.image_note
  );
`.trim();

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

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
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

function markdownTable(rows) {
  if (!rows.length) return '_None._';
  return [
    '| key | count |',
    '| --- | ---: |',
    ...rows.map((row) => `| ${String(row.key).replace(/\|/g, '\\|')} | ${row.count} |`),
  ].join('\n');
}

function topEntries(counts, limit = 25) {
  return Object.entries(counts)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

async function fetchCurrentRows(ids) {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(`
      select
        cp.id::text,
        cp.gv_id,
        cp.name,
        cp.set_code,
        cp.number,
        cp.variant_key,
        cp.printed_identity_modifier,
        cp.image_source,
        cp.image_path,
        cp.image_status,
        cp.image_note
      from public.card_prints cp
      where cp.id = any($1::uuid[])
    `, [ids]);
    return new Map(result.rows.map((row) => [row.id, row]));
  } finally {
    await client.end();
  }
}

function latestCompletedUploads(uploadRows) {
  const byPath = new Map();
  for (const row of uploadRows) {
    byPath.set(`${row.target_storage_bucket}:${row.target_storage_path}`, row);
  }
  return byPath;
}

function imageNote(row) {
  return `${PACKAGE_ID}: exact World Championship Deck image from PriceCharting direct product page ${row.source_url}.`;
}

async function main() {
  const manifestRows = await readJsonl(MANIFEST_JSONL);
  const uploadResult = await readJson(UPLOAD_RESULT_JSON);
  const uploadRows = await readJsonl(UPLOAD_RESULT_JSONL);
  const completedByPath = latestCompletedUploads(uploadRows);
  const completedManifestRows = manifestRows.filter((row) => {
    const upload = completedByPath.get(`${row.asset?.target_storage_bucket}:${row.asset?.target_storage_path}`);
    return upload?.status === 'uploaded' || upload?.status === 'skipped_existing_object';
  });
  const currentById = await fetchCurrentRows(manifestRows.map((row) => row.id));

  const stopFindings = [];
  if (uploadResult.package_id !== 'IMG-HOST-WH-18B-WORLD-CHAMPIONSHIP-REMAINING-EXACT-STORAGE-UPLOAD-APPLY') {
    stopFindings.push('upload_result_package_mismatch');
  }
  if (uploadResult.failed_count_latest !== 0) stopFindings.push('upload_failures_present');
  if (completedManifestRows.length !== manifestRows.length) stopFindings.push('upload_completion_count_mismatch');

  const plans = [];
  for (const row of manifestRows) {
    const current = currentById.get(row.id);
    const upload = completedByPath.get(`${row.asset?.target_storage_bucket}:${row.asset?.target_storage_path}`);
    const rowFindings = [];
    if (!current) rowFindings.push('current_db_row_missing');
    if (!upload || upload.status !== 'uploaded') rowFindings.push('storage_upload_not_completed');
    if (current?.gv_id !== row.gv_id) rowFindings.push('gv_id_mismatch');
    if (current?.variant_key !== 'world_championship_deck_replica') rowFindings.push('not_wcd_replica_row');
    if (current?.set_code !== row.set_code) rowFindings.push('set_code_mismatch');
    if (current?.image_status !== 'representative_shared') rowFindings.push('current_status_not_representative_shared');
    if (!String(current?.image_note ?? '').includes('not an exact')) rowFindings.push('current_note_missing_previous_honesty_phrase');

    const proposedValues = {
      image_source: 'identity',
      image_path: row.asset?.target_storage_path ?? null,
      image_status: 'exact',
      image_note: imageNote(row),
    };
    const currentValues = {
      image_source: clean(current?.image_source),
      image_path: clean(current?.image_path),
      image_status: clean(current?.image_status),
      image_note: clean(current?.image_note),
    };
    const changedColumns = [];
    if (currentValues.image_source !== proposedValues.image_source) changedColumns.push('image_source');
    if (currentValues.image_path !== proposedValues.image_path) changedColumns.push('image_path');
    if (currentValues.image_status !== proposedValues.image_status) changedColumns.push('image_status');
    if (currentValues.image_note !== proposedValues.image_note) changedColumns.push('image_note');

    for (const finding of rowFindings) stopFindings.push(`${finding}:${row.gv_id}`);
    plans.push({
      package_id: PACKAGE_ID,
      plan_type: 'exact_world_championship_parent_pointer',
      target_table: 'card_prints',
      target_row_id: row.id,
      gv_id: row.gv_id,
      name: row.name,
      set_code: row.set_code,
      number: row.number,
      source_url: row.source_url,
      asset_url: row.asset_url,
      target_storage_bucket: row.asset?.target_storage_bucket,
      target_storage_path: row.asset?.target_storage_path,
      current_values: currentValues,
      proposed_values: proposedValues,
      changed_columns: changedColumns,
      validation_findings: rowFindings,
      db_write_performed: false,
      storage_write_performed: false,
      exact_image_claim_change: currentValues.image_status !== proposedValues.image_status,
    });
  }

  await fs.writeFile(PLAN_JSONL, `${plans.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
  const effectivePlans = plans.filter((row) => row.changed_columns.length > 0);
  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'dry_run_no_write',
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    upload_result_json: path.relative(ROOT, UPLOAD_RESULT_JSON),
    upload_result_jsonl: path.relative(ROOT, UPLOAD_RESULT_JSONL),
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    manifest_rows: manifestRows.length,
    completed_upload_rows: completedManifestRows.length,
    cumulative_completed_upload_rows: uploadResult.completed_count_total,
    effective_metadata_pointer_updates: effectivePlans.length,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_planned: effectivePlans.filter((row) => row.exact_image_claim_change).length,
    exact_image_claim_changes_performed: false,
    runtime_public_url_field_writes_planned: false,
    planned_columns: ['card_prints.image_source', 'card_prints.image_path', 'card_prints.image_status', 'card_prints.image_note'],
    target_tables: countBy(plans, (row) => row.target_table),
    by_set_code: countBy(effectivePlans, (row) => row.set_code),
    changed_columns: countBy(effectivePlans.flatMap((row) => row.changed_columns), (row) => row),
    proposed_statuses: countBy(effectivePlans, (row) => row.proposed_values.image_status),
    stop_findings: [...new Set(stopFindings)].slice(0, 200),
    sql_hash: sha256Hex(APPLY_SQL),
    samples: {
      pointer_updates: effectivePlans.slice(0, 20),
    },
  };
  summary.ready_for_apply_package = summary.stop_findings.length === 0 && summary.effective_metadata_pointer_updates > 0;
  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    effective_metadata_pointer_updates: summary.effective_metadata_pointer_updates,
    planned_columns: summary.planned_columns,
    sql_hash: summary.sql_hash,
    updates: effectivePlans.map((row) => ({
      target_row_id: row.target_row_id,
      gv_id: row.gv_id,
      image_source: row.proposed_values.image_source,
      image_path: row.proposed_values.image_path,
      image_status: row.proposed_values.image_status,
      image_note: row.proposed_values.image_note,
      source_url: row.source_url,
    })),
  });

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- SQL hash: \`${summary.sql_hash}\`
- Manifest rows: ${summary.manifest_rows}
- Completed upload rows: ${summary.completed_upload_rows}
- Effective metadata pointer updates: ${summary.effective_metadata_pointer_updates}
- Exact image claim changes planned: ${summary.exact_image_claim_changes_planned}
- Ready for apply package: ${summary.ready_for_apply_package}
- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}
- Planned columns: ${summary.planned_columns.join(', ')}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}
- Exact image claim changes performed: ${summary.exact_image_claim_changes_performed}

## By Set

${markdownTable(topEntries(summary.by_set_code))}

## Changed Columns

${markdownTable(topEntries(summary.changed_columns))}
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    fingerprint: summary.fingerprint,
    sql_hash: summary.sql_hash,
    ready_for_apply_package: summary.ready_for_apply_package,
    effective_metadata_pointer_updates: summary.effective_metadata_pointer_updates,
    exact_image_claim_changes_planned: summary.exact_image_claim_changes_planned,
    stop_findings: summary.stop_findings,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});

