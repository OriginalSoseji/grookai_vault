import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'e3_japanese_back_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'e3_japanese_back_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'e3_japanese_back_real_apply_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-04C-E3-JAPANESE-BACK-PARENT-CHILD-INSERTS';
const CREATED_BY = 'english_master_index_missing_promo_04c_e3_japanese_back_real_apply_v1';
const EXPECTED_FINGERPRINT = 'cd9334d4d64cb920c3ff69dc4166b3beb5171e03b46db1d8058cb93c368003f2';
const EXPECTED_SQL_HASH = 'ef51193a828361d9c56d46ada8f5548b5ac9f99573fc554cfb60fb3b1ec7df42';
const EXPECTED_DRY_RUN_PROOF_HASH = '0710338cb1fc3bfa6acc984ae95b71b3dc5512e5c5d67d3266de451925d60dc1';
const EXPECTED_PRE_APPLY_HASH = '583533f7031eb5c7297642e5d83fa2d64b2bf4f4f6a5610264b3ef5dedb9143a';
const REQUIRED_APPROVAL_TEXT = 'Approve real MISSING-PROMO-04C-E3-JAPANESE-BACK-PARENT-CHILD-INSERTS apply only. Fingerprint: cd9334d4d64cb920c3ff69dc4166b3beb5171e03b46db1d8058cb93c368003f2. SQL hash: ef51193a828361d9c56d46ada8f5548b5ac9f99573fc554cfb60fb3b1ec7df42. Scope: 2 E3 Japanese-back parent inserts, 2 active identity inserts, 2 normal child printing inserts for ecard1/Expedition Hoppip #112 and corrected Pichu #58; variant_key=japanese_card_back; printed_identity_modifier=japanese_card_back; stale Pichu #22 holo candidate excluded. Dry-run proof: 583533f7031eb5c7297642e5d83fa2d64b2bf4f4f6a5610264b3ef5dedb9143a == 583533f7031eb5c7297642e5d83fa2d64b2bf4f4f6a5610264b3ef5dedb9143a. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No external mapping writes. No pricing writes. No image writes.';

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

function validateDryRun(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('fingerprint_mismatch');
  if (dryRun.sql_hash_sha256 !== EXPECTED_SQL_HASH) findings.push('sql_hash_mismatch');
  if (dryRun.pass !== true) findings.push('dry_run_not_passed');
  if (dryRun.execution?.dry_run_status !== 'e3_japanese_back_parent_child_insert_completed_rolled_back_no_durable_change') findings.push('dry_run_status_mismatch');
  if (dryRun.execution?.rollback_verified !== true) findings.push('rollback_not_verified');
  if (dryRun.execution?.dry_run_proof_sha256 !== EXPECTED_DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('before_snapshot_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('after_snapshot_hash_mismatch');
  if ((dryRun.execution?.stop_findings ?? []).length !== 0) findings.push('stop_findings_present');
  if (dryRun.recommended_real_apply_approval_text !== REQUIRED_APPROVAL_TEXT) findings.push('approval_text_mismatch');
  if (dryRun.scope?.target_rows !== 2) findings.push('target_count_mismatch');
  if (dryRun.scope?.by_finish?.normal !== 2) findings.push('finish_scope_mismatch');
  if (dryRun.scope?.by_variant?.japanese_card_back !== 2) findings.push('variant_scope_mismatch');
  if (dryRun.execution?.proof?.stale_pichu_22_rows !== 0) findings.push('stale_pichu_22_present');
  if (dryRun.execution?.simulated_write_counts?.parent_inserts !== 2) findings.push('parent_insert_scope_mismatch');
  if (dryRun.execution?.simulated_write_counts?.identity_inserts !== 2) findings.push('identity_insert_scope_mismatch');
  if (dryRun.execution?.simulated_write_counts?.child_inserts !== 2) findings.push('child_insert_scope_mismatch');
  if (dryRun.execution?.simulated_write_counts?.deletes !== 0 || dryRun.execution?.simulated_write_counts?.merges !== 0) findings.push('delete_or_merge_scope_present');
  if (dryRun.execution?.simulated_write_counts?.external_mapping_writes !== 0) findings.push('external_mapping_write_scope_present');
  if (dryRun.execution?.simulated_write_counts?.pricing_writes !== 0) findings.push('pricing_write_scope_present');
  if (dryRun.execution?.simulated_write_counts?.image_writes !== 0) findings.push('image_write_scope_present');

  const targetKeys = new Set((dryRun.targets ?? []).map((row) => `${row.set_code}:${row.card_number}:${row.card_name}:${row.finish_key}`));
  if (!targetKeys.has('ecard1:112:Hoppip:normal')) findings.push('hoppip_target_missing');
  if (!targetKeys.has('ecard1:58:Pichu:normal')) findings.push('corrected_pichu_58_target_missing');
  if ([...(dryRun.targets ?? [])].some((row) => row.card_name === 'Pichu' && row.card_number === '22')) findings.push('stale_pichu_22_target_present');
  return findings;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(base_parent_id uuid, target_parent_id uuid, target_child_id uuid)
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
     order by row_type, set_code, number_plain nulls last, number, name, row_id`,
    [JSON.stringify(targets.map((target) => ({
      base_parent_id: target.base_parent_id,
      target_parent_id: target.target_parent_id,
      target_child_id: target.target_child_id,
    })))],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    counts: Object.fromEntries(Object.entries(result.rows.reduce((acc, row) => {
      acc[row.row_type] = (acc[row.row_type] ?? 0) + 1;
      return acc;
    }, {})).sort()),
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

async function applyPackage(client, dryRun) {
  const targets = dryRun.targets;
  const beforeSnapshot = await captureSnapshot(client, targets);
  if (beforeSnapshot.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) {
    throw new Error(`pre-apply snapshot hash mismatch: ${beforeSnapshot.hash_sha256}`);
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table e3_japanese_back_targets (
         target_parent_id uuid primary key,
         target_child_id uuid not null,
         base_parent_id uuid not null,
         set_code text not null,
         card_number text not null,
         card_name text not null,
         variant_key text not null,
         printed_identity_modifier text not null,
         finish_key text not null,
         target_parent_gv_id text not null,
         target_printing_gv_id text not null,
         evidence_payload jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into e3_japanese_back_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         base_parent_id uuid,
         set_code text,
         card_number text,
         card_name text,
         variant_key text,
         printed_identity_modifier text,
         finish_key text,
         target_parent_gv_id text,
         target_printing_gv_id text,
         evidence_payload jsonb
       )`,
      [JSON.stringify(targets.map((target) => ({
        target_parent_id: target.target_parent_id,
        target_child_id: target.target_child_id,
        base_parent_id: target.base_parent_id,
        set_code: target.set_code,
        card_number: target.card_number,
        card_name: target.card_name,
        variant_key: target.variant_key,
        printed_identity_modifier: target.printed_identity_modifier,
        finish_key: target.finish_key,
        target_parent_gv_id: target.target_parent_gv_id,
        target_printing_gv_id: target.target_printing_gv_id,
        evidence_payload: target.evidence_payload,
      })))],
    );

    const guard = await client.query(
      `with projection as (
         select target.target_parent_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, base.set_code, s.code, base.number, base.number_plain, base.name,
             target.variant_key, coalesce(base.printed_total, s.printed_total), coalesce(base.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from e3_japanese_back_targets target
         join public.card_prints base on base.id = target.base_parent_id
         left join public.sets s on s.id = base.set_id
       )
       select
         (select count(*)::int from e3_japanese_back_targets) as target_count,
         (select count(distinct target_parent_id)::int from e3_japanese_back_targets) as target_parent_count,
         (select count(distinct target_child_id)::int from e3_japanese_back_targets) as target_child_count,
         (select count(*)::int from e3_japanese_back_targets target join public.card_prints base on base.id = target.base_parent_id) as base_parent_count,
         (select count(*)::int from e3_japanese_back_targets target join public.card_prints base on base.id = target.base_parent_id join public.card_printings cpr on cpr.card_print_id = base.id and cpr.finish_key = target.finish_key) as base_finish_count,
         (select count(*)::int from e3_japanese_back_targets target join public.finish_keys fk on fk.key = target.finish_key and fk.is_active = true) as active_finish_count,
         (select count(*)::int from e3_japanese_back_targets target join public.card_prints cp on cp.id = target.target_parent_id) as target_parent_collision_count,
         (select count(*)::int from e3_japanese_back_targets target join public.card_printings cpr on cpr.id = target.target_child_id) as target_child_collision_count,
         (select count(*)::int from e3_japanese_back_targets target join public.card_prints base on base.id = target.base_parent_id join public.card_prints cp on cp.set_id = base.set_id and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number) and lower(cp.name) = lower(base.name) and (coalesce(cp.variant_key, '') = target.variant_key or coalesce(cp.printed_identity_modifier, '') = target.printed_identity_modifier)) as same_identity_parent_collision_count,
         (select count(*)::int from projection where projected->>'status' = 'ready') as ready_identity_projection_count,
         (select count(*)::int from projection p join public.card_print_identity cpi on cpi.is_active = true and cpi.card_print_id <> p.target_parent_id and cpi.identity_domain = p.projected->>'identity_domain' and cpi.identity_key_version = p.projected->>'identity_key_version' and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collision_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== 2
      || guardRow.target_parent_count !== 2
      || guardRow.target_child_count !== 2
      || guardRow.base_parent_count !== 2
      || guardRow.base_finish_count !== 2
      || guardRow.active_finish_count !== 2
      || guardRow.target_parent_collision_count !== 0
      || guardRow.target_child_collision_count !== 0
      || guardRow.same_identity_parent_collision_count !== 0
      || guardRow.ready_identity_projection_count !== 2
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
         target.variant_key, base.rarity, null,
         null, coalesce(base.external_ids, '{}'::jsonb) || jsonb_build_object('verified_master_index_v1', target.evidence_payload),
         now(), base.set_code, base.artist, base.regulation_mark,
         null, null, base.variants, now(), now(), base.print_identity_key,
         coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'source', 'verified_master_set_index_v1',
           'package_id', $1::text,
           'base_parent_id', base.id::text,
           'variant_key', target.variant_key,
           'printed_identity_modifier', target.printed_identity_modifier,
           'explicit_child_finish_key', target.finish_key
         ),
         null, base.data_quality_flags, 'representative_shared',
         base.image_res, now(), base.printed_set_abbrev, base.printed_total,
         target.target_parent_gv_id,
         null, base.identity_domain, target.printed_identity_modifier, base.set_identity_model,
         coalesce(base.representative_image_url, base.image_url),
         'Source-backed E3 Japanese-back special print. Representative base image only until exact variant image is available.'
       from e3_japanese_back_targets target
       join public.card_prints base on base.id = target.base_parent_id`,
      [PACKAGE_ID],
    );

    const identityInsert = await client.query(
      `with projection as (
         select cp.id as card_print_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, cp.set_code, s.code, cp.number, cp.number_plain, cp.name, cp.variant_key,
             coalesce(cp.printed_total, s.printed_total), coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from e3_japanese_back_targets target
         join public.card_prints cp on cp.id = target.target_parent_id
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
       where projected->>'status' = 'ready'`,
    );

    const childInsert = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, created_at, is_provisional, provenance_source, provenance_ref, created_by,
         printing_gv_id, image_source, image_path, image_url, image_alt_url, image_status, image_note
       )
       select
         target.target_child_id, target.target_parent_id, target.finish_key, now(), false,
         'verified_master_set_index_v1',
         concat(target.set_code, ':', target.card_number, ':', target.variant_key, ':', target.finish_key),
         $1::text,
         target.target_printing_gv_id,
         null, null, null, null, 'representative_shared',
         'Source-backed E3 Japanese-back special print child. Representative image only until exact variant image is available.'
       from e3_japanese_back_targets target`,
      [CREATED_BY],
    );

    if (parentInsert.rowCount !== 2 || identityInsert.rowCount !== 2 || childInsert.rowCount !== 2) {
      throw new Error(`insert count mismatch: ${JSON.stringify({ parent_inserts: parentInsert.rowCount, identity_inserts: identityInsert.rowCount, child_inserts: childInsert.rowCount })}`);
    }

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from e3_japanese_back_targets) as target_rows,
         (select count(*)::int from public.card_prints cp join e3_japanese_back_targets target on target.target_parent_id = cp.id and cp.variant_key = target.variant_key and cp.printed_identity_modifier = target.printed_identity_modifier) as inserted_parent_rows,
         (select count(*)::int from public.card_print_identity cpi join e3_japanese_back_targets target on target.target_parent_id = cpi.card_print_id and cpi.is_active = true) as inserted_identity_rows,
         (select count(*)::int from public.card_printings cpr join e3_japanese_back_targets target on target.target_child_id = cpr.id and cpr.finish_key = target.finish_key) as inserted_child_rows,
         (select count(*)::int from public.card_printings cpr join e3_japanese_back_targets target on target.target_child_id = cpr.id and cpr.finish_key = 'stamped') as forbidden_stamped_child_rows,
         (select count(*)::int from e3_japanese_back_targets where card_name = 'Pichu' and card_number = '22') as stale_pichu_22_rows,
         (select count(*)::int from public.external_mappings em join e3_japanese_back_targets target on target.target_parent_id = em.card_print_id and em.active = true) as external_mapping_rows`,
      [PACKAGE_ID, EXPECTED_FINGERPRINT],
    );

    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      apply_status: 'applied',
      guard: guardRow,
      proof: proof.rows[0],
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      write_counts: {
        parent_inserts: parentInsert.rowCount,
        identity_inserts: identityInsert.rowCount,
        child_inserts: childInsert.rowCount,
        deletes: 0,
        merges: 0,
        external_mapping_writes: 0,
        pricing_writes: 0,
        image_writes: 0,
      },
      post_apply_proof_sha256: sha256(stableJson({
        package_id: PACKAGE_ID,
        package_fingerprint: EXPECTED_FINGERPRINT,
        guard: guardRow,
        proof: proof.rows[0],
        before_hash: beforeSnapshot.hash_sha256,
        after_hash: afterSnapshot.hash_sha256,
      })),
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function renderMarkdown(report) {
  return `# E3 Japanese-Back Real Apply V1

Applied the approved Expedition E3 Japanese-back package.

## Scope

${markdownTable(['field', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.package_fingerprint_sha256],
    ['sql_hash', report.sql_hash_sha256],
    ['parent_inserts', report.execution.write_counts.parent_inserts],
    ['identity_inserts', report.execution.write_counts.identity_inserts],
    ['child_inserts', report.execution.write_counts.child_inserts],
    ['deletes', report.execution.write_counts.deletes],
    ['merges', report.execution.write_counts.merges],
    ['external_mapping_writes', report.execution.write_counts.external_mapping_writes],
    ['pricing_writes', report.execution.write_counts.pricing_writes],
    ['image_writes', report.execution.write_counts.image_writes],
  ])}

## Post-Apply Proof

- apply_status: ${report.execution.apply_status}
- inserted_parent_rows: ${report.execution.proof.inserted_parent_rows}
- inserted_identity_rows: ${report.execution.proof.inserted_identity_rows}
- inserted_child_rows: ${report.execution.proof.inserted_child_rows}
- forbidden_stamped_child_rows: ${report.execution.proof.forbidden_stamped_child_rows}
- stale_pichu_22_rows: ${report.execution.proof.stale_pichu_22_rows}
- external_mapping_rows: ${report.execution.proof.external_mapping_rows}
- post_apply_proof_sha256: \`${report.execution.post_apply_proof_sha256}\`

## Safety

- no global apply
- no migrations
- no deletes
- no merges
- no unsupported cleanup
- no external mapping writes
- no pricing writes
- no image writes
`;
}

async function main() {
  const dryRun = await readJson(DRY_RUN_JSON);
  const findings = validateDryRun(dryRun);
  if (findings.length) throw new Error(`dry-run validation failed: ${findings.join(', ')}`);

  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');

  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  let execution;
  try {
    execution = await applyPackage(client, dryRun);
  } finally {
    await client.end().catch(() => {});
  }

  const report = {
    generated_at: new Date().toISOString(),
    package_id: PACKAGE_ID,
    mode: 'real_apply',
    dry_run_artifact: rel(DRY_RUN_JSON),
    required_approval_text: REQUIRED_APPROVAL_TEXT,
    package_fingerprint_sha256: EXPECTED_FINGERPRINT,
    sql_hash_sha256: EXPECTED_SQL_HASH,
    db_writes_performed: true,
    parent_writes_performed: true,
    identity_writes_performed: true,
    child_writes_performed: true,
    external_mapping_writes_performed: false,
    pricing_writes_performed: false,
    image_writes_performed: false,
    deletes_performed: false,
    merges_performed: false,
    migrations_created: false,
    global_apply_performed: false,
    unsupported_cleanup_performed: false,
    execution,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    apply_status: execution.apply_status,
    proof: execution.proof,
    write_counts: execution.write_counts,
    post_apply_proof_sha256: execution.post_apply_proof_sha256,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
