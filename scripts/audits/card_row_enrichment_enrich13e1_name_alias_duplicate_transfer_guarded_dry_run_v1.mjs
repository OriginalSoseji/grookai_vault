import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const SQL_DIR = 'docs/sql';
const SOURCE_JSON = path.join(OUTPUT_DIR, 'enrich13e_name_alias_collision_governance_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich13e1_name_alias_duplicate_transfer_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich13e1_name_alias_duplicate_transfer_guarded_dry_run_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'enrich13e1_name_alias_duplicate_transfer_guarded_dry_run_v1.sql');

const PACKAGE_ID = 'ENRICH-13E1-NAME-ALIAS-DUPLICATE-TRANSFER-DRY-RUN';
const EXPECTED_ROWS = 40;
const MANUAL_BLOCKED_NAME = 'Luxray GL';

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

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlUuid(value) {
  return `${sqlString(value)}::uuid`;
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
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

function buildTargetRows(source) {
  return (source.deterministic_rows ?? []).map((row) => ({
    bucket: row.bucket,
    duplicate_card_print_id: row.duplicate_card_print_id,
    canonical_owner_card_print_id: row.canonical_owner_card_print_id,
    set_code: row.set_code,
    number: row.number,
    duplicate_name: row.duplicate_name,
    canonical_owner_name: row.canonical_owner_name,
    source_external_id: row.source_external_id,
  }));
}

function buildSql(targetRows, packageFingerprint) {
  const values = targetRows.map((row) => `  (${[
    sqlString(row.bucket),
    sqlUuid(row.duplicate_card_print_id),
    sqlUuid(row.canonical_owner_card_print_id),
    sqlString(row.set_code),
    sqlString(row.number),
    sqlString(row.duplicate_name),
    sqlString(row.canonical_owner_name),
    sqlString(row.source_external_id),
  ].join(', ')})`);

  return `-- ${PACKAGE_ID} GUARDED DRY-RUN TRANSACTION V1
-- Generated for review/proof only.
-- Package fingerprint: ${packageFingerprint}
-- Scope: ${targetRows.length} deterministic name/alias duplicate parent dependency transfers.
-- This transaction intentionally ends with ROLLBACK and contains no COMMIT.

begin;

create temporary table enrich13e1_targets (
  bucket text not null,
  duplicate_card_print_id uuid primary key,
  canonical_owner_card_print_id uuid not null,
  set_code text not null,
  card_number text not null,
  duplicate_name text not null,
  canonical_owner_name text not null,
  source_external_id text
) on commit drop;

insert into enrich13e1_targets (
  bucket,
  duplicate_card_print_id,
  canonical_owner_card_print_id,
  set_code,
  card_number,
  duplicate_name,
  canonical_owner_name,
  source_external_id
) values
${values.join(',\n')};

do $$
declare
  v_targets integer;
  v_bad_identity integer;
  v_manual_rows integer;
  v_printing_refs integer;
  v_disallowed_parent_refs integer := 0;
  v_dynamic_refs integer;
  r record;
begin
  select count(*) into v_targets from enrich13e1_targets;
  if v_targets <> ${targetRows.length} then
    raise exception 'ENRICH-13E1 target count guard failed: expected ${targetRows.length}, got %', v_targets;
  end if;

  select count(*) into v_manual_rows
  from enrich13e1_targets
  where duplicate_name = ${sqlString(MANUAL_BLOCKED_NAME)}
     or canonical_owner_name = 'Luxray GL LV.X'
     or bucket = 'manual_collision_adjudication_required';
  if v_manual_rows <> 0 then
    raise exception 'ENRICH-13E1 manual-blocked row guard failed: % rows', v_manual_rows;
  end if;

  select count(*) into v_bad_identity
  from enrich13e1_targets target
  left join public.card_prints duplicate on duplicate.id = target.duplicate_card_print_id
  left join public.card_prints owner on owner.id = target.canonical_owner_card_print_id
  where duplicate.id is null
     or owner.id is null
     or duplicate.id = owner.id
     or owner.set_code <> target.set_code
     or owner.number <> target.card_number
     or duplicate.set_code is not null
     or duplicate.number is not null;

  if v_bad_identity <> 0 then
    raise exception 'ENRICH-13E1 parent identity guard failed: % rows', v_bad_identity;
  end if;

  select count(*) into v_printing_refs
  from public.card_printings cpr
  join enrich13e1_targets target on target.duplicate_card_print_id = cpr.card_print_id
  where exists (select 1 from public.external_printing_mappings epm where epm.card_printing_id = cpr.id)
     or exists (select 1 from public.vault_item_instances vii where vii.card_printing_id = cpr.id)
     or exists (select 1 from public.canon_warehouse_candidates cwc where cwc.promoted_card_printing_id = cpr.id);

  if v_printing_refs <> 0 then
    raise exception 'ENRICH-13E1 duplicate child printing dependency guard failed: % refs', v_printing_refs;
  end if;

  for r in
    select
      rel_ns.nspname as schema_name,
      rel.relname as table_name,
      att.attname as column_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace rel_ns on rel_ns.oid = rel.relnamespace
    join pg_class ref on ref.oid = con.confrelid
    join unnest(con.conkey) with ordinality as cols(attnum, ord) on true
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = cols.attnum
    where con.contype = 'f'
      and rel_ns.nspname = 'public'
      and ref.relname = 'card_prints'
      and rel.relname <> all(array[
        'card_print_identity',
        'card_print_species',
        'card_print_traits',
        'card_printings',
        'external_mappings'
      ])
  loop
    execute format(
      'select count(*) from %I.%I where %I in (select duplicate_card_print_id from enrich13e1_targets)',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_disallowed_parent_refs := v_disallowed_parent_refs + v_dynamic_refs;
  end loop;

  if v_disallowed_parent_refs <> 0 then
    raise exception 'ENRICH-13E1 disallowed parent dependency guard failed: % refs', v_disallowed_parent_refs;
  end if;
end $$;

delete from public.external_mappings em
using enrich13e1_targets target
where em.card_print_id = target.duplicate_card_print_id
  and exists (
    select 1
    from public.external_mappings owner_em
    where owner_em.card_print_id = target.canonical_owner_card_print_id
      and owner_em.source = em.source
      and owner_em.external_id = em.external_id
  );

update public.external_mappings em
set card_print_id = target.canonical_owner_card_print_id
from enrich13e1_targets target
where em.card_print_id = target.duplicate_card_print_id;

delete from public.card_print_identity cpi
using enrich13e1_targets target
where cpi.card_print_id = target.duplicate_card_print_id;

delete from public.card_print_traits cpt
using enrich13e1_targets target
where cpt.card_print_id = target.duplicate_card_print_id
  and exists (
    select 1
    from public.card_print_traits owner_trait
    where owner_trait.card_print_id = target.canonical_owner_card_print_id
      and owner_trait.trait_type = cpt.trait_type
      and owner_trait.trait_value = cpt.trait_value
      and owner_trait.source = cpt.source
  );

update public.card_print_traits cpt
set card_print_id = target.canonical_owner_card_print_id
from enrich13e1_targets target
where cpt.card_print_id = target.duplicate_card_print_id;

delete from public.card_print_species cps
using enrich13e1_targets target
where cps.card_print_id = target.duplicate_card_print_id
  and exists (
    select 1
    from public.card_print_species owner_species
    where owner_species.card_print_id = target.canonical_owner_card_print_id
      and owner_species.species_id = cps.species_id
      and owner_species.role = cps.role
      and owner_species.source = cps.source
      and owner_species.active = cps.active
  );

update public.card_print_species cps
set card_print_id = target.canonical_owner_card_print_id,
    updated_at = now()
from enrich13e1_targets target
where cps.card_print_id = target.duplicate_card_print_id;

delete from public.card_printings cpr
using enrich13e1_targets target
where cpr.card_print_id = target.duplicate_card_print_id
  and exists (
    select 1
    from public.card_printings owner_printing
    where owner_printing.card_print_id = target.canonical_owner_card_print_id
      and owner_printing.finish_key = cpr.finish_key
  );

update public.card_printings cpr
set card_print_id = target.canonical_owner_card_print_id
from enrich13e1_targets target
where cpr.card_print_id = target.duplicate_card_print_id;

do $$
declare
  v_remaining_duplicate_dependencies integer;
  v_identity_duplicates integer;
  v_external_duplicates integer;
  v_child_duplicates integer;
begin
  select
    (select count(*) from public.external_mappings where card_print_id in (select duplicate_card_print_id from enrich13e1_targets))
    + (select count(*) from public.card_print_identity where card_print_id in (select duplicate_card_print_id from enrich13e1_targets))
    + (select count(*) from public.card_print_traits where card_print_id in (select duplicate_card_print_id from enrich13e1_targets))
    + (select count(*) from public.card_print_species where card_print_id in (select duplicate_card_print_id from enrich13e1_targets))
    + (select count(*) from public.card_printings where card_print_id in (select duplicate_card_print_id from enrich13e1_targets))
  into v_remaining_duplicate_dependencies;

  if v_remaining_duplicate_dependencies <> 0 then
    raise exception 'ENRICH-13E1 remaining duplicate dependencies guard failed: % rows', v_remaining_duplicate_dependencies;
  end if;

  select count(*) into v_identity_duplicates
  from (
    select identity_domain, identity_key_hash
    from public.card_print_identity
    where is_active = true
    group by identity_domain, identity_key_hash
    having count(*) > 1
  ) dupes;
  if v_identity_duplicates <> 0 then
    raise exception 'ENRICH-13E1 active identity duplicate guard failed: % groups', v_identity_duplicates;
  end if;

  select count(*) into v_external_duplicates
  from (
    select source, external_id
    from public.external_mappings
    where coalesce(active, true) = true
    group by source, external_id
    having count(distinct card_print_id) > 1
  ) dupes;
  if v_external_duplicates <> 0 then
    raise exception 'ENRICH-13E1 external mapping duplicate guard failed: % groups', v_external_duplicates;
  end if;

  select count(*) into v_child_duplicates
  from (
    select card_print_id, finish_key
    from public.card_printings
    group by card_print_id, finish_key
    having count(*) > 1
  ) dupes;
  if v_child_duplicates <> 0 then
    raise exception 'ENRICH-13E1 child printing duplicate guard failed: % groups', v_child_duplicates;
  end if;
end $$;

delete from public.card_prints cp
using enrich13e1_targets target
where cp.id = target.duplicate_card_print_id;

rollback;
`;
}

async function captureSnapshot(client, targetRows) {
  const parentIds = [...new Set([
    ...targetRows.map((row) => row.duplicate_card_print_id),
    ...targetRows.map((row) => row.canonical_owner_card_print_id),
  ])];
  const duplicateIds = [...new Set(targetRows.map((row) => row.duplicate_card_print_id))];
  const ownerIds = [...new Set(targetRows.map((row) => row.canonical_owner_card_print_id))];

  const rows = await client.query(
    `select
       cp.id::text,
       to_jsonb(cp) as card_print,
       coalesce((select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id) from public.card_printings cpr where cpr.card_print_id = cp.id), '[]'::jsonb) as card_printings,
       coalesce((select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id) from public.external_mappings em where em.card_print_id = cp.id), '[]'::jsonb) as external_mappings,
       coalesce((select jsonb_agg(to_jsonb(cpi) order by cpi.identity_domain, cpi.identity_key_hash, cpi.id) from public.card_print_identity cpi where cpi.card_print_id = cp.id), '[]'::jsonb) as card_print_identity,
       coalesce((select jsonb_agg(to_jsonb(cpt) order by cpt.trait_type, cpt.trait_value, cpt.source, cpt.id) from public.card_print_traits cpt where cpt.card_print_id = cp.id), '[]'::jsonb) as card_print_traits,
       coalesce((select jsonb_agg(to_jsonb(cps) order by cps.species_id, cps.role, cps.source, cps.id) from public.card_print_species cps where cps.card_print_id = cp.id), '[]'::jsonb) as card_print_species
     from public.card_prints cp
     where cp.id = any($1::uuid[])
     order by cp.set_code, cp.number_plain, cp.number, cp.name, cp.id`,
    [parentIds],
  );

  const dependencyCounts = await client.query(
    `with duplicate_children as (
       select cpr.id
       from public.card_printings cpr
       where cpr.card_print_id = any($1::uuid[])
     )
     select
       (select count(*)::int from public.card_prints where id = any($1::uuid[])) as duplicate_parents_present,
       (select count(*)::int from public.card_prints where id = any($2::uuid[])) as owner_parents_present,
       (select count(*)::int from public.card_printings where card_print_id = any($1::uuid[])) as duplicate_child_printings,
       (select count(*)::int from public.card_printings where card_print_id = any($2::uuid[])) as owner_child_printings,
       (select count(*)::int from public.external_mappings where card_print_id = any($1::uuid[])) as duplicate_external_mappings,
       (select count(*)::int from public.card_print_identity where card_print_id = any($1::uuid[])) as duplicate_identity_rows,
       (select count(*)::int from public.card_print_traits where card_print_id = any($1::uuid[])) as duplicate_trait_rows,
       (select count(*)::int from public.card_print_species where card_print_id = any($1::uuid[])) as duplicate_species_rows,
       (select count(*)::int from public.external_printing_mappings where card_printing_id in (select id from duplicate_children)) as duplicate_external_printing_refs,
       (select count(*)::int from public.vault_item_instances where card_printing_id in (select id from duplicate_children)) as duplicate_vault_printing_refs,
       (select count(*)::int from public.canon_warehouse_candidates where promoted_card_printing_id in (select id from duplicate_children)) as duplicate_warehouse_printing_refs`,
    [duplicateIds, ownerIds],
  );

  const snapshotRows = rows.rows;
  return {
    captured_at: new Date().toISOString(),
    rows: snapshotRows,
    hash_sha256: hash(stableJson(snapshotRows)),
    impact_counts: {
      card_prints_found: snapshotRows.length,
      ...dependencyCounts.rows[0],
    },
  };
}

async function runDryRun(sql, targetRows) {
  const cs = connectionString();
  if (!cs) {
    return {
      connected: false,
      execution_status: 'blocked_no_database_connection_string',
      error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available.',
      before_snapshot: null,
      after_snapshot: null,
    };
  }

  const client = new Client({ connectionString: cs, application_name: 'enrich13e1_name_alias_duplicate_transfer_guarded_dry_run_v1' });
  await client.connect();
  try {
    const beforeSnapshot = await captureSnapshot(client, targetRows);
    let executionStatus = 'guarded_dry_run_transaction_completed_and_rolled_back';
    let errorMessage = null;
    try {
      await client.query(sql);
    } catch (error) {
      executionStatus = 'guarded_dry_run_transaction_failed';
      errorMessage = error.message;
      await client.query('rollback').catch(() => {});
    }
    const afterSnapshot = await captureSnapshot(client, targetRows);
    return {
      connected: true,
      execution_status: executionStatus,
      error_message: errorMessage,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function validate({ source, targetRows, sql, sqlHash, execution }) {
  const findings = [];
  const strippedSql = sql.replace(/--.*$/gm, '');

  if (source.version !== 'ENRICH_13E_NAME_ALIAS_COLLISION_GOVERNANCE_V1') findings.push('source_report_version_unexpected');
  if (targetRows.length !== EXPECTED_ROWS) findings.push(`target_row_count_not_${EXPECTED_ROWS}`);
  if ((source.manual_blocked_rows ?? []).length !== 1) findings.push('manual_blocked_row_count_changed');
  if (targetRows.some((row) => row.duplicate_name === MANUAL_BLOCKED_NAME || row.canonical_owner_name === 'Luxray GL LV.X')) {
    findings.push('manual_luxray_row_included');
  }
  if (source.summary?.write_ready_now !== false) findings.push('source_report_unexpectedly_write_ready');

  if (/(^|\n)\s*commit\s*;/i.test(strippedSql)) findings.push('sql_contains_commit');
  if (!/(^|\n)\s*rollback\s*;/i.test(strippedSql)) findings.push('sql_missing_rollback');
  for (const phrase of [
    'delete from public.external_mappings',
    'update public.external_mappings',
    'delete from public.card_print_identity',
    'delete from public.card_print_traits',
    'update public.card_print_traits',
    'delete from public.card_print_species',
    'update public.card_print_species',
    'delete from public.card_printings',
    'update public.card_printings',
    'delete from public.card_prints',
  ]) {
    if (!strippedSql.toLowerCase().includes(phrase)) findings.push(`sql_missing_${phrase.replaceAll(' ', '_')}`);
  }

  if (!execution.connected) findings.push('database_connection_unavailable');
  if (execution.execution_status !== 'guarded_dry_run_transaction_completed_and_rolled_back') {
    findings.push('dry_run_transaction_failed_or_not_rolled_back');
  }
  if (execution.error_message) findings.push(`dry_run_error:${execution.error_message}`);

  const before = execution.before_snapshot?.impact_counts ?? {};
  const after = execution.after_snapshot?.impact_counts ?? {};
  if (Number(before.duplicate_parents_present ?? -1) !== EXPECTED_ROWS) findings.push('before_duplicate_parent_count_changed');
  if (Number(before.duplicate_child_printings ?? -1) !== 99) findings.push('before_duplicate_child_printing_count_changed');
  if (Number(before.duplicate_external_mappings ?? -1) !== EXPECTED_ROWS) findings.push('before_duplicate_mapping_count_changed');
  if (Number(before.duplicate_identity_rows ?? -1) !== EXPECTED_ROWS) findings.push('before_duplicate_identity_count_changed');
  if (Number(before.duplicate_trait_rows ?? -1) !== EXPECTED_ROWS) findings.push('before_duplicate_trait_count_changed');
  if (Number(before.duplicate_species_rows ?? -1) !== 41) findings.push('before_duplicate_species_count_changed');
  if (Number(before.duplicate_external_printing_refs ?? -1) !== 0) findings.push('before_duplicate_external_printing_refs_present');
  if (Number(before.duplicate_vault_printing_refs ?? -1) !== 0) findings.push('before_duplicate_vault_printing_refs_present');
  if (Number(before.duplicate_warehouse_printing_refs ?? -1) !== 0) findings.push('before_duplicate_warehouse_printing_refs_present');

  if (stableJson(execution.before_snapshot?.rows ?? []) !== stableJson(execution.after_snapshot?.rows ?? [])) {
    findings.push('durable_after_snapshot_differs_from_before_snapshot');
  }
  if (stableJson(before) !== stableJson(after)) findings.push('durable_after_counts_differ_from_before_counts');
  if (!sqlHash) findings.push('sql_hash_missing');

  return findings;
}

function renderMarkdown(report) {
  return `# ENRICH-13E1 Name Alias Duplicate Transfer Guarded Dry-Run V1

Generated: ${report.generated_at}

Package: \`${PACKAGE_ID}\`

This is a rollback-only dry-run proof for deterministic name/alias duplicate parent adjudication. The manual Luxray GL versus Luxray GL LV.X row is excluded.

## Status

| Field | Value |
| --- | --- |
| pass | ${report.pass} |
| dry_run_execution_status | ${report.dry_run_execution_status} |
| package_fingerprint | ${report.package_fingerprint_sha256} |
| sql_hash | ${report.sql_artifact.sha256} |
| target_rows | ${report.package_scope.target_rows} |
| duplicate_child_printings | ${report.package_scope.duplicate_child_printings} |
| manual_blocked_rows_excluded | ${report.package_scope.manual_blocked_rows_excluded} |
| durable_after_matches_before | ${report.durable_after_snapshot_matches_before_snapshot} |
| db_writes_performed | ${report.db_writes_performed} |
| migrations_created | ${report.migrations_created} |
| stop_findings | ${report.stop_findings.length} |

## Proof

| Metric | Value |
| --- | --- |
| Before snapshot hash | ${report.execution_result.before_snapshot?.hash_sha256 ?? ''} |
| After snapshot hash | ${report.execution_result.after_snapshot?.hash_sha256 ?? ''} |
| Before duplicate parents | ${report.execution_result.before_snapshot?.impact_counts?.duplicate_parents_present ?? ''} |
| Before duplicate child printings | ${report.execution_result.before_snapshot?.impact_counts?.duplicate_child_printings ?? ''} |
| Printing-level external refs | ${report.execution_result.before_snapshot?.impact_counts?.duplicate_external_printing_refs ?? ''} |
| Printing-level vault refs | ${report.execution_result.before_snapshot?.impact_counts?.duplicate_vault_printing_refs ?? ''} |
| Printing-level warehouse refs | ${report.execution_result.before_snapshot?.impact_counts?.duplicate_warehouse_printing_refs ?? ''} |
| Execution error | ${mdEscape(report.execution_result.error_message ?? '')} |

## Stop Findings

${report.stop_findings.length === 0 ? 'None.' : report.stop_findings.map((finding) => `- ${mdEscape(finding)}`).join('\n')}

## Real Apply Approval Text

A real apply is not authorized by this report. If this exact package is later approved, use:

\`\`\`text
${report.required_real_apply_approval_text}
\`\`\`
`;
}

const source = await readJson(SOURCE_JSON);
const targetRows = buildTargetRows(source);
const packageFingerprint = hash(stableJson({
  package_id: PACKAGE_ID,
  target_rows: targetRows,
  source_report: SOURCE_JSON,
}));
const sql = buildSql(targetRows, packageFingerprint);
const sqlHash = hash(sql);

await writeText(OUTPUT_SQL, sql);

const execution = await runDryRun(sql, targetRows);
const stopFindings = validate({ source, targetRows, sql, sqlHash, execution });
const durableMatch = stableJson(execution.before_snapshot?.rows ?? []) === stableJson(execution.after_snapshot?.rows ?? [])
  && stableJson(execution.before_snapshot?.impact_counts ?? {}) === stableJson(execution.after_snapshot?.impact_counts ?? {});

const report = {
  version: 'ENRICH_13E1_NAME_ALIAS_DUPLICATE_TRANSFER_GUARDED_DRY_RUN_V1',
  generated_at: new Date().toISOString(),
  package_id: PACKAGE_ID,
  dry_run_execution_status: stopFindings.length === 0
    ? 'enrich13e1_guarded_dry_run_passed_rolled_back_no_durable_change'
    : 'enrich13e1_guarded_dry_run_blocked_or_failed',
  pass: stopFindings.length === 0,
  db_writes_performed: false,
  durable_db_writes_performed: false,
  real_apply_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  image_writes_performed: false,
  package_fingerprint_sha256: packageFingerprint,
  package_scope: {
    target_rows: targetRows.length,
    deterministic_buckets: [...new Set(targetRows.map((row) => row.bucket))].sort(),
    duplicate_child_printings: execution.before_snapshot?.impact_counts?.duplicate_child_printings ?? null,
    duplicate_external_mappings: execution.before_snapshot?.impact_counts?.duplicate_external_mappings ?? null,
    duplicate_identity_rows: execution.before_snapshot?.impact_counts?.duplicate_identity_rows ?? null,
    duplicate_trait_rows: execution.before_snapshot?.impact_counts?.duplicate_trait_rows ?? null,
    duplicate_species_rows: execution.before_snapshot?.impact_counts?.duplicate_species_rows ?? null,
    manual_blocked_rows_excluded: source.manual_blocked_rows?.length ?? null,
  },
  sql_artifact: {
    path: OUTPUT_SQL,
    sha256: sqlHash,
    contains_commit_statement: /(^|\n)\s*commit\s*;/i.test(sql.replace(/--.*$/gm, '')),
    contains_rollback_statement: /(^|\n)\s*rollback\s*;/i.test(sql.replace(/--.*$/gm, '')),
  },
  execution_result: execution,
  durable_after_snapshot_matches_before_snapshot: durableMatch,
  stop_findings: stopFindings,
  required_real_apply_approval_text: `Approve real ENRICH-13E1-NAME-ALIAS-DUPLICATE-TRANSFER apply only. Fingerprint: ${packageFingerprint}. SQL hash: ${sqlHash}. Scope: ${targetRows.length} deterministic alias duplicate parent dependency transfers, ${execution.before_snapshot?.impact_counts?.duplicate_child_printings ?? 'unknown'} child printings deduped/transferred, ${execution.before_snapshot?.impact_counts?.duplicate_external_mappings ?? 'unknown'} external mappings handled, ${execution.before_snapshot?.impact_counts?.duplicate_identity_rows ?? 'unknown'} duplicate active identities removed; 1 manual Luxray row excluded. Dry-run proof: ${execution.before_snapshot?.hash_sha256 ?? 'missing'} == ${execution.after_snapshot?.hash_sha256 ?? 'missing'}. No global apply. No migrations. No image writes.`,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  output_sql: OUTPUT_SQL,
  pass: report.pass,
  dry_run_execution_status: report.dry_run_execution_status,
  package_fingerprint_sha256: packageFingerprint,
  sql_hash: sqlHash,
  before_hash: execution.before_snapshot?.hash_sha256 ?? null,
  after_hash: execution.after_snapshot?.hash_sha256 ?? null,
  stop_findings: stopFindings,
}, null, 2));
