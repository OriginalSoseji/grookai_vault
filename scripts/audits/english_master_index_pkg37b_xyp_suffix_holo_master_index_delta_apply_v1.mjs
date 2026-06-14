import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const ADJUDICATION_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg37a_xyp_suffix_finish_adjudication_v1.json');
const PRINTINGS_JSON = path.join(AUDIT_DIR, 'english_master_index_printings_v1.json');
const COMPLETION_EXPORT_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_completion_v1', 'english_master_index_master_admissible_export_v1.json');
const PUBLISHABLE_PRINTINGS_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_publishable_v1', 'sets', 'xyp', 'printings.json');
const PUBLISHABLE_EVIDENCE_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_publishable_v1', 'sets', 'xyp', 'evidence.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg37b_xyp_suffix_holo_master_index_delta_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg37b_xyp_suffix_holo_master_index_delta_apply_v1.md');

const PACKAGE_ID = 'PKG-37B-XYP-SUFFIX-HOLO-MASTER-INDEX-DELTA';

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

function rowKey(row) {
  return [row.set_key, row.card_number, row.card_name, row.finish_key].join('|').toLowerCase();
}

function sortPrintings(rows) {
  return [...rows].sort((left, right) => (
    String(left.set_key).localeCompare(String(right.set_key))
    || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
    || String(left.card_name).localeCompare(String(right.card_name))
    || String(left.finish_key).localeCompare(String(right.finish_key))
  ));
}

function authority(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

function buildMasterRows(adjudication) {
  return adjudication.rows
    .filter((row) => row.adjudication_status === 'holo_master_index_delta_ready')
    .map((row) => {
      const sources = row.explicit_holo_evidence.map((evidence) => evidence.source_key);
      const sourceKinds = [...new Set(row.explicit_holo_evidence.map((evidence) => evidence.source_kind))];
      const evidenceUrls = row.explicit_holo_evidence.map((evidence) => evidence.source_url);
      return {
        fact_type: 'printing_finish',
        key: `xy black star promos|${row.card_number}|${row.card_name.toLowerCase()}|holo`,
        status: 'master_verified',
        set_key: 'xyp',
        set_name: 'XY Black Star Promos',
        card_number: row.card_number,
        card_name: row.card_name,
        finish_key: 'holo',
        rarity_values: ['Promo'],
        source_count: sources.length,
        sources,
        source_authorities: [...new Set(evidenceUrls.map(authority))],
        source_kinds: sourceKinds,
        evidence_count: row.explicit_holo_evidence.length,
        evidence_urls: evidenceUrls,
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

function appendUnique(rows, additions) {
  const existing = new Set(rows.map(rowKey));
  const inserted = [];
  for (const row of additions) {
    if (existing.has(rowKey(row))) continue;
    rows.push(row);
    existing.add(rowKey(row));
    inserted.push(row);
  }
  return inserted;
}

function appendEvidenceUnique(rows, additions) {
  const key = (row) => [row.set_key, row.card_number, row.card_name, row.finish_key ?? '', row.source_url].join('|').toLowerCase();
  const existing = new Set(rows.map(key));
  const inserted = [];
  for (const row of additions) {
    if (existing.has(key(row))) continue;
    rows.push(row);
    existing.add(key(row));
    inserted.push(row);
  }
  return inserted;
}

function renderMarkdown(report) {
  return `# PKG-37B XYP Suffix Holo Master Index Delta V1

Docs-only Master Index delta for XYP suffix holo promo printings.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint_sha256],
    ['master_printing_rows_inserted', report.summary.master_printing_rows_inserted],
    ['completion_export_rows_inserted', report.summary.completion_export_rows_inserted],
    ['publishable_printing_rows_inserted', report.summary.publishable_printing_rows_inserted],
    ['publishable_evidence_rows_inserted', report.summary.publishable_evidence_rows_inserted],
  ])}

## Added Printings

${markdownTable(
    ['set', 'number', 'card', 'finish', 'sources'],
    report.added_master_printings.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.finish_key,
      row.sources.join(', '),
    ]),
  )}
`;
}

const adjudication = await readJson(ADJUDICATION_JSON);
const printings = await readJson(PRINTINGS_JSON);
const completionExport = await readJson(COMPLETION_EXPORT_JSON);
const publishablePrintings = await readJson(PUBLISHABLE_PRINTINGS_JSON);
const publishableEvidence = await readJson(PUBLISHABLE_EVIDENCE_JSON);

const masterRows = buildMasterRows(adjudication);
if (masterRows.length !== 5) throw new Error(`Expected 5 XYP suffix holo master rows, found ${masterRows.length}`);

const addedMasterPrintings = appendUnique(printings.printings, masterRows);
const addedCompletionPrintings = appendUnique(completionExport.printings, buildPublishableRows(masterRows));
const addedPublishablePrintings = appendUnique(publishablePrintings.printings, buildPublishableRows(masterRows));
const addedPublishableEvidence = appendEvidenceUnique(publishableEvidence.evidence, buildEvidenceRows(masterRows));

printings.printings = sortPrintings(printings.printings);
completionExport.printings = sortPrintings(completionExport.printings);
publishablePrintings.printings = sortPrintings(publishablePrintings.printings);

await writeJson(PRINTINGS_JSON, printings);
await writeJson(COMPLETION_EXPORT_JSON, completionExport);
await writeJson(PUBLISHABLE_PRINTINGS_JSON, publishablePrintings);
await writeJson(PUBLISHABLE_EVIDENCE_JSON, publishableEvidence);

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg37b_xyp_suffix_holo_master_index_delta_apply_v1',
  package_id: PACKAGE_ID,
  fingerprint_sha256: sha256(stableJson({
    package_id: PACKAGE_ID,
    added_master_printings: addedMasterPrintings,
  })),
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
    completion_export_rows_inserted: addedCompletionPrintings.length,
    publishable_printing_rows_inserted: addedPublishablePrintings.length,
    publishable_evidence_rows_inserted: addedPublishableEvidence.length,
  },
  added_master_printings: addedMasterPrintings,
};

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
