import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/tcg_mapping_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'tcgmap06_source_acquisition_plan_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'tcgmap06_source_acquisition_plan_v1.md');
const STATUS_AFTER_05A_JSON = path.join(OUTPUT_DIR, 'tcg_mapping_status_after_05a_v1.json');
const TCGMAP02_JSON = path.join(OUTPUT_DIR, 'tcgmap02_pricing_readiness_v1.json');
const TCGMAP05_JSON = path.join(OUTPUT_DIR, 'tcgmap05_cached_tcgcsv_readiness_v1.json');

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

async function queryRows(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

async function queryOne(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows[0] ?? {};
}

const BASE_SCOPE_CTE = `
with child_agg as (
  select
    card_print_id,
    count(*)::int as child_printings,
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
    cp.id,
    cp.set_code,
    s.name as set_name,
    s.release_date,
    cp.number,
    cp.name,
    cp.gv_id,
    coalesce(ca.child_printings, 0) as child_printings,
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
)
`;

function buildMarkdown(report) {
  const lines = [];
  lines.push('# TCGMAP-06 Source Acquisition Plan V1');
  lines.push('');
  lines.push('Read-only plan for the next TCGplayer mapping phase after TCGMAP-05A. This report does not stage products, insert mappings, write prices, write images, create migrations, or mutate card identity.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- fingerprint: \`${report.fingerprint_sha256}\``);
  lines.push(`- generated_at: \`${report.generated_at}\``);
  lines.push(`- current_tcgplayer_parent_mappings: ${report.current_totals.parents_with_tcgplayer}`);
  lines.push(`- missing_tcgplayer_parent_mappings: ${report.current_totals.missing_tcgplayer_parent_rows}`);
  lines.push(`- child_printings_without_tcgplayer_parent: ${report.current_totals.child_printings_without_tcgplayer_parent}`);
  lines.push(`- stage_table_rows: ${report.stage_table.rows}`);
  lines.push(`- stage_table_latest_batch: ${report.stage_table.latest_batch_id ?? 'none'}`);
  lines.push('');
  lines.push('## Current Source State');
  lines.push('');
  lines.push(markdownTable(report.exhausted_lanes, [
    { label: 'lane', value: (row) => row.lane },
    { label: 'ready rows', value: (row) => row.ready_rows },
    { label: 'blocked rows', value: (row) => row.blocked_rows },
    { label: 'reason', value: (row) => row.reason },
  ]));
  lines.push('');
  lines.push('## Remaining Work By Lane');
  lines.push('');
  lines.push(markdownTable(report.remaining_by_lane, [
    { label: 'lane', value: (row) => row.lane },
    { label: 'parents', value: (row) => row.parents },
    { label: 'children', value: (row) => row.children },
    { label: 'sets', value: (row) => row.sets },
  ]));
  lines.push('');
  lines.push('## Priority Sets For Fresh Source Acquisition');
  lines.push('');
  lines.push(markdownTable(report.priority_sets.slice(0, 30), [
    { label: 'set', value: (row) => row.set_code },
    { label: 'name', value: (row) => row.set_name },
    { label: 'lane', value: (row) => row.lane },
    { label: 'parents', value: (row) => row.parents },
    { label: 'children', value: (row) => row.children },
    { label: 'priority', value: (row) => row.acquisition_priority },
  ]));
  lines.push('');
  lines.push('## Required Product Snapshot Shape');
  lines.push('');
  lines.push('The next useful input is a current product catalog snapshot with these fields preserved per product:');
  lines.push('');
  lines.push('- `tcgplayer_id` / product ID');
  lines.push('- product URL or stable product identifier');
  lines.push('- product line/category');
  lines.push('- set name or exact set slug/group name');
  lines.push('- card number, including suffixes and prefixes');
  lines.push('- product/card name');
  lines.push('- rarity when available');
  lines.push('- variant/printing title text when available');
  lines.push('- language');
  lines.push('- raw payload');
  lines.push('');
  lines.push('## Recommended Next Package');
  lines.push('');
  lines.push('Recommended next package: `TCGMAP-06A-TCGPLAYER-PRODUCT-SNAPSHOT-STAGE-DRY-RUN`.');
  lines.push('');
  lines.push('It should be staging/preservation only, not canonical mapping insertion. The package should:');
  lines.push('');
  lines.push('1. Load a fresh TCGplayer/TCGCSV product snapshot into a preserved local fixture or `ingest.tcgplayer_products_stage` with a unique batch ID.');
  lines.push('2. Record product count, batch fingerprint, source URL/API metadata, and retrieval time.');
  lines.push('3. Run a new exact set+number+name matcher against the 4,819 missing parent rows.');
  lines.push('4. Produce a guarded readiness report before any `external_mappings` insert package exists.');
  lines.push('');
  lines.push('## Guardrails');
  lines.push('');
  for (const [key, value] of Object.entries(report.safety)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push('');
  lines.push('## Stop Rules For The Next Package');
  lines.push('');
  lines.push('- Stop if product rows lack stable product IDs.');
  lines.push('- Stop if product rows lack enough set/card identity to match exact set + number + name.');
  lines.push('- Stop if one product ID matches multiple candidate parents.');
  lines.push('- Stop if one parent matches multiple unrelated product IDs.');
  lines.push('- Stop if product title suggests a different stamp, variant, language, or set than the candidate parent.');
  lines.push('- Stop before any canonical `external_mappings` insert until a dry-run proof exists.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing database connection URL.');

  const [statusAfter05a, tcgmap02, tcgmap05] = await Promise.all([
    readJson(STATUS_AFTER_05A_JSON),
    readJson(TCGMAP02_JSON),
    readJson(TCGMAP05_JSON),
  ]);

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    application_name: 'tcgmap06_source_acquisition_plan_v1',
  });

  await client.connect();
  try {
    const stageTable = await queryOne(client, `
      select
        count(*)::int as rows,
        count(distinct batch_id)::int as batches,
        max(imported_at) as latest_imported_at,
        (array_agg(batch_id order by imported_at desc))[1] as latest_batch_id
      from ingest.tcgplayer_products_stage
    `);

    const priorityRows = await queryRows(client, `${BASE_SCOPE_CTE}
      select
        set_code,
        set_name,
        case
          when has_justtcg then 'justtcg_only'
          when has_tcgdex and not has_justtcg and not has_pricecharting then 'tcgdex_only_no_tcgplayer_product'
          else 'no_pricing_mapping'
        end as lane,
        count(*)::int as parents,
        coalesce(sum(child_printings), 0)::int as children,
        array_agg(distinct unnest_finish order by unnest_finish) filter (where unnest_finish is not null) as finish_keys
      from missing_tcgplayer
      left join lateral unnest(finish_keys) as finish(unnest_finish) on true
      group by set_code, set_name, lane
      order by parents desc, children desc, set_code
      limit 60
    `);

    const acquisitionPriority = priorityRows.map((row) => {
      let acquisition_priority = 'third';
      if (row.lane === 'justtcg_only') acquisition_priority = 'first';
      else if (row.lane === 'tcgdex_only_no_tcgplayer_product') acquisition_priority = 'second';
      return { ...row, acquisition_priority };
    });

    const reportCore = {
      contract: 'TCGMAP06_SOURCE_ACQUISITION_PLAN_V1',
      generated_at: new Date().toISOString(),
      audit_only: true,
      current_totals: statusAfter05a.current_totals,
      completed_packages: statusAfter05a.completed_packages,
      exhausted_lanes: statusAfter05a.exhausted_lanes,
      remaining_by_lane: statusAfter05a.remaining_by_lane,
      stage_table: {
        rows: Number(stageTable.rows ?? 0),
        batches: Number(stageTable.batches ?? 0),
        latest_imported_at: stageTable.latest_imported_at ?? null,
        latest_batch_id: stageTable.latest_batch_id ?? null,
      },
      source_report_fingerprints: {
        status_after_05a_generated_at: statusAfter05a.generated_at,
        tcgmap02_generated_at: tcgmap02.generated_at,
        tcgmap02_fingerprint_sha256: tcgmap02.fingerprint_sha256 ?? null,
        tcgmap05_fingerprint_sha256: tcgmap05.fingerprint_sha256 ?? null,
      },
      priority_sets: acquisitionPriority,
      recommended_next_package: {
        package_id: 'TCGMAP-06A-TCGPLAYER-PRODUCT-SNAPSHOT-STAGE-DRY-RUN',
        type: 'source_snapshot_stage_or_fixture_only',
        canonical_mapping_inserts_allowed: false,
        pricing_writes_allowed: false,
        source_requirements: [
          'stable TCGplayer product ID',
          'product URL or stable product identifier',
          'set name or exact set slug/group name',
          'card number including suffixes/prefixes',
          'product/card name',
          'variant/title text where available',
          'language',
          'raw payload',
        ],
      },
      safety: {
        db_writes_performed: false,
        migrations_created: false,
        cleanup_performed: false,
        pricing_writes_performed: false,
        image_writes_performed: false,
        card_identity_writes_performed: false,
        child_printing_writes_performed: false,
        canonical_mapping_writes_performed: false,
      },
    };

    const fingerprint = sha256(stableJson({
      current_totals: reportCore.current_totals,
      exhausted_lanes: reportCore.exhausted_lanes,
      remaining_by_lane: reportCore.remaining_by_lane,
      stage_table: reportCore.stage_table,
      priority_sets: reportCore.priority_sets,
      recommended_next_package: reportCore.recommended_next_package,
      safety: reportCore.safety,
    }));

    const report = {
      ...reportCore,
      fingerprint_sha256: fingerprint,
    };

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, buildMarkdown(report));
    console.log(`Wrote ${OUTPUT_JSON}`);
    console.log(`Wrote ${OUTPUT_MD}`);
    console.log(`fingerprint=${fingerprint}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
