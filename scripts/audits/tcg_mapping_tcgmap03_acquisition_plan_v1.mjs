import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/tcg_mapping_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'tcgmap03_acquisition_plan_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'tcgmap03_acquisition_plan_v1.md');

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

async function queryRows(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

async function queryOne(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows[0] ?? {};
}

const BASE_CTE = `
with child_agg as (
  select
    card_print_id,
    count(*)::int as child_printings,
    count(distinct finish_key)::int as distinct_finish_count,
    array_agg(distinct finish_key order by finish_key) filter (where finish_key is not null) as finish_keys
  from public.card_printings
  group by card_print_id
),
mapping_agg as (
  select
    card_print_id,
    bool_or(source = 'tcgplayer' and active) as has_tcgplayer,
    bool_or(source = 'justtcg' and active) as has_justtcg,
    bool_or(source = 'tcgdex' and active) as has_tcgdex,
    bool_or(source = 'pricecharting' and active) as has_pricecharting
  from public.external_mappings
  where active = true
  group by card_print_id
),
base_scope as (
  select
    cp.id as card_print_uuid,
    cp.id::text as card_print_id,
    cp.set_code,
    s.name as set_name,
    s.release_date,
    cp.number,
    cp.name,
    cp.gv_id,
    coalesce(ca.child_printings, 0) as child_printings,
    coalesce(ca.distinct_finish_count, 0) as distinct_finish_count,
    coalesce(ca.finish_keys, array[]::text[]) as finish_keys,
    coalesce(ma.has_tcgplayer, false) as has_tcgplayer,
    coalesce(ma.has_justtcg, false) as has_justtcg,
    coalesce(ma.has_tcgdex, false) as has_tcgdex,
    coalesce(ma.has_pricecharting, false) as has_pricecharting
  from public.card_prints cp
  left join public.sets s on s.id = cp.set_id
  left join child_agg ca on ca.card_print_id = cp.id
  left join mapping_agg ma on ma.card_print_id = cp.id
  where cp.identity_domain = 'pokemon_eng_standard'
),
missing_tcgplayer as (
  select *
  from base_scope
  where not has_tcgplayer
),
justtcg_rows as (
  select
    m.*,
    em.external_id as justtcg_external_id,
    nullif(btrim(em.meta->>'tcgplayer_external_id'), '') as preserved_tcgplayer_external_id,
    em.meta as justtcg_meta
  from missing_tcgplayer m
  join public.external_mappings em
    on em.card_print_id = m.card_print_uuid
   and em.source = 'justtcg'
   and em.active = true
),
justtcg_candidate as (
  select
    jr.*,
    count(*) over (partition by jr.card_print_uuid) as active_justtcg_rows_for_parent,
    count(*) filter (where jr.preserved_tcgplayer_external_id is not null) over (partition by jr.preserved_tcgplayer_external_id) as batch_preserved_tcgplayer_id_count,
    exists (
      select 1
      from public.external_mappings existing
      where existing.source = 'tcgplayer'
        and existing.external_id = jr.preserved_tcgplayer_external_id
    ) as external_id_exists_anywhere
  from justtcg_rows jr
)`;

function buildMarkdown(report) {
  const lines = [];
  lines.push('# TCGMAP-03 Acquisition Plan V1');
  lines.push('');
  lines.push('Read-only plan for reducing remaining no-TCGplayer mapping rows after TCGMAP-01A. No DB writes, no migrations, no cleanup.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- fingerprint: \`${report.fingerprint_sha256}\``);
  lines.push(`- generated_at: \`${report.generated_at}\``);
  lines.push(`- missing_tcgplayer_parent_rows: ${report.totals.missing_tcgplayer_parent_rows}`);
  lines.push(`- justtcg_only_parent_rows: ${report.totals.justtcg_only_parent_rows}`);
  lines.push(`- tcgdex_only_parent_rows: ${report.totals.tcgdex_only_parent_rows}`);
  lines.push(`- no_pricing_mapping_parent_rows: ${report.totals.no_pricing_mapping_parent_rows}`);
  lines.push(`- ready_from_justtcg_preserved_tcgplayer_id: ${report.totals.ready_from_justtcg_preserved_tcgplayer_id}`);
  lines.push('');
  lines.push('## JustTCG Preserved TCGplayer ID Classification');
  lines.push('');
  lines.push(markdownTable(report.justtcg_preserved_id_buckets, [
    { label: 'classification', value: (row) => row.classification },
    { label: 'rows', value: (row) => row.rows },
    { label: 'parents', value: (row) => row.parents },
    { label: 'sets', value: (row) => row.sets },
  ]));
  lines.push('');
  lines.push('## Recommended Package');
  lines.push('');
  if (report.totals.ready_from_justtcg_preserved_tcgplayer_id > 0) {
    lines.push('Recommended next package: `TCGMAP-03A-JUSTTCG-PRESERVED-TCGPLAYER-MAPPING-INSERTS` guarded dry-run only.');
    lines.push('This package should insert only rows classified as `ready_from_justtcg_preserved_tcgplayer_id` from this report fingerprint.');
  } else {
    lines.push('No insert package is recommended from this report.');
  }
  lines.push('');
  lines.push('## Ready Sample');
  lines.push('');
  lines.push(markdownTable(report.ready_rows.slice(0, 25), [
    { label: 'set', value: (row) => row.set_code },
    { label: 'number', value: (row) => row.number },
    { label: 'name', value: (row) => row.name },
    { label: 'card_print_id', value: (row) => `\`${row.card_print_id}\`` },
    { label: 'tcgplayer', value: (row) => `\`${row.tcgplayer_external_id}\`` },
    { label: 'justtcg', value: (row) => `\`${row.justtcg_external_id}\`` },
  ]));
  lines.push('');
  lines.push('## Remaining Gaps By Set');
  lines.push('');
  lines.push(markdownTable(report.remaining_gap_by_set.slice(0, 30), [
    { label: 'set', value: (row) => row.set_code },
    { label: 'name', value: (row) => row.set_name },
    { label: 'missing parents', value: (row) => row.parent_rows },
    { label: 'children', value: (row) => row.child_printings },
    { label: 'lane', value: (row) => row.primary_gap_lane },
  ]));
  lines.push('');
  lines.push('## Guardrails');
  lines.push('');
  lines.push('- db_writes_performed: false');
  lines.push('- migrations_created: false');
  lines.push('- cleanup_performed: false');
  lines.push('- pricing_writes_performed: false');
  lines.push('- image_writes_performed: false');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing database connection URL.');

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    application_name: 'tcgmap03_acquisition_plan_v1',
  });

  await client.connect();
  try {
    const totals = await queryOne(client, `${BASE_CTE}
      select
        (select count(*)::int from missing_tcgplayer) as missing_tcgplayer_parent_rows,
        (select count(*)::int from missing_tcgplayer where has_justtcg) as justtcg_only_parent_rows,
        (select count(*)::int from missing_tcgplayer where has_tcgdex and not has_justtcg and not has_pricecharting) as tcgdex_only_parent_rows,
        (select count(*)::int from missing_tcgplayer where not has_justtcg and not has_tcgdex and not has_pricecharting) as no_pricing_mapping_parent_rows,
        (select count(*)::int from justtcg_candidate
          where preserved_tcgplayer_external_id is not null
            and active_justtcg_rows_for_parent = 1
            and batch_preserved_tcgplayer_id_count = 1
            and external_id_exists_anywhere = false) as ready_from_justtcg_preserved_tcgplayer_id,
        (select count(*)::int from justtcg_candidate where preserved_tcgplayer_external_id is null) as justtcg_without_preserved_tcgplayer_id,
        (select count(*)::int from justtcg_candidate where preserved_tcgplayer_external_id is not null and external_id_exists_anywhere) as blocked_external_id_collision_rows,
        (select count(*)::int from justtcg_candidate where preserved_tcgplayer_external_id is not null and active_justtcg_rows_for_parent > 1) as blocked_multi_justtcg_parent_rows,
        (select count(*)::int from justtcg_candidate where preserved_tcgplayer_external_id is not null and batch_preserved_tcgplayer_id_count > 1) as blocked_batch_duplicate_tcgplayer_id_rows`);

    const justtcgBuckets = await queryRows(client, `${BASE_CTE}
      select
        case
          when preserved_tcgplayer_external_id is null then 'justtcg_without_preserved_tcgplayer_id'
          when external_id_exists_anywhere then 'blocked_existing_tcgplayer_external_id_collision'
          when active_justtcg_rows_for_parent > 1 then 'blocked_multi_justtcg_mapping_for_parent'
          when batch_preserved_tcgplayer_id_count > 1 then 'blocked_batch_duplicate_preserved_tcgplayer_id'
          else 'ready_from_justtcg_preserved_tcgplayer_id'
        end as classification,
        count(*)::int as rows,
        count(distinct card_print_id)::int as parents,
        count(distinct set_code)::int as sets
      from justtcg_candidate
      group by classification
      order by rows desc, classification`);

    const readyRows = await queryRows(client, `${BASE_CTE}
      select
        card_print_id,
        set_code,
        set_name,
        number,
        name,
        gv_id,
        child_printings,
        finish_keys,
        justtcg_external_id,
        preserved_tcgplayer_external_id as tcgplayer_external_id
      from justtcg_candidate
      where preserved_tcgplayer_external_id is not null
        and active_justtcg_rows_for_parent = 1
        and batch_preserved_tcgplayer_id_count = 1
        and external_id_exists_anywhere = false
      order by set_code, number, name, card_print_id`);

    const remainingGapBySet = await queryRows(client, `${BASE_CTE}
      select
        set_code,
        max(set_name) as set_name,
        count(*)::int as parent_rows,
        sum(child_printings)::int as child_printings,
        case
          when count(*) filter (where has_justtcg) >= greatest(count(*) filter (where has_tcgdex and not has_justtcg), count(*) filter (where not has_justtcg and not has_tcgdex and not has_pricecharting)) then 'justtcg_remaining'
          when count(*) filter (where has_tcgdex and not has_justtcg) >= count(*) filter (where not has_justtcg and not has_tcgdex and not has_pricecharting) then 'tcgdex_only_remaining'
          else 'no_mapping_remaining'
        end as primary_gap_lane
      from missing_tcgplayer
      group by set_code
      order by parent_rows desc, child_printings desc, set_code
      limit 150`);

    const readyBySet = await queryRows(client, `${BASE_CTE}
      select
        set_code,
        max(set_name) as set_name,
        count(*)::int as ready_rows,
        sum(child_printings)::int as child_printings
      from justtcg_candidate
      where preserved_tcgplayer_external_id is not null
        and active_justtcg_rows_for_parent = 1
        and batch_preserved_tcgplayer_id_count = 1
        and external_id_exists_anywhere = false
      group by set_code
      order by ready_rows desc, child_printings desc, set_code
      limit 100`);

    const report = {
      contract: 'TCGMAP03_ACQUISITION_PLAN_V1',
      generated_at: new Date().toISOString(),
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      pricing_writes_performed: false,
      image_writes_performed: false,
      scope: 'English physical card_prints missing active tcgplayer external_mappings',
      totals,
      justtcg_preserved_id_buckets: justtcgBuckets,
      ready_by_set: readyBySet,
      remaining_gap_by_set: remainingGapBySet,
      ready_rows: readyRows,
      recommended_next_package: readyRows.length > 0
        ? {
            package_id: 'TCGMAP-03A-JUSTTCG-PRESERVED-TCGPLAYER-MAPPING-INSERTS',
            mode: 'guarded_dry_run_only',
            target_rows: readyRows.length,
          }
        : null,
    };
    report.fingerprint_sha256 = sha256(stableJson({
      contract: report.contract,
      totals,
      justtcgBuckets,
      readyRows: readyRows.map((row) => ({
        card_print_id: row.card_print_id,
        justtcg_external_id: row.justtcg_external_id,
        tcgplayer_external_id: row.tcgplayer_external_id,
      })),
    }));

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, buildMarkdown(report));

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      fingerprint_sha256: report.fingerprint_sha256,
      totals,
      justtcg_preserved_id_buckets: justtcgBuckets,
      recommended_next_package: report.recommended_next_package,
      db_writes_performed: false,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[tcgmap03-acquisition-plan] failed:', error);
  process.exit(1);
});
