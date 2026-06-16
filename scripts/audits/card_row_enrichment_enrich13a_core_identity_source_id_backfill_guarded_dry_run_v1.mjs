import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const READINESS_JSON = path.join(OUTPUT_DIR, 'enrich13_core_identity_resolution_readiness_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich13a_core_identity_source_id_backfill_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich13a_core_identity_source_id_backfill_guarded_dry_run_v1.md');

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

function sqlHash(strings) {
  return sha256(strings.join('\n').replace(/\s+/g, ' ').trim());
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
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

async function queryRows(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

function buildPlanRows(readiness) {
  return (readiness.ready_rows ?? []).map((row) => ({
    card_print_id: row.card_print_id,
    expected_set_code: row.current_set_code,
    expected_number: row.current_number,
    expected_number_plain: row.current_number_plain,
    proposed_set_code: row.proposed_set_code,
    proposed_number: row.proposed_number,
    card_name: row.card_name,
    source: row.parsed_source?.source ?? null,
    source_external_id: row.parsed_source?.external_id ?? null,
  }));
}

const UPDATE_SQL = `
with plan_rows as (
  select *
  from jsonb_to_recordset($1::jsonb) as p(
    card_print_id uuid,
    expected_set_code text,
    expected_number text,
    expected_number_plain text,
    proposed_set_code text,
    proposed_number text,
    card_name text,
    source text,
    source_external_id text
  )
),
eligible as (
  select
    cp.id,
    cp.set_code as before_set_code,
    cp.number as before_number,
    cp.number_plain as before_number_plain,
    p.proposed_set_code,
    p.proposed_number
  from public.card_prints cp
  join plan_rows p on p.card_print_id = cp.id
  where cp.set_code is not distinct from p.expected_set_code
    and cp.number is not distinct from p.expected_number
    and cp.number_plain is not distinct from p.expected_number_plain
)
update public.card_prints cp
set
  set_code = coalesce(cp.set_code, eligible.proposed_set_code),
  number = coalesce(cp.number, eligible.proposed_number),
  updated_at = now()
from eligible
where cp.id = eligible.id
returning
  cp.id::text as card_print_id,
  eligible.before_set_code,
  eligible.before_number,
  eligible.before_number_plain,
  cp.set_code as after_set_code,
  cp.number as after_number,
  cp.number_plain as after_number_plain
`;

async function snapshotHash(client, planRows) {
  const rows = await queryRows(client, `
    select
      cp.id::text as card_print_id,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.updated_at::text as updated_at
    from public.card_prints cp
    join jsonb_to_recordset($1::jsonb) as p(card_print_id uuid) on p.card_print_id = cp.id
    order by cp.id::text
  `, [JSON.stringify(planRows.map((row) => ({ card_print_id: row.card_print_id })))]);
  return sha256(stableJson(rows));
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for guarded dry-run.');

  const readiness = await readJson(READINESS_JSON);
  const planRows = buildPlanRows(readiness);
  if (!planRows.length) throw new Error('No ENRICH-13 ready rows found.');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  let beforeHash = null;
  let inTransactionHash = null;
  let afterRollbackHash = null;
  let updatedRows = [];

  try {
    beforeHash = await snapshotHash(client, planRows);
    await client.query('begin');
    await client.query("set local statement_timeout = '60s'");
    updatedRows = await queryRows(client, UPDATE_SQL, [JSON.stringify(planRows)]);
    inTransactionHash = await snapshotHash(client, planRows);
    await client.query('rollback');
    afterRollbackHash = await snapshotHash(client, planRows);
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Ignore rollback failures so the original error is preserved.
    }
    throw error;
  } finally {
    await client.end();
  }

  const updatedIds = new Set(updatedRows.map((row) => row.card_print_id));
  const missingIds = planRows.filter((row) => !updatedIds.has(row.card_print_id)).map((row) => row.card_print_id);
  const bySet = {};
  for (const row of planRows) {
    bySet[row.proposed_set_code] = (bySet[row.proposed_set_code] ?? 0) + 1;
  }

  const report = {
    version: 'ENRICH-13A-CORE-IDENTITY-SOURCE-ID-BACKFILL-GUARDED-DRY-RUN-V1',
    generated_at: new Date().toISOString(),
    mode: 'guarded_transaction_rollback_dry_run',
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    source_readiness_file: READINESS_JSON,
    source_readiness_fingerprint_sha256: readiness.fingerprint_sha256,
    package_id: 'ENRICH-13A-CORE-IDENTITY-SOURCE-ID-BACKFILL',
    scope: {
      candidate_parent_rows: planRows.length,
      expected_parent_updates: planRows.length,
      actual_parent_updates_inside_rollback_transaction: updatedRows.length,
      proposed_write_surface: ['card_prints.set_code', 'card_prints.number'],
      derived_surface: ['card_prints.number_plain generated by DB'],
      forbidden: ['child writes', 'gv_id writes', 'identity inserts', 'external mapping writes', 'deletes', 'merges', 'migrations', 'image writes'],
    },
    set_distribution: Object.fromEntries(Object.entries(bySet).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    proof: {
      before_hash: beforeHash,
      in_transaction_hash: inTransactionHash,
      after_rollback_hash: afterRollbackHash,
      rollback_restored_original_state: beforeHash === afterRollbackHash,
      transaction_changed_target_state: beforeHash !== inTransactionHash,
      updated_all_candidate_rows_inside_transaction: updatedRows.length === planRows.length,
      missing_update_ids: missingIds,
    },
    sql_hash: sqlHash([UPDATE_SQL]),
    fingerprint_sha256: sha256(stableJson({
      package_id: 'ENRICH-13A-CORE-IDENTITY-SOURCE-ID-BACKFILL',
      planRows,
      sql_hash: sqlHash([UPDATE_SQL]),
      proof: {
        beforeHash,
        inTransactionHash,
        afterRollbackHash,
        updatedCount: updatedRows.length,
      },
    })),
    plan_rows: planRows,
    updated_row_samples: updatedRows.slice(0, 50),
  };

  await writeJson(OUTPUT_JSON, report);

  const setRows = Object.entries(report.set_distribution).map(([set_code, count]) => ({ set_code, count }));
  const md = [
    '# ENRICH-13A Core Identity Source ID Backfill Guarded Dry-Run V1',
    '',
    'Rollback-only dry-run for parent core identity updates from exact source IDs.',
    '',
    '## Safety',
    '',
    '- DB writes performed: false',
    '- Migrations created: false',
    '- Cleanup performed: false',
    '- Transaction was rolled back',
    '- No child writes, GV-ID writes, identity inserts, external mapping writes, deletes, merges, migrations, or image writes',
    '',
    '## Scope',
    '',
    `- Candidate parent rows: ${report.scope.candidate_parent_rows}`,
    `- Parent updates inside rollback transaction: ${report.scope.actual_parent_updates_inside_rollback_transaction}`,
    `- SQL hash: \`${report.sql_hash}\``,
    '',
    '## Rollback Proof',
    '',
    `- Before hash: \`${report.proof.before_hash}\``,
    `- In-transaction hash: \`${report.proof.in_transaction_hash}\``,
    `- After rollback hash: \`${report.proof.after_rollback_hash}\``,
    `- Rollback restored original state: ${report.proof.rollback_restored_original_state}`,
    `- Transaction changed target state: ${report.proof.transaction_changed_target_state}`,
    `- Updated all candidate rows: ${report.proof.updated_all_candidate_rows_inside_transaction}`,
    '',
    '## Set Distribution',
    '',
    markdownTable(setRows, [
      { label: 'set', value: (row) => row.set_code },
      { label: 'rows', value: (row) => row.count },
    ]),
    '',
    '## Real Apply Status',
    '',
    'Real apply is not authorized by this dry-run. It requires explicit approval with the fingerprint and dry-run proof.',
    '',
    `Fingerprint: \`${report.fingerprint_sha256}\``,
    '',
  ].join('\n');

  await writeText(OUTPUT_MD, md);

  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    package_id: report.package_id,
    fingerprint_sha256: report.fingerprint_sha256,
    sql_hash: report.sql_hash,
    scope: report.scope,
    proof: report.proof,
  }, null, 2));
}

await main();
