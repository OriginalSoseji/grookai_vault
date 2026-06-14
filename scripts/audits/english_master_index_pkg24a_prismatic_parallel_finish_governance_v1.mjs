import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeNumber, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_current_unsupported_reconciliation_lanes_v1.json');
const FIXTURE_JSON = path.join(
  DEFAULT_OUTPUT_DIR,
  'source_fixtures',
  'generated_prismatic_evolutions_parallel_v1',
  'prismatic_evolutions_parallel_finish_matrix_v1.json',
);
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg24a_prismatic_parallel_finish_governance_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg24a_prismatic_parallel_finish_governance_v1.md');
const PACKAGE_ID = 'PKG-24A-PRISMATIC-PARALLEL-FINISH-GOVERNANCE';

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

function foldName(value) {
  return normalizeText(String(value ?? '')
    .replaceAll('’', "'")
    .replace(/\([^)]*\)/g, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, ''))
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^bindin mochi$/, 'binding mochi')
    .replace(/^profesor s research$/, 'professor s research');
}

function factKey(setKey, cardNumber, cardName, finishKey) {
  return [
    normalizeText(setKey),
    normalizeNumber(cardNumber),
    foldName(cardName),
    normalizeFinish(finishKey),
  ].join('|');
}

function exactDisplayKey(setKey, cardNumber, cardName, finishKey) {
  return [
    normalizeText(setKey),
    normalizeNumber(cardNumber),
    normalizeText(cardName),
    normalizeFinish(finishKey),
  ].join('|');
}

function evidenceStatus(row, fixtureRow) {
  const exactName = normalizeText(row.card_name) === normalizeText(fixtureRow.card_name);
  const foldedName = foldName(row.card_name) === foldName(fixtureRow.card_name);
  if (exactName) return 'exact_card_number_name_finish_supported';
  if (foldedName) return 'exact_card_number_finish_supported_name_normalized';
  return 'blocked_name_mismatch';
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_governance_status).map(([status, count]) => [status, count]);
  const finishRows = Object.entries(report.summary.by_finish).map(([finish, count]) => [finish, count]);
  const unmatchedRows = report.unmatched_fixture_rows.slice(0, 25).map((row) => [
    row.card_number,
    row.card_name,
    row.finish_key,
  ]);
  return `# PKG-24A Prismatic Parallel Finish Governance V1

Read-only governance closure for Prismatic Evolutions Poké Ball and Master Ball parallel child rows currently blocked as \`parallel_finish_exact_source_review\`.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- source_rows: ${report.summary.source_rows}
- fixture_rows: ${report.summary.fixture_rows}
- governed_rows: ${report.summary.governed_rows}
- blocked_rows: ${report.summary.blocked_rows}
- unmatched_fixture_rows: ${report.summary.unmatched_fixture_rows}
- package_fingerprint: ${report.package_fingerprint}

## Governance Status

${markdownTable(['status', 'rows'], statusRows)}

## Governed Finishes

${markdownTable(['finish', 'rows'], finishRows)}

## Unmatched Fixture Rows

These fixture facts are not currently live unsupported rows. They are not insertion authority.

${markdownTable(['number', 'name', 'finish'], unmatchedRows)}

## Guardrails

- This report is not write authority.
- The fixture supports exact Prismatic card-number parallel facts, but DB mutation still requires a separate guarded package.
- Poké Ball and Master Ball rows are governed as parallel finish facts, not stamped variants.
- Rows not matched by exact set, number, normalized name, and finish remain blocked.
`;
}

const source = await readJson(SOURCE_JSON);
const fixture = await readJson(FIXTURE_JSON);
const fixtureByFactKey = new Map();
for (const row of fixture.rows ?? []) {
  if (row.set_key !== 'sv08.5') continue;
  if (!['pokeball', 'masterball'].includes(normalizeFinish(row.finish_key))) continue;
  fixtureByFactKey.set(factKey(row.set_key, row.card_number, row.card_name, row.finish_key), row);
}

const sourceRowsByPrintingId = new Map();
for (const row of [
  ...(source.rows ?? []),
  ...(source.parallel_finish_governance?.rows ?? []),
]) {
  if (!(
  (row.canonical_set_key ?? row.set_code) === 'sv08.5'
  && ['pokeball', 'masterball'].includes(normalizeFinish(row.finish_key))
  )) continue;
  sourceRowsByPrintingId.set(row.card_printing_id, row);
}
const sourceRows = [...sourceRowsByPrintingId.values()].sort((left, right) => (
  normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number))
  || normalizeText(left.card_name).localeCompare(normalizeText(right.card_name))
  || normalizeFinish(left.finish_key).localeCompare(normalizeFinish(right.finish_key))
  || String(left.card_printing_id).localeCompare(String(right.card_printing_id))
));
const governedRows = [];
const blockedRows = [];
const matchedFixtureDisplayKeys = new Set();

for (const row of sourceRows) {
  const setKey = row.canonical_set_key ?? row.set_code;
  const candidateKeys = (row.live_number_candidates?.length ? row.live_number_candidates : [row.card_number])
    .map((number) => factKey(setKey, number, row.card_name, row.finish_key));
  const fixtureRow = candidateKeys.map((key) => fixtureByFactKey.get(key)).find(Boolean);
  if (!fixtureRow) {
    blockedRows.push({
      governance_status: 'blocked_no_exact_fixture_support',
      reason: 'No fixture row matched exact set, card number, normalized card name, and finish.',
      ...row,
    });
    continue;
  }
  const governanceStatus = evidenceStatus(row, fixtureRow);
  if (governanceStatus === 'blocked_name_mismatch') {
    blockedRows.push({
      governance_status: governanceStatus,
      reason: 'Fixture number and finish matched, but card name did not pass normalization.',
      source_card_name: fixtureRow.card_name,
      ...row,
    });
    continue;
  }
  matchedFixtureDisplayKeys.add(exactDisplayKey(fixtureRow.set_key, fixtureRow.card_number, fixtureRow.card_name, fixtureRow.finish_key));
  governedRows.push({
    ...row,
    governance_status: governanceStatus,
    cleanup_readiness: 'governed_non_write',
    reason: 'Exact Prismatic Evolutions parallel finish fact is source-backed by local checklist fixture and public set-level parallel rule source.',
    source_key: fixtureRow.source_key,
    source_kind: fixtureRow.source_kind,
    source_url: fixtureRow.source_url,
    supporting_rule_source_url: fixtureRow.supporting_rule_source_url,
    source_card_number: fixtureRow.card_number,
    source_card_name: fixtureRow.card_name,
    evidence_type: fixtureRow.evidence_type,
    evidence_label: fixtureRow.evidence_label,
    raw_snapshot_ref: fixtureRow.raw_snapshot_ref,
  });
}

const unmatchedFixtureRows = (fixture.rows ?? [])
  .filter((row) => ['pokeball', 'masterball'].includes(normalizeFinish(row.finish_key)))
  .filter((row) => !matchedFixtureDisplayKeys.has(exactDisplayKey(row.set_key, row.card_number, row.card_name, row.finish_key)))
  .map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    source_url: row.source_url,
    supporting_rule_source_url: row.supporting_rule_source_url,
    raw_snapshot_ref: row.raw_snapshot_ref,
  }));

const packageFingerprint = sha256(stableJson({
  package_id: PACKAGE_ID,
  fixture_version: fixture.version,
  governed_rows: governedRows.map((row) => ({
    card_printing_id: row.card_printing_id,
    card_print_id: row.card_print_id,
    canonical_set_key: row.canonical_set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    governance_status: row.governance_status,
  })),
  blocked_rows: blockedRows.map((row) => ({
    card_printing_id: row.card_printing_id,
    canonical_set_key: row.canonical_set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    governance_status: row.governance_status,
  })),
}));

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg24a_prismatic_parallel_finish_governance_v1',
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  source_artifact: SOURCE_JSON,
  fixture_artifact: FIXTURE_JSON,
  source_generated_at: source.generated_at,
  fixture_generated_at: fixture.generated_at,
  summary: {
    source_rows: sourceRows.length,
    fixture_rows: fixture.rows?.length ?? 0,
    governed_rows: governedRows.length,
    blocked_rows: blockedRows.length,
    unmatched_fixture_rows: unmatchedFixtureRows.length,
    by_governance_status: countBy([...governedRows, ...blockedRows], (row) => row.governance_status),
    by_finish: countBy(governedRows, (row) => row.finish_key),
  },
  governed_rows: governedRows,
  blocked_rows: blockedRows,
  unmatched_fixture_rows: unmatchedFixtureRows,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  summary: report.summary,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
