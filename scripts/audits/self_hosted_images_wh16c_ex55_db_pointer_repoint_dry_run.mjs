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
const MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh16a_ex55_tcgcollector_upload_manifest_v1.jsonl');
const UPLOAD_RESULT_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh16b_ex55_tcgcollector_storage_upload_apply_result_v1.jsonl');
const PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh16c_ex55_db_pointer_repoint_plan_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh16c_ex55_db_pointer_repoint_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh16c_ex55_db_pointer_repoint_dry_run_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-16C-EX55-DB-POINTER-REPOINT-DRY-RUN';

const APPLY_SQL = `
with updates(id, image_source, image_path) as (
  values %VALUES%
)
update public.card_prints cp
set
  image_source = updates.image_source,
  image_path = updates.image_path
from updates
where cp.id = updates.id::uuid
  and (
    cp.image_source is distinct from updates.image_source
    or cp.image_path is distinct from updates.image_path
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

async function readJsonl(file) {
  const raw = await fs.readFile(file, 'utf8');
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function latestUploadResults(rows) {
  const latest = new Map();
  for (const row of rows) latest.set(`${row.target_storage_bucket}:${row.target_storage_path}`, row);
  return latest;
}

function isCompletedUpload(row) {
  return row?.uploaded === true || row?.status === 'skipped_existing_object';
}

async function fetchCurrentRows(client, ids) {
  const result = await client.query(
    `select id, gv_id, name, set_code, number, image_source, image_path, image_status, image_note
     from public.card_prints
     where id = any($1::uuid[])`,
    [ids],
  );
  return new Map(result.rows.map((row) => [row.id, row]));
}

async function main() {
  const manifestRows = await readJsonl(MANIFEST_JSONL);
  const uploadRows = await readJsonl(UPLOAD_RESULT_JSONL);
  const latestUploads = latestUploadResults(uploadRows);
  const completedManifestRows = manifestRows.filter((row) => isCompletedUpload(latestUploads.get(`${row.target_storage_bucket}:${row.target_storage_path}`)));
  const incompleteManifestRows = manifestRows.filter((row) => !isCompletedUpload(latestUploads.get(`${row.target_storage_bucket}:${row.target_storage_path}`)));

  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let currentRows;
  try {
    currentRows = await fetchCurrentRows(client, [...new Set(completedManifestRows.map((row) => row.source_row_id))]);
  } finally {
    await client.end();
  }

  const plans = completedManifestRows.map((row) => {
    const current = currentRows.get(row.source_row_id) ?? null;
    const proposedImageSource = row.proposed_db_plan?.proposed_image_source ?? 'identity';
    const proposedImagePath = row.target_storage_path;
    const changedColumns = [];
    if (clean(current?.image_source) !== proposedImageSource) changedColumns.push('image_source');
    if (clean(current?.image_path) !== proposedImagePath) changedColumns.push('image_path');
    return {
      package_id: PACKAGE_ID,
      plan_type: 'metadata_pointer_repoint',
      audit_key: `card_prints:${row.source_row_id}:metadata_pointer`,
      target_table: 'card_prints',
      target_row_id: row.source_row_id,
      gv_id: row.gv_id,
      name: row.name,
      set_code: row.set_code,
      number: row.number,
      source_route: row.source_route,
      upstream_source: row.upstream_source,
      upstream_card_id: row.upstream_card_id,
      target_storage_bucket: row.target_storage_bucket,
      target_storage_path: row.target_storage_path,
      current_values: {
        image_source: clean(current?.image_source),
        image_path: clean(current?.image_path),
        image_status: clean(current?.image_status),
        image_note: clean(current?.image_note),
      },
      proposed_values: {
        image_source: proposedImageSource,
        image_path: proposedImagePath,
        image_status: clean(current?.image_status),
        image_note: clean(current?.image_note),
      },
      changed_columns: changedColumns,
      preserved_columns: ['image_status', 'image_note'],
      db_write_performed: false,
      storage_write_performed: false,
      exact_image_claim_change: false,
    };
  });

  const effectivePlans = plans.filter((row) => row.changed_columns.length > 0);
  const missingCurrentRows = plans.filter((row) => !currentRows.has(row.target_row_id));
  const statusChanges = plans.filter((row) => row.current_values.image_status !== row.proposed_values.image_status);
  const noteChanges = plans.filter((row) => row.current_values.image_note !== row.proposed_values.image_note);
  const stopFindings = [
    ...(incompleteManifestRows.length ? ['incomplete_storage_uploads'] : []),
    ...(missingCurrentRows.length ? ['missing_current_db_rows'] : []),
    ...(statusChanges.length ? ['image_status_change_detected'] : []),
    ...(noteChanges.length ? ['image_note_change_detected'] : []),
  ];

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(PLAN_JSONL, `${plans.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');

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
    metadata_pointer_plan_rows: plans.length,
    effective_metadata_pointer_updates: effectivePlans.length,
    no_op_plan_rows: plans.length - effectivePlans.length,
    missing_current_db_rows: missingCurrentRows.length,
    image_status_changes_planned: statusChanges.length,
    image_note_changes_planned: noteChanges.length,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    runtime_public_url_field_writes_planned: false,
    planned_columns: ['card_prints.image_source', 'card_prints.image_path'],
    preserved_columns: ['card_prints.image_status', 'card_prints.image_note'],
    target_tables: countBy(plans, (row) => row.target_table),
    changed_columns: countBy(effectivePlans.flatMap((row) => row.changed_columns), (row) => row),
    by_set_code: countBy(effectivePlans, (row) => row.set_code),
    by_source_route: countBy(effectivePlans, (row) => row.source_route),
    by_current_image_status: countBy(effectivePlans, (row) => row.current_values.image_status ?? 'null'),
    stop_findings: stopFindings,
    ready_for_apply_package: stopFindings.length === 0 && effectivePlans.length > 0,
    sql_hash: sha256Hex(APPLY_SQL),
    samples: { metadata_pointer_repoint: effectivePlans.slice(0, 10) },
  };
  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    completed_manifest_rows: summary.completed_manifest_rows,
    effective_metadata_pointer_updates: summary.effective_metadata_pointer_updates,
    planned_columns: summary.planned_columns,
    preserved_columns: summary.preserved_columns,
    sql_hash: summary.sql_hash,
    updates: effectivePlans.map((row) => ({
      target_row_id: row.target_row_id,
      gv_id: row.gv_id,
      image_source: row.proposed_values.image_source,
      image_path: row.proposed_values.image_path,
      current_image_status: row.current_values.image_status,
      current_image_note: row.current_values.image_note,
    })),
  });

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- SQL hash: \`${summary.sql_hash}\`
- Manifest rows: ${summary.manifest_rows}
- Completed manifest rows: ${summary.completed_manifest_rows}
- Incomplete manifest rows: ${summary.incomplete_manifest_rows}
- Effective metadata pointer updates: ${summary.effective_metadata_pointer_updates}
- Ready for apply package: ${summary.ready_for_apply_package}
- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}
- Planned columns: ${summary.planned_columns.join(', ')}
- Preserved columns: ${summary.preserved_columns.join(', ')}
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
    stop_findings: summary.stop_findings,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
