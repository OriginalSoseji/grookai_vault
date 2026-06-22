import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const INPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pokumon_detail_finish_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pokumon_stamp_granularity_governance_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pokumon_stamp_granularity_governance_v1.md');

const PLACEMENT_LABELS = [
  ['first_place_league_stamp', /\bfirst-place\b|\bfirst place\b/i, 'First Place League Stamp'],
  ['second_place_league_stamp', /\bsecond-place\b|\bsecond place\b/i, 'Second Place League Stamp'],
  ['third_place_league_stamp', /\bthird-place\b|\bthird place\b/i, 'Third Place League Stamp'],
  ['fourth_place_league_stamp', /\bfourth-place\b|\bfourth place\b/i, 'Fourth Place League Stamp'],
];

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
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
}

function countBy(rows, keyFn) {
  const out = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((left, right) => Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))));
}

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

function sourceText(row) {
  return `${row.evidence_label ?? ''} ${(row.source_urls ?? []).join(' ')}`;
}

function detectedPlacementLabels(row) {
  const text = sourceText(row);
  return PLACEMENT_LABELS
    .filter(([, pattern]) => pattern.test(text))
    .map(([variant_key, , stamp_label]) => ({ variant_key, stamp_label }));
}

function classify(row) {
  const blockers = row.blockers ?? [];
  const placements = detectedPlacementLabels(row);
  const hasBaseFinishBlocker = blockers.includes('base_parent_missing_target_child_finish');
  const hasGranularityBlocker = blockers.includes('stamp_label_granularity_governance_needed');

  if (blockers.includes('target_variant_parent_already_exists_review')) {
    return {
      governance_status: 'existing_variant_parent_review',
      recommended_action: 'Do not write. Compare existing variant parent against source label and finish before any package is built.',
      proposed_split_rows: [],
    };
  }

  if (hasGranularityBlocker && placements.length) {
    const status = hasBaseFinishBlocker
      ? 'placement_variant_split_blocked_by_base_finish'
      : 'placement_variant_split_ready_for_readiness_after_contract';
    return {
      governance_status: status,
      recommended_action: hasBaseFinishBlocker
        ? 'Do not write yet. Source implies placement-specific League variants, but the base parent lacks the target child finish needed for safe parent inheritance.'
        : 'Do not collapse into generic league_stamp. Future package should split this into placement-specific parent identities after contract approval.',
      proposed_split_rows: placements.map((placement) => ({
        variant_key: placement.variant_key,
        printed_identity_modifier: placement.variant_key,
        stamp_label: placement.stamp_label,
        finish_key: row.finish_key,
      })),
    };
  }

  if (hasBaseFinishBlocker) {
    return {
      governance_status: 'finish_evidence_base_parent_blocked',
      recommended_action: 'Do not write. Exact variant evidence exists, but the target finish cannot be inherited safely from the base parent yet.',
      proposed_split_rows: [],
    };
  }

  return {
    governance_status: 'needs_manual_governance_review',
    recommended_action: 'Do not write. Blocker pattern is not deterministic enough for a package.',
    proposed_split_rows: [],
  };
}

function renderMarkdown(report) {
  return `# Pokumon Stamp Granularity Governance V1

Generated: ${report.generated_at}

Audit-only governance report. No DB writes, no migrations, no apply.

## Summary

${markdownTable(['metric', 'value'], [
    ['blocked_rows_reviewed', report.summary.blocked_rows_reviewed],
    ['placement_split_source_rows', report.summary.placement_split_source_rows],
    ['proposed_placement_split_rows', report.summary.proposed_placement_split_rows],
    ['future_readiness_after_contract_rows', report.summary.future_readiness_after_contract_rows],
    ['base_finish_blocked_rows', report.summary.base_finish_blocked_rows],
    ['existing_variant_parent_review_rows', report.summary.existing_variant_parent_review_rows],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Governance Rule

Pokemon League placement cards must not be modeled as one generic \`league_stamp\` identity when source evidence explicitly says First Place, Second Place, Third Place, or Fourth Place. Those are placement-specific printed identity modifiers unless a future contract intentionally suppresses the placement distinction.

## Status Counts

${markdownTable(['status', 'count'], Object.entries(report.summary.by_governance_status).map(([key, value]) => [key, value]))}

## Future Readiness After Contract

${report.future_readiness_after_contract_rows.length
    ? markdownTable(['set', 'number', 'card', 'source variant', 'finish', 'proposed variants'], report.future_readiness_after_contract_rows.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.variant_key,
      row.finish_key,
      row.proposed_split_rows.map((split) => split.variant_key).join(', '),
    ]))
    : 'None.'}

## Blocked Sample

${report.blocked_rows.length
    ? markdownTable(['set', 'number', 'card', 'finish', 'status', 'reason'], report.blocked_rows.slice(0, 80).map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.finish_key,
      row.governance_status,
      row.recommended_action,
    ]))
    : 'None.'}
`;
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const rows = (input.blocked_or_review_rows ?? []).map((row) => {
    const classification = classify(row);
    return {
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      finish_key: row.finish_key,
      blockers: row.blockers ?? [],
      source_urls: row.source_urls ?? [],
      governance_status: classification.governance_status,
      recommended_action: classification.recommended_action,
      proposed_split_rows: classification.proposed_split_rows,
    };
  });

  const future = rows.filter((row) => row.governance_status === 'placement_variant_split_ready_for_readiness_after_contract');
  const blocked = rows.filter((row) => row.governance_status !== 'placement_variant_split_ready_for_readiness_after_contract');
  const proposedSplitRows = rows.flatMap((row) => row.proposed_split_rows.map((split) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    source_variant_key: row.variant_key,
    ...split,
    source_urls: row.source_urls,
  })));
  const fingerprint = sha256(stableJson(rows.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: normalizeText(row.card_name),
    variant_key: row.variant_key,
    finish_key: row.finish_key,
    governance_status: row.governance_status,
    proposed_split_rows: row.proposed_split_rows,
  }))));

  const report = {
    generated_at: new Date().toISOString(),
    version: 'pokumon_stamp_granularity_governance_v1',
    source_artifact: rel(INPUT_JSON),
    source_fingerprint_sha256: input.fingerprint_sha256,
    fingerprint_sha256: fingerprint,
    db_writes_performed: false,
    migrations_created: false,
    apply_performed: false,
    cleanup_performed: false,
    summary: {
      blocked_rows_reviewed: rows.length,
      placement_split_source_rows: rows.filter((row) => row.proposed_split_rows.length > 0).length,
      proposed_placement_split_rows: proposedSplitRows.length,
      future_readiness_after_contract_rows: future.length,
      base_finish_blocked_rows: rows.filter((row) => row.governance_status.includes('base_finish')).length,
      existing_variant_parent_review_rows: rows.filter((row) => row.governance_status === 'existing_variant_parent_review').length,
      by_governance_status: countBy(rows, (row) => row.governance_status),
      by_proposed_variant: countBy(proposedSplitRows, (row) => row.variant_key),
    },
    rows,
    proposed_placement_split_rows: proposedSplitRows,
    future_readiness_after_contract_rows: future,
    blocked_rows: blocked,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: fingerprint,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
