import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const corpusRoot =
  'docs/audits/japanese_master_index_v5/product_corpus';
const reconciliationRoot =
  'docs/audits/japanese_master_index_v5/product_corpus_reconciliation';

function json(root, name) {
  return JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
}

function jsonl(root, name) {
  return fs.readFileSync(path.join(root, name), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test('official product corpus covers all zero-inventory products', () => {
  const report = json(
    corpusRoot,
    'jpn_v5_official_product_corpus_report_v1.json',
  );
  assert.equal(report.source_product_count, 455);
  assert.equal(report.exact_raw_product_match_count, 455);
  assert.equal(report.official_named_card_assertion_count, 191);
  assert.equal(report.products_with_named_card_assertions, 101);
  assert.equal(
    Object.values(report.disposition_counts)
      .reduce((sum, count) => sum + count, 0),
    455,
  );
});

test('corpus reconciliation never promotes by Japanese name alone', () => {
  const report = json(
    reconciliationRoot,
    'jpn_v5_official_product_corpus_reconciliation_report_v1.json',
  );
  const rows = jsonl(
    reconciliationRoot,
    'jpn_v5_official_product_assertion_reconciliation_v1.jsonl',
  );
  assert.equal(rows.length, 191);
  assert.equal(report.strict_identity_admission_count, 0);
  assert.equal(report.boundary.name_only_identity_merges, 0);
  assert.ok(rows.every((row) => row.strict_identity_admitted === false));
  assert.ok(rows.every((row) =>
    row.admission_blockers.includes('printed_number_missing')));
  assert.ok(rows.every((row) =>
    row.admission_blockers.includes('governed_unnumbered_image_missing')));
});

test('corpus reconciliation quantifies novel and ambiguous slots', () => {
  const report = json(
    reconciliationRoot,
    'jpn_v5_official_product_corpus_reconciliation_report_v1.json',
  );
  assert.deepEqual(report.disposition_counts, {
    ambiguous_name_match_needs_image_or_number: 166,
    novel_official_slot_needs_image_or_number: 19,
    single_name_match_other_release_needs_print_confirmation: 6,
  });
  assert.equal(report.bounded_coverage_before.covered_slots, 7_933);
  assert.deepEqual(
    report.bounded_coverage_after,
    report.bounded_coverage_before,
  );
});

test('follow-up queue prioritizes official card-list lanes', () => {
  const rows = jsonl(
    reconciliationRoot,
    'jpn_v5_official_product_evidence_followup_queue_v1.jsonl',
  );
  assert.equal(rows.length, 116);
  assert.equal(rows.filter((row) => row.link_card_list).length, 15);
  assert.ok(rows.slice(0, 15).every((row) => row.priority === 0));
  assert.ok(rows.slice(0, 15).every((row) => row.link_card_list));
});

test('product corpus reconciliation replays deterministically', () => {
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), 'jpn-v5-product-reconcile-'),
  );
  const replayRoot = path.join(temp, '.tmp', 'product_reconciliation');
  try {
    execFileSync(process.execPath, [
      'scripts/audits/japanese_master_index_v5/'
      + 'official_product_corpus_reconcile_v1.mjs',
      `--output-root=${replayRoot}`,
      '--quiet',
    ]);
    assert.deepEqual(
      json(
        replayRoot,
        'jpn_v5_official_product_corpus_reconciliation_fingerprints_v1.json',
      ),
      json(
        reconciliationRoot,
        'jpn_v5_official_product_corpus_reconciliation_fingerprints_v1.json',
      ),
    );
  } finally {
    fs.rmSync(temp, { force: true, recursive: true });
  }
});

test('corpus reconciliation remains read-only', () => {
  const source = fs.readFileSync(
    'scripts/audits/japanese_master_index_v5/'
    + 'official_product_corpus_reconcile_v1.mjs',
    'utf8',
  );
  assert.doesNotMatch(source, /\b(fetch|postgres|supabase|storage)\s*\(/i);
  assert.doesNotMatch(
    source,
    /\b(insert|update|delete|truncate|alter|drop)\b\s+(into|table|from)?/i,
  );
});
