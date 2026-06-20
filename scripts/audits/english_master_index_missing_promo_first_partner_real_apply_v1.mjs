import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'missing_promo_first_partner_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'missing_promo_first_partner_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'missing_promo_first_partner_real_apply_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-01B-FIRST-PARTNER-PARENT-CHILD-INSERTS';
const CREATED_BY = 'english_master_index_missing_promo_first_partner_real_apply_v1';
const EXPECTED_FINGERPRINT = '4e49decebcbfd1e5ef60a2d23977e7085607711d80865ef01ea96951ec65c3dc';
const EXPECTED_SQL_HASH = '60c15417e0527277398e14b58998c99498110a4b90ee545e179d56330acbfe93';
const EXPECTED_DRY_RUN_PROOF = '666b084e30148cbe62d060dffbd4d33f916e272374b973f347444ba4d458a764';
const EXPECTED_TARGET_COUNT = 18;

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function validateDryRun(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('fingerprint_mismatch');
  if (dryRun.sql_hash_sha256 !== EXPECTED_SQL_HASH) findings.push('sql_hash_mismatch');
  if (dryRun.execution?.dry_run_proof_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_proof_mismatch');
  if (dryRun.execution?.rollback_verified !== true) findings.push('rollback_not_verified');
  if (dryRun.pass !== true) findings.push('dry_run_pass_not_true');
  if ((dryRun.scope?.targets ?? []).length !== EXPECTED_TARGET_COUNT) findings.push('target_count_mismatch');
  if (dryRun.scope?.target_parent_rows !== EXPECTED_TARGET_COUNT) findings.push('parent_scope_mismatch');
  if (dryRun.scope?.target_child_rows !== EXPECTED_TARGET_COUNT) findings.push('child_scope_mismatch');
  if (dryRun.scope?.target_identity_rows !== EXPECTED_TARGET_COUNT) findings.push('identity_scope_mismatch');
  if (dryRun.scope?.target_external_mapping_rows !== 0) findings.push('external_mapping_scope_present');
  if (dryRun.db_writes_performed !== false || dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_write');
  if (dryRun.migrations_created !== false || dryRun.cleanup_performed !== false || dryRun.quarantine_performed !== false) findings.push('dry_run_forbidden_action');
  return findings;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         parent_id uuid,
         child_id uuid,
         set_key text,
         number text,
         name text,
         finish_key text,
         gv_id text,
         printing_gv_id text
       )
     )
     select 'target_parent' as row_type, cp.id::text as row_id, cp.set_code, cp.number, cp.name, cp.gv_id, null::text as finish_key, null::text as printing_gv_id, null::text as identity_hash
     from target t
     join public.card_prints cp
       on cp.id = t.parent_id
       or cp.gv_id = t.gv_id
       or (
         cp.set_code = t.set_key
         and cp.number = t.number
         and lower(cp.name) = lower(t.name)
         and coalesce(cp.variant_key, '') = ''
         and cp.printed_identity_modifier is null
       )
     union all
     select 'target_child', cpr.id::text, cp.set_code, cp.number, cp.name, cp.gv_id, cpr.finish_key, cpr.printing_gv_id, null::text
     from target t
     join public.card_printings cpr
       on cpr.id = t.child_id
       or cpr.printing_gv_id = t.printing_gv_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select 'target_identity', cpi.id::text, cp.set_code, cp.number, cp.name, cp.gv_id, null::text, null::text, cpi.identity_key_hash
     from target t
     join public.card_print_identity cpi on cpi.card_print_id = t.parent_id and cpi.is_active = true
     join public.card_prints cp on cp.id = cpi.card_print_id
     union all
     select 'target_set', s.id::text, s.code, null::text, s.name, null::text, null::text, null::text, null::text
     from public.sets s where lower(s.code) = 'mep'
     order by row_type, set_code nulls last, number nulls last, name nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets)],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: countBy(result.rows, (row) => row.row_type),
  };
}

async function applyPackage(client, targets, beforeSnapshot) {
  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table missing_promo_first_partner_targets (
         parent_id uuid primary key,
         child_id uuid not null,
         set_id uuid not null,
         set_key text not null,
         number text not null,
         name text not null,
         finish_key text not null,
         rarity text,
         gv_id text not null,
         printing_gv_id text not null,
         series text not null,
         evidence jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into missing_promo_first_partner_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         parent_id uuid,
         child_id uuid,
         set_id uuid,
         set_key text,
         number text,
         name text,
         finish_key text,
         rarity text,
         gv_id text,
         printing_gv_id text,
         series text,
         evidence jsonb
       )`,
      [JSON.stringify(targets.map((row) => ({
        parent_id: row.parent_id,
        child_id: row.child_id,
        set_id: row.set_id,
        set_key: row.set_key,
        number: row.number,
        name: row.name,
        finish_key: row.finish_key,
        rarity: row.rarity,
        gv_id: row.gv_id,
        printing_gv_id: row.printing_gv_id,
        series: row.series,
        evidence: row.evidence_payload,
      })))],
    );

    const guard = await client.query(
      `with projection as (
         select
           target.parent_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, target.set_key, s.code, target.number, regexp_replace(target.number, '^0+', ''),
             target.name, ''::text, s.printed_total, s.printed_set_abbrev
           ) as projected
         from missing_promo_first_partner_targets target
         join public.sets s on s.id = target.set_id
       )
       select
         (select count(*)::int from missing_promo_first_partner_targets) as target_count,
         (select count(distinct parent_id)::int from missing_promo_first_partner_targets) as parent_id_count,
         (select count(distinct child_id)::int from missing_promo_first_partner_targets) as child_id_count,
         (select count(*)::int from missing_promo_first_partner_targets target left join public.finish_keys fk on fk.key = target.finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int from missing_promo_first_partner_targets target join public.card_prints cp on cp.set_code = target.set_key and cp.number = target.number and lower(cp.name) = lower(target.name) and coalesce(cp.variant_key, '') = '' and cp.printed_identity_modifier is null) as parent_collision_count,
         (select count(*)::int from missing_promo_first_partner_targets target join public.card_prints cp on cp.gv_id = target.gv_id) as gv_id_collision_count,
         (select count(*)::int from missing_promo_first_partner_targets target join public.card_printings cpr on cpr.printing_gv_id = target.printing_gv_id) as printing_gv_id_collision_count,
         (select count(*)::int from projection where projected->>'status' = 'ready') as ready_identity_projection_count,
         (select count(*)::int from projection p join public.card_print_identity cpi on cpi.is_active = true and cpi.card_print_id <> p.parent_id and cpi.identity_domain = p.projected->>'identity_domain' and cpi.identity_key_version = p.projected->>'identity_key_version' and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collision_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== EXPECTED_TARGET_COUNT
      || guardRow.parent_id_count !== EXPECTED_TARGET_COUNT
      || guardRow.child_id_count !== EXPECTED_TARGET_COUNT
      || guardRow.inactive_finish_count !== 0
      || guardRow.parent_collision_count !== 0
      || guardRow.gv_id_collision_count !== 0
      || guardRow.printing_gv_id_collision_count !== 0
      || guardRow.ready_identity_projection_count !== EXPECTED_TARGET_COUNT
      || guardRow.identity_hash_collision_count !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
    }

    const parentInsert = await client.query(
      `insert into public.card_prints (
         id, set_id, name, number, variant_key, rarity, external_ids,
         updated_at, set_code, variants, created_at, last_synced_at,
         ai_metadata, data_quality_flags, image_status, gv_id,
         identity_domain, set_identity_model, image_note
       )
       select
         parent_id, set_id, name, number, '', rarity,
         jsonb_build_object('verified_master_index_v1', evidence),
         now(), set_key,
         jsonb_build_object('holo', true, 'normal', false, 'reverse', false, 'firstEdition', false, 'wPromo', false),
         now(), now(),
         evidence,
         jsonb_build_array('source_backed_missing_promo_insert'),
         'missing',
         gv_id,
         'pokemon_eng_standard',
         'standard',
         concat(series, ' source-backed parent identity. Exact image deferred.')
       from missing_promo_first_partner_targets`,
    );

    const identityInsert = await client.query(
      `with projection as (
         select
           target.parent_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, cp.set_code, s.code, cp.number, cp.number_plain, cp.name, cp.variant_key,
             coalesce(cp.printed_total, s.printed_total), coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from missing_promo_first_partner_targets target
         join public.card_prints cp on cp.id = target.parent_id
         left join public.sets s on s.id = cp.set_id
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
         child_id,
         parent_id,
         finish_key,
         now(),
         false,
         'verified_master_set_index_v1',
         concat(set_key, ':', number, ':first_partner:', finish_key),
         $1::text,
         printing_gv_id,
         'missing',
         concat(series, ' holo child printing. Exact image deferred.')
       from missing_promo_first_partner_targets`,
      [CREATED_BY],
    );

    const proof = await client.query(
      `select
         (select count(*)::int from missing_promo_first_partner_targets) as target_rows,
         (select count(*)::int from public.card_prints cp join missing_promo_first_partner_targets target on target.parent_id = cp.id) as inserted_parent_rows,
         (select count(*)::int from public.card_print_identity cpi join missing_promo_first_partner_targets target on target.parent_id = cpi.card_print_id and cpi.is_active = true) as inserted_identity_rows,
         (select count(*)::int from public.card_printings cpr join missing_promo_first_partner_targets target on target.child_id = cpr.id) as inserted_child_rows,
         (select count(*)::int from public.external_mappings em join missing_promo_first_partner_targets target on target.parent_id = em.card_print_id) as external_mapping_rows`,
    );
    const proofRow = proof.rows[0];
    if (
      parentInsert.rowCount !== EXPECTED_TARGET_COUNT
      || identityInsert.rowCount !== EXPECTED_TARGET_COUNT
      || childInsert.rowCount !== EXPECTED_TARGET_COUNT
      || proofRow.inserted_parent_rows !== EXPECTED_TARGET_COUNT
      || proofRow.inserted_identity_rows !== EXPECTED_TARGET_COUNT
      || proofRow.inserted_child_rows !== EXPECTED_TARGET_COUNT
      || proofRow.external_mapping_rows !== 0
    ) {
      throw new Error(`proof failed: ${JSON.stringify({ parentInsert: parentInsert.rowCount, identityInsert: identityInsert.rowCount, childInsert: childInsert.rowCount, proofRow })}`);
    }

    await client.query('commit');
    return {
      before_snapshot: beforeSnapshot,
      guard: guardRow,
      proof: proofRow,
      write_counts: {
        parent_inserts: parentInsert.rowCount,
        identity_inserts: identityInsert.rowCount,
        child_inserts: childInsert.rowCount,
        external_mapping_inserts: 0,
        deletes: 0,
        merges: 0,
      },
    };
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {}
    throw error;
  }
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing database connection URL.');

  const dryRun = await readJson(DRY_RUN_JSON);
  const validationFindings = validateDryRun(dryRun);
  if (validationFindings.length) {
    throw new Error(`Dry-run validation failed: ${validationFindings.join(', ')}`);
  }

  const targets = dryRun.scope.targets;
  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  try {
    const beforeSnapshot = await captureSnapshot(client, targets);
    if (beforeSnapshot.hash_sha256 !== dryRun.execution.before_snapshot.hash_sha256) {
      throw new Error(`fresh pre-apply snapshot mismatch: ${beforeSnapshot.hash_sha256} !== ${dryRun.execution.before_snapshot.hash_sha256}`);
    }

    const execution = await applyPackage(client, targets, beforeSnapshot);
    const afterSnapshot = await captureSnapshot(client, targets);
    const postApplyProof = sha256(stableJson({
      package_id: PACKAGE_ID,
      proof: execution.proof,
      after_counts: afterSnapshot.counts,
    }));

    const report = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      package_fingerprint_sha256: EXPECTED_FINGERPRINT,
      sql_hash_sha256: EXPECTED_SQL_HASH,
      approved_dry_run_proof_sha256: EXPECTED_DRY_RUN_PROOF,
      post_apply_proof_sha256: postApplyProof,
      scope: {
        target_parent_rows: EXPECTED_TARGET_COUNT,
        target_identity_rows: EXPECTED_TARGET_COUNT,
        target_child_rows: EXPECTED_TARGET_COUNT,
        target_external_mapping_rows: 0,
        targets,
      },
      execution: {
        status: 'applied',
        ...execution,
        after_snapshot: afterSnapshot,
      },
      db_writes_performed: true,
      writes_performed: ['card_prints insert', 'card_print_identity insert', 'card_printings insert'],
      external_mapping_writes_performed: false,
      pricing_writes_performed: false,
      image_writes_performed: false,
      deletes_performed: false,
      merges_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      ancient_mew_inserted: false,
    };

    const md = [
      '# Missing Promo First Partner Real Apply V1',
      '',
      `- package_id: \`${PACKAGE_ID}\``,
      `- fingerprint: \`${EXPECTED_FINGERPRINT}\``,
      `- sql_hash: \`${EXPECTED_SQL_HASH}\``,
      `- approved_dry_run_proof: \`${EXPECTED_DRY_RUN_PROOF}\``,
      `- post_apply_proof: \`${postApplyProof}\``,
      '',
      '## Applied Scope',
      '',
      `- parent inserts: ${execution.write_counts.parent_inserts}`,
      `- active identity inserts: ${execution.write_counts.identity_inserts}`,
      `- child printing inserts: ${execution.write_counts.child_inserts}`,
      '- external mapping inserts: 0',
      '- Ancient Mew inserted: false',
      '',
      markdownTable(
        ['number', 'name', 'series', 'finish', 'gv_id', 'printing_gv_id'],
        targets.map((row) => [row.number, row.name, row.series, row.finish_key, row.gv_id, row.printing_gv_id]),
      ),
      '',
      '## Safety',
      '',
      '- No pricing writes.',
      '- No image writes.',
      '- No external mapping writes.',
      '- No deletes.',
      '- No merges.',
      '- No migrations.',
      '- Ancient Mew remains blocked pending set-lane governance.',
      '',
    ].join('\n');

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, `${md}\n`);
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      status: 'applied',
      package_fingerprint_sha256: EXPECTED_FINGERPRINT,
      sql_hash_sha256: EXPECTED_SQL_HASH,
      approved_dry_run_proof_sha256: EXPECTED_DRY_RUN_PROOF,
      post_apply_proof_sha256: postApplyProof,
      parent_inserts: execution.write_counts.parent_inserts,
      identity_inserts: execution.write_counts.identity_inserts,
      child_inserts: execution.write_counts.child_inserts,
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
