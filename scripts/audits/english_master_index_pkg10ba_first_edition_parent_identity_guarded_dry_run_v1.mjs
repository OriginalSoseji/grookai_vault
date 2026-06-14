import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SQL_DIR = path.join(ROOT, 'docs', 'sql');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const CHECKPOINT_INDEX = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
const ALL_READY_MODE = process.argv.includes('--all-ready');
const ARTIFACT_STEM = ALL_READY_MODE
  ? 'english_master_index_pkg10bb_first_edition_parent_identity_bulk_guarded_dry_run_v1'
  : 'english_master_index_pkg10ba_first_edition_parent_identity_guarded_dry_run_v1';

const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg10b_first_edition_canonical_parent_readiness_v1.json');
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  `${ARTIFACT_STEM}.json`,
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  `${ARTIFACT_STEM}.md`,
);
const OUTPUT_SQL = path.join(
  SQL_DIR,
  ALL_READY_MODE
    ? 'english_master_index_pkg10bb_first_edition_parent_identity_bulk_guarded_dry_run_transaction_v1.sql'
    : 'english_master_index_pkg10ba_first_edition_parent_identity_guarded_dry_run_transaction_v1.sql',
);
const CHECKPOINT_MD = path.join(
  CHECKPOINT_DIR,
  ALL_READY_MODE
    ? '20260610_pkg10bb_first_edition_parent_identity_bulk_guarded_dry_run_checkpoint_v1.md'
    : '20260610_pkg10ba_first_edition_parent_identity_guarded_dry_run_checkpoint_v1.md',
);

const PACKAGE_ID = ALL_READY_MODE
  ? 'PKG-10B-B-FIRST-EDITION-PARENT-IDENTITY-BULK-DRY-RUN'
  : 'PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT';
const SOURCE_PACKAGE_ID = 'PKG-10B-FIRST-EDITION-CANONICAL-PARENT-READINESS';
const TARGET_SET_KEY = 'base2';
const TARGET_SET_NAME = 'Jungle';
const PROPOSED_PRINTED_IDENTITY_MODIFIER = 'edition:first_edition';
const CREATED_BY = 'pkg10ba_first_edition_parent_identity_guarded_dry_run_v1';
const PROVENANCE_SOURCE = 'verified_master_set_index_v1';

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
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlUuid(value) {
  return `${sqlString(value)}::uuid`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value ?? {}))}::jsonb`;
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function buildTargets(readiness) {
  const sourceRows = (readiness.rows ?? [])
    .filter((row) => (
      (ALL_READY_MODE || row.set_key === TARGET_SET_KEY)
      && (
        row.readiness_status === 'ready_parent_identity_insert_candidate'
        || row.readiness_status === 'ready_parent_identity_insert_candidate_name_alias'
      )
    ))
    .sort((left, right) => (
      normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number), undefined, { numeric: true }) ||
      String(left.card_name).localeCompare(String(right.card_name)) ||
      String(left.proposed_child_finish_key).localeCompare(String(right.proposed_child_finish_key))
    ))
    .map((row) => ({
      base_parent_id: row.base_parent.card_print_id,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      source_card_name: row.card_name,
      target_card_name: row.matched_parent_name ?? row.card_name,
      source_finish_key: row.source_finish_key,
      target_finish_key: row.proposed_child_finish_key,
      target_printed_identity_modifier: PROPOSED_PRINTED_IDENTITY_MODIFIER,
      target_variant_key: null,
      proposed_number_plain: row.proposed_number_plain,
      evidence_urls: row.evidence_urls ?? [],
      sources: row.sources ?? [],
      name_alias_applied: row.name_alias_applied,
    }));
  const parentIdsByKey = new Map();
  const childKeys = new Set();
  const targets = [];
  for (const row of sourceRows) {
    const parentKey = [
      row.base_parent_id,
      row.target_printed_identity_modifier,
      row.target_variant_key ?? '',
    ].join('|');
    if (!parentIdsByKey.has(parentKey)) parentIdsByKey.set(parentKey, crypto.randomUUID());
    const childKey = [parentKey, row.target_finish_key].join('|');
    if (childKeys.has(childKey)) continue;
    childKeys.add(childKey);
    targets.push({
      target_parent_id: parentIdsByKey.get(parentKey),
      target_child_id: crypto.randomUUID(),
      ...row,
    });
  }
  return {
    source_candidate_rows: sourceRows.length,
    deduped_source_rows: sourceRows.length - targets.length,
    targets,
  };
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         base_parent_id uuid,
         target_finish_key text,
         target_printed_identity_modifier text,
         target_variant_key text
       )
     )
     select
       'base_parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.printed_identity_modifier,
       cp.variant_key,
       null::text as finish_key
     from target t
     join public.card_prints cp on cp.id = t.base_parent_id
     union all
     select
       'proposed_parent_collision' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.printed_identity_modifier,
       cp.variant_key,
       null::text as finish_key
     from target t
     join public.card_prints base on base.id = t.base_parent_id
     join public.card_prints cp
       on cp.set_id = base.set_id
      and cp.number_plain = base.number_plain
      and coalesce(cp.printed_identity_modifier, '') = t.target_printed_identity_modifier
      and coalesce(cp.variant_key, '') = coalesce(t.target_variant_key, '')
     union all
     select
       'proposed_child_collision' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.printed_identity_modifier,
       cp.variant_key,
       cpr.finish_key
     from target t
     join public.card_printings cpr on cpr.id = t.target_child_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     order by row_type, set_code nulls last, number_plain nulls last, number nulls last, name nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets)],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      base_parent_rows: rows.filter((row) => row.row_type === 'base_parent').length,
      proposed_parent_collision_rows: rows.filter((row) => row.row_type === 'proposed_parent_collision').length,
      proposed_child_collision_rows: rows.filter((row) => row.row_type === 'proposed_child_collision').length,
      total_rows: rows.length,
    },
  };
}

function valuesSql(targets) {
  return targets.map((row) => `  (${[
    sqlUuid(row.target_parent_id),
    sqlUuid(row.target_child_id),
    sqlUuid(row.base_parent_id),
    sqlString(row.set_key),
    sqlString(row.card_number),
    sqlString(row.source_card_name),
    sqlString(row.target_card_name),
    sqlString(row.source_finish_key),
    sqlString(row.target_finish_key),
    sqlString(row.target_printed_identity_modifier),
    sqlString(row.target_variant_key),
    sqlString(row.proposed_number_plain),
    sqlJson({ sources: row.sources, evidence_urls: row.evidence_urls, package_id: PACKAGE_ID }),
  ].join(', ')})`).join(',\n');
}

function buildSql(targets, packageFingerprint, sourceFingerprint) {
  const expectedSetCount = new Set(targets.map((row) => row.set_key)).size;
  const expectedParentCount = new Set(targets.map((row) => row.target_parent_id)).size;
  return `-- English Master Index ${PACKAGE_ID} guarded dry-run transaction V1
-- Rollback-only artifact. No COMMIT path.
-- Target scope: ${ALL_READY_MODE ? 'all ready first-edition sets' : `${TARGET_SET_KEY} / ${TARGET_SET_NAME}`}
-- Source readiness fingerprint: ${sourceFingerprint}
-- Package fingerprint: ${packageFingerprint}

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

create temporary table pkg10ba_targets (
  target_parent_id uuid not null,
  target_child_id uuid primary key,
  base_parent_id uuid not null,
  set_key text not null,
  card_number text not null,
  source_card_name text not null,
  target_card_name text not null,
  source_finish_key text not null,
  target_finish_key text not null,
  target_printed_identity_modifier text not null,
  target_variant_key text null,
  proposed_number_plain text not null,
  evidence jsonb not null
) on commit drop;

insert into pkg10ba_targets (
  target_parent_id,
  target_child_id,
  base_parent_id,
  set_key,
  card_number,
  source_card_name,
  target_card_name,
  source_finish_key,
  target_finish_key,
  target_printed_identity_modifier,
  target_variant_key,
  proposed_number_plain,
  evidence
) values
${valuesSql(targets)};

do $$
declare
  target_count int;
  set_count int;
  missing_base_count int;
  inactive_finish_count int;
  parent_collision_count int;
  child_collision_count int;
begin
  select count(*) into target_count from pkg10ba_targets;
  select count(distinct set_key) into set_count from pkg10ba_targets;
  select count(*) into missing_base_count
  from pkg10ba_targets target
  left join public.card_prints base on base.id = target.base_parent_id
  where base.id is null;
  select count(*) into inactive_finish_count
  from pkg10ba_targets target
  left join public.finish_keys fk
    on fk.key = target.target_finish_key
   and fk.is_active = true
  where fk.key is null;
  select count(*) into parent_collision_count
  from pkg10ba_targets target
  join public.card_prints base on base.id = target.base_parent_id
  join public.card_prints cp
    on cp.set_id = base.set_id
   and cp.number_plain = base.number_plain
   and coalesce(cp.printed_identity_modifier, '') = target.target_printed_identity_modifier
   and coalesce(cp.variant_key, '') = coalesce(target.target_variant_key, '');
  select count(*) into child_collision_count
  from pkg10ba_targets target
  join public.card_printings cpr on cpr.id = target.target_child_id;

  if target_count <> ${targets.length} then raise exception 'PKG-10BA target count drift: %', target_count; end if;
  if set_count <> ${expectedSetCount} then raise exception 'PKG-10BA set count drift: %', set_count; end if;
  if missing_base_count <> 0 then raise exception 'PKG-10BA missing base parents: %', missing_base_count; end if;
  if inactive_finish_count <> 0 then raise exception 'PKG-10BA inactive target finishes: %', inactive_finish_count; end if;
  if parent_collision_count <> 0 then raise exception 'PKG-10BA proposed parent collisions: %', parent_collision_count; end if;
  if child_collision_count <> 0 then raise exception 'PKG-10BA planned child id collisions: %', child_collision_count; end if;
end $$;

insert into public.card_prints (
  id,
  game_id,
  set_id,
  name,
  number,
  variant_key,
  rarity,
  image_url,
  tcgplayer_id,
  external_ids,
  updated_at,
  set_code,
  artist,
  regulation_mark,
  image_alt_url,
  image_source,
  variants,
  created_at,
  last_synced_at,
  print_identity_key,
  ai_metadata,
  image_hash,
  data_quality_flags,
  image_status,
  image_res,
  image_last_checked_at,
  printed_set_abbrev,
  printed_total,
  gv_id,
  image_path,
  identity_domain,
  printed_identity_modifier,
  set_identity_model,
  representative_image_url,
  image_note
)
select
  target.target_parent_id,
  base.game_id,
  base.set_id,
  target.target_card_name,
  base.number,
  target.target_variant_key,
  base.rarity,
  base.image_url,
  null,
  jsonb_build_object('verified_master_index_v1', target.evidence),
  now(),
  base.set_code,
  base.artist,
  base.regulation_mark,
  base.image_alt_url,
  base.image_source,
  base.variants,
  now(),
  now(),
  base.print_identity_key,
  coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
    'source', '${PROVENANCE_SOURCE}',
    'package_id', '${PACKAGE_ID}',
    'source_package_id', '${SOURCE_PACKAGE_ID}',
    'first_edition_base_parent_id', base.id::text
  ),
  base.image_hash,
  base.data_quality_flags,
  base.image_status,
  base.image_res,
  base.image_last_checked_at,
  base.printed_set_abbrev,
  base.printed_total,
  null,
  base.image_path,
  base.identity_domain,
  target.target_printed_identity_modifier,
  base.set_identity_model,
  base.representative_image_url,
  'first edition parent identity dry-run clone; rollback only'
from (
  select distinct on (target_parent_id) *
  from pkg10ba_targets
  order by target_parent_id
) target
join public.card_prints base on base.id = target.base_parent_id;

insert into public.card_printings (
  id,
  card_print_id,
  finish_key,
  created_at,
  is_provisional,
  provenance_source,
  provenance_ref,
  created_by,
  printing_gv_id,
  image_source,
  image_path,
  image_url,
  image_alt_url,
  image_status,
  image_note
)
select
  target.target_child_id,
  target.target_parent_id,
  target.target_finish_key,
  now(),
  false,
  '${PROVENANCE_SOURCE}',
  concat(target.set_key, ':', target.card_number, ':', target.source_finish_key, '->', target.target_finish_key),
  '${CREATED_BY}',
  null,
  null,
  null,
  null,
  null,
  null,
  'first edition child printing dry-run; rollback only'
from pkg10ba_targets target;

do $$
declare
  inserted_parent_count int;
  inserted_child_count int;
begin
  select count(*) into inserted_parent_count
  from public.card_prints cp
  join pkg10ba_targets target on target.target_parent_id = cp.id;
  select count(*) into inserted_child_count
  from public.card_printings cpr
  join pkg10ba_targets target on target.target_child_id = cpr.id;

  if inserted_parent_count <> ${expectedParentCount} then raise exception 'PKG-10BA inserted parent count drift: %', inserted_parent_count; end if;
  if inserted_child_count <> ${targets.length} then raise exception 'PKG-10BA inserted child count drift: %', inserted_child_count; end if;
end $$;

rollback;
`;
}

async function executeDryRun(client, targets) {
  const expectedSetCount = new Set(targets.map((row) => row.set_key)).size;
  const expectedParentCount = new Set(targets.map((row) => row.target_parent_id)).size;
  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg10ba_targets (
         target_parent_id uuid not null,
         target_child_id uuid primary key,
         base_parent_id uuid not null,
         set_key text not null,
         card_number text not null,
         source_card_name text not null,
         target_card_name text not null,
         source_finish_key text not null,
         target_finish_key text not null,
         target_printed_identity_modifier text not null,
         target_variant_key text null,
         proposed_number_plain text not null,
         evidence jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg10ba_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         base_parent_id uuid,
         set_key text,
         card_number text,
         source_card_name text,
         target_card_name text,
         source_finish_key text,
         target_finish_key text,
         target_printed_identity_modifier text,
         target_variant_key text,
         proposed_number_plain text,
         evidence jsonb
       )`,
      [JSON.stringify(targets.map((row) => ({
        ...row,
        evidence: { sources: row.sources, evidence_urls: row.evidence_urls, package_id: PACKAGE_ID },
      })))],
    );
    const guard = await client.query(
      `select
         (select count(*)::int from pkg10ba_targets) as target_count,
         (select count(distinct set_key)::int from pkg10ba_targets) as set_count,
         (select count(*)::int
          from pkg10ba_targets target
          left join public.card_prints base on base.id = target.base_parent_id
          where base.id is null) as missing_base_count,
         (select count(*)::int
          from pkg10ba_targets target
          left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true
          where fk.key is null) as inactive_finish_count,
         (select count(*)::int
          from pkg10ba_targets target
          join public.card_prints base on base.id = target.base_parent_id
          join public.card_prints cp
            on cp.set_id = base.set_id
           and cp.number_plain = base.number_plain
           and coalesce(cp.printed_identity_modifier, '') = target.target_printed_identity_modifier
           and coalesce(cp.variant_key, '') = coalesce(target.target_variant_key, '')) as parent_collision_count,
         (select count(*)::int
          from pkg10ba_targets target
          join public.card_printings cpr on cpr.id = target.target_child_id) as child_collision_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== targets.length
      || guardRow.set_count !== expectedSetCount
      || guardRow.missing_base_count !== 0
      || guardRow.inactive_finish_count !== 0
      || guardRow.parent_collision_count !== 0
      || guardRow.child_collision_count !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
    }

    await client.query(
      `insert into public.card_prints (
         id, game_id, set_id, name, number, variant_key, rarity, image_url, tcgplayer_id, external_ids,
         updated_at, set_code, artist, regulation_mark, image_alt_url, image_source, variants, created_at,
         last_synced_at, print_identity_key, ai_metadata, image_hash, data_quality_flags, image_status,
         image_res, image_last_checked_at, printed_set_abbrev, printed_total, gv_id,
         image_path, identity_domain, printed_identity_modifier, set_identity_model, representative_image_url, image_note
       )
       select
         target.target_parent_id, base.game_id, base.set_id, target.target_card_name, base.number,
         target.target_variant_key, base.rarity, base.image_url, null,
         jsonb_build_object('verified_master_index_v1', target.evidence), now(), base.set_code,
         base.artist, base.regulation_mark, base.image_alt_url, base.image_source, base.variants, now(),
         now(), base.print_identity_key,
         coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'source', $1::text,
           'package_id', $2::text,
           'source_package_id', $3::text,
           'first_edition_base_parent_id', base.id::text
         ),
         base.image_hash, base.data_quality_flags, base.image_status, base.image_res, base.image_last_checked_at,
         base.printed_set_abbrev, base.printed_total, null, base.image_path, base.identity_domain,
         target.target_printed_identity_modifier, base.set_identity_model, base.representative_image_url,
         'first edition parent identity dry-run clone; rollback only'
       from (
         select distinct on (target_parent_id) *
         from pkg10ba_targets
         order by target_parent_id
       ) target
       join public.card_prints base on base.id = target.base_parent_id`,
      [PROVENANCE_SOURCE, PACKAGE_ID, SOURCE_PACKAGE_ID],
    );
    await client.query(
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
         $1::text,
         concat(target.set_key, ':', target.card_number, ':', target.source_finish_key, '->', target.target_finish_key),
         $2::text,
         null, null, null, null, null, null,
         'first edition child printing dry-run; rollback only'
       from pkg10ba_targets target`,
      [PROVENANCE_SOURCE, CREATED_BY],
    );
    const inserted = await client.query(
      `select
         (select count(*)::int from public.card_prints cp join pkg10ba_targets target on target.target_parent_id = cp.id) as inserted_parent_count,
         (select count(*)::int from public.card_printings cpr join pkg10ba_targets target on target.target_child_id = cpr.id) as inserted_child_count`,
    );
    if (
      inserted.rows[0].inserted_parent_count !== expectedParentCount
      || inserted.rows[0].inserted_child_count !== targets.length
    ) {
      throw new Error(`insert count mismatch: ${JSON.stringify(inserted.rows[0])}`);
    }
    await client.query('rollback');
    return {
      ok: true,
      guard: guardRow,
      inserted: inserted.rows[0],
      rolled_back: true,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      ok: false,
      error: error.message,
      rolled_back: true,
    };
  }
}

function renderMarkdown(report) {
  const countRows = Object.entries(report.summary.by_finish).map(([finish, count]) => [finish, count]);
  return `# English Master Index ${ALL_READY_MODE ? 'PKG-10BB Bulk' : 'PKG-10BA'} First Edition Parent Identity Guarded Dry Run V1

Rollback-only dry-run for ${ALL_READY_MODE ? 'all ready first-edition sets' : `\`${TARGET_SET_KEY}\` / ${TARGET_SET_NAME}`}.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- rollback_only: ${report.rollback_only}
- real_apply_authorized: false

## Scope

- package_id: ${PACKAGE_ID}
- source_package_id: ${SOURCE_PACKAGE_ID}
- target_set_key: ${report.target_set_key}
- target_set_count: ${report.summary.target_set_count}
- target_parent_inserts_simulated: ${report.summary.target_parent_rows}
- target_child_inserts_simulated: ${report.summary.target_child_rows}
- external_mapping_inserts_simulated: 0
- package_fingerprint_sha256: ${report.package_fingerprint_sha256}

${markdownTable(['finish_key', 'rows'], countRows)}

## Proof

- before_hash: ${report.before_snapshot.hash_sha256}
- after_hash: ${report.after_snapshot.hash_sha256}
- rollback_proof_equal: ${report.rollback_proof_equal}
- dry_run_ok: ${report.dry_run.ok}

## Next

If this proof is accepted, the next safe step is a no-write real-apply gate for this exact one-set pilot. No real apply is authorized by this report.
`;
}

function checkpointText(report) {
  return `# ${ALL_READY_MODE ? 'PKG-10BB Bulk' : 'PKG-10BA'} First Edition Parent Identity Guarded Dry Run Checkpoint V1

- generated_at: ${report.generated_at}
- package_id: ${PACKAGE_ID}
- target_set_key: ${report.target_set_key}
- target_set_count: ${report.summary.target_set_count}
- package_fingerprint_sha256: ${report.package_fingerprint_sha256}
- target_parent_rows: ${report.summary.target_parent_rows}
- target_child_rows: ${report.summary.target_child_rows}
- rollback_proof_equal: ${report.rollback_proof_equal}
- dry_run_ok: ${report.dry_run.ok}
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Guardrail

First edition remains a parent identity modifier strategy. No \`first_edition_normal\` or \`first_edition_holo\` finish key was activated.
`;
}

async function updateCheckpointIndex() {
  let existing = '';
  try {
    existing = await fs.readFile(CHECKPOINT_INDEX, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const line = ALL_READY_MODE
    ? '| 2026-06-10 | [PKG-10BB First Edition Parent Identity Bulk Guarded Dry Run Checkpoint V1](20260610_pkg10bb_first_edition_parent_identity_bulk_guarded_dry_run_checkpoint_v1.md) | Rollback-only bulk dry-run for all ready first-edition parent identity inserts and normal/holo child inserts. No durable writes or migrations. |'
    : '| 2026-06-10 | [PKG-10BA First Edition Parent Identity Guarded Dry Run Checkpoint V1](20260610_pkg10ba_first_edition_parent_identity_guarded_dry_run_checkpoint_v1.md) | Rollback-only dry-run for first-edition parent identity inserts and normal/holo child inserts for base2/Jungle. No durable writes or migrations. |';
  const checkpointRef = ALL_READY_MODE
    ? '20260610_pkg10bb_first_edition_parent_identity_bulk_guarded_dry_run_checkpoint_v1.md'
    : '20260610_pkg10ba_first_edition_parent_identity_guarded_dry_run_checkpoint_v1.md';
  if (existing.includes(checkpointRef)) return;
  const next = existing.endsWith('\n') || existing.length === 0 ? `${existing}${line}\n` : `${existing}\n${line}\n`;
  await fs.mkdir(path.dirname(CHECKPOINT_INDEX), { recursive: true });
  await fs.writeFile(CHECKPOINT_INDEX, next);
}

const readiness = await readJson(SOURCE_JSON);
const targetBuild = buildTargets(readiness);
const { targets } = targetBuild;
const packageFingerprint = sha256(stableJson(targets.map((row) => ({
  base_parent_id: row.base_parent_id,
  set_key: row.set_key,
  card_number: row.card_number,
  target_card_name: row.target_card_name,
  source_finish_key: row.source_finish_key,
  target_finish_key: row.target_finish_key,
  target_printed_identity_modifier: row.target_printed_identity_modifier,
}))));
const sourceFingerprint = readiness.package_fingerprint_sha256;
const sql = buildSql(targets, packageFingerprint, sourceFingerprint);

const conn = connectionString();
if (!conn) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.');

const client = new Client({ connectionString: conn });
await client.connect();
let beforeSnapshot;
let afterSnapshot;
let dryRun;
try {
  await client.query('begin read only');
  await client.query('set transaction read only');
  beforeSnapshot = await captureSnapshot(client, targets);
  await client.query('rollback');
  dryRun = await executeDryRun(client, targets);
  await client.query('begin read only');
  await client.query('set transaction read only');
  afterSnapshot = await captureSnapshot(client, targets);
  await client.query('rollback');
} finally {
  await client.end().catch(() => {});
}

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg10ba_first_edition_parent_identity_guarded_dry_run_v1',
  package_id: PACKAGE_ID,
  source_package_id: SOURCE_PACKAGE_ID,
  source_artifact: SOURCE_JSON,
  target_set_key: ALL_READY_MODE ? 'all_ready_first_edition_sets' : TARGET_SET_KEY,
  target_set_name: ALL_READY_MODE ? 'All Ready First Edition Sets' : TARGET_SET_NAME,
  package_fingerprint_sha256: packageFingerprint,
  source_readiness_fingerprint_sha256: sourceFingerprint,
  rollback_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  parent_strategy: {
    printed_identity_modifier: PROPOSED_PRINTED_IDENTITY_MODIFIER,
    source_finish_keys_not_activated: ['first_edition_normal', 'first_edition_holo'],
    child_finish_decomposition: {
      first_edition_normal: 'normal',
      first_edition_holo: 'holo',
    },
  },
  summary: {
    source_candidate_rows: targetBuild.source_candidate_rows,
    deduped_source_rows: targetBuild.deduped_source_rows,
    target_parent_rows: new Set(targets.map((row) => row.target_parent_id)).size,
    target_child_rows: targets.length,
    external_mapping_rows: 0,
    target_set_count: new Set(targets.map((row) => row.set_key)).size,
    by_set: countBy(targets, (row) => row.set_key),
    by_finish: countBy(targets, (row) => row.target_finish_key),
    by_source_finish: countBy(targets, (row) => row.source_finish_key),
    name_alias_rows: targets.filter((row) => row.name_alias_applied).length,
  },
  before_snapshot: beforeSnapshot,
  dry_run: dryRun,
  after_snapshot: afterSnapshot,
  rollback_proof_equal: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
  sql_artifact: OUTPUT_SQL,
  targets,
};

await writeText(OUTPUT_SQL, sql);
await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, checkpointText(report));
await updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  output_sql: OUTPUT_SQL,
  checkpoint_md: CHECKPOINT_MD,
  package_fingerprint_sha256: packageFingerprint,
  summary: report.summary,
  dry_run: report.dry_run,
  rollback_proof_equal: report.rollback_proof_equal,
}, null, 2));
