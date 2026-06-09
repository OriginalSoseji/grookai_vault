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
const COMPLETION_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_completion_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const MASTER_EXPORT_JSON = path.join(COMPLETION_DIR, 'english_master_index_master_admissible_export_v1.json');
const PKG01A_POST_APPLY_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01a_post_apply_reconciliation_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01b_fut2020_dry_run_preview_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg01b_fut2020_dry_run_preview_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg01b_fut2020_dry_run_preview_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-01B-FUT2020';
const SET_KEY = 'fut2020';
const TARGET_NUMBERS = ['2', '3', '4', '5'];
const EXPECTED_FINISH = 'normal';

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

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function packageFingerprint(rows) {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    set_key: SET_KEY,
    target_numbers: TARGET_NUMBERS,
    row_fingerprints: rows.map((row) => row.row_fingerprint_sha256).sort(),
  }));
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
      connected: false,
      error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      rows: [],
      child_dependency_summary: {},
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
         cp.set_code,
         cp.number,
         cp.number_plain,
         cp.name,
         cp.set_id,
         cp.external_ids,
         cp.updated_at,
         coalesce((
           select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id)
           from public.card_printings cpr
           where cpr.card_print_id = cp.id
         ), '[]'::jsonb) as card_printings,
         (select count(*)::int from public.external_mappings em where em.card_print_id = cp.id) as external_mappings_count,
         (select count(*)::int from public.card_print_identity cpi where cpi.card_print_id = cp.id) as identity_rows_count,
         (select count(*)::int from public.card_print_traits cpt where cpt.card_print_id = cp.id) as trait_rows_count,
         (select count(*)::int from public.vault_items vi where vi.card_id = cp.id) as vault_items_count
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
      set_code: row.set_code,
      number: row.number,
      number_plain: row.number_plain,
      name: row.name,
      set_id: row.set_id,
      external_ids: row.external_ids,
      updated_at: row.updated_at,
      card_printings: row.card_printings,
      dependency_counts: {
        external_mappings: row.external_mappings_count,
        card_print_identity: row.identity_rows_count,
        card_print_traits: row.trait_rows_count,
        vault_items: row.vault_items_count,
      },
    }));

    const allChildIds = rows.flatMap((row) => row.card_printings.map((printing) => printing.id));
    const childDependencySummary = allChildIds.length > 0
      ? await countChildDependencies(client, allChildIds)
      : {};
    await client.query('rollback');

    return {
      connected: true,
      error_message: null,
      captured_at: new Date().toISOString(),
      rows,
      hash_sha256: sha256(stableJson(rows)),
      child_dependency_summary: childDependencySummary,
      impact_counts: {
        card_prints_found: rows.length,
        card_printings_found: rows.reduce((sum, row) => sum + row.card_printings.length, 0),
        parent_vault_items_found: rows.reduce((sum, row) => sum + row.dependency_counts.vault_items, 0),
        child_dependency_refs_found: Object.values(childDependencySummary).reduce((sum, dep) => sum + Number(dep.total_refs ?? 0), 0),
      },
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      connected: true,
      error_message: error.message,
      rows: [],
      child_dependency_summary: {},
      impact_counts: {},
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function expectedMasterRows(masterExport) {
  const cards = (masterExport.cards ?? [])
    .filter((row) => row.set_key === SET_KEY && TARGET_NUMBERS.includes(String(row.card_number)))
    .sort((left, right) => Number(left.card_number) - Number(right.card_number));
  const printings = (masterExport.printings ?? [])
    .filter((row) => row.set_key === SET_KEY && TARGET_NUMBERS.includes(String(row.card_number)))
    .sort((left, right) => Number(left.card_number) - Number(right.card_number) || left.finish_key.localeCompare(right.finish_key));
  return { cards, printings };
}

function childDependencyRefsFor(childId, childDependencySummary) {
  return Object.values(childDependencySummary).reduce(
    (sum, dep) => sum + Number(dep.by_card_printing_id?.[childId] ?? 0),
    0,
  );
}

function buildMatrices(expected, snapshot) {
  const expectedCardByNumber = new Map(expected.cards.map((row) => [String(row.card_number), row]));
  const expectedPrintingByNumber = new Map(expected.printings.map((row) => [String(row.card_number), row]));
  const parentMutationMatrix = [];
  const childPrintingMatrix = [];
  const rollbackMatrix = [];

  for (const row of snapshot.rows) {
    const number = String(row.number_plain ?? row.number);
    const expectedCard = expectedCardByNumber.get(number);
    const expectedPrinting = expectedPrintingByNumber.get(number);
    const rowFingerprint = sha256(stableJson({
      card_print_id: row.card_print_id,
      before: {
        set_code: row.set_code,
        number: row.number,
        number_plain: row.number_plain,
        name: row.name,
      },
      after: {
        set_code: SET_KEY,
        number: expectedCard?.card_number ?? row.number,
        name: expectedCard?.card_name ?? row.name,
      },
      expected_finish: expectedPrinting?.finish_key ?? EXPECTED_FINISH,
    }));

    parentMutationMatrix.push({
      card_print_id: row.card_print_id,
      row_fingerprint_sha256: rowFingerprint,
      set_key: SET_KEY,
      set_name: expectedCard?.set_name ?? 'Pokémon Futsal 2020',
      source_external_id: `${SET_KEY}-${number}`,
      source_card_url: `https://api.tcgdex.net/v2/en/cards/${SET_KEY}-${number}`,
      allowed_changed_fields: ['set_code'],
      before_values_from_current_db: {
        set_code: row.set_code,
        number: row.number,
        number_plain: row.number_plain,
        name: row.name,
        set_id: row.set_id,
      },
      approved_after_values: {
        set_code: SET_KEY,
        number: expectedCard?.card_number ?? row.number,
        name: expectedCard?.card_name ?? row.name,
      },
      dry_run_changes: {
        set_code: {
          before: row.set_code,
          after: SET_KEY,
        },
      },
      dependency_counts: row.dependency_counts,
      evidence_sources: expectedCard?.sources ?? [],
      dry_run_row_status: row.set_code === null ? 'preview_only_apply_blocked_no_approval' : 'blocked_unexpected_parent_state',
    });

    const expectedFinish = expectedPrinting?.finish_key ?? EXPECTED_FINISH;
    const childRows = row.card_printings ?? [];
    const keepRows = childRows.filter((printing) => printing.finish_key === expectedFinish);
    const unsupportedRows = childRows.filter((printing) => printing.finish_key !== expectedFinish);
    for (const printing of childRows) {
      const dependencyRefs = childDependencyRefsFor(printing.id, snapshot.child_dependency_summary);
      const action = printing.finish_key === expectedFinish ? 'keep' : 'delete_candidate_requires_separate_approval';
      childPrintingMatrix.push({
        card_print_id: row.card_print_id,
        card_printing_id: printing.id,
        card_number: number,
        card_name: row.name,
        finish_key: printing.finish_key,
        expected_finish_key: expectedFinish,
        action,
        status: action === 'keep' ? 'verified_by_index' : 'unsupported_by_index_candidate',
        child_dependency_refs: dependencyRefs,
        dependency_safe_for_delete_candidate: dependencyRefs === 0,
        provenance_source: printing.provenance_source ?? null,
        provenance_ref: printing.provenance_ref ?? null,
        snapshot_row: printing,
      });
    }

    rollbackMatrix.push({
      card_print_id: row.card_print_id,
      parent_rollback_values_from_current_db_snapshot: {
        set_code: row.set_code,
        number: row.number,
        number_plain: row.number_plain,
        name: row.name,
      },
      child_printing_reinsert_snapshot_for_delete_candidates: unsupportedRows.map((printing) => printing),
      rollback_available: keepRows.length === 1,
      rollback_note: 'Future apply rollback must restore parent set_code and reinsert exact deleted child rows from this snapshot if child deletion is approved later.',
    });
  }

  return { parentMutationMatrix, childPrintingMatrix, rollbackMatrix };
}

function validateReport(report) {
  const findings = [];
  const parentRows = report.parent_mutation_matrix;
  const childRows = report.child_printing_matrix;

  if (!report.fresh_db_snapshot.connected || report.fresh_db_snapshot.error_message) findings.push('fresh_snapshot_unavailable');
  if (report.expected_master_index.cards.length !== 4) findings.push('expected_card_count_not_four');
  if (report.expected_master_index.printings.length !== 4) findings.push('expected_printing_count_not_four');
  if (report.fresh_db_snapshot.impact_counts.card_prints_found !== 4) findings.push('current_db_card_print_count_not_four');
  if (report.fresh_db_snapshot.impact_counts.card_printings_found !== 12) findings.push('current_db_child_printing_count_not_twelve');
  if (parentRows.some((row) => row.before_values_from_current_db.set_code !== null)) findings.push('parent_set_code_not_null');
  if (parentRows.some((row) => row.approved_after_values.set_code !== SET_KEY)) findings.push('parent_after_set_code_not_fut2020');
  if (childRows.filter((row) => row.action === 'keep').length !== 4) findings.push('normal_keep_count_not_four');
  if (childRows.filter((row) => row.action === 'delete_candidate_requires_separate_approval').length !== 8) {
    findings.push('unsupported_child_delete_candidate_count_not_eight');
  }
  if (childRows.some((row) => row.action === 'delete_candidate_requires_separate_approval' && row.child_dependency_refs !== 0)) {
    findings.push('unsupported_child_delete_candidate_has_dependencies');
  }
  if (report.fresh_db_snapshot.impact_counts.parent_vault_items_found !== 0) findings.push('parent_vault_items_present');
  if (report.db_writes_performed !== false) findings.push('db_write_flag_not_false');
  if (report.migrations_created !== false) findings.push('migration_flag_not_false');
  if (report.cleanup_performed !== false) findings.push('cleanup_flag_not_false');
  if (report.quarantine_performed !== false) findings.push('quarantine_flag_not_false');
  if (report.apply_allowed !== false) findings.push('apply_allowed_not_false');
  if (report.write_ready_now !== 0) findings.push('write_ready_now_not_zero');

  return findings;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-01B-FUT2020 Dry-Run Preview V1');
  lines.push('');
  lines.push('This report prepares the next smallest fut2020 reconciliation unit after PKG-01A.');
  lines.push('');
  lines.push('It is read-only and approval-blocked. No SQL was executed, no DB writes occurred, and no migration was created.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| preview_status | ${report.preview_status} |`);
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |`);
  lines.push(`| db_reads_performed | ${report.db_reads_performed} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| cleanup_performed | ${report.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.quarantine_performed} |`);
  lines.push(`| apply_allowed | ${report.apply_allowed} |`);
  lines.push(`| write_ready_now | ${report.write_ready_now} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('| --- | ---: |');
  lines.push(`| target_parent_rows | ${report.package_scope.card_print_rows} |`);
  lines.push(`| current_child_printings | ${report.package_scope.current_child_printings} |`);
  lines.push(`| expected_master_printings | ${report.package_scope.expected_master_printings} |`);
  lines.push(`| parent_set_code_updates_previewed | ${report.summary.parent_set_code_updates_previewed} |`);
  lines.push(`| child_keep_rows | ${report.summary.child_keep_rows} |`);
  lines.push(`| child_delete_candidates_requires_approval | ${report.summary.child_delete_candidates_requires_approval} |`);
  lines.push(`| parent_vault_items_found | ${report.fresh_db_snapshot.impact_counts.parent_vault_items_found} |`);
  lines.push(`| child_dependency_refs_found | ${report.fresh_db_snapshot.impact_counts.child_dependency_refs_found} |`);
  lines.push('');
  lines.push('## Parent Mutation Preview');
  lines.push('');
  lines.push('| # | Card | Card Print ID | Before set_code | After set_code | Status |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const row of report.parent_mutation_matrix) {
    lines.push(`| ${mdEscape(row.before_values_from_current_db.number_plain ?? row.before_values_from_current_db.number)} | ${mdEscape(row.before_values_from_current_db.name)} | ${row.card_print_id} | ${mdEscape(row.before_values_from_current_db.set_code)} | ${row.approved_after_values.set_code} | ${row.dry_run_row_status} |`);
  }
  lines.push('');
  lines.push('## Child Printing Preview');
  lines.push('');
  lines.push('| # | Card | Finish | Action | Dependency refs | Child ID |');
  lines.push('| --- | --- | --- | --- | ---: | --- |');
  for (const row of report.child_printing_matrix) {
    lines.push(`| ${mdEscape(row.card_number)} | ${mdEscape(row.card_name)} | ${mdEscape(row.finish_key)} | ${row.action} | ${row.child_dependency_refs} | ${row.card_printing_id} |`);
  }
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) {
    lines.push('None.');
  } else {
    for (const finding of report.stop_findings) lines.push(`- ${finding}`);
  }
  lines.push('');
  lines.push('## Next Approval Gate');
  lines.push('');
  lines.push('A future guarded dry-run transaction artifact may be prepared only after explicit approval for `PKG-01B-FUT2020`.');
  lines.push('');
  lines.push('Future approval must explicitly cover parent `set_code` updates and child printing delete candidates separately.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function renderCheckpoint(report) {
  return `# PKG-01B-FUT2020 Dry-Run Preview Checkpoint V1

Date: 2026-06-09

## Purpose

Record the read-only dry-run preview package for remaining fut2020 cards #2-#5 after PKG-01A proved the one-row path.

## Result

| Field | Value |
| --- | --- |
| preview_status | ${report.preview_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| target_parent_rows | ${report.package_scope.card_print_rows} |
| current_child_printings | ${report.package_scope.current_child_printings} |
| expected_master_printings | ${report.package_scope.expected_master_printings} |
| parent_set_code_updates_previewed | ${report.summary.parent_set_code_updates_previewed} |
| child_keep_rows | ${report.summary.child_keep_rows} |
| child_delete_candidates_requires_approval | ${report.summary.child_delete_candidates_requires_approval} |
| stop_findings | ${report.stop_findings.length} |

## Safety

- DB reads performed: ${report.db_reads_performed}
- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Quarantine performed: false
- Apply allowed: false
- Write ready now: 0

## Boundary

This checkpoint does not approve writes. The eight unsupported child printings are delete candidates only and require a separate explicit approval plus guarded dry-run transaction artifact.

## Source Reports

- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01b_fut2020_dry_run_preview_v1.json\`
- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01b_fut2020_dry_run_preview_v1.md\`

`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-01B-FUT2020 Dry-Run Preview Checkpoint V1](20260609_pkg01b_fut2020_dry_run_preview_checkpoint_v1.md) | Records the read-only package preview for fut2020 cards #2-#5: four parent set_code fixes, four normal child rows to keep, and eight unsupported child delete candidates blocked pending explicit approval. |';
  const current = fs.readFileSync(indexPath, 'utf8');
  if (current.includes('20260609_pkg01b_fut2020_dry_run_preview_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg01b_fut2020_dry_run_preview_checkpoint_v1.md') ? line : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const masterExport = readJson(MASTER_EXPORT_JSON);
  const pkg01aPostApply = readJson(PKG01A_POST_APPLY_JSON);
  const expected = expectedMasterRows(masterExport);
  const snapshot = await captureFreshSnapshot();
  const matrices = buildMatrices(expected, snapshot);
  const packageFingerprintSha = packageFingerprint(matrices.parentMutationMatrix);

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg01b_fut2020_dry_run_preview_v1',
    audit_only: true,
    dry_run_preview_only: true,
    db_reads_performed: snapshot.connected && !snapshot.error_message,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    approval_recorded: false,
    apply_allowed: false,
    write_ready_now: 0,
    preview_status: 'pending_validation',
    source_artifacts: {
      master_admissible_export: path.relative(ROOT, MASTER_EXPORT_JSON).replaceAll('\\', '/'),
      pkg01a_post_apply_reconciliation: path.relative(ROOT, PKG01A_POST_APPLY_JSON).replaceAll('\\', '/'),
    },
    pkg01a_context: {
      reconciliation_status: pkg01aPostApply.reconciliation_status,
      remaining_unmapped_source_rows: pkg01aPostApply.summary?.remaining_unmapped_source_rows ?? null,
      remaining_unmapped_source_printings: pkg01aPostApply.summary?.remaining_unmapped_source_printings ?? null,
    },
    package_scope: {
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: packageFingerprintSha,
      set_key: SET_KEY,
      set_name: 'Pokémon Futsal 2020',
      target_numbers: TARGET_NUMBERS,
      card_print_rows: matrices.parentMutationMatrix.length,
      current_child_printings: matrices.childPrintingMatrix.length,
      expected_master_printings: expected.printings.length,
      allowed_parent_field_changes: ['set_code'],
      child_printing_actions_require_separate_approval: true,
    },
    expected_master_index: expected,
    fresh_db_snapshot: snapshot,
    parent_mutation_matrix: matrices.parentMutationMatrix,
    child_printing_matrix: matrices.childPrintingMatrix,
    rollback_matrix: matrices.rollbackMatrix,
    summary: {
      parent_set_code_updates_previewed: matrices.parentMutationMatrix.length,
      child_keep_rows: matrices.childPrintingMatrix.filter((row) => row.action === 'keep').length,
      child_delete_candidates_requires_approval: matrices.childPrintingMatrix.filter((row) => row.action === 'delete_candidate_requires_separate_approval').length,
      unsupported_child_finishes: [...new Set(matrices.childPrintingMatrix
        .filter((row) => row.action === 'delete_candidate_requires_separate_approval')
        .map((row) => row.finish_key))].sort(),
    },
    explicit_non_authorizations: [
      'This preview is not approval.',
      'This preview is not an apply runner.',
      'This preview does not execute SQL.',
      'This preview does not write to the database.',
      'This preview does not create a migration.',
      'This preview does not delete child printings.',
      'Child printing delete candidates require separate explicit approval and rollback proof before execution.',
    ],
    stop_findings: [],
    pass: false,
  };

  report.stop_findings = validateReport(report);
  report.preview_status = report.stop_findings.length === 0
    ? 'pkg01b_fut2020_dry_run_preview_ready_apply_blocked_no_write'
    : 'pkg01b_fut2020_dry_run_preview_blocked_stop_findings_present';
  report.pass = report.stop_findings.length === 0;

  writeJson(OUTPUT_JSON, report);
  fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));
  fs.writeFileSync(CHECKPOINT_MD, renderCheckpoint(report));
  updateCheckpointIndex();

  console.log(JSON.stringify({
    generated_files: [
      path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
      path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
      path.relative(ROOT, CHECKPOINT_MD).replaceAll('\\', '/'),
    ],
    preview_status: report.preview_status,
    pass: report.pass,
    package_id: report.package_scope.package_id,
    package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
    target_parent_rows: report.package_scope.card_print_rows,
    current_child_printings: report.package_scope.current_child_printings,
    expected_master_printings: report.package_scope.expected_master_printings,
    child_keep_rows: report.summary.child_keep_rows,
    child_delete_candidates_requires_approval: report.summary.child_delete_candidates_requires_approval,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
    cleanup_performed: report.cleanup_performed,
    quarantine_performed: report.quarantine_performed,
    stop_findings: report.stop_findings.length,
  }, null, 2));

  if (!report.pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
