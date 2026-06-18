import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'special_variant_discovery_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'special_variant_discovery_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'jungle_no_symbol_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'jungle_no_symbol_guarded_dry_run_v1.md');

const PACKAGE_ID = 'SPECIAL-VAR-01-JUNGLE-NO-SYMBOL-PARENT-INSERTS';
const CREATED_BY = 'english_master_index_special_variant_jungle_no_symbol_guarded_dry_run_v1';
const EXPECTED_TARGET_COUNT = 16;
const TARGET_VARIANT_KEY = 'no_symbol_error';
const TARGET_MODIFIER = 'recognized_error:no_jungle_symbol';
const TARGET_FINISH = 'holo';

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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function buildSourceTargets(sourceReport) {
  return (sourceReport.rows ?? [])
    .filter((row) => row.set_key === 'base2'
      && row.proposed_variant_key === TARGET_VARIANT_KEY
      && row.proposed_identity_modifier === TARGET_MODIFIER
      && row.proposed_finish_key === TARGET_FINISH
      && row.governance_status === 'source_ready'
      && row.db_status === 'missing_from_db')
    .map((row) => ({
      source_candidate_key: row.candidate_key,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      target_variant_key: TARGET_VARIANT_KEY,
      target_printed_identity_modifier: TARGET_MODIFIER,
      target_finish_key: TARGET_FINISH,
      classification: row.classification,
      evidence: row.evidence ?? [],
    }))
    .sort((left, right) => String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true }));
}

async function attachBaseParents(client, sourceTargets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(set_key text, card_number text, card_name text)
     )
     select
       target.set_key,
       target.card_number,
       target.card_name,
       cp.id::text as base_parent_id,
       cp.gv_id as base_parent_gv_id,
       array_agg(cpr.finish_key order by cpr.finish_key) filter (where cpr.id is not null) as base_child_finishes
     from target
     left join public.card_prints cp
       on cp.set_code = target.set_key
      and cp.number = target.card_number
      and lower(cp.name) = lower(target.card_name)
      and coalesce(cp.variant_key, '') = ''
      and cp.printed_identity_modifier is null
     left join public.card_printings cpr on cpr.card_print_id = cp.id
     group by target.set_key, target.card_number, target.card_name, cp.id, cp.gv_id
     order by target.card_number::int`,
    [JSON.stringify(sourceTargets.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
    })))],
  );

  const byKey = new Map(result.rows.map((row) => [`${row.set_key}:${row.card_number}:${normalizeText(row.card_name)}`, row]));
  return sourceTargets.map((row) => {
    const base = byKey.get(`${row.set_key}:${row.card_number}:${normalizeText(row.card_name)}`) ?? {};
    return {
      ...row,
      target_parent_id: uuidFromSeed(`${PACKAGE_ID}:parent:${row.set_key}:${row.card_number}:${normalizeText(row.card_name)}:${TARGET_VARIANT_KEY}`),
      target_child_id: uuidFromSeed(`${PACKAGE_ID}:child:${row.set_key}:${row.card_number}:${normalizeText(row.card_name)}:${TARGET_VARIANT_KEY}:${TARGET_FINISH}`),
      base_parent_id: base.base_parent_id ?? null,
      base_parent_gv_id: base.base_parent_gv_id ?? null,
      base_child_finishes: base.base_child_finishes ?? [],
      evidence_urls: (row.evidence ?? []).map((item) => item.source_url).filter(Boolean),
      evidence_payload: {
        source_package_id: PACKAGE_ID,
        source_candidate_key: row.source_candidate_key,
        classification: row.classification,
        variant_key: TARGET_VARIANT_KEY,
        printed_identity_modifier: TARGET_MODIFIER,
        finish_key: TARGET_FINISH,
        evidence: row.evidence ?? [],
      },
    };
  });
}

function packageFingerprint(sourceReport, targets) {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    source_fingerprint_sha256: sourceReport.fingerprint_sha256,
    targets: targets.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: normalizeText(row.card_name),
      target_variant_key: row.target_variant_key,
      target_printed_identity_modifier: row.target_printed_identity_modifier,
      target_finish_key: row.target_finish_key,
      base_parent_id: row.base_parent_id,
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
      evidence_urls: row.evidence_urls,
    })),
  }));
}

function sqlHash() {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    writes: [
      'insert public.card_prints cloned from base Jungle holo parent with no_symbol_error identity modifier',
      'insert public.card_print_identity via card_print_identity_backfill_projection_v1',
      'insert public.card_printings holo child',
    ],
    forbidden: ['deletes', 'merges', 'parent overwrites', 'migrations', 'global apply'],
  }));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(target_parent_id uuid, target_child_id uuid, base_parent_id uuid)
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
      `create temporary table jungle_no_symbol_targets (
         target_parent_id uuid primary key,
         target_child_id uuid not null,
         base_parent_id uuid not null,
         set_key text not null,
         card_number text not null,
         card_name text not null,
         target_finish_key text not null,
         target_variant_key text not null,
         target_printed_identity_modifier text not null,
         evidence jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into jungle_no_symbol_targets
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
         evidence jsonb
       )`,
      [JSON.stringify(targets.map((row) => ({
        target_parent_id: row.target_parent_id,
        target_child_id: row.target_child_id,
        base_parent_id: row.base_parent_id,
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        target_finish_key: row.target_finish_key,
        target_variant_key: row.target_variant_key,
        target_printed_identity_modifier: row.target_printed_identity_modifier,
        evidence: row.evidence_payload,
      })))],
    );

    const guard = await client.query(
      `with projection as (
         select
           target.target_parent_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, base.set_code, s.code, base.number, base.number_plain, base.name,
             target.target_variant_key, coalesce(base.printed_total, s.printed_total), coalesce(base.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from jungle_no_symbol_targets target
         join public.card_prints base on base.id = target.base_parent_id
         left join public.sets s on s.id = base.set_id
       )
       select
         (select count(*)::int from jungle_no_symbol_targets) as target_count,
         (select count(distinct target_parent_id)::int from jungle_no_symbol_targets) as target_parent_count,
         (select count(distinct target_child_id)::int from jungle_no_symbol_targets) as target_child_count,
         (select count(*)::int from jungle_no_symbol_targets target left join public.card_prints base on base.id = target.base_parent_id where base.id is null) as missing_base_count,
         (select count(*)::int from jungle_no_symbol_targets target left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int from jungle_no_symbol_targets target join public.card_prints base on base.id = target.base_parent_id left join public.card_printings base_child on base_child.card_print_id = base.id and base_child.finish_key = target.target_finish_key where base_child.id is null) as missing_base_holo_count,
         (select count(*)::int from jungle_no_symbol_targets target join public.card_prints base on base.id = target.base_parent_id join public.card_prints cp on cp.set_id = base.set_id and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number) and lower(cp.name) = lower(base.name) and coalesce(cp.variant_key, '') = target.target_variant_key) as parent_collision_count,
         (select count(*)::int from jungle_no_symbol_targets target join public.card_printings cpr on cpr.id = target.target_child_id) as child_collision_count,
         (select count(*)::int from jungle_no_symbol_targets target join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true) as identity_target_collision_count,
         (select count(*)::int from projection where projected->>'status' = 'ready') as ready_identity_projection_count,
         (select count(*)::int from projection p join public.card_print_identity cpi on cpi.is_active = true and cpi.card_print_id <> p.target_parent_id and cpi.identity_domain = p.projected->>'identity_domain' and cpi.identity_key_version = p.projected->>'identity_key_version' and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collision_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== targets.length
      || guardRow.target_parent_count !== targets.length
      || guardRow.target_child_count !== targets.length
      || guardRow.missing_base_count !== 0
      || guardRow.inactive_finish_count !== 0
      || guardRow.missing_base_holo_count !== 0
      || guardRow.parent_collision_count !== 0
      || guardRow.child_collision_count !== 0
      || guardRow.identity_target_collision_count !== 0
      || guardRow.ready_identity_projection_count !== targets.length
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
         target.target_parent_id, base.game_id, base.set_id, base.name, base.number,
         target.target_variant_key, base.rarity, null,
         null, coalesce(base.external_ids, '{}'::jsonb) || jsonb_build_object('verified_master_index_v1', target.evidence), now(), base.set_code, base.artist, base.regulation_mark,
         null, null, base.variants, now(), now(), base.print_identity_key,
         coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'source', 'verified_master_set_index_v1',
           'package_id', $1::text,
           'base_parent_id', base.id::text,
           'variant_key', target.target_variant_key,
           'printed_identity_modifier', target.target_printed_identity_modifier,
           'explicit_child_finish_key', target.target_finish_key
         ),
         null, base.data_quality_flags, 'representative_shared',
         base.image_res, now(), base.printed_set_abbrev, base.printed_total,
         concat('GV-PK-', upper(regexp_replace(coalesce(base.printed_set_abbrev, base.set_code), '[^A-Za-z0-9]+', '-', 'g')), '-', base.number_plain, '-NO-SYMBOL'),
         null, base.identity_domain, target.target_printed_identity_modifier, base.set_identity_model,
         coalesce(base.representative_image_url, base.image_url),
         'Recognized Jungle No Symbol error identity. Representative base holo image only until exact no-symbol image is available.'
       from jungle_no_symbol_targets target
       join public.card_prints base on base.id = target.base_parent_id`,
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
         from jungle_no_symbol_targets target
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
         concat(target.set_key, ':', target.card_number, ':jungle_no_symbol:', target.target_finish_key),
         $1::text,
         concat('GV-PK-JUN-', regexp_replace(target.card_number, '[^A-Za-z0-9]+', '-', 'g'), '-NO-SYMBOL-HOLO'),
         null, null, null, null,
         'representative_shared',
         'Jungle No Symbol recognized error holo child. Representative base holo image only until exact no-symbol image is available.'
       from jungle_no_symbol_targets target`,
      [CREATED_BY],
    );

    if (parentInsert.rowCount !== targets.length || identityInsert.rowCount !== targets.length || childInsert.rowCount !== targets.length) {
      throw new Error(`insert count mismatch: ${JSON.stringify({ parent_inserts: parentInsert.rowCount, identity_inserts: identityInsert.rowCount, child_inserts: childInsert.rowCount })}`);
    }

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from jungle_no_symbol_targets) as target_rows,
         (select count(*)::int from public.card_prints cp join jungle_no_symbol_targets target on target.target_parent_id = cp.id) as inserted_parent_rows,
         (select count(*)::int from public.card_prints cp join jungle_no_symbol_targets target on target.target_parent_id = cp.id and cp.printed_identity_modifier = target.target_printed_identity_modifier and cp.variant_key = target.target_variant_key) as inserted_parent_identity_rows,
         (select count(*)::int from public.card_print_identity cpi join jungle_no_symbol_targets target on target.target_parent_id = cpi.card_print_id and cpi.is_active = true) as inserted_identity_rows,
         (select count(*)::int from public.card_printings cpr join jungle_no_symbol_targets target on target.target_child_id = cpr.id and cpr.finish_key = target.target_finish_key) as inserted_child_rows,
         (select count(*)::int from public.card_printings cpr join jungle_no_symbol_targets target on target.target_child_id = cpr.id and cpr.finish_key = 'stamped') as forbidden_stamped_child_rows`,
      [PACKAGE_ID, fingerprint],
    );

    const inTransactionSnapshot = await captureSnapshot(client, targets);
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      dry_run_status: 'jungle_no_symbol_parent_insert_completed_rolled_back_no_durable_change',
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
      dry_run_status: 'jungle_no_symbol_parent_insert_failed_rolled_back',
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
  return `# Jungle No Symbol Guarded Dry Run V1

Rollback-only dry-run for source-ready Jungle No Symbol holo recognized error parent lanes.

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

${markdownTable(['set', 'number', 'name', 'variant', 'modifier', 'finish', 'base_parent_id'], report.scope.targets.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.target_variant_key,
    row.target_printed_identity_modifier,
    row.target_finish_key,
    row.base_parent_id,
  ]))}

## Result

- dry_run_status: ${report.execution.dry_run_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- sql_hash_sha256: \`${report.sql_hash_sha256}\`
- dry_run_proof_sha256: \`${report.execution.dry_run_proof_sha256}\`
- stop_findings: ${report.execution.stop_findings.length}

## Approval Text

\`\`\`text
${report.recommended_real_apply_approval_text}
\`\`\`
`;
}

async function main() {
  const sourceReport = await readJson(SOURCE_JSON);
  const conn = connectionString();
  let targets = buildSourceTargets(sourceReport);
  let execution;

  if (!conn) {
    execution = {
      dry_run_status: 'blocked_missing_database_connection',
      rollback_verified: false,
      dry_run_proof_sha256: null,
      simulated_write_counts: { parent_inserts: 0, identity_inserts: 0, child_inserts: 0, deletes: 0, merges: 0 },
      stop_findings: ['missing_database_connection'],
    };
  } else {
    const client = new Client({ connectionString: conn });
    await client.connect();
    try {
      targets = await attachBaseParents(client, targets);
      if (targets.length !== EXPECTED_TARGET_COUNT) {
        execution = {
          dry_run_status: 'blocked_unexpected_target_count',
          rollback_verified: false,
          dry_run_proof_sha256: null,
          simulated_write_counts: { parent_inserts: 0, identity_inserts: 0, child_inserts: 0, deletes: 0, merges: 0 },
          stop_findings: [`unexpected_target_count:${targets.length}`],
        };
      } else if (targets.some((row) => !row.base_parent_id || !row.base_child_finishes.includes(TARGET_FINISH))) {
        execution = {
          dry_run_status: 'blocked_missing_base_parent_or_holo_child',
          rollback_verified: false,
          dry_run_proof_sha256: null,
          simulated_write_counts: { parent_inserts: 0, identity_inserts: 0, child_inserts: 0, deletes: 0, merges: 0 },
          stop_findings: ['missing_base_parent_or_holo_child'],
        };
      } else {
        execution = await runDryRun(client, targets, packageFingerprint(sourceReport, targets));
      }
    } finally {
      await client.end().catch(() => {});
    }
  }

  const fingerprint = packageFingerprint(sourceReport, targets);
  const sqlHashSha256 = sqlHash();
  const pass = execution.dry_run_status === 'jungle_no_symbol_parent_insert_completed_rolled_back_no_durable_change'
    && execution.rollback_verified
    && execution.stop_findings.length === 0;
  const dryRunProof = `${execution.before_snapshot?.hash_sha256 ?? 'missing'} == ${execution.after_rollback_snapshot?.hash_sha256 ?? 'missing'}`;
  const recommended = pass
    ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${fingerprint}. SQL hash: ${sqlHashSha256}. Scope: 16 Jungle No Symbol recognized-error parent inserts, 16 active identity inserts, 16 holo child printing inserts; set base2/Jungle; variant_key=${TARGET_VARIANT_KEY}; printed_identity_modifier=${TARGET_MODIFIER}. Dry-run proof: ${dryRunProof}. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.`
    : 'No real apply approval recommended; dry-run did not pass.';

  const report = {
    generated_at: new Date().toISOString(),
    package_id: PACKAGE_ID,
    mode: 'guarded_rollback_dry_run_only',
    source_report: rel(SOURCE_JSON),
    source_fingerprint_sha256: sourceReport.fingerprint_sha256,
    package_fingerprint_sha256: fingerprint,
    sql_hash_sha256: sqlHashSha256,
    pass,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    transaction_writes_rolled_back: pass,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    scope: {
      target_rows: targets.length,
      by_set: countBy(targets, (row) => row.set_key),
      by_finish: countBy(targets, (row) => row.target_finish_key),
      by_variant: countBy(targets, (row) => row.target_variant_key),
      targets,
    },
    execution,
    recommended_real_apply_approval_text: recommended,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    package_fingerprint_sha256: fingerprint,
    sql_hash_sha256: sqlHashSha256,
    pass,
    dry_run_status: execution.dry_run_status,
    dry_run_proof: dryRunProof,
    target_rows: targets.length,
    stop_findings: execution.stop_findings,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
