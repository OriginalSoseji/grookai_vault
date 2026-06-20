import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'nested_provenance_finish_child_insert_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'nested_provenance_finish_child_insert_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'nested_provenance_finish_child_insert_real_apply_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-04N-NESTED-PROVENANCE-FINISH-CHILD-INSERTS';
const CREATED_BY = 'english_master_index_missing_promo_04n_nested_provenance_finish_child_insert_real_apply_v1';
const APPROVED_FINGERPRINT = 'fd26d97363c7f238a689d55e3457b7673b4ff2fdd88a26ed49cb5ef47e57f2bb';
const APPROVED_SQL_HASH = '361bf3d975b7e45793f11a0d740c22390551c69ae9017e52123f866a5af4d274';
const APPROVED_DRY_RUN_PROOF = 'a00e3f14f5ab95405bff31f779be197d7ded20c4d47de5f0a8f58f4504cb79f8';

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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function assertApproved(dryRun) {
  const errors = [];
  if (dryRun.package_id !== PACKAGE_ID) errors.push(`package_id mismatch ${dryRun.package_id}`);
  if (dryRun.package_fingerprint_sha256 !== APPROVED_FINGERPRINT) errors.push('fingerprint mismatch');
  if (dryRun.sql_hash_sha256 !== APPROVED_SQL_HASH) errors.push('sql hash mismatch');
  if (dryRun.dry_run_proof_sha256 !== APPROVED_DRY_RUN_PROOF) errors.push('dry-run proof mismatch');
  if (dryRun.summary?.target_count !== 1) errors.push('target count mismatch');
  if (dryRun.summary?.by_finish?.reverse !== 1) errors.push('finish scope mismatch');
  if (dryRun.summary?.durable_after_snapshot_matches_before_snapshot !== true) errors.push('rollback proof did not match before snapshot');
  if (dryRun.summary?.transient_after_snapshot_differs_from_before_snapshot !== true) errors.push('transient dry-run did not differ from before snapshot');
  if (dryRun.guard?.existing_finish_collision_count !== 0) errors.push('dry-run guard had existing finish collision');
  if (dryRun.guard?.forbidden_stamped_finish_count !== 0) errors.push('dry-run guard had forbidden stamped finish');
  if (errors.length) throw new Error(`Approved dry-run artifact check failed: ${errors.join('; ')}`);
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(parent_id uuid, target_child_id uuid, finish_key text, printing_gv_id text)
     )
     select 'target_parent' as row_type, cp.id::text as row_id, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id, null::text as finish_key, null::text as printing_gv_id
     from target t
     join public.card_prints cp on cp.id = t.parent_id
     union all
     select 'target_child', cpr.id::text, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id, cpr.finish_key, cpr.printing_gv_id
     from target t
     join public.card_printings cpr on cpr.card_print_id = t.parent_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select 'active_identity', cpi.id::text, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id, null::text, null::text
     from target t
     join public.card_print_identity cpi on cpi.card_print_id = t.parent_id and cpi.is_active = true
     join public.card_prints cp on cp.id = cpi.card_print_id
     order by row_type, set_code, number, name, variant_key nulls first, finish_key nulls first, row_id`,
    [JSON.stringify(targets.map((target) => ({
      parent_id: target.parent_id,
      target_child_id: target.target_child_id,
      finish_key: target.finish_key,
      printing_gv_id: target.printing_gv_id,
    })))],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    counts: countBy(result.rows, (row) => row.row_type),
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

async function runApply(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table nested_provenance_finish_child_targets (
         parent_id uuid primary key,
         target_child_id uuid not null unique,
         finish_key text not null,
         printing_gv_id text not null unique,
         set_code text not null,
         number text not null,
         name text not null,
         variant_key text,
         printed_identity_modifier text,
         family text not null,
         evidence_mode text not null,
         provenance jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into nested_provenance_finish_child_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         parent_id uuid,
         target_child_id uuid,
         finish_key text,
         printing_gv_id text,
         set_code text,
         number text,
         name text,
         variant_key text,
         printed_identity_modifier text,
         family text,
         evidence_mode text,
         provenance jsonb
       )`,
      [JSON.stringify(targets)],
    );

    const guard = await client.query(
      `select
         (select count(*)::int from nested_provenance_finish_child_targets) as target_count,
         (select count(distinct parent_id)::int from nested_provenance_finish_child_targets) as parent_count,
         (select count(distinct target_child_id)::int from nested_provenance_finish_child_targets) as child_id_count,
         (select count(distinct printing_gv_id)::int from nested_provenance_finish_child_targets) as printing_gv_id_count,
         (select count(*)::int from nested_provenance_finish_child_targets t left join public.card_prints cp on cp.id = t.parent_id where cp.id is null) as missing_parent_count,
         (select count(*)::int from nested_provenance_finish_child_targets t left join public.finish_keys fk on fk.key = t.finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int from nested_provenance_finish_child_targets t join public.card_printings cpr on cpr.id = t.target_child_id) as child_id_collision_count,
         (select count(*)::int from nested_provenance_finish_child_targets t join public.card_printings cpr on cpr.printing_gv_id = t.printing_gv_id) as printing_gv_id_collision_count,
         (select count(*)::int from nested_provenance_finish_child_targets t join public.card_printings cpr on cpr.card_print_id = t.parent_id and cpr.finish_key = t.finish_key) as existing_finish_collision_count,
         (select count(*)::int from nested_provenance_finish_child_targets t join public.card_print_identity cpi on cpi.card_print_id = t.parent_id and cpi.is_active = true) as active_identity_count,
         (select count(*)::int from nested_provenance_finish_child_targets where finish_key = 'stamped') as forbidden_stamped_finish_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== targets.length
      || guardRow.parent_count !== targets.length
      || guardRow.child_id_count !== targets.length
      || guardRow.printing_gv_id_count !== targets.length
      || guardRow.missing_parent_count !== 0
      || guardRow.inactive_finish_count !== 0
      || guardRow.child_id_collision_count !== 0
      || guardRow.printing_gv_id_collision_count !== 0
      || guardRow.existing_finish_collision_count !== 0
      || guardRow.active_identity_count !== targets.length
      || guardRow.forbidden_stamped_finish_count !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
    }

    const insertResult = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, created_at, is_provisional, provenance_source, provenance_ref, created_by,
         printing_gv_id, image_source, image_path, image_url, image_alt_url, image_status, image_note
       )
       select
         target_child_id,
         parent_id,
         finish_key,
         now(),
         false,
         'verified_master_index_v1',
         concat(set_code, ':', number, ':', coalesce(nullif(variant_key, ''), printed_identity_modifier, family), ':', finish_key),
         $1::text,
         printing_gv_id,
         null, null, null, null,
         null,
         concat('Child printing completed from nested provenance exact finish evidence: ', evidence_mode)
       from nested_provenance_finish_child_targets
       order by set_code, number, name
       returning id::text, card_print_id::text, finish_key, printing_gv_id`,
      [CREATED_BY],
    );
    if (insertResult.rowCount !== targets.length) throw new Error(`insert count mismatch: ${insertResult.rowCount}`);

    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      beforeSnapshot,
      afterSnapshot,
      guard: guardRow,
      inserted_rows: insertResult.rows,
    };
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback cleanup failure
    }
    throw error;
  }
}

function renderMarkdown(report) {
  return [
    '# Nested Provenance Finish Child Insert Real Apply V1',
    '',
    `Apply status: **${report.apply_status}**`,
    '',
    markdownTable(
      ['metric', 'value'],
      [
        ['target_count', report.summary.target_count],
        ['inserted_child_rows', report.summary.inserted_child_rows],
        ['matching_post_apply_child_rows', report.summary.matching_post_apply_child_rows],
        ['package_fingerprint_sha256', report.package_fingerprint_sha256],
        ['sql_hash_sha256', report.sql_hash_sha256],
        ['post_apply_proof_sha256', report.post_apply_proof_sha256],
      ],
    ),
    '',
    '## Applied Rows',
    '',
    markdownTable(
      ['set', 'number', 'name', 'variant/modifier', 'finish', 'printing_gv_id'],
      report.targets.map((target) => [
        target.set_code,
        target.number,
        target.name,
        target.variant_key || target.printed_identity_modifier || target.family,
        target.finish_key,
        target.printing_gv_id,
      ]),
    ),
    '',
    'No parent writes, identity writes, external mapping writes, pricing writes, image writes, deletes, merges, migrations, unsupported cleanup, or global apply were performed.',
    '',
  ].join('\n');
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');
  const dryRun = await readJson(DRY_RUN_JSON);
  assertApproved(dryRun);
  const targets = dryRun.targets;

  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try {
    const applyResult = await runApply(client, targets);
    const matchingRows = applyResult.afterSnapshot.rows.filter((row) => row.row_type === 'target_child' && targets.some((target) => target.target_child_id === row.row_id));
    const report = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      mode: 'real_apply',
      apply_status: 'applied',
      input_artifacts: {
        nested_provenance_finish_child_insert_guarded_dry_run: rel(DRY_RUN_JSON),
      },
      package_fingerprint_sha256: dryRun.package_fingerprint_sha256,
      sql_hash_sha256: dryRun.sql_hash_sha256,
      approved_dry_run_proof_sha256: dryRun.dry_run_proof_sha256,
      targets,
      summary: {
        target_count: targets.length,
        inserted_child_rows: applyResult.inserted_rows.length,
        matching_post_apply_child_rows: matchingRows.length,
        by_finish: countBy(targets, (target) => target.finish_key),
        by_family: countBy(targets, (target) => target.family),
      },
      guard: applyResult.guard,
      inserted_rows: applyResult.inserted_rows,
      before_snapshot: applyResult.beforeSnapshot,
      after_snapshot: applyResult.afterSnapshot,
      post_apply_proof_sha256: applyResult.afterSnapshot.hash_sha256,
      db_writes_performed: true,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      global_apply_performed: false,
      parent_writes_performed: false,
      identity_writes_performed: false,
      external_mapping_writes_performed: false,
      pricing_writes_performed: false,
      image_writes_performed: false,
      deletes_performed: false,
      merges_performed: false,
      unsupported_cleanup_performed: false,
    };

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, `${renderMarkdown(report)}\n`);

    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      apply_status: report.apply_status,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      sql_hash_sha256: report.sql_hash_sha256,
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
      summary: report.summary,
      post_apply_proof_sha256: report.post_apply_proof_sha256,
      migrations_created: false,
      parent_writes_performed: false,
      identity_writes_performed: false,
      deletes_performed: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
