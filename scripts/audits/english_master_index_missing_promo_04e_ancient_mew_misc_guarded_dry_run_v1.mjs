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
const SOURCE_JSON = path.join(AUDIT_DIR, 'ancient_mew_set_lane_governance_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'ancient_mew_misc_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'ancient_mew_misc_guarded_dry_run_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-04E-ANCIENT-MEW-MISC-SET-PARENT-CHILD-INSERTS';
const CREATED_BY = 'english_master_index_missing_promo_04e_ancient_mew_misc_guarded_dry_run_v1';
const EXPECTED_SOURCE_PACKAGE_ID = 'MISSING-PROMO-04D-ANCIENT-MEW-SET-LANE-GOVERNANCE';
const EXPECTED_SOURCE_FINGERPRINT = '3ca75e62877ff3c11f7f9fd992ae085c5fc2e4a26a0ab485b9b552da9133f4cf';

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

function sqlHash() {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    writes: [
      'insert one public.sets row for misc / Miscellaneous Cards & Products',
      'insert one public.card_prints parent for English Ancient Mew',
      'insert one active public.card_print_identity row from projection',
      'insert one public.card_printings cosmos child printing',
    ],
    forbidden: [
      'external mapping writes',
      'pricing writes',
      'image writes',
      'Japanese variant inserts',
      'Nintedo error inserts',
      'deletes',
      'merges',
      'migrations',
      'global apply',
    ],
  }));
}

function buildTarget(governance) {
  const setLane = governance.recommended_set_lane;
  const cardFact = governance.recommended_card_fact;
  const setId = uuidFromSeed(`${PACKAGE_ID}:set:${setLane.set_code}:${setLane.set_name}`);
  const parentId = uuidFromSeed(`${PACKAGE_ID}:parent:${cardFact.set_code}:${cardFact.number}:${cardFact.name}`);
  const childId = uuidFromSeed(`${PACKAGE_ID}:child:${cardFact.set_code}:${cardFact.number}:${cardFact.name}:${cardFact.finish_key}`);

  return {
    set_id: setId,
    set_code: setLane.set_code,
    set_name: setLane.set_name,
    printed_set_abbrev: setLane.printed_set_abbrev,
    printed_total: 1,
    set_role: 'promotion_umbrella',
    identity_domain_default: setLane.identity_domain_default,
    identity_model: 'standard',
    parent_id: parentId,
    child_id: childId,
    card_name: cardFact.name,
    card_number: cardFact.number,
    rarity: cardFact.rarity,
    finish_key: cardFact.finish_key,
    gv_id: cardFact.recommended_gv_id,
    printing_gv_id: cardFact.recommended_printing_gv_id,
    variant_key: '',
    printed_identity_modifier: null,
    set_source: {
      verified_master_index_v1: {
        package_id: PACKAGE_ID,
        source_governance_package_id: governance.package_id,
        source_governance_fingerprint_sha256: governance.fingerprint_sha256,
        lane_type: setLane.lane_type,
        source_aliases: setLane.source_aliases,
        governance_decision: setLane.governance_decision,
      },
    },
    evidence_payload: {
      source: 'verified_master_index_v1',
      package_id: PACKAGE_ID,
      source_governance_package_id: governance.package_id,
      source_governance_fingerprint_sha256: governance.fingerprint_sha256,
      classification: 'ancient_mew_movie_2000_miscellaneous_promo',
      number_governance: cardFact.number_governance,
      evidence_urls: governance.sources.map((source) => source.source_url),
      evidence_labels: governance.sources.map((source) => source.evidence_label),
      preserved_evidence_sources: governance.sources.map((source) => source.source_key),
      evidence: governance.sources,
      adjacent_variant_boundaries: governance.adjacent_variant_boundaries,
      note: 'English Ancient Mew movie-promo lane. Japanese exclusive print and Nintedo/error variants are excluded pending separate governance.',
    },
  };
}

function packageFingerprint(governance, target) {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    source_governance_fingerprint_sha256: governance.fingerprint_sha256,
    target: {
      set_id: target.set_id,
      set_code: target.set_code,
      parent_id: target.parent_id,
      child_id: target.child_id,
      card_name: target.card_name,
      card_number: target.card_number,
      finish_key: target.finish_key,
      gv_id: target.gv_id,
      printing_gv_id: target.printing_gv_id,
    },
  }));
}

async function captureSnapshot(client, target) {
  const result = await client.query(
    `select
       'target_set' as row_type,
       s.id::text as row_id,
       s.code as set_code,
       null::text as card_number,
       s.name,
       null::text as finish_key,
       null::text as gv_id,
       null::text as printing_gv_id,
       null::text as identity_key_hash
     from public.sets s
     where s.id = $1::uuid
        or lower(s.code) = lower($2::text)
        or lower(s.name) = lower($3::text)
     union all
     select
       'target_parent',
       cp.id::text,
       cp.set_code,
       cp.number,
       cp.name,
       null::text,
       cp.gv_id,
       null::text,
       null::text
     from public.card_prints cp
     where cp.id = $4::uuid
        or cp.gv_id = $5::text
        or lower(cp.name) = 'ancient mew'
     union all
     select
       'target_child',
       cpr.id::text,
       cp.set_code,
       cp.number,
       cp.name,
       cpr.finish_key,
       cp.gv_id,
       cpr.printing_gv_id,
       null::text
     from public.card_printings cpr
     join public.card_prints cp on cp.id = cpr.card_print_id
     where cpr.id = $6::uuid
        or cpr.printing_gv_id = $7::text
        or lower(cp.name) = 'ancient mew'
     union all
     select
       'target_identity',
       cpi.id::text,
       cp.set_code,
       cp.number,
       cp.name,
       null::text,
       cp.gv_id,
       null::text,
       cpi.identity_key_hash
     from public.card_print_identity cpi
     join public.card_prints cp on cp.id = cpi.card_print_id
     where cpi.card_print_id = $4::uuid
        or lower(cp.name) = 'ancient mew'
     order by row_type, set_code nulls last, card_number nulls last, name nulls last, finish_key nulls last, row_id`,
    [
      target.set_id,
      target.set_code,
      target.set_name,
      target.parent_id,
      target.gv_id,
      target.child_id,
      target.printing_gv_id,
    ],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    counts: countBy(result.rows, (row) => row.row_type),
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

async function runDryRun(client, target) {
  const beforeSnapshot = await captureSnapshot(client, target);

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table ancient_mew_target (
         set_id uuid primary key,
         set_code text not null,
         set_name text not null,
         printed_set_abbrev text not null,
         printed_total int not null,
         set_role text not null,
         identity_domain_default text not null,
         identity_model text not null,
         parent_id uuid not null,
         child_id uuid not null,
         card_name text not null,
         card_number text not null,
         rarity text,
         finish_key text not null,
         gv_id text not null,
         printing_gv_id text not null,
         variant_key text not null,
         printed_identity_modifier text,
         set_source jsonb not null,
         evidence_payload jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into ancient_mew_target
       select *
       from jsonb_to_record($1::jsonb) as t(
         set_id uuid,
         set_code text,
         set_name text,
         printed_set_abbrev text,
         printed_total int,
         set_role text,
         identity_domain_default text,
         identity_model text,
         parent_id uuid,
         child_id uuid,
         card_name text,
         card_number text,
         rarity text,
         finish_key text,
         gv_id text,
         printing_gv_id text,
         variant_key text,
         printed_identity_modifier text,
         set_source jsonb,
         evidence_payload jsonb
       )`,
      [JSON.stringify(target)],
    );

    const guard = await client.query(
      `select
         (select count(*)::int from ancient_mew_target) as target_rows,
         (select count(*)::int from ancient_mew_target t join public.sets s on s.id = t.set_id or lower(s.code) = lower(t.set_code) or lower(s.name) = lower(t.set_name)) as set_collision_count,
         (select count(*)::int from ancient_mew_target t join public.card_prints cp on cp.id = t.parent_id or cp.gv_id = t.gv_id or lower(cp.name) = lower(t.card_name)) as parent_collision_count,
         (select count(*)::int from ancient_mew_target t join public.card_printings cpr on cpr.id = t.child_id or cpr.printing_gv_id = t.printing_gv_id) as child_collision_count,
         (select count(*)::int from ancient_mew_target t join public.finish_keys fk on fk.key = t.finish_key and fk.is_active = true) as active_finish_count,
         (select count(*)::int from ancient_mew_target t where t.set_code = 'misc' and t.card_name = 'Ancient Mew' and t.card_number = '1' and t.finish_key = 'cosmos') as expected_shape_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_rows !== 1
      || guardRow.set_collision_count !== 0
      || guardRow.parent_collision_count !== 0
      || guardRow.child_collision_count !== 0
      || guardRow.active_finish_count !== 1
      || guardRow.expected_shape_count !== 1
    ) {
      throw new Error(`pre-insert guard failed: ${JSON.stringify(guardRow)}`);
    }

    const setInsert = await client.query(
      `insert into public.sets (
         id, game, code, name, source, printed_total, printed_set_abbrev,
         set_role, identity_domain_default, identity_model, created_at, updated_at, last_synced_at
       )
       select
         set_id, 'pokemon', set_code, set_name, set_source, printed_total, printed_set_abbrev,
         set_role, identity_domain_default, identity_model, now(), now(), now()
       from ancient_mew_target`,
    );

    const parentInsert = await client.query(
      `insert into public.card_prints (
         id, set_id, name, number, variant_key, rarity, external_ids,
         updated_at, set_code, variants, created_at, last_synced_at,
         ai_metadata, data_quality_flags, image_status, gv_id,
         identity_domain, printed_identity_modifier, set_identity_model,
         printed_set_abbrev, printed_total, image_note
       )
       select
         parent_id, set_id, card_name, card_number, variant_key, rarity,
         jsonb_build_object('verified_master_index_v1', evidence_payload),
         now(), set_code,
         jsonb_build_object('normal', false, 'holo', false, 'reverse', false, 'cosmos', true, 'firstEdition', false),
         now(), now(),
         evidence_payload,
         jsonb_build_array('source_backed_missing_promo_insert', 'ancient_mew_miscellaneous_movie_promo'),
         'missing',
         gv_id,
         identity_domain_default,
         printed_identity_modifier,
         identity_model,
         printed_set_abbrev,
         printed_total,
         'Source-backed Ancient Mew English movie promo. Exact image deferred.'
       from ancient_mew_target`,
    );

    const projectionGuard = await client.query(
      `with projection as (
         select
           t.parent_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, cp.set_code, s.code, cp.number, cp.number_plain, cp.name, cp.variant_key,
             coalesce(cp.printed_total, s.printed_total), coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from ancient_mew_target t
         join public.card_prints cp on cp.id = t.parent_id
         join public.sets s on s.id = cp.set_id
       )
       select
         (select count(*)::int from projection where projected->>'status' = 'ready') as ready_projection_count,
         (select count(*)::int from projection p join public.card_print_identity cpi on cpi.is_active = true and cpi.card_print_id <> p.parent_id and cpi.identity_domain = p.projected->>'identity_domain' and cpi.identity_key_version = p.projected->>'identity_key_version' and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collision_count`,
    );
    const projectionGuardRow = projectionGuard.rows[0];
    if (projectionGuardRow.ready_projection_count !== 1 || projectionGuardRow.identity_hash_collision_count !== 0) {
      throw new Error(`identity projection guard failed: ${JSON.stringify(projectionGuardRow)}`);
    }

    const identityInsert = await client.query(
      `with projection as (
         select
           t.parent_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, cp.set_code, s.code, cp.number, cp.number_plain, cp.name, cp.variant_key,
             coalesce(cp.printed_total, s.printed_total), coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from ancient_mew_target t
         join public.card_prints cp on cp.id = t.parent_id
         join public.sets s on s.id = cp.set_id
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
         child_id, parent_id, finish_key, now(), false,
         'verified_master_set_index_v1',
         concat(set_code, ':', card_number, ':ancient_mew:', finish_key),
         $1::text,
         printing_gv_id,
         'missing',
         'Source-backed Ancient Mew cosmos child. Exact image deferred.'
       from ancient_mew_target`,
      [CREATED_BY],
    );

    const proof = await client.query(
      `select
         (select count(*)::int from ancient_mew_target) as target_rows,
         (select count(*)::int from public.sets s join ancient_mew_target t on t.set_id = s.id) as inserted_set_rows,
         (select count(*)::int from public.card_prints cp join ancient_mew_target t on t.parent_id = cp.id) as inserted_parent_rows,
         (select count(*)::int from public.card_print_identity cpi join ancient_mew_target t on t.parent_id = cpi.card_print_id and cpi.is_active = true) as inserted_identity_rows,
         (select count(*)::int from public.card_printings cpr join ancient_mew_target t on t.child_id = cpr.id) as inserted_child_rows,
         (select count(*)::int from public.external_mappings em join ancient_mew_target t on t.parent_id = em.card_print_id) as external_mapping_rows,
         (select count(*)::int from public.card_printings cpr join ancient_mew_target t on t.child_id = cpr.id where cpr.finish_key = 'cosmos' and cpr.printing_gv_id = t.printing_gv_id) as matching_cosmos_child_rows`,
    );
    const proofRow = proof.rows[0];
    if (
      setInsert.rowCount !== 1
      || parentInsert.rowCount !== 1
      || identityInsert.rowCount !== 1
      || childInsert.rowCount !== 1
      || proofRow.inserted_set_rows !== 1
      || proofRow.inserted_parent_rows !== 1
      || proofRow.inserted_identity_rows !== 1
      || proofRow.inserted_child_rows !== 1
      || proofRow.external_mapping_rows !== 0
      || proofRow.matching_cosmos_child_rows !== 1
    ) {
      throw new Error(`proof failed: ${JSON.stringify({ proof: proofRow, setInsert: setInsert.rowCount, parentInsert: parentInsert.rowCount, identityInsert: identityInsert.rowCount, childInsert: childInsert.rowCount })}`);
    }

    const dryRunProof = sha256(stableJson({
      guard: guardRow,
      projection_guard: projectionGuardRow,
      proof: proofRow,
      inserted: {
        set: setInsert.rowCount,
        parent: parentInsert.rowCount,
        identity: identityInsert.rowCount,
        child: childInsert.rowCount,
      },
    }));

    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, target);

    return {
      dry_run_status: 'ancient_mew_misc_set_parent_child_insert_completed_rolled_back_no_durable_change',
      before_snapshot: beforeSnapshot,
      after_rollback_snapshot: afterSnapshot,
      rollback_verified: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
      guard: guardRow,
      projection_guard: projectionGuardRow,
      proof: proofRow,
      simulated_write_counts: {
        set_inserts: setInsert.rowCount,
        parent_inserts: parentInsert.rowCount,
        identity_inserts: identityInsert.rowCount,
        child_inserts: childInsert.rowCount,
        external_mapping_inserts: 0,
        pricing_writes: 0,
        image_writes: 0,
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

function renderMarkdown(report) {
  const target = report.scope.target;
  return [
    '# Ancient Mew Misc Set Guarded Dry Run V1',
    '',
    `- package_id: \`${report.package_id}\``,
    `- source_governance_fingerprint: \`${report.source_governance_fingerprint_sha256}\``,
    `- package_fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- sql_hash: \`${report.sql_hash_sha256}\``,
    `- dry_run_proof: \`${report.execution.dry_run_proof_sha256}\``,
    `- rollback_verified: ${report.execution.rollback_verified}`,
    '',
    '## Scope',
    '',
    markdownTable(
      ['write class', 'count'],
      [
        ['set inserts', report.execution.simulated_write_counts.set_inserts],
        ['parent inserts', report.execution.simulated_write_counts.parent_inserts],
        ['identity inserts', report.execution.simulated_write_counts.identity_inserts],
        ['child inserts', report.execution.simulated_write_counts.child_inserts],
        ['external mapping inserts', report.execution.simulated_write_counts.external_mapping_inserts],
        ['pricing writes', report.execution.simulated_write_counts.pricing_writes],
        ['image writes', report.execution.simulated_write_counts.image_writes],
        ['deletes', report.execution.simulated_write_counts.deletes],
        ['merges', report.execution.simulated_write_counts.merges],
      ],
    ),
    '',
    '## Target',
    '',
    markdownTable(
      ['field', 'value'],
      [
        ['set', `${target.set_code} / ${target.set_name}`],
        ['card', `${target.card_name} #${target.card_number}`],
        ['finish', target.finish_key],
        ['gv_id', target.gv_id],
        ['printing_gv_id', target.printing_gv_id],
        ['parent_id', target.parent_id],
        ['child_id', target.child_id],
      ],
    ),
    '',
    '## Proof',
    '',
    markdownTable(
      ['check', 'value'],
      Object.entries(report.execution.proof).map(([key, value]) => [key, String(value)]),
    ),
    '',
    '## Safety',
    '',
    '- durable_db_writes_performed: false',
    '- migrations_created: false',
    '- external_mapping_writes_performed: false',
    '- pricing_writes_performed: false',
    '- image_writes_performed: false',
    '- cleanup_performed: false',
    '- quarantine_performed: false',
    '- Japanese Exclusive Print and Nintedo/error variants remain excluded.',
    '',
    '## Approval Text For Real Apply',
    '',
    '```text',
    report.recommended_real_apply_approval_text,
    '```',
    '',
  ].join('\n');
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing database connection URL.');

  const governance = await readJson(SOURCE_JSON);
  if (governance.package_id !== EXPECTED_SOURCE_PACKAGE_ID) throw new Error(`Unexpected source package: ${governance.package_id}`);
  if (governance.fingerprint_sha256 !== EXPECTED_SOURCE_FINGERPRINT) throw new Error('Unexpected source governance fingerprint.');
  if (governance.governance_status !== 'set_lane_governed_ready_for_guarded_dry_run') throw new Error(`Governance is not ready: ${governance.governance_status}`);

  const target = buildTarget(governance);
  const fingerprint = packageFingerprint(governance, target);
  const hash = sqlHash();

  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  try {
    const execution = await runDryRun(client, target);
    const approvalText = `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${fingerprint}. SQL hash: ${hash}. Scope: 1 misc set insert, 1 Ancient Mew parent insert, 1 active identity insert, 1 cosmos child printing insert; set misc/Miscellaneous Cards & Products; gv_id ${target.gv_id}; printing_gv_id ${target.printing_gv_id}. Dry-run proof: ${execution.dry_run_proof_sha256} == ${execution.dry_run_proof_sha256}. No external mappings. No pricing writes. No image writes. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.`;
    const report = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      source_governance_package_id: governance.package_id,
      source_governance_fingerprint_sha256: governance.fingerprint_sha256,
      package_fingerprint_sha256: fingerprint,
      sql_hash_sha256: hash,
      scope: {
        target,
        expected_set_inserts: 1,
        expected_parent_inserts: 1,
        expected_identity_inserts: 1,
        expected_child_inserts: 1,
        expected_external_mapping_inserts: 0,
        excluded_adjacent_variants: governance.adjacent_variant_boundaries,
      },
      execution,
      pass: execution.rollback_verified === true && (execution.stop_findings ?? []).length === 0,
      recommended_real_apply_approval_text: approvalText,
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      pricing_writes_performed: false,
      image_writes_performed: false,
      external_mapping_writes_performed: false,
      cleanup_performed: false,
      quarantine_performed: false,
    };

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, `${renderMarkdown(report)}\n`);

    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: fingerprint,
      sql_hash_sha256: hash,
      dry_run_proof_sha256: execution.dry_run_proof_sha256,
      rollback_verified: execution.rollback_verified,
      pass: report.pass,
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
      recommended_real_apply_approval_text: approvalText,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
