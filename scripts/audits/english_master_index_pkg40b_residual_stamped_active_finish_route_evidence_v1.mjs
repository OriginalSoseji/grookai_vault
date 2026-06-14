import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg40a_residual_unsupported_source_adjudication_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg40b_residual_stamped_active_finish_route_evidence_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg40b_residual_stamped_active_finish_route_evidence_v1.md');

const PACKAGE_ID = 'PKG-40B-RESIDUAL-STAMPED-ACTIVE-FINISH-ROUTE-EVIDENCE';

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

function sourceFamily(sourceKey) {
  return String(sourceKey ?? '').split('_')[0] || 'unknown';
}

function isRouteReady(row) {
  return [
    'stamped_active_finish_route_and_identity_backfill_ready',
    'stamped_active_finish_route_ready',
  ].includes(row.proposed_status)
    && row.required_master_fact_exists
    && row.required_master_fact_finish_key === 'stamped'
    && row.proposed_active_finish_key
    && row.proposed_variant_key
    && row.evidence_count >= 2;
}

function buildRows(source) {
  return (source.rows ?? []).filter(isRouteReady).map((row) => ({
    set_key: row.set_key,
    set_name: row.set_name ?? row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.proposed_variant_key,
    selected_base_parent_id: row.card_print_id,
    base_parent_child_finishes: [],
    accepted_finish_key: row.proposed_active_finish_key,
    source_family_count: new Set(row.evidence.map((item) => sourceFamily(item.source_key))).size,
    source_families: [...new Set(row.evidence.map((item) => sourceFamily(item.source_key)))].sort(),
    evidence_count: row.evidence_count,
    status: 'ready_for_guarded_dry_run',
    route_origin: PACKAGE_ID,
    source_adjudication_status: row.proposed_status,
    requires_parent_identity_backfill: row.proposed_status === 'stamped_active_finish_route_and_identity_backfill_ready',
    evidence: row.evidence.map((item) => ({
      ...item,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.proposed_variant_key,
      finish_key: row.proposed_active_finish_key,
    })),
  }));
}

function renderMarkdown(report) {
  return `# PKG-40B Residual Stamped Active Finish Route Evidence V1

Docs-only additive route evidence for residual stamped rows. This file is consumed by the unsupported-lane report alongside the historical PKG-17E route artifact.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint_sha256', report.fingerprint_sha256],
    ['route_rows', report.summary.route_rows],
    ['identity_backfill_required_rows', report.summary.identity_backfill_required_rows],
    ['route_only_rows', report.summary.route_only_rows],
    ['evidence_rows', report.summary.evidence_rows],
  ])}

## Route Rows

${markdownTable(
    ['set', 'number', 'card', 'variant', 'active_finish', 'identity_backfill_required', 'sources'],
    report.rows.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.variant_key,
      row.accepted_finish_key,
      String(row.requires_parent_identity_backfill),
      row.source_families.join(', '),
    ]),
  )}
`;
}

const source = await readJson(SOURCE_JSON);
const rows = buildRows(source);
if (rows.length !== 8) {
  throw new Error(`Expected 8 residual stamped route rows, found ${rows.length}`);
}

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg40b_residual_stamped_active_finish_route_evidence_v1',
  package_id: PACKAGE_ID,
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  source_artifact: path.relative(ROOT, SOURCE_JSON),
  source_fingerprint_sha256: source.fingerprint_sha256,
  summary: {
    route_rows: rows.length,
    identity_backfill_required_rows: rows.filter((row) => row.requires_parent_identity_backfill).length,
    route_only_rows: rows.filter((row) => !row.requires_parent_identity_backfill).length,
    evidence_rows: rows.reduce((sum, row) => sum + row.evidence_count, 0),
  },
  rows,
  safety_confirmation: {
    no_db_writes: true,
    no_migrations: true,
    route_evidence_only: true,
    not_apply_authority: true,
  },
};

report.fingerprint_sha256 = sha256(stableJson({
  package_id: PACKAGE_ID,
  rows: rows.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    accepted_finish_key: row.accepted_finish_key,
    variant_key: row.variant_key,
    evidence_urls: row.evidence.map((item) => item.source_url),
  })),
}));

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON),
  output_md: path.relative(ROOT, OUTPUT_MD),
  fingerprint_sha256: report.fingerprint_sha256,
  summary: report.summary,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
