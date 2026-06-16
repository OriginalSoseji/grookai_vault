import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const IMAGE_TRUTH_DIR = 'docs/audits/image_truth_v1';
const MASTER_FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_image_truth_mep_cosmos_finish_governance_v1';
const SOURCE_EVIDENCE_JSON = path.join(IMAGE_TRUTH_DIR, 'image_truth_mep_cosmos_source_evidence_v1.json');
const FINISH_READINESS_JSON = path.join(IMAGE_TRUTH_DIR, 'image_truth_mep_cosmos_finish_governance_readiness_v1.json');
const FIXTURE_JSON = path.join(MASTER_FIXTURE_DIR, 'mep_cosmos_finish_governance_v1.json');
const REPORT_JSON = path.join(IMAGE_TRUTH_DIR, 'image_truth_mep_cosmos_master_index_governance_v1.json');
const REPORT_MD = path.join(IMAGE_TRUTH_DIR, 'image_truth_mep_cosmos_master_index_governance_v1.md');

const PACKAGE_ID = 'IMG-MASTER-01A-MEP-COSMOS-MASTER-INDEX-GOVERNANCE';
const TARGET_NUMBERS = new Set(['018', '019', '020', '021']);

function normalizeNumber(value) {
  return String(value ?? '').trim().replace(/^0+(?=\d)/, '');
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function proofHash(value) {
  return sha256Hex(JSON.stringify(canonicalizeJson(value)));
}

function markdownTable(rows, columns) {
  if (rows.length === 0) return '_None._';
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => {
    const cells = columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|'));
    return `| ${cells.join(' | ')} |`;
  });
  return [header, divider, ...body].join('\n');
}

function fixtureRowsFromEvidence(sourceEvidence) {
  const rows = [];
  for (const sourceRow of sourceEvidence.rows ?? []) {
    if (!TARGET_NUMBERS.has(sourceRow.number)) continue;
    if (sourceRow.source_supported_finish_label !== 'Cosmos Holo') continue;
    for (const evidence of sourceRow.evidence ?? []) {
      rows.push({
        source_key: evidence.source_key,
        source_kind: evidence.source_kind,
        source_url: evidence.source_url,
        set_key: sourceRow.set_code,
        set_name: 'MEP Black Star Promos',
        card_number: normalizeNumber(sourceRow.number),
        card_name: sourceRow.card_name,
        finish_key: 'cosmos',
        rarity: 'Promo',
        evidence_type: 'finish_presence',
        evidence_label: evidence.evidence_label,
        language: 'en',
        retrieved_at: new Date().toISOString(),
        raw_snapshot_ref: `image_truth_mep_cosmos_governance:${sourceRow.set_code}:${normalizeNumber(sourceRow.number)}:${sourceRow.card_name}:cosmos:${evidence.source_key}`,
        notes: 'Accepted from Image Truth V1 MEP cosmos-vs-holo governance. Exact set, number, name, and Cosmos Holo source label are required; this fixture does not authorize DB writes.',
      });
    }
  }
  return rows;
}

function suppressionRowsFromEvidence(sourceEvidence) {
  return (sourceEvidence.rows ?? [])
    .filter((row) => TARGET_NUMBERS.has(row.number))
    .map((row) => ({
      set_key: row.set_code,
      set_name: 'MEP Black Star Promos',
      card_number: normalizeNumber(row.number),
      card_name: row.card_name,
      suppressed_finish_key: 'holo',
      replacement_finish_key: 'cosmos',
      suppression_status: 'stale_holo_label_replaced_by_exact_cosmos_holo_evidence',
      evidence_urls: (row.evidence ?? []).map((entry) => entry.source_url),
      reason: 'Image Truth source acquisition found exact Cosmos Holo labels for this MEP promo. The generic HOLO checklist/API label is treated as a stale broad label for governance planning and must not be used for image-fill targets.',
    }));
}

async function main() {
  const [sourceEvidence, finishReadiness] = await Promise.all([
    fs.readFile(SOURCE_EVIDENCE_JSON, 'utf8').then(JSON.parse),
    fs.readFile(FINISH_READINESS_JSON, 'utf8').then(JSON.parse),
  ]);

  const fixtureRows = fixtureRowsFromEvidence(sourceEvidence);
  const suppressionRows = suppressionRowsFromEvidence(sourceEvidence);
  const sourceCountsByFact = new Map();
  for (const row of fixtureRows) {
    const key = `${row.set_key}|${row.card_number}|${row.card_name}|${row.finish_key}`;
    sourceCountsByFact.set(key, (sourceCountsByFact.get(key) ?? 0) + 1);
  }
  const underSupportedFacts = [...sourceCountsByFact.entries()]
    .filter(([, count]) => count < 2)
    .map(([key, count]) => ({ key, source_count: count }));

  const nonCollidingReadinessRows = (finishReadiness.rows ?? [])
    .filter((row) => TARGET_NUMBERS.has(row.number))
    .filter((row) => row.dry_run_status === 'rollback_finish_update_verified');

  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: 'image_truth_mep_cosmos_finish_governance_v1',
    source_kind: 'marketplace_checklist',
    source_url: 'docs/audits/image_truth_v1/image_truth_mep_cosmos_source_evidence_v1.json',
    source_status: 'available_generated_governance',
    set_key: 'mep',
    set_name: 'MEP Black Star Promos',
    retrieved_at: new Date().toISOString(),
    raw_snapshot_ref: 'generated_fixture:image_truth:mep_cosmos_finish_governance_v1',
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    generation_note: 'Generated from Image Truth V1 source acquisition after PriceCharting image risk was rejected. This fixture adds exact Cosmos Holo finish evidence for MEP 018-021 only.',
    suppressed_printing_facts: suppressionRows.map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.suppressed_finish_key,
      replacement_finish_key: row.replacement_finish_key,
      suppression_status: row.suppression_status,
      evidence_urls: row.evidence_urls,
      reason: row.reason,
    })),
    records: fixtureRows,
  };

  const proof = {
    package_id: PACKAGE_ID,
    fixture_path: FIXTURE_JSON,
    fixture_rows: fixtureRows.length,
    suppression_rows: suppressionRows.length,
    under_supported_facts: underSupportedFacts.length,
    non_colliding_rollback_verified_rows: nonCollidingReadinessRows.length,
    db_writes_performed: false,
    migrations_created: false,
    target_numbers: [...TARGET_NUMBERS].sort(),
    records: fixtureRows.map((row) => ({
      source_key: row.source_key,
      source_url: row.source_url,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
    })),
    suppressions: suppressionRows,
  };

  const report = {
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    package_id: PACKAGE_ID,
    source_evidence: SOURCE_EVIDENCE_JSON,
    finish_readiness: FINISH_READINESS_JSON,
    fixture_path: FIXTURE_JSON,
    fixture_rows: fixtureRows.length,
    facts_supported_by_two_sources: sourceCountsByFact.size - underSupportedFacts.length,
    under_supported_facts: underSupportedFacts,
    suppression_rows: suppressionRows.length,
    non_colliding_rollback_verified_rows: nonCollidingReadinessRows.length,
    master_index_governance_projection: {
      add_finish_presence: fixtureRows.map((row) => ({
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        finish_key: row.finish_key,
        source_key: row.source_key,
        source_url: row.source_url,
      })),
      suppress_stale_finish_presence: suppressionRows,
    },
    ready_for_master_index_probe: fixtureRows.length === 8
      && suppressionRows.length === 4
      && underSupportedFacts.length === 0
      && nonCollidingReadinessRows.length === 4,
    ready_for_real_db_apply: false,
    ready_for_real_db_apply_reason: 'This is a Master Index governance fixture/projection only. A separate fingerprinted DB real-apply gate is still required.',
    proof_hash: proofHash(proof),
    proof,
  };

  await fs.mkdir(MASTER_FIXTURE_DIR, { recursive: true });
  await fs.writeFile(FIXTURE_JSON, `${JSON.stringify(fixture, null, 2)}\n`);
  await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(REPORT_MD, `# Image Truth MEP Cosmos Master Index Governance V1

Generated: ${report.generated_at}

Status: audit-only Master Index governance fixture and suppression projection. No DB writes. No image uploads. No migrations.

## Summary

| Field | Value |
| --- | --- |
| package_id | ${PACKAGE_ID} |
| fixture_rows | ${report.fixture_rows} |
| facts_supported_by_two_sources | ${report.facts_supported_by_two_sources} |
| suppression_rows | ${report.suppression_rows} |
| non_colliding_rollback_verified_rows | ${report.non_colliding_rollback_verified_rows} |
| ready_for_master_index_probe | ${report.ready_for_master_index_probe} |
| ready_for_real_db_apply | ${report.ready_for_real_db_apply} |
| proof_hash | ${report.proof_hash} |

Real DB apply is not authorized by this report: ${report.ready_for_real_db_apply_reason}

## Cosmos Evidence Added To Fixture

${markdownTable(fixtureRows, [
  { label: 'set', value: (row) => row.set_key },
  { label: 'number', value: (row) => row.card_number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'source', value: (row) => row.source_key },
  { label: 'url', value: (row) => row.source_url },
])}

## Stale Holo Suppression Projection

${markdownTable(suppressionRows, [
  { label: 'set', value: (row) => row.set_key },
  { label: 'number', value: (row) => row.card_number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'suppress', value: (row) => row.suppressed_finish_key },
  { label: 'replace with', value: (row) => row.replacement_finish_key },
  { label: 'status', value: (row) => row.suppression_status },
])}

## Explicit Non-Actions

- db_writes_performed: false
- storage_uploads_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
`);

  console.log(JSON.stringify({
    generated: [FIXTURE_JSON, REPORT_JSON, REPORT_MD],
    fixture_rows: report.fixture_rows,
    suppression_rows: report.suppression_rows,
    ready_for_master_index_probe: report.ready_for_master_index_probe,
    proof_hash: report.proof_hash,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
