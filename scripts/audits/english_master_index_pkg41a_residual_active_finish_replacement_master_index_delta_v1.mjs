import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const ADJUDICATION_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg40a_residual_unsupported_source_adjudication_v1.json');
const PRINTINGS_JSON = path.join(AUDIT_DIR, 'english_master_index_printings_v1.json');
const COMPLETION_EXPORT_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_completion_v1', 'english_master_index_master_admissible_export_v1.json');
const PUBLISHABLE_SET_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_publishable_v1', 'sets', 'smp');
const PUBLISHABLE_PRINTINGS_JSON = path.join(PUBLISHABLE_SET_DIR, 'printings.json');
const PUBLISHABLE_EVIDENCE_JSON = path.join(PUBLISHABLE_SET_DIR, 'evidence.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg41a_residual_active_finish_replacement_master_index_delta_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg41a_residual_active_finish_replacement_master_index_delta_v1.md');

const PACKAGE_ID = 'PKG-41A-RESIDUAL-ACTIVE-FINISH-REPLACEMENT-MASTER-INDEX-DELTA';

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

function authority(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

function rowKey(row) {
  return [row.set_key, row.card_number, row.card_name, row.finish_key].join('|').toLowerCase();
}

function evidenceKey(row) {
  return [row.set_key, row.card_number, row.card_name, row.finish_key ?? '', row.source_url].join('|').toLowerCase();
}

function sortPrintings(rows) {
  return [...rows].sort((left, right) => (
    String(left.set_key).localeCompare(String(right.set_key))
    || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
    || String(left.card_name).localeCompare(String(right.card_name))
    || String(left.finish_key).localeCompare(String(right.finish_key))
  ));
}

function appendUnique(rows, additions, keyFn) {
  const existing = new Set(rows.map(keyFn));
  const inserted = [];
  for (const row of additions) {
    if (existing.has(keyFn(row))) continue;
    rows.push(row);
    existing.add(keyFn(row));
    inserted.push(row);
  }
  return inserted;
}

function findAdjudication(adjudication, setKey, number, cardName) {
  return (adjudication.rows ?? []).find((row) => (
    row.set_key === setKey
    && String(row.card_number) === String(number)
    && row.card_name === cardName
  ));
}

function buildMasterRows(adjudication) {
  const specs = [
    {
      set_key: 'smp',
      set_name: 'SM Black Star Promos',
      card_number: 'SM198',
      lookup_number: '198',
      card_name: 'Bulbasaur',
      route_finish_key: 'holo',
      variant_key: 'pikachu_stamp',
      rarity_values: ['Promo'],
    },
    {
      set_key: 'smp',
      set_name: 'SM Black Star Promos',
      card_number: 'SM65',
      lookup_number: '65',
      card_name: 'Alolan Raichu',
      route_finish_key: 'normal',
      variant_key: 'battle_academy_deck_mark',
      rarity_values: ['Promo'],
    },
  ];

  return specs.map((spec) => {
    const row = findAdjudication(adjudication, spec.set_key, spec.lookup_number, spec.card_name);
    if (!row || row.evidence_count < 2) throw new Error(`Missing evidence for ${spec.set_key} ${spec.card_name}`);
    const evidenceUrls = row.evidence.map((item) => item.source_url);
    const sources = row.evidence.map((item) => item.source_key);
    return {
      fact_type: 'printing_finish',
      key: `${spec.set_name.toLowerCase()}|${spec.card_number}|${spec.card_name.toLowerCase()}|stamped`,
      status: 'master_verified',
      set_key: spec.set_key,
      set_name: spec.set_name,
      card_number: spec.card_number,
      card_name: spec.card_name,
      finish_key: 'stamped',
      rarity_values: spec.rarity_values,
      source_count: sources.length,
      sources,
      source_authorities: [...new Set(evidenceUrls.map(authority))],
      source_kinds: [...new Set(row.evidence.map((item) => item.source_kind))],
      evidence_count: row.evidence.length,
      evidence_urls: evidenceUrls,
      route_finish_key: spec.route_finish_key,
      route_variant_key: spec.variant_key,
    };
  });
}

function buildPublishableRows(masterRows) {
  return masterRows.map((row) => ({
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    language: 'en',
    source_count: row.source_count,
    sources: row.sources,
    source_kinds: row.source_kinds,
    status: row.status,
    evidence_urls: row.evidence_urls,
  }));
}

function buildEvidenceRows(masterRows) {
  return masterRows.flatMap((row) => row.evidence_urls.map((sourceUrl, index) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    source_url: sourceUrl,
    source_key: row.sources[index],
    source_kind: row.source_kinds.length === 1 ? row.source_kinds[0] : undefined,
  })));
}

function buildRouteRows(adjudication) {
  const specs = [
    {
      set_key: 'pl3',
      set_name: 'Supreme Victors',
      lookup_number: '106',
      card_number: '106',
      card_name: 'Gible',
      variant_key: 'staff_stamp',
      accepted_finish_key: 'reverse',
      requires_parent_identity_backfill: true,
      requires_child_replacement: true,
    },
    {
      set_key: 'smp',
      set_name: 'SM Black Star Promos',
      lookup_number: '198',
      card_number: 'SM198',
      card_name: 'Bulbasaur',
      variant_key: 'pikachu_stamp',
      accepted_finish_key: 'holo',
      requires_parent_identity_backfill: true,
      requires_child_replacement: true,
    },
    {
      set_key: 'smp',
      set_name: 'SM Black Star Promos',
      lookup_number: '65',
      card_number: 'SM65',
      card_name: 'Alolan Raichu',
      variant_key: 'battle_academy_deck_mark',
      accepted_finish_key: 'normal',
      requires_parent_identity_backfill: true,
      requires_child_replacement: false,
    },
  ];

  return specs.map((spec) => {
    const row = findAdjudication(adjudication, spec.set_key, spec.lookup_number, spec.card_name);
    if (!row || row.evidence_count < 2) throw new Error(`Missing route evidence for ${spec.set_key} ${spec.card_name}`);
    return {
      set_key: spec.set_key,
      set_name: spec.set_name,
      card_number: spec.card_number,
      card_name: spec.card_name,
      variant_key: spec.variant_key,
      selected_base_parent_id: row.card_print_id,
      base_parent_child_finishes: [row.current_finish_key],
      accepted_finish_key: spec.accepted_finish_key,
      source_family_count: new Set(row.evidence.map((item) => item.source_key.split('_')[0])).size,
      source_families: [...new Set(row.evidence.map((item) => item.source_key.split('_')[0]))].sort(),
      evidence_count: row.evidence_count,
      status: 'ready_for_guarded_dry_run',
      route_origin: PACKAGE_ID,
      source_adjudication_status: row.proposed_status,
      requires_parent_identity_backfill: spec.requires_parent_identity_backfill,
      requires_child_replacement: spec.requires_child_replacement,
      current_finish_key: row.current_finish_key,
      current_child_printing_id: row.card_printing_id,
      evidence: row.evidence.map((item) => ({
        ...item,
        set_key: spec.set_key,
        card_number: spec.card_number,
        card_name: spec.card_name,
        variant_key: spec.variant_key,
        finish_key: spec.accepted_finish_key,
      })),
    };
  });
}

function renderMarkdown(report) {
  return `# PKG-41A Residual Active Finish Replacement Master Index Delta V1

Docs-only Master Index delta and additive stamped route evidence for the next residual closure group.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint_sha256', report.fingerprint_sha256],
    ['master_printing_rows_inserted', report.summary.master_printing_rows_inserted],
    ['route_rows', report.summary.route_rows],
    ['completion_export_rows_inserted', report.summary.completion_export_rows_inserted],
    ['publishable_printing_rows_inserted', report.summary.publishable_printing_rows_inserted],
    ['publishable_evidence_rows_inserted', report.summary.publishable_evidence_rows_inserted],
  ])}

## Master Index Rows Added

${markdownTable(
    ['set', 'number', 'card', 'finish', 'sources'],
    report.added_master_printings.map((row) => [row.set_key, row.card_number, row.card_name, row.finish_key, row.sources.join(', ')]),
  )}

## Route Rows

${markdownTable(
    ['set', 'number', 'card', 'variant', 'accepted_finish', 'replacement'],
    report.rows.map((row) => [row.set_key, row.card_number, row.card_name, row.variant_key, row.accepted_finish_key, String(row.requires_child_replacement)]),
  )}
`;
}

const adjudication = await readJson(ADJUDICATION_JSON);
const master = await readJson(PRINTINGS_JSON);
const completionExport = await readJson(COMPLETION_EXPORT_JSON);
const publishablePrintings = await readJson(PUBLISHABLE_PRINTINGS_JSON);
const publishableEvidence = await readJson(PUBLISHABLE_EVIDENCE_JSON);

const masterRows = buildMasterRows(adjudication);
const routeRows = buildRouteRows(adjudication);

const addedMasterPrintings = appendUnique(master.printings, masterRows, rowKey);
const publishableRows = buildPublishableRows(masterRows);
const evidenceRows = buildEvidenceRows(masterRows);
const addedCompletionPrintings = appendUnique(completionExport.printings, publishableRows, rowKey);
const addedPublishablePrintings = appendUnique(publishablePrintings.printings, publishableRows, rowKey);
const addedPublishableEvidence = appendUnique(publishableEvidence.evidence, evidenceRows, evidenceKey);

master.printings = sortPrintings(master.printings);
completionExport.printings = sortPrintings(completionExport.printings);
publishablePrintings.printings = sortPrintings(publishablePrintings.printings);

await writeJson(PRINTINGS_JSON, master);
await writeJson(COMPLETION_EXPORT_JSON, completionExport);
await writeJson(PUBLISHABLE_PRINTINGS_JSON, publishablePrintings);
await writeJson(PUBLISHABLE_EVIDENCE_JSON, publishableEvidence);

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg41a_residual_active_finish_replacement_master_index_delta_v1',
  package_id: PACKAGE_ID,
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  source_artifacts: {
    adjudication_json: path.relative(ROOT, ADJUDICATION_JSON),
    printings_json: path.relative(ROOT, PRINTINGS_JSON),
    completion_export_json: path.relative(ROOT, COMPLETION_EXPORT_JSON),
    publishable_printings_json: path.relative(ROOT, PUBLISHABLE_PRINTINGS_JSON),
    publishable_evidence_json: path.relative(ROOT, PUBLISHABLE_EVIDENCE_JSON),
  },
  summary: {
    master_printing_rows_inserted: addedMasterPrintings.length,
    route_rows: routeRows.length,
    completion_export_rows_inserted: addedCompletionPrintings.length,
    publishable_printing_rows_inserted: addedPublishablePrintings.length,
    publishable_evidence_rows_inserted: addedPublishableEvidence.length,
  },
  added_master_printings: addedMasterPrintings,
  rows: routeRows,
  safety_confirmation: {
    docs_only: true,
    no_db_writes: true,
    no_migrations: true,
    not_apply_authority: true,
  },
};

report.fingerprint_sha256 = sha256(stableJson({
  package_id: PACKAGE_ID,
  added_master_printings: addedMasterPrintings,
  route_rows: routeRows.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.variant_key,
    accepted_finish_key: row.accepted_finish_key,
    current_child_printing_id: row.current_child_printing_id,
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
