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
const PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh15a_same_set_normalized_pointer_plan_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh15a_same_set_normalized_pointer_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh15a_same_set_normalized_pointer_dry_run_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-15A-SAME-SET-NORMALIZED-POINTER-DRY-RUN';

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

async function fetchPlanRows(client) {
  const result = await client.query(`
    with missing as (
      select
        cp.*,
        regexp_replace(upper(coalesce(cp.number,'')), '^([A-Z]+)0+(\\d+)$', '\\1\\2') as norm_number,
        regexp_replace(regexp_replace(upper(coalesce(cp.number,'')), '^([0-9]+)[A-Z]$', '\\1'), '^0+(\\d)$', '\\1') as base_number
      from public.card_prints cp
      where cp.image_path is null
        and cp.set_code is not null
        and cp.set_code not like 'wcd%'
    ),
    sourced as (
      select
        cp.*,
        regexp_replace(upper(coalesce(cp.number,'')), '^([A-Z]+)0+(\\d+)$', '\\1\\2') as norm_number,
        regexp_replace(regexp_replace(upper(coalesce(cp.number,'')), '^([0-9]+)[A-Z]$', '\\1'), '^0+(\\d)$', '\\1') as base_number
      from public.card_prints cp
      where cp.image_path is not null
        and cp.image_source = 'identity'
        and cp.set_code is not null
    ),
    candidates as (
      select
        m.id as target_row_id,
        m.gv_id,
        m.name,
        m.set_code,
        m.number,
        m.image_source as current_image_source,
        m.image_path as current_image_path,
        m.image_status as current_image_status,
        m.image_note as current_image_note,
        s.id as source_row_id,
        s.gv_id as source_gv_id,
        s.number as source_number,
        s.image_path as source_image_path,
        s.image_status as source_image_status,
        case
          when upper(m.number) = upper(s.number) then 'exact_number'
          when m.norm_number = s.norm_number then 'normalized_number'
          when m.base_number = s.base_number then 'base_suffix_number'
          else 'none'
        end as match_type,
        row_number() over (
          partition by m.id
          order by
            case
              when upper(m.number) = upper(s.number) then 0
              when m.norm_number = s.norm_number then 1
              when m.base_number = s.base_number then 2
              else 9
            end,
            case when s.image_status = 'exact' then 0 else 1 end,
            s.gv_id
        ) as rn
      from missing m
      join sourced s
        on lower(s.name) = lower(m.name)
       and s.set_code = m.set_code
       and m.id <> s.id
      where
        upper(m.number) = upper(s.number)
        or m.norm_number = s.norm_number
        or m.base_number = s.base_number
    )
    select *
    from candidates
    where rn = 1
    order by set_code, number, gv_id
  `);

  return result.rows.map((row) => {
    const proposedStatus = 'representative_shared';
    const proposedNote = `Same-set normalized-number representative image from source card ${row.source_gv_id}. This display image is not an exact image claim for ${row.gv_id}; exact row-specific artwork remains uncataloged. Prepared by ${PACKAGE_ID}.`;
    const proposedSource = 'identity';
    const proposedPath = clean(row.source_image_path);
    const changedColumns = [];
    if (clean(row.current_image_source) !== proposedSource) changedColumns.push('image_source');
    if (clean(row.current_image_path) !== proposedPath) changedColumns.push('image_path');
    if (clean(row.current_image_status) !== proposedStatus) changedColumns.push('image_status');
    if (clean(row.current_image_note) !== proposedNote) changedColumns.push('image_note');
    return {
      package_id: PACKAGE_ID,
      plan_type: 'same_set_normalized_representative_pointer',
      target_table: 'card_prints',
      target_row_id: row.target_row_id,
      gv_id: row.gv_id,
      name: row.name,
      set_code: row.set_code,
      number: row.number,
      source_row_id: row.source_row_id,
      source_gv_id: row.source_gv_id,
      source_number: row.source_number,
      source_image_status: row.source_image_status,
      match_type: row.match_type,
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
      exact_image_claim_change: false,
    };
  });
}

async function main() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let plans;
  try {
    plans = await fetchPlanRows(client);
  } finally {
    await client.end();
  }

  const effectivePlans = plans.filter((row) => row.changed_columns.length > 0);
  const missingSources = plans.filter((row) => !clean(row.proposed_values.image_path) || !row.source_gv_id);
  const unsupportedColumns = effectivePlans.flatMap((row) => row.changed_columns).filter((column) => !['image_source', 'image_path', 'image_status', 'image_note'].includes(column));
  const nonRepresentative = plans.filter((row) => row.proposed_values.image_status !== 'representative_shared');
  const stopFindings = [
    ...(missingSources.length ? ['missing_same_set_source_rows'] : []),
    ...(unsupportedColumns.length ? ['unsupported_changed_columns'] : []),
    ...(nonRepresentative.length ? ['unexpected_non_representative_status'] : []),
  ];

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(PLAN_JSONL, `${plans.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'dry_run_no_write',
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    target_rows: plans.length,
    effective_metadata_pointer_updates: effectivePlans.length,
    missing_source_rows: missingSources.length,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    runtime_public_url_field_writes_planned: false,
    planned_columns: ['card_prints.image_source', 'card_prints.image_path', 'card_prints.image_status', 'card_prints.image_note'],
    target_tables: countBy(plans, (row) => row.target_table),
    by_set_code: countBy(effectivePlans, (row) => row.set_code),
    by_match_type: countBy(effectivePlans, (row) => row.match_type),
    by_source_image_status: countBy(effectivePlans, (row) => row.source_image_status ?? 'null'),
    changed_columns: countBy(effectivePlans.flatMap((row) => row.changed_columns), (row) => row),
    proposed_statuses: countBy(effectivePlans, (row) => row.proposed_values.image_status),
    stop_findings: stopFindings,
    ready_for_apply_package: stopFindings.length === 0 && effectivePlans.length > 0,
    sql_hash: sha256Hex(APPLY_SQL),
    samples: {
      pointer_updates: effectivePlans.slice(0, 20),
      missing_sources: missingSources,
    },
  };
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
      source_gv_id: row.source_gv_id,
      match_type: row.match_type,
    })),
  });

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- SQL hash: \`${summary.sql_hash}\`
- Target rows: ${summary.target_rows}
- Effective metadata pointer updates: ${summary.effective_metadata_pointer_updates}
- Missing source rows: ${summary.missing_source_rows}
- Ready for apply package: ${summary.ready_for_apply_package}
- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}
- Planned columns: ${summary.planned_columns.join(', ')}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}
- Exact image claim changes performed: ${summary.exact_image_claim_changes_performed}

## By Set

${markdownTable(topEntries(summary.by_set_code))}

## By Match Type

${markdownTable(topEntries(summary.by_match_type))}

## Source Image Status

${markdownTable(topEntries(summary.by_source_image_status))}

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
