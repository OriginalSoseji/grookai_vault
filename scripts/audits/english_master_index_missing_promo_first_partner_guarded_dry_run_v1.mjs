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
const SOURCE_JSON = path.join(AUDIT_DIR, 'missing_promo_first_partner_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'missing_promo_first_partner_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'missing_promo_first_partner_guarded_dry_run_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-01B-FIRST-PARTNER-PARENT-CHILD-INSERTS';
const CREATED_BY = 'english_master_index_missing_promo_first_partner_guarded_dry_run_v1';
const EXPECTED_SOURCE_PACKAGE_ID = 'MISSING-PROMO-01A-FIRST-PARTNER-AND-ANCIENT-MEW-READINESS';
const EXPECTED_READY_COUNT = 18;

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

function packageFingerprint(sourceFingerprint, targets) {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    source_readiness_fingerprint_sha256: sourceFingerprint,
    targets: targets.map((row) => ({
      set_key: row.set_key,
      number: row.number,
      name: row.name,
      finish_key: row.finish_key,
      gv_id: row.gv_id,
      printing_gv_id: row.printing_gv_id,
      parent_id: row.parent_id,
      child_id: row.child_id,
    })),
  }));
}

function sqlHash() {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    writes: [
      'insert public.card_prints for MEP First Partner Series 2/3 missing parent identities',
      'insert public.card_print_identity via card_print_identity_backfill_projection_v1',
      'insert public.card_printings holo children with printing_gv_id',
    ],
    forbidden: [
      'real apply',
      'external_mappings',
      'pricing writes',
      'image writes',
      'deletes',
      'merges',
      'migrations',
      'Ancient Mew insert',
    ],
  }));
}

function buildTargets(readiness, setRow) {
  return readiness.ready_rows.map((row) => ({
    ...row,
    set_id: setRow.set_id,
    parent_id: uuidFromSeed(`${PACKAGE_ID}:parent:${row.set_key}:${row.number}:${row.name}`),
    child_id: uuidFromSeed(`${PACKAGE_ID}:child:${row.set_key}:${row.number}:${row.name}:${row.finish_key}`),
    evidence_payload: {
      source: 'verified_master_set_index_v1',
      source_package_id: PACKAGE_ID,
      source_readiness_package_id: readiness.package_id,
      source_readiness_fingerprint_sha256: readiness.fingerprint_sha256,
      evidence_urls: row.evidence_urls,
      evidence_sources: row.sources,
      product_family: row.series,
      note: 'Source-backed MEP First Partner Illustration Collection promo identity.',
    },
  }));
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

async function runDryRun(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);

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
    const stopFindings = [];
    if (guardRow.target_count !== EXPECTED_READY_COUNT) stopFindings.push('target_count_mismatch');
    if (guardRow.parent_id_count !== EXPECTED_READY_COUNT) stopFindings.push('parent_id_count_mismatch');
    if (guardRow.child_id_count !== EXPECTED_READY_COUNT) stopFindings.push('child_id_count_mismatch');
    if (guardRow.inactive_finish_count !== 0) stopFindings.push('inactive_finish_present');
    if (guardRow.parent_collision_count !== 0) stopFindings.push('parent_collision_present');
    if (guardRow.gv_id_collision_count !== 0) stopFindings.push('gv_id_collision_present');
    if (guardRow.printing_gv_id_collision_count !== 0) stopFindings.push('printing_gv_id_collision_present');
    if (guardRow.ready_identity_projection_count !== EXPECTED_READY_COUNT) stopFindings.push('identity_projection_not_ready');
    if (guardRow.identity_hash_collision_count !== 0) stopFindings.push('identity_hash_collision_present');
    if (stopFindings.length) throw new Error(`guard failed: ${JSON.stringify({ guardRow, stopFindings })}`);

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
    const proofFindings = [];
    if (parentInsert.rowCount !== EXPECTED_READY_COUNT || proofRow.inserted_parent_rows !== EXPECTED_READY_COUNT) proofFindings.push('parent_insert_count_mismatch');
    if (identityInsert.rowCount !== EXPECTED_READY_COUNT || proofRow.inserted_identity_rows !== EXPECTED_READY_COUNT) proofFindings.push('identity_insert_count_mismatch');
    if (childInsert.rowCount !== EXPECTED_READY_COUNT || proofRow.inserted_child_rows !== EXPECTED_READY_COUNT) proofFindings.push('child_insert_count_mismatch');
    if (proofRow.external_mapping_rows !== 0) proofFindings.push('external_mapping_insert_detected');
    if (proofFindings.length) throw new Error(`proof failed: ${JSON.stringify({ proofRow, proofFindings })}`);

    const dryRunProof = sha256(stableJson({ guard: guardRow, proof: proofRow, parentInsert: parentInsert.rowCount, identityInsert: identityInsert.rowCount, childInsert: childInsert.rowCount }));
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      dry_run_status: 'missing_promo_first_partner_parent_child_insert_completed_rolled_back_no_durable_change',
      before_snapshot: beforeSnapshot,
      after_rollback_snapshot: afterSnapshot,
      rollback_verified: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
      guard: guardRow,
      proof: proofRow,
      simulated_write_counts: {
        parent_inserts: parentInsert.rowCount,
        identity_inserts: identityInsert.rowCount,
        child_inserts: childInsert.rowCount,
        external_mapping_inserts: 0,
        deletes: 0,
        merges: 0,
      },
      dry_run_proof_sha256: dryRunProof,
      stop_findings: [],
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

  const readiness = await readJson(SOURCE_JSON);
  if (readiness.package_id !== EXPECTED_SOURCE_PACKAGE_ID) throw new Error('Unexpected readiness package.');
  if ((readiness.ready_rows ?? []).length !== EXPECTED_READY_COUNT) throw new Error(`Expected ${EXPECTED_READY_COUNT} ready rows.`);

  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  try {
    const setResult = await client.query(
      `select id::text as set_id, code, name
       from public.sets
       where lower(code) = 'mep'`,
    );
    if (setResult.rows.length !== 1) throw new Error(`expected one MEP set, found ${setResult.rows.length}`);

    const targets = buildTargets(readiness, setResult.rows[0]);
    const fingerprint = packageFingerprint(readiness.fingerprint_sha256, targets);
    const dryRun = await runDryRun(client, targets);

    const report = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      source_readiness_package_id: readiness.package_id,
      source_readiness_fingerprint_sha256: readiness.fingerprint_sha256,
      package_fingerprint_sha256: fingerprint,
      sql_hash_sha256: sqlHash(),
      scope: {
        target_parent_rows: targets.length,
        target_child_rows: targets.length,
        target_identity_rows: targets.length,
        target_external_mapping_rows: 0,
        by_series: countBy(targets, (row) => row.series),
        by_finish: countBy(targets, (row) => row.finish_key),
        targets,
      },
      execution: dryRun,
      pass: dryRun.rollback_verified === true && (dryRun.stop_findings ?? []).length === 0,
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      pricing_writes_performed: false,
      image_writes_performed: false,
      external_mapping_writes_performed: false,
      cleanup_performed: false,
      quarantine_performed: false,
    };

    const md = [
      '# Missing Promo First Partner Guarded Dry Run V1',
      '',
      `- package_id: \`${PACKAGE_ID}\``,
      `- package_fingerprint: \`${fingerprint}\``,
      `- sql_hash: \`${report.sql_hash_sha256}\``,
      `- dry_run_proof: \`${dryRun.dry_run_proof_sha256}\``,
      `- rollback_verified: ${dryRun.rollback_verified}`,
      '',
      '## Scope',
      '',
      `- parent inserts simulated: ${targets.length}`,
      `- identity inserts simulated: ${targets.length}`,
      `- child inserts simulated: ${targets.length}`,
      '- external mapping inserts simulated: 0',
      '',
      markdownTable(
        ['number', 'name', 'series', 'finish', 'gv_id', 'printing_gv_id'],
        targets.map((row) => [row.number, row.name, row.series, row.finish_key, row.gv_id, row.printing_gv_id]),
      ),
      '',
      '## Safety',
      '',
      '- db_writes_performed: false',
      '- durable_db_writes_performed: false',
      '- migrations_created: false',
      '- pricing_writes_performed: false',
      '- image_writes_performed: false',
      '- external_mapping_writes_performed: false',
      '- cleanup_performed: false',
      '- quarantine_performed: false',
      '',
    ].join('\n');

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, `${md}\n`);
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: fingerprint,
      sql_hash_sha256: report.sql_hash_sha256,
      dry_run_proof_sha256: dryRun.dry_run_proof_sha256,
      rollback_verified: dryRun.rollback_verified,
      target_parent_rows: targets.length,
      target_child_rows: targets.length,
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
