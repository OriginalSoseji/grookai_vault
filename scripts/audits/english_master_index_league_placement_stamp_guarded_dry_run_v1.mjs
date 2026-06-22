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
const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_league_placement_stamp_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_league_placement_stamp_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_league_placement_stamp_guarded_dry_run_v1.md');

const PACKAGE_ID = 'LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS';
const CREATED_BY = 'english_master_index_league_placement_stamp_guarded_dry_run_v1';

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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
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
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))));
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
      target_printed_identity_modifier: row.printed_identity_modifier,
      stamp_label: row.stamp_label,
      target_gv_id: row.target_gv_id,
      target_printing_gv_id: row.target_printing_gv_id,
      source_urls: row.source_urls ?? [],
      evidence: row.evidence ?? {},
    }))
    .sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name))
      || String(left.target_variant_key).localeCompare(String(right.target_variant_key)));
}

function packageFingerprint(readiness, targets) {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    readiness_fingerprint_sha256: readiness.fingerprint_sha256,
    targets: targets.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: normalizeText(row.card_name),
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      base_parent_id: row.base_parent_id,
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
      target_gv_id: row.target_gv_id,
      target_printing_gv_id: row.target_printing_gv_id,
      source_urls: row.source_urls,
    })),
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
    hash_sha256: sha256(stableJson(result.rows)),
    counts: countBy(result.rows, (row) => row.row_type),
  };
}

async function runDryRun(client, targets, fingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table league_placement_targets (
         target_parent_id uuid primary key,
         target_child_id uuid not null unique,
         base_parent_id uuid not null,
         base_gv_id text not null,
         set_key text not null,
         card_number text not null,
         card_name text not null,
         target_finish_key text not null,
         target_variant_key text not null,
         target_printed_identity_modifier text not null,
         stamp_label text not null,
         target_gv_id text not null,
         target_printing_gv_id text not null,
         source_urls text[] not null,
         evidence jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into league_placement_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         base_parent_id uuid,
         base_gv_id text,
         set_key text,
         card_number text,
         card_name text,
         target_finish_key text,
         target_variant_key text,
         target_printed_identity_modifier text,
         stamp_label text,
         target_gv_id text,
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
         from league_placement_targets target
         join public.card_prints base on base.id = target.base_parent_id
         left join public.sets s on s.id = base.set_id
       )
       select
         (select count(*)::int from league_placement_targets) as target_count,
         (select count(distinct target_parent_id)::int from league_placement_targets) as target_parent_count,
         (select count(distinct target_child_id)::int from league_placement_targets) as target_child_count,
         (select count(distinct target_gv_id)::int from league_placement_targets) as target_gv_id_count,
         (select count(distinct target_printing_gv_id)::int from league_placement_targets) as target_printing_gv_id_count,
         (select count(*)::int from league_placement_targets target left join public.card_prints base on base.id = target.base_parent_id where base.id is null) as missing_base_count,
         (select count(*)::int from league_placement_targets target left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int from league_placement_targets target join public.card_prints base on base.id = target.base_parent_id left join public.card_printings base_child on base_child.card_print_id = base.id and base_child.finish_key = target.target_finish_key where base_child.id is null) as missing_base_finish_count,
         (select count(*)::int from league_placement_targets target join public.card_prints base on base.id = target.base_parent_id join public.card_prints cp on cp.set_id = base.set_id and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number) and lower(cp.name) = lower(base.name) and (coalesce(cp.variant_key, '') = target.target_variant_key or coalesce(cp.printed_identity_modifier, '') = target.target_printed_identity_modifier)) as parent_collision_count,
         (select count(*)::int from league_placement_targets target join public.card_prints cp on cp.gv_id = target.target_gv_id) as parent_gv_id_collision_count,
         (select count(*)::int from league_placement_targets target join public.card_printings cpr on cpr.id = target.target_child_id) as child_collision_count,
         (select count(*)::int from league_placement_targets target join public.card_printings cpr on cpr.printing_gv_id = target.target_printing_gv_id) as child_printing_gv_id_collision_count,
         (select count(*)::int from league_placement_targets target join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true) as identity_target_collision_count,
         (select count(*)::int from projection where projected->>'status' = 'ready') as ready_identity_projection_count,
         (select count(*)::int from projection p join public.card_print_identity cpi on cpi.is_active = true and cpi.card_print_id <> p.target_parent_id and cpi.identity_domain = p.projected->>'identity_domain' and cpi.identity_key_version = p.projected->>'identity_key_version' and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collision_count`,
    );
    const guardRow = guard.rows[0];
    const expected = {
      target_count: targets.length,
      target_parent_count: targets.length,
      target_child_count: targets.length,
      target_gv_id_count: targets.length,
      target_printing_gv_id_count: targets.length,
      missing_base_count: 0,
      inactive_finish_count: 0,
      missing_base_finish_count: 0,
      parent_collision_count: 0,
      parent_gv_id_collision_count: 0,
      child_collision_count: 0,
      child_printing_gv_id_collision_count: 0,
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
           'governing_contract', 'LEAGUE_PLACEMENT_STAMP_IDENTITY_RULE_V1',
           'source_urls', target.source_urls,
           'stamp_label', target.stamp_label,
           'variant_key', target.target_variant_key,
           'active_child_finish_key', target.target_finish_key,
           'evidence', target.evidence
         )),
         now(), base.set_code, base.artist, base.regulation_mark, null, null, base.variants, now(),
         now(), base.print_identity_key,
         coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'source', 'verified_master_set_index_v1',
           'package_id', $1::text,
           'governing_contract', 'LEAGUE_PLACEMENT_STAMP_IDENTITY_RULE_V1',
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
         concat('League placement stamped canonical identity: ', target.stamp_label, '. Representative base image only until exact stamped image is available.')
       from league_placement_targets target
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
         from league_placement_targets target
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
         concat(target.set_key, ':', target.card_number, ':league_placement:', target.target_variant_key, ':', target.target_finish_key),
         $1::text,
         target.target_printing_gv_id, null, null, null, null,
         'representative_shared_stamp',
         concat('League placement stamped identity child finish: ', target.target_finish_key)
       from league_placement_targets target`,
      [CREATED_BY],
    );

    if (parentInsert.rowCount !== targets.length || identityInsert.rowCount !== targets.length || childInsert.rowCount !== targets.length) {
      throw new Error(`insert count mismatch: ${JSON.stringify({ parent_inserts: parentInsert.rowCount, identity_inserts: identityInsert.rowCount, child_inserts: childInsert.rowCount })}`);
    }

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from league_placement_targets) as target_rows,
         (select count(*)::int from public.card_prints cp join league_placement_targets target on target.target_parent_id = cp.id) as inserted_parent_rows,
         (select count(*)::int from public.card_print_identity cpi join league_placement_targets target on target.target_parent_id = cpi.card_print_id and cpi.is_active = true) as inserted_identity_rows,
         (select count(*)::int from public.card_printings cpr join league_placement_targets target on target.target_child_id = cpr.id) as inserted_child_rows`,
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
  return `# League Placement Stamp Guarded Dry Run V1

Generated: ${report.generated_at}

Rollback-only dry-run artifact for \`LEAGUE_PLACEMENT_STAMP_IDENTITY_RULE_V1\`. No durable writes were performed.

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['parent_insert_scope', report.summary.parent_insert_scope],
    ['identity_insert_scope', report.summary.identity_insert_scope],
    ['child_insert_scope', report.summary.child_insert_scope],
    ['write_ready_for_approval', report.summary.write_ready_for_approval],
    ['rollback_verified', report.summary.rollback_verified],
    ['dry_run_proof_sha256', report.dry_run?.dry_run_proof_sha256 ?? '(none)'],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Scope

${markdownTable(['set', 'number', 'card', 'variant', 'finish'], report.targets.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.target_variant_key,
    row.target_finish_key,
  ]))}

## Required Approval Boundary

Do not real-apply this package without explicit approval. If approved, the exact scope is ${report.summary.parent_insert_scope} parent inserts, ${report.summary.identity_insert_scope} active identity inserts, and ${report.summary.child_insert_scope} child printing inserts. No deletes, no merges, no migrations.
`;
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing database connection string');
  const readiness = await readJson(READINESS_JSON);
  const targets = buildTargets(readiness);
  const fingerprint = packageFingerprint(readiness, targets);
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const dryRun = targets.length ? await runDryRun(client, targets, fingerprint) : null;
    const output = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      input_artifact: rel(READINESS_JSON),
      input_fingerprint_sha256: readiness.fingerprint_sha256,
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
        dry_run_status: dryRun?.dry_run_status ?? 'not_run',
        rollback_verified: Boolean(dryRun?.rollback_verified),
        write_ready_for_approval: targets.length > 0 && dryRun?.rollback_verified === true && dryRun?.stop_findings?.length === 0,
      },
      targets,
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
      error: dryRun?.error ?? null,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
