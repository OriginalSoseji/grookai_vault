import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'english_master_index_v1',
);

const WRITE_READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_write_readiness_v1.json');
const REVIEW_GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_physical_recovery_review_gate_v1.json');
const APPLY_DESIGN_JSON = path.join(AUDIT_DIR, 'english_master_index_physical_recovery_apply_design_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_db_impact_translation_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_db_impact_translation_v1.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function sum(values) {
  return values.reduce((acc, value) => acc + Number(value || 0), 0);
}

function addCount(target, key, amount = 1) {
  const safeKey = key || 'unknown';
  target[safeKey] = (target[safeKey] || 0) + amount;
}

function buildFieldPlan(mutationRows) {
  const fields = {};
  for (const row of mutationRows) {
    for (const [field, change] of Object.entries(row.field_changes || {})) {
      if (!fields[field]) {
        fields[field] = {
          row_count: 0,
          examples: [],
        };
      }
      fields[field].row_count += 1;
      if (fields[field].examples.length < 5) {
        fields[field].examples.push({
          set_key: row.set_key,
          card_print_id: row.card_print_id,
          before: change.before,
          after: change.after,
        });
      }
    }
  }
  return fields;
}

function buildSetPlans(packageSummaries) {
  return packageSummaries.map((pkg) => ({
    set_key: pkg.set_key,
    set_name: pkg.set_name,
    card_print_rows_that_would_be_updated: pkg.candidate_card_prints,
    child_printing_rows_verified_for_same_target_identity: pkg.candidate_printing_rows,
    changed_parent_fields: pkg.changed_fields || {},
    vault_items_referencing_targets: pkg.vault_items_referencing_targets || 0,
    status: pkg.design_status,
  }));
}

function buildRowPlan(mutationRows) {
  return mutationRows.map((row) => ({
    set_key: row.set_key,
    set_name: row.set_name,
    card_print_id: row.card_print_id,
    source_external_id: row.source_external_id,
    source_card_url: row.source_card_url,
    table: 'card_prints',
    direct_fields_that_would_change: row.field_changes || {},
    before_fields: row.before_fields || {},
    proposed_after_fields: row.target_parent_fields || {},
    generated_readback_expected: row.expected_generated_readback || {},
    rollback_fields_from_snapshot: row.rollback_parent_fields || {},
    child_printing_rows_attached: row.before_child_printing_count,
    vault_items_referencing_target: row.dependency_counts?.vault_items || 0,
    evidence_sources: row.evidence_sources || [],
    status: row.mutation_design_status,
  }));
}

function buildReport() {
  const readiness = readJson(WRITE_READINESS_JSON);
  const reviewGate = readJson(REVIEW_GATE_JSON);
  const applyDesign = readJson(APPLY_DESIGN_JSON);
  const mutationRows = applyDesign.mutation_rows || [];
  const readinessWriteReadyNow = readiness.write_ready_now ?? readiness.summary?.write_ready_now;

  const directCardPrintUpdates = mutationRows.length;
  const childPrintingRows = sum(mutationRows.map((row) => row.before_child_printing_count));
  const relatedRows = {
    external_mappings_referencing_targets: applyDesign.summary?.external_mappings_referencing_targets || 0,
    identity_rows_referencing_targets: applyDesign.summary?.identity_rows_referencing_targets || 0,
    trait_rows_referencing_targets: applyDesign.summary?.trait_rows_referencing_targets || 0,
    vault_items_referencing_targets: applyDesign.summary?.vault_items_referencing_targets || 0,
  };

  const stopFindings = [];
  if (readinessWriteReadyNow !== 0) stopFindings.push('write_readiness_unexpectedly_nonzero');
  if (reviewGate.write_ready_now !== 0) stopFindings.push('review_gate_write_ready_unexpectedly_nonzero');
  if (applyDesign.write_ready_now !== 0) stopFindings.push('apply_design_write_ready_unexpectedly_nonzero');
  if (applyDesign.summary?.stop_findings !== 0) stopFindings.push('apply_design_stop_findings_present');
  if (reviewGate.summary?.package_stop_findings !== 0) stopFindings.push('review_gate_stop_findings_present');
  if (relatedRows.vault_items_referencing_targets !== 0) stopFindings.push('vault_items_reference_target_rows');

  const globalBuckets = {};
  for (const bucket of readiness.global_buckets || []) {
    globalBuckets[bucket.bucket] = {
      row_count: bucket.row_count ?? null,
      printing_rows: bucket.printing_rows ?? null,
      status: bucket.status,
      mutation_ready: bucket.mutation_ready,
      reason: bucket.reason,
      next_action: bucket.next_action,
    };
  }

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_db_impact_translation_v1',
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    privileged_writes_used: false,
    current_db_effect: {
      database_changed_by_this_work: false,
      rows_inserted: 0,
      rows_updated: 0,
      rows_deleted: 0,
      migrations_applied: 0,
      explanation: 'This report translates audit artifacts into DB impact terms. It does not execute or authorize writes.',
    },
    future_db_effect_if_separately_approved_later: {
      write_ready_now: 0,
      authorization_status: 'not_authorized',
      candidate_package: 'PKG-01 physical missing-set recovery - master-verified subset',
      card_print_rows_that_would_be_updated: directCardPrintUpdates,
      card_printing_rows_verified_but_not_directly_changed_by_current_design: childPrintingRows,
      direct_card_print_fields_under_design: applyDesign.direct_parent_fields_under_design || [],
      generated_or_readback_fields_not_directly_assigned: applyDesign.generated_or_readback_fields_not_directly_assigned || [],
      related_rows_that_must_remain_consistent_but_are_not_directly_changed_by_current_design: relatedRows,
      changed_field_counts: applyDesign.summary?.changed_fields || {},
      affected_set_count: applyDesign.summary?.package_count || 0,
      affected_sets: buildSetPlans(applyDesign.package_summaries || []),
    },
    global_db_vs_master_index_context: {
      grookai_printing_rows: readiness.summary?.grookai_printing_rows ?? null,
      index_printing_rows: readiness.summary?.index_printing_rows ?? null,
      master_verified_by_index: readiness.summary?.global_status_counts?.master_verified_by_index ?? null,
      missing_from_grookai: readiness.summary?.global_status_counts?.missing_from_grookai ?? null,
      unsupported_by_current_index: readiness.summary?.global_status_counts?.unsupported_by_current_index ?? null,
      set_unmapped: readiness.summary?.global_status_counts?.set_unmapped ?? null,
      name_mismatch_needs_review: readiness.summary?.global_status_counts?.name_mismatch_needs_review ?? null,
      note: 'These buckets explain the audit landscape. They are not insertion, deletion, or cleanup authority.',
    },
    field_level_plan: buildFieldPlan(mutationRows),
    row_level_plan: buildRowPlan(mutationRows),
    gates_still_blocking_writes: [
      'No operator approval has been recorded for exact row IDs and intended mutations.',
      'No fresh production before-state snapshot has been captured immediately before execution.',
      'No transactional execution artifact exists.',
      'No post-apply verification artifact exists.',
      'write_ready_now remains 0.',
    ],
    non_authority_rules: [
      'unsupported_by_current_index is not deletion authority.',
      'missing_from_grookai is not insertion authority.',
      'dry-run package completion is not write authorization.',
      'apply design completion is not write authorization.',
      'DB writes require a separate approved execution artifact.',
    ],
    source_artifacts: {
      write_readiness: path.relative(ROOT, WRITE_READINESS_JSON).replaceAll('\\', '/'),
      review_gate: path.relative(ROOT, REVIEW_GATE_JSON).replaceAll('\\', '/'),
      apply_design: path.relative(ROOT, APPLY_DESIGN_JSON).replaceAll('\\', '/'),
    },
    source_statuses: {
      write_readiness_conclusion: readiness.conclusion,
      review_gate_status: reviewGate.review_gate_status,
      apply_design_status: applyDesign.apply_design_status,
      approval_status: applyDesign.approval_status,
    },
    global_buckets: globalBuckets,
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index DB Impact Translation V1');
  lines.push('');
  lines.push('This report explains how the Master Index audit artifacts translate to database impact.');
  lines.push('');
  lines.push('It is audit-only. It does not write to Supabase, create migrations, run cleanup, run quarantine, or execute an apply path.');
  lines.push('');
  lines.push('## Current DB Effect');
  lines.push('');
  lines.push('| Question | Answer |');
  lines.push('| --- | --- |');
  lines.push(`| Database changed by this work? | ${report.current_db_effect.database_changed_by_this_work} |`);
  lines.push(`| Rows inserted | ${report.current_db_effect.rows_inserted} |`);
  lines.push(`| Rows updated | ${report.current_db_effect.rows_updated} |`);
  lines.push(`| Rows deleted | ${report.current_db_effect.rows_deleted} |`);
  lines.push(`| Migrations applied | ${report.current_db_effect.migrations_applied} |`);
  lines.push(`| Explanation | ${mdEscape(report.current_db_effect.explanation)} |`);
  lines.push('');
  lines.push('## Future DB Effect If Separately Approved Later');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | ---: |');
  lines.push(`| write_ready_now | ${report.future_db_effect_if_separately_approved_later.write_ready_now} |`);
  lines.push(`| card_print rows that would be updated | ${report.future_db_effect_if_separately_approved_later.card_print_rows_that_would_be_updated} |`);
  lines.push(`| card_printing rows verified but not directly changed | ${report.future_db_effect_if_separately_approved_later.card_printing_rows_verified_but_not_directly_changed_by_current_design} |`);
  lines.push(`| affected sets | ${report.future_db_effect_if_separately_approved_later.affected_set_count} |`);
  lines.push(`| external mappings referencing targets | ${report.future_db_effect_if_separately_approved_later.related_rows_that_must_remain_consistent_but_are_not_directly_changed_by_current_design.external_mappings_referencing_targets} |`);
  lines.push(`| identity rows referencing targets | ${report.future_db_effect_if_separately_approved_later.related_rows_that_must_remain_consistent_but_are_not_directly_changed_by_current_design.identity_rows_referencing_targets} |`);
  lines.push(`| trait rows referencing targets | ${report.future_db_effect_if_separately_approved_later.related_rows_that_must_remain_consistent_but_are_not_directly_changed_by_current_design.trait_rows_referencing_targets} |`);
  lines.push(`| vault items referencing targets | ${report.future_db_effect_if_separately_approved_later.related_rows_that_must_remain_consistent_but_are_not_directly_changed_by_current_design.vault_items_referencing_targets} |`);
  lines.push('');
  lines.push('The future candidate package would update only `card_prints` parent identity fields under the current design: `set_code`, `number`, and `name`. `number_plain` is expected readback, not a direct assignment.');
  lines.push('');
  lines.push('## Changed Fields');
  lines.push('');
  lines.push('| Field | Rows |');
  lines.push('| --- | ---: |');
  for (const [field, detail] of Object.entries(report.field_level_plan).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`| ${mdEscape(field)} | ${detail.row_count} |`);
  }
  lines.push('');
  lines.push('## Affected Sets');
  lines.push('');
  lines.push('| Set | Name | card_print rows | child printings verified | Changed fields | Vault refs | Status |');
  lines.push('| --- | --- | ---: | ---: | --- | ---: | --- |');
  for (const setPlan of report.future_db_effect_if_separately_approved_later.affected_sets) {
    const fields = Object.entries(setPlan.changed_parent_fields)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([field, count]) => `${field}:${count}`)
      .join(', ');
    lines.push(`| ${mdEscape(setPlan.set_key)} | ${mdEscape(setPlan.set_name)} | ${setPlan.card_print_rows_that_would_be_updated} | ${setPlan.child_printing_rows_verified_for_same_target_identity} | ${mdEscape(fields)} | ${setPlan.vault_items_referencing_targets} | ${mdEscape(setPlan.status)} |`);
  }
  lines.push('');
  lines.push('## Global DB Vs Index Context');
  lines.push('');
  lines.push('| Bucket | Count | Meaning |');
  lines.push('| --- | ---: | --- |');
  lines.push(`| Grookai printing rows | ${report.global_db_vs_master_index_context.grookai_printing_rows} | Current DB comparison population |`);
  lines.push(`| Index printing rows | ${report.global_db_vs_master_index_context.index_printing_rows} | Master Index reference population |`);
  lines.push(`| master_verified_by_index | ${report.global_db_vs_master_index_context.master_verified_by_index} | Already supported by index |`);
  lines.push(`| missing_from_grookai | ${report.global_db_vs_master_index_context.missing_from_grookai} | Not insertion authority |`);
  lines.push(`| unsupported_by_current_index | ${report.global_db_vs_master_index_context.unsupported_by_current_index} | Not deletion authority |`);
  lines.push(`| set_unmapped | ${report.global_db_vs_master_index_context.set_unmapped} | Needs identity/provenance recovery |`);
  lines.push(`| name_mismatch_needs_review | ${report.global_db_vs_master_index_context.name_mismatch_needs_review} | Needs alias/name governance |`);
  lines.push('');
  lines.push('## Gates Still Blocking Writes');
  lines.push('');
  for (const gate of report.gates_still_blocking_writes) lines.push(`- ${gate}`);
  lines.push('');
  lines.push('## Non-Authority Rules');
  lines.push('');
  for (const rule of report.non_authority_rules) lines.push(`- ${rule}`);
  lines.push('');
  lines.push('## Source Artifacts');
  lines.push('');
  lines.push(`- Write readiness: \`${report.source_artifacts.write_readiness}\``);
  lines.push(`- Review gate: \`${report.source_artifacts.review_gate}\``);
  lines.push(`- Apply design: \`${report.source_artifacts.apply_design}\``);
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push(`- pass: ${report.pass}`);
  lines.push(`- stop_findings: ${report.stop_findings.length}`);
  lines.push(`- db_writes_performed: ${report.db_writes_performed}`);
  lines.push(`- migrations_created: ${report.migrations_created}`);
  lines.push(`- cleanup_performed: ${report.cleanup_performed}`);
  lines.push(`- quarantine_performed: ${report.quarantine_performed}`);
  return `${lines.join('\n')}\n`;
}

const report = buildReport();
writeJson(OUTPUT_JSON, report);
fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  generated_files: [
    path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
  ],
  current_db_changed: report.current_db_effect.database_changed_by_this_work,
  future_card_print_updates_if_approved: report.future_db_effect_if_separately_approved_later.card_print_rows_that_would_be_updated,
  future_child_printings_verified: report.future_db_effect_if_separately_approved_later.card_printing_rows_verified_but_not_directly_changed_by_current_design,
  affected_sets: report.future_db_effect_if_separately_approved_later.affected_set_count,
  write_ready_now: report.future_db_effect_if_separately_approved_later.write_ready_now,
  pass: report.pass,
  stop_findings: report.stop_findings.length,
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
}, null, 2));
