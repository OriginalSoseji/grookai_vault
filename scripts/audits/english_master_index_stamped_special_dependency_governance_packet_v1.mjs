import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const UNRESOLVED_PLAN = path.join(AUDIT_DIR, 'english_master_index_stamped_special_current_unresolved_work_plan_v1.json');
const HALLOWEEN_READINESS = path.join(AUDIT_DIR, 'english_master_index_pkg18i_halloween_active_finish_readiness_v1.json');
const BASE_READINESS = path.join(AUDIT_DIR, 'english_master_index_pkg17d_stamped_base_parent_resolution_readiness_v1.json');
const BASE_CLOSURE = path.join(AUDIT_DIR, 'english_master_index_pkg18c_stamped_base_parent_resolution_closure_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_dependency_governance_packet_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_stamped_special_dependency_governance_packet_v1.md');

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function dependencyClass(row) {
  if (row.action_bucket === 'halloween_base_parent_or_finish_resolution') {
    return 'halloween_base_parent_or_finish_blocked';
  }
  if (row.variant_family === 'battle_academy') {
    return 'battle_academy_display_metadata_base_finish_blocked';
  }
  if (row.set_key === 'wp') {
    return 'w_promotional_base_identity_governance_required';
  }
  return 'base_parent_or_base_finish_blocked';
}

function nextAction(row) {
  switch (dependencyClass(row)) {
    case 'halloween_base_parent_or_finish_blocked':
      return 'Resolve missing base parent/target child finish before considering Halloween stamped identity rows.';
    case 'battle_academy_display_metadata_base_finish_blocked':
      return 'Keep as display/deck metadata unless Battle Academy deck marks are governed as distinct physical identities.';
    case 'w_promotional_base_identity_governance_required':
      return 'Create W Promotional identity governance before any parent/child package; current base parent cannot be resolved safely.';
    default:
      return 'Resolve base parent and active base finish first.';
  }
}

function renderMarkdown(report) {
  return `# Stamped/Special Dependency Governance Packet V1

Generated: ${report.generated_at}

Audit-only dependency packet for stamped/special residual rows blocked by base parent, base finish, or product/display metadata modeling.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- apply_performed: ${report.apply_performed}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.summary.write_ready_now}

## Summary

${markdownTable(['metric', 'value'], [
    ['dependency_rows', report.summary.dependency_rows],
    ['halloween_rows', report.summary.halloween_rows],
    ['base_parent_rows', report.summary.base_parent_rows],
    ['write_ready_now', report.summary.write_ready_now],
    ['fingerprint', `\`${report.fingerprint_sha256}\``],
  ])}

## Dependency Classes

${markdownTable(
    ['dependency_class', 'rows'],
    Object.entries(report.summary.by_dependency_class).map(([name, count]) => [name, count]),
  )}

## Script Findings

${markdownTable(['source', 'finding'], [
    ['Halloween readiness', `source candidates ${report.source_summaries.halloween.source_candidate_rows}; write-ready ${report.source_summaries.halloween.future_guarded_parent_identity_insert_candidates}; blocker ${Object.keys(report.source_summaries.halloween.by_blocker ?? {}).join(', ')}`],
    ['Base parent readiness', `targets ${report.source_summaries.base_readiness.target_rows}; dry-run candidates ${report.source_summaries.base_readiness.insert_dry_run_candidates}; blocked ${report.source_summaries.base_readiness.blocked_rows}`],
    ['Base parent closure', `ready ${report.source_summaries.base_closure.ready_for_separate_guarded_dry_run}; blocked ${report.source_summaries.base_closure.blocked_rows}`],
  ])}

## Rows

${markdownTable(
    ['set', 'number', 'card', 'variant', 'dependency class', 'next action'],
    report.rows.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.stamp_label || row.variant_key || '',
      row.dependency_class,
      row.next_action,
    ]),
  )}
`;
}

async function main() {
  const unresolved = await readJson(UNRESOLVED_PLAN);
  const halloween = await readJson(HALLOWEEN_READINESS);
  const baseReadiness = await readJson(BASE_READINESS);
  const baseClosure = await readJson(BASE_CLOSURE);

  const dependencyRows = unresolved.unresolved_rows
    .filter((row) => row.action_bucket === 'base_parent_blocked_no_write' || row.action_bucket === 'halloween_base_parent_or_finish_resolution')
    .map((row) => ({
      ...row,
      dependency_class: dependencyClass(row),
      next_action: nextAction(row),
      write_ready_now: false,
    }));

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_stamped_special_dependency_governance_packet_v1',
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    apply_performed: false,
    cleanup_performed: false,
    quarantine_performed: false,
    inputs: {
      unresolved_work_plan: rel(UNRESOLVED_PLAN),
      unresolved_work_plan_fingerprint_sha256: unresolved.fingerprint_sha256,
      halloween_readiness: rel(HALLOWEEN_READINESS),
      halloween_readiness_fingerprint_sha256: halloween.fingerprint_sha256,
      base_parent_readiness: rel(BASE_READINESS),
      base_parent_readiness_fingerprint_sha256: baseReadiness.fingerprint_sha256,
      base_parent_closure: rel(BASE_CLOSURE),
      base_parent_closure_fingerprint_sha256: baseClosure.fingerprint_sha256,
    },
    summary: {
      dependency_rows: dependencyRows.length,
      halloween_rows: dependencyRows.filter((row) => row.action_bucket === 'halloween_base_parent_or_finish_resolution').length,
      base_parent_rows: dependencyRows.filter((row) => row.action_bucket === 'base_parent_blocked_no_write').length,
      write_ready_now: 0,
      by_dependency_class: countBy(dependencyRows, (row) => row.dependency_class),
      by_set: countBy(dependencyRows, (row) => row.set_key),
    },
    source_summaries: {
      halloween: halloween.summary,
      base_readiness: baseReadiness.summary,
      base_closure: baseClosure.summary,
    },
    rows: dependencyRows,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    inputs: report.inputs,
    summary: report.summary,
    rows: report.rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      dependency_class: row.dependency_class,
    })),
  }));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
