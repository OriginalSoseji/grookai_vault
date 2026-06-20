import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/tcg_mapping_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'tcg_mapping_status_after_07b_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'tcg_mapping_status_after_07b_v1.md');
const APPLY_JSON = path.join(OUTPUT_DIR, 'tcgmap07b_fresh_tcgcsv_mapping_insert_real_apply_v1.json');

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

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
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

async function queryOne(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows[0] ?? {};
}

async function queryRows(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# TCG Mapping Status After 07B V1');
  lines.push('');
  lines.push('Post-apply status after `TCGMAP-07B-FRESH-TCGCSV-TCGPLAYER-MAPPING-INSERTS`.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- fingerprint: \`${report.fingerprint_sha256}\``);
  lines.push(`- generated_at: \`${report.generated_at}\``);
  lines.push(`- english_physical_parent_rows: ${report.current_totals.english_physical_parent_rows}`);
  lines.push(`- parents_with_tcgplayer: ${report.current_totals.parents_with_tcgplayer}`);
  lines.push(`- missing_tcgplayer_parent_rows: ${report.current_totals.missing_tcgplayer_parent_rows}`);
  lines.push(`- child_printings_without_tcgplayer_parent: ${report.current_totals.child_printings_without_tcgplayer_parent}`);
  lines.push('');
  lines.push('## Remaining By Lane');
  lines.push('');
  lines.push(markdownTable(report.remaining_by_lane, [
    { label: 'lane', value: (row) => row.lane },
    { label: 'parents', value: (row) => row.parents },
    { label: 'children', value: (row) => row.children },
    { label: 'sets', value: (row) => row.sets },
  ]));
  lines.push('');
  lines.push('## Top Remaining Sets');
  lines.push('');
  lines.push(markdownTable(report.remaining_by_set.slice(0, 30), [
    { label: 'set', value: (row) => row.set_code },
    { label: 'name', value: (row) => row.set_name },
    { label: 'lane', value: (row) => row.lane },
    { label: 'parents', value: (row) => row.parents },
    { label: 'children', value: (row) => row.children },
  ]));
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('- migrations_created: false');
  lines.push('- pricing_writes_performed: false');
  lines.push('- image_writes_performed: false');
  lines.push('- card_identity_writes_performed: false');
  lines.push('- child_printing_writes_performed: false');
  lines.push('- cleanup_performed: false');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing database connection URL.');

  const applyReport = await readJson(APPLY_JSON);
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    application_name: 'tcg_mapping_status_after_07b_v1',
  });

  await client.connect();
  try {
    const totals = await queryOne(client, `
      with child_agg as (
        select card_print_id, count(*)::int as child_printings
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
          cp.id,
          coalesce(ca.child_printings, 0) as child_printings,
          coalesce(ma.has_tcgplayer, false) as has_tcgplayer,
          coalesce(ma.has_justtcg, false) as has_justtcg,
          coalesce(ma.has_tcgdex, false) as has_tcgdex,
          coalesce(ma.has_pricecharting, false) as has_pricecharting
        from public.card_prints cp
        left join child_agg ca on ca.card_print_id = cp.id
        left join mapping_agg ma on ma.card_print_id = cp.id
        where cp.identity_domain = 'pokemon_eng_standard'
      )
      select
        count(*)::int as english_physical_parent_rows,
        count(*) filter (where has_tcgplayer)::int as parents_with_tcgplayer,
        count(*) filter (where not has_tcgplayer)::int as missing_tcgplayer_parent_rows,
        count(*) filter (where has_justtcg)::int as parents_with_justtcg,
        count(*) filter (where has_tcgplayer and has_justtcg)::int as parents_with_tcgplayer_and_justtcg,
        count(*) filter (where has_justtcg and not has_tcgplayer)::int as parents_with_justtcg_only,
        count(*) filter (where not has_tcgplayer and not has_justtcg)::int as parents_with_neither_tcgplayer_nor_justtcg,
        count(*) filter (where has_pricecharting)::int as parents_with_pricecharting,
        count(*) filter (where has_tcgdex)::int as parents_with_tcgdex,
        coalesce(sum(child_printings), 0)::int as child_printings_total,
        coalesce(sum(child_printings) filter (where has_tcgplayer), 0)::int as child_printings_under_tcgplayer_parent,
        coalesce(sum(child_printings) filter (where not has_tcgplayer), 0)::int as child_printings_without_tcgplayer_parent
      from base_scope
    `);

    const remainingByLane = await queryRows(client, `
      with child_agg as (
        select card_print_id, count(*)::int as child_printings
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
      missing as (
        select
          cp.id,
          cp.set_code,
          s.name as set_name,
          coalesce(ca.child_printings, 0) as child_printings,
          coalesce(ma.has_justtcg, false) as has_justtcg,
          coalesce(ma.has_tcgdex, false) as has_tcgdex,
          coalesce(ma.has_pricecharting, false) as has_pricecharting
        from public.card_prints cp
        left join public.sets s on s.id = cp.set_id
        left join child_agg ca on ca.card_print_id = cp.id
        left join mapping_agg ma on ma.card_print_id = cp.id
        where cp.identity_domain = 'pokemon_eng_standard'
          and coalesce(ma.has_tcgplayer, false) = false
      )
      select
        case
          when has_justtcg then 'justtcg_only'
          when has_tcgdex and not has_justtcg and not has_pricecharting then 'tcgdex_only_no_tcgplayer_product'
          else 'no_pricing_mapping'
        end as lane,
        count(*)::int as parents,
        coalesce(sum(child_printings), 0)::int as children,
        count(distinct set_code)::int as sets
      from missing
      group by lane
      order by parents desc
    `);

    const remainingBySet = await queryRows(client, `
      with child_agg as (
        select card_print_id, count(*)::int as child_printings
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
      missing as (
        select
          cp.id,
          cp.set_code,
          s.name as set_name,
          coalesce(ca.child_printings, 0) as child_printings,
          coalesce(ma.has_justtcg, false) as has_justtcg,
          coalesce(ma.has_tcgdex, false) as has_tcgdex,
          coalesce(ma.has_pricecharting, false) as has_pricecharting
        from public.card_prints cp
        left join public.sets s on s.id = cp.set_id
        left join child_agg ca on ca.card_print_id = cp.id
        left join mapping_agg ma on ma.card_print_id = cp.id
        where cp.identity_domain = 'pokemon_eng_standard'
          and coalesce(ma.has_tcgplayer, false) = false
      )
      select
        set_code,
        set_name,
        case
          when has_justtcg then 'justtcg_only'
          when has_tcgdex and not has_justtcg and not has_pricecharting then 'tcgdex_only_no_tcgplayer_product'
          else 'no_pricing_mapping'
        end as lane,
        count(*)::int as parents,
        coalesce(sum(child_printings), 0)::int as children
      from missing
      group by set_code, set_name, lane
      order by parents desc, children desc, set_code
      limit 80
    `);

    const reportCore = {
      contract: 'TCG_MAPPING_STATUS_AFTER_07B_V1',
      generated_at: new Date().toISOString(),
      audit_only: true,
      apply_package: {
        package_id: applyReport.package_id,
        pass: applyReport.pass,
        target_rows: applyReport.target_rows,
        target_fingerprint_sha256: applyReport.target_fingerprint_sha256,
      },
      current_totals: totals,
      remaining_by_lane: remainingByLane,
      remaining_by_set: remainingBySet,
      safety: {
        migrations_created: false,
        pricing_writes_performed: false,
        image_writes_performed: false,
        card_identity_writes_performed: false,
        child_printing_writes_performed: false,
        cleanup_performed: false,
      },
    };

    const fingerprint = sha256(stableJson({
      apply_package: reportCore.apply_package,
      current_totals: reportCore.current_totals,
      remaining_by_lane: reportCore.remaining_by_lane,
      remaining_by_set: reportCore.remaining_by_set,
      safety: reportCore.safety,
    }));

    const report = { ...reportCore, fingerprint_sha256: fingerprint };
    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, buildMarkdown(report));
    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      fingerprint_sha256: fingerprint,
      current_totals: report.current_totals,
      db_writes_performed: false,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[tcg-status-after-07b] failed:', error);
  process.exit(1);
});
