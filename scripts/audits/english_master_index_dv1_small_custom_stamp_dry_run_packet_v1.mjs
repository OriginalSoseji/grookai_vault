import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const LIVE_READINESS_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_dv1_small_custom_stamp_live_readiness_v1.json',
);
const PRIOR_PACKAGE_JSONS = [
  path.join(AUDIT_DIR, 'english_master_index_dv1_stamp_holo_review_ready_guarded_dry_run_v1.json'),
  path.join(AUDIT_DIR, 'english_master_index_dv1_stamp_holo_second_wave_guarded_dry_run_v1.json'),
];
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_dv1_small_custom_stamp_dry_run_packet_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  'english_master_index_dv1_small_custom_stamp_dry_run_packet_v1.md',
);

const PACKAGE_ID = 'DV1-SMALL-CUSTOM-STAMP-DRAGON-VAULT-PARENT-INSERTS';

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

function targetKey(row) {
  return `${row.set_key}|${row.card_number}|${String(row.card_name).toLowerCase()}|${row.variant_key}|${row.finish_key}`;
}

function buildMarkdown(report) {
  return `# DV1 Small Custom Stamp Dry-Run Packet V1

No-write operator packet for the four Dragon Vault Stamp holo rows.

This packet prepares the scope and fingerprint for a future rollback-only guarded dry-run. It does not execute a transaction, generate SQL, or apply writes.

## Summary

${markdownTable(['metric', 'value'], [
    ['package_id', `\`${report.package_id}\``],
    ['target_rows', report.summary.target_rows],
    ['parent_insert_scope', report.summary.parent_insert_scope],
    ['identity_insert_scope', report.summary.identity_insert_scope],
    ['child_insert_scope', report.summary.child_insert_scope],
    ['finish_holo', report.summary.finish_counts.holo ?? 0],
    ['write_ready_now', report.summary.write_ready_now],
    ['db_writes_performed', report.safety.db_writes_performed],
    ['migrations_created', report.safety.migrations_created],
    ['sql_generated', report.safety.sql_generated],
    ['package_fingerprint_sha256', `\`${report.package_fingerprint_sha256}\``],
  ])}

## Scope

${markdownTable(
    ['set', 'number', 'card', 'stamp', 'variant', 'finish', 'target parent', 'target child'],
    report.targets.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.stamp_label,
      row.target_variant_key,
      row.target_finish_key,
      row.target_parent_id,
      row.target_child_id,
    ]),
  )}

## Required Approval For Next Step

\`\`\`text
Approve ${report.package_id} for guarded rollback-only dry-run transaction execution only. Fingerprint: ${report.package_fingerprint_sha256}. Scope: 4 Dragon Vault stamped parent inserts, 4 active identity inserts, 4 holo child printing inserts. No real apply. No migrations. No deletes. No merges. No unsupported cleanup.
\`\`\`

## Stop Conditions

- Stop if any target parent already exists.
- Stop if any target child already exists.
- Stop if any target active identity already exists.
- Stop if identity projection is not ready.
- Stop if any identity hash collision appears.
- Stop if the base holo child is missing.
- Stop if any SQL would commit instead of rollback.

## Safety

- No DB writes.
- No migrations.
- No SQL generated.
- No rollback transaction executed.
- No real apply.
`;
}

async function main() {
  const liveReadiness = await readJson(LIVE_READINESS_JSON);
  const readyRows = (liveReadiness.rows ?? [])
    .filter((row) => row.live_readiness_status === 'ready_for_fresh_guarded_dry_run_artifact');

  const priorTargetsByKey = new Map();
  for (const artifactPath of PRIOR_PACKAGE_JSONS) {
    const artifact = await readJson(artifactPath);
    for (const target of artifact.targets ?? []) {
      priorTargetsByKey.set(targetKey({
        set_key: target.set_key,
        card_number: target.card_number,
        card_name: target.card_name,
        variant_key: target.target_variant_key,
        finish_key: target.target_finish_key,
      }), {
        ...target,
        source_artifact: rel(artifactPath),
        source_package_id: artifact.package_id,
        source_package_fingerprint_sha256: artifact.fingerprint_sha256,
      });
    }
  }

  const targets = readyRows.map((row) => {
    const prior = priorTargetsByKey.get(targetKey(row));
    if (!prior) throw new Error(`Missing prior deterministic target metadata for ${targetKey(row)}`);
    return {
      set_key: row.set_key,
      set_name: 'Dragon Vault',
      card_number: row.card_number,
      card_name: row.card_name,
      base_parent_id: row.base_parent_id,
      target_parent_id: prior.target_parent_id,
      target_child_id: prior.target_child_id,
      target_finish_key: row.finish_key,
      target_variant_key: row.variant_key,
      target_printed_identity_modifier: row.variant_key,
      stamp_label: row.stamp_label,
      evidence: prior.evidence,
      source_artifact: prior.source_artifact,
      source_package_id: prior.source_package_id,
      source_package_fingerprint_sha256: prior.source_package_fingerprint_sha256,
      live_readiness_status: row.live_readiness_status,
    };
  }).sort((left, right) => Number(left.card_number) - Number(right.card_number));

  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    input_fingerprint_sha256: liveReadiness.fingerprint_sha256,
    targets: targets.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name.toLowerCase(),
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      base_parent_id: row.base_parent_id,
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
    })),
  }));

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_dv1_small_custom_stamp_dry_run_packet_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint,
    input_report: rel(LIVE_READINESS_JSON),
    source_artifacts: PRIOR_PACKAGE_JSONS.map(rel),
    audit_only: true,
    safety: {
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
      quarantine_performed: false,
      global_apply_performed: false,
      sql_generated: false,
      rollback_transaction_executed: false,
    },
    summary: {
      target_rows: targets.length,
      parent_insert_scope: targets.length,
      identity_insert_scope: targets.length,
      child_insert_scope: targets.length,
      finish_counts: { holo: targets.length },
      write_ready_now: 0,
    },
    targets,
    required_approval_text: `Approve ${PACKAGE_ID} for guarded rollback-only dry-run transaction execution only. Fingerprint: ${packageFingerprint}. Scope: 4 Dragon Vault stamped parent inserts, 4 active identity inserts, 4 holo child printing inserts. No real apply. No migrations. No deletes. No merges. No unsupported cleanup.`,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));

  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    package_id: report.package_id,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    summary: report.summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
