import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  buildCardTraderNormalContainmentV1,
} from '../../scripts/audits/english_master_index_cardtrader_normal_containment_v1.mjs';

const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_cardtrader_v1';
const MASTER_PRINTINGS = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_printings_v1.json';
const ALIAS_REPORT = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_set_alias_normalization_v1.json';
const REPORT_JSON = 'docs/audits/verified_master_set_index_v1/cardtrader_normal_containment_v1/cardtrader_normal_containment_v1.json';
const REPORT_MARKDOWN = 'docs/audits/verified_master_set_index_v1/cardtrader_normal_containment_v1/cardtrader_normal_containment_v1.md';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function listJsonFilesRecursive(rootDir) {
  return fs.readdirSync(rootDir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) return listJsonFilesRecursive(entryPath);
    return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : [];
  }).sort();
}

function buildCurrentReport() {
  const files = listJsonFilesRecursive(FIXTURE_DIR);
  const fixtures = files.map((file) => ({
    path: file.replace(/\\/g, '/'),
    payload: readJson(file),
  }));
  return buildCardTraderNormalContainmentV1({
    fixtures,
    fixtureFiles: files,
    masterPrintings: readJson(MASTER_PRINTINGS),
    aliasReport: readJson(ALIAS_REPORT),
    generatedAt: 'test-snapshot',
    inputs: {},
  });
}

test('legacy CardTrader Normal containment snapshot is exact and fail-closed', () => {
  const report = buildCurrentReport();

  assert.equal(report.summary.fixture_files_scanned, 80);
  assert.equal(report.summary.fixture_records_scanned, 1297);
  assert.equal(report.summary.raw_normal_records, 1206);
  assert.equal(report.summary.explicit_normal_or_non_holo_records, 0);
  assert.equal(report.summary.unqualified_inferred_normal_records, 1206);
  assert.equal(report.summary.canonical_contaminated_normal_facts, 1099);
  assert.equal(report.summary.canonical_sets_affected, 58);
  assert.equal(report.summary.alias_duplicate_occurrences_collapsed, 107);
  assert.equal(report.summary.current_master_index_matches, 1099);
  assert.equal(report.summary.current_master_facts_with_cardtrader_source, 1099);
  assert.equal(report.summary.confirmed_false_me04_normals, 45);
  assert.equal(report.invariant_checks.every((row) => row.passed), true);
  assert.equal(report.overall_status, 'fail_closed_rebuild_and_review_required');
  assert.equal(
    report.facts.every((row) => row.source_finish_classification.post_loader_finish_key === null),
    true,
  );
  assert.equal(
    report.facts.every((row) => row.source_finish_classification.post_loader_evidence_type === 'finish_unknown_unqualified_provider'),
    true,
  );
});

test('containment projection never treats legacy CardTrader evidence as a second authority', () => {
  const report = buildCurrentReport();

  assert.deepEqual(report.summary.current_master_statuses, {
    master_verified: 1098,
    human_source_verified: 1,
  });
  assert.deepEqual(report.summary.current_master_source_combinations, {
    'cardtrader_blueprint_index + tcgdex': 1095,
    'cardtrader_blueprint_index + pokemontcg_api': 2,
    cardtrader_blueprint_index: 1,
    'cardtrader_blueprint_index + thepricedex_price_list': 1,
  });
  assert.deepEqual(report.summary.projected_statuses_after_rebuild, {
    candidate_unconfirmed: 1052,
    suppressed_reviewed: 45,
    human_source_verified: 1,
    no_qualified_finish_evidence: 1,
  });
  assert.deepEqual(report.summary.dispositions, {
    human_checklist_reverification_required: 1052,
    confirmed_false_suppression: 45,
    independent_verification_required: 1,
    second_authority_required: 1,
  });

  const noEvidence = report.facts.filter((row) => (
    row.containment.projected_status_after_rebuild === 'no_qualified_finish_evidence'
  ));
  assert.equal(noEvidence.length, 1);
  assert.equal(noEvidence[0].set_key, 'ex9');
  assert.equal(noEvidence[0].card_number, '107');
  assert.equal(noEvidence[0].card_name, "Farfetch'd");
});

test('committed containment report matches the current fixture and Master Index snapshot', () => {
  const current = buildCurrentReport();
  const committed = readJson(REPORT_JSON);
  const markdown = fs.readFileSync(REPORT_MARKDOWN, 'utf8');

  assert.equal(committed.version, 'CARDTRADER_NORMAL_CONTAINMENT_V1');
  assert.equal(committed.audit_only, true);
  assert.equal(committed.db_writes_performed, false);
  assert.equal(committed.migrations_created, false);
  assert.equal(committed.automatic_deletes_performed, false);
  assert.deepEqual(committed.summary, current.summary);
  assert.deepEqual(
    committed.facts.map((row) => row.fact_key),
    current.facts.map((row) => row.fact_key),
  );
  assert.match(markdown, /No database writes, migrations, automatic deletions/);
  assert.match(markdown, /remaining facts require reclassification or independent evidence/);
});
