import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08n_parent_identity_backfill_real_apply_gate_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08n_parent_identity_backfill_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08n_parent_identity_backfill_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08n_parent_identity_backfill_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08n_parent_identity_backfill_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08N-PARENT-IDENTITY-BACKFILL';
const PACKAGE_FINGERPRINT = '6401517a347571d92a766178f17c1dfc98dc45f31740802f9cdf6796f56464cf';
const DRY_RUN_PROOF_HASH = '3a1838d7473cad446d9d6ec03a7b5fb2179771bf37c01b94fdc8dc68aef66dae';
const APPROVAL_TEXT = 'Approve real PKG-08N-PARENT-IDENTITY-BACKFILL apply only. Fingerprint: 6401517a347571d92a766178f17c1dfc98dc45f31740802f9cdf6796f56464cf. Scope: 6 parent card_print field updates for col1 Call of Legends shiny legend rows; updates set_id/set_code/number/printed_identity_modifier only, printed_identity_modifier=number_prefix:SL, generated number_plain verified by dry-run readback; no child writes, no deletes, no merges, no unsupported cleanup. Dry-run proof: 3a1838d7473cad446d9d6ec03a7b5fb2179771bf37c01b94fdc8dc68aef66dae == 3a1838d7473cad446d9d6ec03a7b5fb2179771bf37c01b94fdc8dc68aef66dae. No global apply. No migrations.';

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

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function validatePrerequisites({ gate, dryRun, targets }) {
  const findings = [];
  if (gate.required_operator_decision?.exact_approval_phrase_required !== APPROVAL_TEXT) findings.push('real_apply_gate_approval_text_mismatch');
  if (gate.approval_gate_status !== 'ready_for_real_apply_operator_decision_apply_blocked_no_write') findings.push('real_apply_gate_not_ready');
  if (gate.package_scope?.package_id !== PACKAGE_ID) findings.push('real_apply_gate_wrong_package');
  if (gate.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('real_apply_gate_fingerprint_mismatch');
  if ((gate.stop_findings ?? []).length !== 0) findings.push('real_apply_gate_stop_findings_present');
  if (gate.apply_allowed !== false || gate.write_ready_now !== 0) findings.push('real_apply_gate_unexpected_write_ready');
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.dry_run_status !== 'pkg08n_parent_identity_backfill_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (dryRun.before_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH || dryRun.after_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_durable_state_not_proven_unchanged');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.recommended_real_apply_approval_text !== APPROVAL_TEXT) findings.push('dry_run_approval_text_mismatch');
  if (targets.length !== 6) findings.push('target_count_not_6');
  if (targets.some((row) => row.set_key !== 'col1' || row.set_code !== 'col1')) findings.push('non_col1_target_present');
  if (targets.some((row) => row.finish_key !== 'normal')) findings.push('non_normal_target_present');
  if (targets.some((row) => !/^SL[0-9]+$/.test(row.card_number))) findings.push('non_sl_target_present');
  if (targets.some((row) => row.target_printed_identity_modifier !== 'number_prefix:SL')) findings.push('non_sl_modifier_target_present');
  return findings;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         set_id uuid,
         set_code text,
         card_number text,
         expected_number_plain text,
         target_printed_identity_modifier text,
         card_name text,
         finish_key text,
         tcgdex_external_id text
       )
     )
     select
       'parent' as row_type,
       cp.id::text as row_id,
       cp.set_id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name,
       null::text as finish_key,
       null::text as external_id,
       null::text as identity_set_code,
       null::text as identity_number,
       null::text as identity_name
     from target t
     join public.card_prints cp on cp.id = t.card_print_id
     union all
     select
       'child' as row_type,
       cpr.id::text as row_id,
       cp.set_id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name,
       cpr.finish_key,
       null::text as external_id,
       null::text as identity_set_code,
       null::text as identity_number,
       null::text as identity_name
     from target t
     join public.card_printings cpr on cpr.card_print_id = t.card_print_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'tcgdex_mapping' as row_type,
       em.id::text as row_id,
       null::text as set_id,
       null::text as set_code,
       null::text as number,
       null::text as number_plain,
       null::text as printed_identity_modifier,
       null::text as name,
       null::text as finish_key,
       em.external_id,
       null::text as identity_set_code,
       null::text as identity_number,
       null::text as identity_name
     from target t
     join public.external_mappings em
       on em.card_print_id = t.card_print_id
      and em.source = 'tcgdex'
      and em.external_id = t.tcgdex_external_id
     union all
     select
       'active_identity' as row_type,
       cpi.id::text as row_id,
       null::text as set_id,
       null::text as set_code,
       null::text as number,
       null::text as number_plain,
       null::text as printed_identity_modifier,
       null::text as name,
       null::text as finish_key,
       null::text as external_id,
       cpi.set_code_identity,
       cpi.printed_number,
       cpi.normalized_printed_name
     from target t
     join public.card_print_identity cpi
       on cpi.card_print_id = t.card_print_id
      and cpi.is_active = true
     order by row_type, set_code nulls last, number nulls last, name nulls last, finish_key nulls last, external_id nulls last, row_id`,
    [JSON.stringify(targets)],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      parent_rows: rows.filter((row) => row.row_type === 'parent').length,
      child_rows: rows.filter((row) => row.row_type === 'child').length,
      tcgdex_mapping_rows: rows.filter((row) => row.row_type === 'tcgdex_mapping').length,
      active_identity_rows: rows.filter((row) => row.row_type === 'active_identity').length,
      total_rows: rows.length,
    },
  };
}

async function captureUpdatedRows(client, targets) {
  const ids = targets.map((row) => row.card_print_id);
  const result = await client.query(
    `select
       cp.id::text as card_print_id,
       cp.set_id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name,
       coalesce((select jsonb_agg(cpr.finish_key order by cpr.finish_key) from public.card_printings cpr where cpr.card_print_id = cp.id), '[]'::jsonb) as child_finishes,
       coalesce((select jsonb_agg(em.external_id order by em.external_id) from public.external_mappings em where em.card_print_id = cp.id and em.source = 'tcgdex'), '[]'::jsonb) as tcgdex_external_ids
     from public.card_prints cp
     where cp.id = any($1::uuid[])
     order by cp.number, cp.name, cp.id`,
    [ids],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      parent_rows_found: result.rows.length,
      by_set: countBy(result.rows, (row) => row.set_code),
      by_modifier: countBy(result.rows, (row) => row.printed_identity_modifier),
    },
  };
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  const beforeFindings = [];
  if (beforeSnapshot.counts.parent_rows !== 6) beforeFindings.push('before_parent_rows_not_6');
  if (beforeSnapshot.counts.child_rows !== 18) beforeFindings.push('before_child_rows_not_18');
  if (beforeSnapshot.counts.tcgdex_mapping_rows !== 6) beforeFindings.push('before_tcgdex_mapping_rows_not_6');
  if (beforeSnapshot.counts.active_identity_rows !== 6) beforeFindings.push('before_active_identity_rows_not_6');
  const beforeParents = beforeSnapshot.rows.filter((row) => row.row_type === 'parent');
  if (beforeParents.some((row) => row.set_code !== null || row.number !== null || row.number_plain !== null || row.printed_identity_modifier !== null)) {
    beforeFindings.push('before_parent_identity_fields_not_blank');
  }
  if (beforeFindings.length !== 0) {
    return {
      apply_status: 'blocked_before_snapshot_findings_present',
      error_message: beforeFindings.join(', '),
      before_snapshot: beforeSnapshot,
      after_snapshot: beforeSnapshot,
      updated_rows: null,
      committed: false,
      write_counts: {},
    };
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg08n_targets (
         card_print_id uuid primary key,
         set_id uuid not null,
         set_code text not null,
         card_number text not null,
         expected_number_plain text not null,
         target_printed_identity_modifier text not null,
         card_name text not null,
         finish_key text not null,
         tcgdex_external_id text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg08n_targets
       select
         row.card_print_id::uuid,
         row.set_id::uuid,
         row.set_code,
         row.card_number,
         row.expected_number_plain,
         row.target_printed_identity_modifier,
         row.card_name,
         row.finish_key,
         row.tcgdex_external_id
       from jsonb_to_recordset($1::jsonb) as row(
         card_print_id text,
         set_id text,
         set_code text,
         card_number text,
         expected_number_plain text,
         target_printed_identity_modifier text,
         card_name text,
         finish_key text,
         tcgdex_external_id text
       )`,
      [JSON.stringify(targets)],
    );
    const guard = await client.query(
      `select
         (select count(*)::int from pkg08n_targets) as target_rows,
         (select count(*)::int from pkg08n_targets where set_code = 'col1' and finish_key = 'normal' and card_number ~ '^SL[0-9]+$' and target_printed_identity_modifier = 'number_prefix:SL') as valid_shape_rows,
         (select count(*)::int
          from pkg08n_targets t
          join public.card_prints cp
            on cp.id <> t.card_print_id
           and cp.set_id = t.set_id
           and coalesce(cp.number_plain, '') = t.expected_number_plain
           and coalesce(cp.printed_identity_modifier, '') = t.target_printed_identity_modifier
           and coalesce(cp.variant_key, '') = ''
           and cp.set_identity_model = 'standard') as final_identity_collisions,
         (select count(*)::int
          from pkg08n_targets t
          join public.card_printings cpr on cpr.card_print_id = t.card_print_id and cpr.finish_key = t.finish_key) as target_child_rows,
         (select count(*)::int
          from pkg08n_targets t
          join public.external_mappings em on em.card_print_id = t.card_print_id and em.source = 'tcgdex' and em.external_id = t.tcgdex_external_id) as target_mapping_rows,
         (select count(*)::int
          from pkg08n_targets t
          join public.card_print_identity cpi
            on cpi.card_print_id = t.card_print_id
           and cpi.is_active = true
           and cpi.set_code_identity = t.set_code
           and cpi.printed_number = t.card_number
           and cpi.normalized_printed_name = lower(t.card_name)) as target_identity_rows`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_rows !== 6 ||
      guardRow.valid_shape_rows !== 6 ||
      guardRow.final_identity_collisions !== 0 ||
      guardRow.target_child_rows !== 6 ||
      guardRow.target_mapping_rows !== 6 ||
      guardRow.target_identity_rows !== 6
    ) {
      throw new Error(`apply guard failed: ${JSON.stringify(guardRow)}`);
    }
    const updateResult = await client.query(
      `update public.card_prints cp
       set set_id = t.set_id,
           set_code = t.set_code,
           number = t.card_number,
           printed_identity_modifier = t.target_printed_identity_modifier
       from pkg08n_targets t
       where cp.id = t.card_print_id
         and cp.name = t.card_name
         and coalesce(cp.set_code, '') = ''
         and coalesce(cp.number, '') = ''
         and cp.printed_identity_modifier is null
       returning cp.id::text as card_print_id, cp.set_code, cp.number, cp.number_plain, cp.printed_identity_modifier`,
    );
    if (updateResult.rowCount !== 6) {
      throw new Error(`update count mismatch: ${updateResult.rowCount}`);
    }
    const readback = await client.query(
      `select count(*)::int as matching_readback_rows
       from pkg08n_targets t
       join public.card_prints cp on cp.id = t.card_print_id
       where cp.set_id = t.set_id
         and cp.set_code = t.set_code
         and cp.number = t.card_number
         and cp.number_plain = t.expected_number_plain
         and cp.printed_identity_modifier = t.target_printed_identity_modifier`,
    );
    if (readback.rows[0].matching_readback_rows !== 6) {
      throw new Error(`readback mismatch: ${readback.rows[0].matching_readback_rows}`);
    }
    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    const updatedRows = await captureUpdatedRows(client, targets);
    return {
      apply_status: 'pkg08n_parent_identity_backfill_real_apply_committed',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      updated_rows: updatedRows,
      committed: true,
      write_counts: {
        parent_rows_updated: updateResult.rowCount,
        child_rows_written: 0,
        delete_rows: 0,
      },
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => beforeSnapshot);
    return {
      apply_status: 'pkg08n_parent_identity_backfill_real_apply_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      updated_rows: null,
      committed: false,
      write_counts: {},
    };
  }
}

function validateAfter({ afterSnapshot, updatedRows }) {
  const findings = [];
  if (afterSnapshot.counts.parent_rows !== 6) findings.push('after_parent_rows_not_6');
  if (afterSnapshot.counts.child_rows !== 18) findings.push('after_child_rows_not_18');
  if (afterSnapshot.counts.tcgdex_mapping_rows !== 6) findings.push('after_tcgdex_mapping_rows_not_6');
  if (afterSnapshot.counts.active_identity_rows !== 6) findings.push('after_active_identity_rows_not_6');
  const parents = afterSnapshot.rows.filter((row) => row.row_type === 'parent');
  if (parents.some((row) => row.set_code !== 'col1')) findings.push('after_parent_set_code_not_col1');
  if (parents.some((row) => !/^SL[0-9]+$/.test(row.number ?? ''))) findings.push('after_parent_number_not_sl');
  if (parents.some((row) => row.printed_identity_modifier !== 'number_prefix:SL')) findings.push('after_parent_modifier_not_sl');
  if (updatedRows.counts.parent_rows_found !== 6) findings.push('updated_parent_rows_not_6');
  if (updatedRows.counts.by_set.col1 !== 6) findings.push('updated_col1_rows_not_6');
  if (updatedRows.counts.by_modifier['number_prefix:SL'] !== 6) findings.push('updated_sl_modifier_rows_not_6');
  return findings;
}

function renderMarkdown(report) {
  const rows = (report.updated_rows?.rows ?? []).map((row) => [
    row.set_code,
    row.number,
    row.number_plain,
    row.printed_identity_modifier,
    row.name,
    row.card_print_id,
  ]);
  return `# PKG-08N Parent Identity Backfill Real Apply V1

Real apply for the approved Call of Legends SL parent identity backfill package.

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_id | ${report.package_id} |
| package_fingerprint_sha256 | \`${report.package_fingerprint_sha256}\` |
| committed | ${report.committed} |
| parent_rows_updated | ${report.write_counts.parent_rows_updated ?? 0} |
| child_rows_written | ${report.write_counts.child_rows_written ?? 0} |
| delete_rows | ${report.write_counts.delete_rows ?? 0} |
| migrations_created | ${report.migrations_created} |
| unsupported_cleanup_performed | ${report.unsupported_cleanup_performed} |
| stop_findings | ${report.stop_findings.length} |

${markdownTable(['set', 'number', 'number_plain', 'modifier', 'card', 'parent'], rows)}

## Safety Boundary

- Only parent identity fields were updated.
- No child writes, deletes, merges, unsupported cleanup, migrations, or global apply were performed.
- printed_identity_modifier=number_prefix:SL keeps SL cards distinct from numeric Call of Legends checklist cards.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08N Parent Identity Backfill Real Apply Checkpoint V1](20260610_pkg08n_parent_identity_backfill_real_apply_checkpoint_v1.md) | Applied 6 col1 SL parent field updates with number_prefix:SL. No child writes, deletes, cleanup, migrations, or global apply. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08n_parent_identity_backfill_real_apply_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08n_parent_identity_backfill_real_apply_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const gate = readJson(GATE_JSON);
const dryRun = readJson(DRY_RUN_JSON);
const targets = dryRun.scope?.target_rows ?? [];
const prerequisiteFindings = validatePrerequisites({ gate, dryRun, targets });
let applyResult = {
  apply_status: 'blocked_prerequisite_findings_present',
  error_message: prerequisiteFindings.join(', '),
  before_snapshot: null,
  after_snapshot: null,
  updated_rows: null,
  committed: false,
  write_counts: {},
};

if (prerequisiteFindings.length === 0) {
  const conn = connectionString();
  if (!conn) {
    applyResult = {
      apply_status: 'blocked_no_database_connection_string',
      error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      before_snapshot: null,
      after_snapshot: null,
      updated_rows: null,
      committed: false,
      write_counts: {},
    };
  } else {
    const client = new Client({ connectionString: conn });
    await client.connect();
    try {
      applyResult = await applyPackage(client, targets);
    } finally {
      await client.end().catch(() => {});
    }
  }
}

const afterFindings = applyResult.committed
  ? validateAfter({ afterSnapshot: applyResult.after_snapshot, updatedRows: applyResult.updated_rows })
  : [];
const stopFindings = [...prerequisiteFindings, ...afterFindings];
if (applyResult.error_message) stopFindings.push(`apply_error:${applyResult.error_message}`);
if (applyResult.committed !== true) stopFindings.push('apply_not_committed');

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08n_parent_identity_backfill_real_apply_v1',
  package_id: PACKAGE_ID,
  package_fingerprint_sha256: PACKAGE_FINGERPRINT,
  approval_text: APPROVAL_TEXT,
  apply_status: applyResult.apply_status,
  committed: applyResult.committed,
  db_writes_performed: applyResult.committed,
  durable_db_writes_performed: applyResult.committed,
  migrations_created: false,
  deletes_performed: false,
  merges_performed: false,
  unsupported_cleanup_performed: false,
  quarantine_performed: false,
  global_apply_performed: false,
  write_counts: applyResult.write_counts,
  before_snapshot: applyResult.before_snapshot,
  after_snapshot: applyResult.after_snapshot,
  updated_rows: applyResult.updated_rows,
  stop_findings: stopFindings,
  pass: applyResult.committed === true && stopFindings.length === 0,
};

writeJson(OUTPUT_JSON, report);
writeText(OUTPUT_MD, renderMarkdown(report));
writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  checkpoint_md: CHECKPOINT_MD,
  apply_status: report.apply_status,
  committed: report.committed,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  write_counts: report.write_counts,
  updated_counts: report.updated_rows?.counts ?? null,
  stop_findings: report.stop_findings,
  migrations_created: report.migrations_created,
  deletes_performed: report.deletes_performed,
  unsupported_cleanup_performed: report.unsupported_cleanup_performed,
}, null, 2));

if (!report.pass) process.exitCode = 1;
