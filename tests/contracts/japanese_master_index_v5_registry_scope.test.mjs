import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const outputRoot =
  'docs/audits/japanese_master_index_v5/registry_scope';

function json(name, root = outputRoot) {
  return JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
}

function jsonl(name, root = outputRoot) {
  return fs.readFileSync(path.join(root, name), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test('scope reconciliation admits only evidence-proven dispositions', () => {
  const rows = jsonl('jpn_v5_registry_scope_dispositions_v1.jsonl');
  const report = json('jpn_v5_registry_scope_reconciliation_report_v1.json');
  assert.equal(rows.length, 72);
  assert.equal(new Set(rows.map((row) => row.release_key)).size, 72);
  assert.deepEqual(report.dispositions.by_disposition, {
    exclude_source_metadata_alias_contamination: 15,
    merge_official_expansion_product_alias: 57,
  });
});

test('TCGdex contaminated aliases resolve only to corroborated Triplet Beat', () => {
  const rows = jsonl('jpn_v5_registry_scope_dispositions_v1.jsonl')
    .filter((row) =>
      row.disposition === 'exclude_source_metadata_alias_contamination');
  assert.equal(rows.length, 15);
  assert.ok(rows.every((row) => row.canonical_release_key === 'jpn-sv1a'));
  assert.ok(rows.every((row) =>
    row.evidence.source_id === 'tcgdex_ja_sets'));
  assert.ok(rows.every((row) =>
    row.evidence.cluster_distinct_container_count === 16));
  assert.ok(rows.every((row) =>
    row.evidence.expected_card_count_evidence[0] === 101));
});

test('official product aliases are expansion-only unique release matches', () => {
  const rows = jsonl('jpn_v5_registry_scope_dispositions_v1.jsonl')
    .filter((row) =>
      row.disposition === 'merge_official_expansion_product_alias');
  assert.equal(rows.length, 57);
  assert.ok(rows.every((row) =>
    row.evidence.canonical_candidate_count > 0));
  assert.ok(rows.every((row) => [
    'exact_release_date',
    'target_date_unavailable',
  ].includes(row.evidence.date_evidence)));
});

test('reconciled denominator removes false slots without adding coverage', () => {
  const report = json('jpn_v5_registry_scope_reconciliation_report_v1.json');
  assert.deepEqual(report.denominator_effect, {
    previous_expected_slots: 23181,
    removed_false_expected_slots: 1515,
    reconciled_expected_slots: 21666,
    covered_slots: 7933,
    previous_percent: 34.22,
    reconciled_percent: 36.61,
    ratio: 0.36614973,
    interpretation:
      'provisional_bounded_coverage_after_evidence_proven_container_dedup',
  });
});

test('scope reconciliation replays deterministically', () => {
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), 'jpn-v5-registry-scope-'),
  );
  const replayRoot = path.join(temp, '.tmp', 'registry_scope');
  try {
    execFileSync(process.execPath, [
      'scripts/audits/japanese_master_index_v5/'
      + 'registry_scope_reconciliation_v1.mjs',
      `--output-root=${replayRoot}`,
      '--quiet',
    ]);
    assert.deepEqual(
      json('jpn_v5_registry_scope_fingerprints_v1.json', replayRoot),
      json('jpn_v5_registry_scope_fingerprints_v1.json'),
    );
  } finally {
    fs.rmSync(temp, { force: true, recursive: true });
  }
});

test('scope reconciliation contains no database or source-fetch path', () => {
  const source = fs.readFileSync(
    'scripts/audits/japanese_master_index_v5/'
    + 'registry_scope_reconciliation_v1.mjs',
    'utf8',
  );
  assert.doesNotMatch(source, /\b(fetch|postgres|supabase|storage)\s*\(/i);
  assert.doesNotMatch(
    source,
    /\b(insert|update|delete|truncate|alter|drop)\b\s+(into|table|from)?/i,
  );
});
