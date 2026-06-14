import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg07a_vault_safe_physical_recovery_real_apply_gate_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg07a_vault_safe_physical_recovery_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg07a_vault_safe_physical_recovery_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg07a_vault_safe_physical_recovery_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg07a_vault_safe_physical_recovery_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-07A-VAULT-SAFE-PHYSICAL-RECOVERY';
const PACKAGE_FINGERPRINT = 'd6c304be4f6c3a13b316fbeb8297a8f27d7165f28bd7c2dcbfe4412bfc7f726b';
const SQL_HASH = 'f9c1f57739700544abcbbbb7c62e2b7fd028e4ca980daa2f048f6fc090be0be0';
const DRY_RUN_PROOF_HASH = '33b271ade124ddd34c6a46892f821439bb3de18d1052e4c0ec3366de0ea71df1';
const APPROVAL_TEXT = 'Approve real PKG-07A-VAULT-SAFE-PHYSICAL-RECOVERY apply only. Fingerprint: d6c304be4f6c3a13b316fbeb8297a8f27d7165f28bd7c2dcbfe4412bfc7f726b. SQL hash: f9c1f57739700544abcbbbb7c62e2b7fd028e4ca980daa2f048f6fc090be0be0. Scope: 164 vault-safe card_print parent updates across 13 sets, preserving 253 child printings; source candidates=185, stale missing rows excluded=21, vault references=0. Sets: 2021swsh=25, col1=2, dp7=8, ecard2=13, ecard3=15, pl1=9, pl2=15, pl3=9, pl4=12, sv08.5=20, swsh10.5=33, swsh2=1, swsh4.5=2. Dry-run proof: 33b271ade124ddd34c6a46892f821439bb3de18d1052e4c0ec3366de0ea71df1 == 33b271ade124ddd34c6a46892f821439bb3de18d1052e4c0ec3366de0ea71df1. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No child writes.';

const EXPECTED_SOURCE_ROWS = 185;
const EXPECTED_EXCLUDED_ROWS = 21;
const EXPECTED_PARENT_ROWS = 164;
const EXPECTED_CHILD_PRINTINGS = 253;
const EXPECTED_VAULT_REFS = 0;
const EXPECTED_SET_COUNTS = {
  '2021swsh': 25,
  col1: 2,
  dp7: 8,
  ecard2: 13,
  ecard3: 15,
  pl1: 9,
  pl2: 15,
  pl3: 9,
  pl4: 12,
  'sv08.5': 20,
  'swsh10.5': 33,
  swsh2: 1,
  'swsh4.5': 2,
};

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

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
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function targetRows(dryRun) {
  return (dryRun.scope?.rows ?? []).map((row) => ({
    card_print_id: row.card_print_id,
    target_set_key: row.target_set_key,
    target_card_number: row.target_card_number,
    target_card_name: row.target_card_name,
  }));
}

async function captureSnapshot(client, rows) {
  const ids = rows.map((row) => row.card_print_id);
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
     order by cp.set_code nulls first, cp.number nulls first, cp.name, cp.id`,
    [ids],
  );
  const snapshotRows = result.rows.map((row) => ({
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
  return {
    captured_at: new Date().toISOString(),
    rows: snapshotRows,
    hash_sha256: sha256(stableJson(snapshotRows)),
    dependency_hash_sha256: sha256(stableJson(snapshotRows.map((row) => ({
      card_print_id: row.card_print_id,
      card_printings: row.card_printings,
      external_mappings: row.external_mappings,
      card_print_identity: row.card_print_identity,
      card_print_traits: row.card_print_traits,
      vault_items: row.vault_items,
    })))),
    impact_counts: {
      card_prints_found: snapshotRows.length,
      card_printings_found: snapshotRows.reduce((total, row) => total + row.dependency_counts.card_printings, 0),
      external_mappings_found: snapshotRows.reduce((total, row) => total + row.dependency_counts.external_mappings, 0),
      identity_rows_found: snapshotRows.reduce((total, row) => total + row.dependency_counts.card_print_identity, 0),
      trait_rows_found: snapshotRows.reduce((total, row) => total + row.dependency_counts.card_print_traits, 0),
      vault_items_found: snapshotRows.reduce((total, row) => total + row.dependency_counts.vault_items, 0),
    },
  };
}

function validateExpectedCounts(actual, expected, label, findings) {
  for (const [key, count] of Object.entries(expected)) {
    if (actual[key] !== count) findings.push(`${label}_${key}_count_not_${count}`);
  }
}

function validatePrerequisites({ gate, dryRun, rows }) {
  const findings = [];
  if (gate.required_operator_decision?.exact_approval_phrase_required !== APPROVAL_TEXT) findings.push('real_apply_gate_approval_text_mismatch');
  if (gate.approval_gate_status !== 'ready_for_real_apply_operator_decision_apply_blocked_no_write') findings.push('real_apply_gate_not_ready');
  if (gate.package_scope?.package_id !== PACKAGE_ID) findings.push('real_apply_gate_wrong_package');
  if (gate.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('real_apply_gate_fingerprint_mismatch');
  if (gate.package_scope?.sql_hash_sha256 !== SQL_HASH) findings.push('real_apply_gate_sql_hash_mismatch');
  if ((gate.stop_findings ?? []).length !== 0) findings.push('real_apply_gate_stop_findings_present');
  if (gate.apply_allowed !== false || gate.write_ready_now !== 0) findings.push('real_apply_gate_unexpected_write_ready');
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.sql_hash_sha256 !== SQL_HASH) findings.push('dry_run_sql_hash_mismatch');
  if (dryRun.dry_run_execution_status !== 'pkg07a_vault_safe_physical_recovery_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (dryRun.before_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH || dryRun.after_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_durable_state_not_proven_unchanged');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.scope?.source_candidate_rows !== EXPECTED_SOURCE_ROWS) findings.push('source_candidate_count_not_185');
  if (dryRun.scope?.excluded_missing_rows !== EXPECTED_EXCLUDED_ROWS) findings.push('excluded_missing_count_not_21');
  if (rows.length !== EXPECTED_PARENT_ROWS) findings.push('target_row_count_not_164');
  if (dryRun.scope?.preserved_child_printings !== EXPECTED_CHILD_PRINTINGS) findings.push('dry_run_child_count_not_253');
  if (dryRun.scope?.vault_references !== EXPECTED_VAULT_REFS) findings.push('dry_run_vault_count_not_0');
  validateExpectedCounts(countBy(rows, (row) => row.target_set_key), EXPECTED_SET_COUNTS, 'target_set', findings);
  return findings;
}

function validateBeforeSnapshot({ beforeSnapshot, dryRun }) {
  const findings = [];
  if (beforeSnapshot.hash_sha256 !== dryRun.before_snapshot?.hash_sha256) findings.push('before_snapshot_hash_does_not_match_dry_run_proof');
  if (beforeSnapshot.impact_counts.card_prints_found !== EXPECTED_PARENT_ROWS) findings.push('before_parent_count_not_164');
  if (beforeSnapshot.impact_counts.card_printings_found !== EXPECTED_CHILD_PRINTINGS) findings.push('before_child_count_not_253');
  if (beforeSnapshot.impact_counts.vault_items_found !== EXPECTED_VAULT_REFS) findings.push('before_vault_count_not_0');
  return findings;
}

function validateAfterSnapshot({ afterSnapshot, beforeSnapshot, rows }) {
  const findings = [];
  if (afterSnapshot.impact_counts.card_prints_found !== EXPECTED_PARENT_ROWS) findings.push('after_parent_count_not_164');
  if (afterSnapshot.impact_counts.card_printings_found !== EXPECTED_CHILD_PRINTINGS) findings.push('after_child_count_not_253');
  if (afterSnapshot.impact_counts.vault_items_found !== EXPECTED_VAULT_REFS) findings.push('after_vault_count_not_0');
  if (afterSnapshot.dependency_hash_sha256 !== beforeSnapshot.dependency_hash_sha256) findings.push('dependency_snapshot_changed_unexpectedly');
  const targetById = new Map(rows.map((row) => [row.card_print_id, row]));
  for (const row of afterSnapshot.rows) {
    const target = targetById.get(row.card_print_id);
    if (!target) {
      findings.push(`unknown_after_row_${row.card_print_id}`);
      continue;
    }
    if (row.card_print.set_code !== target.target_set_key) findings.push(`set_code_not_updated_${row.card_print_id}`);
    if (row.card_print.number !== target.target_card_number) findings.push(`number_not_updated_${row.card_print_id}`);
    if (row.card_print.name !== target.target_card_name) findings.push(`name_not_updated_${row.card_print_id}`);
  }
  return findings;
}

async function applyPackage({ dryRun, rows }) {
  const conn = connectionString();
  if (!conn) {
    return {
      connected: false,
      apply_status: 'blocked_no_database_connection_string',
      error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      committed: false,
      updated_row_count: 0,
    };
  }
  const client = new Client({ connectionString: conn });
  await client.connect();
  let beforeSnapshot = null;
  try {
    beforeSnapshot = await captureSnapshot(client, rows);
    const beforeFindings = validateBeforeSnapshot({ beforeSnapshot, dryRun });
    if (beforeFindings.length !== 0) {
      return {
        connected: true,
        apply_status: 'blocked_before_snapshot_findings_present',
        error_message: beforeFindings.join(', '),
        before_snapshot: beforeSnapshot,
        after_snapshot: beforeSnapshot,
        updated_row_count: 0,
        committed: false,
      };
    }
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg07a_real_apply_targets (
         card_print_id uuid primary key,
         target_set_code text not null,
         target_number text not null,
         target_name text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg07a_real_apply_targets
       select
         row.card_print_id::uuid,
         row.target_set_key,
         row.target_card_number,
         row.target_card_name
       from jsonb_to_recordset($1::jsonb) as row(
         card_print_id text,
         target_set_key text,
         target_card_number text,
         target_card_name text
       )`,
      [JSON.stringify(rows)],
    );
    const shape = await client.query(
      `select
         count(*)::int as parent_rows,
         (select count(*)::int from public.card_printings cpr join pkg07a_real_apply_targets target on target.card_print_id = cpr.card_print_id) as child_rows,
         (select count(*)::int from public.vault_items vi join pkg07a_real_apply_targets target on target.card_print_id = vi.card_id) as vault_rows,
         (select count(*)::int from pkg07a_real_apply_targets target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_rows
       from pkg07a_real_apply_targets`,
    );
    const shapeRow = shape.rows[0];
    if (
      shapeRow.parent_rows !== EXPECTED_PARENT_ROWS ||
      shapeRow.child_rows !== EXPECTED_CHILD_PRINTINGS ||
      shapeRow.vault_rows !== EXPECTED_VAULT_REFS ||
      shapeRow.missing_rows !== 0
    ) {
      throw new Error(`target shape mismatch: ${JSON.stringify(shapeRow)}`);
    }
    const grouped = await client.query(
      `select target_set_code as key, count(*)::int as count
       from pkg07a_real_apply_targets
       group by target_set_code`,
    );
    const groupedFindings = [];
    validateExpectedCounts(
      Object.fromEntries(grouped.rows.map((row) => [row.key, row.count])),
      EXPECTED_SET_COUNTS,
      'transaction_set',
      groupedFindings,
    );
    if (groupedFindings.length !== 0) throw new Error(groupedFindings.join(', '));
    const lockParents = await client.query(
      `select cp.id
       from public.card_prints cp
       join pkg07a_real_apply_targets target on target.card_print_id = cp.id
       for update of cp`,
    );
    if (lockParents.rowCount !== EXPECTED_PARENT_ROWS) throw new Error(`locked parent count mismatch: ${lockParents.rowCount}`);
    const updateResult = await client.query(
      `update public.card_prints cp
       set
         set_code = target.target_set_code,
         number = target.target_number,
         name = target.target_name
       from pkg07a_real_apply_targets target
       where cp.id = target.card_print_id`,
    );
    if (updateResult.rowCount !== EXPECTED_PARENT_ROWS) throw new Error(`update count mismatch: ${updateResult.rowCount}`);
    const verify = await client.query(
      `select
         count(*) filter (
           where cp.set_code is distinct from target.target_set_code
              or cp.number is distinct from target.target_number
              or cp.name is distinct from target.target_name
         )::int as unresolved_rows,
         (select count(*)::int from public.card_printings cpr join pkg07a_real_apply_targets target on target.card_print_id = cpr.card_print_id) as child_rows,
         (select count(*)::int from public.vault_items vi join pkg07a_real_apply_targets target on target.card_print_id = vi.card_id) as vault_rows
       from public.card_prints cp
       join pkg07a_real_apply_targets target on target.card_print_id = cp.id`,
    );
    const verifyRow = verify.rows[0];
    if (
      verifyRow.unresolved_rows !== 0 ||
      verifyRow.child_rows !== EXPECTED_CHILD_PRINTINGS ||
      verifyRow.vault_rows !== EXPECTED_VAULT_REFS
    ) {
      throw new Error(`post-update verification mismatch: ${JSON.stringify(verifyRow)}`);
    }
    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, rows);
    return {
      connected: true,
      apply_status: 'pkg07a_vault_safe_physical_recovery_real_apply_committed',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      updated_row_count: updateResult.rowCount,
      committed: true,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = beforeSnapshot ? await captureSnapshot(client, rows) : null;
    return {
      connected: true,
      apply_status: 'pkg07a_vault_safe_physical_recovery_real_apply_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      updated_row_count: 0,
      committed: false,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function rollbackSqlPreview(beforeSnapshot) {
  return (beforeSnapshot?.rows ?? [])
    .slice(0, 30)
    .map((row) => `update public.card_prints set set_code = ${sqlLiteral(row.card_print.set_code)}, number = ${sqlLiteral(row.card_print.number)}, name = ${sqlLiteral(row.card_print.name)} where id = '${row.card_print_id}'::uuid;`)
    .join('\n');
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function renderMarkdown(report) {
  return `# PKG-07A Vault-Safe Physical Recovery Real Apply V1

This report records the approved real apply for PKG-07A vault-safe physical recovery parent updates.

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| updated_parent_rows | ${report.updated_parent_rows} |
| preserved_child_printings | ${report.verification_summary.preserved_child_printings} |
| db_write_committed | ${report.db_write_committed} |
| migrations_created | ${report.migrations_created} |
| cleanup_performed | ${report.cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| child_writes_performed | ${report.child_writes_performed} |
| stop_findings | ${report.stop_findings.length} |

## Rollback Preview

\`\`\`sql
${report.rollback_proof.rollback_sql_preview}
\`\`\`

The JSON report contains all before-state rows for exact rollback targeting.
`;
}

function renderCheckpoint(report) {
  return `# PKG-07A Vault-Safe Physical Recovery Real Apply Checkpoint V1

Date: 2026-06-09

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| sql_hash_sha256 | \`${report.package_scope.sql_hash_sha256}\` |
| updated_parent_rows | ${report.updated_parent_rows} |
| preserved_child_printings | ${report.verification_summary.preserved_child_printings} |
| parent_dependency_hash_preserved | ${report.verification_summary.dependency_hash_preserved} |
| db_write_committed | ${report.db_write_committed} |
| migrations_created | ${report.migrations_created} |
| cleanup_performed | ${report.cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| child_writes_performed | ${report.child_writes_performed} |
| stop_findings | ${report.stop_findings.length} |

Real apply was scoped to 164 parent card_print updates across 13 sets. No child writes, migrations, deletes, merges, unsupported cleanup, or quarantine were performed.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-07A Vault-Safe Physical Recovery Real Apply Checkpoint V1](20260609_pkg07a_vault_safe_physical_recovery_real_apply_checkpoint_v1.md) | Records approved real apply for 164 vault-safe physical recovery parent updates preserving 253 child printings; no child writes or migrations. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg07a_vault_safe_physical_recovery_real_apply_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260609_pkg07a_vault_safe_physical_recovery_real_apply_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const gate = readJson(GATE_JSON);
const dryRun = readJson(DRY_RUN_JSON);
const rows = targetRows(dryRun);
const prerequisiteFindings = validatePrerequisites({ gate, dryRun, rows });
const applyResult = prerequisiteFindings.length === 0
  ? await applyPackage({ dryRun, rows })
  : {
      connected: false,
      apply_status: 'blocked_prerequisite_findings_present',
      error_message: prerequisiteFindings.join(', '),
      committed: false,
      updated_row_count: 0,
    };
const afterFindings = applyResult.committed
  ? validateAfterSnapshot({
      afterSnapshot: applyResult.after_snapshot,
      beforeSnapshot: applyResult.before_snapshot,
      rows,
    })
  : ['apply_not_committed'];
const stopFindings = [
  ...prerequisiteFindings,
  ...(applyResult.error_message ? [`apply_error: ${applyResult.error_message}`] : []),
  ...afterFindings,
];
const pass = stopFindings.length === 0;

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg07a_vault_safe_physical_recovery_real_apply_v1',
  audit_only: false,
  apply_only: true,
  approval_scope: {
    apply_approved_by_user: true,
    approval_text: APPROVAL_TEXT,
    approved_for_package_id: PACKAGE_ID,
    approved_for_fingerprint_sha256: PACKAGE_FINGERPRINT,
    approved_for_sql_hash_sha256: SQL_HASH,
    approved_for_parent_update_rows: EXPECTED_PARENT_ROWS,
    approved_for_global_apply: false,
    approved_for_migrations: false,
    approved_for_deletes: false,
    approved_for_merges: false,
    approved_for_child_writes: false,
  },
  apply_status: pass
    ? 'pkg07a_vault_safe_physical_recovery_real_apply_committed_and_verified'
    : 'pkg07a_vault_safe_physical_recovery_real_apply_failed_or_blocked',
  db_reads_performed: true,
  durable_db_writes_performed: applyResult.committed,
  db_write_committed: applyResult.committed,
  updated_parent_rows: applyResult.updated_row_count,
  child_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  apply_paths_executed: applyResult.committed,
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    sql_hash_sha256: SQL_HASH,
    source_candidate_rows: EXPECTED_SOURCE_ROWS,
    excluded_missing_rows: EXPECTED_EXCLUDED_ROWS,
    parent_update_rows: EXPECTED_PARENT_ROWS,
    preserved_child_printings: EXPECTED_CHILD_PRINTINGS,
    vault_references: EXPECTED_VAULT_REFS,
    set_counts: EXPECTED_SET_COUNTS,
    global_apply_included: false,
  },
  source_artifacts: {
    real_apply_gate: path.relative(ROOT, GATE_JSON).replaceAll('\\', '/'),
    dry_run_proof: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
  },
  execution_result: {
    connected: applyResult.connected,
    apply_status: applyResult.apply_status,
    error_message: applyResult.error_message,
    committed: applyResult.committed,
  },
  before_snapshot: applyResult.before_snapshot,
  after_snapshot: applyResult.after_snapshot,
  rollback_proof: {
    rollback_selector: 'update only approved public.card_prints rows by exact id using captured before-state fields.',
    target_parent_ids: rows.map((row) => row.card_print_id),
    rollback_sql_preview: rollbackSqlPreview(applyResult.before_snapshot),
  },
  verification_summary: {
    before_hash_matches_dry_run_proof:
      applyResult.before_snapshot?.hash_sha256 === dryRun.before_snapshot?.hash_sha256,
    updated_rows: applyResult.updated_row_count,
    preserved_child_printings: applyResult.after_snapshot?.impact_counts?.card_printings_found ?? 0,
    vault_references_after: applyResult.after_snapshot?.impact_counts?.vault_items_found ?? null,
    dependency_hash_preserved:
      applyResult.before_snapshot?.dependency_hash_sha256 === applyResult.after_snapshot?.dependency_hash_sha256,
    master_index_comparison_status: pass ? 'pkg07a_vault_safe_physical_recovery_verified_after_apply' : 'not_verified',
  },
  explicit_non_authorizations: [
    'No global apply was authorized or performed.',
    'No migrations were authorized or created.',
    'No deletes were authorized or performed.',
    'No merges were authorized or performed.',
    'No unsupported cleanup was authorized or performed.',
    'No child writes were authorized or performed.',
  ],
  stop_findings: stopFindings,
  pass,
};

writeJson(OUTPUT_JSON, report);
fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));
fs.writeFileSync(CHECKPOINT_MD, renderCheckpoint(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  generated_files: [
    path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    path.relative(ROOT, CHECKPOINT_MD).replaceAll('\\', '/'),
  ],
  apply_status: report.apply_status,
  package_id: report.package_scope.package_id,
  package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
  updated_parent_rows: report.updated_parent_rows,
  db_write_committed: report.db_write_committed,
  durable_db_writes_performed: report.durable_db_writes_performed,
  before_hash_matches_dry_run_proof: report.verification_summary.before_hash_matches_dry_run_proof,
  preserved_child_printings: report.verification_summary.preserved_child_printings,
  dependency_hash_preserved: report.verification_summary.dependency_hash_preserved,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
  child_writes_performed: report.child_writes_performed,
  global_apply_included: report.package_scope.global_apply_included,
  stop_findings: report.stop_findings.length,
}, null, 2));

if (!report.pass) process.exitCode = 1;
