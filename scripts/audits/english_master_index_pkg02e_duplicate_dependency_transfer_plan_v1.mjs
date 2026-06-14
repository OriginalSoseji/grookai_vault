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
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const ADJUDICATION_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02d_collision_adjudication_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02e_duplicate_dependency_transfer_plan_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg02e_duplicate_dependency_transfer_plan_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg02e_duplicate_dependency_transfer_plan_checkpoint_v1.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
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

function qident(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
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
  const rows = [];
  for (const fk of foreignKeys) {
    const query = `select ${qident(fk.column_name)}::text as target_id, count(*)::int as refs
                   from public.${qident(fk.table_name)}
                   where ${qident(fk.column_name)} = any($1::uuid[])
                   group by ${qident(fk.column_name)}`;
    const result = await client.query(query, [targetIds]);
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
  const result = await client.query(
    `select
       cp.id,
       to_jsonb(cp) as card_print,
       s.code as resolved_set_code,
       s.name as resolved_set_name,
       coalesce((
         select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id)
         from public.card_printings cpr
         where cpr.card_print_id = cp.id
       ), '[]'::jsonb) as card_printings
     from public.card_prints cp
     left join public.sets s on s.id = cp.set_id
     where cp.id = any($1::uuid[])
     order by s.code nulls first, cp.number_plain nulls first, cp.name, cp.id`,
    [ids],
  );
  return result.rows.map((row) => ({
    card_print_id: row.id,
    card_print: row.card_print,
    resolved_set_code: row.resolved_set_code,
    resolved_set_name: row.resolved_set_name,
    card_printings: row.card_printings,
  }));
}

function totalsForId(referenceRows, id) {
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

function buildPairPlan({ row, cardRowsById, parentRefs, childRefs }) {
  const survivorId = row.conflict_rows[0]?.card_print_id;
  const blockedId = row.blocked_card_print_id;
  const blocked = cardRowsById.get(blockedId);
  const survivor = cardRowsById.get(survivorId);
  const blockedChildren = blocked?.card_printings ?? [];
  const survivorChildren = survivor?.card_printings ?? [];

  const survivorChildByFinish = new Map(survivorChildren.map((child) => [child.finish_key, child]));
  const childPlans = blockedChildren.map((child) => {
    const survivorChild = survivorChildByFinish.get(child.finish_key);
    return {
      blocked_card_printing_id: child.id,
      survivor_card_printing_id: survivorChild?.id ?? null,
      finish_key: child.finish_key,
      duplicate_finish_exists_on_survivor: Boolean(survivorChild),
      blocked_child_refs: totalsForId(childRefs, child.id),
      survivor_child_refs: survivorChild ? totalsForId(childRefs, survivorChild.id) : null,
      action_class: survivorChild
        ? 'transfer_child_dependencies_then_delete_duplicate_child'
        : 'reparent_child_to_survivor_parent',
    };
  });

  const blockedParentRefs = totalsForId(parentRefs, blockedId);
  const survivorParentRefs = totalsForId(parentRefs, survivorId);
  const childDependencyRefs = childPlans.reduce((sum, plan) => sum + plan.blocked_child_refs.total_refs, 0);
  const blockedParentHasCoreDeps = blockedParentRefs.total_refs > 0;
  const allChildrenHaveSurvivorDuplicate = childPlans.every((plan) => plan.duplicate_finish_exists_on_survivor);
  const hasVaultOrOwnershipRefs = [
    ...blockedParentRefs.by_table,
    ...childPlans.flatMap((plan) => plan.blocked_child_refs.by_table),
  ].some((dep) => /vault|shared|wishlist|listing|slab|intent|interaction/i.test(dep.table));

  let readiness = 'blocked_dependency_transfer_plan_required';
  if (hasVaultOrOwnershipRefs) readiness = 'blocked_ownership_or_market_dependency_review_required';
  else if (blockedParentHasCoreDeps || childDependencyRefs > 0) readiness = 'dry_run_candidate_after_dependency_transfer_mapping';
  else if (allChildrenHaveSurvivorDuplicate) readiness = 'dry_run_candidate_simple_duplicate_delete';

  return {
    readiness,
    set_key: row.set_key,
    set_name: row.set_name,
    blocked_card_print_id: blockedId,
    survivor_card_print_id: survivorId,
    target_number: row.target_number,
    target_name: row.target_name,
    blocked_current: {
      set_code: blocked?.card_print?.set_code ?? null,
      number: blocked?.card_print?.number ?? null,
      number_plain: blocked?.card_print?.number_plain ?? null,
      name: blocked?.card_print?.name ?? null,
      finishes: [...new Set(blockedChildren.map((child) => child.finish_key).filter(Boolean))].sort(),
    },
    survivor_current: {
      set_code: survivor?.card_print?.set_code ?? null,
      number: survivor?.card_print?.number ?? null,
      number_plain: survivor?.card_print?.number_plain ?? null,
      name: survivor?.card_print?.name ?? null,
      finishes: [...new Set(survivorChildren.map((child) => child.finish_key).filter(Boolean))].sort(),
    },
    parent_dependency_plan: {
      blocked_parent_refs: blockedParentRefs,
      survivor_parent_refs: survivorParentRefs,
      action_class: blockedParentRefs.total_refs > 0
        ? 'transfer_or_dedupe_parent_dependencies_before_deleting_blocked_parent'
        : 'no_parent_dependency_transfer_needed',
    },
    child_dependency_plan: childPlans,
    risk_flags: {
      all_children_have_survivor_duplicate: allChildrenHaveSurvivorDuplicate,
      blocked_parent_has_dependencies: blockedParentHasCoreDeps,
      blocked_child_dependency_refs: childDependencyRefs,
      has_vault_or_ownership_refs: hasVaultOrOwnershipRefs,
    },
    allowed_next_step: readiness.startsWith('dry_run_candidate')
      ? 'prepare_dependency_transfer_dry_run_artifact_only'
      : 'manual_review_before_dry_run_artifact',
  };
}

function summarize(plans) {
  const byReadiness = {};
  const bySet = {};
  for (const plan of plans) {
    byReadiness[plan.readiness] = (byReadiness[plan.readiness] ?? 0) + 1;
    bySet[plan.set_key] ??= {
      set_key: plan.set_key,
      set_name: plan.set_name,
      total_rows: 0,
      dry_run_candidate_after_dependency_transfer_mapping: 0,
      dry_run_candidate_simple_duplicate_delete: 0,
      blocked_dependency_transfer_plan_required: 0,
      blocked_ownership_or_market_dependency_review_required: 0,
    };
    bySet[plan.set_key].total_rows += 1;
    bySet[plan.set_key][plan.readiness] += 1;
  }
  return {
    total_duplicate_dependency_rows: plans.length,
    by_readiness: byReadiness,
    by_set: Object.values(bySet).sort((left, right) => left.set_key.localeCompare(right.set_key)),
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-02E Duplicate Dependency Transfer Plan V1');
  lines.push('');
  lines.push('This is an audit-only dependency transfer plan for the 21 possible duplicate rows from PKG-02D.');
  lines.push('');
  lines.push('No DB writes, migrations, cleanup, quarantine, merge, delete, or apply operation was performed.');
  lines.push('');
  lines.push('## Result');
  lines.push('');
  lines.push(`- Status: \`${report.audit_status}\``);
  lines.push(`- Duplicate dependency rows reviewed: ${report.summary.total_duplicate_dependency_rows}`);
  lines.push(`- Parent FK surfaces checked: ${report.reference_surface.parent_foreign_keys}`);
  lines.push(`- Child FK surfaces checked: ${report.reference_surface.child_foreign_keys}`);
  lines.push(`- DB writes performed: ${report.db_writes_performed}`);
  lines.push(`- Migrations created: ${report.migrations_created}`);
  lines.push('');
  lines.push('## Readiness');
  lines.push('');
  lines.push('| Readiness | Count |');
  lines.push('| --- | ---: |');
  for (const [status, count] of Object.entries(report.summary.by_readiness)) {
    lines.push(`| ${mdEscape(status)} | ${count} |`);
  }
  lines.push('');
  lines.push('## Set Summary');
  lines.push('');
  lines.push('| Set | Rows | Transfer dry-run candidates | Simple delete candidates | Dependency blocked | Ownership/market blocked |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: |');
  for (const row of report.summary.by_set) {
    lines.push(`| ${mdEscape(row.set_key)} | ${row.total_rows} | ${row.dry_run_candidate_after_dependency_transfer_mapping} | ${row.dry_run_candidate_simple_duplicate_delete} | ${row.blocked_dependency_transfer_plan_required} | ${row.blocked_ownership_or_market_dependency_review_required} |`);
  }
  lines.push('');
  lines.push('## Pair Plans');
  lines.push('');
  lines.push('| Readiness | Set | Target | Blocked deps | Child deps | Next step |');
  lines.push('| --- | --- | --- | ---: | ---: | --- |');
  for (const plan of report.transfer_plans) {
    const blockedDeps = plan.parent_dependency_plan.blocked_parent_refs.total_refs;
    const childDeps = plan.child_dependency_plan.reduce((sum, child) => sum + child.blocked_child_refs.total_refs, 0);
    lines.push(`| ${mdEscape(plan.readiness)} | ${mdEscape(plan.set_key)} | ${mdEscape(`${plan.target_number} ${plan.target_name}`)} | ${blockedDeps} | ${childDeps} | ${mdEscape(plan.allowed_next_step)} |`);
  }
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  for (const item of report.safety) lines.push(`- ${item}`);
  return `${lines.join('\n')}\n`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-02E Duplicate Dependency Transfer Plan Checkpoint V1](20260609_pkg02e_duplicate_dependency_transfer_plan_checkpoint_v1.md) | Audit-only dependency transfer plan for the 21 possible duplicate PKG-02D collision rows; no writes, no merge, no delete. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg02e_duplicate_dependency_transfer_plan_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg02e_duplicate_dependency_transfer_plan_checkpoint_v1.md') ? line : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const adjudication = readJson(ADJUDICATION_JSON);
  const candidates = (adjudication.adjudication_rows ?? [])
    .filter((row) => row.adjudication_status === 'possible_duplicate_dependency_review_required');
  const cardPrintIds = [
    ...candidates.map((row) => row.blocked_card_print_id),
    ...candidates.map((row) => row.conflict_rows[0]?.card_print_id).filter(Boolean),
  ];

  const conn = connectionString();
  const stopFindings = [];
  let transferPlans = [];
  let referenceSurface = {
    parent_foreign_keys: 0,
    child_foreign_keys: 0,
    database_available: Boolean(conn),
  };

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
      const cardRows = await readCardPrintRows(client, cardPrintIds);
      const childIds = cardRows.flatMap((row) => row.card_printings.map((child) => child.id));
      const parentRefs = await countReferences(client, parentFks, cardPrintIds);
      const childRefs = await countReferences(client, childFks, childIds);
      await client.query('rollback');

      const cardRowsById = new Map(cardRows.map((row) => [row.card_print_id, row]));
      transferPlans = candidates.map((row) => buildPairPlan({
        row,
        cardRowsById,
        parentRefs,
        childRefs,
      }));
      referenceSurface = {
        parent_foreign_keys: parentFks.length,
        child_foreign_keys: childFks.length,
        database_available: true,
      };
      if (cardRows.length !== cardPrintIds.length) stopFindings.push('candidate_or_survivor_card_rows_missing');
    } catch (error) {
      await client.query('rollback').catch(() => {});
      stopFindings.push(`database_audit_failed: ${error.message}`);
    } finally {
      await client.end().catch(() => {});
    }
  }

  if (adjudication.audit_status !== 'pkg02d_collision_adjudication_complete_no_write') {
    stopFindings.push('source_adjudication_not_complete');
  }
  if (candidates.length !== 21) stopFindings.push('duplicate_dependency_candidate_count_not_21');

  const summary = summarize(transferPlans);
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg02e_duplicate_dependency_transfer_plan_v1',
    audit_only: true,
    db_reads_performed: Boolean(conn),
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    merge_performed: false,
    delete_performed: false,
    apply_paths_executed: false,
    audit_status: stopFindings.length === 0
      ? 'pkg02e_duplicate_dependency_transfer_plan_complete_no_write'
      : 'pkg02e_duplicate_dependency_transfer_plan_blocked',
    source_artifacts: {
      pkg02d_collision_adjudication: path.relative(ROOT, ADJUDICATION_JSON).replaceAll('\\', '/'),
    },
    reference_surface: referenceSurface,
    summary,
    transfer_plans: transferPlans,
    next_steps: [
      'Do not run a merge/delete apply from this report.',
      'Prepare a rollback-only dry-run artifact only for rows classified as dry-run candidates.',
      'Rows with ownership, market, listing, slab, interaction, vault, or intent dependencies need manual review before any package.',
      'The 58 number-key collision rows remain outside this lane.',
    ],
    safety: [
      'No DB writes were performed.',
      'No migrations were created.',
      'No cleanup, quarantine, merge, delete, or apply path was executed.',
      'This report does not authorize dependency transfer.',
      'This report does not authorize deleting duplicate parents or child printings.',
    ],
    stop_findings: stopFindings,
    report_hash_sha256: sha256(stableJson({ summary, transferPlans })),
    pass: stopFindings.length === 0,
  };

  writeJson(OUTPUT_JSON, report);
  fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));
  fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  fs.writeFileSync(CHECKPOINT_MD, renderMarkdown({
    ...report,
    audit_status: `${report.audit_status}_checkpoint`,
  }));
  updateCheckpointIndex();

  console.log(JSON.stringify({
    audit_status: report.audit_status,
    duplicate_dependency_rows: report.summary.total_duplicate_dependency_rows,
    by_readiness: report.summary.by_readiness,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    stop_findings: report.stop_findings.length,
  }, null, 2));

  if (!report.pass) process.exitCode = 1;
}

await main();
