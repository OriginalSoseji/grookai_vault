import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08m_suffix_parent_split_real_apply_gate_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08m_suffix_parent_split_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08m_suffix_parent_split_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08m_suffix_parent_split_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08m_suffix_parent_split_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08M-SUFFIX-PARENT-SPLIT';
const PACKAGE_FINGERPRINT = '1bf0d4aa087d3185935212bd1a244aecd3a0b3fce6bdc7bc851e9a0d82af3405';
const DRY_RUN_PROOF_HASH = '22d54b6da93a7bc3f8530e7f9983f14b14fcac12db3ee848be7cc845953b2e8a';
const APPROVAL_TEXT = 'Approve real PKG-08M-SUFFIX-PARENT-SPLIT apply only. Fingerprint: 1bf0d4aa087d3185935212bd1a244aecd3a0b3fce6bdc7bc851e9a0d82af3405. Scope: 3 suffix parent inserts, 3 suffix child card_printing inserts, 3 TCGdex mapping transfers across 3 sets; finish normal=3; existing base parents preserved; unsupported cleanup deferred. Dry-run proof: 22d54b6da93a7bc3f8530e7f9983f14b14fcac12db3ee848be7cc845953b2e8a == 22d54b6da93a7bc3f8530e7f9983f14b14fcac12db3ee848be7cc845953b2e8a. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.';
const CREATED_BY = 'pkg08m_suffix_parent_split_real_apply_v1';
const PROVENANCE_SOURCE = 'verified_master_set_index_v1';

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

function validateExpectedCounts(actual, expected, label, findings) {
  for (const [key, count] of Object.entries(expected)) {
    if (actual[key] !== count) findings.push(`${label}_${key}_count_not_${count}`);
  }
  for (const key of Object.keys(actual)) {
    if (expected[key] === undefined) findings.push(`${label}_${key}_unexpected`);
  }
}

function validatePrerequisites({ gate, dryRun, targets }) {
  const findings = [];
  if (gate.required_operator_decision?.exact_approval_phrase_required !== APPROVAL_TEXT) findings.push('real_apply_gate_approval_text_mismatch');
  if (gate.approval_gate_status !== 'ready_for_real_apply_operator_decision_apply_blocked_no_write') findings.push('real_apply_gate_not_ready');
  if (gate.package_scope?.package_id !== PACKAGE_ID) findings.push('real_apply_gate_wrong_package');
  if (gate.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('real_apply_gate_fingerprint_mismatch');
  if ((gate.stop_findings ?? []).length !== 0) findings.push('real_apply_gate_stop_findings_present');
  if (gate.apply_allowed !== false || gate.write_ready_now !== 0) findings.push('real_apply_gate_unexpected_write_ready');
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.dry_run_status !== 'pkg08m_suffix_parent_split_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (dryRun.before_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH || dryRun.after_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_durable_state_not_proven_unchanged');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.recommended_real_apply_approval_text !== APPROVAL_TEXT) findings.push('dry_run_approval_text_mismatch');
  if (targets.length !== 3) findings.push('target_count_not_3');
  if (targets.some((row) => row.finish_key !== 'normal')) findings.push('non_normal_target_present');
  if (targets.some((row) => !String(row.tcgdex_external_id ?? '').endsWith('a'))) findings.push('non_suffix_tcgdex_target_present');
  if (targets.some((row) => !row.external_mapping_id || !row.base_parent_id || !row.suffix_parent_id || !row.suffix_child_id)) findings.push('target_identity_or_mapping_missing');
  validateExpectedCounts(countBy(targets, (row) => row.set_key), { g1: 1, sm4: 1, xy7: 1 }, 'target_set', findings);
  validateExpectedCounts(countBy(targets, (row) => row.finish_key), { normal: 3 }, 'target_finish', findings);
  return findings;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         suffix_parent_id uuid,
         suffix_child_id uuid,
         base_parent_id uuid,
         set_id uuid,
         set_code text,
         suffix_number text,
         printed_identity_modifier text,
         card_name text,
         finish_key text,
         tcgdex_external_id text,
         external_mapping_id bigint
       )
     )
     select
       'base_parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name,
       null::text as finish_key,
       null::text as external_id,
       null::text as mapping_card_print_id
     from target t
     join public.card_prints cp on cp.id = t.base_parent_id
     union all
     select
       'suffix_parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name,
       null::text as finish_key,
       null::text as external_id,
       null::text as mapping_card_print_id
     from target t
     join public.card_prints cp
       on cp.id = t.suffix_parent_id
       or (
         cp.set_id = t.set_id
         and cp.number_plain = regexp_replace(t.suffix_number, '[^0-9]', '', 'g')
         and coalesce(cp.printed_identity_modifier, '') = t.printed_identity_modifier
         and coalesce(cp.variant_key, '') = ''
         and cp.set_identity_model = 'standard'
       )
     union all
     select
       'suffix_child' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name,
       cpr.finish_key,
       null::text as external_id,
       null::text as mapping_card_print_id
     from target t
     join public.card_printings cpr
       on cpr.id = t.suffix_child_id
       or (cpr.card_print_id = t.suffix_parent_id and cpr.finish_key = t.finish_key)
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'tcgdex_mapping' as row_type,
       em.id::text as row_id,
       null::text as set_code,
       null::text as number,
       null::text as number_plain,
       null::text as printed_identity_modifier,
       null::text as name,
       null::text as finish_key,
       em.external_id,
       em.card_print_id::text as mapping_card_print_id
     from target t
     join public.external_mappings em on em.source = 'tcgdex' and em.external_id = t.tcgdex_external_id
     order by row_type, set_code nulls last, number nulls last, name nulls last, finish_key nulls last, external_id nulls last, row_id`,
    [JSON.stringify(targets)],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      base_parent_rows: rows.filter((row) => row.row_type === 'base_parent').length,
      suffix_parent_rows: rows.filter((row) => row.row_type === 'suffix_parent').length,
      suffix_child_rows: rows.filter((row) => row.row_type === 'suffix_child').length,
      tcgdex_mapping_rows: rows.filter((row) => row.row_type === 'tcgdex_mapping').length,
      total_rows: rows.length,
    },
  };
}

async function captureInsertedRows(client, targets) {
  const parentIds = targets.map((row) => row.suffix_parent_id);
  const childIds = targets.map((row) => row.suffix_child_id);
  const externalIds = targets.map((row) => row.tcgdex_external_id);
  const parentResult = await client.query(
    `select
       cp.id::text as card_print_id,
       cp.set_id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name,
       cp.variant_key,
       cp.external_ids,
       cp.ai_metadata
     from public.card_prints cp
     where cp.id = any($1::uuid[])
     order by cp.set_code, cp.number, cp.name, cp.id`,
    [parentIds],
  );
  const childResult = await client.query(
    `select
       cpr.id::text as card_printing_id,
       cpr.card_print_id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name as card_name,
       cpr.finish_key,
       cpr.is_provisional,
       cpr.provenance_source,
       cpr.provenance_ref,
       cpr.created_by
     from public.card_printings cpr
     join public.card_prints cp on cp.id = cpr.card_print_id
     where cpr.id = any($1::uuid[])
     order by cp.set_code, cp.number, cp.name, cpr.finish_key, cpr.id`,
    [childIds],
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
    [externalIds],
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
      by_set: countBy(childResult.rows, (row) => row.set_code),
      by_finish: countBy(childResult.rows, (row) => row.finish_key),
      suffix_mapping_rows: mappingResult.rows.filter((row) => String(row.external_id).endsWith('a')).length,
    },
  };
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  const beforeFindings = [];
  if (beforeSnapshot.counts.base_parent_rows !== 3) beforeFindings.push('before_base_parent_rows_not_3');
  if (beforeSnapshot.counts.suffix_parent_rows !== 0) beforeFindings.push('before_suffix_parent_rows_present');
  if (beforeSnapshot.counts.suffix_child_rows !== 0) beforeFindings.push('before_suffix_child_rows_present');
  if (beforeSnapshot.counts.tcgdex_mapping_rows !== 3) beforeFindings.push('before_tcgdex_mapping_rows_not_3');
  const beforeMappings = beforeSnapshot.rows.filter((row) => row.row_type === 'tcgdex_mapping');
  const baseParentIds = new Set(targets.map((row) => row.base_parent_id));
  if (beforeMappings.some((row) => !baseParentIds.has(row.mapping_card_print_id))) beforeFindings.push('before_mapping_not_on_base_parent');
  if (beforeFindings.length !== 0) {
    return {
      apply_status: 'blocked_before_snapshot_findings_present',
      error_message: beforeFindings.join(', '),
      before_snapshot: beforeSnapshot,
      after_snapshot: beforeSnapshot,
      inserted_rows: null,
      committed: false,
      write_counts: {},
    };
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg08m_targets (
         suffix_parent_id uuid primary key,
         suffix_child_id uuid not null,
         base_parent_id uuid not null,
         set_id uuid not null,
         set_code text not null,
         card_name text not null,
         suffix_number text not null,
         printed_identity_modifier text not null,
         finish_key text not null,
         tcgdex_external_id text not null,
         external_mapping_id bigint not null,
         external_ids jsonb not null,
         ai_metadata jsonb not null,
         provenance_ref text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg08m_targets
       select
         row.suffix_parent_id::uuid,
         row.suffix_child_id::uuid,
         row.base_parent_id::uuid,
         row.set_id::uuid,
         row.set_code,
         row.card_name,
         row.suffix_number,
         row.printed_identity_modifier,
         row.finish_key,
         row.tcgdex_external_id,
         row.external_mapping_id::bigint,
         row.external_ids,
         row.ai_metadata,
         row.provenance_ref
       from jsonb_to_recordset($1::jsonb) as row(
         suffix_parent_id text,
         suffix_child_id text,
         base_parent_id text,
         set_id text,
         set_code text,
         card_name text,
         suffix_number text,
         printed_identity_modifier text,
         finish_key text,
         tcgdex_external_id text,
         external_mapping_id text,
         external_ids jsonb,
         ai_metadata jsonb,
         provenance_ref text
       )`,
      [JSON.stringify(targets)],
    );
    const shape = await client.query(
      `select
         count(*)::int as target_rows,
         count(*) filter (where finish_key <> 'normal')::int as non_normal_suffix_rows,
         count(*) filter (where tcgdex_external_id is null or external_mapping_id is null)::int as missing_mapping_rows
       from pkg08m_targets`,
    );
    const shapeRow = shape.rows[0];
    if (shapeRow.target_rows !== 3 || shapeRow.non_normal_suffix_rows !== 0 || shapeRow.missing_mapping_rows !== 0) {
      throw new Error(`target shape mismatch: ${JSON.stringify(shapeRow)}`);
    }
    const collision = await client.query(
      `select
         (select count(*)::int
          from pkg08m_targets t
          join public.card_prints cp
            on cp.id = t.suffix_parent_id
            or (
              cp.set_id = t.set_id
              and cp.number_plain = regexp_replace(t.suffix_number, '[^0-9]', '', 'g')
              and coalesce(cp.printed_identity_modifier, '') = t.printed_identity_modifier
              and coalesce(cp.variant_key, '') = ''
              and cp.set_identity_model = 'standard'
            )) as suffix_parent_collisions,
         (select count(*)::int
          from pkg08m_targets t
          join public.card_printings cpr
            on cpr.id = t.suffix_child_id
            or (cpr.card_print_id = t.suffix_parent_id and cpr.finish_key = t.finish_key)) as suffix_child_collisions,
         (select count(*)::int
          from pkg08m_targets t
          join public.external_mappings em
            on em.id = t.external_mapping_id
           and em.source = 'tcgdex'
           and em.external_id = t.tcgdex_external_id
           and em.card_print_id = t.base_parent_id) as expected_base_mappings`,
    );
    const collisionRow = collision.rows[0];
    if (collisionRow.suffix_parent_collisions !== 0 || collisionRow.suffix_child_collisions !== 0 || collisionRow.expected_base_mappings !== 3) {
      throw new Error(`collision guard failed: ${JSON.stringify(collisionRow)}`);
    }
    const parentInsert = await client.query(
      `insert into public.card_prints (
         id,
         set_id,
         set_code,
         number,
         name,
         variant_key,
         printed_identity_modifier,
         set_identity_model,
         external_ids,
         ai_metadata
       )
       select
         suffix_parent_id,
         set_id,
         set_code,
         suffix_number,
         card_name,
         '',
         printed_identity_modifier,
         'standard',
         external_ids,
         ai_metadata
       from pkg08m_targets`,
    );
    const mappingUpdate = await client.query(
      `update public.external_mappings em
       set card_print_id = t.suffix_parent_id,
           meta = coalesce(em.meta, '{}'::jsonb) || jsonb_build_object(
             'package_id', $1::text,
             'split_from_card_print_id', t.base_parent_id::text
           )
       from pkg08m_targets t
       where em.id = t.external_mapping_id
         and em.card_print_id = t.base_parent_id
         and em.source = 'tcgdex'
         and em.external_id = t.tcgdex_external_id`,
      [PACKAGE_ID],
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
         suffix_child_id,
         suffix_parent_id,
         finish_key,
         false,
         $1::text,
         provenance_ref,
         $2::text
       from pkg08m_targets`,
      [PROVENANCE_SOURCE, CREATED_BY],
    );
    if (parentInsert.rowCount !== 3 || mappingUpdate.rowCount !== 3 || childInsert.rowCount !== 3) {
      throw new Error(`write count mismatch: ${JSON.stringify({
        parent_rows: parentInsert.rowCount,
        mapping_rows: mappingUpdate.rowCount,
        child_rows: childInsert.rowCount,
      })}`);
    }
    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    const insertedRows = await captureInsertedRows(client, targets);
    return {
      apply_status: 'pkg08m_suffix_parent_split_real_apply_committed',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      inserted_rows: insertedRows,
      committed: true,
      write_counts: {
        parent_rows_inserted: parentInsert.rowCount,
        tcgdex_mapping_rows_transferred: mappingUpdate.rowCount,
        child_rows_inserted: childInsert.rowCount,
      },
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => beforeSnapshot);
    return {
      apply_status: 'pkg08m_suffix_parent_split_real_apply_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      inserted_rows: null,
      committed: false,
      write_counts: {},
    };
  }
}

function validateAfter({ afterSnapshot, insertedRows, targets }) {
  const findings = [];
  if (afterSnapshot.counts.base_parent_rows !== 3) findings.push('after_base_parent_rows_not_3');
  if (afterSnapshot.counts.suffix_parent_rows !== 3) findings.push('after_suffix_parent_rows_not_3');
  if (afterSnapshot.counts.suffix_child_rows !== 3) findings.push('after_suffix_child_rows_not_3');
  if (afterSnapshot.counts.tcgdex_mapping_rows !== 3) findings.push('after_tcgdex_mapping_rows_not_3');
  const targetSuffixParentIds = new Set(targets.map((row) => row.suffix_parent_id));
  const mappings = afterSnapshot.rows.filter((row) => row.row_type === 'tcgdex_mapping');
  if (mappings.some((row) => !targetSuffixParentIds.has(row.mapping_card_print_id))) findings.push('after_mapping_not_on_suffix_parent');
  if (insertedRows.counts.parent_rows_found !== 3) findings.push('inserted_parent_rows_not_3');
  if (insertedRows.counts.child_rows_found !== 3) findings.push('inserted_child_rows_not_3');
  if (insertedRows.counts.mapping_rows_found !== 3) findings.push('inserted_mapping_rows_not_3');
  if (insertedRows.counts.suffix_mapping_rows !== 3) findings.push('inserted_suffix_mapping_rows_not_3');
  validateExpectedCounts(insertedRows.counts.by_set, { g1: 1, sm4: 1, xy7: 1 }, 'inserted_set', findings);
  validateExpectedCounts(insertedRows.counts.by_finish, { normal: 3 }, 'inserted_finish', findings);
  return findings;
}

function renderMarkdown(report) {
  const rows = (report.inserted_rows?.child_rows ?? []).map((row) => [
    row.set_code,
    row.number,
    row.printed_identity_modifier,
    row.card_name,
    row.finish_key,
  ]);
  return `# PKG-08M Suffix Parent Split Real Apply V1

Real apply for the approved suffix parent split package.

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_id | ${report.package_id} |
| package_fingerprint_sha256 | \`${report.package_fingerprint_sha256}\` |
| committed | ${report.committed} |
| parent_rows_inserted | ${report.write_counts.parent_rows_inserted ?? 0} |
| child_rows_inserted | ${report.write_counts.child_rows_inserted ?? 0} |
| tcgdex_mapping_rows_transferred | ${report.write_counts.tcgdex_mapping_rows_transferred ?? 0} |
| deletes_performed | ${report.deletes_performed} |
| migrations_created | ${report.migrations_created} |
| unsupported_cleanup_performed | ${report.unsupported_cleanup_performed} |
| stop_findings | ${report.stop_findings.length} |

${markdownTable(['set', 'number', 'modifier', 'card', 'finish'], rows)}

## Safety Boundary

- Existing base parents were preserved.
- Unsupported cleanup remains deferred.
- No global apply, migrations, deletes, merges, or unsupported cleanup were performed.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08M Suffix Parent Split Real Apply Checkpoint V1](20260610_pkg08m_suffix_parent_split_real_apply_checkpoint_v1.md) | Applied 3 suffix parent splits, inserted 3 child printings, and transferred 3 suffix TCGdex mappings. No deletes, cleanup, migrations, or global apply. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08m_suffix_parent_split_real_apply_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08m_suffix_parent_split_real_apply_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const gate = readJson(GATE_JSON);
const dryRun = readJson(DRY_RUN_JSON);
const targets = dryRun.scope?.target_rows ?? [];
const prerequisiteFindings = validatePrerequisites({ gate, dryRun, targets });
let applyResult = {
  apply_status: 'blocked_prerequisite_findings_present',
  error_message: prerequisiteFindings.join(', '),
  before_snapshot: null,
  after_snapshot: null,
  inserted_rows: null,
  committed: false,
  write_counts: {},
};

if (prerequisiteFindings.length === 0) {
  const conn = connectionString();
  if (!conn) {
    applyResult = {
      apply_status: 'blocked_no_database_connection_string',
      error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      before_snapshot: null,
      after_snapshot: null,
      inserted_rows: null,
      committed: false,
      write_counts: {},
    };
  } else {
    const client = new Client({ connectionString: conn });
    await client.connect();
    try {
      applyResult = await applyPackage(client, targets);
    } finally {
      await client.end().catch(() => {});
    }
  }
}

const afterFindings = applyResult.committed
  ? validateAfter({ afterSnapshot: applyResult.after_snapshot, insertedRows: applyResult.inserted_rows, targets })
  : [];
const stopFindings = [...prerequisiteFindings, ...afterFindings];
if (applyResult.error_message) stopFindings.push(`apply_error:${applyResult.error_message}`);
if (applyResult.committed !== true) stopFindings.push('apply_not_committed');

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08m_suffix_parent_split_real_apply_v1',
  package_id: PACKAGE_ID,
  package_fingerprint_sha256: PACKAGE_FINGERPRINT,
  approval_text: APPROVAL_TEXT,
  apply_status: applyResult.apply_status,
  committed: applyResult.committed,
  db_writes_performed: applyResult.committed,
  durable_db_writes_performed: applyResult.committed,
  migrations_created: false,
  deletes_performed: false,
  merges_performed: false,
  unsupported_cleanup_performed: false,
  quarantine_performed: false,
  global_apply_performed: false,
  write_counts: applyResult.write_counts,
  before_snapshot: applyResult.before_snapshot,
  after_snapshot: applyResult.after_snapshot,
  inserted_rows: applyResult.inserted_rows,
  stop_findings: stopFindings,
  pass: applyResult.committed === true && stopFindings.length === 0,
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
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  write_counts: report.write_counts,
  inserted_counts: report.inserted_rows?.counts ?? null,
  stop_findings: report.stop_findings,
  migrations_created: report.migrations_created,
  deletes_performed: report.deletes_performed,
  unsupported_cleanup_performed: report.unsupported_cleanup_performed,
}, null, 2));

if (!report.pass) process.exitCode = 1;
