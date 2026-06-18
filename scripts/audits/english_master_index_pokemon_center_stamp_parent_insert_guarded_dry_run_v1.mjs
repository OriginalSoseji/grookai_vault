import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1', 'pokemon_center_stamp_gap_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'pokemon_center_stamp_gap_audit_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'pokemon_center_stamp_parent_insert_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'pokemon_center_stamp_parent_insert_guarded_dry_run_v1.md');

const PACKAGE_ID = 'POKEMON-CENTER-STAMP-02-LECHONK-PARENT-CHILD-INSERT';
const CREATED_BY = 'english_master_index_pokemon_center_stamp_parent_insert_guarded_dry_run_v1';

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
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

function uuidFromSeed(seed) {
  const hex = sha256(seed).slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const raw = hex.join('');
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function numberForGv(row) {
  if (row.set_key === 'basep') return String(Number(row.card_number));
  return String(row.card_number).padStart(3, '0');
}

function setToken(row) {
  if (row.set_key === 'basep') return 'BASEP';
  if (row.set_key === 'svp') return 'SVP';
  return String(row.set_key).toUpperCase().replace(/[^A-Z0-9]+/g, '-');
}

function finishSuffix(finishKey) {
  if (finishKey === 'holo') return 'HOLO';
  if (finishKey === 'reverse') return 'RH';
  if (finishKey === 'normal') return 'STD';
  return String(finishKey).toUpperCase().replace(/[^A-Z0-9]+/g, '-');
}

function targetGvId(row) {
  return `GV-PK-${setToken(row)}-${numberForGv(row)}-${String(row.variant_key).toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`;
}

function buildTargets(sourceReport) {
  return sourceReport.rows
    .filter((row) => ['ready_parent_and_child_missing', 'ready_child_missing_existing_parent'].includes(row.status))
    .map((row) => {
      const identitySeed = `${PACKAGE_ID}:${row.status}:${row.set_key}:${row.card_number}:${normalizeText(row.card_name)}:${row.variant_key}:${row.child_finish_key}`;
      const parentId = row.status === 'ready_child_missing_existing_parent'
        ? row.existing_variant_parent_id
        : uuidFromSeed(`${identitySeed}:parent`);
      const childId = uuidFromSeed(`${identitySeed}:child`);
      return {
        source_key: row.key,
        operation: row.status === 'ready_child_missing_existing_parent' ? 'child_insert_existing_parent' : 'parent_identity_child_insert',
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        base_parent_id: row.base_parent_id,
        target_parent_id: parentId,
        target_child_id: childId,
        target_variant_key: row.variant_key,
        target_printed_identity_modifier: row.printed_identity_modifier,
        target_finish_key: row.child_finish_key,
        target_gv_id: row.status === 'ready_child_missing_existing_parent' ? row.existing_variant_gv_id : targetGvId(row),
        target_printing_gv_id: `${row.status === 'ready_child_missing_existing_parent' ? row.existing_variant_gv_id : targetGvId(row)}-${finishSuffix(row.child_finish_key)}`,
        evidence: row.evidence,
        source_families: row.source_families,
        evidence_payload: {
          source_package_id: PACKAGE_ID,
          source_gap_fingerprint_sha256: sourceReport.fingerprint_sha256,
          source_status: row.status,
          selected_base_parent_id: row.base_parent_id,
          stamped_variant_key: row.variant_key,
          stamp_label: row.variant_key === 'pokemon_center_ny_stamp' ? 'Pokemon Center NY Stamp' : 'Pokemon Center Stamp',
          active_child_finish_key: row.child_finish_key,
          source_families: row.source_families,
          evidence: row.evidence,
        },
      };
    })
    .sort((left, right) => (
      String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name))
    ));
}

function packageFingerprint(sourceReport, targets) {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    source_fingerprint_sha256: sourceReport.fingerprint_sha256,
    targets: targets.map((row) => ({
      operation: row.operation,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: normalizeText(row.card_name),
      base_parent_id: row.base_parent_id,
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      target_gv_id: row.target_gv_id,
      target_printing_gv_id: row.target_printing_gv_id,
      source_families: row.source_families,
    })),
  }));
}

function sqlHash() {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    writes: [
      'insert missing Pokemon Center stamped card_print parent identity variants',
      'insert active card_print_identity for inserted parents',
      'insert child card_printings using active finish keys only',
      'insert child-only printing for existing Squirtle Pokemon Center stamped parent',
    ],
    forbidden: ['finish_key=stamped child rows', 'parent overwrites', 'deletes', 'merges', 'migrations', 'global apply'],
  }));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(target_parent_id uuid, target_child_id uuid, base_parent_id uuid)
     )
     select 'base_parent' as row_type, cp.id::text as row_id, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id, null::text as finish_key, null::text as printing_gv_id, null::text as identity_key_hash
     from target t join public.card_prints cp on cp.id = t.base_parent_id
     union all
     select 'target_parent', cp.id::text, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id, null::text, null::text, null::text
     from target t join public.card_prints cp on cp.id = t.target_parent_id
     union all
     select 'target_child', cpr.id::text, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id, cpr.finish_key, cpr.printing_gv_id, null::text
     from target t join public.card_printings cpr on cpr.id = t.target_child_id join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select 'target_identity', cpi.id::text, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id, null::text, null::text, cpi.identity_key_hash
     from target t join public.card_print_identity cpi on cpi.card_print_id = t.target_parent_id and cpi.is_active = true join public.card_prints cp on cp.id = cpi.card_print_id
     order by row_type, set_code nulls last, number_plain nulls last, number nulls last, name nulls last, variant_key nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets)],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    counts: countBy(result.rows, (row) => row.row_type),
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

async function loadTargetsTable(client, targets) {
  await client.query(
    `create temporary table pokemon_center_stamp_targets (
       operation text not null,
       target_parent_id uuid not null,
       target_child_id uuid not null,
       base_parent_id uuid not null,
       set_key text not null,
       card_number text not null,
       card_name text not null,
       target_finish_key text not null,
       target_variant_key text not null,
       target_printed_identity_modifier text not null,
       target_gv_id text not null,
       target_printing_gv_id text not null,
       evidence_payload jsonb not null
     ) on commit drop`,
  );
  await client.query(
    `insert into pokemon_center_stamp_targets
     select *
     from jsonb_to_recordset($1::jsonb) as t(
       operation text,
       target_parent_id uuid,
       target_child_id uuid,
       base_parent_id uuid,
       set_key text,
       card_number text,
       card_name text,
       target_finish_key text,
       target_variant_key text,
       target_printed_identity_modifier text,
       target_gv_id text,
       target_printing_gv_id text,
       evidence_payload jsonb
     )`,
    [JSON.stringify(targets.map((row) => ({
      operation: row.operation,
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
      base_parent_id: row.base_parent_id,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      target_finish_key: row.target_finish_key,
      target_variant_key: row.target_variant_key,
      target_printed_identity_modifier: row.target_printed_identity_modifier,
      target_gv_id: row.target_gv_id,
      target_printing_gv_id: row.target_printing_gv_id,
      evidence_payload: row.evidence_payload,
    })))],
  );
}

async function runPackageTransaction(client, targets, fingerprint, { commit = false } = {}) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await loadTargetsTable(client, targets);

    const guard = await client.query(
      `with projection as (
         select
           target.target_parent_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, base.set_code, s.code, base.number, base.number_plain, base.name,
             target.target_variant_key, coalesce(base.printed_total, s.printed_total), coalesce(base.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from pokemon_center_stamp_targets target
         join public.card_prints base on base.id = target.base_parent_id
         left join public.sets s on s.id = base.set_id
         where target.operation = 'parent_identity_child_insert'
       )
       select
         (select count(*)::int from pokemon_center_stamp_targets) as target_count,
         (select count(*)::int from pokemon_center_stamp_targets where operation = 'parent_identity_child_insert') as parent_insert_target_count,
         (select count(*)::int from pokemon_center_stamp_targets where operation = 'child_insert_existing_parent') as child_only_target_count,
         (select count(distinct target_parent_id)::int from pokemon_center_stamp_targets) as target_parent_count,
         (select count(distinct target_child_id)::int from pokemon_center_stamp_targets) as target_child_count,
         (select count(*)::int from pokemon_center_stamp_targets target left join public.card_prints base on base.id = target.base_parent_id where base.id is null) as missing_base_count,
        (select count(*)::int
         from pokemon_center_stamp_targets target
         join public.card_prints base on base.id = target.base_parent_id
         where base.set_code <> target.set_key
            or regexp_replace(coalesce(base.number_plain, base.number), '^0+', '') <> regexp_replace(target.card_number, '^0+', '')
            or lower(base.name) <> lower(target.card_name)) as base_identity_mismatch_count,
         (select count(*)::int from pokemon_center_stamp_targets target left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int from pokemon_center_stamp_targets where target_finish_key = 'stamped') as forbidden_stamped_finish_targets,
         (select count(*)::int from pokemon_center_stamp_targets target join public.card_prints cp on cp.id = target.target_parent_id where target.operation = 'parent_identity_child_insert') as parent_insert_collision_count,
         (select count(*)::int from pokemon_center_stamp_targets target join public.card_printings cpr on cpr.id = target.target_child_id) as child_collision_count,
         (select count(*)::int from pokemon_center_stamp_targets target join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true where target.operation = 'parent_identity_child_insert') as identity_target_collision_count,
         (select count(*)::int from projection where projected->>'status' = 'ready') as ready_identity_projection_count,
         (select count(*)::int from projection p join public.card_print_identity cpi on cpi.is_active = true and cpi.card_print_id <> p.target_parent_id and cpi.identity_domain = p.projected->>'identity_domain' and cpi.identity_key_version = p.projected->>'identity_key_version' and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collision_count,
         (select count(*)::int from pokemon_center_stamp_targets target join public.card_prints cp on cp.id = target.target_parent_id where target.operation = 'child_insert_existing_parent') as child_only_parent_exists_count`,
    );
    const guardRow = guard.rows[0];
    const parentTargetCount = targets.filter((row) => row.operation === 'parent_identity_child_insert').length;
    const childOnlyTargetCount = targets.filter((row) => row.operation === 'child_insert_existing_parent').length;
    if (
      guardRow.target_count !== targets.length
      || guardRow.parent_insert_target_count !== parentTargetCount
      || guardRow.child_only_target_count !== childOnlyTargetCount
      || guardRow.target_parent_count !== targets.length
      || guardRow.target_child_count !== targets.length
      || guardRow.missing_base_count !== 0
      || guardRow.base_identity_mismatch_count !== 0
      || guardRow.inactive_finish_count !== 0
      || guardRow.forbidden_stamped_finish_targets !== 0
      || guardRow.parent_insert_collision_count !== 0
      || guardRow.child_collision_count !== 0
      || guardRow.identity_target_collision_count !== 0
      || guardRow.ready_identity_projection_count !== parentTargetCount
      || guardRow.identity_hash_collision_count !== 0
      || guardRow.child_only_parent_exists_count !== childOnlyTargetCount
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
         null, coalesce(base.external_ids, '{}'::jsonb) || jsonb_build_object('verified_master_index_v1', target.evidence_payload), now(), base.set_code, base.artist, base.regulation_mark,
         null, null, base.variants, now(), now(), base.print_identity_key,
         coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'source', 'verified_master_set_index_v1',
           'package_id', $1::text,
           'base_parent_id', base.id::text,
           'stamp_label', target.evidence_payload->>'stamp_label',
           'variant_key', target.target_variant_key,
           'explicit_child_finish_key', target.target_finish_key
         ),
         null, base.data_quality_flags, 'representative_shared_stamp',
         base.image_res, now(), coalesce(base.printed_set_abbrev, s.printed_set_abbrev), coalesce(base.printed_total, s.printed_total),
         target.target_gv_id,
         null, base.identity_domain, target.target_printed_identity_modifier, base.set_identity_model,
         coalesce(base.representative_image_url, base.image_url),
         concat('Pokemon Center stamped canonical identity. Representative base image only until exact stamped image is available.')
       from pokemon_center_stamp_targets target
       join public.card_prints base on base.id = target.base_parent_id
       left join public.sets s on s.id = base.set_id
       where target.operation = 'parent_identity_child_insert'`,
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
         from pokemon_center_stamp_targets target
         join public.card_prints cp on cp.id = target.target_parent_id
         left join public.sets s on s.id = cp.set_id
         where target.operation = 'parent_identity_child_insert'
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
         concat(target.set_key, ':', target.card_number, ':pokemon_center_stamp:', target.target_variant_key, ':', target.target_finish_key),
         $1::text,
         target.target_printing_gv_id, null, null, null, null,
         'representative_shared_stamp',
         concat('Pokemon Center stamped identity child finish routed from source-backed evidence: ', target.target_finish_key)
       from pokemon_center_stamp_targets target`,
      [CREATED_BY],
    );

    if (parentInsert.rowCount !== parentTargetCount || identityInsert.rowCount !== parentTargetCount || childInsert.rowCount !== targets.length) {
      throw new Error(`insert count mismatch: ${JSON.stringify({ parent_inserts: parentInsert.rowCount, identity_inserts: identityInsert.rowCount, child_inserts: childInsert.rowCount })}`);
    }

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from pokemon_center_stamp_targets) as target_rows,
         (select count(*)::int from public.card_prints cp join pokemon_center_stamp_targets target on target.target_parent_id = cp.id where target.operation = 'parent_identity_child_insert') as inserted_parent_rows,
         (select count(*)::int from public.card_prints cp join pokemon_center_stamp_targets target on target.target_parent_id = cp.id and cp.printed_identity_modifier = target.target_printed_identity_modifier where target.operation = 'parent_identity_child_insert') as inserted_parent_modifier_rows,
         (select count(*)::int from public.card_print_identity cpi join pokemon_center_stamp_targets target on target.target_parent_id = cpi.card_print_id and cpi.is_active = true where target.operation = 'parent_identity_child_insert') as inserted_identity_rows,
         (select count(*)::int from public.card_printings cpr join pokemon_center_stamp_targets target on target.target_child_id = cpr.id) as inserted_child_rows,
         (select count(*)::int from public.card_printings cpr join pokemon_center_stamp_targets target on target.target_child_id = cpr.id and cpr.finish_key = target.target_finish_key) as matching_child_finish_rows,
         (select count(*)::int from public.card_printings cpr join pokemon_center_stamp_targets target on target.target_child_id = cpr.id and cpr.finish_key = 'stamped') as forbidden_stamped_child_rows`,
      [PACKAGE_ID, fingerprint],
    );

    const inTransactionSnapshot = await captureSnapshot(client, targets);
    if (commit) {
      await client.query('commit');
    } else {
      await client.query('rollback');
    }
    const afterSnapshot = await captureSnapshot(client, targets);
    const rollbackVerified = commit ? null : beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256;
    const durableWriteVerified = commit ? inTransactionSnapshot.hash_sha256 === afterSnapshot.hash_sha256 : false;
    return {
      dry_run_status: commit
        ? 'pokemon_center_stamp_parent_child_insert_committed'
        : 'pokemon_center_stamp_parent_child_insert_completed_rolled_back_no_durable_change',
      guard: guardRow,
      proof: proof.rows[0],
      simulated_write_counts: {
        parent_inserts: parentInsert.rowCount,
        identity_inserts: identityInsert.rowCount,
        child_inserts: childInsert.rowCount,
        deletes: 0,
        merges: 0,
      },
      before_snapshot: beforeSnapshot,
      in_transaction_snapshot: inTransactionSnapshot,
      after_rollback_snapshot: afterSnapshot,
      rollback_verified: rollbackVerified,
      durable_write_verified: durableWriteVerified,
      dry_run_proof_sha256: sha256(stableJson({
        package_id: PACKAGE_ID,
        package_fingerprint: fingerprint,
        guard: guardRow,
        proof: proof.rows[0],
        before_hash: beforeSnapshot.hash_sha256,
        after_hash: afterSnapshot.hash_sha256,
      })),
      stop_findings: commit
        ? (durableWriteVerified ? [] : ['commit_snapshot_mismatch'])
        : (rollbackVerified ? [] : ['rollback_snapshot_mismatch']),
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => beforeSnapshot);
    return {
      dry_run_status: 'pokemon_center_stamp_parent_child_insert_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_rollback_snapshot: afterSnapshot,
      rollback_verified: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
      dry_run_proof_sha256: null,
      simulated_write_counts: { parent_inserts: 0, identity_inserts: 0, child_inserts: 0, deletes: 0, merges: 0 },
      stop_findings: [`dry_run_error:${error.message}`],
    };
  }
}

function renderMarkdown(report) {
  return `# Pokemon Center Stamp Parent Insert Guarded Dry Run V1

Rollback-only dry run for source-ready Pokemon Center stamped identity variants.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- transaction_writes_rolled_back: ${report.transaction_writes_rolled_back}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- rollback_verified: ${report.execution.rollback_verified}

## Scope

- parent_inserts: ${report.execution.simulated_write_counts.parent_inserts}
- identity_inserts: ${report.execution.simulated_write_counts.identity_inserts}
- child_inserts: ${report.execution.simulated_write_counts.child_inserts}
- deletes: ${report.execution.simulated_write_counts.deletes}
- merges: ${report.execution.simulated_write_counts.merges}

## Targets

${markdownTable(['op', 'set', 'number', 'card', 'variant', 'finish', 'sources'], report.scope.targets.map((row) => [
    row.operation,
    row.set_key,
    row.card_number,
    row.card_name,
    row.target_variant_key,
    row.target_finish_key,
    row.source_families.join(', '),
  ]))}

## Result

- dry_run_status: ${report.execution.dry_run_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- sql_hash_sha256: \`${report.sql_hash_sha256}\`
- dry_run_proof_sha256: \`${report.execution.dry_run_proof_sha256}\`
- before_snapshot_hash: \`${report.execution.before_snapshot.hash_sha256}\`
- after_rollback_snapshot_hash: \`${report.execution.after_rollback_snapshot.hash_sha256}\`
- stop_findings: ${report.execution.stop_findings.length}

## Approval Text

\`\`\`text
${report.recommended_real_apply_approval_text}
\`\`\`
`;
}

async function main() {
  const applyMode = process.argv.includes('--apply');
  const expectedProofArgIndex = process.argv.findIndex((arg) => arg === '--expected-dry-run-proof');
  const expectedProofArg = process.argv.find((arg) => arg.startsWith('--expected-dry-run-proof='));
  const expectedDryRunProof = expectedProofArg?.split('=')[1] ?? (
    expectedProofArgIndex >= 0 ? process.argv[expectedProofArgIndex + 1] : null
  );
  const sourceReport = await readJson(SOURCE_JSON);
  const targets = buildTargets(sourceReport);
  const fingerprint = packageFingerprint(sourceReport, targets);
  const sqlHashValue = sqlHash();
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing database connection string.');

  if (applyMode) {
    if (!expectedDryRunProof) throw new Error('apply guard failed: --expected-dry-run-proof is required');
    const priorDryRun = await readJson(OUTPUT_JSON);
    const priorProof = priorDryRun?.execution?.dry_run_proof_sha256;
    if (
      priorDryRun?.pass !== true
      || priorDryRun?.package_fingerprint_sha256 !== fingerprint
      || priorDryRun?.sql_hash_sha256 !== sqlHashValue
      || priorProof !== expectedDryRunProof
    ) {
      throw new Error(`apply guard failed: saved dry-run proof does not match approval context (${JSON.stringify({
        saved_pass: priorDryRun?.pass,
        saved_fingerprint: priorDryRun?.package_fingerprint_sha256,
        current_fingerprint: fingerprint,
        saved_sql_hash: priorDryRun?.sql_hash_sha256,
        current_sql_hash: sqlHashValue,
        saved_dry_run_proof: priorProof,
      })})`);
    }
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const execution = await runPackageTransaction(client, targets, fingerprint, { commit: applyMode });
    const pass = (applyMode ? execution.durable_write_verified === true : execution.rollback_verified === true)
      && execution.stop_findings.length === 0
      && execution.simulated_write_counts.parent_inserts === targets.filter((row) => row.operation === 'parent_identity_child_insert').length
      && execution.simulated_write_counts.child_inserts === targets.length;

    const scope = {
      source_gap_fingerprint_sha256: sourceReport.fingerprint_sha256,
      target_count: targets.length,
      parent_insert_count: targets.filter((row) => row.operation === 'parent_identity_child_insert').length,
      child_only_insert_count: targets.filter((row) => row.operation === 'child_insert_existing_parent').length,
      by_set: countBy(targets, (row) => row.set_key),
      by_finish: countBy(targets, (row) => row.target_finish_key),
      targets,
      blocked_rows_remaining: sourceReport.rows.filter((row) => String(row.status).startsWith('blocked_')).map((row) => ({
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        status: row.status,
        reason: row.reason,
      })),
    };

    const report = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      source_audit: rel(SOURCE_JSON),
      package_fingerprint_sha256: fingerprint,
      sql_hash_sha256: sqlHashValue,
      pass,
      db_writes_performed: applyMode,
      durable_db_writes_performed: applyMode,
      transaction_writes_rolled_back: !applyMode,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      global_apply_performed: false,
      scope,
      execution,
      recommended_real_apply_approval_text: pass
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${fingerprint}. SQL hash: ${sqlHashValue}. Scope: ${scope.parent_insert_count} Pokemon Center stamped parent inserts, ${scope.parent_insert_count} identity inserts, ${scope.target_count} child printing inserts, child-only existing-parent inserts=${scope.child_only_insert_count}; finishes ${Object.entries(scope.by_finish).map(([key, value]) => `${key}=${value}`).join(', ')}. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.`
        : 'NOT READY: dry-run did not pass.',
      output_files: {
        json: rel(OUTPUT_JSON),
        md: rel(OUTPUT_MD),
      },
    };

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, renderMarkdown(report));
    console.log(JSON.stringify({
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
      package_fingerprint_sha256: fingerprint,
      sql_hash_sha256: sqlHashValue,
      pass,
      scope: {
        target_count: scope.target_count,
        parent_insert_count: scope.parent_insert_count,
        child_only_insert_count: scope.child_only_insert_count,
        by_set: scope.by_set,
        by_finish: scope.by_finish,
      },
      dry_run_proof_sha256: execution.dry_run_proof_sha256,
      stop_findings: execution.stop_findings,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
