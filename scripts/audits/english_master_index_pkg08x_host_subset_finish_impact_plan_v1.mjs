import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08w_host_subset_collision_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08x_host_subset_finish_impact_plan_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08x_host_subset_finish_impact_plan_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08x_host_subset_finish_impact_plan_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08X-HOST-SUBSET-FINISH-IMPACT-PLAN';

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function readJsonSync(filePath) {
  return JSON.parse(fsSync.readFileSync(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function loadChildPrintings(parentIds) {
  const conn = connectionString();
  if (!conn || parentIds.length === 0) {
    return {
      available: Boolean(conn),
      reason: conn ? null : 'database_connection_unavailable',
      child_rows: [],
      dependency_tables: [],
      dependency_counts_by_child_id: {},
      dependency_errors: [],
    };
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const childResult = await client.query(
      `select
         cpr.id::text as card_printing_id,
         cpr.card_print_id::text as card_print_id,
         cpr.finish_key,
         cpr.created_at
       from public.card_printings cpr
       where cpr.card_print_id = any($1::uuid[])
       order by cpr.card_print_id, cpr.finish_key, cpr.id`,
      [parentIds],
    );

    const childIds = childResult.rows.map((row) => row.card_printing_id);
    const tableResult = await client.query(
      `select
         c.table_schema,
         c.table_name,
         coalesce(t.table_type, 'UNKNOWN') as table_type
       from information_schema.columns c
       left join information_schema.tables t
         on t.table_schema = c.table_schema
        and t.table_name = c.table_name
       where c.table_schema = 'public'
         and c.column_name = 'card_printing_id'
         and c.table_name <> 'card_printings'
       order by c.table_schema, c.table_name`,
    );

    const dependencyCountsByChildId = Object.fromEntries(childIds.map((id) => [id, {}]));
    const dependencyErrors = [];
    for (const table of tableResult.rows) {
      const schemaName = table.table_schema;
      const tableName = table.table_name;
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName) || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
        dependencyErrors.push({ table_schema: schemaName, table_name: tableName, reason: 'unsafe_identifier' });
        continue;
      }
      try {
        const depResult = await client.query(
          `select card_printing_id::text, count(*)::int as ref_count
           from ${quoteIdent(schemaName)}.${quoteIdent(tableName)}
           where card_printing_id = any($1::uuid[])
           group by card_printing_id`,
          [childIds],
        );
        for (const dep of depResult.rows) {
          dependencyCountsByChildId[dep.card_printing_id][`${schemaName}.${tableName}`] = {
            ref_count: Number(dep.ref_count),
            table_type: table.table_type,
            durable: table.table_type === 'BASE TABLE',
          };
        }
      } catch (error) {
        dependencyErrors.push({ table_schema: schemaName, table_name: tableName, reason: error.message });
      }
    }

    await client.query('rollback');
    return {
      available: true,
      reason: null,
      child_rows: childResult.rows,
      dependency_tables: tableResult.rows.map((row) => ({
        table: `${row.table_schema}.${row.table_name}`,
        table_type: row.table_type,
        durable: row.table_type === 'BASE TABLE',
      })),
      dependency_counts_by_child_id: dependencyCountsByChildId,
      dependency_errors: dependencyErrors,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: error.message,
      child_rows: [],
      dependency_tables: [],
      dependency_counts_by_child_id: {},
      dependency_errors: [],
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function totalDeps(depMap) {
  return Object.values(depMap ?? {}).reduce((sum, value) => sum + Number(value?.ref_count ?? value ?? 0), 0);
}

function totalDurableDeps(depMap) {
  return Object.values(depMap ?? {}).reduce((sum, value) => (
    value?.durable ? sum + Number(value.ref_count ?? 0) : sum
  ), 0);
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_impact_status).map(([status, count]) => [status, count]);
  const finishRows = Object.entries(report.summary.extra_child_rows_by_finish).map(([finish, count]) => [finish, count]);
  const nextRows = report.recommended_next_packages.map((row) => [
    row.package_id,
    row.scope,
    row.candidate_rows,
    row.status,
    row.allowed_write_shape,
  ]);

  return `# PKG-08X Host/Subset Finish Impact Plan V1

Read-only finish-impact plan for the \`swsh4.5\` / \`swsh45sv\` Shiny Vault collision lane.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- source_rows: ${report.summary.source_rows}
- target_child_rows_to_preserve: ${report.summary.target_child_rows_to_preserve}
- extra_child_rows_impacted: ${report.summary.extra_child_rows_impacted}
- extra_child_rows_with_dependencies: ${report.summary.extra_child_rows_with_dependencies}
- extra_child_rows_with_durable_dependencies: ${report.summary.extra_child_rows_with_durable_dependencies}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- source_pkg08w_fingerprint_sha256: \`${report.source_pkg08w_fingerprint_sha256}\`

${markdownTable(['impact_status', 'rows'], statusRows)}

${markdownTable(['extra_finish', 'child_rows'], finishRows)}

## Recommended Next Packages

${markdownTable(['package_id', 'scope', 'candidate_rows', 'status', 'allowed_write_shape'], nextRows)}

## Decision

This lane cannot be treated as a simple insert package. The target \`normal\` child printing already exists on each mapped parent, but \`holo\` and \`reverse\` child rows would also move if the parent is relocated.

No write is authorized by this report.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08X Host/Subset Finish Impact Plan Checkpoint V1](20260610_pkg08x_host_subset_finish_impact_plan_checkpoint_v1.md) | Read-only impact plan for swsh4.5 host/subset collision extra child finishes. No writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08x_host_subset_finish_impact_plan_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08x_host_subset_finish_impact_plan_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = readJsonSync(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => (
  row.readiness_status === 'blocked_host_subset_alias_candidate_with_extra_child_finishes'
));
const parentIds = [...new Set(sourceRows.map((row) => row.mapped_parent?.card_print_id).filter(Boolean))];
const live = await loadChildPrintings(parentIds);
const childrenByParent = new Map();
for (const child of live.child_rows) {
  if (!childrenByParent.has(child.card_print_id)) childrenByParent.set(child.card_print_id, []);
  childrenByParent.get(child.card_print_id).push(child);
}

const rows = [];
for (const row of sourceRows) {
  const parentId = row.mapped_parent.card_print_id;
  const liveChildren = childrenByParent.get(parentId) ?? [];
  const targetChildren = liveChildren.filter((child) => child.finish_key === row.finish_key);
  const extraChildren = liveChildren.filter((child) => row.extra_child_finishes_on_mapped_parent.includes(child.finish_key));
  const extraChildImpacts = extraChildren.map((child) => {
    const dependency_counts = live.dependency_counts_by_child_id[child.card_printing_id] ?? {};
    return {
      card_printing_id: child.card_printing_id,
      finish_key: child.finish_key,
      dependency_counts,
      dependency_total: totalDeps(dependency_counts),
      durable_dependency_total: totalDurableDeps(dependency_counts),
    };
  });
  const extraDependencyTotal = extraChildImpacts.reduce((sum, child) => sum + child.dependency_total, 0);
  const extraDurableDependencyTotal = extraChildImpacts.reduce((sum, child) => sum + child.durable_dependency_total, 0);
  let impact_status = 'relocation_plus_extra_finish_cleanup_dry_run_candidate';
  let recommended_next_action = 'A future package may dry-run parent relocation plus exact extra child cleanup only after explicit delete authority is granted.';
  if (targetChildren.length !== 1) {
    impact_status = 'blocked_target_child_ambiguity';
    recommended_next_action = 'Do not write. Target child printing is missing or ambiguous on the mapped parent.';
  } else if (extraChildImpacts.length === 0) {
    impact_status = 'clean_parent_relocation_candidate';
    recommended_next_action = 'A future package may dry-run parent relocation only; no extra child finishes were found.';
  } else if (extraDurableDependencyTotal > 0) {
    impact_status = 'blocked_extra_child_dependencies_present';
    recommended_next_action = 'Do not cleanup/delete. Extra child rows have dependencies that require a separate dependency strategy.';
  } else if (extraDependencyTotal > 0) {
    impact_status = 'relocation_plus_extra_finish_cleanup_dry_run_candidate_derived_view_refs_only';
    recommended_next_action = 'A future package may dry-run parent relocation plus exact extra child cleanup; observed dependencies are derived views only.';
  }

  rows.push({
    impact_status,
    recommended_next_action,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    target_finish_key: row.finish_key,
    mapped_parent: row.mapped_parent,
    target_child_printings_to_preserve: targetChildren.map((child) => ({
      card_printing_id: child.card_printing_id,
      finish_key: child.finish_key,
    })),
    extra_child_printings_impacted: extraChildImpacts,
    extra_child_dependency_total: extraDependencyTotal,
    extra_child_durable_dependency_total: extraDurableDependencyTotal,
    evidence_urls: row.evidence_urls,
  });
}

const extraChildRows = rows.flatMap((row) => row.extra_child_printings_impacted.map((child) => ({
  ...child,
  parent_card_number: row.card_number,
})));
const byImpactStatus = countBy(rows, (row) => row.impact_status);
const extraChildRowsByFinish = countBy(extraChildRows, (row) => row.finish_key);
const extraChildRowsWithDependencies = extraChildRows.filter((row) => row.dependency_total > 0).length;
const extraChildRowsWithDurableDependencies = extraChildRows.filter((row) => row.durable_dependency_total > 0).length;
const targetChildRowsToPreserve = rows.reduce((sum, row) => sum + row.target_child_printings_to_preserve.length, 0);

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08x_host_subset_finish_impact_plan_v1',
  package_id: PACKAGE_ID,
  source_pkg08w_fingerprint_sha256: source.package_fingerprint_sha256 ?? null,
  package_fingerprint_sha256: stableHash(rows.map((row) => ({
    card_print_id: row.mapped_parent.card_print_id,
    card_number: row.card_number,
    card_name: row.card_name,
    impact_status: row.impact_status,
    target_child_printings_to_preserve: row.target_child_printings_to_preserve,
    extra_child_printings_impacted: row.extra_child_printings_impacted,
  }))),
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  live_read: {
    available: live.available,
    reason: live.reason,
    parent_ids_read: parentIds.length,
    child_rows_read: live.child_rows.length,
    dependency_tables_checked: live.dependency_tables,
    dependency_errors: live.dependency_errors,
  },
  summary: {
    source_rows: sourceRows.length,
    classified_rows: rows.length,
    by_impact_status: byImpactStatus,
    target_child_rows_to_preserve: targetChildRowsToPreserve,
    extra_child_rows_impacted: extraChildRows.length,
    extra_child_rows_by_finish: extraChildRowsByFinish,
    extra_child_rows_with_dependencies: extraChildRowsWithDependencies,
    extra_child_rows_with_durable_dependencies: extraChildRowsWithDurableDependencies,
  },
  recommended_next_packages: [
    {
      package_id: 'PKG-08Y',
      scope: 'host_subset_parent_relocation_plus_extra_child_cleanup_dry_run',
      candidate_rows: (byImpactStatus.relocation_plus_extra_finish_cleanup_dry_run_candidate ?? 0) +
        (byImpactStatus.relocation_plus_extra_finish_cleanup_dry_run_candidate_derived_view_refs_only ?? 0),
      status: ((byImpactStatus.relocation_plus_extra_finish_cleanup_dry_run_candidate ?? 0) +
        (byImpactStatus.relocation_plus_extra_finish_cleanup_dry_run_candidate_derived_view_refs_only ?? 0)) > 0
        ? 'eligible_for_guarded_dry_run_preparation_requires_explicit_cleanup_authority'
        : 'blocked_no_candidates',
      allowed_write_shape: 'future guarded dry-run only: parent set relocation plus exact extra child cleanup; no global apply',
    },
    {
      package_id: 'PKG-08Z',
      scope: 'extra_child_dependency_strategy',
      candidate_rows: byImpactStatus.blocked_extra_child_dependencies_present ?? 0,
      status: (byImpactStatus.blocked_extra_child_dependencies_present ?? 0) > 0
        ? 'read_only_dependency_strategy_required'
        : 'blocked_no_candidates',
      allowed_write_shape: 'none until dependency strategy exists',
    },
  ],
  rows,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  checkpoint_md: CHECKPOINT_MD,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  summary: report.summary,
  recommended_next_packages: report.recommended_next_packages,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
