import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;
const OUTPUT_DIR = 'docs/audits/tcg_mapping_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'tcg_mapping_status_after_05a_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'tcg_mapping_status_after_05a_v1.md');

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

async function readJson(fileName) {
  return JSON.parse(await fs.readFile(path.join(OUTPUT_DIR, fileName), 'utf8'));
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

function buildMarkdown(report) {
  const lines = [];
  lines.push('# TCG Mapping Status After TCGMAP-05A V1');
  lines.push('');
  lines.push('Checkpoint report after applying TCGMAP-01A, TCGMAP-04A, and TCGMAP-05A. This is audit-only report generation; no mappings, pricing rows, card identity rows, images, migrations, or cleanup were changed by this status report.');
  lines.push('');
  lines.push('## Current Coverage');
  lines.push('');
  lines.push(`- active_tcgplayer_parent_mappings: ${report.current_totals.parents_with_tcgplayer}`);
  lines.push(`- missing_tcgplayer_parent_mappings: ${report.current_totals.missing_tcgplayer_parent_rows}`);
  lines.push(`- child_printings_under_tcgplayer_parent: ${report.current_totals.child_printings_under_tcgplayer_parent}`);
  lines.push(`- child_printings_without_tcgplayer_parent: ${report.current_totals.child_printings_without_tcgplayer_parent}`);
  lines.push('');
  lines.push('## Completed Mapping Packages');
  lines.push('');
  lines.push(markdownTable(report.completed_packages, [
    { label: 'package', value: (row) => row.package_id },
    { label: 'rows', value: (row) => row.inserted_rows },
    { label: 'fingerprint', value: (row) => `\`${row.target_fingerprint_sha256}\`` },
  ]));
  lines.push('');
  lines.push('## Exhausted Local Lanes');
  lines.push('');
  lines.push(markdownTable(report.exhausted_lanes, [
    { label: 'lane', value: (row) => row.lane },
    { label: 'ready rows', value: (row) => row.ready_rows },
    { label: 'blocked rows', value: (row) => row.blocked_rows },
    { label: 'reason', value: (row) => row.reason },
  ]));
  lines.push('');
  lines.push('## Remaining Gaps By Lane');
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
  lines.push(markdownTable(report.remaining_by_set.slice(0, 40), [
    { label: 'set', value: (row) => row.set_code },
    { label: 'name', value: (row) => row.set_name },
    { label: 'lane', value: (row) => row.lane },
    { label: 'parents', value: (row) => row.parents },
    { label: 'children', value: (row) => row.children },
  ]));
  lines.push('');
  lines.push('## Recommended Next Step');
  lines.push('');
  lines.push('No additional real-apply package is recommended from current local preserved sources. The next productive step is source acquisition: load a current TCGplayer/TCGCSV product catalog into `ingest.tcgplayer_products_stage` or another preserved source fixture, then run a new exact-match readiness pass.');
  lines.push('');
  lines.push('## Guardrails');
  lines.push('');
  lines.push('- db_writes_performed: false');
  lines.push('- migrations_created: false');
  lines.push('- pricing_writes_performed: false');
  lines.push('- image_writes_performed: false');
  lines.push('- cleanup_performed: false');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing database connection URL.');

  const tcgmap02 = await readJson('tcgmap02_pricing_readiness_v1.json');
  const tcgmap03 = await readJson('tcgmap03_acquisition_plan_v1.json');
  const tcgmap04 = await readJson('tcgmap04_staging_tcgplayer_bridge_readiness_v1.json');
  const tcgmap05 = await readJson('tcgmap05_cached_tcgcsv_readiness_v1.json');
  const applied01a = await readJson('tcgmap01a_tcgdex_tcgplayer_mapping_insert_real_apply_v1.json');
  const applied04a = await readJson('tcgmap04a_staging_tcgplayer_mapping_insert_real_apply_v1.json');
  const applied05a = await readJson('tcgmap05a_cached_tcgcsv_mapping_insert_real_apply_v1.json');

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    application_name: 'tcg_mapping_status_after_05a_v1',
  });

  await client.connect();
  try {
    const remainingByLane = await queryRows(client, `
      with child_agg as (
        select card_print_id, count(*)::int child_printings
        from public.card_printings
        group by card_print_id
      ),
      mapping_agg as (
        select
          card_print_id,
          bool_or(source = 'tcgplayer' and active) has_tcgplayer,
          bool_or(source = 'justtcg' and active) has_justtcg,
          bool_or(source = 'tcgdex' and active) has_tcgdex
        from public.external_mappings
        where active = true
        group by card_print_id
      ),
      missing as (
        select
          cp.id,
          cp.set_code,
          coalesce(ca.child_printings, 0) child_printings,
          case
            when coalesce(ma.has_justtcg, false) then 'justtcg_only'
            when coalesce(ma.has_tcgdex, false) then 'tcgdex_only_no_tcgplayer_product'
            else 'no_pricing_mapping'
          end lane
        from public.card_prints cp
        left join child_agg ca on ca.card_print_id = cp.id
        left join mapping_agg ma on ma.card_print_id = cp.id
        where cp.identity_domain = 'pokemon_eng_standard'
          and not coalesce(ma.has_tcgplayer, false)
      )
      select lane, count(*)::int parents, sum(child_printings)::int children, count(distinct set_code)::int sets
      from missing
      group by lane
      order by parents desc`);

    const remainingBySet = await queryRows(client, `
      with child_agg as (
        select card_print_id, count(*)::int child_printings
        from public.card_printings
        group by card_print_id
      ),
      mapping_agg as (
        select
          card_print_id,
          bool_or(source = 'tcgplayer' and active) has_tcgplayer,
          bool_or(source = 'justtcg' and active) has_justtcg,
          bool_or(source = 'tcgdex' and active) has_tcgdex
        from public.external_mappings
        where active = true
        group by card_print_id
      ),
      missing as (
        select
          cp.id,
          cp.set_code,
          s.name set_name,
          coalesce(ca.child_printings, 0) child_printings,
          case
            when coalesce(ma.has_justtcg, false) then 'justtcg_only'
            when coalesce(ma.has_tcgdex, false) then 'tcgdex_only_no_tcgplayer_product'
            else 'no_pricing_mapping'
          end lane
        from public.card_prints cp
        left join public.sets s on s.id = cp.set_id
        left join child_agg ca on ca.card_print_id = cp.id
        left join mapping_agg ma on ma.card_print_id = cp.id
        where cp.identity_domain = 'pokemon_eng_standard'
          and not coalesce(ma.has_tcgplayer, false)
      )
      select set_code, set_name, lane, count(*)::int parents, sum(child_printings)::int children
      from missing
      group by set_code, set_name, lane
      order by parents desc, set_code
      limit 100`);

    const report = {
      contract: 'TCG_MAPPING_STATUS_AFTER_05A_V1',
      generated_at: new Date().toISOString(),
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      pricing_writes_performed: false,
      image_writes_performed: false,
      current_totals: {
        ...tcgmap02.totals,
        missing_tcgplayer_parent_rows: tcgmap03.totals.missing_tcgplayer_parent_rows,
      },
      completed_packages: [
        {
          package_id: applied01a.package_id,
          inserted_rows: applied01a.execution?.apply_proof?.inserted_rows,
          target_fingerprint_sha256: applied01a.target_fingerprint_sha256,
        },
        {
          package_id: applied04a.package_id,
          inserted_rows: applied04a.execution?.apply_proof?.inserted_rows,
          target_fingerprint_sha256: applied04a.target_fingerprint_sha256,
        },
        {
          package_id: applied05a.package_id,
          inserted_rows: applied05a.execution?.apply_proof?.inserted_rows,
          target_fingerprint_sha256: applied05a.target_fingerprint_sha256,
        },
      ],
      exhausted_lanes: [
        {
          lane: 'justtcg_preserved_tcgplayer_id',
          ready_rows: tcgmap03.totals.ready_from_justtcg_preserved_tcgplayer_id,
          blocked_rows: tcgmap03.totals.justtcg_without_preserved_tcgplayer_id,
          reason: 'JustTCG rows do not preserve TCGplayer product IDs.',
        },
        {
          lane: 'resolved_external_discovery_candidates',
          ready_rows: tcgmap04.totals.ready_rows,
          blocked_rows: tcgmap04.totals.candidate_rows,
          reason: 'Remaining staging candidates are collisions or multi-row ambiguous parents.',
        },
        {
          lane: 'cached_tcgcsv_exact_identity',
          ready_rows: tcgmap05.totals.ready_rows,
          blocked_rows: tcgmap05.totals.blocked_rows,
          reason: 'Remaining cached catalog matches collide with existing product IDs or duplicate product ownership.',
        },
      ],
      remaining_by_lane: remainingByLane,
      remaining_by_set: remainingBySet,
      source_acquisition_requirements: [
        'Load a current TCGplayer/TCGCSV product catalog with productId, product URL, set name or set slug, card number, and card name.',
        'Preserve the raw source snapshot before matching.',
        'Promote only exact set + card number + card name matches with unique source product ID and unique target parent.',
        'Keep variant/product-specific pricing separate from child finish truth until product subtype support is explicit.',
      ],
    };

    report.fingerprint_sha256 = sha256(stableJson({
      contract: report.contract,
      current_totals: report.current_totals,
      completed_packages: report.completed_packages,
      exhausted_lanes: report.exhausted_lanes,
      remaining_by_lane: report.remaining_by_lane,
    }));

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, buildMarkdown(report));
    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      fingerprint_sha256: report.fingerprint_sha256,
      current_totals: report.current_totals,
      exhausted_lanes: report.exhausted_lanes,
      db_writes_performed: false,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[tcg-mapping-status-after-05a] failed:', error);
  process.exit(1);
});
