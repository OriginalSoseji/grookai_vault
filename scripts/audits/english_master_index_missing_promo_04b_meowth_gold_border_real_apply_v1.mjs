import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'meowth_gold_border_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'meowth_gold_border_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'meowth_gold_border_real_apply_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-04B-MEOWTH-GOLD-BORDER-PARENT-CHILD-INSERT';
const CREATED_BY = 'english_master_index_missing_promo_04b_meowth_gold_border_real_apply_v1';
const EXPECTED_FINGERPRINT = '3a6cad8af88898376842fa81661236c570752cd15725d5c03b15b5afb6230986';
const EXPECTED_SQL_HASH = '68abddb89308f90a68f2e16acf9a8740acd5bd3584bab899da169ef07c2b3ca6';
const EXPECTED_DRY_RUN_PROOF_HASH = '0a8f83c7e7c05868bd63c5d761a1b840bf4c3550a189d18c06a88758e0e5bd3c';
const EXPECTED_PRE_APPLY_HASH = '72ee7c3aec09d453bc21bf31b880dbc40fcdd20d51a0e296098b94748c97525b';
const REQUIRED_APPROVAL_TEXT = 'Approve real MISSING-PROMO-04B-MEOWTH-GOLD-BORDER-PARENT-CHILD-INSERT apply only. Fingerprint: 3a6cad8af88898376842fa81661236c570752cd15725d5c03b15b5afb6230986. SQL hash: 68abddb89308f90a68f2e16acf9a8740acd5bd3584bab899da169ef07c2b3ca6. Scope: 1 Jungle Meowth Gold Border parent insert, 1 active identity insert, 1 normal child printing insert; set base2/Jungle; variant_key=gold_border; printed_identity_modifier=gold_border. Dry-run proof: 72ee7c3aec09d453bc21bf31b880dbc40fcdd20d51a0e296098b94748c97525b == 72ee7c3aec09d453bc21bf31b880dbc40fcdd20d51a0e296098b94748c97525b. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No external mapping writes. No pricing writes. No image writes.';

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

function evidencePayload(dryRun) {
  return {
    source_package_id: PACKAGE_ID,
    source_candidate_key: dryRun.target.candidate_key,
    classification: 'misc_promo_special_variant',
    variant_key: dryRun.target.variant_key,
    printed_identity_modifier: dryRun.target.printed_identity_modifier,
    finish_key: dryRun.target.finish_key,
    evidence_urls: dryRun.source_finding.evidence.map((row) => row.source_url),
    evidence_labels: dryRun.source_finding.evidence.map((row) => row.evidence_label),
    preserved_evidence_sources: dryRun.source_finding.evidence.map((row) => row.source_key),
    evidence: dryRun.source_finding.evidence,
  };
}

function validateDryRun(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('fingerprint_mismatch');
  if (dryRun.sql_hash_sha256 !== EXPECTED_SQL_HASH) findings.push('sql_hash_mismatch');
  if (dryRun.pass !== true) findings.push('dry_run_not_passed');
  if (dryRun.execution?.dry_run_status !== 'meowth_gold_border_parent_child_insert_completed_rolled_back_no_durable_change') findings.push('dry_run_status_mismatch');
  if (dryRun.execution?.rollback_verified !== true) findings.push('rollback_not_verified');
  if (dryRun.execution?.dry_run_proof_sha256 !== EXPECTED_DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('before_snapshot_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('after_snapshot_hash_mismatch');
  if ((dryRun.execution?.stop_findings ?? []).length !== 0) findings.push('stop_findings_present');
  if (dryRun.recommended_real_apply_approval_text !== REQUIRED_APPROVAL_TEXT) findings.push('approval_text_mismatch');
  if (dryRun.target?.set_code !== 'base2' || dryRun.target?.card_number !== '56' || dryRun.target?.card_name !== 'Meowth') findings.push('target_identity_mismatch');
  if (dryRun.target?.variant_key !== 'gold_border' || dryRun.target?.printed_identity_modifier !== 'gold_border') findings.push('target_variant_mismatch');
  if (dryRun.target?.finish_key !== 'normal') findings.push('target_finish_mismatch');
  if (dryRun.execution?.simulated_write_counts?.parent_inserts !== 1) findings.push('parent_insert_scope_mismatch');
  if (dryRun.execution?.simulated_write_counts?.identity_inserts !== 1) findings.push('identity_insert_scope_mismatch');
  if (dryRun.execution?.simulated_write_counts?.child_inserts !== 1) findings.push('child_insert_scope_mismatch');
  if (dryRun.execution?.simulated_write_counts?.deletes !== 0 || dryRun.execution?.simulated_write_counts?.merges !== 0) findings.push('delete_or_merge_scope_present');
  if (dryRun.execution?.simulated_write_counts?.external_mapping_writes !== 0) findings.push('external_mapping_write_scope_present');
  if (dryRun.execution?.simulated_write_counts?.pricing_writes !== 0) findings.push('pricing_write_scope_present');
  if (dryRun.execution?.simulated_write_counts?.image_writes !== 0) findings.push('image_write_scope_present');
  return findings;
}

async function captureSnapshot(client, target) {
  const result = await client.query(
    `with target as (
       select $1::uuid as base_parent_id, $2::uuid as target_parent_id, $3::uuid as target_child_id
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
     order by row_type, row_id`,
    [target.base_parent_id, target.target_parent_id, target.target_child_id],
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
  const target = dryRun.target;
  const beforeSnapshot = await captureSnapshot(client, target);
  if (beforeSnapshot.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) {
    throw new Error(`pre-apply snapshot hash mismatch: ${beforeSnapshot.hash_sha256}`);
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const guard = await client.query(
      `with projection as (
         select public.card_print_identity_backfill_projection_v1(
           s.source, base.set_code, s.code, base.number, base.number_plain, base.name,
           $1::text, coalesce(base.printed_total, s.printed_total), coalesce(base.printed_set_abbrev, s.printed_set_abbrev)
         ) as projected
         from public.card_prints base
         left join public.sets s on s.id = base.set_id
         where base.id = $2::uuid
       )
       select
         (select count(*)::int from public.finish_keys where key = $3 and is_active = true) as active_finish_count,
         (select count(*)::int from public.card_prints where id = $4::uuid) as target_parent_collision_count,
         (select count(*)::int from public.card_printings where id = $5::uuid) as target_child_collision_count,
         (select count(*)::int
          from public.card_prints base
          join public.card_prints cp on cp.set_id = base.set_id
           and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number)
           and lower(cp.name) = lower(base.name)
           and (coalesce(cp.variant_key, '') = $1 or coalesce(cp.printed_identity_modifier, '') = $6)
          where base.id = $2::uuid) as same_identity_parent_collision_count,
         (select count(*)::int from projection where projected->>'status' = 'ready') as ready_identity_projection_count,
         (select count(*)::int from projection p join public.card_print_identity cpi
           on cpi.is_active = true
          and cpi.identity_domain = p.projected->>'identity_domain'
          and cpi.identity_key_version = p.projected->>'identity_key_version'
          and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collision_count`,
      [
        target.variant_key,
        target.base_parent_id,
        target.finish_key,
        target.target_parent_id,
        target.target_child_id,
        target.printed_identity_modifier,
      ],
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.active_finish_count !== 1
      || guardRow.target_parent_collision_count !== 0
      || guardRow.target_child_collision_count !== 0
      || guardRow.same_identity_parent_collision_count !== 0
      || guardRow.ready_identity_projection_count !== 1
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
         $1::uuid, base.game_id, base.set_id, base.name, base.number,
         $2::text, base.rarity, null,
         null, coalesce(base.external_ids, '{}'::jsonb) || jsonb_build_object('verified_master_index_v1', $3::jsonb),
         now(), base.set_code, base.artist, base.regulation_mark,
         null, null, base.variants, now(), now(), base.print_identity_key,
         coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'source', 'verified_master_set_index_v1',
           'package_id', $4::text,
           'base_parent_id', base.id::text,
           'variant_key', $2::text,
           'printed_identity_modifier', $5::text,
           'explicit_child_finish_key', $6::text
         ),
         null, base.data_quality_flags, 'representative_shared',
         base.image_res, now(), base.printed_set_abbrev, base.printed_total,
         $7::text,
         null, base.identity_domain, $5::text, base.set_identity_model,
         coalesce(base.representative_image_url, base.image_url),
         'Source-backed Meowth Gold Border promo identity. Representative base image only until exact variant image is available.'
       from public.card_prints base
       where base.id = $8::uuid`,
      [
        target.target_parent_id,
        target.variant_key,
        JSON.stringify(evidencePayload(dryRun)),
        PACKAGE_ID,
        target.printed_identity_modifier,
        target.finish_key,
        target.target_parent_gv_id,
        target.base_parent_id,
      ],
    );

    const identityInsert = await client.query(
      `with projection as (
         select
           cp.id as card_print_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, cp.set_code, s.code, cp.number, cp.number_plain, cp.name, cp.variant_key,
             coalesce(cp.printed_total, s.printed_total), coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from public.card_prints cp
         left join public.sets s on s.id = cp.set_id
         where cp.id = $1::uuid
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
      [target.target_parent_id],
    );

    const childInsert = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, created_at, is_provisional, provenance_source, provenance_ref, created_by,
         printing_gv_id, image_source, image_path, image_url, image_alt_url, image_status, image_note
       )
       values (
         $1::uuid, $2::uuid, $3::text, now(), false, 'verified_master_set_index_v1',
         $4::text, $5::text, $6::text, null, null, null, null, 'representative_shared',
         'Source-backed Meowth Gold Border promo child. Representative image only until exact variant image is available.'
       )`,
      [
        target.target_child_id,
        target.target_parent_id,
        target.finish_key,
        `${target.set_code}:${target.card_number}:${target.variant_key}:${target.finish_key}`,
        CREATED_BY,
        target.target_printing_gv_id,
      ],
    );

    if (parentInsert.rowCount !== 1 || identityInsert.rowCount !== 1 || childInsert.rowCount !== 1) {
      throw new Error(`insert count mismatch: ${JSON.stringify({ parent_inserts: parentInsert.rowCount, identity_inserts: identityInsert.rowCount, child_inserts: childInsert.rowCount })}`);
    }

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from public.card_prints where id = $3::uuid and variant_key = $4 and printed_identity_modifier = $5) as inserted_parent_rows,
         (select count(*)::int from public.card_print_identity where card_print_id = $3::uuid and is_active = true) as inserted_identity_rows,
         (select count(*)::int from public.card_printings where id = $6::uuid and card_print_id = $3::uuid and finish_key = $7) as inserted_child_rows,
         (select count(*)::int from public.card_printings where id = $6::uuid and finish_key = 'stamped') as forbidden_stamped_child_rows,
         (select count(*)::int from public.external_mappings where card_print_id = $3::uuid and active = true) as external_mapping_rows`,
      [
        PACKAGE_ID,
        EXPECTED_FINGERPRINT,
        target.target_parent_id,
        target.variant_key,
        target.printed_identity_modifier,
        target.target_child_id,
        target.finish_key,
      ],
    );

    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, target);
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
  return `# Meowth Gold Border Real Apply V1

Applied the approved Jungle Meowth Gold Border special variant package.

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
