import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_pokumon_detail_finish_readiness_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pokumon_detail_parent_insert_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pokumon_detail_parent_insert_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pokumon_detail_parent_insert_real_apply_v1.md');

const PACKAGE_ID = 'POKUMON-DETAIL-PARENT-INSERTS';
const CREATED_BY = 'english_master_index_pokumon_detail_parent_insert_real_apply_v1';
const EXPECTED_PACKAGE_FINGERPRINT = 'd8dba1ac6b247dd860107630743f1a0e6af2734d569bb63ef11c7d2b018e41a0';
const EXPECTED_DRY_RUN_PROOF = 'f747a15c0c18916645906540f0338d549d9ade5a3f1128f94a981cdb902f2b73';
const EXPECTED_PRE_APPLY_HASH = '28394d00a5419a9acb784c3953e06b9c563a6f282d0fcd68aa57807130ddd012';
const EXPECTED_PARENT_COUNT = 22;
const EXPECTED_CHILD_COUNT = 23;
const APPROVAL_TEXT = 'Approve real POKUMON-DETAIL-PARENT-INSERTS apply only. Fingerprint: d8dba1ac6b247dd860107630743f1a0e6af2734d569bb63ef11c7d2b018e41a0. Scope: 22 stamped/special parent inserts, 22 active identity inserts, 23 child printing inserts; finishes reverse=17 and normal=6; no deletes, no merges, no migrations, no global apply, no unsupported cleanup. Dry-run proof: f747a15c0c18916645906540f0338d549d9ade5a3f1128f94a981cdb902f2b73.';

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
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
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

function validateDryRunArtifact(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (dryRun.fingerprint_sha256 !== EXPECTED_PACKAGE_FINGERPRINT) findings.push('package_fingerprint_mismatch');
  if (dryRun.dry_run?.dry_run_proof_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_proof_mismatch');
  if (dryRun.summary?.dry_run_status !== 'completed_rolled_back_no_durable_change') findings.push('dry_run_status_not_clean');
  if (dryRun.summary?.rollback_verified !== true) findings.push('rollback_not_verified');
  if (dryRun.summary?.write_ready_for_approval !== true) findings.push('write_ready_flag_not_true');
  if (dryRun.summary?.parent_insert_scope !== EXPECTED_PARENT_COUNT) findings.push('parent_scope_mismatch');
  if (dryRun.summary?.identity_insert_scope !== EXPECTED_PARENT_COUNT) findings.push('identity_scope_mismatch');
  if (dryRun.summary?.child_insert_scope !== EXPECTED_CHILD_COUNT) findings.push('child_scope_mismatch');
  if ((dryRun.parents ?? []).length !== EXPECTED_PARENT_COUNT) findings.push('parent_row_count_mismatch');
  if ((dryRun.targets ?? []).length !== EXPECTED_CHILD_COUNT) findings.push('target_row_count_mismatch');
  if (dryRun.dry_run?.before_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('before_snapshot_hash_mismatch');
  if (dryRun.dry_run?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('after_rollback_snapshot_hash_mismatch');
  if ((dryRun.dry_run?.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.safety?.db_writes_performed !== false || dryRun.safety?.durable_db_writes_performed !== false) findings.push('dry_run_reports_writes');
  if (dryRun.safety?.migrations_created !== false || dryRun.safety?.cleanup_performed !== false) findings.push('dry_run_reports_forbidden_action');
  return findings;
}

function variantSuffix(variantKey) {
  const cleaned = String(variantKey ?? 'variant').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  return cleaned.length <= 28 ? cleaned : `${cleaned.slice(0, 20)}-${sha256(cleaned).slice(0, 7).toUpperCase()}`;
}

function finishSuffix(finishKey) {
  return {
    normal: 'STD',
    holo: 'HOLO',
    reverse: 'RH',
    cosmos: 'COSMOS',
    cracked_ice: 'CRACKED',
  }[finishKey] ?? String(finishKey ?? 'UNK').toUpperCase().replace(/[^A-Z0-9]+/g, '-');
}

function buildTargets(readiness) {
  return (readiness.future_guarded_parent_identity_insert_candidates ?? [])
    .map((row) => ({
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
      base_parent_id: row.base_parent_id,
      base_gv_id: row.base_gv_id,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      target_finish_key: row.finish_key,
      target_variant_key: row.variant_key,
      target_printed_identity_modifier: row.variant_key,
      stamp_label: row.stamp_label,
      target_gv_id: `${row.base_gv_id}-${variantSuffix(row.variant_key)}`,
      target_printing_gv_id: `${row.base_gv_id}-${variantSuffix(row.variant_key)}-${finishSuffix(row.finish_key)}`,
      source_urls: row.source_urls ?? [],
      evidence: {
        readiness_package_id: readiness.package_id,
        readiness_fingerprint_sha256: readiness.fingerprint_sha256,
        source_artifact: readiness.source_artifact,
        source_fingerprint_sha256: readiness.source_fingerprint_sha256,
        evidence: row.evidence ?? [],
        source_urls: row.source_urls ?? [],
        stamp_label: row.stamp_label,
        variant_key: row.variant_key,
        active_child_finish_key: row.finish_key,
        evidence_label: 'Pokumon detail page parsed exact finish class for stamped/special variant candidate',
      },
    }))
    .sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name))
      || String(left.target_variant_key).localeCompare(String(right.target_variant_key))
      || String(left.target_finish_key).localeCompare(String(right.target_finish_key)));
}

function buildParents(targets) {
  const byParent = new Map();
  for (const row of targets) {
    const existing = byParent.get(row.target_parent_id);
    if (existing) {
      existing.child_finish_keys = [...new Set([...existing.child_finish_keys, row.target_finish_key])].sort();
      existing.source_urls = [...new Set([...existing.source_urls, ...row.source_urls])].sort();
      existing.evidence.push(...row.evidence.evidence);
      continue;
    }
    byParent.set(row.target_parent_id, {
      target_parent_id: row.target_parent_id,
      base_parent_id: row.base_parent_id,
      base_gv_id: row.base_gv_id,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      target_variant_key: row.target_variant_key,
      target_printed_identity_modifier: row.target_printed_identity_modifier,
      stamp_label: row.stamp_label,
      target_gv_id: row.target_gv_id,
      child_finish_keys: [row.target_finish_key],
      source_urls: row.source_urls,
      evidence: [...row.evidence.evidence],
    });
  }
  return [...byParent.values()].sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
    || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
    || String(left.card_name).localeCompare(String(right.card_name))
    || String(left.target_variant_key).localeCompare(String(right.target_variant_key)));
}

function packageFingerprint(readiness, targets, parents) {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    readiness_fingerprint_sha256: readiness.fingerprint_sha256,
    parents: parents.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: normalizeText(row.card_name),
      target_variant_key: row.target_variant_key,
      target_parent_id: row.target_parent_id,
      base_parent_id: row.base_parent_id,
      target_gv_id: row.target_gv_id,
      child_finish_keys: row.child_finish_keys,
    })),
    children: targets.map((row) => ({
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
      target_finish_key: row.target_finish_key,
      target_printing_gv_id: row.target_printing_gv_id,
    })),
  }));
}

async function captureSnapshot(client, targets, parents) {
  const result = await client.query(
    `with child_target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(target_parent_id uuid, target_child_id uuid, base_parent_id uuid)
     ),
     parent_target as (
       select *
       from jsonb_to_recordset($2::jsonb) as t(target_parent_id uuid, base_parent_id uuid)
     )
     select 'base_parent' as row_type, cp.id::text as row_id, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text as finish_key, null::text as identity_key_hash
     from parent_target t join public.card_prints cp on cp.id = t.base_parent_id
     union all
     select 'target_parent', cp.id::text, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text, null::text
     from parent_target t join public.card_prints cp on cp.id = t.target_parent_id
     union all
     select 'target_child', cpr.id::text, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, cpr.finish_key, null::text
     from child_target t join public.card_printings cpr on cpr.id = t.target_child_id join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select 'target_identity', cpi.id::text, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text, cpi.identity_key_hash
     from parent_target t join public.card_print_identity cpi on cpi.card_print_id = t.target_parent_id and cpi.is_active = true join public.card_prints cp on cp.id = cpi.card_print_id
     order by row_type, set_code nulls last, number_plain nulls last, number nulls last, name nulls last, variant_key nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets), JSON.stringify(parents)],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: countBy(result.rows, (row) => row.row_type),
  };
}

async function applyPackage(client, targets, parents, fingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets, parents);
  if (beforeSnapshot.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) {
    throw new Error(`pre-apply snapshot hash mismatch: ${beforeSnapshot.hash_sha256}`);
  }
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pokumon_parent_targets (
         target_parent_id uuid primary key,
         base_parent_id uuid not null,
         base_gv_id text not null,
         set_key text not null,
         card_number text not null,
         card_name text not null,
         target_variant_key text not null,
         target_printed_identity_modifier text not null,
         stamp_label text not null,
         target_gv_id text not null,
         child_finish_keys text[] not null,
         source_urls text[] not null,
         evidence jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `create temporary table pokumon_child_targets (
         target_parent_id uuid not null,
         target_child_id uuid primary key,
         base_parent_id uuid not null,
         set_key text not null,
         card_number text not null,
         card_name text not null,
         target_finish_key text not null,
         target_variant_key text not null,
         target_printed_identity_modifier text not null,
         stamp_label text not null,
         target_printing_gv_id text not null,
         source_urls text[] not null,
         evidence jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pokumon_parent_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         base_parent_id uuid,
         base_gv_id text,
         set_key text,
         card_number text,
         card_name text,
         target_variant_key text,
         target_printed_identity_modifier text,
         stamp_label text,
         target_gv_id text,
         child_finish_keys text[],
         source_urls text[],
         evidence jsonb
       )`,
      [JSON.stringify(parents)],
    );
    await client.query(
      `insert into pokumon_child_targets
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
         target_printing_gv_id text,
         source_urls text[],
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
         from pokumon_parent_targets target
         join public.card_prints base on base.id = target.base_parent_id
         left join public.sets s on s.id = base.set_id
       )
       select
         (select count(*)::int from pokumon_child_targets) as child_target_count,
         (select count(*)::int from pokumon_parent_targets) as parent_target_count,
         (select count(*)::int from pokumon_parent_targets target left join public.card_prints base on base.id = target.base_parent_id where base.id is null) as missing_base_count,
         (select count(*)::int from pokumon_child_targets target left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int from pokumon_child_targets target join public.card_prints base on base.id = target.base_parent_id left join public.card_printings base_child on base_child.card_print_id = base.id and base_child.finish_key = target.target_finish_key where base_child.id is null) as missing_base_finish_count,
         (select count(*)::int from pokumon_parent_targets target join public.card_prints base on base.id = target.base_parent_id join public.card_prints cp on cp.set_id = base.set_id and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number) and lower(cp.name) = lower(base.name) and (coalesce(cp.variant_key, '') = target.target_variant_key or coalesce(cp.printed_identity_modifier, '') = target.target_printed_identity_modifier)) as parent_collision_count,
         (select count(*)::int from pokumon_child_targets target join public.card_printings cpr on cpr.id = target.target_child_id) as child_collision_count,
         (select count(*)::int from pokumon_parent_targets target join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true) as identity_target_collision_count,
         (select count(*)::int from projection where projected->>'status' = 'ready') as ready_identity_projection_count,
         (select count(*)::int from projection p join public.card_print_identity cpi on cpi.is_active = true and cpi.card_print_id <> p.target_parent_id and cpi.identity_domain = p.projected->>'identity_domain' and cpi.identity_key_version = p.projected->>'identity_key_version' and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collision_count,
         (select count(*)::int from pokumon_parent_targets p group by p.target_gv_id having count(*) > 1 limit 1) as duplicate_parent_gv_id_groups,
         (select count(*)::int from pokumon_child_targets c group by c.target_printing_gv_id having count(*) > 1 limit 1) as duplicate_child_gv_id_groups`,
    );
    const guardRow = guard.rows[0];
    const expected = {
      child_target_count: targets.length,
      parent_target_count: parents.length,
      missing_base_count: 0,
      inactive_finish_count: 0,
      missing_base_finish_count: 0,
      parent_collision_count: 0,
      child_collision_count: 0,
      identity_target_collision_count: 0,
      ready_identity_projection_count: parents.length,
      identity_hash_collision_count: 0,
      duplicate_parent_gv_id_groups: null,
      duplicate_child_gv_id_groups: null,
    };
    const failures = Object.entries(expected)
      .filter(([key, value]) => guardRow[key] !== value)
      .map(([key, value]) => `${key}:${guardRow[key]}!=${value}`);
    if (failures.length) throw new Error(`guard failed: ${failures.join(', ')}`);

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
         jsonb_build_object('verified_master_index_v1', jsonb_build_object(
           'package_id', $1::text,
           'source_urls', target.source_urls,
           'stamp_label', target.stamp_label,
           'variant_key', target.target_variant_key,
           'child_finish_keys', target.child_finish_keys,
           'evidence', target.evidence
         )),
         now(), base.set_code, base.artist, base.regulation_mark, null, null, base.variants, now(),
         now(), base.print_identity_key,
         coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'source', 'verified_master_set_index_v1',
           'package_id', $1::text,
           'base_parent_id', base.id::text,
           'stamp_label', target.stamp_label,
           'variant_key', target.target_variant_key,
           'child_finish_keys', target.child_finish_keys
         ),
         null, base.data_quality_flags, 'representative_shared_stamp',
         base.image_res, now(), base.printed_set_abbrev, base.printed_total,
         target.target_gv_id,
         null, base.identity_domain, target.target_printed_identity_modifier, base.set_identity_model,
         coalesce(base.representative_image_url, base.image_url),
         concat('Stamped canonical identity: ', target.stamp_label, '. Representative base image only until exact stamped image is available.')
       from pokumon_parent_targets target
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
         from pokumon_parent_targets target
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
         target.target_printing_gv_id, null, null, null, null,
         'representative_shared_stamp',
         concat('Pokumon detail-page finish evidence routed stamped identity child finish: ', target.target_finish_key)
       from pokumon_child_targets target`,
      [CREATED_BY],
    );

    if (parentInsert.rowCount !== parents.length || identityInsert.rowCount !== parents.length || childInsert.rowCount !== targets.length) {
      throw new Error(`insert count mismatch: ${JSON.stringify({ parent_inserts: parentInsert.rowCount, identity_inserts: identityInsert.rowCount, child_inserts: childInsert.rowCount })}`);
    }

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from pokumon_parent_targets) as parent_targets,
         (select count(*)::int from pokumon_child_targets) as child_targets,
         (select count(*)::int from public.card_prints cp join pokumon_parent_targets target on target.target_parent_id = cp.id) as inserted_parent_rows,
         (select count(*)::int from public.card_print_identity cpi join pokumon_parent_targets target on target.target_parent_id = cpi.card_print_id and cpi.is_active = true) as inserted_identity_rows,
         (select count(*)::int from public.card_printings cpr join pokumon_child_targets target on target.target_child_id = cpr.id) as inserted_child_rows`,
      [PACKAGE_ID, fingerprint],
    );
    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets, parents);
    return {
      apply_status: 'pokumon_detail_real_apply_committed',
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
      apply_proof_sha256: sha256(stableJson({
        package_id: PACKAGE_ID,
        package_fingerprint: fingerprint,
        guard: guardRow,
        proof: proof.rows[0],
        before_hash: beforeSnapshot.hash_sha256,
        after_hash: afterSnapshot.hash_sha256,
      })),
      stop_findings: [],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets, parents).catch(() => beforeSnapshot);
    return {
      apply_status: 'pokumon_detail_real_apply_failed_rolled_back',
      error: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      write_counts: {
        parent_inserts: 0,
        identity_inserts: 0,
        child_inserts: 0,
        deletes: 0,
        merges: 0,
      },
      stop_findings: [`real_apply_failed:${error.message}`],
    };
  }
}

function renderMarkdown(report) {
  return `# Pokumon Detail Parent Insert Real Apply V1

Generated: ${report.generated_at}

Approved real apply for exact Pokumon detail-page stamped/special parent identity inserts.

## Safety

- approval_text_required: ${report.approval_text_required}
- db_writes_performed: ${report.safety.db_writes_performed}
- durable_db_writes_performed: ${report.safety.durable_db_writes_performed}
- migrations_created: false
- apply_performed: true
- cleanup_performed: false

## Summary

${markdownTable(['metric', 'value'], [
    ['source_child_candidate_rows', report.summary.source_child_candidate_rows],
    ['parent_insert_scope', report.summary.parent_insert_scope],
    ['child_insert_scope', report.summary.child_insert_scope],
    ['identity_insert_scope', report.summary.identity_insert_scope],
    ['apply_status', report.apply_status],
    ['committed', report.committed],
    ['dry_run_proof_sha256', report.dry_run_proof_sha256],
    ['apply_proof_sha256', report.apply?.apply_proof_sha256 ?? '(none)'],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Parent Scope

${markdownTable(['set', 'number', 'card', 'variant', 'child finishes'], report.parents.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.target_variant_key,
    row.child_finish_keys.join(', '),
  ]))}

## Child Scope

${markdownTable(['set', 'number', 'card', 'variant', 'finish'], report.targets.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.target_variant_key,
    row.target_finish_key,
  ]))}

## Result

- parent_inserts: ${report.apply?.write_counts?.parent_inserts ?? 0}
- identity_inserts: ${report.apply?.write_counts?.identity_inserts ?? 0}
- child_inserts: ${report.apply?.write_counts?.child_inserts ?? 0}
- deletes: ${report.apply?.write_counts?.deletes ?? 0}
- merges: ${report.apply?.write_counts?.merges ?? 0}
- stop_findings: ${report.apply?.stop_findings?.length ?? 0}
`;
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing database connection string');
  const dryRunArtifact = await readJson(DRY_RUN_JSON);
  const validationFindings = validateDryRunArtifact(dryRunArtifact);
  if (validationFindings.length) {
    throw new Error(`dry-run artifact validation failed: ${validationFindings.join(', ')}`);
  }
  const targets = dryRunArtifact.targets;
  const parents = dryRunArtifact.parents;
  const fingerprint = dryRunArtifact.fingerprint_sha256;

  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const apply = await applyPackage(client, targets, parents, fingerprint);
    const output = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      input_artifact: rel(DRY_RUN_JSON),
      input_fingerprint_sha256: dryRunArtifact.input_fingerprint_sha256,
      fingerprint_sha256: fingerprint,
      dry_run_proof_sha256: dryRunArtifact.dry_run.dry_run_proof_sha256,
      approval_text_required: APPROVAL_TEXT,
      apply_status: apply.apply_status,
      committed: apply.apply_status === 'pokumon_detail_real_apply_committed',
      safety: {
        db_writes_performed: true,
        durable_db_writes_performed: true,
        migrations_created: false,
        apply_performed: true,
        cleanup_performed: false,
        quarantine_performed: false,
        global_apply_performed: false,
      },
      summary: {
        source_child_candidate_rows: targets.length,
        parent_insert_scope: parents.length,
        identity_insert_scope: parents.length,
        child_insert_scope: targets.length,
        finish_counts: countBy(targets, (row) => row.target_finish_key),
        variant_counts: countBy(parents, (row) => row.target_variant_key),
      },
      parents,
      targets,
      apply,
    };
    if (!output.committed || apply.stop_findings.length > 0) {
      throw new Error(`apply did not complete cleanly: ${JSON.stringify(apply.stop_findings)}`);
    }
    const proof = apply.proof ?? {};
    if (
      proof.parent_targets !== EXPECTED_PARENT_COUNT
      || proof.child_targets !== EXPECTED_CHILD_COUNT
      || proof.inserted_parent_rows !== EXPECTED_PARENT_COUNT
      || proof.inserted_identity_rows !== EXPECTED_PARENT_COUNT
      || proof.inserted_child_rows !== EXPECTED_CHILD_COUNT
    ) {
      throw new Error(`post-apply proof failed: ${JSON.stringify(proof)}`);
    }
    await writeJson(OUTPUT_JSON, output);
    await writeText(OUTPUT_MD, renderMarkdown(output));
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
      fingerprint_sha256: output.fingerprint_sha256,
      dry_run_proof_sha256: output.dry_run_proof_sha256,
      apply_status: output.apply_status,
      committed: output.committed,
      summary: output.summary,
      write_counts: apply.write_counts,
      proof: apply.proof,
      stop_findings: apply.stop_findings,
      error: apply.error ?? null,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
