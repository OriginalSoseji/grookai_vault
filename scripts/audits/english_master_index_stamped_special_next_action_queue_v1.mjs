import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_next_action_queue_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_stamped_special_next_action_queue_v1.md');

const INPUTS = {
  current_queue: path.join(AUDIT_DIR, 'english_master_index_pkg17a_stamped_remaining_action_queue_v1.json'),
  execution_queue: path.join(AUDIT_DIR, 'english_master_index_pkg18x_stamped_post_governance_execution_queue_v1.json'),
  source_closure: path.join(AUDIT_DIR, 'english_master_index_pkg18ef_stamped_source_acquisition_closure_v1.json'),
  completion_rollup: path.join(AUDIT_DIR, 'english_master_index_pkg18z_stamped_completion_rollup_v1.json'),
  overnight_pass: path.join(AUDIT_DIR, 'english_master_index_stamped_special_overnight_source_pass_v1.json'),
  conflict_adjudication: path.join(AUDIT_DIR, 'english_master_index_pkg18g2_stamped_conflict_source_adjudication_v1.json'),
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return readJson(filePath);
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
}

function countBy(rows, keyFn) {
  const out = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function topEntries(obj, limit = 12) {
  return Object.fromEntries(Object.entries(obj ?? {}).slice(0, limit));
}

function table(headers, rows) {
  const normalized = rows.map((row) => headers.map((header) => String(row[header] ?? '')));
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...normalized.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function rowKey(row) {
  return [
    row.set_key ?? '',
    row.card_number ?? '',
    row.card_name ?? '',
    row.variant_key ?? '',
    row.stamp_label ?? '',
    row.finish_key ?? '',
  ].join('|');
}

function conflictAdjudicationKey(row) {
  return [
    row.set_key ?? '',
    String(row.card_number ?? '').replace(/^0+/, ''),
    row.card_name ?? '',
    row.variant_key ?? '',
  ].join('|').toLowerCase();
}

function exactEvidencePrompt(row) {
  return `Need exact source URL proving ${row.set_key}/${row.card_number} ${row.card_name} has ${row.stamp_label || row.variant_key || 'the stamped/special variant'}${row.finish_key ? ` with active finish ${row.finish_key}` : ''}.`;
}

function classifyNextAction(row, adjudicationByKey = new Map()) {
  const adjudication = adjudicationByKey.get(conflictAdjudicationKey(row));
  if (adjudication?.dry_run_candidate_after_package_builder) {
    return {
      action_bucket: 'conflict_resolved_future_dry_run_candidate',
      priority: 1,
      recommended_action: `Build a separate guarded dry-run package using adjudicated finish ${adjudication.adjudicated_finish_key}. No real apply without approval.`,
      conflict_adjudication_status: adjudication.adjudication_status,
      adjudicated_finish_key: adjudication.adjudicated_finish_key,
    };
  }

  if (adjudication?.adjudication_status?.startsWith('still_blocked')) {
    return {
      action_bucket: 'manual_conflict_still_blocked',
      priority: 1,
      recommended_action: adjudication.recommendation,
      conflict_adjudication_status: adjudication.adjudication_status,
      adjudicated_finish_key: adjudication.adjudicated_finish_key,
    };
  }

  if (row.execution_bucket === 'bucket_07_conflict_adjudication_manual') {
    return {
      action_bucket: 'manual_conflict_adjudication',
      priority: 1,
      recommended_action: 'Resolve conflicting finish/source observation manually before any package can be prepared.',
    };
  }

  if (row.execution_bucket === 'bucket_04_prize_pack_finish_mapping_bulk') {
    return {
      action_bucket: 'prize_pack_second_source',
      priority: 2,
      recommended_action: 'Acquire a second independent exact Prize Pack finish source; existing PriceCharting rows remain review-only.',
    };
  }

  if (row.execution_bucket === 'bucket_05_variant_family_source_acquisition_bulk') {
    const family = row.variant_family || 'unknown';
    if (family === 'league') {
      return {
        action_bucket: 'league_finish_exact_source',
        priority: 3,
        recommended_action: 'Target league/crosshatch exact checklist sources for set + number + card + reverse/active finish.',
      };
    }
    if (family === 'championship_or_staff') {
      return {
        action_bucket: 'event_staff_exact_source',
        priority: 4,
        recommended_action: 'Target event/staff stamped sources with exact stamp label and active finish.',
      };
    }
    if (family === 'prerelease') {
      return {
        action_bucket: 'prerelease_exact_finish_source',
        priority: 5,
        recommended_action: 'Target prerelease pages/products that prove exact stamped card and active finish.',
      };
    }
    if (family === 'professor_program') {
      return {
        action_bucket: 'professor_program_exact_finish_source',
        priority: 6,
        recommended_action: 'Target Professor Program checklist/product sources that prove exact active finish.',
      };
    }
    if (family === 'halloween') {
      return {
        action_bucket: 'halloween_base_parent_or_finish_resolution',
        priority: 7,
        recommended_action: 'Resolve missing base parent/target child finish before using Halloween product evidence.',
      };
    }
    return {
      action_bucket: 'small_custom_stamp_exact_source',
      priority: 8,
      recommended_action: 'Acquire exact source for the specific small stamp/variant family; do not generalize from stamped text.',
    };
  }

  if (row.execution_bucket === 'bucket_06_second_source_acquisition_bulk') {
    return {
      action_bucket: 'second_source_needed',
      priority: 9,
      recommended_action: 'Find one more independent exact source for rows already supported by a single source.',
    };
  }

  if (row.execution_bucket === 'bucket_03a_base_parent_closed_stale_no_write') {
    return {
      action_bucket: 'closed_stale_no_write',
      priority: 90,
      recommended_action: 'Already closed or stale relative to current canonical rows; keep out of write planning.',
    };
  }

  if (row.execution_bucket === 'bucket_03b_base_parent_blocked_no_write') {
    return {
      action_bucket: 'base_parent_blocked_no_write',
      priority: 91,
      recommended_action: 'Base parent cannot be resolved safely; keep no-write until parent identity is governed.',
    };
  }

  if (row.execution_bucket === 'bucket_02_no_printing_write_battle_academy_display_metadata') {
    return {
      action_bucket: 'display_metadata_no_write',
      priority: 92,
      recommended_action: 'Battle Academy marks are display metadata strategy, not printing inserts.',
    };
  }

  if (row.execution_bucket === 'bucket_01_no_write_generic_stamped_suppression') {
    return {
      action_bucket: 'generic_stamped_suppressed_no_write',
      priority: 93,
      recommended_action: 'Generic stamped claims remain suppressed unless exact stamp label is discovered.',
    };
  }

  return {
    action_bucket: 'unclassified_review',
    priority: 99,
    recommended_action: 'Manual review required; row did not match a known action bucket.',
  };
}

function sampleRows(rows, limit = 20) {
  return rows.slice(0, limit).map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.variant_key,
    stamp_label: row.stamp_label,
    finish_key: row.finish_key,
    queue_status: row.queue_status,
    execution_bucket: row.execution_bucket,
    required_evidence: exactEvidencePrompt(row),
  }));
}

function buildReport() {
  const currentQueue = readJson(INPUTS.current_queue);
  const executionQueue = readJson(INPUTS.execution_queue);
  const sourceClosure = readJson(INPUTS.source_closure);
  const completionRollup = readJson(INPUTS.completion_rollup);
  const overnightPass = readJson(INPUTS.overnight_pass);
  const conflictAdjudication = readJsonIfExists(INPUTS.conflict_adjudication);
  const adjudicationByKey = new Map((conflictAdjudication?.rows ?? []).map((row) => [conflictAdjudicationKey(row), row]));

  const rows = (executionQueue.rows ?? []).map((row) => ({
    ...row,
    ...classifyNextAction(row, adjudicationByKey),
  })).sort((a, b) => a.priority - b.priority || rowKey(a).localeCompare(rowKey(b)));

  const actionGroups = Object.entries(countBy(rows, (row) => row.action_bucket)).map(([action_bucket, count]) => {
    const groupRows = rows.filter((row) => row.action_bucket === action_bucket);
    const first = groupRows[0] ?? {};
    return {
      action_bucket,
      priority: first.priority ?? 99,
      count,
      write_ready_now: groupRows.filter((row) => Number(row.write_ready_now) > 0).length,
      top_variant_families: topEntries(countBy(groupRows, (row) => row.variant_family), 8),
      top_variant_keys: topEntries(countBy(groupRows, (row) => row.variant_key), 8),
      top_sets: topEntries(countBy(groupRows, (row) => row.set_key), 8),
      recommended_action: first.recommended_action ?? 'Manual review required.',
      sample_rows: sampleRows(groupRows, 10),
    };
  }).sort((a, b) => a.priority - b.priority || a.action_bucket.localeCompare(b.action_bucket));

  const acquisitionRows = rows.filter((row) => row.priority < 90);
  const noWriteRows = rows.filter((row) => row.priority >= 90);
  const conflictRows = rows.filter((row) => row.action_bucket === 'manual_conflict_adjudication' || row.action_bucket === 'manual_conflict_still_blocked');
  const conflictResolvedRows = rows.filter((row) => row.action_bucket === 'conflict_resolved_future_dry_run_candidate');
  const conflictResolvedIdentityCount = new Set(conflictResolvedRows.map(conflictAdjudicationKey)).size;
  const sourceNeededRows = rows.filter((row) => row.priority >= 2 && row.priority < 90);

  const nextRecommendedOrder = actionGroups
    .filter((group) => group.priority < 90)
    .map((group) => ({
      action_bucket: group.action_bucket,
      count: group.count,
      recommended_action: group.recommended_action,
      reason: group.action_bucket === 'manual_conflict_adjudication'
        ? 'Smallest blocker count and highest risk; clear this before building broad packages.'
        : 'Current source lanes are exhausted; target this family with exact row-level evidence only.',
    }));

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_stamped_special_next_action_queue_v1',
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    apply_performed: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: Object.fromEntries(Object.entries(INPUTS).map(([key, value]) => [key, rel(value)])),
    source_fingerprints: {
      current_queue: currentQueue.fingerprint_sha256 ?? null,
      execution_queue: executionQueue.fingerprint_sha256 ?? null,
      source_closure: sourceClosure.fingerprint_sha256 ?? null,
      completion_rollup: completionRollup.fingerprint_sha256 ?? null,
      overnight_pass: overnightPass.fingerprint_sha256 ?? null,
      conflict_adjudication: conflictAdjudication?.fingerprint_sha256 ?? null,
    },
    summary: {
      total_rows: rows.length,
      acquisition_or_adjudication_rows: acquisitionRows.length,
      source_needed_rows: sourceNeededRows.length,
      no_write_or_governance_rows: noWriteRows.length,
      manual_conflict_rows: conflictRows.length,
      conflict_resolved_future_dry_run_candidates: conflictResolvedRows.length,
      conflict_resolved_future_dry_run_candidate_identities: conflictResolvedIdentityCount,
      write_ready_now: 0,
      by_action_bucket: countBy(rows, (row) => row.action_bucket),
      by_execution_bucket: countBy(rows, (row) => row.execution_bucket),
      by_variant_family: countBy(rows, (row) => row.variant_family),
      by_variant_key: countBy(rows, (row) => row.variant_key),
      by_set: countBy(rows, (row) => row.set_key),
    },
    next_recommended_order: nextRecommendedOrder,
    action_groups: actionGroups,
    rows,
  };

  report.fingerprint_sha256 = crypto
    .createHash('sha256')
    .update(JSON.stringify({
      version: report.version,
      source_fingerprints: report.source_fingerprints,
      summary: report.summary,
      next_recommended_order: report.next_recommended_order,
      action_groups: report.action_groups.map((group) => ({
        action_bucket: group.action_bucket,
        count: group.count,
        top_variant_families: group.top_variant_families,
        top_variant_keys: group.top_variant_keys,
        top_sets: group.top_sets,
      })),
    }))
    .digest('hex');

  return report;
}

function writeMarkdown(report) {
  const groupRows = report.action_groups.map((group) => ({
    priority: group.priority,
    action_bucket: group.action_bucket,
    count: group.count,
    write_ready_now: group.write_ready_now,
    recommended_action: group.recommended_action,
  }));

  const nextRows = report.next_recommended_order.map((row, index) => ({
    order: index + 1,
    action_bucket: row.action_bucket,
    count: row.count,
    recommended_action: row.recommended_action,
  }));

  const lines = [];
  lines.push('# Stamped/Special Next Action Queue V1');
  lines.push('');
  lines.push('Audit-only next-action consolidation for the remaining stamped/special queue.');
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('- audit_only: true');
  lines.push('- db_writes_performed: false');
  lines.push('- migrations_created: false');
  lines.push('- apply_performed: false');
  lines.push('- cleanup_performed: false');
  lines.push('- write_ready_now: 0');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(table(['metric', 'value'], [
    { metric: 'total_rows', value: report.summary.total_rows },
    { metric: 'acquisition_or_adjudication_rows', value: report.summary.acquisition_or_adjudication_rows },
    { metric: 'source_needed_rows', value: report.summary.source_needed_rows },
    { metric: 'no_write_or_governance_rows', value: report.summary.no_write_or_governance_rows },
    { metric: 'manual_conflict_rows', value: report.summary.manual_conflict_rows },
    { metric: 'conflict_resolved_future_dry_run_candidates', value: report.summary.conflict_resolved_future_dry_run_candidates },
    { metric: 'conflict_resolved_future_dry_run_candidate_identities', value: report.summary.conflict_resolved_future_dry_run_candidate_identities },
    { metric: 'write_ready_now', value: report.summary.write_ready_now },
    { metric: 'fingerprint_sha256', value: `\`${report.fingerprint_sha256}\`` },
  ]));
  lines.push('');
  lines.push('## Recommended Order');
  lines.push('');
  lines.push(table(['order', 'action_bucket', 'count', 'recommended_action'], nextRows));
  lines.push('');
  lines.push('## Action Buckets');
  lines.push('');
  lines.push(table(['priority', 'action_bucket', 'count', 'write_ready_now', 'recommended_action'], groupRows));
  lines.push('');
  lines.push('## Top Remaining Variant Families');
  lines.push('');
  lines.push(table(['variant_family', 'rows'], Object.entries(report.summary.by_variant_family).slice(0, 15).map(([variant_family, rows]) => ({ variant_family, rows }))));
  lines.push('');
  lines.push('## Guardrail');
  lines.push('');
  lines.push('This report does not authorize writes. Rows require exact source evidence for set, card number, card name, stamp/variant, finish when applicable, and source URL before any guarded dry-run package can be prepared.');
  lines.push('');
  return lines.join('\n');
}

const report = buildReport();
fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(OUTPUT_MD, writeMarkdown(report));
console.log(JSON.stringify({
  output_json: rel(OUTPUT_JSON),
  output_md: rel(OUTPUT_MD),
  fingerprint_sha256: report.fingerprint_sha256,
  summary: report.summary,
}, null, 2));
