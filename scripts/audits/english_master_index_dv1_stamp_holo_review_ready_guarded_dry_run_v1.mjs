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
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_dv1_stamp_holo_review_ready_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_dv1_stamp_holo_review_ready_guarded_dry_run_v1.md');

const PACKAGE_ID = 'DV1-STAMP-HOLO-REVIEW-READY-PARENT-INSERTS';
const CREATED_BY = 'english_master_index_dv1_stamp_holo_review_ready_guarded_dry_run_v1';

const TARGET_SPECS = [
  { set_key: 'dv1', set_name: 'Dragon Vault', card_number: '6', card_name: 'Bagon', target_variant_key: 'league_stamp', stamp_label: 'League Stamp' },
  { set_key: 'dv1', set_name: 'Dragon Vault', card_number: '7', card_name: 'Shelgon', target_variant_key: 'league_stamp', stamp_label: 'League Stamp' },
  { set_key: 'dv1', set_name: 'Dragon Vault', card_number: '10', card_name: 'Latios', target_variant_key: 'dragon_vault_stamp', stamp_label: 'Dragon Vault Stamp' },
  { set_key: 'dv1', set_name: 'Dragon Vault', card_number: '11', card_name: 'Rayquaza', target_variant_key: 'dragon_vault_stamp', stamp_label: 'Dragon Vault Stamp' },
  { set_key: 'dv1', set_name: 'Dragon Vault', card_number: '16', card_name: 'Haxorus', target_variant_key: 'dragon_vault_stamp', stamp_label: 'Dragon Vault Stamp' },
];

const SET_LEVEL_EVIDENCE = [
  {
    source_key: 'bulbapedia_dragon_vault_tcg',
    source_kind: 'human_readable_checklist',
    source_url: 'https://bulbapedia.bulbagarden.net/wiki/Dragon_Vault_(TCG)',
    evidence_label: 'Dragon Vault set release text states the set cards are foil.',
  },
  {
    source_key: 'pokellector_dragon_vault',
    source_kind: 'collector_reference',
    source_url: 'https://www.pokellector.com/Dragon-Vault-Expansion/',
    evidence_label: 'Pokellector Dragon Vault set page describes the set as holographic.',
  },
];

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
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
  const hex = sha256(seed).slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const raw = hex.join('');
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
}

function countBy(rows, keyFn) {
  const out = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

async function buildTargets(client) {
  const result = await client.query(
    `select
       spec.*,
       cp.id as base_parent_id,
       cp.game_id,
       cp.set_id,
       cp.rarity,
       cp.number_plain,
       cp.printed_total,
       cp.printed_set_abbrev,
       cp.identity_domain,
       cp.set_identity_model,
       cp.representative_image_url,
       cp.image_url,
       cp.image_res,
       cp.variants,
       cp.data_quality_flags,
       exists (
         select 1 from public.card_printings cpr
         where cpr.card_print_id = cp.id and cpr.finish_key = 'holo'
       ) as base_holo_child_exists
     from jsonb_to_recordset($1::jsonb) as spec(
       set_key text,
       set_name text,
       card_number text,
       card_name text,
       target_variant_key text,
       stamp_label text
     )
     left join public.card_prints cp
       on cp.set_code = spec.set_key
      and coalesce(cp.number_plain, cp.number) = regexp_replace(spec.card_number, '^0+(?=\\d)', '')
      and lower(cp.name) = lower(spec.card_name)
      and coalesce(cp.variant_key, '') = ''`,
    [JSON.stringify(TARGET_SPECS)],
  );

  return result.rows.map((row) => ({
    target_parent_id: uuidFromSeed(`${PACKAGE_ID}:parent:${row.set_key}:${row.card_number}:${normalizeText(row.card_name)}:${row.target_variant_key}`),
    target_child_id: uuidFromSeed(`${PACKAGE_ID}:child:${row.set_key}:${row.card_number}:${normalizeText(row.card_name)}:${row.target_variant_key}:holo`),
    base_parent_id: row.base_parent_id,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    target_finish_key: 'holo',
    target_variant_key: row.target_variant_key,
    target_printed_identity_modifier: row.target_variant_key,
    stamp_label: row.stamp_label,
    base_holo_child_exists: row.base_holo_child_exists,
    evidence: {
      package_id: PACKAGE_ID,
      evidence_rule: 'exact_variant_sources_plus_dragon_vault_all_foil_set_rule',
      source_urls: [
        `https://pokescope.app/card/${row.set_key}-${row.card_number}/`,
        `https://scrydex.com/pokemon/cards/dragon-vault/${row.set_key}-${row.card_number}`,
        ...SET_LEVEL_EVIDENCE.map((source) => source.source_url),
      ],
      exact_variant_sources: [
        'pokescope_card_page',
        'scrydex_card_page',
      ],
      set_level_finish_sources: SET_LEVEL_EVIDENCE,
      stamp_label: row.stamp_label,
      variant_key: row.target_variant_key,
      active_child_finish_key: 'holo',
    },
  }));
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
       cp.variant_key,
       cp.printed_identity_modifier,
       null::text as finish_key,
       null::text as identity_key_hash
     from target t
     join public.card_prints cp on cp.id = t.base_parent_id
     union all
     select
       'target_parent',
       cp.id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       null::text,
       null::text
     from target t
     join public.card_prints cp on cp.id = t.target_parent_id
     union all
     select
       'target_child',
       cpr.id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       cpr.finish_key,
       null::text
     from target t
     join public.card_printings cpr on cpr.id = t.target_child_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'target_identity',
       cpi.id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       null::text,
       cpi.identity_key_hash
     from target t
     join public.card_print_identity cpi on cpi.card_print_id = t.target_parent_id and cpi.is_active = true
     join public.card_prints cp on cp.id = cpi.card_print_id
     order by row_type, set_code nulls last, number_plain nulls last, number nulls last, name nulls last, variant_key nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets)],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

function packageFingerprint(targets) {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    targets: targets.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: normalizeText(row.card_name),
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      base_parent_id: row.base_parent_id,
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
    })),
  }));
}

async function runDryRun(client, targets, fingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  await client.query('begin');
  try {
    await client.query(
      `create temporary table dv1_stamp_targets (
         target_parent_id uuid primary key,
         target_child_id uuid not null,
         base_parent_id uuid not null,
         set_key text not null,
         set_name text not null,
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
      `insert into dv1_stamp_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         base_parent_id uuid,
         set_key text,
         set_name text,
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
         from dv1_stamp_targets target
         join public.card_prints base on base.id = target.base_parent_id
         left join public.sets s on s.id = base.set_id
       )
       select
         (select count(*)::int from dv1_stamp_targets) as target_count,
         (select count(distinct target_parent_id)::int from dv1_stamp_targets) as target_parent_count,
         (select count(distinct target_child_id)::int from dv1_stamp_targets) as target_child_count,
         (select count(*)::int from dv1_stamp_targets target left join public.card_prints base on base.id = target.base_parent_id where base.id is null) as missing_base_count,
         (select count(*)::int from dv1_stamp_targets target left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int
          from dv1_stamp_targets target
          join public.card_prints base on base.id = target.base_parent_id
          left join public.card_printings base_child on base_child.card_print_id = base.id and base_child.finish_key = target.target_finish_key
          where base_child.id is null) as missing_base_finish_count,
         (select count(*)::int
          from dv1_stamp_targets target
          join public.card_prints base on base.id = target.base_parent_id
          join public.card_prints cp
            on cp.set_id = base.set_id
           and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number)
           and lower(cp.name) = lower(base.name)
           and coalesce(cp.variant_key, '') = target.target_variant_key) as parent_collision_count,
         (select count(*)::int from dv1_stamp_targets target join public.card_printings cpr on cpr.id = target.target_child_id) as child_collision_count,
         (select count(*)::int from dv1_stamp_targets target join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true) as identity_target_collision_count,
         (select count(*)::int from projection where projected->>'status' = 'ready') as ready_identity_projection_count,
         (select count(*)::int
          from projection p
          join public.card_print_identity cpi
            on cpi.is_active = true
           and cpi.card_print_id <> p.target_parent_id
           and cpi.identity_domain = p.projected->>'identity_domain'
           and cpi.identity_key_version = p.projected->>'identity_key_version'
           and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collision_count`,
    );
    const guardRow = guard.rows[0];
    const guardFailures = [];
    for (const [key, expected] of Object.entries({
      target_count: targets.length,
      target_parent_count: targets.length,
      target_child_count: targets.length,
      missing_base_count: 0,
      inactive_finish_count: 0,
      missing_base_finish_count: 0,
      parent_collision_count: 0,
      child_collision_count: 0,
      identity_target_collision_count: 0,
      ready_identity_projection_count: targets.length,
      identity_hash_collision_count: 0,
    })) {
      if (guardRow[key] !== expected) guardFailures.push(`${key}:${guardRow[key]}!=${expected}`);
    }
    if (guardFailures.length) throw new Error(`guard failed: ${guardFailures.join(', ')}`);

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
         jsonb_build_object('verified_master_index_v1', target.evidence), now(), base.set_code,
         base.artist, base.regulation_mark, null, null, base.variants, now(),
         now(), base.print_identity_key,
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
       from dv1_stamp_targets target
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
         from dv1_stamp_targets target
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
         null, null, null, null, null,
         'representative_shared_stamp',
         concat('Dragon Vault stamped identity child finish routed from set-level all-foil evidence: ', target.target_finish_key)
       from dv1_stamp_targets target`,
      [CREATED_BY],
    );

    if (parentInsert.rowCount !== targets.length || identityInsert.rowCount !== targets.length || childInsert.rowCount !== targets.length) {
      throw new Error(`insert count mismatch: ${JSON.stringify({ parent_inserts: parentInsert.rowCount, identity_inserts: identityInsert.rowCount, child_inserts: childInsert.rowCount })}`);
    }

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from dv1_stamp_targets) as target_rows,
         (select count(*)::int from public.card_prints cp join dv1_stamp_targets target on target.target_parent_id = cp.id) as inserted_parent_rows,
         (select count(*)::int from public.card_print_identity cpi join dv1_stamp_targets target on target.target_parent_id = cpi.card_print_id and cpi.is_active = true) as inserted_identity_rows,
         (select count(*)::int from public.card_printings cpr join dv1_stamp_targets target on target.target_child_id = cpr.id) as inserted_child_rows`,
      [PACKAGE_ID, fingerprint],
    );
    const inTransactionSnapshot = await captureSnapshot(client, targets);
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);

    return {
      dry_run_status: 'completed_rolled_back_no_durable_change',
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
      rollback_verified: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
      dry_run_proof_sha256: sha256(stableJson({
        package_id: PACKAGE_ID,
        package_fingerprint: fingerprint,
        guard: guardRow,
        proof: proof.rows[0],
        before_hash: beforeSnapshot.hash_sha256,
        after_hash: afterSnapshot.hash_sha256,
      })),
      stop_findings: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256 ? [] : ['rollback_snapshot_mismatch'],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => beforeSnapshot);
    return {
      dry_run_status: 'failed_rolled_back',
      error: error.message,
      before_snapshot: beforeSnapshot,
      after_rollback_snapshot: afterSnapshot,
      rollback_verified: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
      stop_findings: ['dry_run_failed'],
    };
  }
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing database connection string');
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const targets = await buildTargets(client);
    const readinessBlockers = [];
    if (targets.length !== TARGET_SPECS.length) readinessBlockers.push('target_count_mismatch');
    for (const target of targets) {
      if (!target.base_parent_id) readinessBlockers.push(`missing_base_parent:${target.set_key}:${target.card_number}`);
      if (!target.base_holo_child_exists) readinessBlockers.push(`missing_base_holo_child:${target.set_key}:${target.card_number}`);
    }
    const fingerprint = packageFingerprint(targets);
    const dryRun = readinessBlockers.length ? null : await runDryRun(client, targets, fingerprint);
    const output = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      fingerprint_sha256: fingerprint,
      safety: {
        db_writes_performed: false,
        durable_db_writes_performed: false,
        migrations_created: false,
        apply_performed: false,
        cleanup_performed: false,
      },
      summary: {
        target_rows: targets.length,
        parent_insert_scope: targets.length,
        identity_insert_scope: targets.length,
        child_insert_scope: targets.length,
        finish_counts: countBy(targets, (row) => row.target_finish_key),
        variant_counts: countBy(targets, (row) => row.target_variant_key),
        readiness_blockers: readinessBlockers.length,
        dry_run_status: dryRun?.dry_run_status ?? 'not_run',
        rollback_verified: Boolean(dryRun?.rollback_verified),
        write_ready_for_approval: readinessBlockers.length === 0 && dryRun?.rollback_verified === true && dryRun?.stop_findings?.length === 0,
      },
      targets,
      dry_run: dryRun,
    };
    await writeJson(OUTPUT_JSON, output);
    const targetRows = targets.map((row) => [row.set_key, row.card_number, row.card_name, row.stamp_label, row.target_variant_key, row.target_finish_key]);
    const md = [
      '# DV1 Stamp Holo Review-Ready Guarded Dry Run V1',
      '',
      `Generated: ${output.generated_at}`,
      '',
      'This is a rollback-only dry-run artifact. It performs no durable writes.',
      '',
      '## Safety',
      '',
      '- db_writes_performed: false',
      '- migrations_created: false',
      '- apply_performed: false',
      '- cleanup_performed: false',
      '',
      '## Summary',
      '',
      `- target_rows: ${output.summary.target_rows}`,
      `- write_ready_for_approval: ${output.summary.write_ready_for_approval}`,
      `- rollback_verified: ${output.summary.rollback_verified}`,
      `- dry_run_proof_sha256: ${dryRun?.dry_run_proof_sha256 ?? '(none)'}`,
      '',
      '## Scope',
      '',
      markdownTable(['set', 'number', 'card', 'stamp', 'variant_key', 'finish'], targetRows),
      '',
      '## Evidence Rule',
      '',
      'Exact card-level variant labels were found on PokeScope and Scrydex. Dragon Vault set-level sources identify the set cards as foil/holographic, and each base parent currently has a holo child printing.',
      '',
      '## Required Approval Boundary',
      '',
      'Do not real-apply this package without explicit approval. If approved, the exact scope is 5 parent inserts, 5 active identity inserts, and 5 holo child printing inserts. No deletes, no merges, no migrations.',
      '',
    ].join('\n');
    await writeText(OUTPUT_MD, md);
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
      fingerprint_sha256: output.fingerprint_sha256,
      summary: output.summary,
      dry_run_proof_sha256: dryRun?.dry_run_proof_sha256 ?? null,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
