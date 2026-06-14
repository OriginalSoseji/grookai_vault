import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeNumber, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CURRENT_UNSUPPORTED_JSON = path.join(AUDIT_DIR, 'english_master_index_current_unsupported_reconciliation_lanes_v1.json');
const PKG23A_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg23a_subset_parallel_governance_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg25a_subset_parallel_supported_finish_governance_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg25a_subset_parallel_supported_finish_governance_v1.md');
const PACKAGE_ID = 'PKG-25A-SUBSET-PARALLEL-SUPPORTED-FINISH-GOVERNANCE';

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

function normalizeFinish(value) {
  const finish = normalizeText(value);
  if (finish === 'reverse_holo') return 'reverse';
  if (finish === 'holofoil') return 'holo';
  return finish;
}

function rowSort(left, right) {
  return normalizeText(left.canonical_set_key ?? left.set_code).localeCompare(normalizeText(right.canonical_set_key ?? right.set_code))
    || normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number))
    || normalizeText(left.card_name).localeCompare(normalizeText(right.card_name))
    || normalizeFinish(left.finish_key).localeCompare(normalizeFinish(right.finish_key))
    || String(left.card_printing_id).localeCompare(String(right.card_printing_id));
}

function renderMarkdown(report) {
  const bucketRows = Object.entries(report.summary.by_governance_status).map(([status, count]) => [status, count]);
  const setRows = Object.entries(report.summary.by_set).slice(0, 20).map(([set, count]) => [set, count]);
  const finishRows = Object.entries(report.summary.by_finish).map(([finish, count]) => [finish, count]);
  const remainingRows = Object.entries(report.remaining_blocked_summary.by_set).slice(0, 20).map(([set, count]) => [set, count]);
  return `# PKG-25A Subset/Parallel Supported Finish Governance V1

Read-only governance closure for subset/parallel rows where the current live child finish is already supported by the Master Index, but the DB row carries subset variant or identity modifier shape that does not match the active reconciliation key.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- source_rows: ${report.summary.source_rows}
- governed_rows: ${report.summary.governed_rows}
- blocked_rows: ${report.summary.blocked_rows}
- package_fingerprint: ${report.package_fingerprint}

## Governed Status

${markdownTable(['status', 'rows'], bucketRows)}

## Governed Sets

${markdownTable(['set', 'rows'], setRows)}

## Governed Finishes

${markdownTable(['finish', 'rows'], finishRows)}

## Remaining Blocked Sets

${markdownTable(['set', 'rows'], remainingRows)}

## Guardrails

- This report is not write authority.
- These rows must not be deleted as unsupported overgeneration.
- Future identity cleanup still requires separate set-family governance and guarded dry-run proof.
- Rows whose finish is not already supported by the Master Index remain blocked.
`;
}

const current = await readJson(CURRENT_UNSUPPORTED_JSON);
const pkg23a = await readJson(PKG23A_JSON);

const alreadyGoverned = current.subset_parallel_supported_finish_governance?.rows ?? [];
const candidatesByPrintingId = new Map();
for (const row of [
  ...(pkg23a.rows ?? []),
  ...alreadyGoverned,
]) {
  if (row.governance_bucket === 'subset_parallel_identity_modifier_or_variant_supported_finish_review'
    || row.governance_status === 'master_index_supported_finish_identity_shape_governed') {
    candidatesByPrintingId.set(row.card_printing_id, row);
  }
}

const governedRows = [...candidatesByPrintingId.values()]
  .filter((row) => (row.known_index_finishes ?? []).includes(normalizeFinish(row.finish_key)))
  .sort(rowSort)
  .map((row) => ({
    ...row,
    governance_status: 'master_index_supported_finish_identity_shape_governed',
    cleanup_readiness: 'governed_non_write',
    reason: 'The same set/card/finish is Master Index supported; only subset variant/modifier key shape prevents direct reconciliation.',
  }));

const governedIds = new Set(governedRows.map((row) => row.card_printing_id));
const blockedRows = (pkg23a.rows ?? [])
  .filter((row) => row.governance_bucket === 'subset_parallel_identity_modifier_or_variant_source_review')
  .filter((row) => !governedIds.has(row.card_printing_id))
  .sort(rowSort)
  .map((row) => ({
    ...row,
    governance_status: 'blocked_finish_not_supported_by_current_master_index',
    cleanup_readiness: 'blocked',
    reason: 'The live variant/modifier row finish is not supported by the current Master Index finish set for this card.',
  }));

const packageFingerprint = sha256(stableJson({
  package_id: PACKAGE_ID,
  governed_rows: governedRows.map((row) => ({
    card_printing_id: row.card_printing_id,
    card_print_id: row.card_print_id,
    canonical_set_key: row.canonical_set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    printed_identity_modifier: row.printed_identity_modifier ?? '',
    variant_key: row.variant_key ?? '',
    governance_status: row.governance_status,
  })),
  blocked_rows: blockedRows.map((row) => ({
    card_printing_id: row.card_printing_id,
    canonical_set_key: row.canonical_set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    printed_identity_modifier: row.printed_identity_modifier ?? '',
    variant_key: row.variant_key ?? '',
    governance_status: row.governance_status,
  })),
}));

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg25a_subset_parallel_supported_finish_governance_v1',
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  source_artifacts: {
    current_unsupported: CURRENT_UNSUPPORTED_JSON,
    pkg23a_readiness: PKG23A_JSON,
  },
  summary: {
    source_rows: (pkg23a.rows ?? []).length,
    governed_rows: governedRows.length,
    blocked_rows: blockedRows.length,
    by_governance_status: countBy([...governedRows, ...blockedRows], (row) => row.governance_status),
    by_set: countBy(governedRows, (row) => row.canonical_set_key ?? row.set_code ?? 'unknown'),
    by_finish: countBy(governedRows, (row) => row.finish_key ?? 'unknown'),
    by_variant_key: countBy(governedRows, (row) => row.variant_key || '(blank)'),
    by_printed_identity_modifier: countBy(governedRows, (row) => row.printed_identity_modifier || '(blank)'),
  },
  remaining_blocked_summary: {
    rows: blockedRows.length,
    by_set: countBy(blockedRows, (row) => row.canonical_set_key ?? row.set_code ?? 'unknown'),
    by_finish: countBy(blockedRows, (row) => row.finish_key ?? 'unknown'),
    by_variant_key: countBy(blockedRows, (row) => row.variant_key || '(blank)'),
    by_printed_identity_modifier: countBy(blockedRows, (row) => row.printed_identity_modifier || '(blank)'),
  },
  governed_rows: governedRows,
  blocked_rows: blockedRows,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  summary: report.summary,
  remaining_blocked_summary: report.remaining_blocked_summary,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
