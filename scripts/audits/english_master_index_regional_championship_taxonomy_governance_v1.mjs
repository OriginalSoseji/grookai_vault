import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const INPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_dv1_regional_championship_source_evidence_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_regional_championship_taxonomy_governance_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_regional_championship_taxonomy_governance_v1.md');

const GOVERNING_CONTRACT = 'REGIONAL_CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1';

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
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
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function classifyRow(row) {
  const hasRegional = row.observed_variant_key === 'regional_championships_stamp';
  const hasCrosshatch = row.observed_finish_family === 'crosshatch_holo';
  return {
    ...row,
    governing_contract: GOVERNING_CONTRACT,
    governed_variant_key: hasRegional ? 'regional_championships_stamp' : row.observed_variant_key,
    governed_printed_identity_modifier: hasRegional ? 'regional_championships_stamp' : row.observed_variant_key,
    staff_identity_required: false,
    crosshatch_treatment: hasCrosshatch ? 'evidence_and_display_metadata_not_finish_key' : 'not_applicable',
    active_finish_status: 'blocked_pending_exact_finish_adjudication',
    write_ready_now: 0,
    governance_status: hasRegional
      ? 'identity_governed_finish_blocked'
      : 'identity_still_blocked',
    next_action: hasRegional
      ? 'Use regional_championships_stamp as the parent identity modifier, then adjudicate active finish from exact sources before any guarded dry-run package.'
      : 'Resolve exact tournament identity before readiness.',
  };
}

function buildMarkdown(report) {
  return `# Regional Championship Taxonomy Governance V1

Audit-only application of \`${GOVERNING_CONTRACT}\` to Regional Championships evidence rows.

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['identity_governed_finish_blocked', report.summary.by_governance_status.identity_governed_finish_blocked ?? 0],
    ['write_ready_now', report.summary.write_ready_now],
    ['db_writes_performed', report.safety.db_writes_performed],
    ['migrations_created', report.safety.migrations_created],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Decision

- Regional Championships wording is parent identity-bearing.
- Staff and non-Staff Regional Championships identities must stay separate.
- Crosshatch is evidence/display metadata for now, not a child \`finish_key\`.
- Active child finish remains blocked until exact source labels can be adjudicated into an existing finish key.

## Rows

${markdownTable(
    ['set', 'number', 'card', 'governed variant', 'crosshatch treatment', 'active finish status', 'next action'],
    report.rows.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.governed_variant_key,
      row.crosshatch_treatment,
      row.active_finish_status,
      row.next_action,
    ]),
  )}

## Safety

- No DB writes.
- No migrations.
- No dry-run package prepared.
- No finish-key activation.
- No collapse into generic \`league_stamp\`.
`;
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const rows = (input.rows ?? []).map(classifyRow);
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_regional_championship_taxonomy_governance_v1',
    input_report: path.relative(ROOT, INPUT_JSON).replaceAll('\\', '/'),
    governing_contract: GOVERNING_CONTRACT,
    audit_only: true,
    safety: {
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
      quarantine_performed: false,
      global_apply_performed: false,
      dry_run_package_prepared: false,
    },
    summary: {
      target_rows: rows.length,
      write_ready_now: 0,
      by_governance_status: countBy(rows, (row) => row.governance_status),
      by_governed_variant_key: countBy(rows, (row) => row.governed_variant_key),
      by_active_finish_status: countBy(rows, (row) => row.active_finish_status),
    },
    rows,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    summary: report.summary,
    rows: rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      governed_variant_key: row.governed_variant_key,
      crosshatch_treatment: row.crosshatch_treatment,
      active_finish_status: row.active_finish_status,
    })),
  }));

  await fs.mkdir(AUDIT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, buildMarkdown(report));

  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    summary: report.summary,
    fingerprint_sha256: report.fingerprint_sha256,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
