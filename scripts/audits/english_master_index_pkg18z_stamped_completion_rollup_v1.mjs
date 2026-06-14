import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const ARTIFACTS = {
  execution_queue: path.join(AUDIT_DIR, 'english_master_index_pkg18x_stamped_post_governance_execution_queue_v1.json'),
  no_write_governance: path.join(AUDIT_DIR, 'english_master_index_pkg18ab_stamped_no_write_governance_closure_v1.json'),
  base_parent_resolution: path.join(AUDIT_DIR, 'english_master_index_pkg18c_stamped_base_parent_resolution_closure_v1.json'),
  prize_pack_mapping: path.join(AUDIT_DIR, 'english_master_index_pkg18d_prize_pack_finish_mapping_closure_v1.json'),
  source_acquisition: path.join(AUDIT_DIR, 'english_master_index_pkg18ef_stamped_source_acquisition_closure_v1.json'),
  conflict_closure: path.join(AUDIT_DIR, 'english_master_index_pkg18g_stamped_conflict_manual_closure_v1.json'),
};
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18z_stamped_completion_rollup_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg18z_stamped_completion_rollup_v1.md');

const PACKAGE_ID = 'PKG-18Z-STAMPED-COMPLETION-ROLLUP';

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

function renderMarkdown(report) {
  return `# PKG-18Z Stamped Completion Rollup V1

Audit-only rollup for the stamped completion governance pass.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

${markdownTable(['metric', 'value'], [
    ['original_execution_queue_rows', report.summary.original_execution_queue_rows],
    ['closed_or_classified_rows', report.summary.closed_or_classified_rows],
    ['write_ready_rows', report.summary.write_ready_rows],
    ['no_write_governance_rows', report.summary.no_write_governance_rows],
    ['base_parent_rows_classified', report.summary.base_parent_rows_classified],
    ['prize_pack_rows_blocked', report.summary.prize_pack_rows_blocked],
    ['source_acquisition_rows_blocked', report.summary.source_acquisition_rows_blocked],
    ['manual_conflict_rows_blocked', report.summary.manual_conflict_rows_blocked],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Bucket Outcomes

${markdownTable(['bucket', 'rows', 'outcome'], report.bucket_outcomes.map((bucket) => [
    bucket.bucket,
    bucket.rows,
    bucket.outcome,
  ]))}

## Result

All PKG-18 stamped buckets are classified. No real apply package is authorized by this rollup.
`;
}

async function main() {
  const [
    executionQueue,
    noWriteGovernance,
    baseParentResolution,
    prizePackMapping,
    sourceAcquisition,
    conflictClosure,
  ] = await Promise.all(Object.values(ARTIFACTS).map(readJson));

  const bucketOutcomes = [
    {
      bucket: '01/02 no-write governance',
      rows: noWriteGovernance.summary.closed_rows,
      outcome: 'closed from write-readiness by governance; no DB writes needed',
    },
    {
      bucket: '03 base-parent resolution',
      rows: baseParentResolution.summary.target_rows,
      outcome: `${baseParentResolution.summary.closed_as_stale_return_to_stamped_flow} stale-return rows; ${baseParentResolution.summary.blocked_rows} blocked; 0 insert candidates`,
    },
    {
      bucket: '04 Prize Pack finish mapping',
      rows: prizePackMapping.summary.target_rows,
      outcome: `${prizePackMapping.summary.blocked_rows} blocked; 0 write-ready rows`,
    },
    {
      bucket: '05/06 variant-family and second-source acquisition',
      rows: sourceAcquisition.summary.target_rows,
      outcome: `${sourceAcquisition.summary.blocked_rows} blocked; ${sourceAcquisition.summary.useful_candidate_matches} useful source-delta matches`,
    },
    {
      bucket: '07 manual conflicts',
      rows: conflictClosure.summary.conflict_rows,
      outcome: 'blocked for manual adjudication; fail closed',
    },
  ];
  const closedOrClassifiedRows = bucketOutcomes.reduce((sum, bucket) => sum + Number(bucket.rows ?? 0), 0);
  const payload = {
    artifact_fingerprints: {
      execution_queue: executionQueue.fingerprint_sha256,
      no_write_governance: noWriteGovernance.fingerprint_sha256,
      base_parent_resolution: baseParentResolution.fingerprint_sha256,
      prize_pack_mapping: prizePackMapping.fingerprint_sha256,
      source_acquisition: sourceAcquisition.fingerprint_sha256,
      conflict_closure: conflictClosure.fingerprint_sha256,
    },
    bucketOutcomes,
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg18z_stamped_completion_rollup_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    write_ready_now: 0,
    source_artifacts: Object.fromEntries(Object.entries(ARTIFACTS).map(([key, filePath]) => [key, rel(filePath)])),
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      original_execution_queue_rows: executionQueue.summary.remaining_rows,
      closed_or_classified_rows: closedOrClassifiedRows,
      write_ready_rows: 0,
      no_write_governance_rows: noWriteGovernance.summary.closed_rows,
      base_parent_rows_classified: baseParentResolution.summary.target_rows,
      prize_pack_rows_blocked: prizePackMapping.summary.blocked_rows,
      source_acquisition_rows_blocked: sourceAcquisition.summary.blocked_rows,
      manual_conflict_rows_blocked: conflictClosure.summary.conflict_rows,
    },
    bucket_outcomes: bucketOutcomes,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    write_ready_now: report.write_ready_now,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
