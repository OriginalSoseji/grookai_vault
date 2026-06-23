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
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'base_set_print_run_lanes_v1');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'base_set_print_run_lanes_image_gap_audit_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'base_set_print_run_lanes_image_gap_audit_v1.md');
const PLAN_JSONL = path.join(OUTPUT_DIR, 'base_set_print_run_lanes_representative_parent_pointer_candidate_plan_v1.jsonl');
const PACKAGE_ID = 'BASE-SET-PRINT-RUN-LANES-IMAGE-GAP-AUDIT-V1';
const FUTURE_APPLY_PACKAGE_ID = 'BASE-SET-PRINT-RUN-LANES-REPRESENTATIVE-PARENT-IMAGE-POINTER-APPLY-V1';
const LANE_SET_CODES = ['base1-shadowless', 'base1-first-edition', 'base1-1999-2000'];

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

function hasAnyImageField(row, prefix = '') {
  return Boolean(
    clean(row[`${prefix}image_path`])
    || clean(row[`${prefix}image_url`])
    || clean(row[`${prefix}image_alt_url`])
    || clean(row[`${prefix}representative_image_url`])
  );
}

function isWeakImageStatus(value) {
  const normalized = clean(value)?.toLowerCase();
  return !normalized || normalized === 'missing' || normalized === 'unresolved' || normalized === 'blocked';
}

function isSelfHostedPath(value) {
  return clean(value)?.startsWith('warehouse-derived/self-hosted-images-v1/') ?? false;
}

function proposedNote(row) {
  const laneLabel = {
    'base1-shadowless': 'Shadowless',
    'base1-first-edition': '1st Edition',
    'base1-1999-2000': '1999-2000',
  }[row.set_code] ?? row.set_code;
  return [
    `Representative Base Set artwork pointer candidate from ordinary Base Set row ${row.base_gv_id}.`,
    `This is not an exact ${laneLabel} print-run image; exact lane image remains uncataloged.`,
    `Prepared by ${PACKAGE_ID}.`,
  ].join(' ');
}

function planForLaneRow(row) {
  const currentValues = {
    image_source: clean(row.image_source),
    image_path: clean(row.image_path),
    image_status: clean(row.image_status),
    image_note: clean(row.image_note),
  };
  const proposedValues = {
    image_source: 'identity',
    image_path: clean(row.base_image_path),
    image_status: 'representative_shared',
    image_note: proposedNote(row),
  };
  const changedColumns = Object.keys(proposedValues).filter((key) =>
    clean(currentValues[key]) !== clean(proposedValues[key]));

  return {
    package_id: FUTURE_APPLY_PACKAGE_ID,
    source_audit_package_id: PACKAGE_ID,
    plan_type: 'metadata_pointer_repoint',
    target_table: 'card_prints',
    target_row_id: row.id,
    gv_id: row.gv_id,
    name: row.name,
    set_code: row.set_code,
    set_name: row.set_name,
    number: row.number,
    number_plain: row.number_plain,
    variant_key: row.variant_key,
    printed_identity_modifier: row.printed_identity_modifier,
    representative_source_table: 'card_prints',
    representative_source_row_id: row.base_id,
    representative_source_gv_id: row.base_gv_id,
    representative_source_set_code: 'base1',
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

async function query(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

async function main() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let laneRows;
  let childRows;
  try {
    laneRows = await query(client, `
      select
        cp.id::text,
        cp.gv_id,
        cp.name,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.number_plain,
        cp.variant_key,
        cp.printed_identity_modifier,
        cp.image_source,
        cp.image_path,
        cp.image_url,
        cp.image_alt_url,
        cp.representative_image_url,
        cp.image_status,
        cp.image_note,
        base.id::text as base_id,
        base.gv_id as base_gv_id,
        base.image_source as base_image_source,
        base.image_path as base_image_path,
        base.image_url as base_image_url,
        base.image_alt_url as base_image_alt_url,
        base.representative_image_url as base_representative_image_url,
        base.image_status as base_image_status,
        base.image_note as base_image_note
      from public.card_prints cp
      left join public.sets s on s.code = cp.set_code
      left join public.card_prints base
        on base.set_code = 'base1'
       and lower(base.name) = lower(cp.name)
       and (
          (cp.number_plain is not null and base.number_plain = cp.number_plain)
          or (cp.number_plain is null and base.number = cp.number)
        )
       and coalesce(base.variant_key, '') = ''
       and coalesce(base.printed_identity_modifier, '') = ''
      where cp.set_code = any($1::text[])
      order by cp.set_code, cp.number_plain nulls last, cp.number, cp.gv_id
    `, [LANE_SET_CODES]);

    childRows = await query(client, `
      select
        cp.set_code,
        count(*)::int as child_rows,
        count(*) filter (where cpg.image_path is null and cpg.image_url is null and cpg.image_alt_url is null)::int as child_rows_without_any_image_field,
        count(*) filter (where cpg.image_status is null or cpg.image_status in ('missing', 'unresolved', 'blocked'))::int as child_rows_with_weak_status
      from public.card_printings cpg
      join public.card_prints cp on cp.id = cpg.card_print_id
      where cp.set_code = any($1::text[])
      group by cp.set_code
      order by cp.set_code
    `, [LANE_SET_CODES]);
  } finally {
    await client.end();
  }

  const laneRowsWithoutImageFields = laneRows.filter((row) => !hasAnyImageField(row));
  const laneRowsWithWeakStatus = laneRows.filter((row) => isWeakImageStatus(row.image_status));
  const missingBaseMatchRows = laneRows.filter((row) => !clean(row.base_id));
  const baseRowsWithoutImageFields = laneRows.filter((row) => clean(row.base_id) && !hasAnyImageField(row, 'base_'));
  const baseRowsWithoutSelfHostedPath = laneRows.filter((row) => clean(row.base_id) && !isSelfHostedPath(row.base_image_path));
  const candidateRows = laneRows.filter((row) =>
    !hasAnyImageField(row)
    && isWeakImageStatus(row.image_status)
    && clean(row.base_id)
    && isSelfHostedPath(row.base_image_path));
  const plans = candidateRows.map(planForLaneRow);
  const noOpPlans = plans.filter((row) => row.changed_columns.length === 0);
  const effectivePlans = plans.filter((row) => row.changed_columns.length > 0);

  const stopFindings = [
    ...(missingBaseMatchRows.length ? ['lane_rows_without_ordinary_base_match'] : []),
    ...(baseRowsWithoutImageFields.length ? ['ordinary_base_rows_without_image_fields'] : []),
    ...(baseRowsWithoutSelfHostedPath.length ? ['ordinary_base_rows_without_self_hosted_path'] : []),
  ];

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(PLAN_JSONL, plans.map((row) => JSON.stringify(row)).join('\n') + (plans.length ? '\n' : ''), 'utf8');

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'audit_and_dry_run_no_write',
    future_apply_package_id: FUTURE_APPLY_PACKAGE_ID,
    lane_set_codes: LANE_SET_CODES,
    lane_rows: laneRows.length,
    child_scope_rows_by_set: childRows,
    lane_rows_without_any_image_field: laneRowsWithoutImageFields.length,
    lane_rows_with_weak_image_status: laneRowsWithWeakStatus.length,
    missing_ordinary_base_match_rows: missingBaseMatchRows.length,
    ordinary_base_rows_without_image_fields: baseRowsWithoutImageFields.length,
    ordinary_base_rows_without_self_hosted_path: baseRowsWithoutSelfHostedPath.length,
    representative_candidate_rows: candidateRows.length,
    metadata_pointer_plan_rows: plans.length,
    no_op_plan_rows: noOpPlans.length,
    effective_metadata_pointer_updates: effectivePlans.length,
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
    set_codes: countBy(laneRows, (row) => row.set_code),
    current_image_statuses: countBy(laneRows, (row) => row.image_status ?? 'null'),
    current_image_sources: countBy(laneRows, (row) => row.image_source ?? 'null'),
    ordinary_base_image_statuses: countBy(laneRows, (row) => row.base_image_status ?? 'null'),
    ordinary_base_image_sources: countBy(laneRows, (row) => row.base_image_source ?? 'null'),
    proposed_image_statuses: countBy(plans, (row) => row.proposed_values.image_status),
    proposed_image_sources: countBy(plans, (row) => row.proposed_values.image_source),
    changed_column_sets: countBy(plans, (row) => row.changed_columns.join(',') || 'no_op'),
    stop_findings: stopFindings,
    ready_for_apply_package: stopFindings.length === 0 && effectivePlans.length > 0,
    samples: {
      lane_rows_without_any_image_field: laneRowsWithoutImageFields.slice(0, 20),
      representative_candidate_rows: candidateRows.slice(0, 20).map((row) => ({
        gv_id: row.gv_id,
        name: row.name,
        set_code: row.set_code,
        number: row.number,
        current_image_status: row.image_status,
        base_gv_id: row.base_gv_id,
        base_image_status: row.base_image_status,
        base_image_path: row.base_image_path,
      })),
      missing_ordinary_base_match_rows: missingBaseMatchRows.slice(0, 20),
      ordinary_base_rows_without_self_hosted_path: baseRowsWithoutSelfHostedPath.slice(0, 20),
    },
  };

  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    future_apply_package_id: summary.future_apply_package_id,
    lane_rows: summary.lane_rows,
    representative_candidate_rows: summary.representative_candidate_rows,
    effective_metadata_pointer_updates: summary.effective_metadata_pointer_updates,
    planned_columns: summary.planned_columns,
    proposed_image_statuses: summary.proposed_image_statuses,
    proposed_image_sources: summary.proposed_image_sources,
    plan_rows: plans.map((row) => ({
      target_table: row.target_table,
      target_row_id: row.target_row_id,
      gv_id: row.gv_id,
      representative_source_row_id: row.representative_source_row_id,
      proposed_values: row.proposed_values,
      changed_columns: row.changed_columns,
    })),
  });

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Future apply package: \`${summary.future_apply_package_id}\`
- Lane rows audited: ${summary.lane_rows}
- Lane rows without any image field: ${summary.lane_rows_without_any_image_field}
- Lane rows with weak image status: ${summary.lane_rows_with_weak_image_status}
- Missing ordinary Base Set matches: ${summary.missing_ordinary_base_match_rows}
- Ordinary Base rows without image fields: ${summary.ordinary_base_rows_without_image_fields}
- Ordinary Base rows without self-hosted image_path: ${summary.ordinary_base_rows_without_self_hosted_path}
- Representative candidate rows: ${summary.representative_candidate_rows}
- Effective metadata pointer updates in candidate plan: ${summary.effective_metadata_pointer_updates}
- Ready for apply package: ${summary.ready_for_apply_package}
- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}
- Planned columns: ${summary.planned_columns.join(', ')}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}
- Exact image claim changes performed: ${summary.exact_image_claim_changes_performed}
- Runtime public URL field writes planned: ${summary.runtime_public_url_field_writes_planned}

## Finding

The Base Set print-run lane rows were intentionally created with \`image_status = missing\` because exact Shadowless, 1st Edition, and 1999-2000 lane images were not cataloged at lane-creation time. This audit only proposes a representative ordinary Base Set artwork pointer for display continuity. It does not claim the representative art is an exact print-run image.

## Current Set Codes

${markdownTable(topEntries(summary.set_codes))}

## Current Image Statuses

${markdownTable(topEntries(summary.current_image_statuses))}

## Proposed Image Statuses

${markdownTable(topEntries(summary.proposed_image_statuses))}

## Proposed Image Sources

${markdownTable(topEntries(summary.proposed_image_sources))}

## Changed Column Sets

${markdownTable(topEntries(summary.changed_column_sets))}

## Child Rows By Set

${summary.child_scope_rows_by_set.length
    ? [
      '| set_code | child_rows | child_rows_without_any_image_field | child_rows_with_weak_status |',
      '| --- | ---: | ---: | ---: |',
      ...summary.child_scope_rows_by_set.map((row) => `| ${row.set_code} | ${row.child_rows} | ${row.child_rows_without_any_image_field} | ${row.child_rows_with_weak_status} |`),
    ].join('\n')
    : '_None._'}

## Apply Boundary

A future apply package, if approved, should update only \`card_prints.image_source\`, \`card_prints.image_path\`, \`card_prints.image_status\`, and \`card_prints.image_note\` for the candidate rows in \`${path.relative(ROOT, PLAN_JSONL)}\`.

It must not write storage, child rows, identity tables, price data, runtime public URL fields, or exact-image claims.
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    fingerprint: summary.fingerprint,
    ready_for_apply_package: summary.ready_for_apply_package,
    stop_findings: summary.stop_findings,
    lane_rows: summary.lane_rows,
    representative_candidate_rows: summary.representative_candidate_rows,
    effective_metadata_pointer_updates: summary.effective_metadata_pointer_updates,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
