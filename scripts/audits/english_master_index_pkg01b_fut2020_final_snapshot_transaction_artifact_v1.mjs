import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'english_master_index_v1',
);
const SQL_DIR = path.join(ROOT, 'docs', 'sql');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const PREVIEW_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01b_fut2020_dry_run_preview_v1.json');
const APPROVAL_GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01b_fut2020_operator_approval_gate_v1.json');
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg01b_fut2020_final_snapshot_transaction_artifact_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  'english_master_index_pkg01b_fut2020_final_snapshot_transaction_artifact_v1.md',
);
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg01b_fut2020_guarded_dry_run_transaction_v1.sql');
const CHECKPOINT_MD = path.join(
  CHECKPOINT_DIR,
  '20260609_pkg01b_fut2020_final_snapshot_transaction_artifact_checkpoint_v1.md',
);

const PACKAGE_ID = 'PKG-01B-FUT2020';
const SET_KEY = 'fut2020';
const SET_NAME = 'Pokémon Futsal 2020';
const TARGET_NUMBERS = ['2', '3', '4', '5'];
const PACKAGE_FINGERPRINT = 'c9539d98a7f883ce9b66ed12c57416ed68f0e9d1cad08b654f1470cb40baee63';
const APPROVAL_TEXT = `Approve PKG-01B-FUT2020 for final fresh snapshot and guarded dry-run transaction artifact preparation only. Fingerprint: ${PACKAGE_FINGERPRINT}. Parent scope: 4 set_code updates. Child scope: 8 unsupported holo/reverse delete candidates. No real apply.`;

const OPTIONAL_CHILD_DEPENDENCIES = [
  { table: 'vault_item_instances', column: 'card_printing_id', activeClause: 'archived_at is null' },
  { table: 'external_printing_mappings', column: 'card_printing_id' },
  { table: 'canon_warehouse_candidates', column: 'promoted_card_printing_id' },
  { table: 'card_printing_truth_reviews', column: 'card_printing_id' },
  { table: 'justtcg_grookai_mappings', column: 'card_printing_id' },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function normalizeEmpty(value) {
  if (value === undefined || value === null) return null;
  const stringValue = String(value);
  return stringValue.length === 0 ? null : stringValue;
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function tableColumnExists(client, table, column) {
  const result = await client.query(
    `select exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = $1
         and column_name = $2
     ) as exists`,
    [table, column],
  );
  return result.rows[0]?.exists === true;
}

async function countChildDependencies(client, childIds) {
  const dependencyRows = {};
  for (const dep of OPTIONAL_CHILD_DEPENDENCIES) {
    const exists = await tableColumnExists(client, dep.table, dep.column);
    if (!exists) {
      dependencyRows[dep.table] = {
        table: dep.table,
        column: dep.column,
        available: false,
        total_refs: null,
        by_card_printing_id: {},
      };
      continue;
    }

    const where = dep.activeClause ? `and ${dep.activeClause}` : '';
    const result = await client.query(
      `select ${dep.column}::text as card_printing_id, count(*)::int as refs
       from public.${dep.table}
       where ${dep.column} = any($1::uuid[])
       ${where}
       group by ${dep.column}`,
      [childIds],
    );
    const byId = {};
    for (const row of result.rows) byId[row.card_printing_id] = row.refs;
    dependencyRows[dep.table] = {
      table: dep.table,
      column: dep.column,
      available: true,
      total_refs: result.rows.reduce((sum, row) => sum + row.refs, 0),
      by_card_printing_id: byId,
    };
  }
  return dependencyRows;
}

async function captureFreshSnapshot() {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      rows: [],
      child_dependency_summary: {},
      impact_counts: {},
    };
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');

    const result = await client.query(
      `select
         cp.id,
         to_jsonb(cp) as card_print,
         coalesce((
           select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id)
           from public.card_printings cpr
           where cpr.card_print_id = cp.id
         ), '[]'::jsonb) as card_printings,
         coalesce((
           select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id)
           from public.external_mappings em
           where em.card_print_id = cp.id
         ), '[]'::jsonb) as external_mappings,
         coalesce((
           select jsonb_agg(to_jsonb(cpi) order by cpi.id)
           from public.card_print_identity cpi
           where cpi.card_print_id = cp.id
         ), '[]'::jsonb) as card_print_identity,
         coalesce((
           select jsonb_agg(to_jsonb(cpt) order by cpt.id)
           from public.card_print_traits cpt
           where cpt.card_print_id = cp.id
         ), '[]'::jsonb) as card_print_traits,
         coalesce((
           select jsonb_agg(to_jsonb(vi) order by vi.id)
           from public.vault_items vi
           where vi.card_id = cp.id
         ), '[]'::jsonb) as vault_items
       from public.card_prints cp
       where cp.external_ids->>'tcgdex' = any($1::text[])
          or exists (
            select 1
            from public.external_mappings em
            where em.card_print_id = cp.id
              and em.source = 'tcgdex'
              and em.external_id = any($1::text[])
          )
       order by nullif(regexp_replace(coalesce(cp.number_plain, cp.number), '[^0-9]', '', 'g'), '')::int nulls last`,
      [TARGET_NUMBERS.map((number) => `${SET_KEY}-${number}`)],
    );

    const rows = result.rows.map((row) => ({
      card_print_id: row.id,
      card_print: row.card_print,
      card_printings: row.card_printings,
      external_mappings: row.external_mappings,
      card_print_identity: row.card_print_identity,
      card_print_traits: row.card_print_traits,
      vault_items: row.vault_items,
      dependency_counts: {
        external_mappings: row.external_mappings.length,
        card_print_identity: row.card_print_identity.length,
        card_print_traits: row.card_print_traits.length,
        vault_items: row.vault_items.length,
      },
    }));

    const childIds = rows.flatMap((row) => row.card_printings.map((printing) => printing.id));
    const childDependencySummary = childIds.length > 0
      ? await countChildDependencies(client, childIds)
      : {};
    await client.query('rollback');

    return {
      available: true,
      reason: null,
      captured_at: new Date().toISOString(),
      rows,
      child_dependency_summary: childDependencySummary,
      impact_counts: {
        card_prints_found: rows.length,
        card_printings_found: rows.reduce((sum, row) => sum + row.card_printings.length, 0),
        external_mappings_found: rows.reduce((sum, row) => sum + row.external_mappings.length, 0),
        identity_rows_found: rows.reduce((sum, row) => sum + row.card_print_identity.length, 0),
        trait_rows_found: rows.reduce((sum, row) => sum + row.card_print_traits.length, 0),
        parent_vault_items_found: rows.reduce((sum, row) => sum + row.vault_items.length, 0),
        child_dependency_refs_found: Object.values(childDependencySummary).reduce(
          (sum, dep) => sum + Number(dep.total_refs ?? 0),
          0,
        ),
      },
      snapshot_hash_sha256: sha256(stableJson(rows)),
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: `Read-only DB snapshot failed: ${error.message}`,
      rows: [],
      child_dependency_summary: {},
      impact_counts: {},
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function childDependencyRefsFor(childId, childDependencySummary) {
  return Object.values(childDependencySummary).reduce(
    (sum, dep) => sum + Number(dep.by_card_printing_id?.[childId] ?? 0),
    0,
  );
}

function validateSources(preview, approvalGate) {
  const findings = [];
  const scope = preview.package_scope ?? {};
  const summary = preview.summary ?? {};

  if (preview.preview_status !== 'pkg01b_fut2020_dry_run_preview_ready_apply_blocked_no_write') {
    findings.push('preview_status_not_ready');
  }
  if (preview.pass !== true) findings.push('preview_not_passing');
  if (preview.db_writes_performed !== false) findings.push('preview_reports_db_write');
  if (preview.migrations_created !== false) findings.push('preview_reports_migration');
  if (preview.cleanup_performed !== false) findings.push('preview_reports_cleanup');
  if (preview.quarantine_performed !== false) findings.push('preview_reports_quarantine');
  if (preview.apply_allowed !== false) findings.push('preview_allows_apply');
  if (preview.write_ready_now !== 0) findings.push('preview_write_ready_nonzero');
  if ((preview.stop_findings ?? []).length !== 0) findings.push('preview_stop_findings_present');

  if (scope.package_id !== PACKAGE_ID) findings.push('preview_wrong_package_id');
  if (scope.set_key !== SET_KEY) findings.push('preview_wrong_set_key');
  if (scope.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('preview_fingerprint_mismatch');
  if ((scope.target_numbers ?? []).join(',') !== TARGET_NUMBERS.join(',')) findings.push('preview_wrong_target_numbers');
  if (scope.card_print_rows !== 4) findings.push('preview_parent_count_not_four');
  if (scope.current_child_printings !== 12) findings.push('preview_child_count_not_twelve');
  if (scope.expected_master_printings !== 4) findings.push('preview_expected_printings_not_four');
  if (summary.parent_set_code_updates_previewed !== 4) findings.push('preview_parent_update_count_not_four');
  if (summary.child_keep_rows !== 4) findings.push('preview_keep_count_not_four');
  if (summary.child_delete_candidates_requires_approval !== 8) findings.push('preview_delete_count_not_eight');

  if (approvalGate.approval_gate_status !== 'ready_for_operator_decision_apply_blocked_no_write') {
    findings.push('approval_gate_not_ready');
  }
  if (approvalGate.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) {
    findings.push('approval_gate_fingerprint_mismatch');
  }
  if (approvalGate.required_operator_decision?.exact_approval_phrase_required !== APPROVAL_TEXT) {
    findings.push('approval_gate_required_phrase_mismatch');
  }
  if (approvalGate.approval_recorded !== false) findings.push('approval_gate_unexpected_approval_recorded');
  if (approvalGate.apply_allowed !== false) findings.push('approval_gate_allows_apply');
  if (approvalGate.write_ready_now !== 0) findings.push('approval_gate_write_ready_nonzero');
  if ((approvalGate.stop_findings ?? []).length !== 0) findings.push('approval_gate_stop_findings_present');

  return findings;
}

function buildMatrices(preview, snapshot) {
  const previewParentsById = new Map((preview.parent_mutation_matrix ?? []).map((row) => [row.card_print_id, row]));
  const previewChildrenById = new Map((preview.child_printing_matrix ?? []).map((row) => [row.card_printing_id, row]));
  const parentMutationMatrix = [];
  const childPrintingMatrix = [];
  const rollbackMatrix = [];

  for (const snapshotRow of snapshot.rows) {
    const cardPrint = snapshotRow.card_print ?? {};
    const previewParent = previewParentsById.get(snapshotRow.card_print_id);
    const number = String(cardPrint.number_plain ?? cardPrint.number);
    const childDeleteSnapshots = [];

    parentMutationMatrix.push({
      card_print_id: snapshotRow.card_print_id,
      row_fingerprint_sha256: previewParent?.row_fingerprint_sha256 ?? null,
      set_key: SET_KEY,
      set_name: SET_NAME,
      source_external_id: `${SET_KEY}-${number}`,
      source_card_url: previewParent?.source_card_url ?? null,
      allowed_changed_fields: ['set_code'],
      before_values_from_fresh_snapshot: {
        set_code: normalizeEmpty(cardPrint.set_code),
        number: normalizeEmpty(cardPrint.number),
        number_plain: normalizeEmpty(cardPrint.number_plain),
        name: normalizeEmpty(cardPrint.name),
        set_id: normalizeEmpty(cardPrint.set_id),
      },
      approved_after_values: {
        set_code: SET_KEY,
        number: String(number),
        name: normalizeEmpty(cardPrint.name),
      },
      child_printing_rows_current: snapshotRow.card_printings.length,
      expected_child_printings_before: 3,
      expected_child_printings_after: 1,
      expected_keep_finish_keys: ['normal'],
      dependency_counts: snapshotRow.dependency_counts,
      evidence_sources: previewParent?.evidence_sources ?? [],
    });

    for (const printing of snapshotRow.card_printings) {
      const previewChild = previewChildrenById.get(printing.id);
      const action = printing.finish_key === 'normal'
        ? 'keep'
        : 'delete_candidate_approved_for_dry_run_artifact_only';
      const dependencyRefs = childDependencyRefsFor(printing.id, snapshot.child_dependency_summary);
      const childRow = {
        card_print_id: snapshotRow.card_print_id,
        card_printing_id: printing.id,
        card_number: number,
        card_name: normalizeEmpty(cardPrint.name),
        finish_key: printing.finish_key,
        expected_finish_key: 'normal',
        action,
        status: printing.finish_key === 'normal' ? 'verified_by_index' : 'unsupported_by_index_candidate',
        child_dependency_refs: dependencyRefs,
        dependency_safe_for_delete_candidate: dependencyRefs === 0,
        provenance_source: printing.provenance_source ?? null,
        provenance_ref: printing.provenance_ref ?? null,
        preview_action: previewChild?.action ?? null,
        snapshot_row: printing,
      };
      childPrintingMatrix.push(childRow);
      if (action === 'delete_candidate_approved_for_dry_run_artifact_only') {
        childDeleteSnapshots.push(printing);
      }
    }

    rollbackMatrix.push({
      card_print_id: snapshotRow.card_print_id,
      parent_rollback_values_from_fresh_snapshot: {
        set_code: normalizeEmpty(cardPrint.set_code),
        number: normalizeEmpty(cardPrint.number),
        number_plain: normalizeEmpty(cardPrint.number_plain),
        name: normalizeEmpty(cardPrint.name),
      },
      child_printing_reinsert_snapshot_for_delete_candidates: childDeleteSnapshots,
      rollback_available: childDeleteSnapshots.length === 2,
      rollback_note: 'Future real apply rollback must restore parent set_code and reinsert these exact child rows if a durable delete is ever separately approved.',
    });
  }

  return { parentMutationMatrix, childPrintingMatrix, rollbackMatrix };
}

function validateFreshSnapshot(preview, snapshot, matrices) {
  const findings = [];
  const rows = snapshot.rows ?? [];
  const parentRows = matrices.parentMutationMatrix;
  const childRows = matrices.childPrintingMatrix;
  const keepRows = childRows.filter((row) => row.action === 'keep');
  const deleteRows = childRows.filter((row) => row.action === 'delete_candidate_approved_for_dry_run_artifact_only');
  const previewParentIds = new Set((preview.parent_mutation_matrix ?? []).map((row) => row.card_print_id));
  const previewDeleteIds = new Set(
    (preview.child_printing_matrix ?? [])
      .filter((row) => row.action === 'delete_candidate_requires_separate_approval')
      .map((row) => row.card_printing_id),
  );

  if (!snapshot.available) findings.push('fresh_snapshot_unavailable');
  if (snapshot.impact_counts?.card_prints_found !== 4) findings.push('fresh_snapshot_parent_count_not_four');
  if (snapshot.impact_counts?.card_printings_found !== 12) findings.push('fresh_snapshot_child_count_not_twelve');
  if (snapshot.impact_counts?.parent_vault_items_found !== 0) findings.push('fresh_snapshot_parent_vault_refs_present');
  if (snapshot.impact_counts?.child_dependency_refs_found !== 0) findings.push('fresh_snapshot_child_dependency_refs_present');
  if (keepRows.length !== 4) findings.push('fresh_snapshot_keep_count_not_four');
  if (deleteRows.length !== 8) findings.push('fresh_snapshot_delete_count_not_eight');
  if (deleteRows.some((row) => !['holo', 'reverse'].includes(row.finish_key))) {
    findings.push('fresh_snapshot_delete_finish_not_holo_reverse');
  }
  if (keepRows.some((row) => row.finish_key !== 'normal')) findings.push('fresh_snapshot_keep_finish_not_normal');

  for (const parent of parentRows) {
    if (!previewParentIds.has(parent.card_print_id)) findings.push(`fresh_snapshot_unknown_parent_${parent.card_print_id}`);
    if (parent.before_values_from_fresh_snapshot.set_code !== null) {
      findings.push(`fresh_snapshot_parent_set_code_not_null_${parent.card_print_id}`);
    }
    if (!TARGET_NUMBERS.includes(String(parent.before_values_from_fresh_snapshot.number_plain))) {
      findings.push(`fresh_snapshot_parent_number_out_of_scope_${parent.card_print_id}`);
    }
  }

  for (const row of rows) {
    const finishes = row.card_printings.map((printing) => printing.finish_key).sort().join(',');
    if (finishes !== 'holo,normal,reverse') {
      findings.push(`fresh_snapshot_finish_set_mismatch_${row.card_print_id}_${finishes}`);
    }
  }

  for (const child of deleteRows) {
    if (!previewDeleteIds.has(child.card_printing_id)) {
      findings.push(`fresh_snapshot_delete_child_not_in_preview_${child.card_printing_id}`);
    }
    if (child.child_dependency_refs !== 0) {
      findings.push(`fresh_snapshot_delete_child_has_dependency_${child.card_printing_id}`);
    }
  }

  return findings;
}

function buildValuesList(rows, buildTuple) {
  return rows.map((row) => `  (${buildTuple(row).join(', ')})`).join(',\n');
}

function buildTransactionSql(reportDraft) {
  const parentRows = reportDraft.mutation_matrix;
  const childRows = reportDraft.child_printing_matrix;
  const keepRows = childRows.filter((row) => row.action === 'keep');
  const deleteRows = childRows.filter((row) => row.action === 'delete_candidate_approved_for_dry_run_artifact_only');
  const rollbackRows = reportDraft.rollback_matrix.flatMap((row) =>
    row.child_printing_reinsert_snapshot_for_delete_candidates.map((printing) => ({
      card_print_id: row.card_print_id,
      card_printing_id: printing.id,
      finish_key: printing.finish_key,
      snapshot_row: printing,
    })),
  );

  return `-- English Master Index PKG-01B-FUT2020 guarded dry-run transaction V1
-- GENERATED ARTIFACT ONLY. This file has not been executed by Codex.
-- Scope: four fut2020 parent set_code updates and eight unsupported child printing delete candidates.
-- Package fingerprint: ${PACKAGE_FINGERPRINT}
-- Fresh snapshot hash: ${reportDraft.fresh_snapshot.snapshot_hash_sha256}
-- User approval captured for artifact preparation only: ${APPROVAL_TEXT}
-- This artifact has no COMMIT path. It must roll back.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create temporary table pkg01b_fut2020_approved_card_prints (
  card_print_id uuid primary key,
  before_set_code text,
  before_number text not null,
  before_number_plain text,
  before_name text not null,
  after_set_code text not null,
  after_number text not null,
  after_name text not null,
  expected_child_printings_before int not null,
  expected_child_printings_after int not null,
  expected_keep_finish_keys text[] not null
) on commit drop;

insert into pkg01b_fut2020_approved_card_prints (
  card_print_id,
  before_set_code,
  before_number,
  before_number_plain,
  before_name,
  after_set_code,
  after_number,
  after_name,
  expected_child_printings_before,
  expected_child_printings_after,
  expected_keep_finish_keys
) values
${buildValuesList(parentRows, (row) => [
  `'${row.card_print_id}'::uuid`,
  sqlString(row.before_values_from_fresh_snapshot.set_code),
  sqlString(row.before_values_from_fresh_snapshot.number),
  sqlString(row.before_values_from_fresh_snapshot.number_plain),
  sqlString(row.before_values_from_fresh_snapshot.name),
  sqlString(row.approved_after_values.set_code),
  sqlString(row.approved_after_values.number),
  sqlString(row.approved_after_values.name),
  Number(row.expected_child_printings_before),
  Number(row.expected_child_printings_after),
  "array['normal']::text[]",
])};

create temporary table pkg01b_fut2020_child_keep_rows (
  card_printing_id uuid primary key,
  card_print_id uuid not null,
  finish_key text not null,
  snapshot_row jsonb not null
) on commit drop;

insert into pkg01b_fut2020_child_keep_rows (
  card_printing_id,
  card_print_id,
  finish_key,
  snapshot_row
) values
${buildValuesList(keepRows, (row) => [
  `'${row.card_printing_id}'::uuid`,
  `'${row.card_print_id}'::uuid`,
  sqlString(row.finish_key),
  sqlJson(row.snapshot_row),
])};

create temporary table pkg01b_fut2020_child_delete_candidates (
  card_printing_id uuid primary key,
  card_print_id uuid not null,
  finish_key text not null,
  provenance_source text,
  provenance_ref text,
  snapshot_row jsonb not null
) on commit drop;

insert into pkg01b_fut2020_child_delete_candidates (
  card_printing_id,
  card_print_id,
  finish_key,
  provenance_source,
  provenance_ref,
  snapshot_row
) values
${buildValuesList(deleteRows, (row) => [
  `'${row.card_printing_id}'::uuid`,
  `'${row.card_print_id}'::uuid`,
  sqlString(row.finish_key),
  sqlString(row.provenance_source),
  sqlString(row.provenance_ref),
  sqlJson(row.snapshot_row),
])};

create temporary table pkg01b_fut2020_child_delete_rollback_snapshot (
  card_printing_id uuid primary key,
  card_print_id uuid not null,
  finish_key text not null,
  snapshot_row jsonb not null
) on commit drop;

insert into pkg01b_fut2020_child_delete_rollback_snapshot (
  card_printing_id,
  card_print_id,
  finish_key,
  snapshot_row
) values
${buildValuesList(rollbackRows, (row) => [
  `'${row.card_printing_id}'::uuid`,
  `'${row.card_print_id}'::uuid`,
  sqlString(row.finish_key),
  sqlJson(row.snapshot_row),
])};

-- Guard 1: approved package cardinality must not change.
do $$
declare
  parent_count int;
  keep_count int;
  delete_count int;
  rollback_count int;
begin
  select count(*) into parent_count from pkg01b_fut2020_approved_card_prints;
  select count(*) into keep_count from pkg01b_fut2020_child_keep_rows;
  select count(*) into delete_count from pkg01b_fut2020_child_delete_candidates;
  select count(*) into rollback_count from pkg01b_fut2020_child_delete_rollback_snapshot;

  if parent_count <> 4 then
    raise exception 'PKG-01B parent target count changed: %', parent_count;
  end if;
  if keep_count <> 4 then
    raise exception 'PKG-01B keep-row count changed: %', keep_count;
  end if;
  if delete_count <> 8 then
    raise exception 'PKG-01B delete-candidate count changed: %', delete_count;
  end if;
  if rollback_count <> 8 then
    raise exception 'PKG-01B rollback snapshot count changed: %', rollback_count;
  end if;
end $$;

-- Guard 2: current parent DB state must match the final fresh snapshot.
do $$
declare
  drift_count int;
begin
  select count(*) into drift_count
  from pkg01b_fut2020_approved_card_prints approved
  join public.card_prints cp on cp.id = approved.card_print_id
  where cp.set_code is distinct from approved.before_set_code
     or cp.number is distinct from approved.before_number
     or cp.number_plain is distinct from approved.before_number_plain
     or cp.name is distinct from approved.before_name;

  if drift_count <> 0 then
    raise exception 'PKG-01B before-state drift detected: %', drift_count;
  end if;
end $$;

-- Guard 3: no vault ownership references may exist for these parent rows.
do $$
declare
  vault_count int;
begin
  select count(*) into vault_count
  from public.vault_items vi
  join pkg01b_fut2020_approved_card_prints approved on approved.card_print_id = vi.card_id;

  if vault_count <> 0 then
    raise exception 'PKG-01B vault reference blocker detected: %', vault_count;
  end if;
end $$;

-- Guard 4: each parent must still have exactly holo, normal, and reverse child rows.
do $$
declare
  mismatch_count int;
begin
  select count(*) into mismatch_count
  from pkg01b_fut2020_approved_card_prints approved
  where (
    select count(*)::int
    from public.card_printings cpr
    where cpr.card_print_id = approved.card_print_id
  ) <> approved.expected_child_printings_before
  or (
    select array_agg(cpr.finish_key order by cpr.finish_key)
    from public.card_printings cpr
    where cpr.card_print_id = approved.card_print_id
  ) is distinct from array['holo', 'normal', 'reverse']::text[];

  if mismatch_count <> 0 then
    raise exception 'PKG-01B child finish scope mismatch detected: %', mismatch_count;
  end if;
end $$;

-- Guard 5: delete candidates must still be exact unsupported holo/reverse rows.
do $$
declare
  delete_drift_count int;
begin
  select count(*) into delete_drift_count
  from pkg01b_fut2020_child_delete_candidates candidate
  left join public.card_printings cpr on cpr.id = candidate.card_printing_id
  where cpr.id is null
     or cpr.card_print_id is distinct from candidate.card_print_id
     or cpr.finish_key is distinct from candidate.finish_key
     or candidate.finish_key not in ('holo', 'reverse');

  if delete_drift_count <> 0 then
    raise exception 'PKG-01B delete-candidate drift detected: %', delete_drift_count;
  end if;
end $$;

-- Guard 6: keep rows must still be exact normal rows.
do $$
declare
  keep_drift_count int;
begin
  select count(*) into keep_drift_count
  from pkg01b_fut2020_child_keep_rows keep_row
  left join public.card_printings cpr on cpr.id = keep_row.card_printing_id
  where cpr.id is null
     or cpr.card_print_id is distinct from keep_row.card_print_id
     or cpr.finish_key is distinct from 'normal';

  if keep_drift_count <> 0 then
    raise exception 'PKG-01B keep-row drift detected: %', keep_drift_count;
  end if;
end $$;

-- Guard 7: supported child dependency tables must not reference delete candidates.
do $$
declare
  ref_count int;
begin
  select count(*) into ref_count
  from public.vault_item_instances vii
  join pkg01b_fut2020_child_delete_candidates candidate on candidate.card_printing_id = vii.card_printing_id
  where vii.archived_at is null;

  if ref_count <> 0 then
    raise exception 'PKG-01B active vault_item_instances child dependency blocker: %', ref_count;
  end if;

  if to_regclass('public.external_printing_mappings') is not null then
    execute 'select count(*) from public.external_printing_mappings epm join pg_temp.pkg01b_fut2020_child_delete_candidates candidate on candidate.card_printing_id = epm.card_printing_id' into ref_count;
    if ref_count <> 0 then
      raise exception 'PKG-01B external_printing_mappings child dependency blocker: %', ref_count;
    end if;
  end if;

  if to_regclass('public.canon_warehouse_candidates') is not null then
    execute 'select count(*) from public.canon_warehouse_candidates cwc join pg_temp.pkg01b_fut2020_child_delete_candidates candidate on candidate.card_printing_id = cwc.promoted_card_printing_id' into ref_count;
    if ref_count <> 0 then
      raise exception 'PKG-01B canon_warehouse_candidates child dependency blocker: %', ref_count;
    end if;
  end if;

  if to_regclass('public.card_printing_truth_reviews') is not null then
    execute 'select count(*) from public.card_printing_truth_reviews cptr join pg_temp.pkg01b_fut2020_child_delete_candidates candidate on candidate.card_printing_id = cptr.card_printing_id' into ref_count;
    if ref_count <> 0 then
      raise exception 'PKG-01B card_printing_truth_reviews child dependency blocker: %', ref_count;
    end if;
  end if;

  if to_regclass('public.justtcg_grookai_mappings') is not null then
    execute 'select count(*) from public.justtcg_grookai_mappings jgm join pg_temp.pkg01b_fut2020_child_delete_candidates candidate on candidate.card_printing_id = jgm.card_printing_id' into ref_count;
    if ref_count <> 0 then
      raise exception 'PKG-01B justtcg_grookai_mappings child dependency blocker: %', ref_count;
    end if;
  end if;
end $$;

create temporary table pkg01b_fut2020_updated_parent_rows (
  card_print_id uuid primary key
) on commit drop;

with updated as (
  update public.card_prints cp
  set set_code = approved.after_set_code
  from pkg01b_fut2020_approved_card_prints approved
  where cp.id = approved.card_print_id
    and cp.set_code is distinct from approved.after_set_code
  returning cp.id as card_print_id
)
insert into pkg01b_fut2020_updated_parent_rows (card_print_id)
select card_print_id from updated;

create temporary table pkg01b_fut2020_deleted_child_rows (
  card_printing_id uuid primary key,
  card_print_id uuid not null,
  finish_key text not null
) on commit drop;

with deleted as (
  delete from public.card_printings cpr
  using pkg01b_fut2020_child_delete_candidates candidate
  where cpr.id = candidate.card_printing_id
  returning cpr.id as card_printing_id, cpr.card_print_id, cpr.finish_key
)
insert into pkg01b_fut2020_deleted_child_rows (
  card_printing_id,
  card_print_id,
  finish_key
)
select card_printing_id, card_print_id, finish_key from deleted;

-- Guard 8: transient dry-run mutation must touch exactly four parents and eight child rows.
do $$
declare
  updated_count int;
  deleted_count int;
begin
  select count(*) into updated_count from pkg01b_fut2020_updated_parent_rows;
  select count(*) into deleted_count from pkg01b_fut2020_deleted_child_rows;

  if updated_count <> 4 then
    raise exception 'PKG-01B dry-run parent update count mismatch: %', updated_count;
  end if;
  if deleted_count <> 8 then
    raise exception 'PKG-01B dry-run child delete count mismatch: %', deleted_count;
  end if;
end $$;

-- Guard 9: transient final state must be four fut2020 parent rows with one normal child each.
do $$
declare
  final_parent_count int;
  final_child_count int;
  final_bad_finish_count int;
begin
  select count(*) into final_parent_count
  from public.card_prints cp
  join pkg01b_fut2020_approved_card_prints approved on approved.card_print_id = cp.id
  where cp.set_code = approved.after_set_code
    and cp.number = approved.after_number
    and cp.name = approved.after_name;

  select count(*) into final_child_count
  from public.card_printings cpr
  join pkg01b_fut2020_approved_card_prints approved on approved.card_print_id = cpr.card_print_id;

  select count(*) into final_bad_finish_count
  from public.card_printings cpr
  join pkg01b_fut2020_approved_card_prints approved on approved.card_print_id = cpr.card_print_id
  where cpr.finish_key <> 'normal';

  if final_parent_count <> 4 then
    raise exception 'PKG-01B final parent verification failed: %', final_parent_count;
  end if;
  if final_child_count <> 4 then
    raise exception 'PKG-01B final child count verification failed: %', final_child_count;
  end if;
  if final_bad_finish_count <> 0 then
    raise exception 'PKG-01B final child finish verification failed: %', final_bad_finish_count;
  end if;
end $$;

-- Required rollback-only ending for this dry-run artifact.
rollback;
`;
}

function buildReport(preview, approvalGate, snapshot) {
  const sourceFindings = validateSources(preview, approvalGate);
  const matrices = buildMatrices(preview, snapshot);
  const snapshotFindings = validateFreshSnapshot(preview, snapshot, matrices);
  const stopFindings = [...sourceFindings, ...snapshotFindings];

  const draft = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg01b_fut2020_final_snapshot_transaction_artifact_v1',
    audit_only: true,
    dry_run_artifact_preparation_only: true,
    final_fresh_snapshot_only: true,
    db_reads_performed: snapshot.available,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    transaction_artifact_executed: false,
    approval_scope: {
      approved_by_user_instruction: true,
      approval_text: APPROVAL_TEXT,
      approved_for_package_id: PACKAGE_ID,
      approved_for_fingerprint_sha256: PACKAGE_FINGERPRINT,
      approved_parent_scope: '4 set_code updates',
      approved_child_scope: '8 unsupported holo/reverse delete candidates',
      approved_for_final_fresh_snapshot: true,
      approved_for_guarded_dry_run_transaction_artifact_preparation: true,
      approved_for_db_write: false,
      approved_for_apply: false,
      approved_for_real_apply: false,
    },
    write_ready_now: 0,
    apply_allowed: false,
    artifact_status: stopFindings.length === 0
      ? 'pkg01b_fut2020_final_snapshot_and_dry_run_artifact_prepared_apply_blocked_no_write'
      : 'pkg01b_fut2020_artifact_preparation_blocked_stop_findings_present',
    source_artifacts: {
      dry_run_preview: path.relative(ROOT, PREVIEW_JSON).replaceAll('\\', '/'),
      operator_approval_gate: path.relative(ROOT, APPROVAL_GATE_JSON).replaceAll('\\', '/'),
    },
    package_scope: {
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: PACKAGE_FINGERPRINT,
      set_key: SET_KEY,
      set_name: SET_NAME,
      target_numbers: TARGET_NUMBERS,
      card_print_rows: 4,
      current_child_printings: 12,
      expected_master_printings: 4,
      parent_set_code_updates: 4,
      child_keep_rows: 4,
      child_delete_candidates: 8,
      allowed_parent_field_changes: ['set_code'],
      allowed_child_delete_finish_keys: ['holo', 'reverse'],
    },
    fresh_snapshot: {
      available: snapshot.available,
      reason: snapshot.reason,
      captured_at: snapshot.captured_at ?? null,
      snapshot_hash_sha256: snapshot.snapshot_hash_sha256 ?? null,
      impact_counts: snapshot.impact_counts,
      child_dependency_summary: snapshot.child_dependency_summary,
      rows: snapshot.rows,
    },
    mutation_matrix: matrices.parentMutationMatrix,
    child_printing_matrix: matrices.childPrintingMatrix,
    rollback_matrix: matrices.rollbackMatrix,
    guarded_dry_run_transaction_artifact: null,
    verification_gates_required_before_any_db_write: [
      'Review this final fresh snapshot and package fingerprint.',
      'Review every parent target row and every child delete candidate ID.',
      'Review rollback reinsert snapshots for all eight child delete candidates.',
      'Review the generated SQL artifact and confirm it contains no COMMIT statement.',
      'Run the generated artifact only in an explicitly approved guarded dry-run step.',
      'Verify the dry-run rolls back with identical durable before/after state.',
      'Stop again for separate real-apply approval after dry-run proof.',
    ],
    explicit_non_authorizations: [
      'This artifact preparation is not DB write approval.',
      'This artifact preparation is not real apply approval.',
      'The SQL artifact was not executed.',
      'No durable update or delete was performed.',
      'No migration was created.',
      'No cleanup, quarantine, insertion, hiding, scanner, pricing, vault, or marketplace behavior was authorized.',
    ],
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };

  const transactionSql = buildTransactionSql(draft);
  fs.mkdirSync(SQL_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_SQL, transactionSql);

  draft.guarded_dry_run_transaction_artifact = {
    artifact_ref: path.relative(ROOT, OUTPUT_SQL).replaceAll('\\', '/'),
    artifact_hash_sha256: sha256(transactionSql),
    executed: false,
    contains_commit_statement: /(^|\n)\s*commit\s*;/i.test(transactionSql),
    contains_rollback_statement: /(^|\n)\s*rollback\s*;/i.test(transactionSql),
    dry_run_default: true,
    rollback_only: true,
    allowed_target_tables: ['public.card_prints', 'public.card_printings'],
    allowed_parent_target_ids: draft.mutation_matrix.map((row) => row.card_print_id),
    allowed_child_delete_candidate_ids: draft.child_printing_matrix
      .filter((row) => row.action === 'delete_candidate_approved_for_dry_run_artifact_only')
      .map((row) => row.card_printing_id),
    allowed_child_keep_ids: draft.child_printing_matrix
      .filter((row) => row.action === 'keep')
      .map((row) => row.card_printing_id),
    allowed_field_changes: ['card_prints.set_code'],
    expected_dry_run_parent_updates: 4,
    expected_dry_run_child_deletes: 8,
  };

  if (draft.guarded_dry_run_transaction_artifact.contains_commit_statement) {
    draft.stop_findings.push('generated_sql_contains_commit_statement');
    draft.pass = false;
    draft.artifact_status = 'pkg01b_fut2020_artifact_preparation_blocked_stop_findings_present';
  }
  if (!draft.guarded_dry_run_transaction_artifact.contains_rollback_statement) {
    draft.stop_findings.push('generated_sql_missing_rollback_statement');
    draft.pass = false;
    draft.artifact_status = 'pkg01b_fut2020_artifact_preparation_blocked_stop_findings_present';
  }

  return draft;
}

function renderMarkdown(report) {
  const childDeleteRows = report.child_printing_matrix.filter(
    (row) => row.action === 'delete_candidate_approved_for_dry_run_artifact_only',
  );
  const childKeepRows = report.child_printing_matrix.filter((row) => row.action === 'keep');
  const lines = [];
  lines.push('# English Master Index PKG-01B-FUT2020 Final Snapshot Transaction Artifact V1');
  lines.push('');
  lines.push('This report records the approved preparation-only step for `PKG-01B-FUT2020`.');
  lines.push('');
  lines.push('It captured a final fresh read-only snapshot and generated a guarded dry-run transaction artifact. The SQL artifact was not executed.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| artifact_status | ${report.artifact_status} |`);
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |`);
  lines.push(`| set_key | ${report.package_scope.set_key} |`);
  lines.push(`| parent_set_code_updates | ${report.package_scope.parent_set_code_updates} |`);
  lines.push(`| child_keep_rows | ${report.package_scope.child_keep_rows} |`);
  lines.push(`| child_delete_candidates | ${report.package_scope.child_delete_candidates} |`);
  lines.push(`| write_ready_now | ${report.write_ready_now} |`);
  lines.push(`| apply_allowed | ${report.apply_allowed} |`);
  lines.push(`| db_reads_performed | ${report.db_reads_performed} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| transaction_artifact_executed | ${report.transaction_artifact_executed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| cleanup_performed | ${report.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.quarantine_performed} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Approval Scope');
  lines.push('');
  lines.push('```text');
  lines.push(report.approval_scope.approval_text);
  lines.push('```');
  lines.push('');
  lines.push('| Scope | Value |');
  lines.push('| --- | --- |');
  lines.push(`| approved_for_final_fresh_snapshot | ${report.approval_scope.approved_for_final_fresh_snapshot} |`);
  lines.push(`| approved_for_guarded_dry_run_transaction_artifact_preparation | ${report.approval_scope.approved_for_guarded_dry_run_transaction_artifact_preparation} |`);
  lines.push(`| approved_for_db_write | ${report.approval_scope.approved_for_db_write} |`);
  lines.push(`| approved_for_apply | ${report.approval_scope.approved_for_apply} |`);
  lines.push(`| approved_for_real_apply | ${report.approval_scope.approved_for_real_apply} |`);
  lines.push('');
  lines.push('## Fresh Snapshot');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| captured_at | ${report.fresh_snapshot.captured_at} |`);
  lines.push(`| snapshot_hash_sha256 | \`${report.fresh_snapshot.snapshot_hash_sha256 ?? 'not_available'}\` |`);
  lines.push(`| card_prints_found | ${report.fresh_snapshot.impact_counts?.card_prints_found ?? null} |`);
  lines.push(`| card_printings_found | ${report.fresh_snapshot.impact_counts?.card_printings_found ?? null} |`);
  lines.push(`| parent_vault_items_found | ${report.fresh_snapshot.impact_counts?.parent_vault_items_found ?? null} |`);
  lines.push(`| child_dependency_refs_found | ${report.fresh_snapshot.impact_counts?.child_dependency_refs_found ?? null} |`);
  lines.push('');
  lines.push('## Parent Mutation Matrix');
  lines.push('');
  lines.push('| card_print_id | number | name | before_set_code | after_set_code | child_rows_before | child_rows_after |');
  lines.push('| --- | --- | --- | --- | --- | ---: | ---: |');
  for (const row of report.mutation_matrix) {
    lines.push(`| ${mdEscape(row.card_print_id)} | ${mdEscape(row.before_values_from_fresh_snapshot.number_plain)} | ${mdEscape(row.before_values_from_fresh_snapshot.name)} | ${mdEscape(row.before_values_from_fresh_snapshot.set_code ?? '')} | ${mdEscape(row.approved_after_values.set_code)} | ${row.expected_child_printings_before} | ${row.expected_child_printings_after} |`);
  }
  lines.push('');
  lines.push('## Child Printing Matrix');
  lines.push('');
  lines.push('| action | card_printing_id | card_number | card_name | finish_key | dependency_refs |');
  lines.push('| --- | --- | --- | --- | --- | ---: |');
  for (const row of [...childKeepRows, ...childDeleteRows]) {
    lines.push(`| ${mdEscape(row.action)} | ${mdEscape(row.card_printing_id)} | ${mdEscape(row.card_number)} | ${mdEscape(row.card_name)} | ${mdEscape(row.finish_key)} | ${row.child_dependency_refs} |`);
  }
  lines.push('');
  lines.push('## Guarded Dry-Run Transaction Artifact');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| artifact_ref | \`${report.guarded_dry_run_transaction_artifact.artifact_ref}\` |`);
  lines.push(`| artifact_hash_sha256 | \`${report.guarded_dry_run_transaction_artifact.artifact_hash_sha256}\` |`);
  lines.push(`| executed | ${report.guarded_dry_run_transaction_artifact.executed} |`);
  lines.push(`| contains_commit_statement | ${report.guarded_dry_run_transaction_artifact.contains_commit_statement} |`);
  lines.push(`| contains_rollback_statement | ${report.guarded_dry_run_transaction_artifact.contains_rollback_statement} |`);
  lines.push(`| expected_dry_run_parent_updates | ${report.guarded_dry_run_transaction_artifact.expected_dry_run_parent_updates} |`);
  lines.push(`| expected_dry_run_child_deletes | ${report.guarded_dry_run_transaction_artifact.expected_dry_run_child_deletes} |`);
  lines.push('');
  lines.push('## Rollback Proof');
  lines.push('');
  lines.push('| card_print_id | delete candidate snapshots | rollback_available |');
  lines.push('| --- | ---: | --- |');
  for (const row of report.rollback_matrix) {
    lines.push(`| ${mdEscape(row.card_print_id)} | ${row.child_printing_reinsert_snapshot_for_delete_candidates.length} | ${row.rollback_available} |`);
  }
  lines.push('');
  lines.push('The JSON report contains the exact child `card_printings` snapshots needed to reinsert all eight delete candidates if a future durable apply is separately approved and later rolled back.');
  lines.push('');
  lines.push('## Required Gates Before Any DB Write');
  lines.push('');
  for (const gate of report.verification_gates_required_before_any_db_write) lines.push(`- ${gate}`);
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) {
    lines.push('- none');
  } else {
    for (const finding of report.stop_findings) lines.push(`- ${finding}`);
  }
  lines.push('');
  lines.push('## Non-Authorizations');
  lines.push('');
  for (const item of report.explicit_non_authorizations) lines.push(`- ${item}`);
  return `${lines.join('\n')}\n`;
}

function renderCheckpoint(report) {
  return `# PKG-01B-FUT2020 Final Snapshot Transaction Artifact Checkpoint V1

Date: 2026-06-09

## Purpose

Record the approved preparation-only final fresh snapshot and rollback-only guarded dry-run transaction artifact for PKG-01B-FUT2020.

## Result

| Field | Value |
| --- | --- |
| artifact_status | ${report.artifact_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| parent_set_code_updates | ${report.package_scope.parent_set_code_updates} |
| child_keep_rows | ${report.package_scope.child_keep_rows} |
| child_delete_candidates | ${report.package_scope.child_delete_candidates} |
| snapshot_hash_sha256 | \`${report.fresh_snapshot.snapshot_hash_sha256 ?? 'not_available'}\` |
| sql_artifact_hash_sha256 | \`${report.guarded_dry_run_transaction_artifact.artifact_hash_sha256}\` |
| contains_commit_statement | ${report.guarded_dry_run_transaction_artifact.contains_commit_statement} |
| contains_rollback_statement | ${report.guarded_dry_run_transaction_artifact.contains_rollback_statement} |
| transaction_artifact_executed | ${report.transaction_artifact_executed} |
| db_writes_performed | ${report.db_writes_performed} |
| migrations_created | ${report.migrations_created} |
| write_ready_now | ${report.write_ready_now} |
| stop_findings | ${report.stop_findings.length} |

## Approval

\`\`\`text
${report.approval_scope.approval_text}
\`\`\`

## Safety

- Final fresh snapshot captured with read-only transaction only.
- SQL artifact generated but not executed.
- SQL artifact has no COMMIT statement and contains ROLLBACK.
- No DB writes.
- No migrations.
- No cleanup.
- No quarantine.
- No real apply authorization.

## Source Reports

- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01b_fut2020_final_snapshot_transaction_artifact_v1.json\`
- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01b_fut2020_final_snapshot_transaction_artifact_v1.md\`
- \`docs/sql/english_master_index_pkg01b_fut2020_guarded_dry_run_transaction_v1.sql\`

`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-01B-FUT2020 Final Snapshot Transaction Artifact Checkpoint V1](20260609_pkg01b_fut2020_final_snapshot_transaction_artifact_checkpoint_v1.md) | Records the preparation-only final fresh snapshot and rollback-only guarded dry-run transaction artifact for fut2020 cards #2-#5, with four parent set_code updates and eight child delete candidates still not executed. |';
  const current = fs.readFileSync(indexPath, 'utf8');
  if (current.includes('20260609_pkg01b_fut2020_final_snapshot_transaction_artifact_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg01b_fut2020_final_snapshot_transaction_artifact_checkpoint_v1.md')
            ? line
            : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const preview = readJson(PREVIEW_JSON);
const approvalGate = readJson(APPROVAL_GATE_JSON);
const snapshot = await captureFreshSnapshot();
const report = buildReport(preview, approvalGate, snapshot);

writeJson(OUTPUT_JSON, report);
fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));
fs.writeFileSync(CHECKPOINT_MD, renderCheckpoint(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  generated_files: [
    path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    path.relative(ROOT, OUTPUT_SQL).replaceAll('\\', '/'),
    path.relative(ROOT, CHECKPOINT_MD).replaceAll('\\', '/'),
  ],
  artifact_status: report.artifact_status,
  package_id: report.package_scope.package_id,
  package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
  snapshot_hash_sha256: report.fresh_snapshot.snapshot_hash_sha256,
  parent_set_code_updates: report.package_scope.parent_set_code_updates,
  child_keep_rows: report.package_scope.child_keep_rows,
  child_delete_candidates: report.package_scope.child_delete_candidates,
  transaction_artifact_executed: report.transaction_artifact_executed,
  contains_commit_statement: report.guarded_dry_run_transaction_artifact.contains_commit_statement,
  contains_rollback_statement: report.guarded_dry_run_transaction_artifact.contains_rollback_statement,
  write_ready_now: report.write_ready_now,
  apply_allowed: report.apply_allowed,
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
  stop_findings: report.stop_findings.length,
}, null, 2));

if (!report.pass) process.exitCode = 1;
