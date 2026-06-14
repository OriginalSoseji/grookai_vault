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
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const PLAN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02g_number_key_collision_identity_modifier_plan_v1.json');
const DRY_RUN_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg02g_number_key_collision_identity_modifier_guarded_dry_run_execution_v1.json',
);
const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02g_number_key_collision_identity_modifier_real_apply_gate_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02g_number_key_collision_identity_modifier_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg02g_number_key_collision_identity_modifier_real_apply_v1.md');
const CHECKPOINT_MD = path.join(
  CHECKPOINT_DIR,
  '20260609_pkg02g_number_key_collision_identity_modifier_real_apply_checkpoint_v1.md',
);

const PACKAGE_ID = 'PKG-02G-NUMBER-KEY-IDENTITY-MODIFIER';
const PACKAGE_FINGERPRINT = '6b99a72e94808480edb20c649c62d31364d40ca794bf9c175c630f4b48d678d4';
const APPROVAL_TEXT = 'Approve real PKG-02G-NUMBER-KEY-IDENTITY-MODIFIER apply only. Fingerprint: 6b99a72e94808480edb20c649c62d31364d40ca794bf9c175c630f4b48d678d4. Scope: 58 number-key collision rows, 97 parent identity updates, no deletes. Dry-run proof: 99d219933595262b2ff9c75fc71073ac529d62a10e00e528ef5729ba43f0ec0f == 99d219933595262b2ff9c75fc71073ac529d62a10e00e528ef5729ba43f0ec0f. No global apply. No migrations.';

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

async function captureRows(client, cardPrintIds) {
  const result = await client.query(
    `select
       cp.id,
       to_jsonb(cp) as card_print,
       s.code as resolved_set_code,
       s.name as resolved_set_name,
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
         select jsonb_agg(to_jsonb(cps) order by cps.id)
         from public.card_print_species cps
         where cps.card_print_id = cp.id
       ), '[]'::jsonb) as card_print_species,
       coalesce((
         select jsonb_agg(to_jsonb(vi) order by vi.id)
         from public.vault_items vi
         where vi.card_id = cp.id
       ), '[]'::jsonb) as vault_items
     from public.card_prints cp
     left join public.sets s on s.id = cp.set_id
     where cp.id = any($1::uuid[])
     order by s.code nulls first, cp.number_plain nulls first, cp.number nulls first, cp.name, cp.id`,
    [cardPrintIds],
  );
  const rows = result.rows.map((row) => ({
    card_print_id: row.id,
    card_print: row.card_print,
    resolved_set_code: row.resolved_set_code,
    resolved_set_name: row.resolved_set_name,
    card_printings: row.card_printings,
    external_mappings: row.external_mappings,
    card_print_identity: row.card_print_identity,
    card_print_traits: row.card_print_traits,
    card_print_species: row.card_print_species,
    vault_items: row.vault_items,
    dependency_counts: {
      card_printings: row.card_printings.length,
      external_mappings: row.external_mappings.length,
      card_print_identity: row.card_print_identity.length,
      card_print_traits: row.card_print_traits.length,
      card_print_species: row.card_print_species.length,
      vault_items: row.vault_items.length,
    },
  }));
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    impact_counts: {
      card_prints_found: rows.length,
      card_printings_found: rows.reduce((sum, row) => sum + row.dependency_counts.card_printings, 0),
      external_mappings_found: rows.reduce((sum, row) => sum + row.dependency_counts.external_mappings, 0),
      identity_rows_found: rows.reduce((sum, row) => sum + row.dependency_counts.card_print_identity, 0),
      trait_rows_found: rows.reduce((sum, row) => sum + row.dependency_counts.card_print_traits, 0),
      species_rows_found: rows.reduce((sum, row) => sum + row.dependency_counts.card_print_species, 0),
      vault_items_found: rows.reduce((sum, row) => sum + row.dependency_counts.vault_items, 0),
    },
  };
}

async function finalUniqueCollisionCount(client, setIds) {
  const result = await client.query(
    `select count(*)::int as collision_groups
     from (
       select
         cp.set_id,
         cp.number_plain,
         coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
         coalesce(cp.variant_key, '') as variant_key,
         count(*) as row_count
       from public.card_prints cp
       where cp.set_id = any($1::uuid[])
         and cp.set_id is not null
         and cp.number_plain is not null
         and cp.set_identity_model = 'standard'
       group by cp.set_id, cp.number_plain, coalesce(cp.printed_identity_modifier, ''), coalesce(cp.variant_key, '')
       having count(*) > 1
     ) collisions`,
    [setIds],
  );
  return result.rows[0]?.collision_groups ?? null;
}

function validatePrerequisites({ gate, dryRun, plan }) {
  const findings = [];
  if (gate.approval_gate_status !== 'ready_for_real_apply_operator_decision_apply_blocked_no_write') {
    findings.push('real_apply_gate_not_ready');
  }
  if (gate.required_operator_decision?.exact_approval_phrase_required !== APPROVAL_TEXT) {
    findings.push('real_apply_gate_approval_text_mismatch');
  }
  if (gate.package_scope?.package_id !== PACKAGE_ID) findings.push('real_apply_gate_wrong_package');
  if (gate.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) {
    findings.push('real_apply_gate_fingerprint_mismatch');
  }
  if (gate.package_scope?.number_key_collision_rows !== 58) findings.push('real_apply_gate_collision_count_not_58');
  if (gate.package_scope?.parent_update_rows !== 97) findings.push('real_apply_gate_parent_update_count_not_97');
  if (gate.package_scope?.deletes_included !== false) findings.push('real_apply_gate_includes_deletes');
  if (gate.apply_allowed !== false) findings.push('real_apply_gate_unexpected_apply_allowed');
  if (gate.write_ready_now !== 0) findings.push('real_apply_gate_write_ready_nonzero');
  if ((gate.stop_findings ?? []).length !== 0) findings.push('real_apply_gate_stop_findings_present');

  if (dryRun.dry_run_execution_status !== 'pkg02g_number_key_collision_identity_modifier_guarded_dry_run_passed_rolled_back_no_durable_change') {
    findings.push('dry_run_not_passed');
  }
  if (dryRun.pass !== true) findings.push('dry_run_not_passing');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_state_not_unchanged');
  if (dryRun.plan_fresh_snapshot_matches_before_snapshot !== true) findings.push('dry_run_plan_snapshot_drift');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.package_scope?.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.sql_artifact?.contains_delete_statement !== false) findings.push('dry_run_sql_had_delete_statement');
  if (dryRun.sql_artifact?.contains_commit_statement !== false) findings.push('dry_run_sql_had_commit_statement');
  if (dryRun.sql_artifact?.contains_rollback_statement !== true) findings.push('dry_run_sql_missing_rollback_statement');

  if (plan.plan_status !== 'pkg02g_number_key_collision_identity_modifier_plan_prepared_apply_blocked_no_write') {
    findings.push('plan_not_ready');
  }
  if (plan.pass !== true) findings.push('plan_not_passing');
  if (plan.package_scope?.package_id !== PACKAGE_ID) findings.push('plan_wrong_package');
  if (plan.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('plan_fingerprint_mismatch');
  if (plan.package_scope?.number_key_collision_rows !== 58) findings.push('plan_collision_count_not_58');
  if (plan.package_scope?.parent_update_rows !== 97) findings.push('plan_parent_update_count_not_97');
  if (plan.package_scope?.deletes_included !== false) findings.push('plan_includes_deletes');
  if (plan.simulated_unique_index_result?.final_unique_collision_count !== 0) {
    findings.push('plan_simulated_unique_collisions_present');
  }
  if ((plan.stop_findings ?? []).length !== 0) findings.push('plan_stop_findings_present');
  return findings;
}

function buildValues(parentUpdateRows) {
  return parentUpdateRows.map((row) => `  (${[
    sqlUuid(row.card_print_id),
    sqlString(row.update_class),
    sqlString(row.expected_before_fields.set_code),
    sqlString(row.expected_before_fields.number),
    sqlString(row.expected_before_fields.name),
    sqlString(row.expected_before_fields.printed_identity_modifier),
    sqlString(row.target_fields.set_code),
    sqlString(row.target_fields.number),
    sqlString(row.target_fields.name),
    sqlString(row.target_fields.printed_identity_modifier),
  ].join(', ')})`).join(',\n');
}

async function applyPkg02g({ plan, dryRun, involvedIds }) {
  const conn = connectionString();
  if (!conn) {
    return {
      connected: false,
      apply_status: 'blocked_no_database_connection_string',
      error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      committed: false,
      before_snapshot: null,
      after_snapshot: null,
      blocked_target_parent_recovery_updates: 0,
      existing_collision_holder_modifier_updates: 0,
      final_unique_collision_count: null,
    };
  }

  const parentUpdateRows = plan.parent_update_rows ?? [];
  const client = new Client({ connectionString: conn });
  await client.connect();
  let beforeSnapshot = null;
  try {
    beforeSnapshot = await captureRows(client, involvedIds);
    const beforeFindings = [];
    if (beforeSnapshot.hash_sha256 !== dryRun.execution_result?.before_snapshot?.hash_sha256) {
      beforeFindings.push('before_snapshot_hash_does_not_match_dry_run_proof');
    }
    if (beforeSnapshot.impact_counts.card_prints_found !== 116) beforeFindings.push('before_card_print_count_not_116');
    if (beforeFindings.length !== 0) {
      return {
        connected: true,
        apply_status: 'blocked_before_snapshot_findings_present',
        error_message: beforeFindings.join(', '),
        committed: false,
        before_snapshot: beforeSnapshot,
        after_snapshot: beforeSnapshot,
        blocked_target_parent_recovery_updates: 0,
        existing_collision_holder_modifier_updates: 0,
        final_unique_collision_count: null,
      };
    }

    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '60s'");
    const affectedSetIds = [...new Set(beforeSnapshot.rows.map((row) => row.card_print?.set_id).filter(Boolean))];
    await client.query(
      `create temporary table pkg02g_parent_update_targets (
         card_print_id uuid primary key,
         update_class text not null,
         expected_set_code text,
         expected_number text,
         expected_name text,
         expected_printed_identity_modifier text,
         target_set_code text,
         target_number text,
         target_name text,
         target_printed_identity_modifier text
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg02g_parent_update_targets (
         card_print_id,
         update_class,
         expected_set_code,
         expected_number,
         expected_name,
         expected_printed_identity_modifier,
         target_set_code,
         target_number,
         target_name,
         target_printed_identity_modifier
       )
       values
       ${buildValues(parentUpdateRows)}`,
    );

    const countGuard = await client.query(
      `select
         count(*)::int as target_rows,
         count(*) filter (where update_class = 'blocked_target_parent_recovery')::int as blocked_target_rows,
         count(*) filter (where update_class = 'existing_collision_holder_modifier')::int as existing_modifier_rows
       from pkg02g_parent_update_targets`,
    );
    const counts = countGuard.rows[0];
    if (counts.target_rows !== 97 || counts.blocked_target_rows !== 58 || counts.existing_modifier_rows !== 39) {
      throw new Error(`target count guard failed: ${JSON.stringify(counts)}`);
    }

    const lockRows = await client.query(
      `select cp.id
       from public.card_prints cp
       where cp.id in (select card_print_id from pkg02g_parent_update_targets)
       for update`,
    );
    if (lockRows.rowCount !== 97) throw new Error(`locked parent count mismatch: ${lockRows.rowCount}`);

    const driftResult = await client.query(
      `select count(*)::int as drifted_rows
       from public.card_prints cp
       join pkg02g_parent_update_targets target on target.card_print_id = cp.id
       where cp.set_code is distinct from target.expected_set_code
          or cp.number is distinct from target.expected_number
          or cp.name is distinct from target.expected_name
          or cp.printed_identity_modifier is distinct from target.expected_printed_identity_modifier`,
    );
    if (driftResult.rows[0].drifted_rows !== 0) {
      throw new Error(`current parent field drift before apply: ${driftResult.rows[0].drifted_rows}`);
    }

    const existingUpdate = await client.query(
      `update public.card_prints cp
       set printed_identity_modifier = target.target_printed_identity_modifier
       from pkg02g_parent_update_targets target
       where cp.id = target.card_print_id
         and target.update_class = 'existing_collision_holder_modifier'`,
    );
    if (existingUpdate.rowCount !== 39) {
      throw new Error(`existing collision holder update count mismatch: ${existingUpdate.rowCount}`);
    }

    const blockedUpdate = await client.query(
      `update public.card_prints cp
       set
         set_code = target.target_set_code,
         number = target.target_number,
         name = target.target_name,
         printed_identity_modifier = target.target_printed_identity_modifier
       from pkg02g_parent_update_targets target
       where cp.id = target.card_print_id
         and target.update_class = 'blocked_target_parent_recovery'`,
    );
    if (blockedUpdate.rowCount !== 58) {
      throw new Error(`blocked target parent update count mismatch: ${blockedUpdate.rowCount}`);
    }

    const fieldGuard = await client.query(
      `select count(*)::int as bad_rows
       from public.card_prints cp
       join pkg02g_parent_update_targets target on target.card_print_id = cp.id
       where cp.set_code is distinct from target.target_set_code
          or cp.number is distinct from target.target_number
          or cp.name is distinct from target.target_name
          or cp.printed_identity_modifier is distinct from target.target_printed_identity_modifier`,
    );
    if (fieldGuard.rows[0].bad_rows !== 0) {
      throw new Error(`final field guard failed: ${fieldGuard.rows[0].bad_rows}`);
    }

    const uniqueCollisionCount = await finalUniqueCollisionCount(client, affectedSetIds);
    if (uniqueCollisionCount !== 0) {
      throw new Error(`final unique identity collision groups: ${uniqueCollisionCount}`);
    }

    await client.query('commit');
    const afterSnapshot = await captureRows(client, involvedIds);
    return {
      connected: true,
      apply_status: 'pkg02g_number_key_collision_identity_modifier_real_apply_committed',
      error_message: null,
      committed: true,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      blocked_target_parent_recovery_updates: blockedUpdate.rowCount,
      existing_collision_holder_modifier_updates: existingUpdate.rowCount,
      final_unique_collision_count: uniqueCollisionCount,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = beforeSnapshot ? await captureRows(client, involvedIds) : null;
    return {
      connected: true,
      apply_status: 'pkg02g_number_key_collision_identity_modifier_real_apply_failed_rolled_back',
      error_message: error.message,
      committed: false,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      blocked_target_parent_recovery_updates: 0,
      existing_collision_holder_modifier_updates: 0,
      final_unique_collision_count: null,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function validateAfter({ applyResult, plan }) {
  const findings = [];
  if (!applyResult.after_snapshot) return ['after_snapshot_unavailable'];
  if (applyResult.after_snapshot.impact_counts.card_prints_found !== 116) findings.push('after_card_print_count_not_116');
  const beforeCounts = applyResult.before_snapshot?.impact_counts ?? {};
  const afterCounts = applyResult.after_snapshot.impact_counts;
  for (const key of [
    'card_prints_found',
    'card_printings_found',
    'external_mappings_found',
    'identity_rows_found',
    'trait_rows_found',
    'species_rows_found',
    'vault_items_found',
  ]) {
    if (beforeCounts[key] !== afterCounts[key]) findings.push(`dependency_count_changed_${key}`);
  }
  const rowsById = new Map(applyResult.after_snapshot.rows.map((row) => [row.card_print_id, row]));
  for (const row of plan.parent_update_rows ?? []) {
    const current = rowsById.get(row.card_print_id)?.card_print;
    if (!current) {
      findings.push(`missing_after_row_${row.card_print_id}`);
      continue;
    }
    if (current.set_code !== row.target_fields.set_code) findings.push(`set_code_mismatch_${row.card_print_id}`);
    if (current.number !== row.target_fields.number) findings.push(`number_mismatch_${row.card_print_id}`);
    if (current.name !== row.target_fields.name) findings.push(`name_mismatch_${row.card_print_id}`);
    if ((current.printed_identity_modifier ?? null) !== (row.target_fields.printed_identity_modifier ?? null)) {
      findings.push(`printed_identity_modifier_mismatch_${row.card_print_id}`);
    }
  }
  if (applyResult.final_unique_collision_count !== 0) findings.push('final_unique_collision_count_not_zero');
  return findings;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-02G Number-Key Collision Identity Modifier Real Apply V1');
  lines.push('');
  lines.push('This report records the approved real apply for `PKG-02G-NUMBER-KEY-IDENTITY-MODIFIER`.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| apply_status | ${report.apply_status} |`);
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |`);
  lines.push(`| blocked_target_parent_recovery_updates | ${report.blocked_target_parent_recovery_updates} |`);
  lines.push(`| existing_collision_holder_modifier_updates | ${report.existing_collision_holder_modifier_updates} |`);
  lines.push(`| final_unique_collision_count | ${report.final_unique_collision_count} |`);
  lines.push(`| db_write_committed | ${report.db_write_committed} |`);
  lines.push(`| delete_performed | ${report.delete_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| global_apply_included | ${report.package_scope.global_apply_included} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Verification Summary');
  lines.push('');
  for (const [key, value] of Object.entries(report.verification_summary)) {
    lines.push(`- ${key}: ${mdEscape(value)}`);
  }
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) lines.push('- none');
  else for (const finding of report.stop_findings) lines.push(`- ${mdEscape(finding)}`);
  lines.push('');
  lines.push('## Non-Authorizations');
  lines.push('');
  for (const item of report.explicit_non_authorizations) lines.push(`- ${item}`);
  return `${lines.join('\n')}\n`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-02G Number-Key Collision Identity Modifier Real Apply Checkpoint V1](20260609_pkg02g_number_key_collision_identity_modifier_real_apply_checkpoint_v1.md) | Records approved real apply for 58 number-key collision rows and 97 parent identity updates, no deletes, no migrations, no global apply. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg02g_number_key_collision_identity_modifier_real_apply_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg02g_number_key_collision_identity_modifier_real_apply_checkpoint_v1.md') ? line : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const gate = readJson(GATE_JSON);
const dryRun = readJson(DRY_RUN_JSON);
const plan = readJson(PLAN_JSON);
const involvedIds = [...new Set((plan.collision_plan_rows ?? []).flatMap((row) => [
  row.blocked_card_print_id,
  row.conflict_card_print_id,
]).filter(Boolean))];
const prerequisiteFindings = validatePrerequisites({ gate, dryRun, plan });
const applyResult = prerequisiteFindings.length === 0
  ? await applyPkg02g({ plan, dryRun, involvedIds })
  : {
    connected: false,
    apply_status: 'blocked_prerequisite_findings_present',
    error_message: prerequisiteFindings.join(', '),
    committed: false,
    before_snapshot: null,
    after_snapshot: null,
    blocked_target_parent_recovery_updates: 0,
    existing_collision_holder_modifier_updates: 0,
    final_unique_collision_count: null,
  };
const afterFindings = applyResult.committed ? validateAfter({ applyResult, plan }) : [];
const stopFindings = [
  ...prerequisiteFindings,
  ...(applyResult.apply_status === 'pkg02g_number_key_collision_identity_modifier_real_apply_committed' ? [] : ['apply_not_committed']),
  ...(applyResult.error_message ? [`apply_error: ${applyResult.error_message}`] : []),
  ...afterFindings,
];
const pass = stopFindings.length === 0;

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg02g_number_key_collision_identity_modifier_real_apply_v1',
  audit_only: false,
  apply_only: true,
  approval_scope: {
    apply_approved_by_user: true,
    approval_text: APPROVAL_TEXT,
    approved_for_package_id: PACKAGE_ID,
    approved_for_fingerprint_sha256: PACKAGE_FINGERPRINT,
    approved_for_number_key_collision_rows: 58,
    approved_for_parent_identity_updates: 97,
    approved_for_deletes: false,
    approved_for_global_apply: false,
    approved_for_migrations: false,
  },
  apply_status: pass
    ? 'pkg02g_number_key_collision_identity_modifier_real_apply_committed_and_verified'
    : 'pkg02g_number_key_collision_identity_modifier_real_apply_failed_or_blocked',
  db_reads_performed: true,
  durable_db_writes_performed: applyResult.committed,
  db_write_committed: applyResult.committed,
  blocked_target_parent_recovery_updates: applyResult.blocked_target_parent_recovery_updates,
  existing_collision_holder_modifier_updates: applyResult.existing_collision_holder_modifier_updates,
  total_parent_identity_updates: applyResult.blocked_target_parent_recovery_updates + applyResult.existing_collision_holder_modifier_updates,
  final_unique_collision_count: applyResult.final_unique_collision_count,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  delete_performed: false,
  merge_performed: false,
  apply_paths_executed: applyResult.committed,
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    number_key_collision_rows: 58,
    parent_update_rows: 97,
    blocked_target_parent_recovery_rows: 58,
    existing_collision_holder_modifier_rows: 39,
    deletes_included: false,
    global_apply_included: false,
  },
  source_artifacts: {
    real_apply_gate: path.relative(ROOT, GATE_JSON).replaceAll('\\', '/'),
    dry_run_proof: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
    plan_artifact: path.relative(ROOT, PLAN_JSON).replaceAll('\\', '/'),
  },
  execution_result: {
    connected: applyResult.connected,
    apply_status: applyResult.apply_status,
    error_message: applyResult.error_message,
    committed: applyResult.committed,
  },
  before_snapshot: applyResult.before_snapshot,
  after_snapshot: applyResult.after_snapshot,
  verification_summary: {
    before_hash_matches_dry_run_proof:
      applyResult.before_snapshot?.hash_sha256 === dryRun.execution_result?.before_snapshot?.hash_sha256,
    after_hash_differs_from_before: (
      applyResult.before_snapshot?.hash_sha256
      && applyResult.before_snapshot.hash_sha256 !== applyResult.after_snapshot?.hash_sha256
    ) || false,
    target_parent_updates_applied: pass,
    dependency_counts_preserved: afterFindings.every((finding) => !finding.startsWith('dependency_count_changed_')),
    final_unique_collision_count: applyResult.final_unique_collision_count,
  },
  explicit_non_authorizations: [
    'No global apply was authorized or performed.',
    'No deletes were authorized or performed.',
    'No migrations were authorized or created.',
    'No cleanup or quarantine was authorized.',
    'No pricing, scanner, marketplace, provenance, ownership, child printing, or external mapping rows were intentionally changed.',
  ],
  stop_findings: stopFindings,
  pass,
};

writeJson(OUTPUT_JSON, report);
fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));
fs.writeFileSync(CHECKPOINT_MD, renderMarkdown(report));
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
  blocked_target_parent_recovery_updates: report.blocked_target_parent_recovery_updates,
  existing_collision_holder_modifier_updates: report.existing_collision_holder_modifier_updates,
  total_parent_identity_updates: report.total_parent_identity_updates,
  final_unique_collision_count: report.final_unique_collision_count,
  db_write_committed: report.db_write_committed,
  durable_db_writes_performed: report.durable_db_writes_performed,
  delete_performed: report.delete_performed,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
  global_apply_included: report.package_scope.global_apply_included,
  before_hash_sha256: report.before_snapshot?.hash_sha256 ?? null,
  after_hash_sha256: report.after_snapshot?.hash_sha256 ?? null,
  stop_findings: report.stop_findings.length,
}, null, 2));

if (!report.pass) process.exitCode = 1;
