import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const LANES_JSON = path.join(AUDIT_DIR, 'english_master_index_current_unsupported_reconciliation_lanes_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg29a_known_card_cosmos_review_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg29a_known_card_cosmos_review_readiness_v1.md');

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

function hasValue(value) {
  return Boolean(String(value ?? '').trim());
}

function isStampedVariant(row) {
  const modifier = normalizeText(row.printed_identity_modifier);
  const variant = normalizeText(row.variant_key);
  return /stamp/.test(modifier) || /stamp/.test(variant);
}

function knownHasFinish(row) {
  return (row.known_index_finishes ?? []).map(normalizeText).includes(normalizeText(row.finish_key));
}

function classify(row) {
  const dependencyTotal = Number(row.child_dependency_total ?? 0);
  if (dependencyTotal > 0) return {
    classification: 'blocked_has_dependencies',
    action: 'do_not_apply',
    reason: 'row has child dependencies',
  };
  if (normalizeText(row.finish_key) !== 'cosmos') return {
    classification: 'blocked_non_cosmos_unexpected',
    action: 'do_not_apply',
    reason: 'PKG-29A only handles cosmos rows',
  };
  if (isStampedVariant(row)) {
    return {
      classification: knownHasFinish(row)
        ? 'stamped_variant_base_cosmos_supported_governance_needed'
        : 'stamped_variant_cosmos_evidence_needed',
      action: 'do_not_delete_without_stamped_identity_adjudication',
      reason: knownHasFinish(row)
        ? 'base card has cosmos support, but stamped variant identity requires separate governance'
        : 'stamped variant cosmos is not supported by current exact Master Index evidence',
    };
  }
  if (hasValue(row.printed_identity_modifier) || hasValue(row.variant_key)) {
    return {
      classification: 'non_base_variant_governance_needed',
      action: 'do_not_delete_without_variant_adjudication',
      reason: 'row has a non-base modifier or variant that needs identity governance',
    };
  }
  if (knownHasFinish(row)) {
    return {
      classification: 'base_cosmos_supported_false_positive_review',
      action: 'fix_matcher_or_master_key_before_apply',
      reason: 'base row has the same finish in known Master Index finishes but still appears unsupported',
    };
  }
  return {
    classification: 'base_cosmos_overfinish_delete_candidate_no_dependencies',
    action: 'eligible_for_guarded_dry_run_delete',
    reason: 'base cosmos child has no dependencies and current Master Index does not support cosmos for this card',
  };
}

function buildMarkdown(report) {
  return `# PKG-29A Known Card Cosmos Review Readiness V1

Read-only readiness split for \`known_card_unsupported_finish_review\` rows.

No DB writes were performed. No migrations were created. No deletes, merges, quarantine, parent writes, or global apply are authorized by this report.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['target_rows', report.summary.target_rows],
    ['eligible_delete_candidates', report.summary.by_classification.base_cosmos_overfinish_delete_candidate_no_dependencies ?? 0],
    ['stamped_or_variant_blocked', report.summary.stamped_or_variant_blocked],
    ['db_writes_performed', false],
    ['migrations_created', false],
  ])}

## Classification Counts

${markdownTable(
    ['classification', 'rows'],
    Object.entries(report.summary.by_classification),
  )}

## Set Counts

${markdownTable(
    ['set', 'rows'],
    Object.entries(report.summary.by_set),
  )}

## Eligible Delete Candidates

${markdownTable(
    ['set', 'card', 'finish', 'known_finishes', 'child'],
    report.rows
      .filter((row) => row.classification === 'base_cosmos_overfinish_delete_candidate_no_dependencies')
      .map((row) => [
        row.canonical_set_key,
        `${row.number} ${row.card_name}`,
        row.finish_key,
        (row.known_index_finishes ?? []).join(', '),
        row.card_printing_id,
      ]),
  )}

## Blocked Stamped Or Variant Rows

${markdownTable(
    ['set', 'card', 'modifier', 'variant', 'classification', 'reason'],
    report.rows
      .filter((row) => row.action !== 'eligible_for_guarded_dry_run_delete')
      .slice(0, 120)
      .map((row) => [
        row.canonical_set_key,
        `${row.number} ${row.card_name}`,
        row.printed_identity_modifier,
        row.variant_key,
        row.classification,
        row.reason,
      ]),
  )}
`;
}

async function main() {
  const lanes = await readJson(LANES_JSON);
  const targetRows = (lanes.rows ?? [])
    .filter((row) => row.lane === 'known_card_unsupported_finish_review');
  const rows = targetRows.map((row) => ({
    ...row,
    ...classify(row),
  }));
  const report = {
    package_id: 'PKG-29A-KNOWN-CARD-COSMOS-REVIEW-READINESS',
    generated_at: new Date().toISOString(),
    source_inputs: {
      lanes_json: path.relative(process.cwd(), LANES_JSON),
    },
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      deletes_authorized: false,
      real_apply_authorized: false,
    },
    summary: {
      target_rows: rows.length,
      by_classification: countBy(rows, (row) => row.classification),
      by_set: countBy(rows, (row) => row.canonical_set_key),
      by_action: countBy(rows, (row) => row.action),
      stamped_or_variant_blocked: rows.filter((row) => row.action !== 'eligible_for_guarded_dry_run_delete').length,
    },
    rows,
  };
  report.fingerprint = sha256(stableJson({
    package_id: report.package_id,
    summary: report.summary,
    rows: rows.map((row) => ({
      card_printing_id: row.card_printing_id,
      classification: row.classification,
      action: row.action,
    })),
  }));
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(process.cwd(), OUTPUT_JSON),
    output_md: path.relative(process.cwd(), OUTPUT_MD),
    fingerprint: report.fingerprint,
    summary: report.summary,
  }, null, 2));
}

await main();
