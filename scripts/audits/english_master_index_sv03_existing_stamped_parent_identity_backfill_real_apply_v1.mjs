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

const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_sv03_existing_stamped_parent_identity_backfill_real_apply_gate_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_sv03_existing_stamped_parent_identity_backfill_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_sv03_existing_stamped_parent_identity_backfill_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_sv03_existing_stamped_parent_identity_backfill_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260612_sv03_existing_stamped_parent_identity_backfill_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'SV03-EXISTING-STAMPED-PARENT-IDENTITY-BACKFILL';
const PACKAGE_FINGERPRINT = '0481ed86bac219a6b2f8c150610c8bce59d8f4352b950874119f911148c7ab8f';
const DRY_RUN_PROOF_HASH = 'd5a110f24a7ef099b8470d3c7697cf098b49ae0fc860fdad43ecd90c80fd7e2f';
const APPROVAL_TEXT = 'Approve real SV03-EXISTING-STAMPED-PARENT-IDENTITY-BACKFILL apply only. Fingerprint: 0481ed86bac219a6b2f8c150610c8bce59d8f4352b950874119f911148c7ab8f. Scope: 3 existing SV03 stamped parent identity backfills, 3 parent printed_identity_modifier updates, 3 active card_print_identity inserts, 0 child inserts, 0 deletes, 0 merges. Dry-run proof: d5a110f24a7ef099b8470d3c7697cf098b49ae0fc860fdad43ecd90c80fd7e2f == d5a110f24a7ef099b8470d3c7697cf098b49ae0fc860fdad43ecd90c80fd7e2f. No global apply. No migrations. No cleanup. No quarantine.';

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
  if (gate.approval_gate_status !== 'ready_for_real_apply_operator_decision_apply_blocked_no_write') {
    findings.push('real_apply_gate_not_ready');
  }
  if (gate.pass !== true) findings.push('real_apply_gate_not_passed');
  if (gate.package_scope?.package_id !== PACKAGE_ID) findings.push('real_apply_gate_wrong_package');
  if (gate.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('real_apply_gate_fingerprint_mismatch');
  if (gate.required_operator_decision?.exact_approval_phrase_required !== APPROVAL_TEXT) findings.push('real_apply_gate_approval_text_mismatch');
  if ((gate.stop_findings ?? []).length !== 0) findings.push('real_apply_gate_stop_findings_present');
  if (gate.apply_allowed !== false || gate.write_ready_now !== 0) findings.push('real_apply_gate_unexpected_write_ready');

  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.dry_run_status !== 'sv03_existing_stamped_parent_identity_backfill_completed_rolled_back_no_durable_change') {
    findings.push('dry_run_not_passed');
  }
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_durable_state_not_proven_unchanged');
  if (dryRun.before_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH || dryRun.after_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) {
    findings.push('dry_run_proof_hash_mismatch');
  }
  if (dryRun.recommended_real_apply_approval_text !== APPROVAL_TEXT) findings.push('dry_run_approval_text_mismatch');
  if (dryRun.summary?.target_rows !== 3) findings.push('target_rows_not_3');
  if (dryRun.summary?.parent_updates_simulated !== 3) findings.push('parent_updates_not_3');
  if (dryRun.summary?.identity_inserts_simulated !== 3) findings.push('identity_inserts_not_3');
  if (dryRun.summary?.child_inserts_simulated !== 0) findings.push('child_inserts_not_0');
  if (dryRun.verification?.child_rows_after_identity_backfill !== 0) findings.push('dry_run_child_rows_changed');

  if (targets.length !== 3) findings.push('target_count_not_3');
  if (targets.some((row) => row.set_key !== 'sv03')) findings.push('non_sv03_target_present');
  if (targets.some((row) => row.target_variant_key !== 'play_pokemon_stamp')) findings.push('non_play_pokemon_stamp_target_present');
  if (targets.some((row) => !row.card_print_id)) findings.push('target_missing_parent_id');
  return findings;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         target_variant_key text,
         target_finish_key text
       )
     )
     select
       'parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       null::text as finish_key,
       null::text as identity_domain,
       null::text as set_code_identity,
       null::text as printed_number,
       null::text as normalized_printed_name,
       null::text as identity_key_version,
       null::text as identity_key_hash
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     union all
     select
       'child' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       cpr.finish_key,
       null::text as identity_domain,
       null::text as set_code_identity,
       null::text as printed_number,
       null::text as normalized_printed_name,
       null::text as identity_key_version,
       null::text as identity_key_hash
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     join public.card_printings cpr on cpr.card_print_id = cp.id
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
       cpi.identity_domain,
       cpi.set_code_identity,
       cpi.printed_number,
       cpi.normalized_printed_name,
       cpi.identity_key_version,
       cpi.identity_key_hash
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     join public.card_print_identity cpi on cpi.card_print_id = cp.id and cpi.is_active = true
     order by row_type, set_code nulls last, number_plain nulls last, number nulls last, name nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets)],
  );

  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      parent_rows: result.rows.filter((row) => row.row_type === 'parent').length,
      child_rows: result.rows.filter((row) => row.row_type === 'child').length,
      active_identity_rows: result.rows.filter((row) => row.row_type === 'active_identity').length,
      total_rows: result.rows.length,
    },
  };
}

async function captureUpdatedRows(client, targets) {
  const ids = targets.map((row) => row.card_print_id);
  const result = await client.query(
    `select
       cp.id::text as card_print_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       coalesce((select jsonb_agg(cpr.finish_key order by cpr.finish_key) from public.card_printings cpr where cpr.card_print_id = cp.id), '[]'::jsonb) as child_finishes,
       coalesce((
         select jsonb_agg(jsonb_build_object(
           'identity_domain', cpi.identity_domain,
           'set_code_identity', cpi.set_code_identity,
           'printed_number', cpi.printed_number,
           'normalized_printed_name', cpi.normalized_printed_name,
           'identity_key_version', cpi.identity_key_version,
           'identity_key_hash', cpi.identity_key_hash
         ) order by cpi.id)
         from public.card_print_identity cpi
         where cpi.card_print_id = cp.id
           and cpi.is_active = true
       ), '[]'::jsonb) as active_identities
     from public.card_prints cp
     where cp.id = any($1::uuid[])
     order by cp.number_plain, cp.number, cp.name, cp.id`,
    [ids],
  );

  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      parent_rows_found: result.rows.length,
      by_set: countBy(result.rows, (row) => row.set_code),
      by_variant: countBy(result.rows, (row) => row.variant_key),
      by_modifier: countBy(result.rows, (row) => row.printed_identity_modifier),
    },
  };
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  const beforeFindings = [];
  if (beforeSnapshot.hash_sha256 !== DRY_RUN_PROOF_HASH) beforeFindings.push('before_snapshot_hash_does_not_match_dry_run_proof');
  if (beforeSnapshot.counts.parent_rows !== 3) beforeFindings.push('before_parent_rows_not_3');
  if (beforeSnapshot.counts.child_rows !== 0) beforeFindings.push('before_child_rows_not_0');
  if (beforeSnapshot.counts.active_identity_rows !== 0) beforeFindings.push('before_active_identity_rows_not_0');
  const beforeParents = beforeSnapshot.rows.filter((row) => row.row_type === 'parent');
  if (beforeParents.some((row) => row.set_code !== 'sv03')) beforeFindings.push('before_non_sv03_parent_present');
  if (beforeParents.some((row) => row.variant_key !== 'play_pokemon_stamp')) beforeFindings.push('before_non_play_pokemon_parent_present');
  if (beforeParents.some((row) => row.printed_identity_modifier !== null)) beforeFindings.push('before_parent_modifier_already_set');

  if (beforeFindings.length !== 0) {
    return {
      apply_status: 'blocked_before_snapshot_findings_present',
      error_message: beforeFindings.join(', '),
      before_snapshot: beforeSnapshot,
      after_snapshot: beforeSnapshot,
      updated_rows: null,
      committed: false,
      write_counts: {},
      guard: null,
      proof: null,
    };
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table sv03_existing_stamped_identity_targets (
         card_print_id uuid primary key,
         set_key text not null,
         set_name text not null,
         card_number text not null,
         source_number_plain text not null,
         card_name text not null,
         target_variant_key text not null,
         target_finish_key text not null,
         evidence_tier text not null,
         child_action_status text not null,
         projected_identity_key_hash text not null,
         source_readiness_fingerprint text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into sv03_existing_stamped_identity_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         set_key text,
         set_name text,
         card_number text,
         source_number_plain text,
         card_name text,
         target_variant_key text,
         target_finish_key text,
         evidence_tier text,
         child_action_status text,
         projected_identity_key_hash text,
         source_readiness_fingerprint text
       )`,
      [JSON.stringify(targets)],
    );

    const guard = await client.query(
      `with projection as (
         select
           target.card_print_id,
           public.card_print_identity_backfill_projection_v1(
             s.source,
             cp.set_code,
             s.code,
             cp.number,
             cp.number_plain,
             cp.name,
             cp.variant_key,
             coalesce(cp.printed_total, s.printed_total),
             coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from sv03_existing_stamped_identity_targets target
         join public.card_prints cp on cp.id = target.card_print_id
         left join public.sets s on s.id = cp.set_id
       )
       select
         (select count(*)::int from sv03_existing_stamped_identity_targets) as target_count,
         (select count(distinct card_print_id)::int from sv03_existing_stamped_identity_targets) as target_parent_count,
         (select count(*)::int from sv03_existing_stamped_identity_targets where set_key <> 'sv03') as non_sv03_target_count,
         (select count(*)::int from sv03_existing_stamped_identity_targets target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_parent_count,
         (select count(*)::int
          from sv03_existing_stamped_identity_targets target
          join public.card_prints cp on cp.id = target.card_print_id
          where cp.variant_key is distinct from target.target_variant_key) as variant_mismatch_count,
         (select count(*)::int
          from sv03_existing_stamped_identity_targets target
          join public.card_prints cp on cp.id = target.card_print_id
          where cp.printed_identity_modifier is not null) as modifier_already_set_count,
         (select count(*)::int
          from sv03_existing_stamped_identity_targets target
          join public.card_print_identity cpi on cpi.card_print_id = target.card_print_id and cpi.is_active = true) as active_identity_collision_count,
         (select count(*)::int from projection where projected->>'status' = 'ready') as ready_projection_count,
         (select count(*)::int
          from projection p
          join public.card_print_identity cpi
            on cpi.is_active = true
           and cpi.card_print_id <> p.card_print_id
           and cpi.identity_domain = p.projected->>'identity_domain'
           and cpi.identity_key_version = p.projected->>'identity_key_version'
           and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collision_count,
         (select count(*)::int
          from sv03_existing_stamped_identity_targets target
          join public.card_printings cpr on cpr.card_print_id = target.card_print_id) as existing_child_rows,
         (select count(*)::int
          from sv03_existing_stamped_identity_targets target
          join public.card_printings cpr on cpr.card_print_id = target.card_print_id and cpr.finish_key = 'stamped') as forbidden_stamped_child_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== 3 ||
      guardRow.target_parent_count !== 3 ||
      guardRow.non_sv03_target_count !== 0 ||
      guardRow.missing_parent_count !== 0 ||
      guardRow.variant_mismatch_count !== 0 ||
      guardRow.modifier_already_set_count !== 0 ||
      guardRow.active_identity_collision_count !== 0 ||
      guardRow.ready_projection_count !== 3 ||
      guardRow.identity_hash_collision_count !== 0 ||
      guardRow.existing_child_rows !== 0 ||
      guardRow.forbidden_stamped_child_count !== 0
    ) {
      throw new Error(`apply guard failed: ${JSON.stringify(guardRow)}`);
    }

    const parentUpdate = await client.query(
      `update public.card_prints cp
       set
         printed_identity_modifier = target.target_variant_key,
         updated_at = now(),
         ai_metadata = coalesce(cp.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'verified_master_index_identity_backfill', jsonb_build_object(
             'package_id', $1::text,
             'package_fingerprint_sha256', $2::text,
             'source_readiness_fingerprint', target.source_readiness_fingerprint,
             'stamped_parent_identity_backfill', true,
             'child_action_status', target.child_action_status
           )
         )
       from sv03_existing_stamped_identity_targets target
       where cp.id = target.card_print_id
         and cp.set_code = 'sv03'
         and cp.variant_key = target.target_variant_key
         and cp.printed_identity_modifier is null
       returning cp.id::text as card_print_id, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier`,
      [PACKAGE_ID, PACKAGE_FINGERPRINT],
    );
    if (parentUpdate.rowCount !== 3) throw new Error(`parent update count mismatch: ${parentUpdate.rowCount}`);

    const identityInsert = await client.query(
      `with projection as (
         select
           target.card_print_id,
           public.card_print_identity_backfill_projection_v1(
             s.source,
             cp.set_code,
             s.code,
             cp.number,
             cp.number_plain,
             cp.name,
             cp.variant_key,
             coalesce(cp.printed_total, s.printed_total),
             coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from sv03_existing_stamped_identity_targets target
         join public.card_prints cp on cp.id = target.card_print_id
         left join public.sets s on s.id = cp.set_id
       )
       insert into public.card_print_identity (
         card_print_id, identity_domain, set_code_identity, printed_number,
         normalized_printed_name, source_name_raw, identity_payload,
         identity_key_version, identity_key_hash
       )
       select
         card_print_id,
         projected->>'identity_domain',
         projected->>'set_code_identity',
         projected->>'printed_number',
         projected->>'normalized_printed_name',
         nullif(projected->>'source_name_raw', ''),
         coalesce(projected->'identity_payload', '{}'::jsonb),
         projected->>'identity_key_version',
         projected->>'identity_key_hash'
       from projection
       where projected->>'status' = 'ready'
       returning card_print_id::text, identity_domain, set_code_identity, printed_number, normalized_printed_name, identity_key_version, identity_key_hash`,
    );
    if (identityInsert.rowCount !== 3) throw new Error(`identity insert count mismatch: ${identityInsert.rowCount}`);

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from sv03_existing_stamped_identity_targets) as target_rows,
         (select count(*)::int
          from sv03_existing_stamped_identity_targets target
          join public.card_prints cp on cp.id = target.card_print_id
          where cp.printed_identity_modifier = target.target_variant_key) as parent_modifier_backfilled_rows,
         (select count(*)::int
          from sv03_existing_stamped_identity_targets target
          join public.card_print_identity cpi on cpi.card_print_id = target.card_print_id and cpi.is_active = true) as active_identity_rows,
         (select count(*)::int
          from sv03_existing_stamped_identity_targets target
          join public.card_printings cpr on cpr.card_print_id = target.card_print_id) as child_rows_after_apply`,
      [PACKAGE_ID, PACKAGE_FINGERPRINT],
    );
    const proofRow = proof.rows[0];
    if (
      proofRow.target_rows !== 3 ||
      proofRow.parent_modifier_backfilled_rows !== 3 ||
      proofRow.active_identity_rows !== 3 ||
      proofRow.child_rows_after_apply !== 0
    ) {
      throw new Error(`proof mismatch: ${JSON.stringify(proofRow)}`);
    }

    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    const updatedRows = await captureUpdatedRows(client, targets);
    return {
      apply_status: 'sv03_existing_stamped_parent_identity_backfill_real_apply_committed',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      updated_rows: updatedRows,
      committed: true,
      write_counts: {
        parent_rows_updated: parentUpdate.rowCount,
        identity_rows_inserted: identityInsert.rowCount,
        child_rows_inserted: 0,
        delete_rows: 0,
        merge_rows: 0,
      },
      guard: guardRow,
      proof: proofRow,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => beforeSnapshot);
    return {
      apply_status: 'sv03_existing_stamped_parent_identity_backfill_real_apply_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      updated_rows: null,
      committed: false,
      write_counts: {},
      guard: null,
      proof: null,
    };
  }
}

function validateAfter({ applyResult, targets }) {
  const findings = [];
  const afterSnapshot = applyResult.after_snapshot;
  const updatedRows = applyResult.updated_rows;
  if (applyResult.committed !== true) findings.push('apply_not_committed');
  if (applyResult.write_counts.parent_rows_updated !== 3) findings.push('parent_rows_updated_not_3');
  if (applyResult.write_counts.identity_rows_inserted !== 3) findings.push('identity_rows_inserted_not_3');
  if (applyResult.write_counts.child_rows_inserted !== 0) findings.push('child_rows_inserted_not_0');
  if (applyResult.write_counts.delete_rows !== 0) findings.push('delete_rows_not_0');
  if (afterSnapshot.counts.parent_rows !== 3) findings.push('after_parent_rows_not_3');
  if (afterSnapshot.counts.child_rows !== 0) findings.push('after_child_rows_not_0');
  if (afterSnapshot.counts.active_identity_rows !== 3) findings.push('after_active_identity_rows_not_3');
  const parents = afterSnapshot.rows.filter((row) => row.row_type === 'parent');
  if (parents.some((row) => row.set_code !== 'sv03')) findings.push('after_parent_set_code_not_sv03');
  if (parents.some((row) => row.variant_key !== 'play_pokemon_stamp')) findings.push('after_parent_variant_not_play_pokemon_stamp');
  if (parents.some((row) => row.printed_identity_modifier !== 'play_pokemon_stamp')) findings.push('after_parent_modifier_not_play_pokemon_stamp');
  if (updatedRows?.counts?.parent_rows_found !== targets.length) findings.push('updated_parent_rows_not_target_count');
  if (updatedRows?.counts?.by_set?.sv03 !== 3) findings.push('updated_sv03_rows_not_3');
  if (updatedRows?.counts?.by_variant?.play_pokemon_stamp !== 3) findings.push('updated_play_pokemon_variant_rows_not_3');
  if (updatedRows?.counts?.by_modifier?.play_pokemon_stamp !== 3) findings.push('updated_play_pokemon_modifier_rows_not_3');
  return findings;
}

function renderMarkdown(report) {
  const rows = (report.updated_rows?.rows ?? []).map((row) => [
    row.set_code,
    row.number,
    row.name,
    row.variant_key,
    row.printed_identity_modifier,
    row.child_finishes.length,
    row.active_identities.length,
    row.card_print_id,
  ]);
  return `# SV03 Existing Stamped Parent Identity Backfill Real Apply V1

Real apply for existing SV03 stamped parent identity backfill.

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_id | ${report.package_id} |
| package_fingerprint_sha256 | \`${report.package_fingerprint_sha256}\` |
| committed | ${report.committed} |
| parent_rows_updated | ${report.write_counts.parent_rows_updated ?? 0} |
| identity_rows_inserted | ${report.write_counts.identity_rows_inserted ?? 0} |
| child_rows_inserted | ${report.write_counts.child_rows_inserted ?? 0} |
| delete_rows | ${report.write_counts.delete_rows ?? 0} |
| merge_rows | ${report.write_counts.merge_rows ?? 0} |
| migrations_created | ${report.migrations_created} |
| cleanup_performed | ${report.cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| stop_findings | ${report.stop_findings.length} |

${markdownTable(['set', 'number', 'card', 'variant', 'modifier', 'child_finishes', 'active_identities', 'parent'], rows)}

## Safety Boundary

- Only existing SV03 stamped parent identity metadata was backfilled.
- No child printings were inserted.
- No deletes, merges, unsupported cleanup, quarantine, migrations, or global apply were performed.
- Product-family-only rows still require separate finish adjudication before child printing insertion.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-12 | [SV03 Existing Stamped Parent Identity Backfill Real Apply Checkpoint V1](20260612_sv03_existing_stamped_parent_identity_backfill_real_apply_checkpoint_v1.md) | Applied 3 SV03 existing stamped parent identity backfills. No child inserts, deletes, cleanup, quarantine, migrations, or global apply. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260612_sv03_existing_stamped_parent_identity_backfill_real_apply_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260612_sv03_existing_stamped_parent_identity_backfill_real_apply_checkpoint_v1.md') ? line : existingLine
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
  updated_rows: null,
  committed: false,
  write_counts: {},
  guard: null,
  proof: null,
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
    if (applyResult.committed) stopFindings.push(...validateAfter({ applyResult, targets }));
  }
}

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_sv03_existing_stamped_parent_identity_backfill_real_apply_v1',
  package_id: PACKAGE_ID,
  package_fingerprint_sha256: PACKAGE_FINGERPRINT,
  source_readiness_fingerprint: dryRun.source_readiness_fingerprint,
  approval_text_required: APPROVAL_TEXT,
  apply_status: applyResult.apply_status,
  committed: applyResult.committed,
  db_writes_performed: applyResult.committed,
  durable_db_writes_performed: applyResult.committed,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  global_apply_performed: false,
  child_inserts_performed: false,
  deletes_performed: false,
  merges_performed: false,
  write_counts: applyResult.write_counts,
  guard: applyResult.guard,
  proof: applyResult.proof,
  before_snapshot: applyResult.before_snapshot,
  after_snapshot: applyResult.after_snapshot,
  updated_rows: applyResult.updated_rows,
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
