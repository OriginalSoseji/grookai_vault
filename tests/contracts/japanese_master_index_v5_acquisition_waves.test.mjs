import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const root = process.cwd();
const outputRoot =
  'docs/audits/japanese_master_index_v5/acquisition_waves';

function json(name) {
  return JSON.parse(fs.readFileSync(path.join(outputRoot, name), 'utf8'));
}

function jsonl(name) {
  return fs.readFileSync(path.join(outputRoot, name), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test('V5 acquisition waves assign every affected release exactly once', () => {
  const summary = json('jpn_v5_acquisition_wave_report_v1.json');
  const rows = jsonl('jpn_v5_release_workpacks_v1.jsonl');
  assert.equal(rows.length, 1396);
  assert.equal(new Set(rows.map((row) => row.release_key)).size, rows.length);
  assert.equal(summary.baseline.issue_rows, 2705);
  assert.equal(summary.baseline.releases_without_census_issues, 57);
  assert.equal(
    rows.reduce((sum, row) => sum + row.issue_count, 0),
    summary.baseline.issue_rows,
  );
});

test('V5 acquisition waves preserve the expected release ordering', () => {
  const summary = json('jpn_v5_acquisition_wave_report_v1.json');
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(summary.waves).map(([key, value]) => [
        key,
        value.release_count,
      ]),
    ),
    {
      zero_inventory_acquisition: 666,
      denominator_repair: 455,
      bounded_slot_completion: 206,
      strict_corroboration: 69,
    },
  );
});

test('manual-only sources are never represented as automatic lanes', () => {
  const rows = jsonl('jpn_v5_release_workpacks_v1.jsonl');
  for (const row of rows) {
    for (const lane of row.source_lane_candidates) {
      if (['tcgcollector_jp_manual', 'pokellector_jp_manual']
        .includes(lane.lane_id)) {
        assert.equal(lane.access_mode, 'manual_review_only');
      }
    }
  }
});

test('all acquisition batches remain planning-only and bounded', () => {
  const batches = json('jpn_v5_acquisition_batches_v1.json');
  assert.ok(batches.length > 0);
  assert.ok(batches.every((batch) => batch.release_count <= 50));
  assert.ok(batches.every((batch) =>
    batch.execution_status === 'planned_not_executed'));
  assert.ok(batches.every((batch) => !batch.source_fetches_approved));
  assert.ok(batches.every((batch) => !batch.database_writes_approved));
});

test('V5 acquisition wave artifacts replay deterministically', () => {
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), 'jpn-master-index-v5-waves-'),
  );
  try {
    execFileSync(
      process.execPath,
      ['scripts/audits/japanese_master_index_v5/acquisition_wave_plan_v1.mjs',
        `--output-root=${path.join(temp, '.tmp', 'waves')}`,
        '--quiet'],
      { cwd: root },
    );
    const canonical = json('jpn_v5_acquisition_wave_fingerprints_v1.json');
    const replay = JSON.parse(fs.readFileSync(
      path.join(temp, '.tmp', 'waves',
        'jpn_v5_acquisition_wave_fingerprints_v1.json'),
      'utf8',
    ));
    assert.deepEqual(replay, canonical);
  } finally {
    fs.rmSync(temp, { force: true, recursive: true });
  }
});

test('wave planner contains no database, network, or mutation path', () => {
  const source = fs.readFileSync(
    'scripts/audits/japanese_master_index_v5/acquisition_wave_plan_v1.mjs',
    'utf8',
  );
  assert.doesNotMatch(source, /\b(fetch|postgres|supabase|storage)\s*\(/i);
  assert.doesNotMatch(
    source,
    /\b(insert|update|delete|truncate|alter|drop)\b\s+(into|table|from)?/i,
  );
});
