import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg42a_final_source_closure_master_index_delta_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg42b_final_staff_identity_backfill_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg42b_final_staff_identity_backfill_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg42b_final_staff_identity_backfill_real_apply_v1.md');

const PACKAGE_ID = 'PKG-42B-FINAL-STAFF-IDENTITY-BACKFILL';
const EXPECTED_PACKAGE_FINGERPRINT = 'b59c6ee715acda48d211b8ff12a1210dba6e20bea8cac5b21a670cd3706789f2';
const EXPECTED_DRY_RUN_PROOF_HASH = '54ce95de001c9da8dc8060a489e3fbbdf95b6975a107354121ac121da4193d61';

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

function buildTargets(source) {
  return (source.rows ?? [])
    .filter((row) => row.status === 'ready_for_guarded_dry_run' && row.requires_parent_identity_backfill)
    .map((row) => ({
      card_print_id: row.selected_base_parent_id,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      target_variant_key: row.variant_key,
      target_finish_key: row.accepted_finish_key,
      source_route_fingerprint: source.fingerprint_sha256,
    }));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid)
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

async function runApply(client, targets, packageFingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  if (beforeSnapshot.hash_sha256 !== EXPECTED_DRY_RUN_PROOF_HASH) {
    throw new Error(`fresh before snapshot hash ${beforeSnapshot.hash_sha256} does not match approved dry-run proof ${EXPECTED_DRY_RUN_PROOF_HASH}`);
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg42b_final_staff_identity_targets (
         card_print_id uuid primary key,
         set_key text not null,
         card_number text not null,
         card_name text not null,
         target_variant_key text not null,
         target_finish_key text not null,
         source_route_fingerprint text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg42b_final_staff_identity_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         set_key text,
         card_number text,
         card_name text,
         target_variant_key text,
         target_finish_key text,
         source_route_fingerprint text
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
         from pkg42b_final_staff_identity_targets target
         join public.card_prints cp on cp.id = target.card_print_id
         left join public.sets s on s.id = cp.set_id
       )
       select
         (select count(*)::int from pkg42b_final_staff_identity_targets) as target_count,
         (select count(distinct card_print_id)::int from pkg42b_final_staff_identity_targets) as target_parent_count,
         (select count(*)::int
          from pkg42b_final_staff_identity_targets target
          left join public.card_prints cp on cp.id = target.card_print_id
          where cp.id is null) as missing_parent_count,
         (select count(*)::int
          from pkg42b_final_staff_identity_targets target
          join public.card_prints cp on cp.id = target.card_print_id
          where cp.variant_key is distinct from target.target_variant_key) as variant_mismatch_count,
         (select count(*)::int
          from pkg42b_final_staff_identity_targets target
          join public.card_prints cp on cp.id = target.card_print_id
          where nullif(cp.printed_identity_modifier, '') is not null) as already_has_modifier_count,
         (select count(*)::int
          from pkg42b_final_staff_identity_targets target
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
          from pkg42b_final_staff_identity_targets target
          left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true
          where fk.key is null) as inactive_target_finish_count,
         (select count(*)::int
          from pkg42b_final_staff_identity_targets target
          join public.card_printings cpr on cpr.card_print_id = target.card_print_id and cpr.finish_key = target.target_finish_key) as matching_child_finish_count,
         (select count(*)::int
          from pkg42b_final_staff_identity_targets target
          join public.card_printings cpr on cpr.card_print_id = target.card_print_id) as total_child_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== targets.length ||
      guardRow.target_parent_count !== targets.length ||
      guardRow.missing_parent_count !== 0 ||
      guardRow.variant_mismatch_count !== 0 ||
      guardRow.already_has_modifier_count !== 0 ||
      guardRow.active_identity_collision_count !== 0 ||
      guardRow.ready_projection_count !== targets.length ||
      guardRow.identity_hash_collision_count !== 0 ||
      guardRow.inactive_target_finish_count !== 0 ||
      guardRow.matching_child_finish_count !== targets.length ||
      guardRow.total_child_count !== targets.length
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
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
             'source_route_fingerprint', target.source_route_fingerprint,
             'final_staff_identity_backfill', true
           )
         )
       from pkg42b_final_staff_identity_targets target
       where cp.id = target.card_print_id
       returning cp.id::text as card_print_id, cp.printed_identity_modifier`,
      [PACKAGE_ID, packageFingerprint],
    );

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
         from pkg42b_final_staff_identity_targets target
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

    const verification = await client.query(
      `select
         (select count(*)::int
          from pkg42b_final_staff_identity_targets target
          join public.card_prints cp on cp.id = target.card_print_id
          where cp.printed_identity_modifier = target.target_variant_key) as parent_modifier_backfilled_count,
         (select count(*)::int
          from pkg42b_final_staff_identity_targets target
          join public.card_print_identity cpi on cpi.card_print_id = target.card_print_id and cpi.is_active = true) as active_identity_rows,
         (select count(*)::int
          from pkg42b_final_staff_identity_targets target
          join public.card_printings cpr on cpr.card_print_id = target.card_print_id and cpr.finish_key = target.target_finish_key) as matching_child_finish_rows`,
    );

    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      beforeSnapshot,
      afterSnapshot,
      guard: guardRow,
      parent_update_rows: parentUpdate.rows,
      identity_insert_rows: identityInsert.rows,
      verification: verification.rows[0],
    };
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Ignore rollback errors after failed real-apply guard.
    }
    throw error;
  }
}

function renderMarkdown(report) {
  return `# PKG-42B Final Staff Identity Backfill Real Apply V1

Real apply for the explicitly approved final staff-stamped identity backfill.

## Safety

- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}
- child_inserts_performed: ${report.child_inserts_performed}
- deletes_performed: ${report.deletes_performed}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['package_fingerprint_sha256', report.package_fingerprint_sha256],
    ['approved_dry_run_proof_hash', report.approved_dry_run_proof_hash],
    ['fresh_before_snapshot_hash', report.before_snapshot.hash_sha256],
    ['after_snapshot_hash', report.after_snapshot.hash_sha256],
    ['parent_updates_applied', report.summary.parent_updates_applied],
    ['identity_inserts_applied', report.summary.identity_inserts_applied],
  ])}

## Target

${markdownTable(
    ['set', 'number', 'card', 'variant', 'finish', 'parent_id'],
    report.targets.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.target_variant_key,
      row.target_finish_key,
      row.card_print_id,
    ]),
  )}
`;
}

const source = await readJson(SOURCE_JSON);
const dryRun = await readJson(DRY_RUN_JSON);
const targets = buildTargets(source);
if (targets.length !== 1) throw new Error(`Expected 1 PKG-42B identity target, found ${targets.length}`);

const packageFingerprint = sha256(stableJson({
  package_id: PACKAGE_ID,
  source_fingerprint: source.fingerprint_sha256,
  targets,
}));
if (packageFingerprint !== EXPECTED_PACKAGE_FINGERPRINT) {
  throw new Error(`package fingerprint mismatch: ${packageFingerprint} !== ${EXPECTED_PACKAGE_FINGERPRINT}`);
}
if (dryRun.package_fingerprint_sha256 !== EXPECTED_PACKAGE_FINGERPRINT) {
  throw new Error(`dry-run package fingerprint mismatch: ${dryRun.package_fingerprint_sha256} !== ${EXPECTED_PACKAGE_FINGERPRINT}`);
}
if (dryRun.dry_run_proof_hash !== EXPECTED_DRY_RUN_PROOF_HASH || dryRun.before_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF_HASH || dryRun.after_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF_HASH) {
  throw new Error('dry-run proof hash does not match approved proof');
}
if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) {
  throw new Error('dry-run rollback proof was not clean');
}

const conn = connectionString();
if (!conn) throw new Error('Missing SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL for real apply.');

const client = new Client({ connectionString: conn });
await client.connect();
let applyResult;
try {
  applyResult = await runApply(client, targets, packageFingerprint);
} finally {
  await client.end();
}

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg42b_final_staff_identity_backfill_real_apply_v1',
  package_id: PACKAGE_ID,
  real_apply_performed: true,
  durable_db_writes_performed: true,
  db_reads_performed: true,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  child_inserts_performed: false,
  deletes_performed: false,
  parent_updates_performed: true,
  identity_inserts_performed: true,
  package_fingerprint_sha256: packageFingerprint,
  approved_dry_run_proof_hash: EXPECTED_DRY_RUN_PROOF_HASH,
  source_artifact: path.relative(ROOT, SOURCE_JSON),
  dry_run_artifact: path.relative(ROOT, DRY_RUN_JSON),
  before_snapshot: applyResult.beforeSnapshot,
  after_snapshot: applyResult.afterSnapshot,
  guard: applyResult.guard,
  summary: {
    target_rows: targets.length,
    parent_updates_applied: applyResult.parent_update_rows.length,
    identity_inserts_applied: applyResult.identity_insert_rows.length,
  },
  targets,
  parent_update_rows: applyResult.parent_update_rows,
  identity_insert_rows: applyResult.identity_insert_rows,
  verification: applyResult.verification,
  safety_confirmation: {
    approved_scope_only: true,
    no_global_apply: true,
    no_migrations_created: true,
    no_child_inserts_included: true,
    no_deletes_included: true,
    no_cleanup_or_quarantine_performed: true,
  },
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON),
  package_fingerprint_sha256: packageFingerprint,
  approved_dry_run_proof_hash: EXPECTED_DRY_RUN_PROOF_HASH,
  before_snapshot_hash: report.before_snapshot.hash_sha256,
  after_snapshot_hash: report.after_snapshot.hash_sha256,
  summary: report.summary,
  verification: report.verification,
  durable_db_writes_performed: true,
  migrations_created: false,
}, null, 2));
