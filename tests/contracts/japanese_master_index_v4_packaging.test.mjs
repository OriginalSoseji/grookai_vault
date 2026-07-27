import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  readVerifiedArtifact,
} from '../../scripts/audits/japanese_master_index_v4/artifact_rows_v1.mjs';
import {
  buildArtifact,
  writeJsonArtifact,
} from '../../scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';

const CARDS_ROOT = 'docs/audits/japanese_master_index_v4/cards';
const BASELINE_MANIFEST =
  'docs/audits/japanese_master_index_v4/baseline/'
  + 'live_jpn_row_baseline_manifest_v1.json';
const LEDGER_PATH =
  `${CARDS_ROOT}/raw_evidence_preservation_ledger_v1.json.gz`;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

test('preserved source evidence is archive-only and hash verified', async () => {
  const { artifact: ledger } = await readVerifiedArtifact(LEDGER_PATH, {
    expectedPackageId:
      'JPN-MASTER-INDEX-PRESERVED-EVIDENCE-PACKAGE-V1',
  });
  const content = ledger.content;
  assert.equal(content.source_lane_count, 7);
  assert.equal(content.raw_entry_count, 39_088);
  assert.equal(content.raw_bytes, 319_475_374);
  assert.equal(content.source_lanes.length, 7);
  assert.equal(content.boundary.database_writes, false);
  assert.equal(content.boundary.storage_writes, false);

  for (const lane of content.source_lanes) {
    const archive = await fs.readFile(lane.archive_path);
    assert.equal(sha256(archive), lane.archive_sha256);
    const { artifact: assertions } = await readVerifiedArtifact(
      lane.assertion_path,
    );
    assert.equal(
      assertions.content_fingerprint_sha256,
      lane.assertion_content_fingerprint_sha256,
    );
    assert.equal(
      assertions.content.assertions.every(
        (row) => row.raw_snapshot_ref.startsWith(
          `tar+gzip://${lane.archive_path}#`,
        ),
      ),
      true,
    );
    await assert.rejects(
      fs.access(lane.assertion_path.replace(/\.gz$/u, '')),
    );
  }
  await assert.rejects(fs.access(`${CARDS_ROOT}/raw`));
});

test('frozen baseline row shards are compressed verified artifacts', async () => {
  const { artifact: manifest } = await readVerifiedArtifact(
    BASELINE_MANIFEST,
    { expectedPackageId: 'LIVE-JPN-ROW-BASELINE-MANIFEST-V1' },
  );
  assert.equal(manifest.content.datasets.length, 9);
  assert.equal(
    manifest.content.datasets.every(
      (descriptor) => descriptor.shard_paths.every(
        (shardPath) => shardPath.endsWith('.json.gz'),
      ),
    ),
    true,
  );
  for (const descriptor of manifest.content.datasets) {
    for (const shardPath of descriptor.shard_paths) {
      const { artifact: shard } = await readVerifiedArtifact(shardPath);
      assert.equal(shard.content.dataset_key, descriptor.dataset_key);
    }
  }
});

test('gzip artifact serialization is deterministic', async () => {
  const tempRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), 'jpn-artifact-gzip-'),
  );
  try {
    const artifact = buildArtifact({
      packageId: 'JPN-GZIP-DETERMINISM-TEST-V1',
      generatedAt: '2026-07-27T00:00:00.000Z',
      retrieval: { database_access: false },
      content: { rows: [{ key: 'one' }, { key: 'two' }] },
    });
    const left = path.join(tempRoot, 'left.json.gz');
    const right = path.join(tempRoot, 'right.json.gz');
    await writeJsonArtifact(left, artifact);
    await writeJsonArtifact(right, artifact);
    assert.deepEqual(await fs.readFile(left), await fs.readFile(right));
    const verified = await readVerifiedArtifact(left, {
      expectedPackageId: 'JPN-GZIP-DETERMINISM-TEST-V1',
    });
    assert.deepEqual(verified.artifact.content, artifact.content);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
