import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

import {
  contentFingerprint,
} from '../../scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';

const root = process.cwd();
const outputRoot =
  'docs/audits/japanese_master_index_v5/'
  + 'official_product_coordinate_search';
const assertionsPath = path.join(
  outputRoot,
  'official_jp_card_assertions_v1.json',
);
const healthPath = path.join(
  outputRoot,
  'official_jp_coordinate_source_health_v1.json',
);
const expected = [
  ['39583', 'S-P', '184', 'エンペルトV'],
  ['39584', 'S-P', '185', 'バンギラスV'],
  ['39913', 'S-P', '189', 'エーフィVMAX'],
  ['41182', 'S-P', '268', 'リーフィアV'],
  ['41183', 'S-P', '269', 'リーフィアVSTAR'],
  ['41184', 'S-P', '270', 'グレイシアV'],
  ['41185', 'S-P', '271', 'グレイシアVSTAR'],
];

function readArtifact(filePath) {
  const artifact = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  assert.equal(
    contentFingerprint(artifact.content),
    artifact.content_fingerprint_sha256,
  );
  return artifact;
}

test('official coordinate harvest resolves all seven exact S-P cards', () => {
  const assertions = readArtifact(assertionsPath);
  const health = readArtifact(healthPath);
  assert.equal(assertions.content.assertions.length, 7);
  assert.equal(health.content.summary.followup_count, 7);
  assert.equal(health.content.summary.resolved_count, 7);
  assert.equal(health.content.summary.failed_count, 0);
  assert.deepEqual(
    assertions.content.assertions.map((row) => [
      row.source_external_id,
      row.source_set_code,
      row.card_number_raw,
      row.printed_name,
    ]),
    expected,
  );
  assert.ok(assertions.content.assertions.every((row) =>
    row.source_fields.exact_coordinate_validation === true
    && row.raw_snapshot_sha256.length === 64
    && row.image_urls.length === 1));
});

test('official coordinate harvest replays deterministically offline', () => {
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), 'jpn-v5-coordinate-search-'),
  );
  try {
    const replayRoot = path.join(temp, '.tmp', 'coordinate-search');
    fs.cpSync(
      path.join(outputRoot, 'raw'),
      path.join(replayRoot, 'raw'),
      { recursive: true },
    );
    execFileSync(
      process.execPath,
      [
        'scripts/audits/japanese_master_index_v5/'
        + 'official_product_coordinate_search_harvest_v1.mjs',
        `--output-root=${replayRoot}`,
        '--offline',
        '--quiet',
      ],
      { cwd: root },
    );
    for (const filename of [
      'official_jp_card_assertions_v1.json',
      'official_jp_coordinate_source_health_v1.json',
    ]) {
      assert.equal(
        fs.readFileSync(path.join(replayRoot, filename), 'utf8'),
        fs.readFileSync(path.join(outputRoot, filename), 'utf8'),
      );
    }
  } finally {
    fs.rmSync(temp, { force: true, recursive: true });
  }
});

test('official coordinate lane is source-only and cannot mutate storage', () => {
  const source = fs.readFileSync(
    'scripts/audits/japanese_master_index_v5/'
    + 'official_product_coordinate_search_harvest_v1.mjs',
    'utf8',
  );
  const assertions = readArtifact(assertionsPath);
  assert.equal(assertions.content.execution_boundary.database_writes, false);
  assert.equal(assertions.content.execution_boundary.storage_writes, false);
  assert.equal(assertions.content.execution_boundary.production_writes, false);
  assert.doesNotMatch(source, /@supabase|from\s+['"]pg['"]/i);
  assert.doesNotMatch(
    source,
    /\b(insert|update|delete|truncate|alter|drop)\b\s+(into|table|from)?/i,
  );
});
