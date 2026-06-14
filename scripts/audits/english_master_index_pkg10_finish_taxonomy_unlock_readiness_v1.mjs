import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_remaining_missing_reconciliation_lanes_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg10_finish_taxonomy_unlock_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg10_finish_taxonomy_unlock_readiness_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg10_finish_taxonomy_unlock_readiness_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-10-FINISH-TAXONOMY-UNLOCK-READINESS';

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

function topEntries(counts, limit = 20) {
  return Object.entries(counts).slice(0, limit).map(([key, count]) => ({ key, count }));
}

function classify(row) {
  const finish = normalizeText(row.finish_key);
  if (finish === 'cracked ice') {
    return {
      readiness_lane: 'canonical_finish_activation_candidate',
      recommended_package: 'PKG-10A-CRACKED-ICE-FINISH-TAXONOMY-ACTIVATION',
      write_shape_after_approval: 'finish taxonomy activation only, followed by separate child-only insert package',
      reason: 'cracked_ice is a source-backed physical finish/foil treatment; it can be considered as an active child finish key after taxonomy approval.',
      blocked_until: 'finish_keys taxonomy activation dry-run and post-activation child insert dry-run both pass',
    };
  }
  if (finish === 'first edition holo' || finish === 'first edition normal') {
    const decomposed = finish === 'first edition holo' ? 'holo' : 'normal';
    return {
      readiness_lane: 'canonical_edition_parent_required',
      recommended_package: 'PKG-10B-FIRST-EDITION-CANONICAL-PARENT-READINESS',
      write_shape_after_approval: `canonical first-edition parent resolution first, then child ${decomposed} only under the first-edition parent`,
      reason: `${row.finish_key} is an edition/version identity, not a child finish key.`,
      blocked_until: 'first-edition parent identity strategy, collision proof, rollback proof, and exact child routing are ready',
    };
  }
  if (finish === 'stamped') {
    return {
      readiness_lane: 'exact_stamped_identity_required',
      recommended_package: 'PKG-10C-STAMPED-IDENTITY-EVIDENCE-QUEUE',
      write_shape_after_approval: 'stamped canonical identity parent strategy only after exact stamp labels and base routes are proven',
      reason: 'generic stamped is not specific enough to become a child finish key or a parent identity by itself.',
      blocked_until: 'exact stamp text, source URL, base-route proof, deterministic identity modifier, and collision proof exist per row',
    };
  }
  return {
    readiness_lane: 'unknown_finish_taxonomy_blocker',
    recommended_package: 'MANUAL-REVIEW',
    write_shape_after_approval: 'none',
    reason: `No taxonomy strategy exists for finish key ${row.finish_key}.`,
    blocked_until: 'manual finish taxonomy adjudication',
  };
}

function buildRows(sourceRows) {
  return sourceRows.map((row) => ({
    ...row,
    ...classify(row),
  }));
}

function renderMarkdown(report) {
  const laneRows = Object.entries(report.summary.by_readiness_lane).map(([lane, count]) => [
    lane,
    count,
    report.summary.top_sets_by_lane[lane]?.slice(0, 8).map((row) => `${row.key}:${row.count}`).join(', ') ?? '',
  ]);
  const packageRows = report.recommended_next_packages.map((row) => [
    row.package_id,
    row.scope,
    row.candidate_rows,
    row.status,
    row.next_action,
  ]);
  const finishRows = Object.entries(report.summary.by_finish).map(([finish, count]) => [finish, count]);

  return `# English Master Index PKG-10 Finish Taxonomy Unlock Readiness V1

Read-only readiness classification for Master Index rows blocked because their finish key is not active in Grookai.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- real_apply_authorized: false

## Summary

- source_rows: ${report.summary.source_rows}
- package_fingerprint_sha256: ${report.package_fingerprint_sha256}

${markdownTable(['finish_key', 'rows'], finishRows)}

${markdownTable(['readiness_lane', 'rows', 'top_sets'], laneRows)}

## Recommended Next Packages

${markdownTable(['package_id', 'scope', 'candidate_rows', 'status', 'next_action'], packageRows)}

## Guardrails

- Do not add \`first_edition_holo\`, \`first_edition_normal\`, or \`stamped\` as child finish keys.
- Do not insert first-edition children under unlimited/base parents as a proxy for first edition.
- Do not create generic stamped child printings.
- Do not activate \`cracked_ice\` and insert child rows in the same package; taxonomy activation and child inserts need separate proof.
- This report authorizes no writes.
`;
}

const source = await readJson(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => row.lane === 'blocked_finish_taxonomy');
const rows = buildRows(sourceRows);
const byReadinessLane = countBy(rows, (row) => row.readiness_lane);
const topSetsByLane = {};
for (const lane of Object.keys(byReadinessLane)) {
  topSetsByLane[lane] = topEntries(countBy(rows.filter((row) => row.readiness_lane === lane), (row) => row.set_key), 20);
}

const recommendedNextPackages = [
  {
    package_id: 'PKG-10A-CRACKED-ICE-FINISH-TAXONOMY-ACTIVATION',
    scope: 'cracked_ice finish taxonomy only',
    candidate_rows: byReadinessLane.canonical_finish_activation_candidate ?? 0,
    status: (byReadinessLane.canonical_finish_activation_candidate ?? 0) > 0 ? 'dry_run_readiness_next' : 'blocked_no_candidates',
    next_action: 'Prepare finish_keys activation dry-run only; child insert package remains separate.',
  },
  {
    package_id: 'PKG-10B-FIRST-EDITION-CANONICAL-PARENT-READINESS',
    scope: 'first_edition_normal + first_edition_holo canonical parent identity',
    candidate_rows: byReadinessLane.canonical_edition_parent_required ?? 0,
    status: 'strategy_required_before_writes',
    next_action: 'Build parent identity readiness, collision checks, and child routing proof; no finish_key activation.',
  },
  {
    package_id: 'PKG-10C-STAMPED-IDENTITY-EVIDENCE-QUEUE',
    scope: 'stamped exact identity evidence',
    candidate_rows: byReadinessLane.exact_stamped_identity_required ?? 0,
    status: 'evidence_required_before_writes',
    next_action: 'Build exact stamped label/base-route evidence queue before any canonical identity package.',
  },
];

const packageFingerprint = sha256(stableJson(rows.map((row) => ({
  set_key: row.set_key,
  card_number: row.card_number,
  card_name: row.card_name,
  finish_key: row.finish_key,
  readiness_lane: row.readiness_lane,
}))));

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg10_finish_taxonomy_unlock_readiness_v1',
  package_id: PACKAGE_ID,
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  source_artifact: SOURCE_JSON,
  package_fingerprint_sha256: packageFingerprint,
  live_active_finish_keys: source.live_read?.active_finish_keys ?? [],
  summary: {
    source_rows: rows.length,
    by_finish: countBy(rows, (row) => row.finish_key),
    by_readiness_lane: byReadinessLane,
    top_sets_by_lane: topSetsByLane,
    by_recommended_package: countBy(rows, (row) => row.recommended_package),
  },
  recommended_next_packages: recommendedNextPackages,
  rows,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, `# PKG-10 Finish Taxonomy Unlock Readiness Checkpoint V1

- generated_at: ${report.generated_at}
- package_id: ${PACKAGE_ID}
- package_fingerprint_sha256: ${packageFingerprint}
- source_rows: ${rows.length}
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Recommended Next Packages

${markdownTable(['package_id', 'candidate_rows', 'status'], recommendedNextPackages.map((row) => [
  row.package_id,
  row.candidate_rows,
  row.status,
]))}
`);

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  checkpoint_md: CHECKPOINT_MD,
  package_fingerprint_sha256: packageFingerprint,
  summary: report.summary,
  recommended_next_packages: report.recommended_next_packages,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
