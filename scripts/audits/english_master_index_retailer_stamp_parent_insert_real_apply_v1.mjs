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
const DRY_RUN_JSON = path.join(
  AUDIT_DIR,
  'retailer_stamp_active_finish_route_v1',
  'retailer_stamp_parent_insert_guarded_dry_run_v1.json',
);
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  'retailer_stamp_active_finish_route_v1',
  'retailer_stamp_parent_insert_real_apply_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  'retailer_stamp_active_finish_route_v1',
  'retailer_stamp_parent_insert_real_apply_v1.md',
);

const PACKAGE_ID = 'RETAILER-STAMP-02-PARENT-IDENTITY-INSERTS';
const CREATED_BY = 'retailer_stamp_parent_insert_real_apply_v1';
const EXPECTED_PACKAGE_FINGERPRINT = '758040a7745516be0d173b7bed581ffd78b7f0c23ef7c0c4537f3cbe3fd76156';
const EXPECTED_DRY_RUN_PROOF = 'ce4c07f9f938f7c99bf589458b2c5123c324765b3c300796389d15c267c791c5';
const EXPECTED_PRE_APPLY_HASH = 'c289be527678890672120c45d44cea3400ce2a1b6635cb41a29a30b740480b48';
const EXPECTED_TARGET_COUNT = 14;

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
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_id_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_PACKAGE_FINGERPRINT) findings.push('dry_run_package_fingerprint_mismatch');
  if (dryRun.execution?.dry_run_status !== 'retailer_stamp_parent_insert_completed_rolled_back_no_durable_change') findings.push('dry_run_status_not_passed');
  if (dryRun.execution?.rollback_verified !== true) findings.push('dry_run_rollback_not_verified');
  if (dryRun.execution?.dry_run_proof_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_proof_mismatch');
  if ((dryRun.execution?.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  const counts = dryRun.execution?.simulated_write_counts ?? {};
  if (counts.parent_inserts !== EXPECTED_TARGET_COUNT) findings.push('dry_run_parent_insert_scope_mismatch');
  if (counts.identity_inserts !== EXPECTED_TARGET_COUNT) findings.push('dry_run_identity_insert_scope_mismatch');
  if (counts.child_inserts !== EXPECTED_TARGET_COUNT) findings.push('dry_run_child_insert_scope_mismatch');
  if (counts.deletes !== 0 || counts.merges !== 0) findings.push('dry_run_delete_or_merge_scope_present');
  if (dryRun.db_writes_performed !== false || dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_write');
  if (dryRun.migrations_created !== false || dryRun.cleanup_performed !== false || dryRun.quarantine_performed !== false) findings.push('dry_run_reports_forbidden_action');
  if ((dryRun.scope?.targets ?? []).length !== EXPECTED_TARGET_COUNT) findings.push('dry_run_targets_not_expected_count');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('dry_run_before_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('dry_run_after_rollback_hash_mismatch');
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

async function applyPackage(client, targets, expectedMissingBaseFinishCount) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  if (beforeSnapshot.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) {
    throw new Error(`pre-apply snapshot hash mismatch: ${beforeSnapshot.hash_sha256}`);
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table retailer_stamp_targets (
         target_parent_id uuid primary key,
         target_child_id uuid not null,
         base_parent_id uuid not null,
         set_key text not null,
         card_number text not null,
         card_name text not null,
         target_finish_key text not null,
         target_variant_key text not null,
         target_printed_identity_modifier text not null,
         stamp_label text not null,
         evidence jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into retailer_stamp_targets
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
             s.source, base.set_code, s.code, base.number, base.number_plain, base.name,
             target.target_variant_key, coalesce(base.printed_total, s.printed_total), coalesce(base.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from retailer_stamp_targets target
         join public.card_prints base on base.id = target.base_parent_id
         left join public.sets s on s.id = base.set_id
       )
       select
         (select count(*)::int from retailer_stamp_targets) as target_count,
         (select count(distinct target_parent_id)::int from retailer_stamp_targets) as target_parent_count,
         (select count(distinct target_child_id)::int from retailer_stamp_targets) as target_child_count,
         (select count(*)::int from retailer_stamp_targets target left join public.card_prints base on base.id = target.base_parent_id where base.id is null) as missing_base_count,
         (select count(*)::int from retailer_stamp_targets target left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int from retailer_stamp_targets target join public.card_prints base on base.id = target.base_parent_id left join public.card_printings base_child on base_child.card_print_id = base.id and base_child.finish_key = target.target_finish_key where base_child.id is null) as missing_base_finish_count,
         (select count(*)::int from retailer_stamp_targets target join public.card_prints base on base.id = target.base_parent_id join public.card_prints cp on cp.set_id = base.set_id and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number) and lower(cp.name) = lower(base.name) and coalesce(cp.variant_key, '') = target.target_variant_key) as parent_collision_count,
         (select count(*)::int from retailer_stamp_targets target join public.card_printings cpr on cpr.id = target.target_child_id) as child_collision_count,
         (select count(*)::int from retailer_stamp_targets target join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true) as identity_target_collision_count,
         (select count(*)::int from projection where projected->>'status' = 'ready') as ready_identity_projection_count,
         (select count(*)::int from projection p join public.card_print_identity cpi on cpi.is_active = true and cpi.card_print_id <> p.target_parent_id and cpi.identity_domain = p.projected->>'identity_domain' and cpi.identity_key_version = p.projected->>'identity_key_version' and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collision_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== targets.length
      || guardRow.target_parent_count !== targets.length
      || guardRow.target_child_count !== targets.length
      || guardRow.missing_base_count !== 0
      || guardRow.inactive_finish_count !== 0
      || guardRow.missing_base_finish_count !== expectedMissingBaseFinishCount
      || guardRow.parent_collision_count !== 0
      || guardRow.child_collision_count !== 0
      || guardRow.identity_target_collision_count !== 0
      || guardRow.ready_identity_projection_count !== targets.length
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
           'stamp_label', target.stamp_label,
           'variant_key', target.target_variant_key,
           'explicit_child_finish_key', target.target_finish_key
         ),
         null, base.data_quality_flags, 'representative_shared_stamp',
         base.image_res, now(), base.printed_set_abbrev, base.printed_total,
         concat('GV-PK-', upper(regexp_replace(coalesce(base.printed_set_abbrev, base.set_code), '[^A-Za-z0-9]+', '-', 'g')), '-', base.number_plain, '-', upper(regexp_replace(target.target_variant_key, '[^A-Za-z0-9]+', '-', 'g'))),
         null, base.identity_domain, target.target_printed_identity_modifier, base.set_identity_model,
         coalesce(base.representative_image_url, base.image_url),
         concat('Stamped canonical identity: ', target.stamp_label, '. Representative base image only until exact stamped image is available.')
       from retailer_stamp_targets target
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
         from retailer_stamp_targets target
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
         concat(target.set_key, ':', target.card_number, ':retailer_stamp:', target.target_variant_key, ':', target.target_finish_key),
         $1::text,
         null, null, null, null, null,
         'representative_shared_stamp',
         concat('Retailer stamped identity child finish routed from source-backed evidence: ', target.target_finish_key)
       from retailer_stamp_targets target`,
      [CREATED_BY],
    );

    if (parentInsert.rowCount !== targets.length || identityInsert.rowCount !== targets.length || childInsert.rowCount !== targets.length) {
      throw new Error(`insert count mismatch: ${JSON.stringify({ parent_inserts: parentInsert.rowCount, identity_inserts: identityInsert.rowCount, child_inserts: childInsert.rowCount })}`);
    }

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from retailer_stamp_targets) as target_rows,
         (select count(*)::int from public.card_prints cp join retailer_stamp_targets target on target.target_parent_id = cp.id) as inserted_parent_rows,
         (select count(*)::int from public.card_prints cp join retailer_stamp_targets target on target.target_parent_id = cp.id and cp.printed_identity_modifier = target.target_printed_identity_modifier) as inserted_parent_modifier_rows,
         (select count(*)::int from public.card_print_identity cpi join retailer_stamp_targets target on target.target_parent_id = cpi.card_print_id and cpi.is_active = true) as inserted_identity_rows,
         (select count(*)::int from public.card_printings cpr join retailer_stamp_targets target on target.target_child_id = cpr.id) as inserted_child_rows,
         (select count(*)::int from public.card_printings cpr join retailer_stamp_targets target on target.target_child_id = cpr.id and cpr.finish_key = 'stamped') as forbidden_stamped_child_rows`,
      [PACKAGE_ID, EXPECTED_PACKAGE_FINGERPRINT],
    );

    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      apply_status: 'retailer_stamp_parent_insert_applied',
      guard: guardRow,
      proof: proof.rows[0],
      write_counts: { parent_inserts: parentInsert.rowCount, identity_inserts: identityInsert.rowCount, child_inserts: childInsert.rowCount, deletes: 0, merges: 0 },
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      post_apply_verified: afterSnapshot.counts.target_parent === targets.length
        && afterSnapshot.counts.target_identity === targets.length
        && afterSnapshot.counts.target_child === targets.length
        && Number(proof.rows[0].forbidden_stamped_child_rows) === 0,
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
    row.base_parent_id,
  ]);
  return `# Retailer Stamp Parent Insert Real Apply V1

Real apply for the approved Build-A-Bear Workshop and Toys R Us stamped parent identity insert package.

## Safety

- package_id: ${report.package_id}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- dry_run_proof_sha256: \`${report.dry_run_proof_sha256}\`
- migrations_created: ${report.migrations_created}
- global_apply_performed: ${report.global_apply_performed}
- deletes_performed: ${report.execution.write_counts.deletes}
- merges_performed: ${report.execution.write_counts.merges}
- post_apply_verified: ${report.execution.post_apply_verified}

## Scope

- parent_inserts: ${report.execution.write_counts.parent_inserts}
- identity_inserts: ${report.execution.write_counts.identity_inserts}
- child_inserts: ${report.execution.write_counts.child_inserts}

## Targets

${markdownTable(['set', 'number', 'name', 'stamp_label', 'variant_key', 'finish', 'base_parent_id'], targetRows)}

## Result

- apply_status: ${report.execution.apply_status}
- forbidden_stamped_child_rows: ${report.execution.proof.forbidden_stamped_child_rows}
- target_rows: ${report.execution.proof.target_rows}
- inserted_parent_rows: ${report.execution.proof.inserted_parent_rows}
- inserted_identity_rows: ${report.execution.proof.inserted_identity_rows}
- inserted_child_rows: ${report.execution.proof.inserted_child_rows}

## Deferred Rows

The five blocked XY-era retailer-stamp rows remain excluded for a separate base-parent resolution pass.
`;
}

async function main() {
  const dryRun = await readJson(DRY_RUN_JSON);
  const validationFindings = validateDryRun(dryRun);
  const targets = dryRun.scope?.targets ?? [];
  const expectedMissingBaseFinishCount = dryRun.scope?.source_unique_active_finish_rows ?? 0;
  const conn = connectionString();
  if (validationFindings.length > 0) throw new Error(`dry-run validation failed: ${validationFindings.join(', ')}`);
  if (!conn) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');

  const client = new Client({ connectionString: conn });
  await client.connect();
  let execution;
  try {
    execution = await applyPackage(client, targets, expectedMissingBaseFinishCount);
  } finally {
    await client.end().catch(() => {});
  }

  const report = {
    generated_at: new Date().toISOString(),
    version: 'retailer_stamp_parent_insert_real_apply_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: EXPECTED_PACKAGE_FINGERPRINT,
    dry_run_proof_sha256: EXPECTED_DRY_RUN_PROOF,
    source_artifact: rel(DRY_RUN_JSON),
    migrations_created: false,
    global_apply_performed: false,
    cleanup_performed: false,
    quarantine_performed: false,
    scope: dryRun.scope,
    execution,
  };
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: rel(OUTPUT_JSON),
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    apply_status: execution.apply_status,
    post_apply_verified: execution.post_apply_verified,
    write_counts: execution.write_counts,
    proof: execution.proof,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
