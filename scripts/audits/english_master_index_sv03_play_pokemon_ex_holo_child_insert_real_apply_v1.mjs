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

const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_sv03_play_pokemon_ex_holo_child_insert_real_apply_gate_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_sv03_play_pokemon_ex_holo_child_insert_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_sv03_play_pokemon_ex_holo_child_insert_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_sv03_play_pokemon_ex_holo_child_insert_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260612_sv03_play_pokemon_ex_holo_child_insert_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'SV03-PLAY-POKEMON-EX-HOLO-CHILD-INSERT';
const PACKAGE_FINGERPRINT = 'b33838c9f31d9b693bf8be33940c814cfe31fb78335dd87b18ec67864b8a13db';
const DRY_RUN_PROOF_HASH = '7e67b633de699c6bde73b95abf7484aa801ac59c573d5bbee7739247dca95a35';
const APPROVAL_TEXT = 'Approve real SV03-PLAY-POKEMON-EX-HOLO-CHILD-INSERT apply only. Fingerprint: b33838c9f31d9b693bf8be33940c814cfe31fb78335dd87b18ec67864b8a13db. Scope: 2 child-only card_printing inserts for sv03/Obsidian Flames Play Pokemon stamped parents Toedscruel ex #22 and Tyranitar ex #66, finish holo; parent writes=0, identity writes=0, deletes=0, merges=0. Dry-run proof: 7e67b633de699c6bde73b95abf7484aa801ac59c573d5bbee7739247dca95a35 == 7e67b633de699c6bde73b95abf7484aa801ac59c573d5bbee7739247dca95a35. No global apply. No migrations. No cleanup. No quarantine.';
const CREATED_BY = 'verified_master_set_index_v1';

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

function validatePrerequisites({ gate, dryRun, targets }) {
  const findings = [];
  if (gate.approval_gate_status !== 'ready_for_real_apply_operator_decision_apply_blocked_no_write') findings.push('real_apply_gate_not_ready');
  if (gate.pass !== true) findings.push('real_apply_gate_not_passed');
  if (gate.package_scope?.package_id !== PACKAGE_ID) findings.push('real_apply_gate_wrong_package');
  if (gate.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('real_apply_gate_fingerprint_mismatch');
  if (gate.required_operator_decision?.exact_approval_phrase_required !== APPROVAL_TEXT) findings.push('real_apply_gate_approval_text_mismatch');
  if ((gate.stop_findings ?? []).length !== 0) findings.push('real_apply_gate_stop_findings_present');
  if (gate.apply_allowed !== false || gate.write_ready_now !== 0) findings.push('real_apply_gate_unexpected_write_ready');

  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.dry_run_status !== 'sv03_play_pokemon_ex_holo_child_insert_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_durable_state_not_proven_unchanged');
  if (dryRun.before_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH || dryRun.after_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.recommended_real_apply_approval_text !== APPROVAL_TEXT) findings.push('dry_run_approval_text_mismatch');
  if (dryRun.summary?.target_rows !== 2) findings.push('target_rows_not_2');
  if (dryRun.summary?.child_inserts_simulated !== 2) findings.push('child_inserts_not_2');
  if (dryRun.summary?.parent_writes_simulated !== 0) findings.push('parent_writes_not_0');
  if (dryRun.summary?.identity_writes_simulated !== 0) findings.push('identity_writes_not_0');
  if (dryRun.summary?.deletes_simulated !== 0) findings.push('deletes_not_0');
  if (dryRun.summary?.merges_simulated !== 0) findings.push('merges_not_0');

  if (targets.length !== 2) findings.push('target_count_not_2');
  if (targets.some((row) => row.set_key !== 'sv03')) findings.push('non_sv03_target_present');
  if (targets.some((row) => !['Toedscruel ex', 'Tyranitar ex'].includes(row.card_name))) findings.push('unexpected_card_target_present');
  if (targets.some((row) => !['22', '66'].includes(row.card_number))) findings.push('unexpected_number_target_present');
  if (targets.some((row) => row.target_variant_key !== 'play_pokemon_stamp')) findings.push('non_play_pokemon_stamp_target_present');
  if (targets.some((row) => row.target_finish_key !== 'holo')) findings.push('non_holo_target_present');
  return findings;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_child_id uuid,
         target_parent_id uuid,
         target_finish_key text
       )
     )
     select
       'target_parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       null::text as finish_key,
       null::text as identity_key_hash
     from target
     join public.card_prints cp on cp.id = target.target_parent_id
     union all
     select
       'target_child' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       cpr.finish_key,
       null::text as identity_key_hash
     from target
     join public.card_printings cpr on cpr.card_print_id = target.target_parent_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'active_identity' as row_type,
       cpi.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       null::text as finish_key,
       cpi.identity_key_hash
     from target
     join public.card_prints cp on cp.id = target.target_parent_id
     join public.card_print_identity cpi on cpi.card_print_id = cp.id and cpi.is_active = true
     order by row_type, set_code nulls last, number_plain nulls last, number nulls last, name nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets)],
  );

  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      target_parent_rows: result.rows.filter((row) => row.row_type === 'target_parent').length,
      target_child_rows: result.rows.filter((row) => row.row_type === 'target_child').length,
      active_identity_rows: result.rows.filter((row) => row.row_type === 'active_identity').length,
      total_rows: result.rows.length,
    },
  };
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  const beforeFindings = [];
  if (beforeSnapshot.hash_sha256 !== DRY_RUN_PROOF_HASH) beforeFindings.push('before_snapshot_hash_does_not_match_dry_run_proof');
  if (beforeSnapshot.counts.target_parent_rows !== 2) beforeFindings.push('before_target_parent_rows_not_2');
  if (beforeSnapshot.counts.target_child_rows !== 0) beforeFindings.push('before_target_child_rows_not_0');
  if (beforeSnapshot.counts.active_identity_rows !== 2) beforeFindings.push('before_active_identity_rows_not_2');
  if (beforeFindings.length !== 0) {
    return {
      apply_status: 'blocked_before_snapshot_findings_present',
      error_message: beforeFindings.join(', '),
      before_snapshot: beforeSnapshot,
      after_snapshot: beforeSnapshot,
      committed: false,
      write_counts: {},
      guard: null,
      proof: null,
      child_insert_rows: [],
    };
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table sv03_play_pokemon_ex_holo_child_targets (
         target_child_id uuid primary key,
         target_parent_id uuid not null,
         set_key text not null,
         set_name text not null,
         card_number text not null,
         source_number_plain text not null,
         card_name text not null,
         target_variant_key text not null,
         target_finish_key text not null,
         evidence_tier text not null,
         source_adjudication_fingerprint text not null,
         evidence_sources jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into sv03_play_pokemon_ex_holo_child_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_child_id uuid,
         target_parent_id uuid,
         set_key text,
         set_name text,
         card_number text,
         source_number_plain text,
         card_name text,
         target_variant_key text,
         target_finish_key text,
         evidence_tier text,
         source_adjudication_fingerprint text,
         evidence_sources jsonb
       )`,
      [JSON.stringify(targets)],
    );

    const guard = await client.query(
      `select
         (select count(*)::int from sv03_play_pokemon_ex_holo_child_targets) as target_count,
         (select count(distinct target_child_id)::int from sv03_play_pokemon_ex_holo_child_targets) as target_child_count,
         (select count(distinct target_parent_id)::int from sv03_play_pokemon_ex_holo_child_targets) as target_parent_count,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets
          where set_key = 'sv03'
            and card_name in ('Toedscruel ex', 'Tyranitar ex')
            and card_number in ('22', '66')
            and target_variant_key = 'play_pokemon_stamp'
            and target_finish_key = 'holo'
            and evidence_tier = 'accepted_exact_multi_source_holo') as exact_shape_count,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets target
          join public.card_prints cp on cp.id = target.target_parent_id
          where cp.set_code <> 'sv03'
             or cp.name <> target.card_name
             or coalesce(nullif(ltrim(coalesce(cp.number_plain, cp.number), '0'), ''), '0') <> target.source_number_plain
             or cp.variant_key <> target.target_variant_key
             or cp.printed_identity_modifier <> target.target_variant_key) as parent_mismatch_count,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets target
          left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true
          where fk.key is null) as inactive_finish_count,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets target
          join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true) as active_identity_count,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets target
          join public.card_printings cpr on cpr.id = target.target_child_id) as child_id_collision_count,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets target
          join public.card_printings cpr on cpr.card_print_id = target.target_parent_id and cpr.finish_key = target.target_finish_key) as target_finish_collision_count,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets target
          join public.card_printings cpr on cpr.card_print_id = target.target_parent_id and cpr.finish_key = 'stamped') as forbidden_stamped_child_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== 2 ||
      guardRow.target_child_count !== 2 ||
      guardRow.target_parent_count !== 2 ||
      guardRow.exact_shape_count !== 2 ||
      guardRow.parent_mismatch_count !== 0 ||
      guardRow.inactive_finish_count !== 0 ||
      guardRow.active_identity_count !== 2 ||
      guardRow.child_id_collision_count !== 0 ||
      guardRow.target_finish_collision_count !== 0 ||
      guardRow.forbidden_stamped_child_count !== 0
    ) {
      throw new Error(`apply guard failed: ${JSON.stringify(guardRow)}`);
    }

    const childInsert = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, created_at, is_provisional, provenance_source, provenance_ref, created_by,
         printing_gv_id, image_source, image_path, image_url, image_alt_url, image_status, image_note
       )
       select
         target.target_child_id,
         target.target_parent_id,
         target.target_finish_key,
         now(),
         false,
         'verified_master_set_index_v1',
         concat(target.set_key, ':', target.card_number, ':existing_stamped_parent:', target.target_variant_key, ':', target.target_finish_key),
         $1::text,
         null, null, null, null, null,
         'representative_shared_stamp',
         concat('Existing Play Pokemon stamped parent child finish inserted from exact multi-source reviewed evidence: ', target.target_finish_key)
       from sv03_play_pokemon_ex_holo_child_targets target
       returning id::text as child_printing_id, card_print_id::text, finish_key`,
      [CREATED_BY],
    );
    if (childInsert.rowCount !== 2) throw new Error(`child insert count mismatch: ${childInsert.rowCount}`);

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from sv03_play_pokemon_ex_holo_child_targets) as target_rows,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets target
          join public.card_printings cpr on cpr.id = target.target_child_id and cpr.card_print_id = target.target_parent_id and cpr.finish_key = target.target_finish_key) as inserted_child_rows,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets target
          join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true) as active_identity_rows,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets target
          join public.card_printings cpr on cpr.card_print_id = target.target_parent_id and cpr.finish_key = 'stamped') as forbidden_stamped_child_rows`,
      [PACKAGE_ID, PACKAGE_FINGERPRINT],
    );
    const proofRow = proof.rows[0];
    if (
      proofRow.target_rows !== 2 ||
      proofRow.inserted_child_rows !== 2 ||
      proofRow.active_identity_rows !== 2 ||
      proofRow.forbidden_stamped_child_rows !== 0
    ) {
      throw new Error(`proof mismatch: ${JSON.stringify(proofRow)}`);
    }

    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      apply_status: 'sv03_play_pokemon_ex_holo_child_insert_real_apply_committed',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      committed: true,
      write_counts: {
        child_rows_inserted: childInsert.rowCount,
        parent_rows_written: 0,
        identity_rows_written: 0,
        delete_rows: 0,
        merge_rows: 0,
      },
      guard: guardRow,
      proof: proofRow,
      child_insert_rows: childInsert.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => beforeSnapshot);
    return {
      apply_status: 'sv03_play_pokemon_ex_holo_child_insert_real_apply_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      committed: false,
      write_counts: {},
      guard: null,
      proof: null,
      child_insert_rows: [],
    };
  }
}

function validateAfter(applyResult) {
  const findings = [];
  if (applyResult.committed !== true) findings.push('apply_not_committed');
  if (applyResult.write_counts.child_rows_inserted !== 2) findings.push('child_rows_inserted_not_2');
  if (applyResult.write_counts.parent_rows_written !== 0) findings.push('parent_rows_written_not_0');
  if (applyResult.write_counts.identity_rows_written !== 0) findings.push('identity_rows_written_not_0');
  if (applyResult.write_counts.delete_rows !== 0) findings.push('delete_rows_not_0');
  if (applyResult.after_snapshot.counts.target_parent_rows !== 2) findings.push('after_target_parent_rows_not_2');
  if (applyResult.after_snapshot.counts.target_child_rows !== 2) findings.push('after_target_child_rows_not_2');
  if (applyResult.after_snapshot.counts.active_identity_rows !== 2) findings.push('after_active_identity_rows_not_2');
  const childRows = applyResult.after_snapshot.rows.filter((row) => row.row_type === 'target_child');
  if (childRows.some((row) => row.finish_key !== 'holo')) findings.push('after_child_finish_not_holo');
  if (childRows.some((row) => row.finish_key === 'stamped')) findings.push('forbidden_stamped_child_finish_present');
  return findings;
}

function renderMarkdown(report) {
  return `# SV03 Play Pokemon ex Holo Child Insert Real Apply V1

Real apply for two child-only Play Pokemon stamped ex holo printing inserts.

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_id | ${report.package_id} |
| package_fingerprint_sha256 | \`${report.package_fingerprint_sha256}\` |
| committed | ${report.committed} |
| child_rows_inserted | ${report.write_counts.child_rows_inserted ?? 0} |
| parent_rows_written | ${report.write_counts.parent_rows_written ?? 0} |
| identity_rows_written | ${report.write_counts.identity_rows_written ?? 0} |
| delete_rows | ${report.write_counts.delete_rows ?? 0} |
| merge_rows | ${report.write_counts.merge_rows ?? 0} |
| migrations_created | ${report.migrations_created} |
| cleanup_performed | ${report.cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| stop_findings | ${report.stop_findings.length} |

${markdownTable(['child_printing_id', 'card_print_id', 'finish'], (report.child_insert_rows ?? []).map((row) => [
  row.child_printing_id,
  row.card_print_id,
  row.finish_key,
]))}

## Safety Boundary

- Only two child printings were inserted.
- No parent rows were updated.
- No identity rows were inserted or updated.
- No deletes, merges, unsupported cleanup, quarantine, migrations, or global apply were performed.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-12 | [SV03 Play Pokemon ex Holo Child Insert Real Apply Checkpoint V1](20260612_sv03_play_pokemon_ex_holo_child_insert_real_apply_checkpoint_v1.md) | Applied Toedscruel ex and Tyranitar ex Play Pokemon stamped holo child inserts. No parent writes, identity writes, deletes, cleanup, quarantine, migrations, or global apply. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260612_sv03_play_pokemon_ex_holo_child_insert_real_apply_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260612_sv03_play_pokemon_ex_holo_child_insert_real_apply_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const gate = readJson(GATE_JSON);
const dryRun = readJson(DRY_RUN_JSON);
const targets = dryRun.targets ?? [];
const prerequisiteFindings = validatePrerequisites({ gate, dryRun, targets });
let applyResult = {
  apply_status: 'blocked_prerequisite_findings_present',
  error_message: prerequisiteFindings.join(', '),
  before_snapshot: null,
  after_snapshot: null,
  committed: false,
  write_counts: {},
  guard: null,
  proof: null,
  child_insert_rows: [],
};
let stopFindings = [...prerequisiteFindings];

if (prerequisiteFindings.length === 0) {
  const conn = connectionString();
  if (!conn) {
    stopFindings.push('missing_database_connection_string');
  } else {
    const client = new Client({ connectionString: conn });
    await client.connect();
    try {
      applyResult = await applyPackage(client, targets);
    } finally {
      await client.end();
    }
    if (applyResult.error_message) stopFindings.push(applyResult.error_message);
    if (applyResult.committed) stopFindings.push(...validateAfter(applyResult));
  }
}

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_sv03_play_pokemon_ex_holo_child_insert_real_apply_v1',
  package_id: PACKAGE_ID,
  package_fingerprint_sha256: PACKAGE_FINGERPRINT,
  source_adjudication_fingerprint: dryRun.source_adjudication_fingerprint,
  approval_text_required: APPROVAL_TEXT,
  apply_status: applyResult.apply_status,
  committed: applyResult.committed,
  db_writes_performed: applyResult.committed,
  durable_db_writes_performed: applyResult.committed,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  global_apply_performed: false,
  parent_writes_performed: false,
  identity_writes_performed: false,
  deletes_performed: false,
  merges_performed: false,
  write_counts: applyResult.write_counts,
  guard: applyResult.guard,
  proof: applyResult.proof,
  before_snapshot: applyResult.before_snapshot,
  after_snapshot: applyResult.after_snapshot,
  child_insert_rows: applyResult.child_insert_rows,
  stop_findings: stopFindings,
  source_artifacts: {
    real_apply_gate: path.relative(ROOT, GATE_JSON).replaceAll('\\', '/'),
    guarded_dry_run_execution: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
  },
};

writeJson(OUTPUT_JSON, report);
writeText(OUTPUT_MD, renderMarkdown(report));
if (report.committed) {
  writeText(CHECKPOINT_MD, renderMarkdown(report));
  updateCheckpointIndex();
}

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON),
  output_md: path.relative(ROOT, OUTPUT_MD),
  checkpoint_md: report.committed ? path.relative(ROOT, CHECKPOINT_MD) : null,
  apply_status: report.apply_status,
  committed: report.committed,
  package_fingerprint_sha256: PACKAGE_FINGERPRINT,
  write_counts: report.write_counts,
  stop_findings: report.stop_findings,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
}, null, 2));

if (!report.committed || stopFindings.length !== 0) process.exitCode = 1;
