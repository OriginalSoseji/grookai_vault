import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/tcg_mapping_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'tcgmap02_pricing_readiness_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'tcgmap02_pricing_readiness_v1.md');
const TCGMAP01A_APPLY_JSON = path.join(OUTPUT_DIR, 'tcgmap01a_tcgdex_tcgplayer_mapping_insert_real_apply_v1.json');

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

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
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

const BASE_SCOPE_CTE = `
with child_agg as (
  select
    cpr.card_print_id,
    count(*)::int as child_printings,
    count(distinct cpr.finish_key)::int as distinct_finish_count,
    array_agg(distinct cpr.finish_key order by cpr.finish_key) filter (where cpr.finish_key is not null) as finish_keys,
    count(*) filter (where cpr.image_status = 'exact')::int as exact_image_children,
    count(*) filter (where cpr.image_status = 'representative')::int as representative_image_children
  from public.card_printings cpr
  group by cpr.card_print_id
),
mapping_agg as (
  select
    em.card_print_id,
    bool_or(em.source = 'tcgplayer' and em.active) as has_tcgplayer,
    bool_or(em.source = 'justtcg' and em.active) as has_justtcg,
    bool_or(em.source = 'tcgdex' and em.active) as has_tcgdex,
    bool_or(em.source = 'pricecharting' and em.active) as has_pricecharting,
    count(*) filter (where em.source = 'tcgplayer' and em.active)::int as tcgplayer_mapping_count,
    count(*) filter (where em.source = 'justtcg' and em.active)::int as justtcg_mapping_count,
    count(*) filter (where em.source = 'tcgdex' and em.active)::int as tcgdex_mapping_count,
    count(*) filter (where em.source = 'pricecharting' and em.active)::int as pricecharting_mapping_count
  from public.external_mappings em
  where em.active = true
  group by em.card_print_id
),
scope as (
  select
    cp.id::text as card_print_id,
    cp.set_code,
    cp.number,
    cp.name,
    cp.rarity,
    cp.gv_id,
    cp.identity_domain,
    s.name as set_name,
    s.release_date,
    coalesce(ca.child_printings, 0) as child_printings,
    coalesce(ca.distinct_finish_count, 0) as distinct_finish_count,
    coalesce(ca.finish_keys, array[]::text[]) as finish_keys,
    coalesce(ca.exact_image_children, 0) as exact_image_children,
    coalesce(ca.representative_image_children, 0) as representative_image_children,
    coalesce(ma.has_tcgplayer, false) as has_tcgplayer,
    coalesce(ma.has_justtcg, false) as has_justtcg,
    coalesce(ma.has_tcgdex, false) as has_tcgdex,
    coalesce(ma.has_pricecharting, false) as has_pricecharting,
    coalesce(ma.tcgplayer_mapping_count, 0) as tcgplayer_mapping_count,
    coalesce(ma.justtcg_mapping_count, 0) as justtcg_mapping_count,
    coalesce(ma.tcgdex_mapping_count, 0) as tcgdex_mapping_count,
    coalesce(ma.pricecharting_mapping_count, 0) as pricecharting_mapping_count,
    case
      when coalesce(ma.has_tcgplayer, false) and coalesce(ca.child_printings, 0) <= 1 then 'tcgplayer_parent_price_direct_single_child'
      when coalesce(ma.has_tcgplayer, false) and coalesce(ca.child_printings, 0) > 1 then 'tcgplayer_parent_reference_variant_split_required'
      when not coalesce(ma.has_tcgplayer, false) and coalesce(ma.has_justtcg, false) then 'justtcg_only'
      when not coalesce(ma.has_tcgplayer, false) and coalesce(ma.has_pricecharting, false) then 'pricecharting_only'
      when not coalesce(ma.has_tcgplayer, false) and coalesce(ma.has_tcgdex, false) then 'tcgdex_only_no_tcgplayer_product'
      else 'no_pricing_mapping'
    end as pricing_readiness_status
  from public.card_prints cp
  left join public.sets s on s.id = cp.set_id
  left join child_agg ca on ca.card_print_id = cp.id
  left join mapping_agg ma on ma.card_print_id = cp.id
  where cp.identity_domain = 'pokemon_eng_standard'
)`;

function buildMarkdown(report) {
  const lines = [];
  lines.push('# TCGMAP-02 Pricing Readiness V1');
  lines.push('');
  lines.push('Audit-only pricing readiness after TCGMAP-01A. No DB writes, no migrations, no cleanup, no pricing writes.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- fingerprint: \`${report.fingerprint_sha256}\``);
  lines.push(`- generated_at: \`${report.generated_at}\``);
  lines.push(`- english_physical_parent_rows: ${report.totals.english_physical_parent_rows}`);
  lines.push(`- parents_with_tcgplayer: ${report.totals.parents_with_tcgplayer}`);
  lines.push(`- parents_with_justtcg: ${report.totals.parents_with_justtcg}`);
  lines.push(`- parents_with_neither_tcgplayer_nor_justtcg: ${report.totals.parents_with_neither_tcgplayer_nor_justtcg}`);
  lines.push(`- child_printings_total: ${report.totals.child_printings_total}`);
  lines.push(`- child_printings_under_tcgplayer_parent: ${report.totals.child_printings_under_tcgplayer_parent}`);
  lines.push('');
  lines.push('## Readiness Buckets');
  lines.push('');
  lines.push(markdownTable(report.readiness_buckets, [
    { label: 'status', value: (row) => row.pricing_readiness_status },
    { label: 'parents', value: (row) => row.parent_rows },
    { label: 'children', value: (row) => row.child_printings },
    { label: 'sets', value: (row) => row.sets },
  ]));
  lines.push('');
  lines.push('## Pricing Interpretation');
  lines.push('');
  lines.push('- `tcgplayer_parent_price_direct_single_child`: safest parent-level rows for immediate market reference display.');
  lines.push('- `tcgplayer_parent_reference_variant_split_required`: usable as parent/reference pricing, but not exact child variant pricing until finish/product separation is proven.');
  lines.push('- `justtcg_only`, `pricecharting_only`, and `tcgdex_only_no_tcgplayer_product`: future mapping/acquisition lanes.');
  lines.push('- `no_pricing_mapping`: no current pricing source mapping on the parent row.');
  lines.push('');
  lines.push('## Highest Variant-Split Risk Sets');
  lines.push('');
  lines.push(markdownTable(report.variant_split_risk_by_set.slice(0, 25), [
    { label: 'set', value: (row) => row.set_code },
    { label: 'name', value: (row) => row.set_name },
    { label: 'parents', value: (row) => row.parent_rows },
    { label: 'children', value: (row) => row.child_printings },
    { label: 'finishes', value: (row) => row.finish_keys },
  ]));
  lines.push('');
  lines.push('## TCGMAP-01A Impact');
  lines.push('');
  lines.push(`- inserted_mappings: ${report.tcgmap01a_impact.inserted_rows ?? 'unknown'}`);
  lines.push(`- active_tcgplayer_before_tcgmap01a: ${report.tcgmap01a_impact.active_tcgplayer_before_tcgmap01a ?? 'unknown'}`);
  lines.push(`- active_tcgplayer_after_tcgmap01a: ${report.tcgmap01a_impact.active_tcgplayer_after_tcgmap01a ?? 'unknown'}`);
  lines.push('');
  lines.push('## Guardrails');
  lines.push('');
  lines.push('- db_writes_performed: false');
  lines.push('- migrations_created: false');
  lines.push('- cleanup_performed: false');
  lines.push('- pricing_writes_performed: false');
  lines.push('- image_writes_performed: false');
  lines.push('');
  lines.push('## Recommended Next Step');
  lines.push('');
  lines.push('Build `TCGMAP-03` as a read-only source acquisition plan for the remaining no-TCGplayer rows, prioritizing `justtcg_only` and `tcgdex_only_no_tcgplayer_product` before touching harder no-mapping rows.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing database connection URL.');

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    application_name: 'tcgmap02_pricing_readiness_v1',
  });

  const tcgmap01a = await readJsonIfExists(TCGMAP01A_APPLY_JSON);
  await client.connect();
  try {
    const totals = await queryOne(client, `${BASE_SCOPE_CTE}
      select
        count(*)::int as english_physical_parent_rows,
        count(*) filter (where has_tcgplayer)::int as parents_with_tcgplayer,
        count(*) filter (where has_justtcg)::int as parents_with_justtcg,
        count(*) filter (where has_tcgplayer and has_justtcg)::int as parents_with_tcgplayer_and_justtcg,
        count(*) filter (where not has_tcgplayer and has_justtcg)::int as parents_with_justtcg_only,
        count(*) filter (where not has_tcgplayer and not has_justtcg)::int as parents_with_neither_tcgplayer_nor_justtcg,
        count(*) filter (where has_pricecharting)::int as parents_with_pricecharting,
        count(*) filter (where has_tcgdex)::int as parents_with_tcgdex,
        sum(child_printings)::int as child_printings_total,
        sum(child_printings) filter (where has_tcgplayer)::int as child_printings_under_tcgplayer_parent,
        sum(child_printings) filter (where not has_tcgplayer)::int as child_printings_without_tcgplayer_parent
      from scope`);

    const readinessBuckets = await queryRows(client, `${BASE_SCOPE_CTE}
      select
        pricing_readiness_status,
        count(*)::int as parent_rows,
        sum(child_printings)::int as child_printings,
        count(distinct set_code)::int as sets
      from scope
      group by pricing_readiness_status
      order by parent_rows desc, pricing_readiness_status`);

    const variantSplitRiskBySet = await queryRows(client, `${BASE_SCOPE_CTE}
      select
        set_code,
        max(set_name) as set_name,
        count(*)::int as parent_rows,
        sum(child_printings)::int as child_printings,
        string_agg(distinct finish_key, ', ' order by finish_key) as finish_keys
      from scope
      cross join lateral unnest(finish_keys) as finish_key
      where pricing_readiness_status = 'tcgplayer_parent_reference_variant_split_required'
      group by set_code
      order by parent_rows desc, child_printings desc, set_code
      limit 100`);

    const unmappedBySet = await queryRows(client, `${BASE_SCOPE_CTE}
      select
        set_code,
        max(set_name) as set_name,
        count(*)::int as parent_rows,
        sum(child_printings)::int as child_printings
      from scope
      where pricing_readiness_status in ('justtcg_only', 'pricecharting_only', 'tcgdex_only_no_tcgplayer_product', 'no_pricing_mapping')
      group by set_code
      order by parent_rows desc, child_printings desc, set_code
      limit 100`);

    const directReadySample = await queryRows(client, `${BASE_SCOPE_CTE}
      select card_print_id, set_code, set_name, number, name, child_printings, finish_keys
      from scope
      where pricing_readiness_status = 'tcgplayer_parent_price_direct_single_child'
      order by release_date desc nulls last, set_code, number, name
      limit 100`);

    const variantRiskSample = await queryRows(client, `${BASE_SCOPE_CTE}
      select card_print_id, set_code, set_name, number, name, child_printings, finish_keys
      from scope
      where pricing_readiness_status = 'tcgplayer_parent_reference_variant_split_required'
      order by child_printings desc, set_code, number, name
      limit 100`);

    const report = {
      contract: 'TCGMAP02_PRICING_READINESS_V1',
      generated_at: new Date().toISOString(),
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      pricing_writes_performed: false,
      image_writes_performed: false,
      scope: 'card_prints.identity_domain = pokemon_eng_standard',
      totals,
      readiness_buckets: readinessBuckets,
      variant_split_risk_by_set: variantSplitRiskBySet,
      remaining_unmapped_by_set: unmappedBySet,
      samples: {
        direct_parent_price_ready: directReadySample,
        variant_split_required: variantRiskSample,
      },
      tcgmap01a_impact: {
        inserted_rows: tcgmap01a?.execution?.apply_proof?.inserted_rows ?? null,
        active_tcgplayer_before_tcgmap01a: tcgmap01a?.execution?.before_snapshot?.global_counts?.active_tcgplayer_rows ?? null,
        active_tcgplayer_after_tcgmap01a: tcgmap01a?.execution?.after_snapshot?.global_counts?.active_tcgplayer_rows ?? null,
        target_fingerprint_sha256: tcgmap01a?.target_fingerprint_sha256 ?? null,
      },
    };
    report.fingerprint_sha256 = sha256(stableJson({
      contract: report.contract,
      totals,
      readinessBuckets,
      variantSplitRiskBySet,
      unmappedBySet,
      tcgmap01a_impact: report.tcgmap01a_impact,
    }));

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, buildMarkdown(report));

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      fingerprint_sha256: report.fingerprint_sha256,
      totals,
      readiness_buckets: readinessBuckets,
      db_writes_performed: false,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[tcgmap02-pricing-readiness] failed:', error);
  process.exit(1);
});
