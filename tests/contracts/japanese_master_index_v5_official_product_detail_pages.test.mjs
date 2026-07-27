import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const root = process.cwd();
const detailRoot =
  'docs/audits/japanese_master_index_v5/official_product_detail_pages';
const manifestPath = path.join(
  detailRoot,
  'jpn_v5_official_product_detail_page_manifest_v1.json',
);
const parsedRoot = path.join(detailRoot, 'parsed');
const summaryPath = path.join(
  parsedRoot,
  'jpn_v5_official_product_detail_page_parse_summary_v1.json',
);
const followupsPath = path.join(
  parsedRoot,
  'jpn_v5_official_product_detail_search_followups_v1.jsonl',
);
const planPath =
  'docs/audits/japanese_master_index_v5/official_product_detail_search/'
  + 'jpn_v5_official_product_detail_search_plan_v1.json';
const searchRoot =
  'docs/audits/japanese_master_index_v5/official_product_detail_search';

function readJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test('official product detail snapshots preserve verified official evidence', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.snapshots.length, 17);
  assert.equal(manifest.source_product_count, 30);
  assert.equal(manifest.future_product_exclusion_count, 10);
  for (const snapshot of manifest.snapshots) {
    const body = fs.readFileSync(snapshot.body_path);
    assert.equal(
      crypto.createHash('sha256').update(body).digest('hex'),
      snapshot.metadata.body_sha256,
    );
    assert.equal(snapshot.metadata.http_status, 200);
  }
});

test('parser schedules only product-specific numeric search collections', () => {
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const followups = readJsonl(followupsPath);
  assert.equal(summary.verified_product_count, 3);
  assert.equal(summary.verified_search_collection_count, 6);
  assert.equal(summary.exact_embedded_official_card_count, 3);
  assert.equal(summary.release_wide_search_id_exclusion_count, 2);
  assert.deepEqual(
    followups.map((row) => row.official_search_product_id).sort(),
    ['724', '725', '726', '734', '735', '878'],
  );
  assert.ok(followups.every((row) =>
    row.disposition === 'official_search_api_followup_ready'));
  const releaseWide = summary.product_results.filter((row) =>
    row.numeric_search_ids_on_page.includes('882'));
  assert.equal(releaseWide.length, 2);
  assert.ok(releaseWide.every((row) =>
    row.assigned_official_search_product_ids.length === 0));
  const cardAssertions = readJsonl(path.join(
    parsedRoot,
    'jpn_v5_official_product_detail_card_assertions_v1.jsonl',
  ));
  assert.deepEqual(
    cardAssertions.map((row) => row.source_external_id),
    ['37745', '38001', '38002'],
  );
});

test('detail-page parsing replays deterministically from preserved HTML', () => {
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), 'jpn-v5-detail-parse-'),
  );
  try {
    const replay = path.join(temp, '.tmp', 'parsed');
    execFileSync(
      process.execPath,
      [
        'scripts/audits/japanese_master_index_v5/'
        + 'official_product_detail_page_parse_v1.mjs',
        `--output-root=${replay}`,
        '--quiet',
      ],
      { cwd: root },
    );
    for (const name of [
      'jpn_v5_official_product_detail_page_parse_summary_v1.json',
      'jpn_v5_official_product_detail_search_followups_v1.jsonl',
      'jpn_v5_official_product_detail_card_assertions_v1.jsonl',
    ]) {
      assert.equal(
        fs.readFileSync(path.join(replay, name), 'utf8'),
        fs.readFileSync(path.join(parsedRoot, name), 'utf8'),
      );
    }
  } finally {
    fs.rmSync(temp, { force: true, recursive: true });
  }
});

test('detail search plan remains bounded and read-only', () => {
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  assert.equal(plan.content.work_items.length, 6);
  assert.equal(
    new Set(plan.content.work_items.map((row) => row.registry_key)).size,
    3,
  );
  assert.equal(plan.content.execution_boundary.database_writes, false);
  assert.equal(plan.content.execution_boundary.source_fetches, false);
  const source = [
    'scripts/audits/japanese_master_index_v5/'
      + 'official_product_detail_page_parse_v1.mjs',
    'scripts/audits/japanese_master_index_v5/'
      + 'official_product_detail_search_plan_v1.mjs',
  ].map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');
  assert.doesNotMatch(source, /\b(postgres|supabase|storage)\s*\(/i);
  assert.doesNotMatch(
    source,
    /\b(insert|update|delete|truncate|alter|drop)\b\s+(into|table|from)?/i,
  );
});

test('official detail search harvest resolves all six collections', () => {
  const assertions = JSON.parse(fs.readFileSync(
    path.join(searchRoot, 'official_jp_card_assertions_v1.json'),
    'utf8',
  ));
  const health = JSON.parse(fs.readFileSync(
    path.join(searchRoot, 'official_jp_card_source_health_v1.json'),
    'utf8',
  ));
  assert.equal(assertions.content.assertions.length, 136);
  assert.equal(health.content.summary.failed_container_count, 0);
  assert.equal(health.content.summary.selected_container_count, 6);
  assert.deepEqual(health.content.summary.container_status_counts, {
    complete: 6,
  });
  assert.ok(assertions.content.assertions.every((row) =>
    row.source_external_id
    && row.printed_name
    && row.image_urls.length > 0));
});

test('official detail search harvest replays without source access', () => {
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), 'jpn-v5-detail-search-'),
  );
  const replayRoot = path.join(temp, '.tmp', 'detail_search');
  try {
    fs.cpSync(searchRoot, replayRoot, { recursive: true });
    execFileSync(
      process.execPath,
      [
        'scripts/audits/japanese_master_index_v4/'
        + 'card_acquisition_harvest_v1.mjs',
        '--source',
        'official_jp_cards',
        '--plan',
        planPath,
        '--output-dir',
        replayRoot,
        '--offline',
        '--generated-at',
        '2026-07-27T22:00:00.000Z',
      ],
      { cwd: root },
    );
    for (const name of [
      'official_jp_card_assertions_v1.json',
      'official_jp_card_source_health_v1.json',
    ]) {
      const replay = JSON.parse(
        fs.readFileSync(path.join(replayRoot, name), 'utf8'),
      );
      const canonical = JSON.parse(
        fs.readFileSync(path.join(searchRoot, name), 'utf8'),
      );
      const normalizeRows = (rows) => rows.map((row) => ({
        ...row,
        raw_snapshot_ref: row.raw_snapshot_ref
          ? row.raw_snapshot_ref.replace(
            /^.*\/raw\/official_jp_cards\//,
            'raw/official_jp_cards/',
          )
          : row.raw_snapshot_ref,
      }));
      assert.deepEqual(
        normalizeRows(
          replay.content.assertions ?? replay.content.containers,
        ),
        normalizeRows(
          canonical.content.assertions ?? canonical.content.containers,
        ),
      );
    }
  } finally {
    fs.rmSync(temp, { force: true, recursive: true });
  }
});
