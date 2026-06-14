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

const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08g_true_parent_child_insert_real_apply_gate_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08g_true_parent_child_insert_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08g_true_parent_child_insert_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08g_true_parent_child_insert_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08g_true_parent_child_insert_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08G-TRUE-PARENT-CHILD-INSERTS';
const PACKAGE_FINGERPRINT = 'a6112f2e2bf911c3f1899bf496f20a5211e2bcc288813311c2200847aa4ce305';
const DRY_RUN_PROOF_HASH = 'efe0cc82cab977ff39607996df26b09b760a1f49d0de6efe35fa1d82a60baeb1';
const APPROVAL_TEXT = 'Approve real PKG-08G-TRUE-PARENT-CHILD-INSERTS apply only. Fingerprint: a6112f2e2bf911c3f1899bf496f20a5211e2bcc288813311c2200847aa4ce305. Scope: 9 parent card_print inserts, 9 child card_printing inserts, 9 TCGdex external mappings across 2 sets; finishes holo=1, normal=8. Dry-run proof: efe0cc82cab977ff39607996df26b09b760a1f49d0de6efe35fa1d82a60baeb1 == efe0cc82cab977ff39607996df26b09b760a1f49d0de6efe35fa1d82a60baeb1. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.';

const EXPECTED_PARENT_ROWS = 9;
const EXPECTED_CHILD_ROWS = 9;
const EXPECTED_MAPPING_ROWS = 9;
const EXPECTED_SET_COUNTS = { sve: 8, swshp: 1 };
const EXPECTED_FINISH_COUNTS = { holo: 1, normal: 8 };

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

function targetScope(dryRun) {
  return {
    parentRows: dryRun.scope?.parent_rows ?? [],
    childRows: dryRun.scope?.child_rows ?? [],
    mappingRows: dryRun.scope?.external_mapping_rows ?? [],
  };
}

async function captureTargetSnapshot(client, scope) {
  const result = await client.query(
    `with parent_target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         live_set_code text,
         card_number text,
         card_name text,
         external_id text
       )
     ),
     child_target as (
       select *
       from jsonb_to_recordset($2::jsonb) as t(
         card_printing_id uuid,
         card_print_id uuid,
         finish_key text
       )
     )
     select
       'target_parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       null::text as finish_key,
       null::text as external_id
     from parent_target target
     join public.card_prints cp
       on cp.id = target.card_print_id
       or (
         lower(coalesce(cp.set_code, '')) = lower(target.live_set_code)
         and (
           lower(coalesce(cp.number, '')) = lower(target.card_number)
           or lower(coalesce(cp.number_plain, '')) = lower(target.card_number)
         )
         and lower(coalesce(cp.name, '')) = lower(target.card_name)
       )
     union all
     select
       'target_child' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       cpr.finish_key,
       null::text as external_id
     from child_target target
     join public.card_printings cpr
       on cpr.id = target.card_printing_id
       or (
         cpr.card_print_id = target.card_print_id
         and cpr.finish_key = target.finish_key
       )
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'target_mapping' as row_type,
       em.id::text as row_id,
       null::text as set_code,
       null::text as card_number,
       null::text as card_name,
       null::text as finish_key,
       em.external_id
     from parent_target target
     join public.external_mappings em
       on em.source = 'tcgdex'
      and em.external_id = target.external_id
     order by row_type, set_code nulls last, card_number nulls last, card_name nulls last, finish_key nulls last, external_id nulls last, row_id`,
    [JSON.stringify(scope.parentRows), JSON.stringify(scope.childRows)],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      target_parent_rows: rows.filter((row) => row.row_type === 'target_parent').length,
      target_child_rows: rows.filter((row) => row.row_type === 'target_child').length,
      target_mapping_rows: rows.filter((row) => row.row_type === 'target_mapping').length,
      total_rows: rows.length,
    },
  };
}

async function captureInsertedRows(client, scope) {
  const parentResult = await client.query(
    `select
       cp.id::text as card_print_id,
       cp.set_id::text,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.rarity,
       cp.variant_key,
       cp.external_ids,
       cp.ai_metadata
     from public.card_prints cp
     where cp.id = any($1::uuid[])
     order by cp.set_code, card_number, cp.name, cp.id`,
    [scope.parentRows.map((row) => row.card_print_id)],
  );
  const childResult = await client.query(
    `select
       cpr.id::text as card_printing_id,
       cpr.card_print_id::text,
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
    [scope.childRows.map((row) => row.card_printing_id)],
  );
  const mappingResult = await client.query(
    `select
       em.id::text as external_mapping_id,
       em.source,
       em.external_id,
       em.card_print_id::text,
       em.meta
     from public.external_mappings em
     where em.source = 'tcgdex'
       and em.external_id = any($1::text[])
     order by em.external_id, em.id`,
    [scope.mappingRows.map((row) => row.external_id)],
  );
  return {
    captured_at: new Date().toISOString(),
    parent_rows: parentResult.rows,
    child_rows: childResult.rows,
    mapping_rows: mappingResult.rows,
    hash_sha256: sha256(stableJson({
      parent_rows: parentResult.rows,
      child_rows: childResult.rows,
      mapping_rows: mappingResult.rows,
    })),
    counts: {
      parent_rows_found: parentResult.rows.length,
      child_rows_found: childResult.rows.length,
      mapping_rows_found: mappingResult.rows.length,
      provisional_child_rows: childResult.rows.filter((row) => row.is_provisional === true).length,
      by_set: countBy(childResult.rows, (row) => row.set_code),
      by_finish: countBy(childResult.rows, (row) => row.finish_key),
    },
  };
}

function validateExpectedCounts(actual, expected, label, findings) {
  for (const [key, count] of Object.entries(expected)) {
    if (actual[key] !== count) findings.push(`${label}_${key}_count_not_${count}`);
  }
  for (const key of Object.keys(actual)) {
    if (expected[key] === undefined) findings.push(`${label}_${key}_unexpected`);
  }
}

function validatePrerequisites({ gate, dryRun, scope }) {
  const findings = [];
  if (gate.required_operator_decision?.exact_approval_phrase_required !== APPROVAL_TEXT) findings.push('real_apply_gate_approval_text_mismatch');
  if (gate.approval_gate_status !== 'ready_for_real_apply_operator_decision_apply_blocked_no_write') findings.push('real_apply_gate_not_ready');
  if (gate.package_scope?.package_id !== PACKAGE_ID) findings.push('real_apply_gate_wrong_package');
  if (gate.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('real_apply_gate_fingerprint_mismatch');
  if ((gate.stop_findings ?? []).length !== 0) findings.push('real_apply_gate_stop_findings_present');
  if (gate.apply_allowed !== false || gate.write_ready_now !== 0) findings.push('real_apply_gate_unexpected_write_ready');
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.dry_run_status !== 'pkg08g_true_parent_child_insert_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (dryRun.before_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH || dryRun.after_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_durable_state_not_proven_unchanged');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (scope.parentRows.length !== EXPECTED_PARENT_ROWS) findings.push(`target_parent_count_not_${EXPECTED_PARENT_ROWS}`);
  if (scope.childRows.length !== EXPECTED_CHILD_ROWS) findings.push(`target_child_count_not_${EXPECTED_CHILD_ROWS}`);
  if (scope.mappingRows.length !== EXPECTED_MAPPING_ROWS) findings.push(`target_mapping_count_not_${EXPECTED_MAPPING_ROWS}`);
  validateExpectedCounts(countBy(scope.childRows, (row) => row.set_key), EXPECTED_SET_COUNTS, 'target_set', findings);
  validateExpectedCounts(countBy(scope.childRows, (row) => row.finish_key), EXPECTED_FINISH_COUNTS, 'target_finish', findings);
  return findings;
}

function validateBeforeSnapshot({ beforeSnapshot }) {
  const findings = [];
  if (beforeSnapshot.counts.target_parent_rows !== 0) findings.push('before_target_parent_rows_present');
  if (beforeSnapshot.counts.target_child_rows !== 0) findings.push('before_target_child_rows_present');
  if (beforeSnapshot.counts.target_mapping_rows !== 0) findings.push('before_target_mapping_rows_present');
  return findings;
}

function validateAfterApply({ afterSnapshot, insertedRows }) {
  const findings = [];
  if (afterSnapshot.counts.target_parent_rows !== EXPECTED_PARENT_ROWS) findings.push(`after_target_parent_count_not_${EXPECTED_PARENT_ROWS}`);
  if (afterSnapshot.counts.target_child_rows !== EXPECTED_CHILD_ROWS) findings.push(`after_target_child_count_not_${EXPECTED_CHILD_ROWS}`);
  if (afterSnapshot.counts.target_mapping_rows !== EXPECTED_MAPPING_ROWS) findings.push(`after_target_mapping_count_not_${EXPECTED_MAPPING_ROWS}`);
  if (insertedRows.counts.parent_rows_found !== EXPECTED_PARENT_ROWS) findings.push(`inserted_parent_rows_found_not_${EXPECTED_PARENT_ROWS}`);
  if (insertedRows.counts.child_rows_found !== EXPECTED_CHILD_ROWS) findings.push(`inserted_child_rows_found_not_${EXPECTED_CHILD_ROWS}`);
  if (insertedRows.counts.mapping_rows_found !== EXPECTED_MAPPING_ROWS) findings.push(`inserted_mapping_rows_found_not_${EXPECTED_MAPPING_ROWS}`);
  if (insertedRows.counts.provisional_child_rows !== 0) findings.push('inserted_provisional_child_rows_present');
  validateExpectedCounts(insertedRows.counts.by_set, EXPECTED_SET_COUNTS, 'inserted_set', findings);
  validateExpectedCounts(insertedRows.counts.by_finish, EXPECTED_FINISH_COUNTS, 'inserted_finish', findings);
  return findings;
}

async function applyPackage({ dryRun, scope }) {
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
  try {
    const beforeSnapshot = await captureTargetSnapshot(client, scope);
    const beforeFindings = validateBeforeSnapshot({ beforeSnapshot });
    if (beforeFindings.length !== 0) {
      return {
        connected: true,
        apply_status: 'blocked_before_snapshot_findings_present',
        error_message: beforeFindings.join(', '),
        before_snapshot: beforeSnapshot,
        after_snapshot: beforeSnapshot,
        inserted_rows: null,
        inserted_parent_count: 0,
        inserted_child_count: 0,
        inserted_mapping_count: 0,
        committed: false,
      };
    }

    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg08g_real_parent_targets (
         card_print_id uuid primary key,
         set_id uuid not null,
         live_set_code text not null,
         card_number text not null,
         card_name text not null,
         rarity text null,
         variant_key text not null,
         external_ids jsonb not null,
         ai_metadata jsonb not null,
         external_id text not null
       ) on commit drop`,
    );
    await client.query(
      `create temporary table pkg08g_real_child_targets (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         finish_key text not null,
         provenance_source text not null,
         provenance_ref text not null,
         created_by text not null
       ) on commit drop`,
    );
    await client.query(
      `create temporary table pkg08g_real_mapping_targets (
         source text not null,
         external_id text not null,
         card_print_id uuid not null,
         meta jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg08g_real_parent_targets
       select
         row.card_print_id::uuid,
         row.set_id::uuid,
         row.live_set_code,
         row.card_number,
         row.card_name,
         row.rarity,
         row.variant_key,
         row.external_ids,
         row.ai_metadata,
         row.external_id
       from jsonb_to_recordset($1::jsonb) as row(
         card_print_id text,
         set_id text,
         live_set_code text,
         card_number text,
         card_name text,
         rarity text,
         variant_key text,
         external_ids jsonb,
         ai_metadata jsonb,
         external_id text
       )`,
      [JSON.stringify(scope.parentRows)],
    );
    await client.query(
      `insert into pkg08g_real_child_targets
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
      [JSON.stringify(scope.childRows)],
    );
    await client.query(
      `insert into pkg08g_real_mapping_targets
       select row.source, row.external_id, row.card_print_id::uuid, row.meta
       from jsonb_to_recordset($1::jsonb) as row(
         source text,
         external_id text,
         card_print_id text,
         meta jsonb
       )`,
      [JSON.stringify(scope.mappingRows)],
    );
    const shape = await client.query(
      `select
         (select count(*)::int from pkg08g_real_parent_targets) as parent_rows,
         (select count(*)::int from pkg08g_real_child_targets) as child_rows,
         (select count(*)::int from pkg08g_real_mapping_targets) as mapping_rows,
         (select count(*)::int from pkg08g_real_child_targets child left join pkg08g_real_parent_targets parent on parent.card_print_id = child.card_print_id where parent.card_print_id is null) as child_without_parent,
         (select count(*)::int from pkg08g_real_child_targets child left join public.finish_keys fk on fk.key = child.finish_key and fk.is_active = true where fk.key is null) as inactive_finish_rows`,
    );
    const shapeRow = shape.rows[0];
    if (
      shapeRow.parent_rows !== EXPECTED_PARENT_ROWS ||
      shapeRow.child_rows !== EXPECTED_CHILD_ROWS ||
      shapeRow.mapping_rows !== EXPECTED_MAPPING_ROWS ||
      shapeRow.child_without_parent !== 0 ||
      shapeRow.inactive_finish_rows !== 0
    ) {
      throw new Error(`target shape mismatch: ${JSON.stringify(shapeRow)}`);
    }
    const collisions = await client.query(
      `select
         (select count(*)::int
          from pkg08g_real_parent_targets target
          join public.card_prints cp
            on cp.id = target.card_print_id
            or (
              lower(coalesce(cp.set_code, '')) = lower(target.live_set_code)
              and (
                lower(coalesce(cp.number, '')) = lower(target.card_number)
                or lower(coalesce(cp.number_plain, '')) = lower(target.card_number)
              )
              and lower(coalesce(cp.name, '')) = lower(target.card_name)
            )) as parent_collisions,
         (select count(*)::int
          from pkg08g_real_child_targets target
          join public.card_printings cpr
            on cpr.id = target.card_printing_id
            or (
              cpr.card_print_id = target.card_print_id
              and cpr.finish_key = target.finish_key
            )) as child_collisions,
         (select count(*)::int
          from pkg08g_real_mapping_targets target
          join public.external_mappings em
            on em.source = target.source
           and em.external_id = target.external_id) as mapping_collisions`,
    );
    const collisionRow = collisions.rows[0];
    if (collisionRow.parent_collisions !== 0 || collisionRow.child_collisions !== 0 || collisionRow.mapping_collisions !== 0) {
      throw new Error(`collision guard failed: ${JSON.stringify(collisionRow)}`);
    }

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
         live_set_code,
         card_number,
         card_name,
         rarity,
         variant_key,
         external_ids,
         ai_metadata
       from pkg08g_real_parent_targets`,
    );
    const mappingInsert = await client.query(
      `insert into public.external_mappings (source, external_id, card_print_id, meta)
       select source, external_id, card_print_id, meta
       from pkg08g_real_mapping_targets`,
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
       from pkg08g_real_child_targets`,
    );
    if (parentInsert.rowCount !== EXPECTED_PARENT_ROWS || childInsert.rowCount !== EXPECTED_CHILD_ROWS || mappingInsert.rowCount !== EXPECTED_MAPPING_ROWS) {
      throw new Error(`insert count mismatch: ${JSON.stringify({
        parents: parentInsert.rowCount,
        children: childInsert.rowCount,
        mappings: mappingInsert.rowCount,
      })}`);
    }
    await client.query('commit');

    const afterSnapshot = await captureTargetSnapshot(client, scope);
    const insertedRows = await captureInsertedRows(client, scope);
    const afterFindings = validateAfterApply({ afterSnapshot, insertedRows });
    return {
      connected: true,
      apply_status: afterFindings.length === 0
        ? 'pkg08g_true_parent_child_insert_real_apply_committed_and_verified'
        : 'pkg08g_true_parent_child_insert_committed_with_post_apply_findings',
      error_message: afterFindings.join(', ') || null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      inserted_rows: insertedRows,
      inserted_parent_count: parentInsert.rowCount,
      inserted_child_count: childInsert.rowCount,
      inserted_mapping_count: mappingInsert.rowCount,
      committed: true,
      post_apply_findings: afterFindings,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureTargetSnapshot(client, scope).catch(() => null);
    return {
      connected: true,
      apply_status: 'pkg08g_true_parent_child_insert_real_apply_failed_rolled_back',
      error_message: error.message,
      before_snapshot: null,
      after_snapshot: afterSnapshot,
      inserted_rows: null,
      inserted_parent_count: 0,
      inserted_child_count: 0,
      inserted_mapping_count: 0,
      committed: false,
      post_apply_findings: [],
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function renderMarkdown(report) {
  return `# PKG-08G True Parent+Child Insert Real Apply V1

Real apply for the approved PKG-08G package only.

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_fingerprint_sha256 | \`${report.package_fingerprint_sha256}\` |
| inserted_parent_count | ${report.inserted_parent_count} |
| inserted_child_count | ${report.inserted_child_count} |
| inserted_mapping_count | ${report.inserted_mapping_count} |
| committed | ${report.committed} |
| migrations_created | ${report.migrations_created} |
| cleanup_performed | ${report.cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| stop_findings | ${report.stop_findings.length} |

## Scope

- sets: ${Object.entries(report.scope.by_set).map(([set, count]) => `${set}=${count}`).join(', ')}
- finishes: ${Object.entries(report.scope.by_finish).map(([finish, count]) => `${finish}=${count}`).join(', ')}
- no global apply
- no migrations
- no deletes
- no merges
- no unsupported cleanup
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08G True Parent+Child Insert Real Apply Checkpoint V1](20260610_pkg08g_true_parent_child_insert_real_apply_checkpoint_v1.md) | Real apply for 9 true parent+child inserts and 9 TCGdex mappings. No migrations, deletes, merges, or unsupported cleanup. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08g_true_parent_child_insert_real_apply_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08g_true_parent_child_insert_real_apply_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const gate = readJson(GATE_JSON);
const dryRun = readJson(DRY_RUN_JSON);
const scope = targetScope(dryRun);
const prerequisiteFindings = validatePrerequisites({ gate, dryRun, scope });
const execution = prerequisiteFindings.length === 0
  ? await applyPackage({ dryRun, scope })
  : {
    connected: false,
    apply_status: 'blocked_prerequisite_findings_present',
    error_message: prerequisiteFindings.join(', '),
    before_snapshot: null,
    after_snapshot: null,
    inserted_rows: null,
    inserted_parent_count: 0,
    inserted_child_count: 0,
    inserted_mapping_count: 0,
    committed: false,
    post_apply_findings: [],
  };

const stopFindings = [
  ...prerequisiteFindings,
  ...(execution.post_apply_findings ?? []),
];
if (execution.apply_status !== 'pkg08g_true_parent_child_insert_real_apply_committed_and_verified') {
  stopFindings.push(`apply_status:${execution.apply_status}`);
}

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08g_true_parent_child_insert_real_apply_v1',
  package_id: PACKAGE_ID,
  package_fingerprint_sha256: PACKAGE_FINGERPRINT,
  approval_text: APPROVAL_TEXT,
  apply_status: execution.apply_status,
  committed: execution.committed,
  db_writes_performed: execution.committed,
  durable_db_writes_performed: execution.committed,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  global_apply_performed: false,
  deletes_performed: false,
  merges_performed: false,
  unsupported_cleanup_performed: false,
  inserted_parent_count: execution.inserted_parent_count,
  inserted_child_count: execution.inserted_child_count,
  inserted_mapping_count: execution.inserted_mapping_count,
  scope: {
    parent_rows: scope.parentRows.length,
    child_rows: scope.childRows.length,
    mapping_rows: scope.mappingRows.length,
    by_set: countBy(scope.childRows, (row) => row.set_key),
    by_finish: countBy(scope.childRows, (row) => row.finish_key),
  },
  prerequisite_findings: prerequisiteFindings,
  stop_findings: stopFindings,
  error_message: execution.error_message,
  before_snapshot: execution.before_snapshot,
  after_snapshot: execution.after_snapshot,
  inserted_rows: execution.inserted_rows,
  source_artifacts: {
    real_apply_gate: path.relative(ROOT, GATE_JSON).replaceAll('\\', '/'),
    guarded_dry_run_execution: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
  },
};

writeJson(OUTPUT_JSON, report);
writeText(OUTPUT_MD, renderMarkdown(report));
writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  checkpoint_md: CHECKPOINT_MD,
  apply_status: report.apply_status,
  committed: report.committed,
  inserted_parent_count: report.inserted_parent_count,
  inserted_child_count: report.inserted_child_count,
  inserted_mapping_count: report.inserted_mapping_count,
  stop_findings: report.stop_findings,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
}, null, 2));

if (report.stop_findings.length !== 0) process.exitCode = 1;
