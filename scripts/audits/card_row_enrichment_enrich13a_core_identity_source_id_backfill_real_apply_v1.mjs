import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich13a_core_identity_source_id_backfill_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich13a_core_identity_source_id_backfill_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich13a_core_identity_source_id_backfill_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-13A-CORE-IDENTITY-SOURCE-ID-BACKFILL';
const EXPECTED_FINGERPRINT = '5b983d50dd7534067db28078899b4d57973ecae7ea40a15a56626dc757f04e8e';
const EXPECTED_SQL_HASH = '854b199d7851176d010b56cd6d955f853bf839328e7473c69069f0fc28982306';
const EXPECTED_TARGET_ROWS = 240;
const EXPECTED_DRY_RUN_BEFORE_AFTER_HASH = 'de71e5a7502b4447c79a7c512637ff5369023a065e68729a35b9202a4cae708e';
const EXPECTED_DRY_RUN_IN_TRANSACTION_HASH = 'd34a835fcccf7c08c59cae1205fd07b6d995d0546dd62c8e3ac1b7057839e35e';
const APPROVAL_TEXT = 'Approve real ENRICH-13A-CORE-IDENTITY-SOURCE-ID-BACKFILL apply only. Fingerprint: 5b983d50dd7534067db28078899b4d57973ecae7ea40a15a56626dc757f04e8e. SQL hash: 854b199d7851176d010b56cd6d955f853bf839328e7473c69069f0fc28982306. Scope: 240 parent core identity updates from exact source IDs; writes card_prints.set_code and card_prints.number only; card_prints.number_plain is DB-generated. Dry-run proof: de71e5a7502b4447c79a7c512637ff5369023a065e68729a35b9202a4cae708e == de71e5a7502b4447c79a7c512637ff5369023a065e68729a35b9202a4cae708e. No child writes. No GV-ID writes. No identity inserts. No external mapping writes. No deletes. No merges. No migrations. No image writes. No global apply.';

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
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

function validateDryRun(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (dryRun.fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('fingerprint_mismatch');
  if (dryRun.sql_hash !== EXPECTED_SQL_HASH) findings.push('sql_hash_mismatch');
  if (dryRun.sql_hash !== sqlHash([UPDATE_SQL])) findings.push('local_sql_hash_mismatch');
  if (dryRun.scope?.candidate_parent_rows !== EXPECTED_TARGET_ROWS) findings.push('candidate_parent_rows_mismatch');
  if (dryRun.scope?.actual_parent_updates_inside_rollback_transaction !== EXPECTED_TARGET_ROWS) findings.push('dry_run_update_count_mismatch');
  if (dryRun.proof?.before_hash !== EXPECTED_DRY_RUN_BEFORE_AFTER_HASH) findings.push('dry_run_before_hash_mismatch');
  if (dryRun.proof?.after_rollback_hash !== EXPECTED_DRY_RUN_BEFORE_AFTER_HASH) findings.push('dry_run_after_hash_mismatch');
  if (dryRun.proof?.in_transaction_hash !== EXPECTED_DRY_RUN_IN_TRANSACTION_HASH) findings.push('dry_run_in_transaction_hash_mismatch');
  if (dryRun.proof?.rollback_restored_original_state !== true) findings.push('rollback_proof_failed');
  if (dryRun.proof?.transaction_changed_target_state !== true) findings.push('transaction_did_not_change_target_state');
  if (dryRun.proof?.updated_all_candidate_rows_inside_transaction !== true) findings.push('dry_run_did_not_update_all_candidates');
  if ((dryRun.plan_rows ?? []).length !== EXPECTED_TARGET_ROWS) findings.push('plan_row_count_mismatch');
  return findings;
}

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
  return {
    row_count: rows.length,
    rows,
    hash_sha256: sha256(stableJson(rows)),
  };
}

async function validatePreconditions(client, planRows) {
  const rows = await queryRows(client, `
    with plan_rows as (
      select *
      from jsonb_to_recordset($1::jsonb) as p(
        card_print_id uuid,
        expected_set_code text,
        expected_number text,
        expected_number_plain text,
        proposed_set_code text,
        proposed_number text
      )
    )
    select
      (select count(*)::int from plan_rows) as target_count,
      (select count(distinct card_print_id)::int from plan_rows) as distinct_target_count,
      (select count(*)::int from plan_rows p left join public.card_prints cp on cp.id = p.card_print_id where cp.id is null) as missing_parent_count,
      (select count(*)::int
       from plan_rows p
       join public.card_prints cp on cp.id = p.card_print_id
       where cp.set_code is distinct from p.expected_set_code
          or cp.number is distinct from p.expected_number
          or cp.number_plain is distinct from p.expected_number_plain) as precondition_drift_count,
      (select count(*)::int
       from plan_rows p
       join public.card_prints cp on cp.id <> p.card_print_id
       where cp.set_id = (select owner.set_id from public.card_prints owner where owner.id = p.card_print_id)
         and cp.number_plain is not distinct from (
           case
             when p.proposed_number is null then null::text
             when p.proposed_number ~ '^[A-Za-z][0-9]+$' then upper(p.proposed_number)
             when p.proposed_number ~ '[0-9]' then regexp_replace(regexp_replace(p.proposed_number, '/.*$', ''), '[^0-9]', '', 'g')
             else p.proposed_number
           end
         )
         and coalesce(cp.variant_key, '') = coalesce((select owner.variant_key from public.card_prints owner where owner.id = p.card_print_id), '')
         and cp.printed_identity_modifier is not distinct from (select owner.printed_identity_modifier from public.card_prints owner where owner.id = p.card_print_id)
      ) as proposed_identity_collision_count`,
    [JSON.stringify(planRows)],
  );
  return rows[0];
}

function preconditionsPass(preconditions) {
  return preconditions.target_count === EXPECTED_TARGET_ROWS
    && preconditions.distinct_target_count === EXPECTED_TARGET_ROWS
    && preconditions.missing_parent_count === 0
    && preconditions.precondition_drift_count === 0
    && preconditions.proposed_identity_collision_count === 0;
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');

  const dryRun = await readJson(DRY_RUN_JSON);
  const dryRunFindings = validateDryRun(dryRun);
  if (dryRunFindings.length > 0) {
    throw new Error(`DRY_RUN_VALIDATION_FAILED:${dryRunFindings.join(',')}`);
  }

  const planRows = dryRun.plan_rows ?? [];
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  let beforeSnapshot = null;
  let preconditions = null;
  let updatedRows = [];
  let afterSnapshot = null;

  try {
    beforeSnapshot = await snapshotHash(client, planRows);
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    preconditions = await validatePreconditions(client, planRows);
    if (!preconditionsPass(preconditions)) {
      throw new Error(`PRECONDITION_FAILED:${JSON.stringify(preconditions)}`);
    }

    updatedRows = await queryRows(client, UPDATE_SQL, [JSON.stringify(planRows)]);
    if (updatedRows.length !== EXPECTED_TARGET_ROWS) {
      throw new Error(`UPDATE_COUNT_MISMATCH:${updatedRows.length}`);
    }

    await client.query('commit');
    afterSnapshot = await snapshotHash(client, planRows);
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Transaction may already be closed.
    }
    throw error;
  } finally {
    await client.end();
  }

  const stopFindings = [];
  if (beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256) stopFindings.push('target_state_did_not_change');
  if (updatedRows.length !== EXPECTED_TARGET_ROWS) stopFindings.push('updated_rows_mismatch');
  if (afterSnapshot.row_count !== EXPECTED_TARGET_ROWS) stopFindings.push('after_snapshot_row_count_mismatch');

  const report = {
    version: 'ENRICH13A_CORE_IDENTITY_SOURCE_ID_BACKFILL_REAL_APPLY_V1',
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    approval_text_required: APPROVAL_TEXT,
    package_fingerprint_sha256: EXPECTED_FINGERPRINT,
    sql_hash: EXPECTED_SQL_HASH,
    dry_run_reference: {
      dry_run_json: DRY_RUN_JSON,
      dry_run_before_after_hash: `${EXPECTED_DRY_RUN_BEFORE_AFTER_HASH} == ${EXPECTED_DRY_RUN_BEFORE_AFTER_HASH}`,
      dry_run_in_transaction_hash: EXPECTED_DRY_RUN_IN_TRANSACTION_HASH,
    },
    scope: {
      target_parent_rows: EXPECTED_TARGET_ROWS,
      updated_parent_rows: updatedRows.length,
      writes_performed: ['card_prints.set_code', 'card_prints.number'],
      derived_surface: ['card_prints.number_plain generated by DB'],
      child_writes: false,
      gv_id_writes: false,
      identity_writes: false,
      external_mapping_writes: false,
      deletes: false,
      merges: false,
      migrations_created: false,
      image_writes: false,
      global_apply: false,
    },
    preconditions,
    before_snapshot: {
      row_count: beforeSnapshot.row_count,
      hash_sha256: beforeSnapshot.hash_sha256,
    },
    after_snapshot: {
      row_count: afterSnapshot.row_count,
      hash_sha256: afterSnapshot.hash_sha256,
    },
    set_distribution: countBy(planRows, (row) => row.proposed_set_code),
    updated_row_samples: updatedRows.slice(0, 50),
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };

  await writeJson(OUTPUT_JSON, report);

  const md = [
    '# ENRICH-13A Core Identity Source ID Backfill Real Apply V1',
    '',
    `Package: \`${PACKAGE_ID}\``,
    '',
    '## Result',
    '',
    `- Pass: ${report.pass}`,
    `- Target parent rows: ${EXPECTED_TARGET_ROWS}`,
    `- Updated parent rows: ${updatedRows.length}`,
    `- Fingerprint: \`${EXPECTED_FINGERPRINT}\``,
    `- SQL hash: \`${EXPECTED_SQL_HASH}\``,
    '',
    '## Safety',
    '',
    '- Writes performed: `card_prints.set_code`, `card_prints.number`',
    '- `card_prints.number_plain` was generated by the DB',
    '- Child writes: false',
    '- GV-ID writes: false',
    '- Identity writes: false',
    '- External mapping writes: false',
    '- Deletes/merges: false',
    '- Migrations created: false',
    '- Image writes: false',
    '- Global apply: false',
    '',
    '## Set Distribution',
    '',
    markdownTable(Object.entries(report.set_distribution).map(([set_code, rows]) => ({ set_code, rows })), [
      { label: 'set_code', value: (row) => row.set_code },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
    '## Stop Findings',
    '',
    report.stop_findings.length ? report.stop_findings.map((finding) => `- ${finding}`).join('\n') : '_None._',
    '',
  ].join('\n');

  await writeText(OUTPUT_MD, md);
  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    pass: report.pass,
    package_fingerprint_sha256: EXPECTED_FINGERPRINT,
    sql_hash: EXPECTED_SQL_HASH,
    updated_parent_rows: updatedRows.length,
    stop_findings: stopFindings,
  }, null, 2));
}

await main();
