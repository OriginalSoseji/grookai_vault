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
const PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh21a_residual_parent_child_pointer_plan_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh21a_residual_parent_child_pointer_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh21a_residual_parent_child_pointer_dry_run_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-21A-RESIDUAL-PARENT-CHILD-POINTER-DRY-RUN';

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

function markdownTable(rows) {
  if (!rows.length) return '_None._';
  return [
    '| key | count |',
    '| --- | ---: |',
    ...rows.map((row) => `| ${String(row.key).replace(/\|/g, '\\|')} | ${row.count} |`),
  ].join('\n');
}

function proposedStatusFor(row) {
  return clean(row.parent_variant_key)?.toLowerCase().includes('stamp')
    || clean(row.child_image_status)?.toLowerCase() === 'representative_shared_stamp'
    ? 'representative_shared_stamp'
    : 'representative_shared';
}

function proposedNoteFor(row, status) {
  const sourceLabel = clean(row.printing_gv_id) ?? `child:${row.child_id}`;
  const base = `${PACKAGE_ID}: representative parent display pointer copied from existing child image ${sourceLabel}; child_finish:${clean(row.finish_key) ?? 'unknown'}; child_status:${clean(row.child_image_status) ?? 'unknown'}.`;
  if (status === 'representative_shared_stamp') {
    return `${base} Stamped parent image remains representative only; no exact stamped parent image claim.`;
  }
  return `${base} Parent image remains representative only; no exact parent image claim.`;
}

async function fetchRows(client) {
  const result = await client.query(`
    with parent_gaps as (
      select
        cp.id,
        cp.gv_id,
        cp.name,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.variant_key,
        cp.image_source,
        cp.image_path,
        cp.image_status,
        cp.image_note
      from public.card_prints cp
      left join public.sets s on s.code = cp.set_code
      where nullif(trim(coalesce(cp.image_path,'')), '') is null
        and nullif(trim(coalesce(cp.image_url,'')), '') is null
        and nullif(trim(coalesce(cp.image_alt_url,'')), '') is null
        and nullif(trim(coalesce(cp.representative_image_url,'')), '') is null
    ),
    child_candidates as (
      select
        pg.*,
        cpg.id as child_id,
        cpg.printing_gv_id,
        cpg.finish_key,
        cpg.image_source as child_image_source,
        cpg.image_path as child_image_path,
        cpg.image_status as child_image_status,
        cpg.image_note as child_image_note,
        row_number() over (
          partition by pg.id
          order by
            case
              when cpg.finish_key = 'normal' then 0
              when cpg.finish_key = 'holo' then 1
              when cpg.finish_key = 'cosmos' then 2
              when cpg.finish_key = 'standard' then 3
              when cpg.finish_key = 'reverse' then 8
              else 5
            end,
            case
              when cpg.image_status = 'representative_shared_stamp' then 0
              when cpg.image_status = 'representative_shared' then 1
              when cpg.image_status = 'exact' then 2
              else 5
            end,
            cpg.printing_gv_id
        ) as rn
      from parent_gaps pg
      join public.card_printings cpg on cpg.card_print_id = pg.id
      where nullif(trim(coalesce(cpg.image_path,'')), '') is not null
    )
    select
      id::text as target_row_id,
      gv_id,
      name,
      set_code,
      set_name,
      number,
      variant_key as parent_variant_key,
      image_source as current_image_source,
      image_path as current_image_path,
      image_status as current_image_status,
      image_note as current_image_note,
      child_id::text,
      printing_gv_id,
      finish_key,
      child_image_source,
      child_image_path,
      child_image_status,
      child_image_note
    from child_candidates
    where rn = 1
    order by coalesce(set_code, 'unknown'), number, gv_id
  `);
  return result.rows;
}

async function fetchResidualParentGapRows(client) {
  const result = await client.query(`
    select
      cp.id::text,
      cp.gv_id,
      cp.name,
      cp.set_code,
      s.name as set_name,
      cp.number,
      cp.variant_key,
      cp.image_status,
      cp.image_note
    from public.card_prints cp
    left join public.sets s on s.code = cp.set_code
    where nullif(trim(coalesce(cp.image_path,'')), '') is null
      and nullif(trim(coalesce(cp.image_url,'')), '') is null
      and nullif(trim(coalesce(cp.image_alt_url,'')), '') is null
      and nullif(trim(coalesce(cp.representative_image_url,'')), '') is null
    order by coalesce(cp.set_code, 'unknown'), cp.number, cp.gv_id
  `);
  return result.rows;
}

async function main() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let rows;
  let residualParentGapRows;
  try {
    rows = await fetchRows(client);
    residualParentGapRows = await fetchResidualParentGapRows(client);
  } finally {
    await client.end();
  }

  const plans = rows.map((row) => {
    const proposedStatus = proposedStatusFor(row);
    const proposedSource = clean(row.child_image_source) ?? 'identity';
    const proposedPath = clean(row.child_image_path);
    const proposedNote = proposedNoteFor(row, proposedStatus);
    const changedColumns = [];
    if (clean(row.current_image_source) !== proposedSource) changedColumns.push('image_source');
    if (clean(row.current_image_path) !== proposedPath) changedColumns.push('image_path');
    if (clean(row.current_image_status) !== proposedStatus) changedColumns.push('image_status');
    if (clean(row.current_image_note) !== proposedNote) changedColumns.push('image_note');
    return {
      package_id: PACKAGE_ID,
      plan_type: 'residual_parent_representative_child_pointer',
      target_table: 'card_prints',
      target_row_id: row.target_row_id,
      gv_id: row.gv_id,
      name: row.name,
      set_code: row.set_code,
      set_name: row.set_name,
      number: row.number,
      parent_variant_key: clean(row.parent_variant_key),
      source_child_id: row.child_id,
      source_printing_gv_id: row.printing_gv_id,
      source_finish_key: row.finish_key,
      source_child_image_status: row.child_image_status,
      source_child_image_note: row.child_image_note,
      current_values: {
        image_source: clean(row.current_image_source),
        image_path: clean(row.current_image_path),
        image_status: clean(row.current_image_status),
        image_note: clean(row.current_image_note),
      },
      proposed_values: {
        image_source: proposedSource,
        image_path: proposedPath,
        image_status: proposedStatus,
        image_note: proposedNote,
      },
      changed_columns: changedColumns,
      db_write_performed: false,
      storage_write_performed: false,
      runtime_public_url_field_write: false,
      exact_image_claim_change: false,
    };
  });

  const effectivePlans = plans.filter((row) => row.changed_columns.length > 0);
  const parentGapIdsWithPlan = new Set(plans.map((row) => row.target_row_id));
  const unsupportedResidualRows = residualParentGapRows.filter((row) => !parentGapIdsWithPlan.has(row.id));
  const missingPaths = plans.filter((row) => !clean(row.proposed_values.image_path));
  const exactClaimChanges = plans.filter((row) => clean(row.proposed_values.image_status)?.toLowerCase() === 'exact');
  const unsupportedColumns = effectivePlans.flatMap((row) => row.changed_columns).filter((column) => !['image_source', 'image_path', 'image_status', 'image_note'].includes(column));
  const stopFindings = [
    ...(missingPaths.length ? ['missing_proposed_image_path'] : []),
    ...(exactClaimChanges.length ? ['exact_image_claim_change_detected'] : []),
    ...(unsupportedColumns.length ? ['unsupported_changed_columns'] : []),
  ];

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(PLAN_JSONL, `${plans.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'dry_run_no_write',
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    residual_parent_gap_rows_scanned: residualParentGapRows.length,
    target_parent_rows_with_existing_child_image: plans.length,
    effective_metadata_pointer_updates: effectivePlans.length,
    residual_parent_gap_rows_without_child_image_route: unsupportedResidualRows.length,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    runtime_public_url_field_writes_planned: false,
    global_apply_performed: false,
    target_table: 'card_prints',
    planned_columns: ['card_prints.image_source', 'card_prints.image_path', 'card_prints.image_status', 'card_prints.image_note'],
    preserved_columns: [
      'card_prints.id',
      'card_prints.gv_id',
      'card_prints.name',
      'card_prints.set_code',
      'card_prints.number',
      'card_prints.image_url',
      'card_prints.image_alt_url',
      'card_prints.representative_image_url',
    ],
    by_set_code: countBy(effectivePlans, (row) => row.set_code),
    by_source_finish_key: countBy(effectivePlans, (row) => row.source_finish_key),
    by_source_child_image_status: countBy(effectivePlans, (row) => row.source_child_image_status),
    proposed_statuses: countBy(effectivePlans, (row) => row.proposed_values.image_status),
    changed_columns: countBy(effectivePlans.flatMap((row) => row.changed_columns), (row) => row),
    unsupported_residual_by_set_code: countBy(unsupportedResidualRows, (row) => row.set_code),
    stop_findings: stopFindings,
    ready_for_apply_package: stopFindings.length === 0 && effectivePlans.length > 0,
    sql_hash: sha256Hex(APPLY_SQL),
    samples: {
      pointer_updates: effectivePlans.slice(0, 25),
      unsupported_residual_rows: unsupportedResidualRows.slice(0, 50),
    },
  };

  summary.plan_hash = proofHash({
    package_id: summary.package_id,
    target_table: summary.target_table,
    planned_columns: summary.planned_columns,
    updates: effectivePlans.map((row) => ({
      target_row_id: row.target_row_id,
      gv_id: row.gv_id,
      image_source: row.proposed_values.image_source,
      image_path: row.proposed_values.image_path,
      image_status: row.proposed_values.image_status,
      image_note: row.proposed_values.image_note,
      source_printing_gv_id: row.source_printing_gv_id,
    })),
  });
  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    effective_metadata_pointer_updates: summary.effective_metadata_pointer_updates,
    residual_parent_gap_rows_without_child_image_route: summary.residual_parent_gap_rows_without_child_image_route,
    planned_columns: summary.planned_columns,
    sql_hash: summary.sql_hash,
    plan_hash: summary.plan_hash,
  });

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Plan hash: \`${summary.plan_hash}\`
- SQL hash: \`${summary.sql_hash}\`
- Residual parent gap rows scanned: ${summary.residual_parent_gap_rows_scanned}
- Target parent rows with existing child image: ${summary.target_parent_rows_with_existing_child_image}
- Effective metadata pointer updates: ${summary.effective_metadata_pointer_updates}
- Residual parent gap rows without child-image route: ${summary.residual_parent_gap_rows_without_child_image_route}
- Ready for apply package: ${summary.ready_for_apply_package}
- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}
- Target table: \`${summary.target_table}\`
- Planned columns: ${summary.planned_columns.join(', ')}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}
- Exact image claim changes performed: ${summary.exact_image_claim_changes_performed}
- Runtime public URL field writes planned: ${summary.runtime_public_url_field_writes_planned}
- Global apply performed: ${summary.global_apply_performed}

## By Set

${markdownTable(topEntries(summary.by_set_code))}

## Source Finish

${markdownTable(topEntries(summary.by_source_finish_key))}

## Source Child Status

${markdownTable(topEntries(summary.by_source_child_image_status))}

## Proposed Status

${markdownTable(topEntries(summary.proposed_statuses))}

## Changed Columns

${markdownTable(topEntries(summary.changed_columns))}

## Unsupported Residual Rows

${markdownTable(topEntries(summary.unsupported_residual_by_set_code))}
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    fingerprint: summary.fingerprint,
    plan_hash: summary.plan_hash,
    sql_hash: summary.sql_hash,
    ready_for_apply_package: summary.ready_for_apply_package,
    effective_metadata_pointer_updates: summary.effective_metadata_pointer_updates,
    residual_parent_gap_rows_without_child_image_route: summary.residual_parent_gap_rows_without_child_image_route,
    stop_findings: summary.stop_findings,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
