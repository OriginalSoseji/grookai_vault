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
const SOURCE_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh07a_residual_gap_audit_summary_v1.json');
const SOURCE_PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh07a_residual_child_pointer_candidate_plan_v1.jsonl');
const PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh07b_child_pointer_repoint_plan_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh07b_child_pointer_repoint_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh07b_child_pointer_repoint_dry_run_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-07B-CHILD-POINTER-REPOINT-DRY-RUN';
const SOURCE_PACKAGE_ID = 'IMG-HOST-WH-07A-RESIDUAL-GAP-AUDIT';
const SOURCE_FINGERPRINT = '3399d42b031e37492748bcdd8f1fd5c4f9b7fc46a2946330f661bc4baf16d340';
const ALLOWED_COLUMNS = ['image_source', 'image_path', 'image_status', 'image_note'];
const ALLOWED_FAMILIES = new Set(['mcdonalds', 'trainer_kit']);

function requireDbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
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
  return crypto.createHash('sha256').update(JSON.stringify(canonicalizeJson(value))).digest('hex');
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

function topEntries(counts, limit = 50) {
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
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

async function fetchCurrentRows(client, ids) {
  const current = new Map();
  for (const batch of chunk(ids, 1000)) {
    const result = await client.query(
      `select
         id::text,
         image_source,
         image_path,
         image_url,
         image_alt_url,
         image_status,
         image_note
       from public.card_printings
       where id = any($1::uuid[])`,
      [batch],
    );
    for (const row of result.rows) current.set(row.id, row);
  }
  return current;
}

function hasExistingChildImage(row) {
  return Boolean(clean(row?.image_path) || clean(row?.image_url) || clean(row?.image_alt_url));
}

function buildPlanRows(sourceRows, currentRows) {
  const stopFindings = [];
  const plans = [];

  for (const row of sourceRows) {
    const current = currentRows.get(row.target_row_id);
    if (!current) {
      stopFindings.push(`missing_current_child:${row.target_row_id}`);
      continue;
    }
    if (row.plan_type !== 'child_metadata_pointer_candidate') {
      stopFindings.push(`unsupported_plan_type:${row.plan_type}`);
      continue;
    }
    if (!ALLOWED_FAMILIES.has(row.family)) {
      stopFindings.push(`unsupported_family:${row.family}:${row.target_row_id}`);
      continue;
    }
    if (row.exact_image_claim_change === true) {
      stopFindings.push(`exact_image_claim_change:${row.target_row_id}`);
      continue;
    }
    if (row.storage_write_required === true) {
      stopFindings.push(`storage_write_required:${row.target_row_id}`);
      continue;
    }
    if (row.runtime_public_url_field_write_required === true) {
      stopFindings.push(`runtime_public_url_write_required:${row.target_row_id}`);
      continue;
    }
    if (hasExistingChildImage(current)) {
      stopFindings.push(`child_now_has_image:${row.target_row_id}`);
      continue;
    }

    const proposed = row.proposed_values ?? {};
    if (clean(proposed.image_source) !== 'identity') {
      stopFindings.push(`non_identity_source:${row.target_row_id}`);
      continue;
    }
    if (!clean(proposed.image_path)?.startsWith('warehouse-derived/self-hosted-images-v1/')) {
      stopFindings.push(`non_self_hosted_path:${row.target_row_id}`);
      continue;
    }
    if (!clean(proposed.image_status)?.startsWith('representative_')) {
      stopFindings.push(`non_representative_child_status:${row.target_row_id}`);
      continue;
    }
    if (!clean(proposed.image_note)) {
      stopFindings.push(`missing_image_note:${row.target_row_id}`);
      continue;
    }

    const currentValues = {
      image_source: clean(current.image_source),
      image_path: clean(current.image_path),
      image_status: clean(current.image_status),
      image_note: clean(current.image_note),
    };
    const proposedValues = {
      image_source: clean(proposed.image_source),
      image_path: clean(proposed.image_path),
      image_status: clean(proposed.image_status),
      image_note: clean(proposed.image_note),
    };
    const changedColumns = ALLOWED_COLUMNS.filter((column) => currentValues[column] !== proposedValues[column]);
    if (changedColumns.length === 0) continue;

    plans.push({
      package_id: PACKAGE_ID,
      plan_type: 'child_metadata_pointer_repoint',
      source_package_id: SOURCE_PACKAGE_ID,
      source_fingerprint: SOURCE_FINGERPRINT,
      target_table: 'card_printings',
      target_row_id: row.target_row_id,
      printing_gv_id: row.printing_gv_id,
      finish_key: row.finish_key,
      parent_card_print_id: row.parent_card_print_id,
      parent_gv_id: row.parent_gv_id,
      name: row.name,
      set_code: row.set_code,
      set_name: row.set_name,
      number: row.number,
      family: row.family,
      current_values: currentValues,
      proposed_values: proposedValues,
      changed_columns: changedColumns,
      exact_image_claim_change: false,
      storage_write_required: false,
      runtime_public_url_field_write_required: false,
      allowed_future_columns: ALLOWED_COLUMNS,
      blocked_future_columns: row.blocked_future_columns,
      db_write_performed: false,
      storage_write_performed: false,
    });
  }

  return { plans, stopFindings: [...new Set(stopFindings)].slice(0, 200) };
}

async function main() {
  const sourceSummary = await readJson(SOURCE_SUMMARY_JSON);
  const sourceRows = await readJsonl(SOURCE_PLAN_JSONL);
  const stopFindings = [];
  if (sourceSummary.package_id !== SOURCE_PACKAGE_ID) {
    stopFindings.push(`source_package_mismatch:${sourceSummary.package_id}`);
  }
  if (sourceSummary.fingerprint !== SOURCE_FINGERPRINT) {
    stopFindings.push(`source_fingerprint_mismatch:${sourceSummary.fingerprint}`);
  }
  if (sourceSummary.db_writes_performed !== false || sourceSummary.storage_writes_performed !== false) {
    stopFindings.push('source_audit_was_not_read_only');
  }

  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let currentRows;
  try {
    currentRows = await fetchCurrentRows(client, sourceRows.map((row) => row.target_row_id));
  } finally {
    await client.end();
  }

  const built = buildPlanRows(sourceRows, currentRows);
  stopFindings.push(...built.stopFindings);

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'dry_run_no_write',
    source_package_id: SOURCE_PACKAGE_ID,
    source_fingerprint: SOURCE_FINGERPRINT,
    source_candidate_rows: sourceRows.length,
    current_child_rows_found: currentRows.size,
    metadata_pointer_plan_rows: built.plans.length,
    effective_metadata_pointer_updates: built.plans.length,
    planned_columns: ALLOWED_COLUMNS,
    target_tables: countBy(built.plans, (row) => row.target_table),
    families: countBy(built.plans, (row) => row.family),
    set_codes: countBy(built.plans, (row) => row.set_code),
    proposed_image_sources: countBy(built.plans, (row) => row.proposed_values.image_source),
    proposed_image_statuses: countBy(built.plans, (row) => row.proposed_values.image_status),
    changed_column_sets: countBy(built.plans, (row) => row.changed_columns.join(',')),
    stop_findings: stopFindings,
    ready_for_apply_package: stopFindings.length === 0,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    runtime_public_url_field_writes_planned: false,
    parent_overwrites_performed: false,
    global_apply_performed: false,
    samples: {
      metadata_pointer_repoint: built.plans.slice(0, 25),
    },
  };
  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    source_package_id: summary.source_package_id,
    source_fingerprint: summary.source_fingerprint,
    effective_metadata_pointer_updates: summary.effective_metadata_pointer_updates,
    planned_columns: summary.planned_columns,
    target_tables: summary.target_tables,
    families: summary.families,
    set_codes: summary.set_codes,
    proposed_image_sources: summary.proposed_image_sources,
    proposed_image_statuses: summary.proposed_image_statuses,
    plan_rows: built.plans.map((row) => ({
      target_table: row.target_table,
      target_row_id: row.target_row_id,
      proposed_values: row.proposed_values,
      changed_columns: row.changed_columns,
    })),
  });

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(PLAN_JSONL, built.plans.map((row) => JSON.stringify(row)).join('\n') + (built.plans.length ? '\n' : ''), 'utf8');
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Source package: ${summary.source_package_id}
- Source fingerprint: \`${summary.source_fingerprint}\`
- Source candidate rows: ${summary.source_candidate_rows}
- Current child rows found: ${summary.current_child_rows_found}
- Metadata pointer plan rows: ${summary.metadata_pointer_plan_rows}
- Effective metadata pointer updates: ${summary.effective_metadata_pointer_updates}
- Ready for apply package: ${summary.ready_for_apply_package}
- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}
- Runtime public URL field writes planned: ${summary.runtime_public_url_field_writes_planned}
- Planned columns: ${summary.planned_columns.join(', ')}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}
- Exact image claim changes performed: ${summary.exact_image_claim_changes_performed}
- Parent overwrites performed: ${summary.parent_overwrites_performed}
- Global apply performed: ${summary.global_apply_performed}

## Target Tables

${markdownTable(topEntries(summary.target_tables))}

## Families

${markdownTable(topEntries(summary.families))}

## Sets

${markdownTable(topEntries(summary.set_codes))}

## Proposed Image Sources

${markdownTable(topEntries(summary.proposed_image_sources))}

## Proposed Image Statuses

${markdownTable(topEntries(summary.proposed_image_statuses))}
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
