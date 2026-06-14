import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'english_master_index_v1',
);
const SQL_DIR = path.join(ROOT, 'docs', 'sql');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const SOURCE_ARTIFACT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg02b_full_beta_final_snapshot_transaction_artifact_v1.json',
);
const COLLISION_AUDIT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg02b_full_beta_collision_audit_v1.json',
);
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg02c_full_beta_noncolliding_transaction_artifact_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  'english_master_index_pkg02c_full_beta_noncolliding_transaction_artifact_v1.md',
);
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg02c_full_beta_noncolliding_guarded_dry_run_transaction_v1.sql');
const CHECKPOINT_MD = path.join(
  CHECKPOINT_DIR,
  '20260609_pkg02c_full_beta_noncolliding_transaction_artifact_checkpoint_v1.md',
);

const PACKAGE_ID = 'PKG-02C-FULL-BETA-NONCOLLIDING';
const PARENT_PACKAGE_ID = 'PKG-02B-FULL-BETA';
const DIRECT_UPDATE_COLUMNS = ['set_code', 'number', 'name'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlUuid(value) {
  return `${sqlString(value)}::uuid`;
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function captureFreshSnapshot(cardPrintIds) {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      rows: [],
      impact_counts: {},
    };
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `select
         cp.id,
         to_jsonb(cp) as card_print,
         coalesce((
           select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id)
           from public.card_printings cpr
           where cpr.card_print_id = cp.id
         ), '[]'::jsonb) as card_printings,
         coalesce((
           select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id)
           from public.external_mappings em
           where em.card_print_id = cp.id
         ), '[]'::jsonb) as external_mappings,
         coalesce((
           select jsonb_agg(to_jsonb(cpi) order by cpi.id)
           from public.card_print_identity cpi
           where cpi.card_print_id = cp.id
         ), '[]'::jsonb) as card_print_identity,
         coalesce((
           select jsonb_agg(to_jsonb(cpt) order by cpt.id)
           from public.card_print_traits cpt
           where cpt.card_print_id = cp.id
         ), '[]'::jsonb) as card_print_traits,
         coalesce((
           select jsonb_agg(to_jsonb(vi) order by vi.id)
           from public.vault_items vi
           where vi.card_id = cp.id
         ), '[]'::jsonb) as vault_items
       from public.card_prints cp
       where cp.id = any($1::uuid[])
       order by cp.set_code nulls first, cp.name, cp.number, cp.id`,
      [cardPrintIds],
    );

    const rows = result.rows.map((row) => ({
      card_print_id: row.id,
      card_print: row.card_print,
      card_printings: row.card_printings,
      external_mappings: row.external_mappings,
      card_print_identity: row.card_print_identity,
      card_print_traits: row.card_print_traits,
      vault_items: row.vault_items,
      dependency_counts: {
        card_printings: row.card_printings.length,
        external_mappings: row.external_mappings.length,
        card_print_identity: row.card_print_identity.length,
        card_print_traits: row.card_print_traits.length,
        vault_items: row.vault_items.length,
      },
    }));
    await client.query('rollback');

    return {
      available: true,
      reason: null,
      captured_at: new Date().toISOString(),
      rows,
      hash_sha256: sha256(stableJson(rows)),
      impact_counts: {
        card_prints_found: rows.length,
        card_printings_found: rows.reduce((sum, row) => sum + row.dependency_counts.card_printings, 0),
        external_mappings_found: rows.reduce((sum, row) => sum + row.dependency_counts.external_mappings, 0),
        identity_rows_found: rows.reduce((sum, row) => sum + row.dependency_counts.card_print_identity, 0),
        trait_rows_found: rows.reduce((sum, row) => sum + row.dependency_counts.card_print_traits, 0),
        vault_items_found: rows.reduce((sum, row) => sum + row.dependency_counts.vault_items, 0),
      },
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: error.message,
      rows: [],
      impact_counts: {},
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildMutationRows(sourceArtifact, collisionAudit) {
  const nonCollidingIds = new Set((collisionAudit.non_colliding_rows ?? []).map((row) => row.card_print_id));
  return (sourceArtifact.mutation_matrix ?? [])
    .filter((row) => nonCollidingIds.has(row.card_print_id))
    .map((row) => ({
      ...row,
      package_id: PACKAGE_ID,
      parent_package_id: PARENT_PACKAGE_ID,
      dry_run_status: 'eligible_for_noncolliding_guarded_dry_run',
    }))
    .sort((left, right) =>
      left.set_key.localeCompare(right.set_key) ||
      String(left.target_parent_fields?.number ?? '').localeCompare(
        String(right.target_parent_fields?.number ?? ''),
        undefined,
        { numeric: true },
      ) ||
      String(left.target_parent_fields?.name ?? '').localeCompare(String(right.target_parent_fields?.name ?? '')));
}

function buildRollbackRows(mutationRows) {
  return mutationRows.map((row) => ({
    card_print_id: row.card_print_id,
    rollback_parent_fields: row.rollback_parent_fields,
    expected_target_fields: row.target_parent_fields,
    child_printing_count_expected_after: row.child_printing_count_expected_after,
    rollback_scope: 'card_print_parent_identity_fields_only_after_separate_approval',
  }));
}

function buildSql({ packageFingerprint, mutationRows }) {
  const values = mutationRows.map((row) => {
    const target = row.target_parent_fields ?? {};
    return `  (${[
      sqlUuid(row.card_print_id),
      sqlString(target.set_code),
      sqlString(target.number),
      sqlString(target.number_plain_expected),
      sqlString(target.name),
    ].join(', ')})`;
  });

  return `-- ${PACKAGE_ID} GUARDED DRY-RUN TRANSACTION ARTIFACT V1
-- Generated for review only. Do not run without explicit operator approval.
-- Package fingerprint: ${packageFingerprint}
-- Parent package: ${PARENT_PACKAGE_ID}
-- Scope: ${mutationRows.length} non-colliding card_print rows.
-- Direct update columns if later approved: ${DIRECT_UPDATE_COLUMNS.join(', ')}.
-- This dry-run artifact contains ROLLBACK and intentionally contains no COMMIT.

begin;

create temporary table pkg02c_noncolliding_card_prints (
  card_print_id uuid primary key,
  target_set_code text not null,
  target_number text not null,
  target_number_plain_expected text not null,
  target_name text not null
) on commit drop;

insert into pkg02c_noncolliding_card_prints (
  card_print_id,
  target_set_code,
  target_number,
  target_number_plain_expected,
  target_name
) values
${values.join(',\n')};

do $$
declare
  v_expected_count integer := ${mutationRows.length};
  v_actual_count integer;
  v_vault_refs integer;
begin
  select count(*) into v_actual_count from pkg02c_noncolliding_card_prints;
  if v_actual_count <> v_expected_count then
    raise exception 'PKG-02C count guard failed: expected %, got %', v_expected_count, v_actual_count;
  end if;

  select count(*)
  into v_vault_refs
  from public.vault_items vi
  where vi.card_id in (select card_print_id from pkg02c_noncolliding_card_prints);

  if v_vault_refs <> 4 then
    raise exception 'PKG-02C vault reference guard failed: expected 4, got %', v_vault_refs;
  end if;

  if exists (
    select 1
    from pkg02c_noncolliding_card_prints approved
    left join public.card_prints cp on cp.id = approved.card_print_id
    where cp.id is null
  ) then
    raise exception 'PKG-02C target row guard failed: at least one card_print row is missing';
  end if;

end $$;

update public.card_prints cp
set
  set_code = approved.target_set_code,
  number = approved.target_number,
  name = approved.target_name
from pkg02c_noncolliding_card_prints approved
where cp.id = approved.card_print_id;

do $$
declare
  v_bad_count integer;
begin
  select count(*)
  into v_bad_count
  from pkg02c_noncolliding_card_prints approved
  join public.card_prints cp on cp.id = approved.card_print_id
  where cp.set_code is distinct from approved.target_set_code
     or cp.number is distinct from approved.target_number
     or cp.number_plain is distinct from approved.target_number_plain_expected
     or cp.name is distinct from approved.target_name;

  if v_bad_count <> 0 then
    raise exception 'PKG-02C post-update verification failed: % rows differ from target fields', v_bad_count;
  end if;
end $$;

rollback;
`;
}

function validateSql(sql) {
  const stripped = sql.replace(/--.*$/gm, '');
  return {
    contains_update_statement: /\bupdate\s+public\.card_prints\b/i.test(stripped),
    contains_delete_statement: /\bdelete\b/i.test(stripped),
    contains_insert_statement: /\binsert\s+into\s+pkg02c_noncolliding_card_prints\b/i.test(stripped),
    contains_commit_statement: /(^|\n)\s*commit\s*;/i.test(stripped),
    contains_rollback_statement: /(^|\n)\s*rollback\s*;/i.test(stripped),
  };
}

function summarizeBySet(mutationRows) {
  const bySet = {};
  for (const row of mutationRows) {
    const key = row.set_key;
    bySet[key] ??= {
      set_key: key,
      set_name: row.set_name,
      card_print_rows: 0,
      child_printing_rows: 0,
      vault_refs: 0,
    };
    bySet[key].card_print_rows += 1;
    bySet[key].child_printing_rows += row.child_printing_count_expected_after ?? 0;
    bySet[key].vault_refs += row.vault_items_referencing_target ?? 0;
  }
  return Object.values(bySet).sort((left, right) => left.set_key.localeCompare(right.set_key));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-02C Full Beta Non-Colliding Transaction Artifact V1');
  lines.push('');
  lines.push('This artifact prepares a split guarded dry-run package from the PKG-02B rows that do not collide with the standard card identity unique index.');
  lines.push('');
  lines.push('No transaction was executed by this artifact. No real apply, migration, cleanup, quarantine, merge, or delete was performed.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push(`- Status: \`${report.artifact_status}\``);
  lines.push(`- Package: \`${report.package_scope.package_id}\``);
  lines.push(`- Fingerprint: \`${report.package_scope.package_fingerprint_sha256}\``);
  lines.push(`- Parent package: \`${report.package_scope.parent_package_id}\``);
  lines.push(`- Card print rows: ${report.package_scope.card_print_rows}`);
  lines.push(`- Child printings: ${report.package_scope.child_printing_rows}`);
  lines.push(`- Vault references accepted: ${report.package_scope.vault_references_accepted}`);
  lines.push(`- Collision rows excluded: ${report.package_scope.collision_rows_excluded}`);
  lines.push(`- SQL artifact: \`${report.sql_artifact.path}\``);
  lines.push(`- SQL SHA-256: \`${report.sql_artifact.sha256}\``);
  lines.push(`- DB writes performed: ${report.db_writes_performed}`);
  lines.push(`- Migrations created: ${report.migrations_created}`);
  lines.push('');
  lines.push('## Set Summary');
  lines.push('');
  lines.push('| Set | Rows | Child printings | Vault refs |');
  lines.push('| --- | ---: | ---: | ---: |');
  for (const row of report.set_summaries) {
    lines.push(`| ${mdEscape(row.set_key)} | ${row.card_print_rows} | ${row.child_printing_rows} | ${row.vault_refs} |`);
  }
  lines.push('');
  lines.push('## Required Approval');
  lines.push('');
  lines.push('The next step is guarded dry-run transaction execution only. It is not a real apply.');
  lines.push('');
  lines.push('```text');
  lines.push(report.required_operator_approval.exact_phrase);
  lines.push('```');
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  for (const item of report.safety) {
    lines.push(`- ${item}`);
  }
  return `${lines.join('\n')}\n`;
}

function updateCheckpointIndex(reportPath) {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const entry = `- 2026-06-09: PKG-02C full beta non-colliding guarded dry-run artifact prepared. Report: \`${path.relative(ROOT, reportPath).replaceAll('\\', '/')}\``;
  let content = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (!content.includes(entry)) {
    content = `${content.trimEnd()}\n${entry}\n`;
    fs.writeFileSync(indexPath, content);
  }
}

async function main() {
  const sourceArtifact = readJson(SOURCE_ARTIFACT_JSON);
  const collisionAudit = readJson(COLLISION_AUDIT_JSON);
  const mutationRows = buildMutationRows(sourceArtifact, collisionAudit);
  const rollbackRows = buildRollbackRows(mutationRows);
  const setSummaries = summarizeBySet(mutationRows);
  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    parent_package_id: PARENT_PACKAGE_ID,
    rows: mutationRows.map((row) => ({
      card_print_id: row.card_print_id,
      set_key: row.set_key,
      target_parent_fields: row.target_parent_fields,
      child_printing_count_expected_after: row.child_printing_count_expected_after,
    })),
  }));

  const freshSnapshot = await captureFreshSnapshot(mutationRows.map((row) => row.card_print_id));
  const sql = buildSql({ packageFingerprint, mutationRows });
  const sqlHash = sha256(sql);
  const sqlFlags = validateSql(sql);
  const stopFindings = [];

  if (sourceArtifact.package_scope?.package_id !== PARENT_PACKAGE_ID) stopFindings.push('source_artifact_not_pkg02b');
  if (collisionAudit.audit_status !== 'pkg02b_full_beta_collision_audit_complete_split_required') {
    stopFindings.push('collision_audit_not_split_ready');
  }
  if (mutationRows.length !== 343) stopFindings.push('noncolliding_row_count_not_343');
  if (mutationRows.reduce((sum, row) => sum + (row.child_printing_count_expected_after ?? 0), 0) !== 542) {
    stopFindings.push('noncolliding_child_count_not_542');
  }
  if (mutationRows.reduce((sum, row) => sum + (row.vault_items_referencing_target ?? 0), 0) !== 4) {
    stopFindings.push('noncolliding_vault_ref_count_not_4');
  }
  if (!freshSnapshot.available) stopFindings.push('fresh_snapshot_unavailable');
  if (freshSnapshot.impact_counts?.card_prints_found !== 343) stopFindings.push('fresh_snapshot_card_print_count_not_343');
  if (freshSnapshot.impact_counts?.card_printings_found !== 542) stopFindings.push('fresh_snapshot_child_count_not_542');
  if (freshSnapshot.impact_counts?.vault_items_found !== 4) stopFindings.push('fresh_snapshot_vault_count_not_4');
  if (sqlFlags.contains_commit_statement) stopFindings.push('sql_contains_commit_statement');
  if (sqlFlags.contains_delete_statement) stopFindings.push('sql_contains_delete_statement');
  if (!sqlFlags.contains_rollback_statement) stopFindings.push('sql_missing_rollback_statement');
  if (!sqlFlags.contains_update_statement) stopFindings.push('sql_missing_update_statement');

  fs.mkdirSync(SQL_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_SQL, sql);

  const approvalPhrase = `Approve ${PACKAGE_ID} for guarded dry-run transaction execution only. Fingerprint: ${packageFingerprint}. Scope: 343 non-colliding card_print updates, 542 verified child printings, 4 vault references accepted, 79 collision rows excluded. No real apply. No migrations.`;
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg02c_full_beta_noncolliding_transaction_artifact_v1',
    audit_only: true,
    db_reads_performed: freshSnapshot.available,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    real_apply_performed: false,
    artifact_status: stopFindings.length === 0
      ? 'pkg02c_full_beta_noncolliding_transaction_artifact_prepared_apply_blocked_no_write'
      : 'pkg02c_full_beta_noncolliding_transaction_artifact_blocked',
    package_scope: {
      package_id: PACKAGE_ID,
      parent_package_id: PARENT_PACKAGE_ID,
      package_fingerprint_sha256: packageFingerprint,
      parent_package_fingerprint_sha256: sourceArtifact.package_scope?.package_fingerprint_sha256,
      card_print_rows: mutationRows.length,
      child_printing_rows: mutationRows.reduce((sum, row) => sum + (row.child_printing_count_expected_after ?? 0), 0),
      vault_references_accepted: mutationRows.reduce((sum, row) => sum + (row.vault_items_referencing_target ?? 0), 0),
      collision_rows_excluded: collisionAudit.summary?.blocked_collision_rows ?? null,
      collision_child_printings_excluded: collisionAudit.summary?.blocked_collision_child_printings ?? null,
    },
    required_operator_approval: {
      required_before_dry_run_execution: true,
      exact_phrase: approvalPhrase,
    },
    source_artifacts: {
      parent_artifact: path.relative(ROOT, SOURCE_ARTIFACT_JSON).replaceAll('\\', '/'),
      collision_audit: path.relative(ROOT, COLLISION_AUDIT_JSON).replaceAll('\\', '/'),
    },
    fresh_snapshot: freshSnapshot,
    set_summaries: setSummaries,
    mutation_matrix: mutationRows,
    rollback_matrix: rollbackRows,
    sql_artifact: {
      path: path.relative(ROOT, OUTPUT_SQL).replaceAll('\\', '/'),
      sha256: sqlHash,
      execution_performed: false,
      ...sqlFlags,
    },
    safety: [
      'This is artifact preparation only.',
      'No DB transaction was executed.',
      'No real apply is authorized by this artifact.',
      'Collision rows are excluded and remain blocked.',
      'The SQL artifact contains ROLLBACK and no COMMIT.',
      'No migrations were created.',
    ],
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };

  writeJson(OUTPUT_JSON, report);
  fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));
  fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  fs.writeFileSync(CHECKPOINT_MD, renderMarkdown({
    ...report,
    artifact_status: `${report.artifact_status}_checkpoint`,
  }));
  updateCheckpointIndex(CHECKPOINT_MD);

  console.log(JSON.stringify({
    artifact_status: report.artifact_status,
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint,
    card_print_rows: report.package_scope.card_print_rows,
    child_printing_rows: report.package_scope.child_printing_rows,
    vault_references_accepted: report.package_scope.vault_references_accepted,
    collision_rows_excluded: report.package_scope.collision_rows_excluded,
    sql_sha256: sqlHash,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
    required_approval: approvalPhrase,
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
  }, null, 2));

  if (stopFindings.length > 0) process.exitCode = 1;
}

await main();
