import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const ROOT = 'docs/audits/japanese_master_index_v5/release_census';

function readJson(filename, root = ROOT) {
  return JSON.parse(fs.readFileSync(path.join(root, filename), 'utf8'));
}

function readJsonl(filename, root = ROOT) {
  return fs.readFileSync(path.join(root, filename), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test('V5 census accounts for every governed V4 registry entry', () => {
  const rows = readJsonl('jpn_v5_release_census_v1.jsonl');
  const report = readJson('jpn_v5_denominator_report_v1.json');
  assert.equal(rows.length, 1453);
  assert.equal(new Set(rows.map((row) => row.release_key)).size, 1453);
  assert.deepEqual(report.registry.by_entry_kind, {
    japanese_card_release: 822,
    official_product: 631,
  });
  assert.equal(report.registry.containers_with_candidate_rows, 787);
  assert.equal(report.registry.containers_without_candidate_rows, 666);
});

test('V5 denominator includes only uniquely bounded admissible containers', () => {
  const report = readJson('jpn_v5_denominator_report_v1.json');
  assert.deepEqual(report.provisional_bounded_coverage, {
    claim_scope:
      'only_admissible_containers_with_one_unique_expected_count',
    expected_slots: 23181,
    included_container_count: 455,
    missing_slot_lower_bound: 15248,
    percent: 34.22,
    ratio: 0.34221992,
    strict_admissible_slots_capped: 7933,
  });
  assert.equal(
    report.status,
    'initial_provisional_denominator_not_98_percent_claim',
  );
});

test('every denominator exclusion becomes an acquisition issue', () => {
  const rows = readJsonl('jpn_v5_release_census_v1.jsonl');
  const queue = readJsonl('jpn_v5_acquisition_priority_queue_v1.jsonl');
  const queued = new Set(queue.map((row) =>
    `${row.release_key}\u0000${row.issue_kind}`));
  for (const row of rows) {
    if (row.denominator_status === 'excluded_missing_expected_count') {
      assert.ok(queued.has(`${row.release_key}\u0000missing_expected_count`));
    }
    if (row.denominator_status
        === 'excluded_conflicting_expected_counts') {
      assert.ok(queued.has(`${row.release_key}\u0000expected_count_conflict`));
    }
    if (row.denominator_status
        === 'excluded_product_scope_requires_slot_manifest') {
      assert.ok(queued.has(
        `${row.release_key}\u0000product_slot_manifest_missing`,
      ));
    }
  }
});

test('V5 census fingerprints are exact and execution is read-only', async () => {
  const manifest = readJson('jpn_v5_release_census_fingerprints_v1.json');
  for (const [filename, expected] of Object.entries(manifest.files)) {
    const value = await fsp.readFile(path.join(ROOT, filename));
    assert.equal(value.byteLength, expected.bytes);
    assert.equal(
      crypto.createHash('sha256').update(value).digest('hex'),
      expected.sha256,
      filename,
    );
  }
  const attestation = readJson('jpn_v5_no_write_attestation_v1.json');
  assert.equal(attestation.production_mutated, false);
  assert.equal(attestation.database_reads, false);
  assert.equal(attestation.database_writes, false);
  assert.equal(attestation.source_fetches, false);
});

test('V5 census replays deterministically from the V4 freeze', {
  timeout: 60_000,
}, () => {
  const replayRoot = '.tmp/jpn_v5_release_census_replay';
  const run = spawnSync(process.execPath, [
    'scripts/audits/japanese_master_index_v5/release_census_v1.mjs',
    `--output-root=${replayRoot}`,
    '--quiet',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 45_000,
  });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(
    readJson('jpn_v5_release_census_fingerprints_v1.json', replayRoot),
    readJson('jpn_v5_release_census_fingerprints_v1.json'),
  );
});

test('V5 census generator has no database, network, or mutation path', () => {
  const source = fs.readFileSync(
    'scripts/audits/japanese_master_index_v5/release_census_v1.mjs',
    'utf8',
  );
  assert.doesNotMatch(source, /@supabase|postgres|createClient|fetch\s*\(/i);
  assert.doesNotMatch(source, /\.sql\b|migration\s+up|db\s+push/i);
  assert.doesNotMatch(source, /child_process|spawn\s*\(|exec\s*\(/i);
});
