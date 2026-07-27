import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const root =
  'docs/audits/japanese_master_index_v5/official_product_links';
const parsedRoot = path.join(root, 'parsed');

function json(rootPath, name) {
  return JSON.parse(fs.readFileSync(path.join(rootPath, name), 'utf8'));
}

function jsonl(rootPath, name) {
  return fs.readFileSync(path.join(rootPath, name), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test('official product link snapshots are complete and hash-verified', () => {
  const manifest = json(
    root,
    'jpn_v5_official_product_link_snapshot_manifest_v1.json',
  );
  assert.equal(manifest.source_product_count, 15);
  assert.equal(manifest.unique_request_url_count, 11);
  assert.equal(manifest.snapshot_origin_live_fetch_count, 11);
  for (const snapshot of manifest.snapshots) {
    assert.equal(new URL(snapshot.source_url).hostname, 'www.pokemon-card.com');
    const body = fs.readFileSync(snapshot.body_path);
    assert.equal(
      crypto.createHash('sha256').update(body).digest('hex'),
      snapshot.metadata.body_sha256,
    );
    assert.equal(snapshot.metadata.http_status, 200);
  }
});

test('official card-list parser extracts identity rather than copy count', () => {
  const report = json(
    parsedRoot,
    'jpn_v5_official_product_link_parse_report_v1.json',
  );
  const assertions = jsonl(
    parsedRoot,
    'jpn_v5_official_product_link_card_assertions_v1.jsonl',
  );
  assert.equal(report.parsed_product_count, 14);
  assert.equal(report.assertion_count, 327);
  assert.equal(report.unique_official_card_id_count, 253);
  assert.equal(report.numbered_assertion_count, 84);
  assert.equal(report.governed_unnumbered_assertion_count, 243);
  assert.equal(report.physical_quantity_is_identity_count, false);
  assert.equal(assertions.length, 327);
  assert.ok(assertions.every((row) => /^\d+$/.test(row.source_external_id)));
  assert.ok(assertions.every((row) => row.printed_name));
  assert.ok(assertions.every((row) => row.image_urls.length === 1));
});

test('deck and static starter assertions preserve separate contracts', () => {
  const assertions = jsonl(
    parsedRoot,
    'jpn_v5_official_product_link_card_assertions_v1.jsonl',
  );
  const deck = assertions.filter((row) =>
    row.source_fields.parser_lane === 'official_deck_builder');
  const starter = assertions.filter((row) =>
    row.source_fields.parser_lane === 'official_static_starter_page');
  assert.ok(deck.some((row) => row.card_number_raw));
  assert.ok(deck.some((row) => row.source_fields.deck_quantity > 1));
  assert.ok(starter.every((row) => row.source_set_code === 'SA'));
  assert.ok(starter.every((row) => row.unnumbered_label));
  assert.equal(new Set(starter.map((row) => row.registry_key)).size, 5);
});

test('unparsed official product link becomes an explicit follow-up', () => {
  const rows = jsonl(
    parsedRoot,
    'jpn_v5_official_product_link_followups_v1.jsonl',
  );
  assert.deepEqual(rows, [{
    registry_key: 'jpn-product-2ea70ba63e47923f',
    source_url:
      'https://www.pokemon-card.com/info/2019/20191110_002152.html',
    official_search_product_id: '703',
    disposition: 'official_search_api_followup_ready',
  }]);
});

test('official product link parse replays deterministically', () => {
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), 'jpn-v5-product-link-parse-'),
  );
  const replayRoot = path.join(temp, '.tmp', 'parsed');
  try {
    execFileSync(process.execPath, [
      'scripts/audits/japanese_master_index_v5/'
      + 'official_product_link_parse_v1.mjs',
      `--output-root=${replayRoot}`,
      '--quiet',
    ]);
    assert.deepEqual(
      json(
        replayRoot,
        'jpn_v5_official_product_link_parse_fingerprints_v1.json',
      ),
      json(
        parsedRoot,
        'jpn_v5_official_product_link_parse_fingerprints_v1.json',
      ),
    );
  } finally {
    fs.rmSync(temp, { force: true, recursive: true });
  }
});

test('official product link tools cannot mutate database or storage', () => {
  for (const name of [
    'official_product_link_harvest_v1.mjs',
    'official_product_link_parse_v1.mjs',
  ]) {
    const source = fs.readFileSync(
      `scripts/audits/japanese_master_index_v5/${name}`,
      'utf8',
    );
    assert.doesNotMatch(source, /\b(postgres|supabase|storage)\s*\(/i);
    assert.doesNotMatch(
      source,
      /\b(insert|update|delete|truncate|alter|drop)\b\s+(into|table|from)?/i,
    );
  }
});
