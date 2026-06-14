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
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15o_stamped_review_ready_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15o_stamped_review_ready_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg15o_stamped_review_ready_real_apply_v1.md');

const PACKAGE_ID = 'PKG-15O-STAMPED-REVIEW-READY-PARENT-INSERTS';
const CREATED_BY = 'pkg15o_stamped_review_ready_real_apply_v1';
const EXPECTED_PACKAGE_FINGERPRINT = '5bf78a89758478c48815200abb9f1f94874816bd2b9e43e3511ca69c82871d07';
const EXPECTED_DRY_RUN_PROOF = '628547af7a078c27c1b83a0cf6c80fbd5630e3e518743404edc99c5fbe27a0ad';

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
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function validateDryRun(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_id_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_PACKAGE_FINGERPRINT) findings.push('dry_run_package_fingerprint_mismatch');
  if (dryRun.execution?.dry_run_status !== 'pkg15o_completed_rolled_back_no_durable_change') findings.push('dry_run_status_not_passed');
  if (dryRun.execution?.rollback_verified !== true) findings.push('dry_run_rollback_not_verified');
  if (dryRun.execution?.dry_run_proof_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_proof_mismatch');
  if ((dryRun.execution?.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  const counts = dryRun.execution?.simulated_write_counts ?? {};
  if (counts.parent_inserts !== 5) findings.push('dry_run_parent_insert_scope_mismatch');
  if (counts.identity_inserts !== 5) findings.push('dry_run_identity_insert_scope_mismatch');
  if (counts.child_inserts !== 5) findings.push('dry_run_child_insert_scope_mismatch');
  if (counts.deletes !== 0 || counts.merges !== 0) findings.push('dry_run_delete_or_merge_scope_present');
  if (dryRun.db_writes_performed !== false || dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_write');
  if (dryRun.migrations_created !== false || dryRun.cleanup_performed !== false || dryRun.quarantine_performed !== false) findings.push('dry_run_reports_forbidden_action');
  if ((dryRun.scope?.targets ?? []).length !== 5) findings.push('dry_run_targets_not_5');
  return findings;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid
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
       null::text as finish_key,
       null::text as identity_key_hash
     from target t
     join public.card_prints cp on cp.id = t.target_parent_id
     union all
     select
       'target_child',
       cpr.id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cpr.finish_key,
       null::text
     from target t
     join public.card_printings cpr on cpr.id = t.target_child_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'target_identity',
       cpi.id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       null::text,
       cpi.identity_key_hash
     from target t
     join public.card_print_identity cpi on cpi.card_print_id = t.target_parent_id and cpi.is_active = true
     join public.card_prints cp on cp.id = cpi.card_print_id
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

async function applyPackage(client, targets, fingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg15o_targets (
         target_parent_id uuid primary key,
         target_child_id uuid not null,
         base_parent_id uuid not null,
         set_key text not null,
         set_name text not null,
         card_number text not null,
         card_name text not null,
         target_finish_key text not null,
         target_variant_key text not null,
         stamp_label text not null,
         evidence jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg15o_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         base_parent_id uuid,
         set_key text,
         set_name text,
         card_number text,
         card_name text,
         target_finish_key text,
         target_variant_key text,
         stamp_label text,
         evidence jsonb
       )`,
      [JSON.stringify(targets)],
    );
    const guard = await client.query(
      `with projection as (
         select
           target.target_parent_id,
           public.card_print_identity_backfill_projection_v1(
             s.source,
             base.set_code,
             s.code,
             base.number,
             base.number_plain,
             base.name,
             target.target_variant_key,
             coalesce(base.printed_total, s.printed_total),
             coalesce(base.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from pkg15o_targets target
         join public.card_prints base on base.id = target.base_parent_id
         left join public.sets s on s.id = base.set_id
       )
       select
         (select count(*)::int from pkg15o_targets) as target_count,
         (select count(distinct target_parent_id)::int from pkg15o_targets) as target_parent_count,
         (select count(distinct target_child_id)::int from pkg15o_targets) as target_child_count,
         (select count(*)::int from pkg15o_targets target left join public.card_prints base on base.id = target.base_parent_id where base.id is null) as missing_base_count,
         (select count(*)::int from pkg15o_targets target left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int
          from pkg15o_targets target
          join public.card_prints base on base.id = target.base_parent_id
          left join public.card_printings base_child on base_child.card_print_id = base.id and base_child.finish_key = target.target_finish_key
          where base_child.id is null) as missing_base_finish_count,
         (select count(*)::int
          from pkg15o_targets target
          join public.card_prints base on base.id = target.base_parent_id
          join public.card_prints cp
            on cp.set_id = base.set_id
           and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number)
           and lower(cp.name) = lower(base.name)
           and coalesce(cp.variant_key, '') = target.target_variant_key) as parent_collision_count,
         (select count(*)::int from pkg15o_targets target join public.card_printings cpr on cpr.id = target.target_child_id) as child_collision_count,
         (select count(*)::int from pkg15o_targets target join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true) as identity_target_collision_count,
         (select count(*)::int from projection where projected->>'status' = 'ready') as ready_identity_projection_count,
         (select count(*)::int
          from projection p
          join public.card_print_identity cpi
            on cpi.is_active = true
           and cpi.card_print_id <> p.target_parent_id
           and cpi.identity_domain = p.projected->>'identity_domain'
           and cpi.identity_key_version = p.projected->>'identity_key_version'
           and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collision_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== targets.length ||
      guardRow.target_parent_count !== targets.length ||
      guardRow.target_child_count !== targets.length ||
      guardRow.missing_base_count !== 0 ||
      guardRow.inactive_finish_count !== 0 ||
      guardRow.missing_base_finish_count !== 0 ||
      guardRow.parent_collision_count !== 0 ||
      guardRow.child_collision_count !== 0 ||
      guardRow.identity_target_collision_count !== 0 ||
      guardRow.ready_identity_projection_count !== targets.length ||
      guardRow.identity_hash_collision_count !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
    }

    const parentInsert = await client.query(
      `insert into public.card_prints (
         id, game_id, set_id, name, number, variant_key, rarity, image_url, tcgplayer_id, external_ids,
         updated_at, set_code, artist, regulation_mark, image_alt_url, image_source, variants, created_at,
         last_synced_at, print_identity_key, ai_metadata, image_hash, data_quality_flags, image_status,
         image_res, image_last_checked_at, printed_set_abbrev, printed_total, gv_id,
         image_path, identity_domain, printed_identity_modifier, set_identity_model, representative_image_url, image_note
       )
       select
         target.target_parent_id, base.game_id, base.set_id, base.name, base.number,
         target.target_variant_key, base.rarity, null, null,
         jsonb_build_object('verified_master_index_v1', target.evidence), now(), base.set_code,
         base.artist, base.regulation_mark, null, null, base.variants, now(),
         now(), base.print_identity_key,
         coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'source', 'verified_master_set_index_v1',
           'package_id', $1::text,
           'base_parent_id', base.id::text,
           'stamp_label', target.stamp_label,
           'variant_key', target.target_variant_key,
           'explicit_child_finish_key', target.target_finish_key
         ),
         null, base.data_quality_flags, 'representative_shared_stamp',
         base.image_res, now(), base.printed_set_abbrev, base.printed_total,
         concat('GV-PK-', upper(regexp_replace(coalesce(base.printed_set_abbrev, base.set_code), '[^A-Za-z0-9]+', '-', 'g')), '-', base.number_plain, '-', upper(regexp_replace(target.target_variant_key, '[^A-Za-z0-9]+', '-', 'g'))),
         null, base.identity_domain, null, base.set_identity_model,
         coalesce(base.representative_image_url, base.image_url),
         concat('Stamped canonical identity: ', target.stamp_label, '. Representative base image only until exact stamped image is available.')
       from pkg15o_targets target
       join public.card_prints base on base.id = target.base_parent_id`,
      [PACKAGE_ID],
    );
    const identityInsert = await client.query(
      `with projection as (
         select
           target.target_parent_id,
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
         from pkg15o_targets target
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
         concat(target.set_key, ':', target.card_number, ':stamped_identity:', target.target_variant_key, ':', target.target_finish_key),
         $1::text,
         null, null, null, null, null,
         'representative_shared_stamp',
         concat('Stamped identity child finish routed from multi-source review-ready evidence: ', target.target_finish_key)
       from pkg15o_targets target`,
      [CREATED_BY],
    );
    if (parentInsert.rowCount !== targets.length || identityInsert.rowCount !== targets.length || childInsert.rowCount !== targets.length) {
      throw new Error(`insert count mismatch: ${JSON.stringify({ parent_inserts: parentInsert.rowCount, identity_inserts: identityInsert.rowCount, child_inserts: childInsert.rowCount })}`);
    }
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from pkg15o_targets) as target_rows,
         (select count(*)::int from public.card_prints cp join pkg15o_targets target on target.target_parent_id = cp.id) as inserted_parent_rows,
         (select count(*)::int from public.card_print_identity cpi join pkg15o_targets target on target.target_parent_id = cpi.card_print_id and cpi.is_active = true) as inserted_identity_rows,
         (select count(*)::int from public.card_printings cpr join pkg15o_targets target on target.target_child_id = cpr.id) as inserted_child_rows`,
      [PACKAGE_ID, fingerprint],
    );
    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      apply_status: 'pkg15o_real_apply_committed',
      guard: guardRow,
      proof: proof.rows[0],
      write_counts: {
        parent_inserts: parentInsert.rowCount,
        identity_inserts: identityInsert.rowCount,
        child_inserts: childInsert.rowCount,
        deletes: 0,
        merges: 0,
      },
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      verification_hash_sha256: sha256(stableJson({
        package_id: PACKAGE_ID,
        package_fingerprint: fingerprint,
        guard: guardRow,
        proof: proof.rows[0],
        after_hash: afterSnapshot.hash_sha256,
      })),
      stop_findings: [],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function renderMarkdown(report) {
  const targetRows = report.scope.targets.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.stamp_label,
    row.target_variant_key,
    row.target_finish_key,
  ]);
  return `# PKG-15O Stamped Review-Ready Real Apply V1

Guarded real apply artifact for five stamped parent identities and reverse child printings.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- global_apply_performed: ${report.global_apply_performed}

## Scope

- parent_inserts: ${report.execution.write_counts.parent_inserts}
- identity_inserts: ${report.execution.write_counts.identity_inserts}
- child_inserts: ${report.execution.write_counts.child_inserts}
- deletes: ${report.execution.write_counts.deletes}
- merges: ${report.execution.write_counts.merges}

## Targets

${markdownTable(['set', 'number', 'name', 'stamp_label', 'variant_key', 'finish'], targetRows)}

## Verification

- apply_status: ${report.execution.apply_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- dry_run_proof_sha256: \`${report.dry_run_proof_sha256}\`
- verification_hash_sha256: \`${report.execution.verification_hash_sha256}\`
- stop_findings: ${report.execution.stop_findings.length}
`;
}

async function main() {
  const dryRun = await readJson(DRY_RUN_JSON);
  const validationFindings = validateDryRun(dryRun);
  const conn = connectionString();
  let execution;
  if (validationFindings.length > 0) {
    execution = {
      apply_status: 'blocked_dry_run_validation_failed',
      write_counts: { parent_inserts: 0, identity_inserts: 0, child_inserts: 0, deletes: 0, merges: 0 },
      stop_findings: validationFindings,
      verification_hash_sha256: null,
    };
  } else if (!conn) {
    execution = {
      apply_status: 'blocked_missing_database_connection',
      write_counts: { parent_inserts: 0, identity_inserts: 0, child_inserts: 0, deletes: 0, merges: 0 },
      stop_findings: ['missing_database_connection'],
      verification_hash_sha256: null,
    };
  } else {
    const client = new Client({ connectionString: conn });
    await client.connect();
    try {
      execution = await applyPackage(client, dryRun.scope.targets, dryRun.package_fingerprint_sha256);
    } finally {
      await client.end().catch(() => {});
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg15o_stamped_review_ready_real_apply_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: dryRun.package_fingerprint_sha256,
    dry_run_proof_sha256: dryRun.execution?.dry_run_proof_sha256 ?? null,
    source_artifact: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
    db_writes_performed: execution.apply_status === 'pkg15o_real_apply_committed',
    durable_db_writes_performed: execution.apply_status === 'pkg15o_real_apply_committed',
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    scope: dryRun.scope,
    execution,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    dry_run_proof_sha256: report.dry_run_proof_sha256,
    apply_status: execution.apply_status,
    verification_hash_sha256: execution.verification_hash_sha256,
    write_counts: execution.write_counts,
    stop_findings: execution.stop_findings,
    migrations_created: report.migrations_created,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
