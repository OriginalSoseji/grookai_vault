import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'special_variant_discovery_v1');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'residual_source_ready_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'residual_source_ready_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'residual_source_ready_real_apply_v1.md');

const PACKAGE_ID = 'SPECIAL-VAR-05-RESIDUAL-SOURCE-READY-PARENT-INSERTS';
const CREATED_BY = 'english_master_index_special_variant_residual_source_ready_real_apply_v1';
const EXPECTED_PACKAGE_FINGERPRINT = 'd8868b21fb25b7834ad967dcd4659a8ff7ff750b4a516825eb2d6a4a0a2d96c2';
const EXPECTED_SQL_HASH = '15922fd72f503afa5ffd0af086680222ae19c5422d07f38297a65d1951c0d32a';
const EXPECTED_DRY_RUN_PROOF = '96fc92ace302bacabb896a4f7a854d2c6a572cf95e2dc159062ba118cb3295ff';
const EXPECTED_PRE_APPLY_HASH = '988b9c3133665d887ff1e7a434c68ca6432a593ea11d8a27d21b319fb030f215';
const EXPECTED_TARGET_COUNT = 4;
const EXPECTED_SOURCE_UNIQUE_FINISH_ROWS = 0;

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
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
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function validateDryRun(dryRun) {
  const findings = [];
  const counts = dryRun.execution?.simulated_write_counts ?? {};
  const proof = dryRun.execution?.proof ?? {};
  const guard = dryRun.execution?.guard ?? {};

  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_id_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_PACKAGE_FINGERPRINT) findings.push('package_fingerprint_mismatch');
  if (dryRun.sql_hash_sha256 !== EXPECTED_SQL_HASH) findings.push('sql_hash_mismatch');
  if (dryRun.execution?.dry_run_status !== 'residual_source_ready_parent_insert_completed_rolled_back_no_durable_change') findings.push('dry_run_status_not_passed');
  if (dryRun.execution?.rollback_verified !== true) findings.push('rollback_not_verified');
  if (dryRun.execution?.dry_run_proof_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_proof_mismatch');
  if ((dryRun.execution?.stop_findings ?? []).length !== 0) findings.push('stop_findings_present');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('before_snapshot_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('after_rollback_snapshot_hash_mismatch');
  if (dryRun.pass !== true) findings.push('dry_run_pass_not_true');
  if (dryRun.db_writes_performed !== false || dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_write');
  if (dryRun.migrations_created !== false || dryRun.cleanup_performed !== false || dryRun.quarantine_performed !== false) findings.push('dry_run_reports_forbidden_action');
  if ((dryRun.scope?.targets ?? []).length !== EXPECTED_TARGET_COUNT) findings.push('target_count_mismatch');
  if (dryRun.scope?.source_unique_finish_rows !== EXPECTED_SOURCE_UNIQUE_FINISH_ROWS) findings.push('source_unique_finish_count_mismatch');
  if (dryRun.scope?.by_set?.base1 !== 2 || dryRun.scope?.by_set?.base3 !== 1 || dryRun.scope?.by_set?.gym2 !== 1) findings.push('set_scope_mismatch');
  if (dryRun.scope?.by_finish?.normal !== 3 || dryRun.scope?.by_finish?.holo !== 1) findings.push('finish_scope_mismatch');
  if (counts.parent_inserts !== EXPECTED_TARGET_COUNT) findings.push('parent_insert_count_mismatch');
  if (counts.identity_inserts !== EXPECTED_TARGET_COUNT) findings.push('identity_insert_count_mismatch');
  if (counts.child_inserts !== EXPECTED_TARGET_COUNT) findings.push('child_insert_count_mismatch');
  if (counts.deletes !== 0 || counts.merges !== 0) findings.push('delete_or_merge_scope_present');
  if (proof.target_rows !== EXPECTED_TARGET_COUNT) findings.push('proof_target_count_mismatch');
  if (proof.inserted_parent_rows !== EXPECTED_TARGET_COUNT) findings.push('proof_parent_count_mismatch');
  if (proof.inserted_identity_rows !== EXPECTED_TARGET_COUNT) findings.push('proof_identity_count_mismatch');
  if (proof.inserted_child_rows !== EXPECTED_TARGET_COUNT) findings.push('proof_child_count_mismatch');
  if (proof.forbidden_stamped_child_rows !== 0) findings.push('forbidden_stamped_child_present');
  if (guard.source_unique_finish_count !== EXPECTED_SOURCE_UNIQUE_FINISH_ROWS) findings.push('guard_source_unique_finish_count_mismatch');

  for (const row of dryRun.scope?.targets ?? []) {
    if (!['base1', 'base3', 'gym2'].includes(row.set_key)) findings.push(`target_set_mismatch:${row.source_candidate_key}`);
    if (!row.target_variant_key || !row.target_printed_identity_modifier) findings.push(`target_missing_variant_identity:${row.source_candidate_key}`);
    if (!['normal', 'holo'].includes(row.target_finish_key)) findings.push(`target_finish_mismatch:${row.source_candidate_key}`);
    if (!row.target_parent_id || !row.target_child_id || !row.base_parent_id) findings.push(`target_missing_ids:${row.source_candidate_key}`);
  }

  return findings;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(target_parent_id uuid, target_child_id uuid, base_parent_id uuid)
     )
     select 'base_parent' as row_type, cp.id::text as row_id, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text as finish_key, null::text as identity_key_hash
     from target t join public.card_prints cp on cp.id = t.base_parent_id
     union all
     select 'target_parent', cp.id::text, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text, null::text
     from target t join public.card_prints cp on cp.id = t.target_parent_id
     union all
     select 'target_child', cpr.id::text, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, cpr.finish_key, null::text
     from target t join public.card_printings cpr on cpr.id = t.target_child_id join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select 'target_identity', cpi.id::text, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text, cpi.identity_key_hash
     from target t join public.card_print_identity cpi on cpi.card_print_id = t.target_parent_id and cpi.is_active = true join public.card_prints cp on cp.id = cpi.card_print_id
     order by row_type, set_code nulls last, number_plain nulls last, number nulls last, name nulls last, variant_key nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets)],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: countBy(result.rows, (row) => row.row_type),
  };
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  if (beforeSnapshot.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) {
    throw new Error(`pre-apply snapshot hash mismatch: ${beforeSnapshot.hash_sha256}`);
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table residual_source_ready_targets (
         target_parent_id uuid primary key,
         target_child_id uuid not null,
         base_parent_id uuid not null,
         set_key text not null,
         card_number text not null,
         card_name text not null,
         target_finish_key text not null,
         target_variant_key text not null,
         target_printed_identity_modifier text not null,
         evidence jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into residual_source_ready_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         base_parent_id uuid,
         set_key text,
         card_number text,
         card_name text,
         target_finish_key text,
         target_variant_key text,
         target_printed_identity_modifier text,
         evidence jsonb
       )`,
      [JSON.stringify(targets.map((row) => ({
        target_parent_id: row.target_parent_id,
        target_child_id: row.target_child_id,
        base_parent_id: row.base_parent_id,
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        target_finish_key: row.target_finish_key,
        target_variant_key: row.target_variant_key,
        target_printed_identity_modifier: row.target_printed_identity_modifier,
        evidence: row.evidence_payload,
      })))],
    );

    const guard = await client.query(
      `with projection as (
         select
           target.target_parent_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, base.set_code, s.code, base.number, base.number_plain, base.name,
             target.target_variant_key, coalesce(base.printed_total, s.printed_total), coalesce(base.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from residual_source_ready_targets target
         join public.card_prints base on base.id = target.base_parent_id
         left join public.sets s on s.id = base.set_id
       )
       select
         (select count(*)::int from residual_source_ready_targets) as target_count,
         (select count(distinct target_parent_id)::int from residual_source_ready_targets) as target_parent_count,
         (select count(distinct target_child_id)::int from residual_source_ready_targets) as target_child_count,
         (select count(*)::int from residual_source_ready_targets target left join public.card_prints base on base.id = target.base_parent_id where base.id is null) as missing_base_count,
         (select count(*)::int from residual_source_ready_targets target left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int from residual_source_ready_targets target join public.card_prints base on base.id = target.base_parent_id left join public.card_printings base_child on base_child.card_print_id = base.id and base_child.finish_key = target.target_finish_key where base_child.id is null) as source_unique_finish_count,
         (select count(*)::int from residual_source_ready_targets target join public.card_prints base on base.id = target.base_parent_id join public.card_prints cp on cp.set_id = base.set_id and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number) and lower(cp.name) = lower(base.name) and coalesce(cp.variant_key, '') = target.target_variant_key) as parent_collision_count,
         (select count(*)::int from residual_source_ready_targets target join public.card_printings cpr on cpr.id = target.target_child_id) as child_collision_count,
         (select count(*)::int from residual_source_ready_targets target join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true) as identity_target_collision_count,
         (select count(*)::int from projection where projected->>'status' = 'ready') as ready_identity_projection_count,
         (select count(*)::int from projection p join public.card_print_identity cpi on cpi.is_active = true and cpi.card_print_id <> p.target_parent_id and cpi.identity_domain = p.projected->>'identity_domain' and cpi.identity_key_version = p.projected->>'identity_key_version' and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collision_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== EXPECTED_TARGET_COUNT
      || guardRow.target_parent_count !== EXPECTED_TARGET_COUNT
      || guardRow.target_child_count !== EXPECTED_TARGET_COUNT
      || guardRow.missing_base_count !== 0
      || guardRow.inactive_finish_count !== 0
      || guardRow.source_unique_finish_count !== EXPECTED_SOURCE_UNIQUE_FINISH_ROWS
      || guardRow.parent_collision_count !== 0
      || guardRow.child_collision_count !== 0
      || guardRow.identity_target_collision_count !== 0
      || guardRow.ready_identity_projection_count !== EXPECTED_TARGET_COUNT
      || guardRow.identity_hash_collision_count !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
    }

    const parentInsert = await client.query(
      `insert into public.card_prints (
         id, game_id, set_id, name, number, variant_key, rarity, image_url,
         tcgplayer_id, external_ids, updated_at, set_code, artist, regulation_mark,
         image_alt_url, image_source, variants, created_at, last_synced_at,
         print_identity_key, ai_metadata, image_hash, data_quality_flags, image_status,
         image_res, image_last_checked_at, printed_set_abbrev, printed_total,
         gv_id, image_path, identity_domain, printed_identity_modifier,
         set_identity_model, representative_image_url, image_note
       )
       select
         target.target_parent_id, base.game_id, base.set_id, base.name, base.number,
         target.target_variant_key, base.rarity, null,
         null, coalesce(base.external_ids, '{}'::jsonb) || jsonb_build_object('verified_master_index_v1', target.evidence), now(), base.set_code, base.artist, base.regulation_mark,
         null, null, base.variants, now(), now(), base.print_identity_key,
         coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'source', 'verified_master_set_index_v1',
           'package_id', $1::text,
           'base_parent_id', base.id::text,
           'variant_key', target.target_variant_key,
           'printed_identity_modifier', target.target_printed_identity_modifier,
           'explicit_child_finish_key', target.target_finish_key
         ),
         null, base.data_quality_flags, 'representative_shared',
         base.image_res, now(), base.printed_set_abbrev, base.printed_total,
         concat('GV-PK-', upper(regexp_replace(coalesce(base.printed_set_abbrev, base.set_code), '[^A-Za-z0-9]+', '-', 'g')), '-', base.number_plain, '-', upper(regexp_replace(target.target_variant_key, '[^A-Za-z0-9]+', '-', 'g'))),
         null, base.identity_domain, target.target_printed_identity_modifier, base.set_identity_model,
         coalesce(base.representative_image_url, base.image_url),
         concat('Source-backed residual WOTC special-case identity: ', target.target_variant_key, '. Representative base image only until exact variant image is available.')
       from residual_source_ready_targets target
       join public.card_prints base on base.id = target.base_parent_id`,
      [PACKAGE_ID],
    );

    const identityInsert = await client.query(
      `with projection as (
         select
           target.target_parent_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, cp.set_code, s.code, cp.number, cp.number_plain, cp.name, cp.variant_key,
             coalesce(cp.printed_total, s.printed_total), coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from residual_source_ready_targets target
         join public.card_prints cp on cp.id = target.target_parent_id
         left join public.sets s on s.id = cp.set_id
       )
       insert into public.card_print_identity (
         card_print_id, identity_domain, set_code_identity, printed_number,
         normalized_printed_name, source_name_raw, identity_payload,
         identity_key_version, identity_key_hash
       )
       select
         target_parent_id,
         projected->>'identity_domain',
         projected->>'set_code_identity',
         projected->>'printed_number',
         projected->>'normalized_printed_name',
         nullif(projected->>'source_name_raw', ''),
         coalesce(projected->'identity_payload', '{}'::jsonb),
         projected->>'identity_key_version',
         projected->>'identity_key_hash'
       from projection
       where projected->>'status' = 'ready'`,
    );

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
         concat(target.set_key, ':', target.card_number, ':residual_source_ready_variant:', target.target_variant_key, ':', target.target_finish_key),
         $1::text,
         concat('GV-PK-', upper(regexp_replace(target.set_key, '[^A-Za-z0-9]+', '-', 'g')), '-', regexp_replace(target.card_number, '[^A-Za-z0-9]+', '-', 'g'), '-', upper(regexp_replace(target.target_variant_key, '[^A-Za-z0-9]+', '-', 'g')), '-', upper(regexp_replace(target.target_finish_key, '[^A-Za-z0-9]+', '-', 'g'))),
         null, null, null, null,
         'representative_shared',
         'Source-backed residual WOTC special-case child. Representative image only until exact variant image is available.'
       from residual_source_ready_targets target`,
      [CREATED_BY],
    );

    if (parentInsert.rowCount !== EXPECTED_TARGET_COUNT || identityInsert.rowCount !== EXPECTED_TARGET_COUNT || childInsert.rowCount !== EXPECTED_TARGET_COUNT) {
      throw new Error(`insert count mismatch: ${JSON.stringify({ parent_inserts: parentInsert.rowCount, identity_inserts: identityInsert.rowCount, child_inserts: childInsert.rowCount })}`);
    }

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from residual_source_ready_targets) as target_rows,
         (select count(*)::int from public.card_prints cp join residual_source_ready_targets target on target.target_parent_id = cp.id) as inserted_parent_rows,
         (select count(*)::int from public.card_prints cp join residual_source_ready_targets target on target.target_parent_id = cp.id and cp.printed_identity_modifier = target.target_printed_identity_modifier and cp.variant_key = target.target_variant_key) as inserted_parent_identity_rows,
         (select count(*)::int from public.card_print_identity cpi join residual_source_ready_targets target on target.target_parent_id = cpi.card_print_id and cpi.is_active = true) as inserted_identity_rows,
         (select count(*)::int from public.card_printings cpr join residual_source_ready_targets target on target.target_child_id = cpr.id and cpr.finish_key = target.target_finish_key) as inserted_child_rows,
         (select count(*)::int from public.card_printings cpr join residual_source_ready_targets target on target.target_child_id = cpr.id and cpr.finish_key = 'stamped') as forbidden_stamped_child_rows`,
      [PACKAGE_ID, EXPECTED_PACKAGE_FINGERPRINT],
    );

    const proofRow = proof.rows[0];
    if (
      proofRow.target_rows !== EXPECTED_TARGET_COUNT
      || proofRow.inserted_parent_rows !== EXPECTED_TARGET_COUNT
      || proofRow.inserted_parent_identity_rows !== EXPECTED_TARGET_COUNT
      || proofRow.inserted_identity_rows !== EXPECTED_TARGET_COUNT
      || proofRow.inserted_child_rows !== EXPECTED_TARGET_COUNT
      || proofRow.forbidden_stamped_child_rows !== 0
    ) {
      throw new Error(`proof failed: ${JSON.stringify(proofRow)}`);
    }

    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      apply_status: 'residual_source_ready_parent_insert_applied',
      guard: guardRow,
      proof: proofRow,
      applied_write_counts: {
        parent_inserts: parentInsert.rowCount,
        identity_inserts: identityInsert.rowCount,
        child_inserts: childInsert.rowCount,
        deletes: 0,
        merges: 0,
      },
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      post_apply_verified: afterSnapshot.counts.target_parent === EXPECTED_TARGET_COUNT
        && afterSnapshot.counts.target_identity === EXPECTED_TARGET_COUNT
        && afterSnapshot.counts.target_child === EXPECTED_TARGET_COUNT,
      stop_findings: [],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function renderMarkdown(report) {
  return `# Residual Source Ready Variants Real Apply V1

## Result

- apply_status: ${report.execution.apply_status}
- post_apply_verified: ${report.execution.post_apply_verified}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- sql_hash_sha256: \`${report.sql_hash_sha256}\`
- no_global_apply: ${report.no_global_apply}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Scope

${markdownTable(['metric', 'value'], Object.entries(report.scope).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : value]))}

## Targets

${markdownTable(['set', 'number', 'name', 'variant', 'modifier', 'finish'], report.targets.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.target_variant_key,
    row.target_printed_identity_modifier,
    row.target_finish_key,
  ]))}
`;
}

async function main() {
  const dryRun = await readJson(DRY_RUN_JSON);
  const findings = validateDryRun(dryRun);
  if (findings.length > 0) {
    throw new Error(`dry-run validation failed: ${findings.join(', ')}`);
  }

  const conn = connectionString();
  if (!conn) throw new Error('missing database connection');

  const targets = dryRun.scope.targets;
  const client = new Client({ connectionString: conn });
  await client.connect();
  let execution;
  try {
    execution = await applyPackage(client, targets);
  } finally {
    await client.end().catch(() => {});
  }

  const report = {
    generated_at: new Date().toISOString(),
    package_id: PACKAGE_ID,
    mode: 'real_apply_approved_scope_only',
    dry_run_artifact: rel(DRY_RUN_JSON),
    package_fingerprint_sha256: EXPECTED_PACKAGE_FINGERPRINT,
    sql_hash_sha256: EXPECTED_SQL_HASH,
    dry_run_proof_sha256: EXPECTED_DRY_RUN_PROOF,
    db_writes_performed: true,
    no_global_apply: true,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    scope: {
      target_rows: targets.length,
      parent_inserts: execution.applied_write_counts.parent_inserts,
      identity_inserts: execution.applied_write_counts.identity_inserts,
      child_inserts: execution.applied_write_counts.child_inserts,
      deletes: execution.applied_write_counts.deletes,
      merges: execution.applied_write_counts.merges,
      source_unique_finish_rows: EXPECTED_SOURCE_UNIQUE_FINISH_ROWS,
      by_set: countBy(targets, (row) => row.set_key),
      by_finish: countBy(targets, (row) => row.target_finish_key),
      by_variant: countBy(targets, (row) => row.target_variant_key),
    },
    targets,
    execution,
  };

  report.real_apply_proof_sha256 = sha256(stableJson({
    package_id: report.package_id,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    sql_hash_sha256: report.sql_hash_sha256,
    scope: report.scope,
    proof: report.execution.proof,
    before_hash: report.execution.before_snapshot.hash_sha256,
    after_hash: report.execution.after_snapshot.hash_sha256,
  }));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    apply_status: execution.apply_status,
    post_apply_verified: execution.post_apply_verified,
    package_fingerprint_sha256: EXPECTED_PACKAGE_FINGERPRINT,
    sql_hash_sha256: EXPECTED_SQL_HASH,
    real_apply_proof_sha256: report.real_apply_proof_sha256,
    scope: report.scope,
    no_global_apply: true,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
