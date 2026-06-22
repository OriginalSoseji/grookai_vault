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
const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_second_source_manual_candidate_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_second_source_manual_parent_insert_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_second_source_manual_parent_insert_guarded_dry_run_v1.md');
const PACKAGE_ID = 'SECOND-SOURCE-MANUAL-PARENT-INSERTS';
const CREATED_BY = 'english_master_index_second_source_manual_parent_insert_guarded_dry_run_v1';

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
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

function buildTargets(readiness) {
  return (readiness.rows ?? [])
    .filter((row) => row.readiness_route === 'parent_identity_child_insert_candidate')
    .map((row) => ({
      target_parent_id: uuidFromSeed(`${PACKAGE_ID}:parent:${row.set_key}:${row.card_number}:${normalizeText(row.card_name)}:${row.variant_key}`),
      target_child_id: uuidFromSeed(`${PACKAGE_ID}:child:${row.set_key}:${row.card_number}:${normalizeText(row.card_name)}:${row.variant_key}:${row.candidate_finish_key}`),
      base_parent_id: row.base_parent_id,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      target_finish_key: row.candidate_finish_key,
      target_variant_key: row.variant_key,
      target_printed_identity_modifier: row.variant_key,
      stamp_label: row.stamp_label,
      target_gv_id: row.target_gv_id,
      target_printing_gv_id: row.target_printing_gv_id,
      source_urls: row.source_urls ?? [],
      evidence_labels: row.evidence_labels ?? [],
    }));
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

async function splitByBaseFinishSupport(client, targets) {
  if (!targets.length) return { readyTargets: [], excludedTargets: [] };
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         base_parent_id uuid,
         target_finish_key text
       )
     )
     select
       t.base_parent_id::text,
       t.target_finish_key,
       exists (
         select 1
         from card_printings cpg
         where cpg.card_print_id = t.base_parent_id
           and cpg.finish_key = t.target_finish_key
       ) as has_base_finish
     from target t`,
    [JSON.stringify(targets.map((row) => ({
      base_parent_id: row.base_parent_id,
      target_finish_key: row.target_finish_key,
    })))]
  );
  const supported = new Set(result.rows
    .filter((row) => row.has_base_finish)
    .map((row) => `${row.base_parent_id}:${row.target_finish_key}`));
  const readyTargets = [];
  const excludedTargets = [];
  for (const row of targets) {
    const key = `${row.base_parent_id}:${row.target_finish_key}`;
    if (supported.has(key)) {
      readyTargets.push(row);
    } else {
      excludedTargets.push({
        ...row,
        excluded_reason: 'base_parent_missing_matching_finish_child',
        next_step: 'finish taxonomy adjudication or source-backed base finish insertion required before parent insert',
      });
    }
  }
  return { readyTargets, excludedTargets };
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         base_parent_id uuid
       )
     )
     select 'base_parent' as row_type, cp.id::text as row_id, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text as finish_key, null::text as identity_key_hash
     from target t
     join public.card_prints cp on cp.id = t.base_parent_id
     union all
     select 'target_parent', cp.id::text, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text, null::text
     from target t
     join public.card_prints cp on cp.id = t.target_parent_id
     union all
     select 'target_child', cpr.id::text, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, cpr.finish_key, null::text
     from target t
     join public.card_printings cpr on cpr.id = t.target_child_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select 'target_identity', cpi.id::text, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text, cpi.identity_key_hash
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

async function runDryRun(client, targets, fingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  await client.query('begin');
  try {
    await client.query(
      `create temporary table second_source_manual_targets (
         target_parent_id uuid primary key,
         target_child_id uuid not null,
         base_parent_id uuid not null,
         set_key text not null,
         set_name text,
         card_number text not null,
         card_name text not null,
         target_finish_key text not null,
         target_variant_key text not null,
         target_printed_identity_modifier text not null,
         stamp_label text,
         target_gv_id text not null,
         target_printing_gv_id text not null,
         source_urls jsonb not null,
         evidence_labels jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into second_source_manual_targets
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
         target_gv_id text,
         target_printing_gv_id text,
         source_urls jsonb,
         evidence_labels jsonb
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
         from second_source_manual_targets target
         join public.card_prints base on base.id = target.base_parent_id
         left join public.sets s on s.id = base.set_id
       )
       select
         (select count(*)::int from second_source_manual_targets) as target_count,
         (select count(distinct target_parent_id)::int from second_source_manual_targets) as target_parent_count,
         (select count(distinct target_child_id)::int from second_source_manual_targets) as target_child_count,
         (select count(*)::int from second_source_manual_targets target left join public.card_prints base on base.id = target.base_parent_id where base.id is null) as missing_base_count,
         (select count(*)::int from second_source_manual_targets target left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int
          from second_source_manual_targets target
          join public.card_prints base on base.id = target.base_parent_id
          left join public.card_printings base_child on base_child.card_print_id = base.id and base_child.finish_key = target.target_finish_key
          where base_child.id is null) as missing_base_finish_count,
         (select count(*)::int
          from second_source_manual_targets target
          join public.card_prints base on base.id = target.base_parent_id
          join public.card_prints cp
            on cp.set_id = base.set_id
           and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number)
           and lower(cp.name) = lower(base.name)
           and coalesce(cp.variant_key, '') = target.target_variant_key) as parent_collision_count,
         (select count(*)::int from second_source_manual_targets target join public.card_printings cpr on cpr.id = target.target_child_id) as child_collision_count,
         (select count(*)::int from second_source_manual_targets target join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true) as identity_target_collision_count,
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
    const expected = {
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
           'evidence_labels', target.evidence_labels,
           'stamp_label', target.stamp_label,
           'variant_key', target.target_variant_key,
           'active_child_finish_key', target.target_finish_key
         )),
         now(), base.set_code, base.artist, base.regulation_mark, null, null, base.variants, now(),
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
         target.target_gv_id,
         null, base.identity_domain, target.target_printed_identity_modifier, base.set_identity_model,
         coalesce(base.representative_image_url, base.image_url),
         concat('Stamped canonical identity: ', target.stamp_label, '. Representative base image only until exact stamped image is available.')
       from second_source_manual_targets target
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
         from second_source_manual_targets target
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
         concat('Manual second-source stamped identity child finish routed from preserved evidence: ', target.target_finish_key)
       from second_source_manual_targets target`,
      [CREATED_BY],
    );

    if (parentInsert.rowCount !== targets.length || identityInsert.rowCount !== targets.length || childInsert.rowCount !== targets.length) {
      throw new Error(`insert count mismatch: ${JSON.stringify({ parent_inserts: parentInsert.rowCount, identity_inserts: identityInsert.rowCount, child_inserts: childInsert.rowCount })}`);
    }

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from second_source_manual_targets) as target_rows,
         (select count(*)::int from public.card_prints cp join second_source_manual_targets target on target.target_parent_id = cp.id) as inserted_parent_rows,
         (select count(*)::int from public.card_print_identity cpi join second_source_manual_targets target on target.target_parent_id = cpi.card_print_id and cpi.is_active = true) as inserted_identity_rows,
         (select count(*)::int from public.card_printings cpr join second_source_manual_targets target on target.target_child_id = cpr.id) as inserted_child_rows`,
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

function renderMarkdown(report) {
  return `# Second Source Manual Parent Insert Guarded Dry Run V1

Generated: ${report.generated_at}

This is a rollback-only dry-run artifact. It performs no durable writes.

## Safety

- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['write_ready_for_approval', report.summary.write_ready_for_approval],
    ['rollback_verified', report.summary.rollback_verified],
    ['dry_run_proof_sha256', report.dry_run?.dry_run_proof_sha256 ?? '(none)'],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Scope

${markdownTable(['set', 'number', 'card', 'stamp', 'variant_key', 'finish'], report.targets.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.stamp_label,
    row.target_variant_key,
    row.target_finish_key,
  ]))}

## Excluded Rows

${report.excluded_targets.length
    ? markdownTable(['set', 'number', 'card', 'stamp', 'finish', 'reason'], report.excluded_targets.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.stamp_label,
      row.target_finish_key,
      row.excluded_reason,
    ]))
    : 'None.'}

## Required Approval Boundary

Do not real-apply this package without explicit approval. If approved, the exact scope is ${report.summary.parent_insert_scope} parent inserts, ${report.summary.identity_insert_scope} active identity inserts, and ${report.summary.child_insert_scope} child printing inserts. No deletes, no merges, no migrations.
`;
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing database connection string');
  const readiness = await readJson(READINESS_JSON);
  const sourceTargets = buildTargets(readiness);
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const { readyTargets: targets, excludedTargets } = await splitByBaseFinishSupport(client, sourceTargets);
    const fingerprint = packageFingerprint(targets);
    const dryRun = targets.length ? await runDryRun(client, targets, fingerprint) : null;
    const output = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      input_artifact: rel(READINESS_JSON),
      fingerprint_sha256: fingerprint,
      safety: {
        db_writes_performed: false,
        durable_db_writes_performed: false,
        migrations_created: false,
        apply_performed: false,
        cleanup_performed: false,
      },
      summary: {
        source_candidate_rows: sourceTargets.length,
        excluded_rows: excludedTargets.length,
        target_rows: targets.length,
        parent_insert_scope: targets.length,
        identity_insert_scope: targets.length,
        child_insert_scope: targets.length,
        finish_counts: countBy(targets, (row) => row.target_finish_key),
        variant_counts: countBy(targets, (row) => row.target_variant_key),
        dry_run_status: dryRun?.dry_run_status ?? 'not_run',
        rollback_verified: Boolean(dryRun?.rollback_verified),
        write_ready_for_approval: targets.length > 0 && dryRun?.rollback_verified === true && dryRun?.stop_findings?.length === 0,
      },
      targets,
      excluded_targets: excludedTargets,
      dry_run: dryRun,
    };
    await writeJson(OUTPUT_JSON, output);
    await writeText(OUTPUT_MD, renderMarkdown(output));
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
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
