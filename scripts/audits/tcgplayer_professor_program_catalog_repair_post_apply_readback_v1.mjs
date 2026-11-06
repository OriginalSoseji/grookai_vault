import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

loadDotenv({ path: process.env.GROOKAI_ENV_FILE ?? '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const APPLY_JSON = path.join(ROOT, 'docs', 'audits', 'tcgplayer_professor_program_catalog_repair_real_apply_20261105_v1.json');
const OUTPUT_JSON = path.join(ROOT, 'docs', 'audits', 'tcgplayer_professor_program_catalog_repair_post_apply_readback_20261105_v1.json');
const EXPECTED_FINGERPRINT = '1203f252f7856cff512d85ff7d76eb45a9cf18e528166b53b519fb34a7c78820';

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function main() {
  const applyReport = JSON.parse(await fs.readFile(APPLY_JSON, 'utf8'));
  if (applyReport.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) throw new Error('Apply report fingerprint mismatch.');
  if (applyReport.execution?.post_apply_verified !== true) throw new Error('Apply report is not post-apply verified.');
  const conn = connectionString();
  if (!conn) throw new Error('Missing production database connection string.');

  const client = new Client({ connectionString: conn });
  await client.connect();
  let rows;
  let excludedMappings;
  try {
    await client.query('begin read only');
    const result = await client.query(
      `with target as (
         select * from jsonb_to_recordset($1::jsonb) as t(
           source_product_id text,
           target_parent_id uuid,
           target_child_id uuid,
           target_variant_key text,
           target_printed_identity_modifier text,
           target_finish_key text
         )
       )
       select target.source_product_id,
         cp.id::text as parent_id,
         cp.variant_key,
         cp.printed_identity_modifier,
         count(distinct cpi.id)::int as active_identities,
         count(distinct cpr.id)::int as exact_children,
         count(distinct em.id)::int as active_mappings
       from target
       join public.card_prints cp on cp.id = target.target_parent_id
         and cp.variant_key = target.target_variant_key
         and cp.printed_identity_modifier = target.target_printed_identity_modifier
       left join public.card_print_identity cpi on cpi.card_print_id = cp.id and cpi.is_active = true
       left join public.card_printings cpr on cpr.id = target.target_child_id
         and cpr.card_print_id = cp.id
         and cpr.finish_key = target.target_finish_key
       left join public.external_mappings em on em.source = 'tcgplayer'
         and em.external_id = target.source_product_id
         and coalesce(em.active, true) = true
       group by target.source_product_id, cp.id, cp.variant_key, cp.printed_identity_modifier
       order by target.source_product_id`,
      [JSON.stringify(applyReport.targets)],
    );
    rows = result.rows;
    const exclusions = await client.query(
      `select external_id, count(*)::int as active_mappings
       from public.external_mappings
       where source = 'tcgplayer'
         and external_id = any($1::text[])
         and coalesce(active, true) = true
       group by external_id
       order by external_id`,
      [['176638', '213516']],
    );
    excludedMappings = exclusions.rows;
    await client.query('rollback');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }

  const passed = rows.length === 6
    && rows.every((row) => row.variant_key === 'professor_program_stamp'
      && row.printed_identity_modifier === 'professor_program_stamp'
      && row.active_identities === 1
      && row.exact_children === 1
      && row.active_mappings === 0)
    && excludedMappings.length === 0;
  if (!passed) throw new Error(`Independent post-apply readback failed: ${JSON.stringify({ rows, excludedMappings })}`);

  const report = {
    generated_at: new Date().toISOString(),
    version: 'tcgplayer_professor_program_catalog_repair_post_apply_readback_20261105_v1',
    package_fingerprint_sha256: EXPECTED_FINGERPRINT,
    read_only_transaction: true,
    status: 'passed',
    rows,
    excluded_products: {
      professor_sycamore_176638_active_mapping_count: 0,
      judge_213516_active_mapping_count: 0,
    },
  };
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'), ...report }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
