import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

import {
  CONTRACT_KEY,
  EXPECTED_SLOTS_PER_LANE,
  OUTPUT_DIR,
  runBaseSetPrintRunLanesContractAuditV1,
} from './base_set_print_run_lanes_contract_v1.mjs';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

export const PACKAGE_ID = 'BASE-SET-PRINT-RUN-LANES-GUARDED-DRY-RUN-V1';
export const SQL_PATH = 'docs/sql/base_set_print_run_lanes_guarded_dry_run_v1.sql';
export const REPORT_JSON = path.join(OUTPUT_DIR, 'base_set_print_run_lanes_guarded_dry_run_v1.json');
export const REPORT_MD = path.join(OUTPUT_DIR, 'base_set_print_run_lanes_guarded_dry_run_v1.md');

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

function quoteSql(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildLaneValuesSql(audit) {
  const lanes = audit.lane_audits.filter((lane) => lane.lane_code !== 'base1-unlimited');
  return lanes.map((lane) => `    (${quoteSql(lane.lane_code)}, ${quoteSql(lane.label)}, ${quoteSql(lane.required_modifier)})`).join(',\n');
}

export function buildGuardedDryRunSql(audit) {
  const laneValues = buildLaneValuesSql(audit);
  const auditFingerprint = sha256(stableJson({
    contract_key: audit.contract_key,
    ordinary_base_checklist: audit.ordinary_base_checklist,
    lane_audits: audit.lane_audits.map((lane) => ({
      lane_code: lane.lane_code,
      current_satisfied_slots: lane.current_satisfied_slots,
      current_missing_slots: lane.current_missing_slots,
      proposed_new_identity_row_count: lane.proposed_new_identity_row_count,
    })),
  }));

  return `-- ${PACKAGE_ID}
-- Contract: ${CONTRACT_KEY}
-- Scope: rollback-only dry-run for three derived Base Set print-run set rows and 304 missing lane identity rows.
-- This artifact must not be used as a real apply without a separate approval gate.

begin;

do $$
declare
  v_source_set public.sets%rowtype;
  v_ordinary_slots integer;
  v_existing_derived_sets integer;
  v_existing_proposed_gv_ids integer;
begin
  select * into v_source_set
  from public.sets
  where code = 'base1'
  limit 1;

  if not found then
    raise exception '${PACKAGE_ID}: source set base1 is missing';
  end if;

  select count(*)::int
  into v_ordinary_slots
  from public.card_prints cp
  where cp.set_code = 'base1'
    and nullif(btrim(coalesce(cp.gv_id, '')), '') is not null
    and coalesce(cp.variant_key, '') = ''
    and cp.printed_identity_modifier is null
    and cp.number_plain ~ '^[0-9]+$';

  if v_ordinary_slots <> ${EXPECTED_SLOTS_PER_LANE} then
    raise exception '${PACKAGE_ID}: expected 102 ordinary Base Set slots, found %', v_ordinary_slots;
  end if;

  select count(*)::int
  into v_existing_derived_sets
  from public.sets
  where code in ('base1-shadowless', 'base1-first-edition', 'base1-1999-2000');

  if v_existing_derived_sets <> 0 then
    raise exception '${PACKAGE_ID}: derived set rows already exist; rerun the read-only audit before applying';
  end if;

  with lane_config(lane_code, label, required_modifier) as (
    values
${laneValues}
  ),
  proposed as (
    select
      case
        when lc.lane_code = 'base1-shadowless' then 'GV-PK-BASE1-' || cp.number_plain || '-SHADOWLESS'
        when lc.lane_code = 'base1-first-edition' then 'GV-PK-BASE1-' || cp.number_plain || '-FIRST-EDITION'
        when lc.lane_code = 'base1-1999-2000' then 'GV-PK-BASE1-' || cp.number_plain || '-1999-2000'
      end as proposed_gv_id
    from lane_config lc
    cross join public.card_prints cp
    where cp.set_code = 'base1'
      and nullif(btrim(coalesce(cp.gv_id, '')), '') is not null
      and coalesce(cp.variant_key, '') = ''
      and cp.printed_identity_modifier is null
      and cp.number_plain ~ '^[0-9]+$'
      and not (cp.number_plain = '58' and lc.lane_code in ('base1-shadowless', 'base1-first-edition'))
  )
  select count(*)::int
  into v_existing_proposed_gv_ids
  from proposed p
  join public.card_prints existing on existing.gv_id = p.proposed_gv_id;

  if v_existing_proposed_gv_ids <> 0 then
    raise exception '${PACKAGE_ID}: proposed gv_id collisions found: %', v_existing_proposed_gv_ids;
  end if;
end $$;

with lane_config(lane_code, label, required_modifier) as (
  values
${laneValues}
),
source_set as (
  select * from public.sets where code = 'base1' limit 1
),
inserted_sets as (
  insert into public.sets (
    game,
    code,
    name,
    release_date,
    source,
    logo_url,
    symbol_url,
    printed_total,
    printed_set_abbrev,
    set_role,
    identity_domain_default,
    hero_image_url,
    hero_image_source,
    identity_model
  )
  select
    'pokemon',
    lc.lane_code,
    lc.label,
    source_set.release_date,
    jsonb_build_object(
      'grookai',
      jsonb_build_object(
        'contract', '${CONTRACT_KEY}',
        'package_id', '${PACKAGE_ID}',
        'source_set_code', 'base1',
        'lane_code', lc.lane_code,
        'audit_fingerprint_sha256', '${auditFingerprint}'
      )
    ),
    source_set.logo_url,
    source_set.symbol_url,
    ${EXPECTED_SLOTS_PER_LANE},
    source_set.printed_set_abbrev,
    null,
    source_set.identity_domain_default,
    source_set.hero_image_url,
    source_set.hero_image_source,
    'standard'
  from lane_config lc
  cross join source_set
  where not exists (
    select 1 from public.sets existing where existing.code = lc.lane_code
  )
  returning id, code
),
ordinary_base as (
  select cp.*
  from public.card_prints cp
  where cp.set_code = 'base1'
    and nullif(btrim(coalesce(cp.gv_id, '')), '') is not null
    and coalesce(cp.variant_key, '') = ''
    and cp.printed_identity_modifier is null
    and cp.number_plain ~ '^[0-9]+$'
),
planned_rows as (
  select
    inserted_sets.id as target_set_id,
    lc.lane_code,
    ordinary_base.id as source_card_print_id,
    ordinary_base.gv_id as source_gv_id,
    ordinary_base.name,
    ordinary_base.number,
    ordinary_base.number_plain,
    ordinary_base.rarity,
    ordinary_base.artist,
    ordinary_base.regulation_mark,
    ordinary_base.variants,
    case
      when lc.lane_code = 'base1-shadowless' then 'shadowless'
      when lc.lane_code = 'base1-first-edition' then 'first_edition'
      when lc.lane_code = 'base1-1999-2000' then '1999_2000'
    end as variant_key,
    lc.required_modifier as printed_identity_modifier,
    case
      when lc.lane_code = 'base1-shadowless' then 'GV-PK-BASE1-' || ordinary_base.number_plain || '-SHADOWLESS'
      when lc.lane_code = 'base1-first-edition' then 'GV-PK-BASE1-' || ordinary_base.number_plain || '-FIRST-EDITION'
      when lc.lane_code = 'base1-1999-2000' then 'GV-PK-BASE1-' || ordinary_base.number_plain || '-1999-2000'
    end as proposed_gv_id
  from lane_config lc
  join inserted_sets on inserted_sets.code = lc.lane_code
  cross join ordinary_base
  where not (ordinary_base.number_plain = '58' and lc.lane_code in ('base1-shadowless', 'base1-first-edition'))
),
inserted_card_prints as (
  insert into public.card_prints (
    set_id,
    name,
    number,
    variant_key,
    rarity,
    image_url,
    tcgplayer_id,
    external_ids,
    set_code,
    artist,
    regulation_mark,
    image_alt_url,
    image_source,
    variants,
    print_identity_key,
    ai_metadata,
    image_hash,
    data_quality_flags,
    image_status,
    image_res,
    image_last_checked_at,
    printed_set_abbrev,
    printed_total,
    gv_id,
    image_path,
    identity_domain,
    printed_identity_modifier,
    set_identity_model,
    representative_image_url,
    image_note
  )
  select
    target_set_id,
    name,
    number,
    variant_key,
    rarity,
    null,
    null,
    jsonb_build_object(
      'grookai',
      jsonb_build_object(
        'contract', '${CONTRACT_KEY}',
        'package_id', '${PACKAGE_ID}',
        'source_set_code', 'base1',
        'source_card_print_id', source_card_print_id,
        'source_gv_id', source_gv_id,
        'lane_code', lane_code,
        'audit_fingerprint_sha256', '${auditFingerprint}'
      )
    ),
    lane_code,
    artist,
    regulation_mark,
    null,
    null,
    variants,
    'base1:' || lane_code || ':' || number_plain,
    jsonb_build_object(
      'contract', '${CONTRACT_KEY}',
      'package_id', '${PACKAGE_ID}',
      'source_set_code', 'base1',
      'source_gv_id', source_gv_id,
      'lane_code', lane_code
    ),
    null,
    jsonb_build_object(
      'contract', '${CONTRACT_KEY}',
      'source_image_truth', 'exact_lane_image_not_cataloged',
      'source_set_code', 'base1'
    ),
    'missing',
    null,
    null,
    'BS',
    ${EXPECTED_SLOTS_PER_LANE},
    proposed_gv_id,
    null,
    'pokemon_eng_standard',
    printed_identity_modifier,
    'standard',
    null,
    '${CONTRACT_KEY}: exact physical lane image not cataloged yet; do not display Unlimited imagery as exact'
  from planned_rows
  returning id, set_code, number_plain, gv_id, variant_key, printed_identity_modifier, image_status
),
lane_slot_proof as (
  select
    'base1-shadowless'::text as lane_code,
    count(distinct number_plain)::int as inserted_slots,
    1::int as existing_special_pikachu_slot,
    count(distinct number_plain)::int + 1 as covered_slots_after_plan
  from inserted_card_prints
  where set_code = 'base1-shadowless'
  union all
  select
    'base1-first-edition',
    count(distinct number_plain)::int,
    1::int,
    count(distinct number_plain)::int + 1
  from inserted_card_prints
  where set_code = 'base1-first-edition'
  union all
  select
    'base1-1999-2000',
    count(distinct number_plain)::int,
    0::int,
    count(distinct number_plain)::int
  from inserted_card_prints
  where set_code = 'base1-1999-2000'
),
forbidden_rows as (
  select count(*)::int as forbidden_count
  from inserted_card_prints
  where gv_id in ('GV-PK-BASE1-58-SHADOWLESS', 'GV-PK-BASE1-58-FIRST-EDITION')
     or variant_key = 'ghost_stamp_shadowless'
     or image_status <> 'missing'
)
select
  '${PACKAGE_ID}'::text as package_id,
  '${CONTRACT_KEY}'::text as contract_key,
  '${auditFingerprint}'::text as audit_fingerprint_sha256,
  (select count(*)::int from inserted_sets) as inserted_set_rows,
  (select count(*)::int from inserted_card_prints) as inserted_card_print_rows,
  (select forbidden_count from forbidden_rows) as forbidden_rows,
  jsonb_agg(
    jsonb_build_object(
      'lane_code', lane_code,
      'inserted_slots', inserted_slots,
      'existing_special_pikachu_slot', existing_special_pikachu_slot,
      'covered_slots_after_plan', covered_slots_after_plan
    )
    order by lane_code
  ) as lane_slot_proof
from lane_slot_proof;

rollback;
`;
}

function validateSql(sql) {
  const stripped = sql.replace(/--.*$/gm, '');
  const findings = [];
  if (!/(^|\n)\s*begin\s*;/i.test(stripped)) findings.push('missing_begin');
  if (!/(^|\n)\s*rollback\s*;/i.test(stripped)) findings.push('missing_rollback');
  if (/(^|\n)\s*commit\s*;/i.test(stripped)) findings.push('contains_commit');
  if (/\bdelete\s+from\b/i.test(stripped)) findings.push('contains_delete');
  if (/\bupdate\s+public\./i.test(stripped)) findings.push('contains_update_public');
  if (!/\binsert\s+into\s+public\.sets\b/i.test(stripped)) findings.push('missing_sets_insert');
  if (!/\binsert\s+into\s+public\.card_prints\b/i.test(stripped)) findings.push('missing_card_prints_insert');
  if (/then\s+'GV-PK-BASE1-58-SHADOWLESS'/i.test(stripped)) findings.push('contains_generic_shadowless_pikachu_insert');
  if (/then\s+'GV-PK-BASE1-58-FIRST-EDITION'/i.test(stripped)) findings.push('contains_generic_first_edition_pikachu_insert');
  if (/missing_variant_visual/i.test(stripped)) findings.push('contains_disallowed_image_status');
  return findings;
}

async function captureTargetSnapshot(client) {
  const result = await client.query(
    `select 'set' as row_type, s.id::text as id, s.code, s.name, null::text as gv_id, null::text as number_plain
     from public.sets s
     where s.code in ('base1-shadowless', 'base1-first-edition', 'base1-1999-2000')
     union all
     select 'card_print' as row_type, cp.id::text as id, cp.set_code as code, cp.name, cp.gv_id, cp.number_plain
     from public.card_prints cp
     where cp.set_code in ('base1-shadowless', 'base1-first-edition', 'base1-1999-2000')
        or cp.gv_id in ('GV-PK-BASE1-58-SHADOWLESS', 'GV-PK-BASE1-58-FIRST-EDITION')
     order by row_type, code, number_plain, gv_id`,
  );
  return {
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      total_rows: result.rows.length,
      set_rows: result.rows.filter((row) => row.row_type === 'set').length,
      card_print_rows: result.rows.filter((row) => row.row_type === 'card_print').length,
    },
  };
}

async function executeRollbackDryRun(sql) {
  const dbUrl = connectionString();
  if (!dbUrl) {
    return {
      connected: false,
      execution_status: 'blocked_no_database_connection_string',
      error_message: 'Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.',
      before_snapshot: null,
      after_snapshot: null,
      proof_rows: [],
    };
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const beforeSnapshot = await captureTargetSnapshot(client);
    let executionStatus = 'guarded_dry_run_transaction_completed_and_rolled_back';
    let errorMessage = null;
    let proofRows = [];

    try {
      const result = await client.query(sql);
      const resultSets = Array.isArray(result) ? result : [result];
      proofRows = resultSets.flatMap((entry) => entry.rows ?? []).filter((row) => row.package_id === PACKAGE_ID);
    } catch (error) {
      executionStatus = 'guarded_dry_run_transaction_failed';
      errorMessage = error.message;
      await client.query('rollback').catch(() => {});
    }

    const afterSnapshot = await captureTargetSnapshot(client);
    return {
      connected: true,
      execution_status: executionStatus,
      error_message: errorMessage,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      proof_rows: proofRows,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function evaluateReport({ audit, sqlFindings, execution }) {
  const findings = [...sqlFindings];
  const proof = execution.proof_rows?.[0] ?? null;

  if (!execution.connected) findings.push('database_connection_unavailable');
  if (execution.execution_status !== 'guarded_dry_run_transaction_completed_and_rolled_back') findings.push('dry_run_transaction_did_not_complete');
  if (execution.error_message) findings.push('dry_run_error_message_present');
  if (execution.before_snapshot?.hash_sha256 !== execution.after_snapshot?.hash_sha256) findings.push('rollback_snapshot_hash_mismatch');
  if (execution.after_snapshot?.counts?.total_rows !== execution.before_snapshot?.counts?.total_rows) findings.push('rollback_target_count_mismatch');
  if (!proof) findings.push('proof_row_missing');

  if (proof) {
    if (Number(proof.inserted_set_rows) !== 3) findings.push('proof_set_row_count_not_three');
    if (Number(proof.inserted_card_print_rows) !== audit.summary.total_proposed_new_identity_rows) findings.push('proof_card_print_count_mismatch');
    if (Number(proof.forbidden_rows) !== 0) findings.push('proof_forbidden_rows_present');
    const laneProof = Array.isArray(proof.lane_slot_proof) ? proof.lane_slot_proof : [];
    for (const laneCode of ['base1-shadowless', 'base1-first-edition', 'base1-1999-2000']) {
      const row = laneProof.find((entry) => entry.lane_code === laneCode);
      if (!row) findings.push(`proof_missing_lane_${laneCode}`);
      if (row && Number(row.covered_slots_after_plan) !== EXPECTED_SLOTS_PER_LANE) {
        findings.push(`proof_lane_not_102_${laneCode}`);
      }
    }
  }

  return findings;
}

function buildMarkdown(report) {
  const laneRows = report.proof_row?.lane_slot_proof ?? [];
  const laneTable = laneRows.length
    ? [
      '| Lane | Inserted Slots | Existing Special Pikachu Slot | Covered After Plan |',
      '| --- | --- | --- | --- |',
      ...laneRows.map((row) => `| ${row.lane_code} | ${row.inserted_slots} | ${row.existing_special_pikachu_slot} | ${row.covered_slots_after_plan} |`),
    ].join('\n')
    : '_No proof row captured._';

  return `# Base Set Print Run Lanes Guarded Dry-Run V1

Generated: ${report.generated_at}

Package: ${report.package_id}

Contract: ${report.contract_key}

## Safety

- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}
- rollback_snapshot_matches: ${report.rollback_snapshot_matches}
- write_ready_now: ${report.write_ready_now}
- stop_findings: ${report.stop_findings.length}

## Required Real Apply Approval

\`${report.required_real_apply_approval_text}\`

## Planned Inserts

- derived set rows: 3
- card_print rows: ${report.audit_summary.total_proposed_new_identity_rows}
- generic Shadowless Pikachu row: blocked
- generic 1st Edition Pikachu row: blocked
- Ghost Stamp ordinary lane coverage: blocked
- image status for new rows: missing

## Rollback Proof

- execution_status: ${report.execution.execution_status}
- before_hash: \`${report.execution.before_snapshot?.hash_sha256 ?? 'missing'}\`
- after_hash: \`${report.execution.after_snapshot?.hash_sha256 ?? 'missing'}\`
- proof_inserted_set_rows: ${report.proof_row?.inserted_set_rows ?? 'missing'}
- proof_inserted_card_print_rows: ${report.proof_row?.inserted_card_print_rows ?? 'missing'}
- proof_forbidden_rows: ${report.proof_row?.forbidden_rows ?? 'missing'}

${laneTable}

## SQL Artifact

\`${SQL_PATH}\`
`;
}

export async function runBaseSetPrintRunLanesGuardedDryRunV1() {
  const audit = await runBaseSetPrintRunLanesContractAuditV1();
  const sql = buildGuardedDryRunSql(audit);
  const sqlHash = sha256(sql);
  const sqlFindings = validateSql(sql);

  await writeText(SQL_PATH, sql);

  const execution = await executeRollbackDryRun(sql);
  const stopFindings = evaluateReport({ audit, sqlFindings, execution });
  const beforeHash = execution.before_snapshot?.hash_sha256 ?? 'missing';
  const afterHash = execution.after_snapshot?.hash_sha256 ?? 'missing';
  const auditFingerprint = execution.proof_rows?.[0]?.audit_fingerprint_sha256 ?? 'missing';
  const requiredApprovalText = [
    `Approve real BASE-SET-PRINT-RUN-LANES-V1 apply only.`,
    `Fingerprint: ${auditFingerprint}.`,
    `SQL hash: ${sqlHash}.`,
    'Scope: 3 derived Base Set collector lane set inserts and 304 card_print lane identity inserts for Shadowless, 1st Edition, and 1999-2000.',
    'Dry-run proof:',
    `${beforeHash} == ${afterHash}.`,
    'No child writes. No identity-table writes. No external mapping writes. No price writes. No deletes. No merges. No migrations. No exact image claims. No global apply.',
  ].join(' ');
  const report = {
    package_id: PACKAGE_ID,
    contract_key: CONTRACT_KEY,
    generated_at: new Date().toISOString(),
    sql_path: SQL_PATH,
    sql_hash_sha256: sqlHash,
    required_real_apply_approval_text: requiredApprovalText,
    audit_summary: audit.summary,
    durable_db_writes_performed: false,
    migrations_created: false,
    real_apply_authorized: false,
    write_ready_now: stopFindings.length === 0,
    rollback_snapshot_matches: execution.before_snapshot?.hash_sha256 === execution.after_snapshot?.hash_sha256,
    execution,
    proof_row: execution.proof_rows?.[0] ?? null,
    stop_findings: stopFindings,
  };

  await writeJson(REPORT_JSON, report);
  await writeText(REPORT_MD, buildMarkdown(report));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runBaseSetPrintRunLanesGuardedDryRunV1()
    .then((report) => {
      console.log(JSON.stringify({
        package_id: report.package_id,
        write_ready_now: report.write_ready_now,
        durable_db_writes_performed: report.durable_db_writes_performed,
        execution_status: report.execution.execution_status,
        inserted_set_rows: report.proof_row?.inserted_set_rows ?? null,
        inserted_card_print_rows: report.proof_row?.inserted_card_print_rows ?? null,
        forbidden_rows: report.proof_row?.forbidden_rows ?? null,
        stop_findings: report.stop_findings,
        sql_path: report.sql_path,
        report_path: REPORT_MD,
      }, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
