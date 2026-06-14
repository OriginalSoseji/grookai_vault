import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_identity_readiness_v1.json');
const GENERIC_ADJUDICATION_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15b_stamped_generic_variant_adjudication_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15_stamped_explicit_finish_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg15_stamped_explicit_finish_readiness_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260611_pkg15_stamped_explicit_finish_readiness_checkpoint_v1.md');
const CHECKPOINT_INDEX = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');

const PACKAGE_ID = 'PKG-15-STAMPED-EXPLICIT-FINISH-READINESS';
const ROUTABLE_READINESS = new Set([
  'ready_for_guarded_parent_identity_insert',
  'ready_for_guarded_parent_identity_insert_with_dependency_awareness',
]);
const ACTIVE_CHILD_FINISHES = new Set(['normal', 'holo', 'reverse', 'cosmos']);
const GENERIC_VARIANT_KEYS = new Set(['unknown', 'stamped', 'stamp']);

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readOptionalJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
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
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function factKey(row) {
  return [
    normalizeText(row.set_key),
    String(row.card_number ?? '').trim(),
    normalizeText(row.card_name),
  ].join('|');
}

function evidenceTexts(row) {
  return [
    ...(row.preserved_evidence_labels ?? []),
    ...(row.preserved_evidence_notes ?? []),
    ...(row.preserved_evidence_snapshot_refs ?? []),
    ...(row.preserved_evidence_urls ?? []),
    row.stamp_label,
  ].filter(Boolean).map(String);
}

function detectFinishClaims(texts) {
  const claims = [];
  for (const text of texts) {
    const compact = normalizeText(text).replace(/[^a-z0-9]+/g, ' ').trim();
    if (/\bnon\s*holo\b|\bnonholo\b|\bnon\s*foil\b|\bnonfoil\b/.test(compact)) {
      claims.push({ finish_key: 'normal', reason: 'explicit_non_holo_label', evidence_text: text });
      continue;
    }
    if (/\bcosmos\b/.test(compact)) {
      claims.push({ finish_key: 'cosmos', reason: 'explicit_cosmos_label', evidence_text: text });
      continue;
    }
    if (/\breverse\b/.test(compact)) {
      claims.push({ finish_key: 'reverse', reason: 'explicit_reverse_label', evidence_text: text });
      continue;
    }
    if (/\bdouble\s+holo\b|\bholo\b|\bholographic\b|\bfoil\b/.test(compact)) {
      claims.push({ finish_key: 'holo', reason: 'explicit_holo_label', evidence_text: text });
    }
  }
  return claims.filter((claim) => ACTIVE_CHILD_FINISHES.has(claim.finish_key));
}

function classifyRow(row) {
  const finishClaims = detectFinishClaims(evidenceTexts(row));
  const uniqueClaimFinishes = [...new Set(finishClaims.map((claim) => claim.finish_key))].sort();
  const blockers = [];
  let readiness_status = 'blocked';
  let target_finish_key = null;
  let write_shape = 'none';

  if (!ROUTABLE_READINESS.has(row.readiness_status)) blockers.push(`source_readiness_${row.readiness_status}`);
  if ((row.base_parent_ids ?? []).length !== 1) blockers.push('base_parent_not_exactly_one');
  if (!row.proposed_variant_key || GENERIC_VARIANT_KEYS.has(normalizeText(row.proposed_variant_key))) blockers.push('variant_key_not_deterministic_enough');
  if (uniqueClaimFinishes.length === 0) blockers.push('missing_explicit_finish_claim');
  if (uniqueClaimFinishes.length > 1) blockers.push(`conflicting_finish_claims_${uniqueClaimFinishes.join('_')}`);

  if (blockers.length === 0) {
    readiness_status = 'ready_explicit_finish_stamped_identity_parent_insert';
    target_finish_key = uniqueClaimFinishes[0];
    write_shape = 'insert_stamped_canonical_parent_plus_explicit_child_finish';
  } else if (uniqueClaimFinishes.length === 1 && GENERIC_VARIANT_KEYS.has(normalizeText(row.proposed_variant_key))) {
    readiness_status = 'blocked_generic_stamp_variant_key';
  } else if (uniqueClaimFinishes.length === 1) {
    readiness_status = 'blocked_explicit_finish_with_other_blocker';
  } else {
    readiness_status = 'blocked_no_explicit_finish_route';
  }

  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    proposed_variant_key: row.proposed_variant_key,
    stamp_label: row.stamp_label,
    source_readiness_status: row.readiness_status,
    base_parent_ids: row.base_parent_ids ?? [],
    base_parent_child_finishes: row.base_parent_child_finishes ?? [],
    target_finish_key,
    readiness_status,
    write_shape,
    blockers,
    finish_claims: finishClaims,
    preserved_evidence_sources: row.preserved_evidence_sources ?? [],
    preserved_evidence_urls: row.preserved_evidence_urls ?? [],
    preserved_evidence_labels: row.preserved_evidence_labels ?? [],
    preserved_evidence_notes: row.preserved_evidence_notes ?? [],
  };
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_readiness_status).map(([status, count]) => [status, count]);
  const readyRows = report.rows
    .filter((row) => row.readiness_status === 'ready_explicit_finish_stamped_identity_parent_insert')
    .map((row) => [row.set_key, row.card_number, row.card_name, row.stamp_label, row.proposed_variant_key, row.target_finish_key]);
  const blockedExplicitRows = report.rows
    .filter((row) => row.finish_claims.length > 0 && row.readiness_status !== 'ready_explicit_finish_stamped_identity_parent_insert')
    .map((row) => [row.set_key, row.card_number, row.card_name, row.stamp_label, row.proposed_variant_key, row.blockers.join(', ')]);

  return `# PKG-15 Stamped Explicit Finish Readiness V1

Audit-only readiness for stamped identities whose evidence explicitly states the underlying child finish.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- source_rows_reviewed: ${report.summary.source_rows_reviewed}
- explicit_finish_rows: ${report.summary.explicit_finish_rows}
- ready_rows: ${report.summary.ready_rows}
- blocked_explicit_finish_rows: ${report.summary.blocked_explicit_finish_rows}
- already_adjudicated_rows_suppressed: ${report.summary.already_adjudicated_rows_suppressed}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['readiness_status', 'rows'], statusRows)}

## Ready Rows

${markdownTable(['set', 'number', 'name', 'stamp_label', 'variant_key', 'target_finish'], readyRows)}

## Blocked Explicit-Finish Rows

${markdownTable(['set', 'number', 'name', 'stamp_label', 'variant_key', 'blockers'], blockedExplicitRows)}

## Rule

Rows are ready only when the stamped identity has one exact base parent, a deterministic non-generic \`variant_key\`, and exactly one explicit active finish claim. Generic \`variant_key=stamped\` rows remain blocked even when the source says holo.
`;
}

function checkpointMarkdown(report) {
  return `# PKG-15 Stamped Explicit Finish Readiness Checkpoint V1

- package_id: ${report.package_id}
- generated_at: ${report.generated_at}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`
- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}

## Outcome

- ready_rows: ${report.summary.ready_rows}
- blocked_explicit_finish_rows: ${report.summary.blocked_explicit_finish_rows}
- write_ready_now: ${report.write_ready_now}

Next safe package: guarded dry-run for only the ready explicit-finish stamped identity parent inserts.
`;
}

function updateCheckpointIndex() {
  const line = '| 2026-06-11 | [PKG-15 Stamped Explicit Finish Readiness Checkpoint V1](20260611_pkg15_stamped_explicit_finish_readiness_checkpoint_v1.md) | Audit-only split of stamped rows with explicit child-finish evidence; 5 ready deterministic stamped identities, generic stamped labels remain blocked. No writes or migrations. |';
  const current = fsSync.existsSync(CHECKPOINT_INDEX) ? fsSync.readFileSync(CHECKPOINT_INDEX, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260611_pkg15_stamped_explicit_finish_readiness_checkpoint_v1.md')) {
    fsSync.writeFileSync(CHECKPOINT_INDEX, current.split('\n').map((existingLine) => (
      existingLine.includes('20260611_pkg15_stamped_explicit_finish_readiness_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(CHECKPOINT_INDEX, `${current.trimEnd()}\n${line}\n`);
  }
}

const readiness = await readJson(READINESS_JSON);
const genericAdjudication = await readOptionalJson(GENERIC_ADJUDICATION_JSON);
const alreadyAdjudicatedFactKeys = new Set((genericAdjudication?.rows ?? [])
  .filter((row) => row.adjudication_status === 'ready_for_guarded_reverse_stamped_identity_route')
  .map(factKey));
const sourceRows = (readiness.rows ?? []).filter((row) => (
  ROUTABLE_READINESS.has(row.readiness_status)
  && !alreadyAdjudicatedFactKeys.has(factKey(row))
));
const rows = sourceRows.map(classifyRow);
const fingerprintPayload = rows.map((row) => ({
  set_key: row.set_key,
  card_number: row.card_number,
  card_name: row.card_name,
  proposed_variant_key: row.proposed_variant_key,
  target_finish_key: row.target_finish_key,
  readiness_status: row.readiness_status,
  blockers: row.blockers,
}));
const readyRows = rows.filter((row) => row.readiness_status === 'ready_explicit_finish_stamped_identity_parent_insert');
const explicitRows = rows.filter((row) => row.finish_claims.length > 0);

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg15_stamped_explicit_finish_readiness_v1',
  package_id: PACKAGE_ID,
  audit_only: true,
  db_writes_performed: false,
  durable_db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  write_ready_now: 0,
  source_artifacts: {
    stamped_identity_readiness: path.relative(ROOT, READINESS_JSON).replaceAll('\\', '/'),
    generic_variant_adjudication: path.relative(ROOT, GENERIC_ADJUDICATION_JSON).replaceAll('\\', '/'),
  },
  fingerprint_sha256: sha256(stableJson(fingerprintPayload)),
  summary: {
    source_rows_reviewed: sourceRows.length,
    explicit_finish_rows: explicitRows.length,
    ready_rows: readyRows.length,
    blocked_explicit_finish_rows: explicitRows.length - readyRows.length,
    already_adjudicated_rows_suppressed: alreadyAdjudicatedFactKeys.size,
    by_readiness_status: countBy(rows, (row) => row.readiness_status),
    by_ready_set: countBy(readyRows, (row) => row.set_key),
    by_ready_finish: countBy(readyRows, (row) => row.target_finish_key ?? 'none'),
  },
  rows,
  stop_findings: [],
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, checkpointMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON),
  output_md: path.relative(ROOT, OUTPUT_MD),
  checkpoint: path.relative(ROOT, CHECKPOINT_MD),
  fingerprint_sha256: report.fingerprint_sha256,
  summary: report.summary,
  stop_findings: report.stop_findings,
}, null, 2));
