import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'ancient_mew_misc_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'ancient_mew_misc_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'ancient_mew_misc_real_apply_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-04E-ANCIENT-MEW-MISC-SET-PARENT-CHILD-INSERTS';
const CREATED_BY = 'english_master_index_missing_promo_04e_ancient_mew_misc_real_apply_v1';
const EXPECTED_FINGERPRINT = 'b8078b77231bc0a9c1241412669ace89de0ca62fe43d79a30677d47840a3763b';
const EXPECTED_SQL_HASH = '1b94ebf95b31279f858f161e645d58bdf1f018abd8b6d564fd7c25b5f7ce0595';
const EXPECTED_DRY_RUN_PROOF_HASH = '89dfd2b9d0a3e2c4c536a49f2fc9eb4dec2afaf4aecee76c90538468df9d9cb5';
const EXPECTED_PRE_APPLY_HASH = '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945';
const REQUIRED_APPROVAL_TEXT = 'Approve real MISSING-PROMO-04E-ANCIENT-MEW-MISC-SET-PARENT-CHILD-INSERTS apply only. Fingerprint: b8078b77231bc0a9c1241412669ace89de0ca62fe43d79a30677d47840a3763b. SQL hash: 1b94ebf95b31279f858f161e645d58bdf1f018abd8b6d564fd7c25b5f7ce0595. Scope: 1 misc set insert, 1 Ancient Mew parent insert, 1 active identity insert, 1 cosmos child printing insert; set misc/Miscellaneous Cards & Products; gv_id GV-PK-MISC-001; printing_gv_id GV-PK-MISC-001-COSMOS. Dry-run proof: 89dfd2b9d0a3e2c4c536a49f2fc9eb4dec2afaf4aecee76c90538468df9d9cb5 == 89dfd2b9d0a3e2c4c536a49f2fc9eb4dec2afaf4aecee76c90538468df9d9cb5. No external mappings. No pricing writes. No image writes. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.';

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
  if (dryRun.execution?.dry_run_status !== 'ancient_mew_misc_set_parent_child_insert_completed_rolled_back_no_durable_change') findings.push('dry_run_status_mismatch');
  if (dryRun.execution?.rollback_verified !== true) findings.push('rollback_not_verified');
  if (dryRun.execution?.dry_run_proof_sha256 !== EXPECTED_DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('before_snapshot_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('after_snapshot_hash_mismatch');
  if ((dryRun.execution?.stop_findings ?? []).length !== 0) findings.push('stop_findings_present');
  if (dryRun.recommended_real_apply_approval_text !== REQUIRED_APPROVAL_TEXT) findings.push('approval_text_mismatch');
  if (dryRun.scope?.expected_set_inserts !== 1) findings.push('set_insert_scope_mismatch');
  if (dryRun.scope?.expected_parent_inserts !== 1) findings.push('parent_insert_scope_mismatch');
  if (dryRun.scope?.expected_identity_inserts !== 1) findings.push('identity_insert_scope_mismatch');
  if (dryRun.scope?.expected_child_inserts !== 1) findings.push('child_insert_scope_mismatch');
  if (dryRun.scope?.expected_external_mapping_inserts !== 0) findings.push('external_mapping_scope_mismatch');
  if (dryRun.scope?.target?.set_code !== 'misc') findings.push('set_code_mismatch');
  if (dryRun.scope?.target?.card_name !== 'Ancient Mew') findings.push('card_name_mismatch');
  if (dryRun.scope?.target?.finish_key !== 'cosmos') findings.push('finish_key_mismatch');
  if (dryRun.scope?.target?.gv_id !== 'GV-PK-MISC-001') findings.push('gv_id_mismatch');
  if (dryRun.scope?.target?.printing_gv_id !== 'GV-PK-MISC-001-COSMOS') findings.push('printing_gv_id_mismatch');
  if (dryRun.execution?.simulated_write_counts?.external_mapping_inserts !== 0) findings.push('external_mapping_write_scope_present');
  if (dryRun.execution?.simulated_write_counts?.pricing_writes !== 0) findings.push('pricing_write_scope_present');
  if (dryRun.execution?.simulated_write_counts?.image_writes !== 0) findings.push('image_write_scope_present');
  if (dryRun.execution?.simulated_write_counts?.deletes !== 0) findings.push('delete_scope_present');
  if (dryRun.execution?.simulated_write_counts?.merges !== 0) findings.push('merge_scope_present');
  return findings;
}

async function captureSnapshot(client, target) {
  const result = await client.query(
    `select
       'target_set' as row_type,
       s.id::text as row_id,
       s.code as set_code,
       null::text as card_number,
       s.name,
       null::text as finish_key,
       null::text as gv_id,
       null::text as printing_gv_id,
       null::text as identity_key_hash
     from public.sets s
     where s.id = $1::uuid
        or lower(s.code) = lower($2::text)
        or lower(s.name) = lower($3::text)
     union all
     select
       'target_parent',
       cp.id::text,
       cp.set_code,
       cp.number,
       cp.name,
       null::text,
       cp.gv_id,
       null::text,
       null::text
     from public.card_prints cp
     where cp.id = $4::uuid
        or cp.gv_id = $5::text
        or lower(cp.name) = 'ancient mew'
     union all
     select
       'target_child',
       cpr.id::text,
       cp.set_code,
       cp.number,
       cp.name,
       cpr.finish_key,
       cp.gv_id,
       cpr.printing_gv_id,
       null::text
     from public.card_printings cpr
     join public.card_prints cp on cp.id = cpr.card_print_id
     where cpr.id = $6::uuid
        or cpr.printing_gv_id = $7::text
        or lower(cp.name) = 'ancient mew'
     union all
     select
       'target_identity',
       cpi.id::text,
       cp.set_code,
       cp.number,
       cp.name,
       null::text,
       cp.gv_id,
       null::text,
       cpi.identity_key_hash
     from public.card_print_identity cpi
     join public.card_prints cp on cp.id = cpi.card_print_id
     where cpi.card_print_id = $4::uuid
        or lower(cp.name) = 'ancient mew'
     order by row_type, set_code nulls last, card_number nulls last, name nulls last, finish_key nulls last, row_id`,
    [
      target.set_id,
      target.set_code,
      target.set_name,
      target.parent_id,
      target.gv_id,
      target.child_id,
      target.printing_gv_id,
    ],
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
  const target = dryRun.scope.target;
  const beforeSnapshot = await captureSnapshot(client, target);
  if (beforeSnapshot.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) {
    throw new Error(`pre-apply snapshot hash mismatch: ${beforeSnapshot.hash_sha256}`);
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table ancient_mew_target (
         set_id uuid primary key,
         set_code text not null,
         set_name text not null,
         printed_set_abbrev text not null,
         printed_total int not null,
         set_role text not null,
         identity_domain_default text not null,
         identity_model text not null,
         parent_id uuid not null,
         child_id uuid not null,
         card_name text not null,
         card_number text not null,
         rarity text,
         finish_key text not null,
         gv_id text not null,
         printing_gv_id text not null,
         variant_key text not null,
         printed_identity_modifier text,
         set_source jsonb not null,
         evidence_payload jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into ancient_mew_target
       select *
       from jsonb_to_record($1::jsonb) as t(
         set_id uuid,
         set_code text,
         set_name text,
         printed_set_abbrev text,
         printed_total int,
         set_role text,
         identity_domain_default text,
         identity_model text,
         parent_id uuid,
         child_id uuid,
         card_name text,
         card_number text,
         rarity text,
         finish_key text,
         gv_id text,
         printing_gv_id text,
         variant_key text,
         printed_identity_modifier text,
         set_source jsonb,
         evidence_payload jsonb
       )`,
      [JSON.stringify(target)],
    );

    const guard = await client.query(
      `select
         (select count(*)::int from ancient_mew_target) as target_rows,
         (select count(*)::int from ancient_mew_target t join public.sets s on s.id = t.set_id or lower(s.code) = lower(t.set_code) or lower(s.name) = lower(t.set_name)) as set_collision_count,
         (select count(*)::int from ancient_mew_target t join public.card_prints cp on cp.id = t.parent_id or cp.gv_id = t.gv_id or lower(cp.name) = lower(t.card_name)) as parent_collision_count,
         (select count(*)::int from ancient_mew_target t join public.card_printings cpr on cpr.id = t.child_id or cpr.printing_gv_id = t.printing_gv_id) as child_collision_count,
         (select count(*)::int from ancient_mew_target t join public.finish_keys fk on fk.key = t.finish_key and fk.is_active = true) as active_finish_count,
         (select count(*)::int from ancient_mew_target t where t.set_code = 'misc' and t.card_name = 'Ancient Mew' and t.card_number = '1' and t.finish_key = 'cosmos') as expected_shape_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_rows !== 1
      || guardRow.set_collision_count !== 0
      || guardRow.parent_collision_count !== 0
      || guardRow.child_collision_count !== 0
      || guardRow.active_finish_count !== 1
      || guardRow.expected_shape_count !== 1
    ) {
      throw new Error(`pre-insert guard failed: ${JSON.stringify(guardRow)}`);
    }

    const setInsert = await client.query(
      `insert into public.sets (
         id, game, code, name, source, printed_total, printed_set_abbrev,
         set_role, identity_domain_default, identity_model, created_at, updated_at, last_synced_at
       )
       select
         set_id, 'pokemon', set_code, set_name, set_source, printed_total, printed_set_abbrev,
         set_role, identity_domain_default, identity_model, now(), now(), now()
       from ancient_mew_target`,
    );

    const parentInsert = await client.query(
      `insert into public.card_prints (
         id, set_id, name, number, variant_key, rarity, external_ids,
         updated_at, set_code, variants, created_at, last_synced_at,
         ai_metadata, data_quality_flags, image_status, gv_id,
         identity_domain, printed_identity_modifier, set_identity_model,
         printed_set_abbrev, printed_total, image_note
       )
       select
         parent_id, set_id, card_name, card_number, variant_key, rarity,
         jsonb_build_object('verified_master_index_v1', evidence_payload),
         now(), set_code,
         jsonb_build_object('normal', false, 'holo', false, 'reverse', false, 'cosmos', true, 'firstEdition', false),
         now(), now(),
         evidence_payload,
         jsonb_build_array('source_backed_missing_promo_insert', 'ancient_mew_miscellaneous_movie_promo'),
         'missing',
         gv_id,
         identity_domain_default,
         printed_identity_modifier,
         identity_model,
         printed_set_abbrev,
         printed_total,
         'Source-backed Ancient Mew English movie promo. Exact image deferred.'
       from ancient_mew_target`,
    );

    const projectionGuard = await client.query(
      `with projection as (
         select
           t.parent_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, cp.set_code, s.code, cp.number, cp.number_plain, cp.name, cp.variant_key,
             coalesce(cp.printed_total, s.printed_total), coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from ancient_mew_target t
         join public.card_prints cp on cp.id = t.parent_id
         join public.sets s on s.id = cp.set_id
       )
       select
         (select count(*)::int from projection where projected->>'status' = 'ready') as ready_projection_count,
         (select count(*)::int from projection p join public.card_print_identity cpi on cpi.is_active = true and cpi.card_print_id <> p.parent_id and cpi.identity_domain = p.projected->>'identity_domain' and cpi.identity_key_version = p.projected->>'identity_key_version' and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collision_count`,
    );
    const projectionGuardRow = projectionGuard.rows[0];
    if (projectionGuardRow.ready_projection_count !== 1 || projectionGuardRow.identity_hash_collision_count !== 0) {
      throw new Error(`identity projection guard failed: ${JSON.stringify(projectionGuardRow)}`);
    }

    const identityInsert = await client.query(
      `with projection as (
         select
           t.parent_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, cp.set_code, s.code, cp.number, cp.number_plain, cp.name, cp.variant_key,
             coalesce(cp.printed_total, s.printed_total), coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from ancient_mew_target t
         join public.card_prints cp on cp.id = t.parent_id
         join public.sets s on s.id = cp.set_id
       )
       insert into public.card_print_identity (
         card_print_id, identity_domain, set_code_identity, printed_number,
         normalized_printed_name, source_name_raw, identity_payload,
         identity_key_version, identity_key_hash
       )
       select
         parent_id,
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
         id, card_print_id, finish_key, created_at, is_provisional,
         provenance_source, provenance_ref, created_by,
         printing_gv_id, image_status, image_note
       )
       select
         child_id, parent_id, finish_key, now(), false,
         'verified_master_set_index_v1',
         concat(set_code, ':', card_number, ':ancient_mew:', finish_key),
         $1::text,
         printing_gv_id,
         'missing',
         'Source-backed Ancient Mew cosmos child. Exact image deferred.'
       from ancient_mew_target`,
      [CREATED_BY],
    );

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from ancient_mew_target) as target_rows,
         (select count(*)::int from public.sets s join ancient_mew_target t on t.set_id = s.id and s.code = t.set_code) as inserted_set_rows,
         (select count(*)::int from public.card_prints cp join ancient_mew_target t on t.parent_id = cp.id and cp.gv_id = t.gv_id) as inserted_parent_rows,
         (select count(*)::int from public.card_print_identity cpi join ancient_mew_target t on t.parent_id = cpi.card_print_id and cpi.is_active = true) as inserted_identity_rows,
         (select count(*)::int from public.card_printings cpr join ancient_mew_target t on t.child_id = cpr.id and cpr.finish_key = t.finish_key and cpr.printing_gv_id = t.printing_gv_id) as inserted_child_rows,
         (select count(*)::int from public.external_mappings em join ancient_mew_target t on t.parent_id = em.card_print_id) as external_mapping_rows,
         (select count(*)::int from public.card_printings cpr join ancient_mew_target t on t.child_id = cpr.id where cpr.finish_key = 'cosmos') as matching_cosmos_child_rows`,
      [PACKAGE_ID, EXPECTED_FINGERPRINT],
    );
    const proofRow = proof.rows[0];
    if (
      setInsert.rowCount !== 1
      || parentInsert.rowCount !== 1
      || identityInsert.rowCount !== 1
      || childInsert.rowCount !== 1
      || proofRow.inserted_set_rows !== 1
      || proofRow.inserted_parent_rows !== 1
      || proofRow.inserted_identity_rows !== 1
      || proofRow.inserted_child_rows !== 1
      || proofRow.external_mapping_rows !== 0
      || proofRow.matching_cosmos_child_rows !== 1
    ) {
      throw new Error(`proof failed: ${JSON.stringify({ proof: proofRow, setInsert: setInsert.rowCount, parentInsert: parentInsert.rowCount, identityInsert: identityInsert.rowCount, childInsert: childInsert.rowCount })}`);
    }

    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, target);
    return {
      apply_status: 'applied',
      guard: guardRow,
      projection_guard: projectionGuardRow,
      proof: proofRow,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      write_counts: {
        set_inserts: setInsert.rowCount,
        parent_inserts: parentInsert.rowCount,
        identity_inserts: identityInsert.rowCount,
        child_inserts: childInsert.rowCount,
        external_mapping_inserts: 0,
        pricing_writes: 0,
        image_writes: 0,
        deletes: 0,
        merges: 0,
      },
      post_apply_proof_sha256: sha256(stableJson({
        package_id: PACKAGE_ID,
        package_fingerprint: EXPECTED_FINGERPRINT,
        guard: guardRow,
        projection_guard: projectionGuardRow,
        proof: proofRow,
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
  return `# Ancient Mew Misc Real Apply V1

Applied the approved Ancient Mew miscellaneous promo package.

## Scope

${markdownTable(['field', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.package_fingerprint_sha256],
    ['sql_hash', report.sql_hash_sha256],
    ['set_inserts', report.execution.write_counts.set_inserts],
    ['parent_inserts', report.execution.write_counts.parent_inserts],
    ['identity_inserts', report.execution.write_counts.identity_inserts],
    ['child_inserts', report.execution.write_counts.child_inserts],
    ['external_mapping_inserts', report.execution.write_counts.external_mapping_inserts],
    ['pricing_writes', report.execution.write_counts.pricing_writes],
    ['image_writes', report.execution.write_counts.image_writes],
    ['deletes', report.execution.write_counts.deletes],
    ['merges', report.execution.write_counts.merges],
  ])}

## Post-Apply Proof

- apply_status: ${report.execution.apply_status}
- inserted_set_rows: ${report.execution.proof.inserted_set_rows}
- inserted_parent_rows: ${report.execution.proof.inserted_parent_rows}
- inserted_identity_rows: ${report.execution.proof.inserted_identity_rows}
- inserted_child_rows: ${report.execution.proof.inserted_child_rows}
- external_mapping_rows: ${report.execution.proof.external_mapping_rows}
- matching_cosmos_child_rows: ${report.execution.proof.matching_cosmos_child_rows}
- post_apply_proof_sha256: \`${report.execution.post_apply_proof_sha256}\`

## Safety

- no external mappings
- no pricing writes
- no image writes
- no global apply
- no migrations
- no deletes
- no merges
- no unsupported cleanup
- Japanese Exclusive Print and Nintedo/error variants remain excluded.
`;
}

async function main() {
  const dryRun = await readJson(DRY_RUN_JSON);
  const findings = validateDryRun(dryRun);
  if (findings.length) throw new Error(`dry-run validation failed: ${findings.join(', ')}`);

  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  });
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
    set_writes_performed: true,
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
