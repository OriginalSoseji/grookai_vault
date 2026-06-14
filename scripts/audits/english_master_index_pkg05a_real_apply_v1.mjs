import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg05a_final_snapshot_transaction_artifact_v1.json');
const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg05a_real_apply_gate_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg05a_guarded_dry_run_execution_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg05a_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg05a_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg05a_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS';
const READINESS_FINGERPRINT = 'da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1';
const ARTIFACT_FINGERPRINT = 'df4c9dcae0a19731d4b96f9efd0322f5fde78722c0c08786e4d97a8a2d395dc9';
const DRY_RUN_PROOF_HASH = '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945';
const APPROVAL_TEXT = 'Approve real PKG-05A apply only. Fingerprint: df4c9dcae0a19731d4b96f9efd0322f5fde78722c0c08786e4d97a8a2d395dc9. Readiness fingerprint: da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1. Scope: 4 set inserts, 72 parent card_print inserts, 80 child card_printing inserts, 72 external mappings. Dry-run proof: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 == 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.';

const EXPECTED_COUNTS = {
  sets: 4,
  parents: 72,
  children: 80,
  mappings: 72,
};
const EXPECTED_FINISH_COUNTS = { holo: 13, normal: 59, reverse: 8 };
const EXPECTED_SET_COUNTS = {
  '2023sv': { parents: 15, children: 15 },
  '2024sv': { parents: 15, children: 15 },
  mee: { parents: 8, children: 16 },
  mfb: { parents: 34, children: 34 },
};

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
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

function setAliases(artifact) {
  return [...new Set((artifact.planned_sets ?? []).flatMap((row) => row.aliases ?? []).map((row) => String(row).toLowerCase()))];
}

function setKeys(artifact) {
  return (artifact.planned_sets ?? []).map((row) => row.set_key);
}

function validateExpectedCounts(actual, expected, label, findings) {
  for (const [key, count] of Object.entries(expected)) {
    if (actual[key] !== count) findings.push(`${label}_${key}_count_not_${count}`);
  }
  for (const key of Object.keys(actual)) {
    if (expected[key] === undefined) findings.push(`${label}_${key}_unexpected`);
  }
}

async function captureTargetSnapshot(client, artifact) {
  const aliases = setAliases(artifact);
  const keys = setKeys(artifact);
  const plannedSetIds = (artifact.planned_sets ?? []).map((row) => row.set_id);
  const plannedParentIds = (artifact.planned_parent_rows ?? []).map((row) => row.card_print_id);
  const plannedChildIds = (artifact.planned_child_printing_rows ?? []).map((row) => row.card_printing_id);
  const plannedExternalIds = (artifact.planned_external_mapping_rows ?? []).map((row) => row.external_id);

  const result = await client.query(
    `select
       'set' as row_type,
       s.id::text as row_id,
       s.code as set_code,
       s.name,
       null::text as card_number,
       null::text as finish_key,
       null::text as external_id
     from public.sets s
     where s.id = any($3::uuid[])
        or (
          s.game = 'pokemon'
          and (
            lower(coalesce(s.code, '')) = any($1::text[])
            or lower(coalesce(s.name, '')) = any($1::text[])
            or s.source->'tcgdex'->>'id' = any($2::text[])
          )
        )
     union all
     select
       'card_print' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.name,
       coalesce(cp.number_plain, cp.number) as card_number,
       null::text as finish_key,
       null::text as external_id
     from public.card_prints cp
     where cp.id = any($4::uuid[])
        or lower(coalesce(cp.set_code, '')) = any($1::text[])
     union all
     select
       'card_printing' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       cp.name,
       coalesce(cp.number_plain, cp.number) as card_number,
       cpr.finish_key,
       null::text as external_id
     from public.card_printings cpr
     join public.card_prints cp on cp.id = cpr.card_print_id
     where cpr.id = any($5::uuid[])
        or lower(coalesce(cp.set_code, '')) = any($1::text[])
     union all
     select
       'external_mapping' as row_type,
       em.id::text as row_id,
       null::text as set_code,
       null::text as name,
       null::text as card_number,
       null::text as finish_key,
       em.external_id
     from public.external_mappings em
     where em.source = 'tcgdex'
       and em.external_id = any($6::text[])
     order by row_type, set_code nulls last, card_number nulls last, name nulls last, finish_key nulls last, external_id nulls last, row_id`,
    [aliases, keys, plannedSetIds, plannedParentIds, plannedChildIds, plannedExternalIds],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      set_rows: rows.filter((row) => row.row_type === 'set').length,
      parent_rows: rows.filter((row) => row.row_type === 'card_print').length,
      child_printing_rows: rows.filter((row) => row.row_type === 'card_printing').length,
      external_mapping_rows: rows.filter((row) => row.row_type === 'external_mapping').length,
      total_rows: rows.length,
    },
  };
}

async function captureInsertedRows(client, artifact) {
  const childIds = (artifact.planned_child_printing_rows ?? []).map((row) => row.card_printing_id);
  const setIds = (artifact.planned_sets ?? []).map((row) => row.set_id);
  const parentIds = (artifact.planned_parent_rows ?? []).map((row) => row.card_print_id);
  const externalIds = (artifact.planned_external_mapping_rows ?? []).map((row) => row.external_id);

  const sets = await client.query(
    `select id::text, code, name, game, source
     from public.sets
     where id = any($1::uuid[])
     order by code, id`,
    [setIds],
  );
  const parents = await client.query(
    `select id::text, set_id::text, set_code, number, number_plain, name, rarity, variant_key, external_ids, ai_metadata
     from public.card_prints
     where id = any($1::uuid[])
     order by set_code, number, name, id`,
    [parentIds],
  );
  const children = await client.query(
    `select
       cpr.id::text as card_printing_id,
       cpr.card_print_id::text as card_print_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       cpr.finish_key,
       cpr.is_provisional,
       cpr.provenance_source,
       cpr.provenance_ref,
       cpr.created_by
     from public.card_printings cpr
     join public.card_prints cp on cp.id = cpr.card_print_id
     where cpr.id = any($1::uuid[])
     order by cp.set_code, card_number, cp.name, cpr.finish_key, cpr.id`,
    [childIds],
  );
  const mappings = await client.query(
    `select source, external_id, card_print_id::text, meta
     from public.external_mappings
     where source = 'tcgdex'
       and external_id = any($1::text[])
     order by source, external_id, card_print_id`,
    [externalIds],
  );

  return {
    captured_at: new Date().toISOString(),
    sets: sets.rows,
    parents: parents.rows,
    children: children.rows,
    mappings: mappings.rows,
    hash_sha256: sha256(stableJson({ sets: sets.rows, parents: parents.rows, children: children.rows, mappings: mappings.rows })),
    counts: {
      set_rows_found: sets.rows.length,
      parent_rows_found: parents.rows.length,
      child_rows_found: children.rows.length,
      external_mapping_rows_found: mappings.rows.length,
      provisional_child_rows: children.rows.filter((row) => row.is_provisional === true).length,
      children_by_finish: countBy(children.rows, (row) => row.finish_key),
      parents_by_set: countBy(parents.rows, (row) => row.set_code),
      children_by_set: countBy(children.rows, (row) => row.set_code),
    },
  };
}

function validatePrerequisites({ gate, dryRun, artifact }) {
  const findings = [];
  if (gate.required_operator_decision?.exact_approval_phrase_required !== APPROVAL_TEXT) findings.push('real_apply_gate_approval_text_mismatch');
  if (gate.approval_gate_status !== 'ready_for_real_apply_operator_decision_apply_blocked_no_write') findings.push('real_apply_gate_not_ready');
  if (gate.package_scope?.package_id !== PACKAGE_ID) findings.push('real_apply_gate_wrong_package');
  if (gate.package_scope?.readiness_fingerprint_sha256 !== READINESS_FINGERPRINT) findings.push('real_apply_gate_readiness_fingerprint_mismatch');
  if (gate.package_scope?.artifact_fingerprint_sha256 !== ARTIFACT_FINGERPRINT) findings.push('real_apply_gate_artifact_fingerprint_mismatch');
  if ((gate.stop_findings ?? []).length !== 0) findings.push('real_apply_gate_stop_findings_present');
  if (gate.apply_allowed !== false || gate.write_ready_now !== 0) findings.push('real_apply_gate_unexpected_write_ready');
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.source_artifact?.source_readiness_fingerprint_sha256 !== READINESS_FINGERPRINT) findings.push('dry_run_readiness_fingerprint_mismatch');
  if (dryRun.source_artifact?.artifact_fingerprint_sha256 !== ARTIFACT_FINGERPRINT) findings.push('dry_run_artifact_fingerprint_mismatch');
  if (dryRun.dry_run_execution_status !== 'guarded_dry_run_transaction_completed_and_rolled_back') findings.push('dry_run_not_passed');
  if (dryRun.before_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH || dryRun.after_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_durable_state_not_proven_unchanged');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (artifact.package_id !== PACKAGE_ID) findings.push('artifact_wrong_package');
  if (artifact.source_readiness_fingerprint_sha256 !== READINESS_FINGERPRINT) findings.push('artifact_readiness_fingerprint_mismatch');
  if (artifact.artifact_fingerprint_sha256 !== ARTIFACT_FINGERPRINT) findings.push('artifact_fingerprint_mismatch');
  if ((artifact.stop_findings ?? []).length !== 0) findings.push('artifact_stop_findings_present');
  if ((artifact.planned_sets ?? []).length !== EXPECTED_COUNTS.sets) findings.push('artifact_set_count_not_4');
  if ((artifact.planned_parent_rows ?? []).length !== EXPECTED_COUNTS.parents) findings.push('artifact_parent_count_not_72');
  if ((artifact.planned_child_printing_rows ?? []).length !== EXPECTED_COUNTS.children) findings.push('artifact_child_count_not_80');
  if ((artifact.planned_external_mapping_rows ?? []).length !== EXPECTED_COUNTS.mappings) findings.push('artifact_mapping_count_not_72');
  validateExpectedCounts(
    countBy(artifact.planned_child_printing_rows ?? [], (row) => row.finish_key),
    EXPECTED_FINISH_COUNTS,
    'artifact_finish',
    findings,
  );
  validateExpectedCounts(
    countBy(artifact.planned_parent_rows ?? [], (row) => row.set_key),
    Object.fromEntries(Object.entries(EXPECTED_SET_COUNTS).map(([key, value]) => [key, value.parents])),
    'artifact_parent_set',
    findings,
  );
  validateExpectedCounts(
    countBy(artifact.planned_child_printing_rows ?? [], (row) => row.set_key),
    Object.fromEntries(Object.entries(EXPECTED_SET_COUNTS).map(([key, value]) => [key, value.children])),
    'artifact_child_set',
    findings,
  );
  return findings;
}

function validateBeforeSnapshot(snapshot) {
  const findings = [];
  if (snapshot.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('before_snapshot_hash_does_not_match_dry_run_proof');
  if (snapshot.counts.total_rows !== 0) findings.push('before_snapshot_not_empty_for_insert_only_scope');
  return findings;
}

function validateAfterSnapshot({ afterSnapshot, inserted }) {
  const findings = [];
  if (afterSnapshot.counts.set_rows !== EXPECTED_COUNTS.sets) findings.push('after_set_rows_not_4');
  if (afterSnapshot.counts.parent_rows !== EXPECTED_COUNTS.parents) findings.push('after_parent_rows_not_72');
  if (afterSnapshot.counts.child_printing_rows !== EXPECTED_COUNTS.children) findings.push('after_child_rows_not_80');
  if (afterSnapshot.counts.external_mapping_rows !== EXPECTED_COUNTS.mappings) findings.push('after_external_mapping_rows_not_72');
  if (inserted.counts.set_rows_found !== EXPECTED_COUNTS.sets) findings.push('inserted_sets_found_not_4');
  if (inserted.counts.parent_rows_found !== EXPECTED_COUNTS.parents) findings.push('inserted_parents_found_not_72');
  if (inserted.counts.child_rows_found !== EXPECTED_COUNTS.children) findings.push('inserted_children_found_not_80');
  if (inserted.counts.external_mapping_rows_found !== EXPECTED_COUNTS.mappings) findings.push('inserted_mappings_found_not_72');
  if (inserted.counts.provisional_child_rows !== 0) findings.push('inserted_provisional_child_rows_present');
  validateExpectedCounts(inserted.counts.children_by_finish, EXPECTED_FINISH_COUNTS, 'inserted_finish', findings);
  validateExpectedCounts(
    inserted.counts.parents_by_set,
    Object.fromEntries(Object.entries(EXPECTED_SET_COUNTS).map(([key, value]) => [key, value.parents])),
    'inserted_parent_set',
    findings,
  );
  validateExpectedCounts(
    inserted.counts.children_by_set,
    Object.fromEntries(Object.entries(EXPECTED_SET_COUNTS).map(([key, value]) => [key, value.children])),
    'inserted_child_set',
    findings,
  );
  return findings;
}

async function applyPackage(artifact) {
  const conn = connectionString();
  if (!conn) {
    return {
      connected: false,
      apply_status: 'blocked_no_database_connection_string',
      error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      committed: false,
    };
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  let beforeSnapshot = null;
  try {
    beforeSnapshot = await captureTargetSnapshot(client, artifact);
    const beforeFindings = validateBeforeSnapshot(beforeSnapshot);
    if (beforeFindings.length !== 0) {
      return {
        connected: true,
        apply_status: 'blocked_before_snapshot_findings_present',
        error_message: beforeFindings.join(', '),
        before_snapshot: beforeSnapshot,
        after_snapshot: beforeSnapshot,
        inserted_rows: null,
        committed: false,
      };
    }

    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg05a_sets (
         set_id uuid primary key,
         set_key text not null unique,
         set_name text not null,
         tcgdex_set_id text not null,
         source_json jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `create temporary table pkg05a_card_prints (
         card_print_id uuid primary key,
         set_id uuid not null,
         set_code text not null,
         card_number text not null,
         card_name text not null,
         rarity text null,
         variant_key text not null,
         external_ids jsonb not null,
         ai_metadata jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `create temporary table pkg05a_card_printings (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         finish_key text not null,
         provenance_source text not null,
         provenance_ref text not null,
         created_by text not null
       ) on commit drop`,
    );
    await client.query(
      `create temporary table pkg05a_external_mappings (
         source text not null,
         external_id text not null,
         card_print_id uuid not null,
         meta jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg05a_sets
       select
         row.set_id::uuid,
         row.set_key,
         row.set_name,
         row.tcgdex_set_id,
         row.source_json
       from jsonb_to_recordset($1::jsonb) as row(
         set_id text,
         set_key text,
         set_name text,
         tcgdex_set_id text,
         source_json jsonb
       )`,
      [JSON.stringify(artifact.planned_sets)],
    );
    await client.query(
      `insert into pkg05a_card_prints
       select
         row.card_print_id::uuid,
         row.set_id::uuid,
         row.set_code,
         row.card_number,
         row.card_name,
         row.rarity,
         row.variant_key,
         row.external_ids,
         row.ai_metadata
       from jsonb_to_recordset($1::jsonb) as row(
         card_print_id text,
         set_id text,
         set_code text,
         card_number text,
         card_name text,
         rarity text,
         variant_key text,
         external_ids jsonb,
         ai_metadata jsonb
       )`,
      [JSON.stringify(artifact.planned_parent_rows)],
    );
    await client.query(
      `insert into pkg05a_card_printings
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
      [JSON.stringify(artifact.planned_child_printing_rows)],
    );
    await client.query(
      `insert into pkg05a_external_mappings
       select
         row.source,
         row.external_id,
         row.card_print_id::uuid,
         row.meta
       from jsonb_to_recordset($1::jsonb) as row(
         source text,
         external_id text,
         card_print_id text,
         meta jsonb
       )`,
      [JSON.stringify(artifact.planned_external_mapping_rows)],
    );

    const shape = await client.query(
      `select
         (select count(*)::int from pkg05a_sets) as sets,
         (select count(*)::int from pkg05a_card_prints) as parents,
         (select count(*)::int from pkg05a_card_printings) as children,
         (select count(*)::int from pkg05a_external_mappings) as mappings,
         (select count(*)::int from pkg05a_card_printings child left join pkg05a_card_prints parent on parent.card_print_id = child.card_print_id where parent.card_print_id is null) as child_without_parent,
         (select count(*)::int from pkg05a_external_mappings mapping left join pkg05a_card_prints parent on parent.card_print_id = mapping.card_print_id where parent.card_print_id is null) as mapping_without_parent`,
    );
    const shapeRow = shape.rows[0];
    if (
      shapeRow.sets !== EXPECTED_COUNTS.sets ||
      shapeRow.parents !== EXPECTED_COUNTS.parents ||
      shapeRow.children !== EXPECTED_COUNTS.children ||
      shapeRow.mappings !== EXPECTED_COUNTS.mappings ||
      shapeRow.child_without_parent !== 0 ||
      shapeRow.mapping_without_parent !== 0
    ) {
      throw new Error(`target shape mismatch: ${JSON.stringify(shapeRow)}`);
    }

    const collisionGuard = await client.query(
      `select
         (select count(*)::int
          from pkg05a_sets target
          join public.sets s
            on s.game = 'pokemon'
           and (lower(coalesce(s.code, '')) = lower(target.set_key)
                or lower(coalesce(s.name, '')) = lower(target.set_name)
                or s.source->'tcgdex'->>'id' = target.tcgdex_set_id)) as set_collisions,
         (select count(*)::int
          from pkg05a_card_prints target
          join public.card_prints cp
            on cp.id = target.card_print_id
            or (
              lower(coalesce(cp.set_code, '')) = lower(target.set_code)
              and coalesce(cp.number_plain, cp.number) = regexp_replace(target.card_number, '[^0-9]', '', 'g')
              and lower(coalesce(cp.name, '')) = lower(target.card_name)
            )) as parent_collisions,
         (select count(*)::int
          from pkg05a_card_printings target
          join public.card_printings cpr
            on cpr.id = target.card_printing_id
            or (cpr.card_print_id = target.card_print_id and cpr.finish_key = target.finish_key)) as child_collisions,
         (select count(*)::int
          from pkg05a_external_mappings target
          join public.external_mappings em
            on em.source = target.source
           and em.external_id = target.external_id) as mapping_collisions`,
    );
    const collisionRow = collisionGuard.rows[0];
    if (
      collisionRow.set_collisions !== 0 ||
      collisionRow.parent_collisions !== 0 ||
      collisionRow.child_collisions !== 0 ||
      collisionRow.mapping_collisions !== 0
    ) {
      throw new Error(`collision guard failed: ${JSON.stringify(collisionRow)}`);
    }

    const finishGuard = await client.query(
      `select count(*)::int as unsupported_finish_count
       from pkg05a_card_printings target
       left join public.finish_keys fk
         on fk.key = target.finish_key
        and fk.is_active = true
       where fk.key is null`,
    );
    if (finishGuard.rows[0].unsupported_finish_count !== 0) {
      throw new Error(`unsupported finish count: ${finishGuard.rows[0].unsupported_finish_count}`);
    }

    const setInsert = await client.query(
      `insert into public.sets (id, game, code, name, source)
       select set_id, 'pokemon', set_key, set_name, source_json
       from pkg05a_sets`,
    );
    const parentInsert = await client.query(
      `insert into public.card_prints (
         id,
         set_id,
         set_code,
         number,
         name,
         rarity,
         variant_key,
         external_ids,
         ai_metadata
       )
       select
         card_print_id,
         set_id,
         set_code,
         card_number,
         card_name,
         rarity,
         variant_key,
         external_ids,
         ai_metadata
       from pkg05a_card_prints`,
    );
    const mappingInsert = await client.query(
      `insert into public.external_mappings (source, external_id, card_print_id, meta)
       select source, external_id, card_print_id, meta
       from pkg05a_external_mappings`,
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
       from pkg05a_card_printings`,
    );
    if (
      setInsert.rowCount !== EXPECTED_COUNTS.sets ||
      parentInsert.rowCount !== EXPECTED_COUNTS.parents ||
      childInsert.rowCount !== EXPECTED_COUNTS.children ||
      mappingInsert.rowCount !== EXPECTED_COUNTS.mappings
    ) {
      throw new Error(`insert count mismatch: ${JSON.stringify({
        sets: setInsert.rowCount,
        parents: parentInsert.rowCount,
        children: childInsert.rowCount,
        mappings: mappingInsert.rowCount,
      })}`);
    }

    await client.query('commit');
    const afterSnapshot = await captureTargetSnapshot(client, artifact);
    const insertedRows = await captureInsertedRows(client, artifact);
    return {
      connected: true,
      apply_status: 'pkg05a_missing_master_verified_set_inserts_real_apply_committed',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      inserted_rows: insertedRows,
      committed: true,
      insert_counts: {
        sets: setInsert.rowCount,
        parents: parentInsert.rowCount,
        children: childInsert.rowCount,
        mappings: mappingInsert.rowCount,
      },
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = beforeSnapshot ? await captureTargetSnapshot(client, artifact).catch(() => null) : null;
    return {
      connected: true,
      apply_status: 'pkg05a_missing_master_verified_set_inserts_real_apply_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      inserted_rows: null,
      committed: false,
      insert_counts: {
        sets: 0,
        parents: 0,
        children: 0,
        mappings: 0,
      },
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function rollbackSqlPreview(artifact) {
  const childIds = (artifact.planned_child_printing_rows ?? []).map((row) => row.card_printing_id);
  const mappingExternalIds = (artifact.planned_external_mapping_rows ?? []).map((row) => row.external_id);
  const parentIds = (artifact.planned_parent_rows ?? []).map((row) => row.card_print_id);
  const setIds = (artifact.planned_sets ?? []).map((row) => row.set_id);
  return [
    `delete from public.card_printings where id = any(array[${childIds.map((id) => `'${id}'::uuid`).join(', ')}]);`,
    `delete from public.external_mappings where source = 'tcgdex' and external_id = any(array[${mappingExternalIds.map((id) => `'${String(id).replaceAll("'", "''")}'`).join(', ')}]);`,
    `delete from public.card_prints where id = any(array[${parentIds.map((id) => `'${id}'::uuid`).join(', ')}]);`,
    `delete from public.sets where id = any(array[${setIds.map((id) => `'${id}'::uuid`).join(', ')}]);`,
  ].join('\n');
}

function renderMarkdown(report) {
  return `# PKG-05A Missing Master-Verified Set Inserts Real Apply V1

This report records the approved real apply for PKG-05A insert-only missing fully master-verified sets.

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_id | ${report.package_scope.package_id} |
| readiness_fingerprint_sha256 | \`${report.package_scope.readiness_fingerprint_sha256}\` |
| artifact_fingerprint_sha256 | \`${report.package_scope.artifact_fingerprint_sha256}\` |
| set_inserts | ${report.insert_counts.sets} |
| parent_inserts | ${report.insert_counts.parents} |
| child_printing_inserts | ${report.insert_counts.children} |
| external_mapping_inserts | ${report.insert_counts.mappings} |
| db_write_committed | ${report.db_write_committed} |
| migrations_created | ${report.migrations_created} |
| cleanup_performed | ${report.cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| deletes_performed | ${report.deletes_performed} |
| merges_performed | ${report.merges_performed} |
| unsupported_cleanup_performed | ${report.unsupported_cleanup_performed} |
| stop_findings | ${report.stop_findings.length} |

## Verification

- inserted_sets_found: ${report.verification_summary.inserted_sets_found}
- inserted_parents_found: ${report.verification_summary.inserted_parents_found}
- inserted_children_found: ${report.verification_summary.inserted_children_found}
- inserted_external_mappings_found: ${report.verification_summary.inserted_external_mappings_found}
- children_by_finish: ${JSON.stringify(report.verification_summary.children_by_finish)}
- children_by_set: ${JSON.stringify(report.verification_summary.children_by_set)}

## Rollback Preview

\`\`\`sql
${report.rollback_proof.rollback_sql_preview}
\`\`\`

The JSON report contains all inserted IDs for exact rollback targeting.
`;
}

function renderCheckpoint(report) {
  return `# PKG-05A Missing Master-Verified Set Inserts Real Apply Checkpoint V1

Date: 2026-06-10

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_id | ${report.package_scope.package_id} |
| readiness_fingerprint_sha256 | \`${report.package_scope.readiness_fingerprint_sha256}\` |
| artifact_fingerprint_sha256 | \`${report.package_scope.artifact_fingerprint_sha256}\` |
| set_inserts | ${report.insert_counts.sets} |
| parent_inserts | ${report.insert_counts.parents} |
| child_printing_inserts | ${report.insert_counts.children} |
| external_mapping_inserts | ${report.insert_counts.mappings} |
| db_write_committed | ${report.db_write_committed} |
| migrations_created | ${report.migrations_created} |
| cleanup_performed | ${report.cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| deletes_performed | ${report.deletes_performed} |
| merges_performed | ${report.merges_performed} |
| unsupported_cleanup_performed | ${report.unsupported_cleanup_performed} |
| stop_findings | ${report.stop_findings.length} |

Real apply was scoped to four missing fully master-verified set inserts: 2023sv, 2024sv, mee, and mfb. No global apply, migrations, deletes, merges, unsupported cleanup, or quarantine were performed.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-05A Missing Master-Verified Set Inserts Real Apply Checkpoint V1](20260610_pkg05a_real_apply_checkpoint_v1.md) | Records approved insert-only apply for four missing fully master-verified sets: 4 set rows, 72 parent rows, 80 child printings, and 72 external mappings. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg05a_real_apply_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg05a_real_apply_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const gate = readJson(GATE_JSON);
const dryRun = readJson(DRY_RUN_JSON);
const artifact = readJson(ARTIFACT_JSON);
const prerequisiteFindings = validatePrerequisites({ gate, dryRun, artifact });
const applyResult = prerequisiteFindings.length === 0
  ? await applyPackage(artifact)
  : {
      connected: false,
      apply_status: 'blocked_prerequisite_findings_present',
      error_message: prerequisiteFindings.join(', '),
      committed: false,
      insert_counts: { sets: 0, parents: 0, children: 0, mappings: 0 },
    };
const afterFindings = applyResult.committed
  ? validateAfterSnapshot({
      afterSnapshot: applyResult.after_snapshot,
      inserted: applyResult.inserted_rows,
    })
  : ['apply_not_committed'];
const stopFindings = [
  ...prerequisiteFindings,
  ...(applyResult.error_message ? [`apply_error: ${applyResult.error_message}`] : []),
  ...afterFindings,
];
const pass = stopFindings.length === 0;

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg05a_real_apply_v1',
  audit_only: false,
  apply_only: true,
  package_scope: {
    package_id: PACKAGE_ID,
    readiness_fingerprint_sha256: READINESS_FINGERPRINT,
    artifact_fingerprint_sha256: ARTIFACT_FINGERPRINT,
    selected_sets: (artifact.planned_sets ?? []).map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      expected_parent_rows: row.expected_parent_rows,
      expected_child_printings: row.expected_child_printings,
    })),
    planned_set_inserts: EXPECTED_COUNTS.sets,
    planned_parent_card_print_inserts: EXPECTED_COUNTS.parents,
    planned_child_card_printing_inserts: EXPECTED_COUNTS.children,
    planned_external_mapping_inserts: EXPECTED_COUNTS.mappings,
  },
  approval: {
    exact_approval_text: APPROVAL_TEXT,
    approved_real_apply_only: true,
    no_global_apply: true,
    no_migrations: true,
    no_deletes: true,
    no_merges: true,
    no_unsupported_cleanup: true,
  },
  apply_status: applyResult.apply_status,
  error_message: applyResult.error_message,
  db_write_committed: applyResult.committed === true,
  db_writes_performed: applyResult.committed === true,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  deletes_performed: false,
  merges_performed: false,
  unsupported_cleanup_performed: false,
  insert_counts: applyResult.insert_counts,
  before_snapshot: applyResult.before_snapshot,
  after_snapshot: applyResult.after_snapshot,
  inserted_rows: applyResult.inserted_rows,
  verification_summary: {
    inserted_sets_found: applyResult.inserted_rows?.counts?.set_rows_found ?? 0,
    inserted_parents_found: applyResult.inserted_rows?.counts?.parent_rows_found ?? 0,
    inserted_children_found: applyResult.inserted_rows?.counts?.child_rows_found ?? 0,
    inserted_external_mappings_found: applyResult.inserted_rows?.counts?.external_mapping_rows_found ?? 0,
    children_by_finish: applyResult.inserted_rows?.counts?.children_by_finish ?? {},
    parents_by_set: applyResult.inserted_rows?.counts?.parents_by_set ?? {},
    children_by_set: applyResult.inserted_rows?.counts?.children_by_set ?? {},
  },
  rollback_proof: {
    rollback_sql_preview: rollbackSqlPreview(artifact),
    inserted_set_ids: (artifact.planned_sets ?? []).map((row) => row.set_id),
    inserted_parent_ids: (artifact.planned_parent_rows ?? []).map((row) => row.card_print_id),
    inserted_child_printing_ids: (artifact.planned_child_printing_rows ?? []).map((row) => row.card_printing_id),
    inserted_external_ids: (artifact.planned_external_mapping_rows ?? []).map((row) => row.external_id),
  },
  stop_findings: stopFindings,
  pass,
};

writeJson(OUTPUT_JSON, report);
writeText(OUTPUT_MD, renderMarkdown(report));
writeText(CHECKPOINT_MD, renderCheckpoint(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  checkpoint_md: CHECKPOINT_MD,
  apply_status: report.apply_status,
  set_inserts: report.insert_counts.sets,
  parent_inserts: report.insert_counts.parents,
  child_printing_inserts: report.insert_counts.children,
  external_mapping_inserts: report.insert_counts.mappings,
  db_write_committed: report.db_write_committed,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
  deletes_performed: report.deletes_performed,
  merges_performed: report.merges_performed,
  unsupported_cleanup_performed: report.unsupported_cleanup_performed,
  stop_findings: report.stop_findings,
}, null, 2));

if (!pass) process.exitCode = 1;
