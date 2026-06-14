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

const COLLISION_AUDIT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02b_full_beta_collision_audit_v1.json');
const PKG02C_APPLY_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02c_full_beta_noncolliding_real_apply_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02d_collision_adjudication_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg02d_collision_adjudication_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg02d_collision_adjudication_checkpoint_v1.md');

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

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function captureRows(cardPrintIds) {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      rows: [],
      hash_sha256: null,
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
       left join public.sets s on s.id = cp.set_id
       where cp.id = any($1::uuid[])
       order by s.code nulls first, cp.number_plain nulls first, cp.number nulls first, cp.name, cp.id`,
      [cardPrintIds],
    );
    await client.query('rollback');
    const rows = result.rows.map((row) => ({
      card_print_id: row.id,
      card_print: row.card_print,
      resolved_set_code: row.resolved_set_code,
      resolved_set_name: row.resolved_set_name,
      card_printings: row.card_printings,
      external_mappings: row.external_mappings,
      card_print_identity: row.card_print_identity,
      card_print_traits: row.card_print_traits,
      vault_items: row.vault_items,
      dependency_counts: {
        card_printings: row.card_printings.length,
        external_mappings: row.external_mappings.length,
        card_print_identity: row.card_print_identity.length,
        card_print_traits: row.card_print_traits.length,
        vault_items: row.vault_items.length,
      },
    }));
    return {
      available: true,
      reason: null,
      captured_at: new Date().toISOString(),
      rows,
      hash_sha256: sha256(stableJson(rows)),
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: error.message,
      rows: [],
      hash_sha256: null,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function classifyCollision({ blockedRow, conflictRows, currentRowsById }) {
  const targetName = normalizeText(blockedRow.target_name);
  const targetNumber = String(blockedRow.target_number ?? '');
  const targetNumberPlain = String(blockedRow.target_number_plain ?? '');
  const currentTarget = currentRowsById.get(blockedRow.card_print_id);
  const conflictDetails = conflictRows.map((row) => {
    const current = currentRowsById.get(row.card_print_id);
    const conflictName = normalizeText(row.name);
    const conflictNumber = String(row.number ?? '');
    const conflictNumberPlain = String(row.number_plain ?? '');
    return {
      ...row,
      current_set_code: current?.card_print?.set_code ?? null,
      current_number: current?.card_print?.number ?? null,
      current_number_plain: current?.card_print?.number_plain ?? null,
      current_name: current?.card_print?.name ?? null,
      current_finishes: [...new Set((current?.card_printings ?? []).map((printing) => printing.finish_key).filter(Boolean))].sort(),
      current_dependency_counts: current?.dependency_counts ?? null,
      exact_number_match: targetNumber === conflictNumber,
      exact_name_match: targetName === conflictName,
      number_plain_match: targetNumberPlain === conflictNumberPlain,
      printed_number_differs: targetNumber !== conflictNumber,
      printed_name_differs: targetName !== conflictName,
    };
  });

  const hasExactDuplicate = conflictDetails.some((row) => row.exact_number_match && row.exact_name_match);
  const hasDistinctPrintedNumberCollision = conflictDetails.some((row) => row.number_plain_match && row.printed_number_differs);
  const hasDistinctNameCollision = conflictDetails.some((row) => row.number_plain_match && row.printed_name_differs);
  const hasDependencyRefs = [
    currentTarget?.dependency_counts?.external_mappings,
    currentTarget?.dependency_counts?.card_print_identity,
    currentTarget?.dependency_counts?.card_print_traits,
    currentTarget?.dependency_counts?.vault_items,
    ...conflictDetails.flatMap((row) => [
      row.current_dependency_counts?.external_mappings,
      row.current_dependency_counts?.card_print_identity,
      row.current_dependency_counts?.card_print_traits,
      row.current_dependency_counts?.vault_items,
    ]),
  ].some((count) => Number(count ?? 0) > 0);

  let adjudicationStatus = 'needs_manual_identity_model_review';
  let recommendedAction = 'blocked_from_apply_until_identity_collision_is_resolved';
  if (hasDistinctPrintedNumberCollision || hasDistinctNameCollision) {
    adjudicationStatus = 'number_plain_identity_collision_not_merge_safe';
    recommendedAction = 'fix_identity_model_or_number_key_strategy_before_parent_update';
  } else if (hasExactDuplicate && !hasDependencyRefs) {
    adjudicationStatus = 'possible_exact_duplicate_merge_candidate';
    recommendedAction = 'prepare_merge_dedupe_dry_run_only_after_row_level_proof';
  } else if (hasExactDuplicate && hasDependencyRefs) {
    adjudicationStatus = 'possible_duplicate_dependency_review_required';
    recommendedAction = 'build_dependency_transfer_plan_before_any_merge';
  }

  return {
    adjudication_status: adjudicationStatus,
    recommended_action: recommendedAction,
    blocked_card_print_id: blockedRow.card_print_id,
    set_key: blockedRow.source_package_set_key,
    set_name: blockedRow.source_package_set_name,
    target_set_code: blockedRow.target_set_code,
    target_number: blockedRow.target_number,
    target_number_plain: blockedRow.target_number_plain,
    target_name: blockedRow.target_name,
    current_target_fields: {
      set_code: currentTarget?.card_print?.set_code ?? null,
      resolved_set_code: currentTarget?.resolved_set_code ?? null,
      number: currentTarget?.card_print?.number ?? null,
      number_plain: currentTarget?.card_print?.number_plain ?? null,
      name: currentTarget?.card_print?.name ?? null,
      finishes: [...new Set((currentTarget?.card_printings ?? []).map((printing) => printing.finish_key).filter(Boolean))].sort(),
      dependency_counts: currentTarget?.dependency_counts ?? null,
    },
    conflict_rows: conflictDetails,
    reason_flags: {
      has_exact_duplicate: hasExactDuplicate,
      has_distinct_printed_number_collision: hasDistinctPrintedNumberCollision,
      has_distinct_name_collision: hasDistinctNameCollision,
      has_dependency_refs: hasDependencyRefs,
      conflict_row_count: conflictDetails.length,
    },
  };
}

function summarize(rows) {
  const byStatus = {};
  const bySet = {};
  for (const row of rows) {
    byStatus[row.adjudication_status] = (byStatus[row.adjudication_status] ?? 0) + 1;
    bySet[row.set_key] ??= {
      set_key: row.set_key,
      set_name: row.set_name,
      total_rows: 0,
      number_plain_identity_collision_not_merge_safe: 0,
      possible_exact_duplicate_merge_candidate: 0,
      possible_duplicate_dependency_review_required: 0,
      needs_manual_identity_model_review: 0,
    };
    bySet[row.set_key].total_rows += 1;
    bySet[row.set_key][row.adjudication_status] += 1;
  }
  return {
    total_blocked_rows: rows.length,
    by_status: byStatus,
    by_set: Object.values(bySet).sort((left, right) => left.set_key.localeCompare(right.set_key)),
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-02D Collision Adjudication V1');
  lines.push('');
  lines.push('This is a read-only adjudication pass for the 79 PKG-02B rows excluded from PKG-02C because they collide with the standard card identity unique index.');
  lines.push('');
  lines.push('No DB writes, migrations, cleanup, quarantine, merge, delete, or apply operation was performed.');
  lines.push('');
  lines.push('## Result');
  lines.push('');
  lines.push(`- Status: \`${report.audit_status}\``);
  lines.push(`- Blocked collision rows reviewed: ${report.summary.total_blocked_rows}`);
  lines.push(`- DB writes performed: ${report.db_writes_performed}`);
  lines.push(`- Migrations created: ${report.migrations_created}`);
  lines.push(`- PKG-02C apply proof: \`${report.pkg02c_apply_status}\``);
  lines.push('');
  lines.push('## Status Counts');
  lines.push('');
  lines.push('| Status | Count |');
  lines.push('| --- | ---: |');
  for (const [status, count] of Object.entries(report.summary.by_status)) {
    lines.push(`| ${mdEscape(status)} | ${count} |`);
  }
  lines.push('');
  lines.push('## Set Summary');
  lines.push('');
  lines.push('| Set | Rows | Number-key collision | Exact duplicate candidate | Dependency review | Manual review |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: |');
  for (const row of report.summary.by_set) {
    lines.push(`| ${mdEscape(row.set_key)} | ${row.total_rows} | ${row.number_plain_identity_collision_not_merge_safe} | ${row.possible_exact_duplicate_merge_candidate} | ${row.possible_duplicate_dependency_review_required} | ${row.needs_manual_identity_model_review} |`);
  }
  lines.push('');
  lines.push('## Top Collision Examples');
  lines.push('');
  lines.push('| Status | Set | Blocked target | Conflicting current row | Reason |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const row of report.adjudication_rows.slice(0, 40)) {
    const conflict = row.conflict_rows[0] ?? {};
    const target = `${row.target_number} ${row.target_name}`;
    const conflictLabel = `${conflict.current_number ?? conflict.number ?? ''} ${conflict.current_name ?? conflict.name ?? ''}`.trim();
    const reasons = Object.entries(row.reason_flags)
      .filter(([, value]) => value === true)
      .map(([key]) => key)
      .join(', ');
    lines.push(`| ${mdEscape(row.adjudication_status)} | ${mdEscape(row.set_key)} | ${mdEscape(target)} | ${mdEscape(conflictLabel)} | ${mdEscape(reasons)} |`);
  }
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  for (const item of report.safety) lines.push(`- ${item}`);
  return `${lines.join('\n')}\n`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-02D Collision Adjudication Checkpoint V1](20260609_pkg02d_collision_adjudication_checkpoint_v1.md) | Read-only adjudication of the 79 PKG-02B collision rows after PKG-02C apply; separates number-key identity collisions from true duplicate candidates. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg02d_collision_adjudication_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg02d_collision_adjudication_checkpoint_v1.md') ? line : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const collisionAudit = readJson(COLLISION_AUDIT_JSON);
  const pkg02cApply = readJson(PKG02C_APPLY_JSON);
  const blockedRows = collisionAudit.blocked_rows ?? [];
  const ids = [
    ...blockedRows.map((row) => row.card_print_id),
    ...blockedRows.flatMap((row) => (row.conflicting_rows ?? []).map((conflict) => conflict.card_print_id)),
  ];
  const uniqueIds = [...new Set(ids)];
  const snapshot = await captureRows(uniqueIds);
  const currentRowsById = new Map(snapshot.rows.map((row) => [row.card_print_id, row]));
  const adjudicationRows = blockedRows.map((row) =>
    classifyCollision({
      blockedRow: row,
      conflictRows: row.conflicting_rows ?? [],
      currentRowsById,
    }));
  const summary = summarize(adjudicationRows);

  const stopFindings = [];
  if (collisionAudit.audit_status !== 'pkg02b_full_beta_collision_audit_complete_split_required') {
    stopFindings.push('source_collision_audit_not_complete');
  }
  if (pkg02cApply.apply_status !== 'pkg02c_full_beta_noncolliding_real_apply_committed_and_verified') {
    stopFindings.push('pkg02c_apply_not_verified');
  }
  if (!snapshot.available) stopFindings.push('current_collision_snapshot_unavailable');
  if (blockedRows.length !== 79) stopFindings.push('blocked_row_count_not_79');
  if (snapshot.rows.length !== uniqueIds.length) stopFindings.push('current_snapshot_missing_collision_or_conflict_rows');

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg02d_collision_adjudication_v1',
    audit_only: true,
    db_reads_performed: snapshot.available,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    merge_performed: false,
    delete_performed: false,
    apply_paths_executed: false,
    audit_status: stopFindings.length === 0
      ? 'pkg02d_collision_adjudication_complete_no_write'
      : 'pkg02d_collision_adjudication_blocked',
    pkg02c_apply_status: pkg02cApply.apply_status,
    source_artifacts: {
      collision_audit: path.relative(ROOT, COLLISION_AUDIT_JSON).replaceAll('\\', '/'),
      pkg02c_real_apply: path.relative(ROOT, PKG02C_APPLY_JSON).replaceAll('\\', '/'),
    },
    current_snapshot: {
      available: snapshot.available,
      reason: snapshot.reason,
      captured_at: snapshot.captured_at,
      row_count: snapshot.rows.length,
      hash_sha256: snapshot.hash_sha256,
    },
    summary,
    adjudication_rows: adjudicationRows,
    next_steps: [
      'Do not merge/delete collision rows automatically.',
      'Treat number_plain identity collisions as schema/key-strategy work, not duplicate cleanup.',
      'Prepare separate dry-run-only plans only for rows classified as possible exact duplicate candidates.',
      'Keep distinct-number/name collisions blocked until identity model or number-key governance is decided.',
    ],
    safety: [
      'No DB writes were performed.',
      'No migrations were created.',
      'No cleanup, quarantine, merge, delete, or apply path was executed.',
      'PKG-02C applied rows are not revisited by this audit.',
      'The 79 collision rows remain blocked from mutation.',
    ],
    stop_findings: stopFindings,
    report_hash_sha256: sha256(stableJson({ summary, adjudicationRows })),
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
    blocked_rows: report.summary.total_blocked_rows,
    by_status: report.summary.by_status,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    stop_findings: report.stop_findings.length,
  }, null, 2));

  if (!report.pass) process.exitCode = 1;
}

await main();
