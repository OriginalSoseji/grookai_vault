import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const READINESS_JSON = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'english_master_index_pkg11b_stamped_finish_routing_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'stamped_parent_identity_insert_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'stamped_parent_identity_insert_guarded_dry_run_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-05B-STAMPED-PARENT-IDENTITY-INSERTS';
const CREATED_BY = 'english_master_index_missing_promo_05b_stamped_parent_identity_insert_guarded_dry_run_v1';
const FINISH_SUFFIX = {
  normal: 'STD',
  holo: 'HOLO',
  reverse: 'RH',
  cosmos: 'COSMOS',
  cracked_ice: 'CRACKED-ICE',
};

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

function uuidFromSeed(seed) {
  const hash = crypto.createHash('sha256').update(seed).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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

function finishSuffix(finishKey) {
  return FINISH_SUFFIX[finishKey] ?? String(finishKey).toUpperCase().replaceAll('_', '-');
}

function sourceTargets(readinessReport) {
  return (readinessReport.rows ?? [])
    .filter((row) => row.routing_status === 'ready_finish_routed_exact_label')
    .filter((row) => row.target_finish_key && row.target_finish_key !== 'stamped')
    .filter((row) => row.base_parent_ids?.length === 1)
    .filter((row) => row.proposed_variant_key && normalizeText(row.proposed_variant_key) !== 'stamped')
    .map((row) => ({
      base_parent_id: row.base_parent_ids[0],
      set_code: row.set_key,
      number: row.card_number,
      name: row.card_name,
      variant_key: row.proposed_variant_key,
      printed_identity_modifier: row.proposed_variant_key,
      stamp_label: row.stamp_label,
      finish_key: row.target_finish_key,
      family: row.proposed_variant_key?.includes('league') ? 'league_stamp' : 'other_stamp',
      evidence: {
        routing_status: row.routing_status,
        routing_fingerprint: readinessReport.fingerprint_sha256,
        preserved_evidence_sources: row.preserved_evidence_sources ?? [],
        evidence_urls: row.preserved_evidence_urls ?? [],
        evidence_labels: row.preserved_evidence_labels ?? [],
        finish_claims: row.finish_claims ?? [],
        supporting_finish_claims: row.supporting_finish_claims ?? [],
      },
    }));
}

async function resolveMissingParentTargets(client, rows) {
  const result = await client.query(
    `with source as (
       select *
       from jsonb_to_recordset($1::jsonb) as s(
         base_parent_id uuid,
         set_code text,
         number text,
         name text,
         variant_key text,
         printed_identity_modifier text,
         stamp_label text,
         finish_key text,
         family text,
         evidence jsonb
       )
     ),
     resolved as (
       select
         source.*,
         base.id as resolved_base_parent_id,
         base.gv_id as base_gv_id,
         base.number_plain as base_number_plain,
         base.printed_set_abbrev as base_printed_set_abbrev,
         base.set_id as base_set_id,
         count(existing.id) as existing_parent_count,
         count(existing_child.id) as existing_child_count
       from source
       join public.card_prints base on base.id = source.base_parent_id
       left join public.card_prints existing
         on existing.set_id = base.set_id
        and existing.number = base.number
        and existing.name = base.name
        and coalesce(existing.variant_key, '') = coalesce(source.variant_key, '')
       left join public.card_printings existing_child
         on existing_child.card_print_id = existing.id
        and existing_child.finish_key = source.finish_key
       group by
         source.base_parent_id, source.set_code, source.number, source.name, source.variant_key,
         source.printed_identity_modifier, source.stamp_label, source.finish_key, source.family,
         source.evidence, base.id, base.gv_id, base.number_plain, base.printed_set_abbrev, base.set_id
     )
     select *
     from resolved
     where existing_parent_count = 0
     order by set_code, number, name, variant_key`,
    [JSON.stringify(rows)],
  );

  return result.rows.map((row) => {
    const targetParentId = uuidFromSeed(`${PACKAGE_ID}:parent:${row.set_code}:${row.number}:${row.name}:${row.variant_key}`);
    const targetChildId = uuidFromSeed(`${PACKAGE_ID}:child:${row.set_code}:${row.number}:${row.name}:${row.variant_key}:${row.finish_key}`);
    const setToken = String(row.base_printed_set_abbrev || row.set_code).toUpperCase().replace(/[^A-Z0-9]+/g, '-');
    const variantToken = String(row.variant_key).toUpperCase().replace(/[^A-Z0-9]+/g, '-');
    const gvId = `GV-PK-${setToken}-${row.base_number_plain}-${variantToken}`;
    return {
      parent_id: targetParentId,
      child_id: targetChildId,
      base_parent_id: row.resolved_base_parent_id,
      set_code: row.set_code,
      number: row.number,
      name: row.name,
      variant_key: row.variant_key,
      printed_identity_modifier: row.printed_identity_modifier,
      stamp_label: row.stamp_label,
      finish_key: row.finish_key,
      family: row.family,
      gv_id: gvId,
      printing_gv_id: `${gvId}-${finishSuffix(row.finish_key)}`,
      evidence_mode: 'new_stamped_parent_exact_active_finish',
      evidence: row.evidence,
    };
  });
}

function packageFingerprint(targets, readinessReport) {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    readiness_fingerprint_sha256: readinessReport.fingerprint_sha256,
    targets: targets.map((target) => ({
      parent_id: target.parent_id,
      child_id: target.child_id,
      base_parent_id: target.base_parent_id,
      set_code: target.set_code,
      number: target.number,
      name: target.name,
      variant_key: target.variant_key,
      printed_identity_modifier: target.printed_identity_modifier,
      finish_key: target.finish_key,
      gv_id: target.gv_id,
      printing_gv_id: target.printing_gv_id,
      evidence_urls: target.evidence?.evidence_urls ?? [],
      evidence_labels: target.evidence?.evidence_labels ?? [],
    })),
  }));
}

function sqlHash() {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    writes: [
      'insert public.card_prints stamped parent identities from exact active finish evidence',
      'insert public.card_print_identity active identity rows through projection',
      'insert public.card_printings active finish child rows',
    ],
    forbidden: ['external mapping writes', 'pricing writes', 'image writes', 'deletes', 'merges', 'migrations', 'global apply', 'stamped finish_key'],
  }));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(parent_id uuid, child_id uuid, base_parent_id uuid, finish_key text, gv_id text, printing_gv_id text)
     )
     select 'target_parent' as row_type, cp.id::text as row_id, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id, null::text as finish_key, null::text as printing_gv_id
     from target t
     join public.card_prints cp on cp.id = t.parent_id
     union all
     select 'target_child', cpr.id::text, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id, cpr.finish_key, cpr.printing_gv_id
     from target t
     join public.card_printings cpr on cpr.id = t.child_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select 'target_identity', cpi.id::text, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id, null::text, null::text
     from target t
     join public.card_print_identity cpi on cpi.card_print_id = t.parent_id and cpi.is_active = true
     join public.card_prints cp on cp.id = cpi.card_print_id
     order by row_type, set_code, number, name, variant_key nulls first, finish_key nulls first, row_id`,
    [JSON.stringify(targets.map((target) => ({
      parent_id: target.parent_id,
      child_id: target.child_id,
      base_parent_id: target.base_parent_id,
      finish_key: target.finish_key,
      gv_id: target.gv_id,
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

async function runDryRun(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table missing_promo_05b_targets (
         parent_id uuid primary key,
         child_id uuid not null unique,
         base_parent_id uuid not null,
         set_code text not null,
         number text not null,
         name text not null,
         variant_key text not null,
         printed_identity_modifier text,
         stamp_label text,
         finish_key text not null,
         family text not null,
         gv_id text not null unique,
         printing_gv_id text not null unique,
         evidence_mode text not null,
         evidence jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into missing_promo_05b_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         parent_id uuid,
         child_id uuid,
         base_parent_id uuid,
         set_code text,
         number text,
         name text,
         variant_key text,
         printed_identity_modifier text,
         stamp_label text,
         finish_key text,
         family text,
         gv_id text,
         printing_gv_id text,
         evidence_mode text,
         evidence jsonb
       )`,
      [JSON.stringify(targets)],
    );

    const preGuard = await client.query(
      `select
         (select count(*)::int from missing_promo_05b_targets) as target_count,
         (select count(distinct parent_id)::int from missing_promo_05b_targets) as parent_id_count,
         (select count(distinct child_id)::int from missing_promo_05b_targets) as child_id_count,
         (select count(distinct gv_id)::int from missing_promo_05b_targets) as gv_id_count,
         (select count(distinct printing_gv_id)::int from missing_promo_05b_targets) as printing_gv_id_count,
         (select count(*)::int from missing_promo_05b_targets t left join public.card_prints base on base.id = t.base_parent_id where base.id is null) as missing_base_parent_count,
         (select count(*)::int from missing_promo_05b_targets t join public.card_prints cp on cp.id = t.parent_id) as parent_id_collision_count,
         (select count(*)::int from missing_promo_05b_targets t join public.card_prints cp on cp.gv_id = t.gv_id) as gv_id_collision_count,
         (select count(*)::int
          from missing_promo_05b_targets t
          join public.card_prints base on base.id = t.base_parent_id
          join public.card_prints existing
            on existing.set_id = base.set_id
           and existing.number = base.number
           and existing.name = base.name
           and coalesce(existing.variant_key, '') = coalesce(t.variant_key, '')) as parent_identity_collision_count,
         (select count(*)::int from missing_promo_05b_targets t join public.card_printings cpr on cpr.id = t.child_id) as child_id_collision_count,
         (select count(*)::int from missing_promo_05b_targets t join public.card_printings cpr on cpr.printing_gv_id = t.printing_gv_id) as printing_gv_id_collision_count,
         (select count(*)::int from missing_promo_05b_targets t left join public.finish_keys fk on fk.key = t.finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int from missing_promo_05b_targets where finish_key = 'stamped') as forbidden_stamped_finish_count`,
    );
    const preGuardRow = preGuard.rows[0];
    if (
      preGuardRow.target_count !== targets.length
      || preGuardRow.parent_id_count !== targets.length
      || preGuardRow.child_id_count !== targets.length
      || preGuardRow.gv_id_count !== targets.length
      || preGuardRow.printing_gv_id_count !== targets.length
      || preGuardRow.missing_base_parent_count !== 0
      || preGuardRow.parent_id_collision_count !== 0
      || preGuardRow.gv_id_collision_count !== 0
      || preGuardRow.parent_identity_collision_count !== 0
      || preGuardRow.child_id_collision_count !== 0
      || preGuardRow.printing_gv_id_collision_count !== 0
      || preGuardRow.inactive_finish_count !== 0
      || preGuardRow.forbidden_stamped_finish_count !== 0
    ) {
      throw new Error(`pre-guard failed: ${JSON.stringify(preGuardRow)}`);
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
         target.parent_id,
         base.game_id,
         base.set_id,
         base.name,
         base.number,
         target.variant_key,
         base.rarity,
         null,
         null,
         coalesce(base.external_ids, '{}'::jsonb) || jsonb_build_object('verified_master_index_v1', target.evidence),
         now(),
         base.set_code,
         base.artist,
         base.regulation_mark,
         null,
         null,
         base.variants,
         now(),
         now(),
         base.print_identity_key,
         coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'source', 'verified_master_set_index_v1',
           'package_id', $1::text,
           'base_parent_id', base.id::text,
           'stamp_label', target.stamp_label,
           'variant_key', target.variant_key,
           'printed_identity_modifier', target.printed_identity_modifier,
           'explicit_child_finish_key', target.finish_key
         ),
         null,
         base.data_quality_flags,
         'representative_shared_stamp',
         base.image_res,
         now(),
         base.printed_set_abbrev,
         base.printed_total,
         target.gv_id,
         null,
         base.identity_domain,
         target.printed_identity_modifier,
         base.set_identity_model,
         coalesce(base.representative_image_url, base.image_url),
         concat('Stamped canonical identity: ', target.stamp_label, '. Representative base image only until exact stamped image is available.')
       from missing_promo_05b_targets target
       join public.card_prints base on base.id = target.base_parent_id`,
      [PACKAGE_ID],
    );

    const identityInsert = await client.query(
      `with projection as (
         select
           target.parent_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, cp.set_code, s.code, cp.number, cp.number_plain, cp.name, cp.variant_key,
             coalesce(cp.printed_total, s.printed_total), coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from missing_promo_05b_targets target
         join public.card_prints cp on cp.id = target.parent_id
         left join public.sets s on s.id = cp.set_id
       ),
       guarded as (
         select
           parent_id,
           projected,
           projected->>'identity_key_hash' as identity_key_hash
         from projection
         where projected->>'status' = 'ready'
       )
       insert into public.card_print_identity (
         card_print_id, identity_domain, set_code_identity, printed_number,
         normalized_printed_name, source_name_raw, identity_payload,
         identity_key_version, identity_key_hash, is_active
       )
       select
         parent_id,
         projected->>'identity_domain',
         projected->>'set_code_identity',
         projected->>'printed_number',
         nullif(projected->>'normalized_printed_name', ''),
         nullif(projected->>'source_name_raw', ''),
         coalesce(projected->'identity_payload', '{}'::jsonb),
         projected->>'identity_key_version',
         projected->>'identity_key_hash',
         true
       from guarded`,
    );

    const childInsert = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, created_at, is_provisional, provenance_source, provenance_ref, created_by,
         printing_gv_id, image_source, image_path, image_url, image_alt_url, image_status, image_note
       )
       select
         child_id,
         parent_id,
         finish_key,
         now(),
         false,
         'verified_master_index_v1',
         concat(set_code, ':', number, ':', variant_key, ':', finish_key),
         $1::text,
         printing_gv_id,
         null,
         null,
         null,
         null,
         'representative_shared_stamp',
         concat('Stamped parent child printing completed from exact active finish evidence: ', evidence_mode)
       from missing_promo_05b_targets
       order by set_code, number, name`,
      [CREATED_BY],
    );

    const postGuard = await client.query(
      `with projection as (
         select
           target.parent_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, cp.set_code, s.code, cp.number, cp.number_plain, cp.name, cp.variant_key,
             coalesce(cp.printed_total, s.printed_total), coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from missing_promo_05b_targets target
         join public.card_prints cp on cp.id = target.parent_id
         left join public.sets s on s.id = cp.set_id
       )
       select
         (select count(*)::int from missing_promo_05b_targets) as target_count,
         (select count(*)::int from public.card_prints cp join missing_promo_05b_targets target on target.parent_id = cp.id) as inserted_parent_count,
         (select count(*)::int from public.card_print_identity cpi join missing_promo_05b_targets target on target.parent_id = cpi.card_print_id and cpi.is_active = true) as inserted_identity_count,
         (select count(*)::int from public.card_printings cpr join missing_promo_05b_targets target on target.child_id = cpr.id and cpr.card_print_id = target.parent_id and cpr.finish_key = target.finish_key) as inserted_child_count,
         (select count(*)::int from projection where projected->>'status' <> 'ready') as projection_not_ready_count,
         (select count(*)::int
          from public.card_print_identity cpi
          where cpi.is_active = true
          group by cpi.identity_domain, cpi.identity_key_version, cpi.identity_key_hash
          having count(*) > 1
          limit 1) as duplicate_active_identity_hash_exists,
         (select count(*)::int from public.card_printings cpr join missing_promo_05b_targets target on target.child_id = cpr.id and cpr.finish_key = 'stamped') as forbidden_stamped_child_count`,
    );
    const postGuardRow = postGuard.rows[0];
    if (
      parentInsert.rowCount !== targets.length
      || identityInsert.rowCount !== targets.length
      || childInsert.rowCount !== targets.length
      || postGuardRow.inserted_parent_count !== targets.length
      || postGuardRow.inserted_identity_count !== targets.length
      || postGuardRow.inserted_child_count !== targets.length
      || postGuardRow.projection_not_ready_count !== 0
      || Number(postGuardRow.duplicate_active_identity_hash_exists ?? 0) !== 0
      || postGuardRow.forbidden_stamped_child_count !== 0
    ) {
      throw new Error(`post-guard failed: ${JSON.stringify({
        parent_insert_count: parentInsert.rowCount,
        identity_insert_count: identityInsert.rowCount,
        child_insert_count: childInsert.rowCount,
        ...postGuardRow,
      })}`);
    }

    const insertedRows = await client.query(
      `select target.set_code, target.number, target.name, target.variant_key, target.finish_key, target.gv_id, target.printing_gv_id
       from missing_promo_05b_targets target
       order by target.set_code, target.number, target.name`,
    );
    const transientSnapshot = await captureSnapshot(client, targets);
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      beforeSnapshot,
      transientSnapshot,
      afterSnapshot,
      durable_after_snapshot_matches_before_snapshot: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
      transient_after_snapshot_differs_from_before_snapshot: beforeSnapshot.hash_sha256 !== transientSnapshot.hash_sha256,
      pre_guard: preGuardRow,
      post_guard: postGuardRow,
      inserted_rows: insertedRows.rows,
      simulated_write_counts: {
        parent_inserts: parentInsert.rowCount,
        identity_inserts: identityInsert.rowCount,
        child_inserts: childInsert.rowCount,
        deletes: 0,
        merges: 0,
      },
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
    '# Stamped Parent Identity Insert Guarded Dry Run V1',
    '',
    'Rollback-only dry-run for missing stamped parent identities from exact active finish evidence.',
    '',
    markdownTable(
      ['metric', 'value'],
      [
        ['target_count', report.summary.target_count],
        ['by_finish', JSON.stringify(report.summary.by_finish)],
        ['by_variant', JSON.stringify(report.summary.by_variant)],
        ['package_fingerprint_sha256', report.package_fingerprint_sha256],
        ['sql_hash_sha256', report.sql_hash_sha256],
        ['dry_run_proof_sha256', report.dry_run_proof_sha256],
        ['rollback_verified', report.summary.durable_after_snapshot_matches_before_snapshot],
      ],
    ),
    '',
    '## Targets',
    '',
    markdownTable(
      ['set', 'number', 'name', 'variant', 'finish', 'gv_id', 'printing_gv_id'],
      report.targets.map((target) => [
        target.set_code,
        target.number,
        target.name,
        target.variant_key,
        target.finish_key,
        target.gv_id,
        target.printing_gv_id,
      ]),
    ),
    '',
    '## Recommended Approval',
    '',
    '```text',
    report.recommended_real_apply_approval_text,
    '```',
    '',
  ].join('\n');
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for guarded dry-run.');
  const readinessReport = await readJson(READINESS_JSON);
  const sourceRows = sourceTargets(readinessReport);

  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try {
    const targets = await resolveMissingParentTargets(client, sourceRows);
    const packageHash = packageFingerprint(targets, readinessReport);
    const sqlHashValue = sqlHash();
    const dryRun = targets.length ? await runDryRun(client, targets) : null;
    const dryRunProof = dryRun ? sha256(stableJson({
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: packageHash,
      inserted_rows: dryRun.inserted_rows,
      pre_guard: dryRun.pre_guard,
      post_guard: dryRun.post_guard,
    })) : 'not_applicable_no_ready_targets';
    const report = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      mode: 'guarded_rollback_dry_run',
      input_artifacts: {
        stamped_finish_routing_readiness: rel(READINESS_JSON),
      },
      package_fingerprint_sha256: packageHash,
      sql_hash_sha256: sqlHashValue,
      dry_run_proof_sha256: dryRunProof,
      rollback_proof_sha256: dryRun ? dryRun.afterSnapshot.hash_sha256 : 'not_applicable_no_ready_targets',
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
      summary: {
        source_ready_rows: sourceRows.length,
        target_count: targets.length,
        by_finish: countBy(targets, (target) => target.finish_key),
        by_variant: countBy(targets, (target) => target.variant_key),
        inserted_rows_in_rollback_transaction: dryRun?.inserted_rows.length ?? 0,
        durable_after_snapshot_matches_before_snapshot: dryRun?.durable_after_snapshot_matches_before_snapshot ?? null,
        transient_after_snapshot_differs_from_before_snapshot: dryRun?.transient_after_snapshot_differs_from_before_snapshot ?? null,
      },
      pre_guard: dryRun?.pre_guard ?? null,
      post_guard: dryRun?.post_guard ?? null,
      targets,
      recommended_real_apply_approval_text: targets.length
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageHash}. SQL hash: ${sqlHashValue}. Scope: ${targets.length} stamped parent inserts, ${targets.length} active identity inserts, ${targets.length} child printing inserts from exact active finish evidence; finishes ${Object.entries(countBy(targets, (target) => target.finish_key)).map(([key, count]) => `${key}=${count}`).join(', ')}. Dry-run proof: ${dryRunProof} == ${dryRunProof}. No external mapping writes. No pricing writes. No image writes. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.`
        : 'No real apply recommended: no missing stamped parent identity targets.',
      db_writes_performed: false,
      migrations_created: false,
    };
    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, renderMarkdown(report));
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: packageHash,
      sql_hash_sha256: sqlHashValue,
      dry_run_proof_sha256: dryRunProof,
      rollback_proof_sha256: report.rollback_proof_sha256,
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
      summary: report.summary,
      pre_guard: report.pre_guard,
      post_guard: report.post_guard,
      recommended_real_apply_approval_text: report.recommended_real_apply_approval_text,
      db_writes_performed: false,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
