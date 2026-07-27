import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const outputRoot =
  'docs/audits/japanese_master_index_v5/product_batch_001';

function json(name, root = outputRoot) {
  return JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
}

function jsonl(name, root = outputRoot) {
  return fs.readFileSync(path.join(root, name), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test('official product batch 001 matches all 50 preserved source rows', () => {
  const report = json('jpn_v5_official_product_batch_001_report_v1.json');
  const rows = jsonl(
    'jpn_v5_official_product_source_rows_batch_001_v1.jsonl',
  );
  assert.equal(report.source_product_count, 50);
  assert.equal(report.exact_raw_product_match_count, 50);
  assert.equal(rows.length, 50);
  assert.ok(rows.every((row) => row.raw_snapshot_sha256.length === 64));
});

test('official descriptions yield only explicitly named card assertions', () => {
  const report = json('jpn_v5_official_product_batch_001_report_v1.json');
  const rows = jsonl(
    'jpn_v5_official_product_card_assertions_batch_001_v1.jsonl',
  );
  assert.equal(report.official_named_card_assertion_count, 23);
  assert.equal(report.products_with_named_card_assertions, 14);
  assert.equal(rows.length, 23);
  assert.ok(rows.every((row) => row.printed_name));
  assert.ok(rows.every((row) => row.unnumbered_label));
  assert.ok(rows.every((row) =>
    /(?:プロモカード|キラカード|ジャンボカード)/
      .test(row.source_fields.contents_line)));
  assert.ok(!rows.some((row) => [
    'はじめてセット',
    'はじめてセット forガール',
    'ポケモンカードゲームあそびかたDS',
  ].includes(row.printed_name)));
});

test('same-name source slots remain distinct official assertions', () => {
  const rows = jsonl(
    'jpn_v5_official_product_card_assertions_batch_001_v1.jsonl',
  );
  const mario = rows.filter((row) => row.printed_name === 'マリオピカチュウ');
  assert.equal(mario.length, 2);
  assert.equal(new Set(mario.map((row) => row.assertion_key)).size, 2);
  assert.notDeepEqual(mario[0].finish_labels, mario[1].finish_labels);
});

test('Poncho Pikachu product preserves both exclusive card slots', () => {
  const rows = jsonl(
    'jpn_v5_official_product_card_assertions_batch_001_v1.jsonl',
  ).filter((row) =>
    row.registry_key === 'jpn-product-169454635447f7a6');
  assert.deepEqual(
    rows.map((row) => row.printed_name),
    [
      'ポンチョを着たピカチュウ（メガリザードンXver.）',
      'ピカチュウ',
    ],
  );
});

test('batch extraction preserves separate disposition lanes', () => {
  const report = json('jpn_v5_official_product_batch_001_report_v1.json');
  const rows = jsonl(
    'jpn_v5_official_product_dispositions_batch_001_v1.jsonl',
  );
  assert.equal(rows.length, 50);
  assert.equal(
    Object.values(report.disposition_counts)
      .reduce((sum, count) => sum + count, 0),
    50,
  );
  assert.ok(report.disposition_counts
    .official_named_card_slots_extracted > 0);
  assert.ok(report.disposition_counts
    .official_identity_manifest_followup_required > 0);
  assert.ok(report.disposition_counts
    .official_random_booster_release_followup > 0);
});

test('official product extraction replays deterministically', () => {
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), 'jpn-v5-product-batch-'),
  );
  const replayRoot = path.join(temp, '.tmp', 'product_batch_001');
  try {
    execFileSync(process.execPath, [
      'scripts/audits/japanese_master_index_v5/'
      + 'official_product_batch_extract_v1.mjs',
      `--output-root=${replayRoot}`,
      '--quiet',
    ]);
    assert.deepEqual(
      json(
        'jpn_v5_official_product_batch_001_fingerprints_v1.json',
        replayRoot,
      ),
      json('jpn_v5_official_product_batch_001_fingerprints_v1.json'),
    );
  } finally {
    fs.rmSync(temp, { force: true, recursive: true });
  }
});

test('official product extraction has no network or database path', () => {
  const source = fs.readFileSync(
    'scripts/audits/japanese_master_index_v5/'
    + 'official_product_batch_extract_v1.mjs',
    'utf8',
  );
  assert.doesNotMatch(source, /\b(fetch|postgres|supabase|storage)\s*\(/i);
  assert.doesNotMatch(
    source,
    /\b(insert|update|delete|truncate|alter|drop)\b\s+(into|table|from)?/i,
  );
});
