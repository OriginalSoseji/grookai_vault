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
const SOURCE_JSON = path.join(OUTPUT_DIR, 'enrich13g_celebrations_subset_alias_governance_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich13g1_celebrations_subset_alias_transfer_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich13g1_celebrations_subset_alias_transfer_guarded_dry_run_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'enrich13g1_celebrations_subset_alias_transfer_guarded_dry_run_v1.sql');

const PACKAGE_ID = 'ENRICH-13G1-CELEBRATIONS-SUBSET-ALIAS-TRANSFER-DRY-RUN';
const EXPECTED_ROWS = 4;

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
  return (source.rows ?? []).map((row) => ({
    alias_card_print_id: row.card_print_id,
    subset_owner_card_print_id: row.live_matches?.length === 1 ? row.live_matches[0].card_print_id : null,
    source_set_code: row.source_set_code,
    source_number: row.source_number,
    canonical_subset_set_code: row.canonical_subset_set_code,
    canonical_subset_number: row.canonical_subset_number,
    card_name: row.card_name,
    source_external_id: row.source_external_id,
    live_match_count: row.live_matches?.length ?? 0,
  }));
}

function buildSql(targetRows, packageFingerprint) {
  const values = targetRows.map((row) => `  (${[
    sqlUuid(row.alias_card_print_id),
    sqlUuid(row.subset_owner_card_print_id),
    sqlString(row.source_set_code),
    sqlString(row.source_number),
    sqlString(row.canonical_subset_set_code),
    sqlString(row.canonical_subset_number),
    sqlString(row.card_name),
    sqlString(row.source_external_id),
  ].join(', ')})`);

  return `-- ${PACKAGE_ID} GUARDED DRY-RUN TRANSACTION V1
-- Generated for review/proof only.
-- Package fingerprint: ${packageFingerprint}
-- Scope: ${targetRows.length} Celebrations Classic Collection source-alias transfers.
-- Host cel25 15A# public identity creation is forbidden.
-- This transaction intentionally ends with ROLLBACK and contains no COMMIT.

begin;

create temporary table enrich13g1_targets (
  alias_card_print_id uuid primary key,
  subset_owner_card_print_id uuid not null,
  source_set_code text not null,
  source_number text not null,
  canonical_subset_set_code text not null,
  canonical_subset_number text not null,
  card_name text not null,
  source_external_id text
) on commit drop;

insert into enrich13g1_targets (
  alias_card_print_id,
  subset_owner_card_print_id,
  source_set_code,
  source_number,
  canonical_subset_set_code,
  canonical_subset_number,
  card_name,
  source_external_id
) values
${values.join(',\n')};

do $$
declare
  v_targets integer;
  v_bad_identity integer;
  v_printing_refs integer;
  v_disallowed_parent_refs integer := 0;
  v_dynamic_refs integer;
  r record;
begin
  select count(*) into v_targets from enrich13g1_targets;
  if v_targets <> ${targetRows.length} then
    raise exception 'ENRICH-13G1 target count guard failed: expected ${targetRows.length}, got %', v_targets;
  end if;

  select count(*) into v_bad_identity
  from enrich13g1_targets target
  left join public.card_prints alias on alias.id = target.alias_card_print_id
  left join public.card_prints owner on owner.id = target.subset_owner_card_print_id
  where alias.id is null
     or owner.id is null
     or alias.id = owner.id
     or alias.set_code is not null
     or alias.number is not null
     or owner.set_code <> target.canonical_subset_set_code
     or owner.number <> target.canonical_subset_number
     or owner.name <> target.card_name
     or target.source_set_code <> 'cel25'
     or target.canonical_subset_set_code <> 'cel25c'
     or target.source_number !~ '^15A[0-9]+$';

  if v_bad_identity <> 0 then
    raise exception 'ENRICH-13G1 subset owner identity guard failed: % rows', v_bad_identity;
  end if;

  select count(*) into v_printing_refs
  from public.card_printings cpr
  join enrich13g1_targets target on target.alias_card_print_id = cpr.card_print_id
  where exists (select 1 from public.external_printing_mappings epm where epm.card_printing_id = cpr.id)
     or exists (select 1 from public.vault_item_instances vii where vii.card_printing_id = cpr.id)
     or exists (select 1 from public.canon_warehouse_candidates cwc where cwc.promoted_card_printing_id = cpr.id);

  if v_printing_refs <> 0 then
    raise exception 'ENRICH-13G1 alias child printing dependency guard failed: % refs', v_printing_refs;
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
      'select count(*) from %I.%I where %I in (select alias_card_print_id from enrich13g1_targets)',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_disallowed_parent_refs := v_disallowed_parent_refs + v_dynamic_refs;
  end loop;

  if v_disallowed_parent_refs <> 0 then
    raise exception 'ENRICH-13G1 disallowed parent dependency guard failed: % refs', v_disallowed_parent_refs;
  end if;
end $$;

delete from public.external_mappings em
using enrich13g1_targets target
where em.card_print_id = target.alias_card_print_id
  and exists (
    select 1
    from public.external_mappings owner_em
    where owner_em.card_print_id = target.subset_owner_card_print_id
      and owner_em.source = em.source
      and owner_em.external_id = em.external_id
  );

update public.external_mappings em
set card_print_id = target.subset_owner_card_print_id
from enrich13g1_targets target
where em.card_print_id = target.alias_card_print_id;

delete from public.card_print_identity cpi
using enrich13g1_targets target
where cpi.card_print_id = target.alias_card_print_id;

delete from public.card_print_traits cpt
using enrich13g1_targets target
where cpt.card_print_id = target.alias_card_print_id
  and exists (
    select 1
    from public.card_print_traits owner_trait
    where owner_trait.card_print_id = target.subset_owner_card_print_id
      and owner_trait.trait_type = cpt.trait_type
      and owner_trait.trait_value = cpt.trait_value
      and owner_trait.source = cpt.source
  );

update public.card_print_traits cpt
set card_print_id = target.subset_owner_card_print_id
from enrich13g1_targets target
where cpt.card_print_id = target.alias_card_print_id;

delete from public.card_print_species cps
using enrich13g1_targets target
where cps.card_print_id = target.alias_card_print_id
  and exists (
    select 1
    from public.card_print_species owner_species
    where owner_species.card_print_id = target.subset_owner_card_print_id
      and owner_species.species_id = cps.species_id
      and owner_species.role = cps.role
      and owner_species.source = cps.source
      and owner_species.active = cps.active
  );

update public.card_print_species cps
set card_print_id = target.subset_owner_card_print_id,
    updated_at = now()
from enrich13g1_targets target
where cps.card_print_id = target.alias_card_print_id;

delete from public.card_printings cpr
using enrich13g1_targets target
where cpr.card_print_id = target.alias_card_print_id
  and exists (
    select 1
    from public.card_printings owner_printing
    where owner_printing.card_print_id = target.subset_owner_card_print_id
      and owner_printing.finish_key = cpr.finish_key
  );

update public.card_printings cpr
set card_print_id = target.subset_owner_card_print_id
from enrich13g1_targets target
where cpr.card_print_id = target.alias_card_print_id;

do $$
declare
  v_remaining_alias_dependencies integer;
  v_identity_duplicates integer;
  v_external_duplicates integer;
  v_child_duplicates integer;
begin
  select
    (select count(*) from public.external_mappings where card_print_id in (select alias_card_print_id from enrich13g1_targets))
    + (select count(*) from public.card_print_identity where card_print_id in (select alias_card_print_id from enrich13g1_targets))
    + (select count(*) from public.card_print_traits where card_print_id in (select alias_card_print_id from enrich13g1_targets))
    + (select count(*) from public.card_print_species where card_print_id in (select alias_card_print_id from enrich13g1_targets))
    + (select count(*) from public.card_printings where card_print_id in (select alias_card_print_id from enrich13g1_targets))
  into v_remaining_alias_dependencies;

  if v_remaining_alias_dependencies <> 0 then
    raise exception 'ENRICH-13G1 remaining alias dependencies guard failed: % rows', v_remaining_alias_dependencies;
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
    raise exception 'ENRICH-13G1 active identity duplicate guard failed: % groups', v_identity_duplicates;
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
    raise exception 'ENRICH-13G1 external mapping duplicate guard failed: % groups', v_external_duplicates;
  end if;

  select count(*) into v_child_duplicates
  from (
    select card_print_id, finish_key
    from public.card_printings
    group by card_print_id, finish_key
    having count(*) > 1
  ) dupes;
  if v_child_duplicates <> 0 then
    raise exception 'ENRICH-13G1 child printing duplicate guard failed: % groups', v_child_duplicates;
  end if;
end $$;

delete from public.card_prints cp
using enrich13g1_targets target
where cp.id = target.alias_card_print_id;

rollback;
`;
}

async function captureSnapshot(client, targetRows) {
  const parentIds = [...new Set([
    ...targetRows.map((row) => row.alias_card_print_id),
    ...targetRows.map((row) => row.subset_owner_card_print_id),
  ])];
  const aliasIds = [...new Set(targetRows.map((row) => row.alias_card_print_id))];
  const ownerIds = [...new Set(targetRows.map((row) => row.subset_owner_card_print_id))];

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
    `with alias_children as (
       select cpr.id
       from public.card_printings cpr
       where cpr.card_print_id = any($1::uuid[])
     )
     select
       (select count(*)::int from public.card_prints where id = any($1::uuid[])) as alias_parents_present,
       (select count(*)::int from public.card_prints where id = any($2::uuid[])) as owner_parents_present,
       (select count(*)::int from public.card_printings where card_print_id = any($1::uuid[])) as alias_child_printings,
       (select count(*)::int from public.card_printings where card_print_id = any($2::uuid[])) as owner_child_printings,
       (select count(*)::int from public.external_mappings where card_print_id = any($1::uuid[])) as alias_external_mappings,
       (select count(*)::int from public.card_print_identity where card_print_id = any($1::uuid[])) as alias_identity_rows,
       (select count(*)::int from public.card_print_traits where card_print_id = any($1::uuid[])) as alias_trait_rows,
       (select count(*)::int from public.card_print_species where card_print_id = any($1::uuid[])) as alias_species_rows,
       (select count(*)::int from public.external_printing_mappings where card_printing_id in (select id from alias_children)) as alias_external_printing_refs,
       (select count(*)::int from public.vault_item_instances where card_printing_id in (select id from alias_children)) as alias_vault_printing_refs,
       (select count(*)::int from public.canon_warehouse_candidates where promoted_card_printing_id in (select id from alias_children)) as alias_warehouse_printing_refs`,
    [aliasIds, ownerIds],
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

  const client = new Client({ connectionString: cs, application_name: 'enrich13g1_celebrations_subset_alias_transfer_guarded_dry_run_v1' });
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

function validate({ source, targetRows, sql, execution }) {
  const findings = [];
  const strippedSql = sql.replace(/--.*$/gm, '');

  if (source.version !== 'ENRICH_13G_CELEBRATIONS_SUBSET_ALIAS_GOVERNANCE_V1') findings.push('source_report_version_unexpected');
  if (targetRows.length !== EXPECTED_ROWS) findings.push(`target_row_count_not_${EXPECTED_ROWS}`);
  if (targetRows.some((row) => row.live_match_count !== 1 || !row.subset_owner_card_print_id)) findings.push('subset_owner_match_not_exactly_one');
  if (targetRows.some((row) => row.source_set_code !== 'cel25' || row.canonical_subset_set_code !== 'cel25c')) findings.push('unexpected_set_scope');
  if (source.summary?.write_ready_now !== false) findings.push('source_report_unexpectedly_write_ready');

  if (/(^|\n)\s*commit\s*;/i.test(strippedSql)) findings.push('sql_contains_commit');
  if (!/(^|\n)\s*rollback\s*;/i.test(strippedSql)) findings.push('sql_missing_rollback');
  if (/\bupdate\s+public\.card_prints\b/i.test(strippedSql)) findings.push('sql_attempts_parent_identity_update');

  if (!execution.connected) findings.push('database_connection_unavailable');
  if (execution.execution_status !== 'guarded_dry_run_transaction_completed_and_rolled_back') {
    findings.push('dry_run_transaction_failed_or_not_rolled_back');
  }
  if (execution.error_message) findings.push(`dry_run_error:${execution.error_message}`);

  const before = execution.before_snapshot?.impact_counts ?? {};
  const after = execution.after_snapshot?.impact_counts ?? {};
  if (Number(before.alias_parents_present ?? -1) !== EXPECTED_ROWS) findings.push('before_alias_parent_count_changed');
  if (Number(before.alias_child_printings ?? -1) !== 4) findings.push('before_alias_child_printing_count_changed');
  if (Number(before.alias_external_mappings ?? -1) !== EXPECTED_ROWS) findings.push('before_alias_mapping_count_changed');
  if (Number(before.alias_identity_rows ?? -1) !== 0) findings.push('before_alias_identity_rows_present');
  if (Number(before.alias_trait_rows ?? -1) !== EXPECTED_ROWS) findings.push('before_alias_trait_count_changed');
  if (Number(before.alias_species_rows ?? -1) !== 3) findings.push('before_alias_species_count_changed');
  if (Number(before.alias_external_printing_refs ?? -1) !== 0) findings.push('before_alias_external_printing_refs_present');
  if (Number(before.alias_vault_printing_refs ?? -1) !== 0) findings.push('before_alias_vault_printing_refs_present');
  if (Number(before.alias_warehouse_printing_refs ?? -1) !== 0) findings.push('before_alias_warehouse_printing_refs_present');

  if (stableJson(execution.before_snapshot?.rows ?? []) !== stableJson(execution.after_snapshot?.rows ?? [])) {
    findings.push('durable_after_snapshot_differs_from_before_snapshot');
  }
  if (stableJson(before) !== stableJson(after)) findings.push('durable_after_counts_differ_from_before_counts');

  return findings;
}

function renderMarkdown(report) {
  return `# ENRICH-13G1 Celebrations Subset Alias Transfer Guarded Dry-Run V1

Generated: ${report.generated_at}

Package: \`${PACKAGE_ID}\`

This rollback-only dry-run transfers source-alias evidence from unresolved \`cel25 15A#\` rows to existing \`cel25c\` Classic Collection owners. It does not create host-set \`cel25 15A#\` public identities.

## Status

| Field | Value |
| --- | --- |
| pass | ${report.pass} |
| dry_run_execution_status | ${report.dry_run_execution_status} |
| package_fingerprint | ${report.package_fingerprint_sha256} |
| sql_hash | ${report.sql_artifact.sha256} |
| target_rows | ${report.package_scope.target_rows} |
| alias_child_printings | ${report.package_scope.alias_child_printings} |
| durable_after_matches_before | ${report.durable_after_snapshot_matches_before_snapshot} |
| db_writes_performed | ${report.db_writes_performed} |
| migrations_created | ${report.migrations_created} |
| stop_findings | ${report.stop_findings.length} |

## Proof

| Metric | Value |
| --- | --- |
| Before snapshot hash | ${report.execution_result.before_snapshot?.hash_sha256 ?? ''} |
| After snapshot hash | ${report.execution_result.after_snapshot?.hash_sha256 ?? ''} |
| Before alias parents | ${report.execution_result.before_snapshot?.impact_counts?.alias_parents_present ?? ''} |
| Before alias child printings | ${report.execution_result.before_snapshot?.impact_counts?.alias_child_printings ?? ''} |
| Printing-level external refs | ${report.execution_result.before_snapshot?.impact_counts?.alias_external_printing_refs ?? ''} |
| Printing-level vault refs | ${report.execution_result.before_snapshot?.impact_counts?.alias_vault_printing_refs ?? ''} |
| Printing-level warehouse refs | ${report.execution_result.before_snapshot?.impact_counts?.alias_warehouse_printing_refs ?? ''} |
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
const stopFindings = validate({ source, targetRows, sql, execution });
const durableMatch = stableJson(execution.before_snapshot?.rows ?? []) === stableJson(execution.after_snapshot?.rows ?? [])
  && stableJson(execution.before_snapshot?.impact_counts ?? {}) === stableJson(execution.after_snapshot?.impact_counts ?? {});

const report = {
  version: 'ENRICH_13G1_CELEBRATIONS_SUBSET_ALIAS_TRANSFER_GUARDED_DRY_RUN_V1',
  generated_at: new Date().toISOString(),
  package_id: PACKAGE_ID,
  dry_run_execution_status: stopFindings.length === 0
    ? 'enrich13g1_guarded_dry_run_passed_rolled_back_no_durable_change'
    : 'enrich13g1_guarded_dry_run_blocked_or_failed',
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
    source_set_code: 'cel25',
    canonical_subset_set_code: 'cel25c',
    alias_child_printings: execution.before_snapshot?.impact_counts?.alias_child_printings ?? null,
    alias_external_mappings: execution.before_snapshot?.impact_counts?.alias_external_mappings ?? null,
    alias_identity_rows: execution.before_snapshot?.impact_counts?.alias_identity_rows ?? null,
    alias_trait_rows: execution.before_snapshot?.impact_counts?.alias_trait_rows ?? null,
    alias_species_rows: execution.before_snapshot?.impact_counts?.alias_species_rows ?? null,
    subset_owner_match_count: targetRows.filter((row) => row.live_match_count === 1).length,
  },
  sql_artifact: {
    path: OUTPUT_SQL,
    sha256: sqlHash,
    contains_commit_statement: /(^|\n)\s*commit\s*;/i.test(sql.replace(/--.*$/gm, '')),
    contains_rollback_statement: /(^|\n)\s*rollback\s*;/i.test(sql.replace(/--.*$/gm, '')),
    contains_parent_update_statement: /\bupdate\s+public\.card_prints\b/i.test(sql.replace(/--.*$/gm, '')),
  },
  target_rows: targetRows,
  execution_result: execution,
  durable_after_snapshot_matches_before_snapshot: durableMatch,
  stop_findings: stopFindings,
  required_real_apply_approval_text: `Approve real ENRICH-13G1-CELEBRATIONS-SUBSET-ALIAS-TRANSFER apply only. Fingerprint: ${packageFingerprint}. SQL hash: ${sqlHash}. Scope: ${targetRows.length} cel25 15A# source-alias transfers to cel25c subset owners, ${execution.before_snapshot?.impact_counts?.alias_child_printings ?? 'unknown'} child printings deduped/transferred, ${execution.before_snapshot?.impact_counts?.alias_external_mappings ?? 'unknown'} external mappings handled. Dry-run proof: ${execution.before_snapshot?.hash_sha256 ?? 'missing'} == ${execution.after_snapshot?.hash_sha256 ?? 'missing'}. No host cel25 15A# parent identity creation. No global apply. No migrations. No image writes.`,
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
