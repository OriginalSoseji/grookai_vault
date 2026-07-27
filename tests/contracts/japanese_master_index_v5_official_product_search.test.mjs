import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const root = process.cwd();
const outputRoot =
  'docs/audits/japanese_master_index_v5/official_product_search';
const planPath = path.join(
  outputRoot,
  'jpn_v5_official_product_search_plan_v1.json',
);

test('official product search plan repairs numeric product identity', () => {
  const artifact = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  assert.equal(artifact.content.work_items.length, 1);
  const [row] = artifact.content.work_items;
  assert.equal(row.registry_key, 'jpn-product-2ea70ba63e47923f');
  assert.equal(row.source_container_id, '703');
  assert.match(row.original_v4_source_container_id, /^detail:/);
  assert.equal(row.disposition, 'scheduled');
  assert.equal(artifact.content.execution_boundary.database_writes, false);
});

test('official product search plan replays deterministically', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'jpn-v5-search-plan-'));
  try {
    const replay = path.join(
      temp,
      '.tmp',
      'jpn_v5_official_product_search_plan_v1.json',
    );
    execFileSync(
      process.execPath,
      [
        'scripts/audits/japanese_master_index_v5/'
        + 'official_product_search_plan_v1.mjs',
        `--output=${replay}`,
        '--quiet',
      ],
      { cwd: root },
    );
    assert.deepEqual(
      JSON.parse(fs.readFileSync(replay, 'utf8')),
      JSON.parse(fs.readFileSync(planPath, 'utf8')),
    );
  } finally {
    fs.rmSync(temp, { force: true, recursive: true });
  }
});

test('official product search harvest resolves the complete SB identity set', () => {
  const assertions = JSON.parse(fs.readFileSync(
    path.join(outputRoot, 'official_jp_card_assertions_v1.json'),
    'utf8',
  ));
  const health = JSON.parse(fs.readFileSync(
    path.join(outputRoot, 'official_jp_card_source_health_v1.json'),
    'utf8',
  ));
  assert.equal(assertions.content.assertions.length, 33);
  assert.equal(
    assertions.content.assertions.filter((row) => row.card_number_raw).length,
    24,
  );
  assert.equal(
    assertions.content.assertions.filter((row) => !row.card_number_raw).length,
    9,
  );
  assert.ok(assertions.content.assertions.every((row) =>
    row.source_external_id && row.printed_name && row.image_urls.length > 0));
  assert.deepEqual(
    [...new Set(
      assertions.content.assertions
        .map((row) => row.source_set_code)
        .filter(Boolean),
    )],
    ['SB'],
  );
  assert.equal(health.content.summary.failed_container_count, 0);
  assert.equal(health.content.containers[0].status, 'complete');
});

test('official product search harvest replays from preserved snapshots', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'jpn-v5-search-run-'));
  const replayRoot = path.join(temp, '.tmp', 'official_product_search');
  try {
    fs.cpSync(outputRoot, replayRoot, { recursive: true });
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
        '2026-07-27T08:00:00.000Z',
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
        fs.readFileSync(path.join(outputRoot, name), 'utf8'),
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

test('official search repair remains read-only', () => {
  const source = fs.readFileSync(
    'scripts/audits/japanese_master_index_v5/'
    + 'official_product_search_plan_v1.mjs',
    'utf8',
  );
  assert.doesNotMatch(source, /\b(postgres|supabase|storage)\s*\(/i);
  assert.doesNotMatch(
    source,
    /\b(insert|update|delete|truncate|alter|drop)\b\s+(into|table|from)?/i,
  );
});
