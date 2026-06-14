import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08b_parent_identity_adjudication_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08c_duplicate_parent_transfer_plan_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08c_duplicate_parent_transfer_plan_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08c_duplicate_parent_transfer_plan_checkpoint_v1.md');

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

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function qident(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function countBy(rows, keyFn) {
  const out = {};
  for (const row of rows) out[keyFn(row)] = (out[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([left], [right]) => left.localeCompare(right)));
}

function groupDuplicateRows(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = [
      normalizeText(row.set_key),
      normalizeNumber(row.card_number),
      normalizeText(row.card_name),
    ].join('|');
    if (!groups.has(key)) {
      groups.set(key, {
        group_key: key,
        set_key: row.set_key,
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        finish_keys_needed: new Set(),
        source_rows: [],
        candidate_ids: new Set(),
      });
    }
    const group = groups.get(key);
    group.finish_keys_needed.add(row.finish_key);
    group.source_rows.push(row);
    for (const candidate of row.same_number_candidates ?? []) {
      group.candidate_ids.add(candidate.card_print_id);
    }
  }
  return [...groups.values()].map((group) => ({
    ...group,
    finish_keys_needed: [...group.finish_keys_needed].sort(),
    candidate_ids: [...group.candidate_ids].sort(),
  }));
}

async function listForeignKeys(client, referencedTable) {
  const result = await client.query(
    `select
       rel.relname as table_name,
       att.attname as column_name,
       pg_get_constraintdef(con.oid) as constraint_def
     from pg_constraint con
     join pg_class rel on rel.oid = con.conrelid
     join pg_namespace rel_ns on rel_ns.oid = rel.relnamespace
     join pg_class ref on ref.oid = con.confrelid
     join unnest(con.conkey) with ordinality as cols(attnum, ord) on true
     join pg_attribute att on att.attrelid = rel.oid and att.attnum = cols.attnum
     where con.contype = 'f'
       and rel_ns.nspname = 'public'
       and ref.relname = $1
     order by rel.relname, att.attname`,
    [referencedTable],
  );
  return result.rows;
}

async function countReferences(client, foreignKeys, targetIds) {
  if (targetIds.length === 0) return [];
  const rows = [];
  for (const fk of foreignKeys) {
    const result = await client.query(
      `select ${qident(fk.column_name)}::text as target_id, count(*)::int as refs
       from public.${qident(fk.table_name)}
       where ${qident(fk.column_name)} = any($1::uuid[])
       group by ${qident(fk.column_name)}`,
      [targetIds],
    );
    rows.push({
      table: fk.table_name,
      column: fk.column_name,
      constraint_def: fk.constraint_def,
      total_refs: result.rows.reduce((sum, row) => sum + Number(row.refs), 0),
      by_id: Object.fromEntries(result.rows.map((row) => [row.target_id, Number(row.refs)])),
    });
  }
  return rows;
}

async function readCardPrintRows(client, ids) {
  if (ids.length === 0) return [];
  const result = await client.query(
    `select
       cp.id::text,
       to_jsonb(cp) as card_print,
       s.code as resolved_set_code,
       s.name as resolved_set_name,
       coalesce((
         select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id)
         from public.card_printings cpr
         where cpr.card_print_id = cp.id
       ), '[]'::jsonb) as card_printings,
       coalesce((
         select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id)
         from public.external_mappings em
         where em.card_print_id = cp.id
       ), '[]'::jsonb) as external_mappings
     from public.card_prints cp
     left join public.sets s on s.id = cp.set_id
     where cp.id = any($1::uuid[])
     order by s.code nulls first, cp.number_plain nulls first, cp.number nulls first, cp.name, cp.id`,
    [ids],
  );
  return result.rows.map((row) => ({
    card_print_id: row.id,
    card_print: row.card_print,
    resolved_set_code: row.resolved_set_code,
    resolved_set_name: row.resolved_set_name,
    card_printings: row.card_printings,
    external_mappings: row.external_mappings,
  }));
}

function refsForId(referenceRows, id) {
  const byTable = referenceRows
    .map((row) => ({
      table: row.table,
      column: row.column,
      refs: row.by_id[id] ?? 0,
      constraint_def: row.constraint_def,
    }))
    .filter((row) => row.refs > 0);
  return {
    total_refs: byTable.reduce((sum, row) => sum + row.refs, 0),
    by_table: byTable,
  };
}

function hasOwnershipRefs(refs) {
  return refs.by_table.some((dep) => /vault|shared|wishlist|listing|slab|intent|interaction|offer|order|transaction|sale/i.test(dep.table));
}

function nonTrivialParentRefs(refs) {
  return refs.by_table.filter((dep) => dep.table !== 'external_mappings');
}

function buildPlan(group, cardRowsById, parentRefs, childRefs) {
  const candidates = group.candidate_ids
    .map((id) => cardRowsById.get(id))
    .filter(Boolean)
    .map((row) => {
      const childIds = row.card_printings.map((child) => child.id);
      const childReferenceTotals = childIds.map((id) => refsForId(childRefs, id));
      const parentReferenceTotals = refsForId(parentRefs, row.card_print_id);
      return {
        card_print_id: row.card_print_id,
        set_code: row.card_print?.set_code ?? row.resolved_set_code,
        number: row.card_print?.number,
        number_plain: row.card_print?.number_plain,
        name: row.card_print?.name,
        rarity: row.card_print?.rarity,
        child_count: row.card_printings.length,
        finishes: [...new Set(row.card_printings.map((child) => child.finish_key).filter(Boolean))].sort(),
        external_mapping_count: row.external_mappings.length,
        parent_refs: parentReferenceTotals,
        child_refs_total: childReferenceTotals.reduce((sum, refs) => sum + refs.total_refs, 0),
        ownership_or_vault_refs: hasOwnershipRefs(parentReferenceTotals) || childReferenceTotals.some(hasOwnershipRefs),
      };
    });

  const populated = candidates.filter((row) => row.child_count > 0);
  const empty = candidates.filter((row) => row.child_count === 0);
  let readiness = 'blocked_no_clear_survivor';
  let recommended_next_step = 'manual_identity_review_before_any_dry_run';
  let survivor = null;
  let blocked = [];

  if (populated.length === 1 && empty.length > 0) {
    survivor = populated[0];
    blocked = empty;
    const blockedHasOwnership = blocked.some((row) => row.ownership_or_vault_refs);
    const blockedHasChildRefs = blocked.some((row) => row.child_refs_total > 0);
    const blockedNeedsDependencyTransfer = blocked.some((row) => nonTrivialParentRefs(row.parent_refs).length > 0);
    readiness = blockedHasOwnership
      ? 'blocked_vault_or_ownership_dependency_review_required'
      : blockedHasChildRefs
        ? 'blocked_child_dependency_review_required'
        : blockedNeedsDependencyTransfer
          ? 'dependency_transfer_strategy_required'
          : 'dry_run_candidate_external_mapping_transfer';
    recommended_next_step = readiness === 'dry_run_candidate_external_mapping_transfer'
      ? 'prepare_rollback_only_duplicate_parent_transfer_dry_run_artifact'
      : readiness === 'dependency_transfer_strategy_required'
        ? 'classify_and_transfer_non_ownership_dependencies_before_dry_run_artifact'
      : 'review_references_before_any_transfer_artifact';
  } else if (populated.length > 1) {
    readiness = 'blocked_multiple_populated_parent_candidates';
    recommended_next_step = 'manual_survivor_selection_required';
  } else if (empty.length > 1) {
    readiness = 'blocked_all_candidates_empty';
    recommended_next_step = 'resolve_canonical_parent_before_any_transfer_or_insert';
  }

  return {
    group_key: group.group_key,
    readiness,
    recommended_next_step,
    set_key: group.set_key,
    set_name: group.set_name,
    card_number: group.card_number,
    card_name: group.card_name,
    finish_keys_needed: group.finish_keys_needed,
    source_row_count: group.source_rows.length,
    survivor_card_print_id: survivor?.card_print_id ?? null,
    blocked_card_print_ids: blocked.map((row) => row.card_print_id),
    candidates,
    blocked_dependency_tables: [...new Set(blocked.flatMap((row) => row.parent_refs.by_table.map((dep) => dep.table)))].sort(),
    safety_notes: [
      'This plan is read-only and does not authorize merge/delete/apply.',
      'Survivor choice is automatic only when exactly one populated parent exists and the rest are empty.',
      'Rows with ownership, vault, child dependency, non-trivial parent dependency, or multiple populated candidates are blocked from simple dry-run artifact generation.',
    ],
  };
}

function summarize(plans) {
  const dryRunPlans = plans.filter((row) => row.readiness === 'dry_run_candidate_external_mapping_transfer');
  return {
    source_duplicate_rows: plans.reduce((sum, row) => sum + row.source_row_count, 0),
    grouped_duplicate_parent_cases: plans.length,
    by_readiness: countBy(plans, (row) => row.readiness),
    dry_run_candidate_groups: dryRunPlans.length,
    dry_run_candidate_blocked_parent_rows: dryRunPlans.reduce((sum, row) => sum + row.blocked_card_print_ids.length, 0),
    dry_run_candidate_survivor_parent_rows: new Set(dryRunPlans.map((row) => row.survivor_card_print_id).filter(Boolean)).size,
    blocked_groups: plans.length - dryRunPlans.length,
    groups_with_vault_or_ownership_refs: plans.filter((row) => row.candidates.some((candidate) => candidate.ownership_or_vault_refs)).length,
    dependency_transfer_strategy_required_groups: plans.filter((row) => row.readiness === 'dependency_transfer_strategy_required').length,
    dependency_tables: Object.entries(plans
      .filter((row) => row.readiness === 'dependency_transfer_strategy_required')
      .flatMap((row) => row.blocked_dependency_tables)
      .reduce((acc, table) => {
        acc[table] = (acc[table] ?? 0) + 1;
        return acc;
      }, {}))
      .map(([table, count]) => ({ table, count }))
      .sort((left, right) => right.count - left.count || left.table.localeCompare(right.table)),
    by_set: Object.entries(countBy(plans, (row) => row.set_key))
      .map(([set_key, count]) => ({ set_key, count }))
      .sort((left, right) => right.count - left.count || left.set_key.localeCompare(right.set_key)),
  };
}

function renderMarkdown(report) {
  const readinessRows = Object.entries(report.summary.by_readiness).map(([readiness, count]) => [readiness, count]);
  const setRows = report.summary.by_set.slice(0, 30).map((row) => [row.set_key, row.count]);
  const candidateRows = report.transfer_plans
    .filter((row) => row.readiness === 'dry_run_candidate_external_mapping_transfer')
    .slice(0, 60)
    .map((row) => [
      row.set_key,
      `${row.card_number} ${row.card_name}`,
      row.finish_keys_needed.join(', '),
      row.survivor_card_print_id,
      row.blocked_card_print_ids.join(', '),
    ]);

  return `# PKG-08C Duplicate Parent Transfer Plan V1

Read-only transfer planning for PKG-08B duplicate exact parent cases.

No DB writes, migrations, cleanup, quarantine, merge, delete, SQL artifact, or apply path was executed.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- merge_performed: ${report.merge_performed}
- delete_performed: ${report.delete_performed}

## Summary

- status: \`${report.audit_status}\`
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- grouped_duplicate_parent_cases: ${report.summary.grouped_duplicate_parent_cases}
- dry_run_candidate_groups: ${report.summary.dry_run_candidate_groups}
- dry_run_candidate_blocked_parent_rows: ${report.summary.dry_run_candidate_blocked_parent_rows}
- blocked_groups: ${report.summary.blocked_groups}
- groups_with_vault_or_ownership_refs: ${report.summary.groups_with_vault_or_ownership_refs}
- dependency_transfer_strategy_required_groups: ${report.summary.dependency_transfer_strategy_required_groups}

## Readiness

${markdownTable(['readiness', 'count'], readinessRows)}

## Top Sets

${markdownTable(['set', 'groups'], setRows)}

## Dependency Tables Requiring Strategy

${report.summary.dependency_tables.length ? markdownTable(['table', 'groups'], report.summary.dependency_tables.map((row) => [row.table, row.count])) : 'No non-trivial dependency tables found.'}

## Dry-Run Candidate Preview

${candidateRows.length ? markdownTable(['set', 'card', 'needed_finishes', 'survivor_parent', 'blocked_parent_rows'], candidateRows) : 'No dry-run candidates.'}

## Next Step

Prepare a rollback-only dry-run artifact only for \`dry_run_candidate_external_mapping_transfer\` rows. Keep blocked rows excluded until manual survivor/reference review is complete.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08C Duplicate Parent Transfer Plan Checkpoint V1](20260610_pkg08c_duplicate_parent_transfer_plan_checkpoint_v1.md) | Read-only duplicate parent transfer plan from PKG-08B; identifies rollback-only dry-run candidates and blocked rows. No writes or migrations. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08c_duplicate_parent_transfer_plan_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08c_duplicate_parent_transfer_plan_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const source = readJson(SOURCE_JSON);
  const duplicateRows = (source.rows ?? []).filter((row) => row.adjudication_lane === 'duplicate_exact_parent');
  const groups = groupDuplicateRows(duplicateRows);
  const allCandidateIds = [...new Set(groups.flatMap((group) => group.candidate_ids))].sort();
  const conn = connectionString();
  const stopFindings = [];
  let cardRows = [];
  let referenceSurface = { database_available: Boolean(conn), parent_foreign_keys: 0, child_foreign_keys: 0 };
  let parentRefs = [];
  let childRefs = [];

  if (!conn) {
    stopFindings.push('database_connection_unavailable');
  } else {
    const client = new Client({ connectionString: conn });
    await client.connect();
    try {
      await client.query('begin read only');
      await client.query('set transaction read only');
      const parentFks = await listForeignKeys(client, 'card_prints');
      const childFks = await listForeignKeys(client, 'card_printings');
      cardRows = await readCardPrintRows(client, allCandidateIds);
      const childIds = cardRows.flatMap((row) => row.card_printings.map((child) => child.id));
      parentRefs = await countReferences(client, parentFks, allCandidateIds);
      childRefs = await countReferences(client, childFks, childIds);
      await client.query('rollback');
      referenceSurface = {
        database_available: true,
        parent_foreign_keys: parentFks.length,
        child_foreign_keys: childFks.length,
      };
      if (cardRows.length !== allCandidateIds.length) stopFindings.push('candidate_card_print_rows_missing');
    } catch (error) {
      await client.query('rollback').catch(() => {});
      stopFindings.push(`database_read_failed: ${error.message}`);
    } finally {
      await client.end().catch(() => {});
    }
  }

  const cardRowsById = new Map(cardRows.map((row) => [row.card_print_id, row]));
  const transferPlans = groups.map((group) => buildPlan(group, cardRowsById, parentRefs, childRefs));
  const summary = summarize(transferPlans);
  const packagePayload = {
    package_id: 'PKG-08C-DUPLICATE-PARENT-TRANSFER-PLAN',
    dry_run_candidate_groups: transferPlans
      .filter((row) => row.readiness === 'dry_run_candidate_external_mapping_transfer')
      .map((row) => ({
        group_key: row.group_key,
        survivor_card_print_id: row.survivor_card_print_id,
        blocked_card_print_ids: row.blocked_card_print_ids,
      })),
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg08c_duplicate_parent_transfer_plan_v1',
    package_id: 'PKG-08C-DUPLICATE-PARENT-TRANSFER-PLAN',
    audit_only: true,
    db_reads_performed: Boolean(conn),
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    merge_performed: false,
    delete_performed: false,
    apply_paths_executed: false,
    audit_status: stopFindings.length === 0
      ? 'pkg08c_duplicate_parent_transfer_plan_complete_no_write'
      : 'pkg08c_duplicate_parent_transfer_plan_blocked',
    package_fingerprint_sha256: sha256(stableJson(packagePayload)),
    source_artifacts: {
      parent_identity_adjudication: path.relative(ROOT, SOURCE_JSON).replaceAll('\\', '/'),
    },
    reference_surface: referenceSurface,
    summary,
    transfer_plans: transferPlans,
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };

  writeJson(OUTPUT_JSON, report);
  writeText(OUTPUT_MD, renderMarkdown(report));
  writeText(CHECKPOINT_MD, renderMarkdown(report));
  updateCheckpointIndex();

  console.log(JSON.stringify({
    audit_status: report.audit_status,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    summary: report.summary,
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    db_writes_performed: false,
    migrations_created: false,
    stop_findings: stopFindings,
  }, null, 2));

  if (!report.pass) process.exitCode = 1;
}

await main();
