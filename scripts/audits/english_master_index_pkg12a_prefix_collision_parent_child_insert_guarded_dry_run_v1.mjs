import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg12_parent_identity_mismatch_strategy_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg12a_prefix_collision_parent_child_insert_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg12a_prefix_collision_parent_child_insert_guarded_dry_run_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg12a_prefix_collision_parent_child_insert_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-12A-PREFIX-COLLISION-PARENT-CHILD-INSERTS';
const CREATED_BY = 'pkg12a_prefix_collision_parent_child_insert_guarded_dry_run_v1';
const PROVENANCE_SOURCE = 'verified_master_set_index_v1';
const READY_STATUS = 'prefix_collision_true_parent_insert_candidate';
const EXPECTED_PARENT_ROWS = 3;
const EXPECTED_CHILD_ROWS = 6;
const EXPECTED_MAPPING_ROWS = 3;
const EXPECTED_BLOCKED_ROWS = 5;
const EXPECTED_SET_COUNTS = { col1: 6 };
const EXPECTED_FINISH_COUNTS = { holo: 3, reverse: 3 };

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

function parentKey(row) {
  return [normalizeText(row.set_key), normalizeNumber(row.card_number), normalizeText(row.card_name)].join('|');
}

function chooseMapping(row) {
  const ids = row.extracted_external_ids ?? [];
  return ids.find((id) => id.source === 'tcgdex')
    ?? ids.find((id) => id.source === 'pokemonapi')
    ?? ids.find((id) => id.source === 'tcgplayer')
    ?? null;
}

async function resolveSets(client, rows) {
  const aliases = [...new Set(rows.map((row) => normalizeText(row.set_key)).filter(Boolean))];
  const result = await client.query(
    `select id::text as set_id, code, name
     from public.sets
     where game = 'pokemon'
       and lower(coalesce(code, '')) = any($1::text[])
     order by code, id`,
    [aliases],
  );
  return new Map(result.rows.map((row) => [normalizeText(row.code), row]));
}

function buildTargets({ sourceRows, setByAlias }) {
  const parentByKey = new Map();
  const childRows = [];
  const blockedRows = [];

  for (const row of sourceRows) {
    const setRow = setByAlias.get(normalizeText(row.set_key));
    const mapping = chooseMapping(row);
    if (!setRow) {
      blockedRows.push({ ...row, blocked_reason: 'live_set_not_resolved_at_dry_run_time' });
      continue;
    }
    if (!mapping?.source || !mapping?.external_id) {
      blockedRows.push({ ...row, blocked_reason: 'stable_external_mapping_missing' });
      continue;
    }
    if (row.strategy_status !== READY_STATUS) {
      blockedRows.push({ ...row, blocked_reason: 'source_strategy_status_not_ready' });
      continue;
    }

    const key = parentKey(row);
    if (!parentByKey.has(key)) {
      const cardPrintId = crypto.randomUUID();
      parentByKey.set(key, {
        card_print_id: cardPrintId,
        set_id: setRow.set_id,
        set_key: row.set_key,
        live_set_code: setRow.code,
        set_name: row.set_name,
        card_number: row.card_number,
        number_plain: normalizeNumber(row.card_number),
        printed_identity_modifier: null,
        card_name: row.card_name,
        rarity: null,
        variant_key: '',
        external_ids: { [mapping.source]: mapping.external_id },
        ai_metadata: {
          source: PROVENANCE_SOURCE,
          package_id: PACKAGE_ID,
          source_set_key: row.set_key,
          source_strategy_status: row.strategy_status,
          protected_same_number_candidates: row.live_same_number_candidates.map((candidate) => ({
            card_print_id: candidate.card_print_id,
            number: candidate.number,
            number_plain: candidate.number_plain,
            name: candidate.name,
            printed_identity_modifier: candidate.printed_identity_modifier,
          })),
        },
        preferred_external_mapping: mapping,
        evidence_urls: row.evidence_urls ?? [],
        sources: row.sources ?? [],
      });
    }
    const parent = parentByKey.get(key);
    childRows.push({
      card_printing_id: crypto.randomUUID(),
      card_print_id: parent.card_print_id,
      set_key: row.set_key,
      live_set_code: parent.live_set_code,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      provenance_source: PROVENANCE_SOURCE,
      provenance_ref: `${row.set_key}:${normalizeNumber(row.card_number)}:${row.finish_key}`,
      created_by: CREATED_BY,
      evidence_urls: row.evidence_urls ?? [],
      sources: row.sources ?? [],
    });
  }

  const parentRows = [...parentByKey.values()];
  const mappingRows = parentRows.map((row) => ({
    source: row.preferred_external_mapping.source,
    external_id: row.preferred_external_mapping.external_id,
    card_print_id: row.card_print_id,
    meta: {
      package_id: PACKAGE_ID,
      set_key: row.set_key,
      live_set_code: row.live_set_code,
      card_name: row.card_name,
      card_number: row.card_number,
      source_url: row.preferred_external_mapping.source_url,
      evidence_urls: row.evidence_urls,
    },
  }));

  return { parentRows, childRows, mappingRows, blockedRows };
}

async function loadMappingCollisions(client, mappingRows) {
  if (!mappingRows.length) return [];
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         source text,
         external_id text,
         card_print_id uuid
       )
     )
     select
       em.id::text as external_mapping_id,
       em.source,
       em.external_id,
       em.card_print_id::text as current_card_print_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name,
       coalesce((
         select jsonb_agg(cpr.finish_key order by cpr.finish_key)
         from public.card_printings cpr
         where cpr.card_print_id = cp.id
       ), '[]'::jsonb) as finishes
     from target
     join public.external_mappings em
       on em.source = target.source
      and em.external_id = target.external_id
     left join public.card_prints cp on cp.id = em.card_print_id
     order by em.source, em.external_id, em.id`,
    [JSON.stringify(mappingRows)],
  );
  return result.rows;
}

async function loadIdentitySlotCollisions(client, parentRows) {
  if (!parentRows.length) return [];
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         set_id uuid,
         live_set_code text,
         number_plain text,
         printed_identity_modifier text,
         variant_key text
       )
     )
     select
       target.card_print_id::text as target_card_print_id,
       cp.id::text as current_card_print_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.variant_key,
       cp.name,
       coalesce((
         select jsonb_agg(cpr.finish_key order by cpr.finish_key)
         from public.card_printings cpr
         where cpr.card_print_id = cp.id
       ), '[]'::jsonb) as finishes,
       coalesce((
         select jsonb_agg(jsonb_build_object('source', em.source, 'external_id', em.external_id) order by em.source, em.external_id)
         from public.external_mappings em
         where em.card_print_id = cp.id
       ), '[]'::jsonb) as external_mappings
     from target
     join public.card_prints cp
       on cp.id <> target.card_print_id
      and cp.set_id = target.set_id
      and coalesce(cp.number_plain, '') = target.number_plain
      and coalesce(cp.printed_identity_modifier, '') = coalesce(target.printed_identity_modifier, '')
      and coalesce(cp.variant_key, '') = coalesce(target.variant_key, '')
     order by target.live_set_code, target.number_plain, cp.name, cp.id`,
    [JSON.stringify(parentRows)],
  );
  return result.rows;
}

function excludeCollisions(planned, { mappingCollisions, identitySlotCollisions }) {
  const collisionKeys = new Set(mappingCollisions.map((row) => `${normalizeText(row.source)}|${String(row.external_id ?? '').trim()}`));
  const identityCollisionParentIds = new Set(identitySlotCollisions.map((row) => row.target_card_print_id));
  if (!collisionKeys.size && !identityCollisionParentIds.size) return planned;

  const blockedParentIds = new Set();
  const parentRows = [];
  const blockedRows = [...planned.blockedRows];
  for (const row of planned.parentRows) {
    const key = `${normalizeText(row.preferred_external_mapping.source)}|${String(row.preferred_external_mapping.external_id ?? '').trim()}`;
    if (collisionKeys.has(key) || identityCollisionParentIds.has(row.card_print_id)) {
      blockedParentIds.add(row.card_print_id);
      blockedRows.push({
        set_key: row.set_key,
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        blocked_reason: collisionKeys.has(key)
          ? 'preferred_external_mapping_collision_present'
          : 'unprefixed_identity_slot_already_occupied',
        preferred_external_mapping: row.preferred_external_mapping,
        existing_mapping_collisions: mappingCollisions.filter((collision) => (
          normalizeText(collision.source) === normalizeText(row.preferred_external_mapping.source)
          && String(collision.external_id ?? '').trim() === String(row.preferred_external_mapping.external_id ?? '').trim()
        )),
        existing_identity_slot_collisions: identitySlotCollisions.filter((collision) => collision.target_card_print_id === row.card_print_id),
        recommended_next_action: 'Handle as mapped/incomplete-parent backfill or mapping-transfer package; do not insert duplicate parent.',
      });
    } else {
      parentRows.push(row);
    }
  }

  return {
    parentRows,
    childRows: planned.childRows.filter((row) => !blockedParentIds.has(row.card_print_id)),
    mappingRows: planned.mappingRows.filter((row) => !blockedParentIds.has(row.card_print_id)),
    blockedRows,
  };
}

async function captureTargetSnapshot(client, planned) {
  const result = await client.query(
    `with parent_target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         live_set_code text,
         card_number text,
         number_plain text,
         printed_identity_modifier text,
         card_name text
       )
     ),
     child_target as (
       select *
       from jsonb_to_recordset($2::jsonb) as t(
         card_printing_id uuid,
         card_print_id uuid,
         finish_key text
       )
     ),
     mapping_target as (
       select *
       from jsonb_to_recordset($3::jsonb) as t(
         source text,
         external_id text,
         card_print_id uuid
       )
     )
     select
       'existing_parent_exact' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       null::text as finish_key,
       null::text as source,
       null::text as external_id
     from parent_target target
     join public.card_prints cp
       on cp.id = target.card_print_id
       or (
         lower(coalesce(cp.set_code, '')) = lower(target.live_set_code)
         and lower(coalesce(cp.number_plain, cp.number, '')) = lower(target.number_plain)
         and lower(coalesce(cp.printed_identity_modifier, '')) = lower(coalesce(target.printed_identity_modifier, ''))
         and lower(coalesce(cp.name, '')) = lower(target.card_name)
       )
     union all
     select
       'existing_child_exact' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       cpr.finish_key,
       null::text as source,
       null::text as external_id
     from child_target target
     join public.card_printings cpr
       on cpr.id = target.card_printing_id
       or (
         cpr.card_print_id = target.card_print_id
         and cpr.finish_key = target.finish_key
       )
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'external_mapping_collision' as row_type,
       em.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       null::text as finish_key,
       em.source,
       em.external_id
     from mapping_target target
     join public.external_mappings em
       on em.source = target.source
      and em.external_id = target.external_id
     left join public.card_prints cp on cp.id = em.card_print_id
     union all
     select
       'target_set' as row_type,
       s.id::text as row_id,
       s.code as set_code,
       null::text as card_number,
       s.name as card_name,
       null::text as finish_key,
       null::text as source,
       null::text as external_id
     from public.sets s
     where lower(coalesce(s.code, '')) = any($4::text[])
     order by row_type, set_code nulls last, card_number nulls last, card_name nulls last, finish_key nulls last, source nulls last, external_id nulls last, row_id`,
    [
      JSON.stringify(planned.parentRows),
      JSON.stringify(planned.childRows),
      JSON.stringify(planned.mappingRows),
      [...new Set(planned.parentRows.map((row) => normalizeText(row.live_set_code)))],
    ],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      target_set_rows: rows.filter((row) => row.row_type === 'target_set').length,
      existing_parent_exact_rows: rows.filter((row) => row.row_type === 'existing_parent_exact').length,
      existing_child_exact_rows: rows.filter((row) => row.row_type === 'existing_child_exact').length,
      external_mapping_collision_rows: rows.filter((row) => row.row_type === 'external_mapping_collision').length,
      total_rows: rows.length,
    },
  };
}

async function runDryRun(client, planned, packageFingerprint) {
  const beforeSnapshot = await captureTargetSnapshot(client, planned);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg12a_parent_targets (
         card_print_id uuid primary key,
         set_id uuid not null,
         live_set_code text not null,
         card_number text not null,
         number_plain text not null,
         printed_identity_modifier text null,
         card_name text not null,
         rarity text null,
         variant_key text not null,
         external_ids jsonb not null,
         ai_metadata jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `create temporary table pkg12a_child_targets (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         finish_key text not null,
         provenance_source text not null,
         provenance_ref text not null,
         created_by text not null
       ) on commit drop`,
    );
    await client.query(
      `create temporary table pkg12a_mapping_targets (
         source text not null,
         external_id text not null,
         card_print_id uuid not null,
         meta jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg12a_parent_targets
       select
         row.card_print_id::uuid,
         row.set_id::uuid,
         row.live_set_code,
         row.card_number,
         row.number_plain,
         row.printed_identity_modifier,
         row.card_name,
         row.rarity,
         row.variant_key,
         row.external_ids,
         row.ai_metadata
       from jsonb_to_recordset($1::jsonb) as row(
         card_print_id text,
         set_id text,
         live_set_code text,
         card_number text,
         number_plain text,
         printed_identity_modifier text,
         card_name text,
         rarity text,
         variant_key text,
         external_ids jsonb,
         ai_metadata jsonb
       )`,
      [JSON.stringify(planned.parentRows)],
    );
    await client.query(
      `insert into pkg12a_child_targets
       select
         row.card_printing_id::uuid,
         row.card_print_id::uuid,
         row.finish_key,
         row.provenance_source,
         row.provenance_ref,
         row.created_by
       from jsonb_to_recordset($1::jsonb) as row(
         card_printing_id text,
         card_print_id text,
         finish_key text,
         provenance_source text,
         provenance_ref text,
         created_by text
       )`,
      [JSON.stringify(planned.childRows)],
    );
    await client.query(
      `insert into pkg12a_mapping_targets
       select row.source, row.external_id, row.card_print_id::uuid, row.meta
       from jsonb_to_recordset($1::jsonb) as row(
         source text,
         external_id text,
         card_print_id text,
         meta jsonb
       )`,
      [JSON.stringify(planned.mappingRows)],
    );

    const shape = await client.query(
      `select
         (select count(*)::int from pkg12a_parent_targets) as parent_rows,
         (select count(*)::int from pkg12a_child_targets) as child_rows,
         (select count(*)::int from pkg12a_mapping_targets) as mapping_rows,
         (select count(*)::int from pkg12a_child_targets child left join pkg12a_parent_targets parent on parent.card_print_id = child.card_print_id where parent.card_print_id is null) as child_without_parent,
         (select count(*)::int from pkg12a_child_targets child left join public.finish_keys fk on fk.key = child.finish_key and fk.is_active = true where fk.key is null) as inactive_finish_rows,
         (select count(*)::int from pkg12a_parent_targets where printed_identity_modifier is not null) as target_modifier_rows`,
    );
    const shapeRow = shape.rows[0];
    if (
      shapeRow.parent_rows !== planned.parentRows.length ||
      shapeRow.child_rows !== planned.childRows.length ||
      shapeRow.mapping_rows !== planned.mappingRows.length ||
      shapeRow.child_without_parent !== 0 ||
      shapeRow.inactive_finish_rows !== 0 ||
      shapeRow.target_modifier_rows !== 0
    ) {
      throw new Error(`target shape mismatch: ${JSON.stringify(shapeRow)}`);
    }

    const collisions = await client.query(
      `select
         (select count(*)::int
          from pkg12a_parent_targets target
          join public.card_prints cp
            on cp.id = target.card_print_id
            or (
              lower(coalesce(cp.set_code, '')) = lower(target.live_set_code)
              and lower(coalesce(cp.number_plain, cp.number, '')) = lower(target.number_plain)
              and lower(coalesce(cp.printed_identity_modifier, '')) = lower(coalesce(target.printed_identity_modifier, ''))
              and lower(coalesce(cp.name, '')) = lower(target.card_name)
            )) as parent_collisions,
         (select count(*)::int
          from pkg12a_child_targets target
          join public.card_printings cpr
            on cpr.id = target.card_printing_id
            or (
              cpr.card_print_id = target.card_print_id
              and cpr.finish_key = target.finish_key
            )) as child_collisions,
         (select count(*)::int
          from pkg12a_mapping_targets target
          join public.external_mappings em
            on em.source = target.source
           and em.external_id = target.external_id) as mapping_collisions`,
    );
    const collisionRow = collisions.rows[0];
    if (
      collisionRow.parent_collisions !== 0 ||
      collisionRow.child_collisions !== 0 ||
      collisionRow.mapping_collisions !== 0
    ) {
      throw new Error(`collision guard failed: ${JSON.stringify(collisionRow)}`);
    }

    const parentInsert = await client.query(
      `insert into public.card_prints (
         id,
         set_id,
         set_code,
         number,
         printed_identity_modifier,
         name,
         rarity,
         variant_key,
         external_ids,
         ai_metadata
       )
       select
         card_print_id,
         set_id,
         live_set_code,
         card_number,
         printed_identity_modifier,
         card_name,
         rarity,
         variant_key,
         external_ids,
         ai_metadata
       from pkg12a_parent_targets`,
    );
    const mappingInsert = await client.query(
      `insert into public.external_mappings (source, external_id, card_print_id, meta)
       select source, external_id, card_print_id, meta
       from pkg12a_mapping_targets`,
    );
    const childInsert = await client.query(
      `insert into public.card_printings (
         id,
         card_print_id,
         finish_key,
         is_provisional,
         provenance_source,
         provenance_ref,
         created_by
       )
       select
         card_printing_id,
         card_print_id,
         finish_key,
         false,
         provenance_source,
         provenance_ref,
         created_by
       from pkg12a_child_targets`,
    );
    if (
      parentInsert.rowCount !== planned.parentRows.length ||
      childInsert.rowCount !== planned.childRows.length ||
      mappingInsert.rowCount !== planned.mappingRows.length
    ) {
      throw new Error(`insert count mismatch: ${JSON.stringify({
        parents: parentInsert.rowCount,
        children: childInsert.rowCount,
        mappings: mappingInsert.rowCount,
      })}`);
    }
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from pkg12a_parent_targets) as planned_parent_rows,
         (select count(*)::int from pkg12a_child_targets) as planned_child_rows,
         (select count(*)::int from pkg12a_mapping_targets) as planned_mapping_rows`,
      [PACKAGE_ID, packageFingerprint],
    );
    await client.query('rollback');
    const afterSnapshot = await captureTargetSnapshot(client, planned);
    return {
      status: 'pkg12a_prefix_collision_parent_child_insert_completed_rolled_back_no_durable_change',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: proof.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureTargetSnapshot(client, planned).catch(() => null);
    return {
      status: 'pkg12a_prefix_collision_parent_child_insert_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: [],
    };
  }
}

function renderMarkdown(report) {
  return `# PKG-12A Prefix-Collision Parent+Child Insert Guarded Dry Run V1

Rollback-only dry run for non-colliding unprefixed checklist parents whose current same-number live candidates are protected prefix/subset identities.

## Status

- dry_run_status: ${report.dry_run_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256 ?? 'missing'}\`
- source_strategy_fingerprint_sha256: \`${report.source_strategy_fingerprint_sha256 ?? 'missing'}\`
- target_parent_rows: ${report.scope?.target_parent_rows ?? 0}
- target_child_rows: ${report.scope?.target_child_rows ?? 0}
- target_external_mappings: ${report.scope?.target_external_mappings ?? 0}
- blocked_rows: ${report.scope?.blocked_rows ?? 0}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}

## By Set

${markdownTable(['set_key', 'child_rows'], Object.entries(report.scope?.by_set ?? {}))}

## By Finish

${markdownTable(['finish_key', 'child_rows'], Object.entries(report.scope?.by_finish ?? {}))}

## By Mapping Source

${markdownTable(['source', 'mapping_rows'], Object.entries(report.scope?.by_mapping_source ?? {}))}

## Rollback Proof

- before_hash: \`${report.before_snapshot?.hash_sha256 ?? 'missing'}\`
- after_hash: \`${report.after_snapshot?.hash_sha256 ?? 'missing'}\`
- durable_after_snapshot_matches_before_snapshot: ${report.durable_after_snapshot_matches_before_snapshot}

## Approval Boundary

This report is dry-run proof only. It does not authorize real apply.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-12A Prefix-Collision Parent+Child Insert Guarded Dry Run Checkpoint V1](20260610_pkg12a_prefix_collision_parent_child_insert_guarded_dry_run_checkpoint_v1.md) | Rollback-only dry run for 3 non-colliding unprefixed parent inserts and 6 child printings while preserving existing prefixed RC/SL parents; 5 collision rows remain blocked for backfill/adjudication. No durable writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg12a_prefix_collision_parent_child_insert_guarded_dry_run_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg12a_prefix_collision_parent_child_insert_guarded_dry_run_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const source = await readJson(SOURCE_JSON);
  const sourceRows = (source.rows ?? []).filter((row) => row.strategy_status === READY_STATUS);
  const conn = connectionString();
  let report;

  if (!conn) {
    report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg12a_prefix_collision_parent_child_insert_guarded_dry_run_v1',
      package_id: PACKAGE_ID,
      source_strategy_fingerprint_sha256: source.fingerprint ?? null,
      dry_run_status: 'blocked_no_database_connection_string',
      stop_findings: ['database_connection_unavailable'],
      durable_db_writes_performed: false,
      db_writes_performed: false,
      migrations_created: false,
    };
  } else {
    const client = new Client({ connectionString: conn });
    await client.connect();
    try {
      const setByAlias = await resolveSets(client, sourceRows);
      const initialPlanned = buildTargets({ sourceRows, setByAlias });
      const mappingCollisions = await loadMappingCollisions(client, initialPlanned.mappingRows);
      const identitySlotCollisions = await loadIdentitySlotCollisions(client, initialPlanned.parentRows);
      const planned = excludeCollisions(initialPlanned, { mappingCollisions, identitySlotCollisions });
      const packageFingerprint = sha256(stableJson({
        package_id: PACKAGE_ID,
        source_strategy_fingerprint_sha256: source.fingerprint ?? null,
        parent_rows: planned.parentRows.map((row) => ({
          set_key: row.set_key,
          live_set_code: row.live_set_code,
          card_number: row.card_number,
          card_name: row.card_name,
          preferred_external_mapping: row.preferred_external_mapping,
        })),
        child_rows: planned.childRows.map((row) => ({
          set_key: row.set_key,
          card_number: row.card_number,
          card_name: row.card_name,
          finish_key: row.finish_key,
        })),
      }));
      const execution = planned.parentRows.length > 0
        ? await runDryRun(client, planned, packageFingerprint)
        : {
          status: 'blocked_no_targets_or_blocked_rows_present',
          error_message: null,
          before_snapshot: null,
          after_snapshot: null,
          rollback_proof_rows: [],
        };
      const durableMatch = execution.before_snapshot?.hash_sha256 === execution.after_snapshot?.hash_sha256;
      const byFinish = countBy(planned.childRows, (row) => row.finish_key);
      const bySet = countBy(planned.childRows, (row) => row.set_key);
      const stopFindings = [];
      if (source.package_id !== 'PKG-12-PARENT-IDENTITY-MISMATCH-STRATEGY') stopFindings.push('source_strategy_package_mismatch');
      if (planned.parentRows.length !== EXPECTED_PARENT_ROWS) stopFindings.push(`target_parent_count_not_${EXPECTED_PARENT_ROWS}`);
      if (planned.childRows.length !== EXPECTED_CHILD_ROWS) stopFindings.push(`target_child_count_not_${EXPECTED_CHILD_ROWS}`);
      if (planned.mappingRows.length !== EXPECTED_MAPPING_ROWS) stopFindings.push(`target_mapping_count_not_${EXPECTED_MAPPING_ROWS}`);
      if (stableJson(bySet) !== stableJson(EXPECTED_SET_COUNTS)) stopFindings.push('set_scope_mismatch');
      if (stableJson(byFinish) !== stableJson(EXPECTED_FINISH_COUNTS)) stopFindings.push('finish_scope_mismatch');
      if (planned.blockedRows.length !== EXPECTED_BLOCKED_ROWS) stopFindings.push(`blocked_row_count_not_${EXPECTED_BLOCKED_ROWS}`);
      if (execution.status !== 'pkg12a_prefix_collision_parent_child_insert_completed_rolled_back_no_durable_change') stopFindings.push('dry_run_not_passed');
      if (execution.error_message) stopFindings.push(`dry_run_error:${execution.error_message}`);
      if (!durableMatch) stopFindings.push('durable_after_snapshot_differs_from_before_snapshot');
      if (execution.before_snapshot?.counts?.existing_parent_exact_rows !== 0) stopFindings.push('before_parent_collision_rows_present');
      if (execution.before_snapshot?.counts?.existing_child_exact_rows !== 0) stopFindings.push('before_child_collision_rows_present');
      if (execution.before_snapshot?.counts?.external_mapping_collision_rows !== 0) stopFindings.push('before_external_mapping_collision_rows_present');

      report = {
        generated_at: new Date().toISOString(),
        version: 'english_master_index_pkg12a_prefix_collision_parent_child_insert_guarded_dry_run_v1',
        package_id: PACKAGE_ID,
        source_strategy_fingerprint_sha256: source.fingerprint ?? null,
        package_fingerprint_sha256: packageFingerprint,
        rollback_only: true,
        dry_run_status: execution.status,
        durable_db_writes_performed: false,
        db_writes_performed: false,
        migrations_created: false,
        cleanup_performed: false,
        quarantine_performed: false,
        real_apply_authorized: false,
        scope: {
          source_rows: sourceRows.length,
          target_parent_rows: planned.parentRows.length,
          target_child_rows: planned.childRows.length,
          target_external_mappings: planned.mappingRows.length,
          blocked_rows: planned.blockedRows.length,
          selected_set_keys: [...new Set(planned.childRows.map((row) => row.set_key))].sort(),
          by_set: bySet,
          by_finish: byFinish,
          by_mapping_source: countBy(planned.mappingRows, (row) => row.source),
          parent_rows: planned.parentRows,
          child_rows: planned.childRows,
          external_mapping_rows: planned.mappingRows,
          blocked_rows_detail: planned.blockedRows,
        },
        before_snapshot: execution.before_snapshot,
        after_snapshot: execution.after_snapshot,
        durable_after_snapshot_matches_before_snapshot: durableMatch,
        rollback_proof_rows: execution.rollback_proof_rows,
        stop_findings: stopFindings,
        recommended_real_apply_approval_text: stopFindings.length === 0
          ? `Approve real PKG-12A-PREFIX-COLLISION-PARENT-CHILD-INSERTS apply only. Fingerprint: ${packageFingerprint}. Scope: ${planned.parentRows.length} unprefixed parent card_print inserts, ${planned.childRows.length} child card_printing inserts, ${planned.mappingRows.length} external mappings across ${Object.keys(bySet).length} sets; existing prefixed RC/SL same-number parents preserved; ${planned.blockedRows.length} collision rows excluded for separate incomplete-parent backfill/adjudication; mapping sources ${Object.entries(countBy(planned.mappingRows, (row) => row.source)).map(([sourceName, count]) => `${sourceName}=${count}`).join(', ')}; finishes ${Object.entries(byFinish).map(([finish, count]) => `${finish}=${count}`).join(', ')}. Dry-run proof: ${execution.before_snapshot?.hash_sha256} == ${execution.after_snapshot?.hash_sha256}. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.`
          : null,
      };
    } finally {
      await client.end().catch(() => {});
    }
  }

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  await writeText(CHECKPOINT_MD, renderMarkdown(report));
  updateCheckpointIndex();

  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON),
    output_md: path.relative(ROOT, OUTPUT_MD),
    checkpoint_md: CHECKPOINT_MD,
    dry_run_status: report.dry_run_status,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    scope: report.scope,
    stop_findings: report.stop_findings,
    recommended_real_apply_approval_text: report.recommended_real_apply_approval_text,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
