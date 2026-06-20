import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/tcg_mapping_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'tcgmap04_staging_tcgplayer_bridge_readiness_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'tcgmap04_staging_tcgplayer_bridge_readiness_v1.md');

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
with missing_tcgplayer as (
  select
    cp.id as card_print_uuid,
    cp.id::text as card_print_id,
    cp.set_code,
    s.name as set_name,
    cp.number,
    cp.name,
    cp.gv_id
  from public.card_prints cp
  left join public.sets s on s.id = cp.set_id
  where cp.identity_domain = 'pokemon_eng_standard'
    and not exists (
      select 1
      from public.external_mappings em
      where em.source = 'tcgplayer'
        and em.active = true
        and em.card_print_id = cp.id
    )
),
candidate as (
  select
    m.*,
    edc.id::text as external_discovery_candidate_id,
    edc.source as staging_source,
    edc.upstream_id,
    nullif(btrim(edc.tcgplayer_id), '') as tcgplayer_external_id,
    edc.match_status,
    edc.candidate_bucket,
    edc.classifier_version,
    edc.payload
  from missing_tcgplayer m
  join public.external_discovery_candidates edc on edc.card_print_id = m.card_print_uuid
  where nullif(btrim(edc.tcgplayer_id), '') is not null
),
classified as (
  select
    candidate.*,
    count(*) over (partition by card_print_uuid) as rows_per_parent,
    count(*) over (partition by tcgplayer_external_id) as rows_per_tcgplayer_id,
    exists (
      select 1
      from public.external_mappings em
      where em.source = 'tcgplayer'
        and em.external_id = candidate.tcgplayer_external_id
    ) as external_id_exists_anywhere
  from candidate
)`;

function buildMarkdown(report) {
  const lines = [];
  lines.push('# TCGMAP-04 Staging TCGplayer Bridge Readiness V1');
  lines.push('');
  lines.push('Audit-only readiness from resolved ingestion staging rows that already contain `tcgplayer_id`.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- fingerprint: \`${report.fingerprint_sha256}\``);
  lines.push(`- generated_at: \`${report.generated_at}\``);
  lines.push(`- candidate_rows: ${report.totals.candidate_rows}`);
  lines.push(`- candidate_parents: ${report.totals.candidate_parents}`);
  lines.push(`- ready_rows: ${report.totals.ready_rows}`);
  lines.push(`- collision_rows: ${report.totals.collision_rows}`);
  lines.push(`- multi_rows_per_parent: ${report.totals.multi_rows_per_parent}`);
  lines.push(`- duplicate_tcgplayer_rows: ${report.totals.duplicate_tcgplayer_rows}`);
  lines.push('');
  lines.push('## Classification');
  lines.push('');
  lines.push(markdownTable(report.classification_buckets, [
    { label: 'classification', value: (row) => row.classification },
    { label: 'rows', value: (row) => row.rows },
    { label: 'parents', value: (row) => row.parents },
    { label: 'sets', value: (row) => row.sets },
  ]));
  lines.push('');
  lines.push('## Recommended Package');
  lines.push('');
  if (report.ready_rows.length > 0) {
    lines.push('Recommended next package: `TCGMAP-04A-STAGING-TCGPLAYER-MAPPING-INSERTS` guarded dry-run only.');
    lines.push('Only rows classified as `ready_from_resolved_staging_tcgplayer_id` are eligible.');
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
    { label: 'source', value: (row) => row.staging_source },
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
    application_name: 'tcgmap04_staging_bridge_readiness_v1',
  });

  await client.connect();
  try {
    const totals = await queryOne(client, `${BASE_CTE}
      select
        count(*)::int as candidate_rows,
        count(distinct card_print_id)::int as candidate_parents,
        count(*) filter (where rows_per_parent = 1 and rows_per_tcgplayer_id = 1 and external_id_exists_anywhere = false)::int as ready_rows,
        count(distinct card_print_id) filter (where rows_per_parent = 1 and rows_per_tcgplayer_id = 1 and external_id_exists_anywhere = false)::int as ready_parents,
        count(*) filter (where external_id_exists_anywhere)::int as collision_rows,
        count(*) filter (where rows_per_parent > 1)::int as multi_rows_per_parent,
        count(*) filter (where rows_per_tcgplayer_id > 1)::int as duplicate_tcgplayer_rows
      from classified`);

    const classificationBuckets = await queryRows(client, `${BASE_CTE}
      select
        case
          when external_id_exists_anywhere then 'blocked_existing_tcgplayer_external_id_collision'
          when rows_per_parent > 1 then 'blocked_multi_staging_rows_for_parent'
          when rows_per_tcgplayer_id > 1 then 'blocked_batch_duplicate_tcgplayer_id'
          else 'ready_from_resolved_staging_tcgplayer_id'
        end as classification,
        count(*)::int as rows,
        count(distinct card_print_id)::int as parents,
        count(distinct set_code)::int as sets
      from classified
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
        external_discovery_candidate_id,
        staging_source,
        upstream_id,
        tcgplayer_external_id,
        match_status,
        candidate_bucket,
        classifier_version
      from classified
      where rows_per_parent = 1
        and rows_per_tcgplayer_id = 1
        and external_id_exists_anywhere = false
      order by set_code, number, name, card_print_id`);

    const readyBySet = await queryRows(client, `${BASE_CTE}
      select
        set_code,
        max(set_name) as set_name,
        count(*)::int as ready_rows
      from classified
      where rows_per_parent = 1
        and rows_per_tcgplayer_id = 1
        and external_id_exists_anywhere = false
      group by set_code
      order by ready_rows desc, set_code
      limit 100`);

    const blockedRows = await queryRows(client, `${BASE_CTE}
      select
        card_print_id,
        set_code,
        set_name,
        number,
        name,
        external_discovery_candidate_id,
        staging_source,
        upstream_id,
        tcgplayer_external_id,
        rows_per_parent,
        rows_per_tcgplayer_id,
        external_id_exists_anywhere,
        case
          when external_id_exists_anywhere then 'blocked_existing_tcgplayer_external_id_collision'
          when rows_per_parent > 1 then 'blocked_multi_staging_rows_for_parent'
          when rows_per_tcgplayer_id > 1 then 'blocked_batch_duplicate_tcgplayer_id'
          else 'ready_from_resolved_staging_tcgplayer_id'
        end as classification
      from classified
      where not (rows_per_parent = 1 and rows_per_tcgplayer_id = 1 and external_id_exists_anywhere = false)
      order by classification, set_code, number, name, card_print_id
      limit 500`);

    const report = {
      contract: 'TCGMAP04_STAGING_TCGPLAYER_BRIDGE_READINESS_V1',
      generated_at: new Date().toISOString(),
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      pricing_writes_performed: false,
      image_writes_performed: false,
      scope: 'English physical card_prints missing active tcgplayer mapping and resolved external_discovery_candidates.tcgplayer_id present',
      totals,
      classification_buckets: classificationBuckets,
      ready_by_set: readyBySet,
      ready_rows: readyRows,
      blocked_rows_sample: blockedRows,
      recommended_next_package: readyRows.length > 0
        ? {
            package_id: 'TCGMAP-04A-STAGING-TCGPLAYER-MAPPING-INSERTS',
            mode: 'guarded_dry_run_only',
            target_rows: readyRows.length,
          }
        : null,
    };
    report.fingerprint_sha256 = sha256(stableJson({
      contract: report.contract,
      totals,
      readyRows: readyRows.map((row) => ({
        card_print_id: row.card_print_id,
        tcgplayer_external_id: row.tcgplayer_external_id,
        external_discovery_candidate_id: row.external_discovery_candidate_id,
      })),
    }));

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, buildMarkdown(report));

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      fingerprint_sha256: report.fingerprint_sha256,
      totals,
      classification_buckets: classificationBuckets,
      recommended_next_package: report.recommended_next_package,
      db_writes_performed: false,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[tcgmap04-readiness] failed:', error);
  process.exit(1);
});
