import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

import {
  buildArtifact,
  contentFingerprint,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';

export const ARTIFACT_ROWS_VERSION =
  'JPN-MASTER-INDEX-ARTIFACT-ROWS-V1';

function resolvePath(inputPath, repoRoot = process.cwd()) {
  return path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(repoRoot, inputPath);
}

export async function readVerifiedArtifact(inputPath, {
  repoRoot = process.cwd(),
  expectedPackageId = null,
} = {}) {
  const absolutePath = resolvePath(inputPath, repoRoot);
  const raw = await fs.readFile(absolutePath);
  const serialized = absolutePath.endsWith('.gz')
    ? zlib.gunzipSync(raw).toString('utf8')
    : raw.toString('utf8');
  const artifact = JSON.parse(serialized);

  if (!artifact || typeof artifact !== 'object' || !artifact.content) {
    throw new Error(`Artifact content missing: ${inputPath}`);
  }
  if (
    expectedPackageId
    && artifact.package_id !== expectedPackageId
  ) {
    throw new Error(
      `Artifact package mismatch for ${inputPath}: `
      + `${artifact.package_id} != ${expectedPackageId}`,
    );
  }

  const actualFingerprint = contentFingerprint(artifact.content);
  if (artifact.content_fingerprint_sha256 !== actualFingerprint) {
    throw new Error(
      `Artifact content fingerprint mismatch: ${inputPath}`,
    );
  }

  return {
    path: absolutePath,
    artifact,
  };
}

export async function loadVerifiedDatasetFromManifest({
  manifestPath,
  datasetKey,
  repoRoot = process.cwd(),
  expectedManifestPackageId = null,
}) {
  const { artifact: manifest } = await readVerifiedArtifact(manifestPath, {
    repoRoot,
    expectedPackageId: expectedManifestPackageId,
  });
  const descriptor = manifest.content.datasets.find(
    (row) => row.dataset_key === datasetKey,
  );
  if (!descriptor) {
    throw new Error(`Baseline dataset not found: ${datasetKey}`);
  }
  if (descriptor.shard_paths.length !== descriptor.shard_count) {
    throw new Error(`Shard count mismatch in manifest: ${datasetKey}`);
  }

  const rows = [];
  for (let index = 0; index < descriptor.shard_paths.length; index += 1) {
    const shardPath = descriptor.shard_paths[index];
    const { artifact: shard } = await readVerifiedArtifact(shardPath, {
      repoRoot,
    });
    const content = shard.content;
    if (content.dataset_key !== datasetKey) {
      throw new Error(`Shard dataset mismatch: ${shardPath}`);
    }
    if (content.shard_index !== index + 1) {
      throw new Error(`Shard order mismatch: ${shardPath}`);
    }
    if (content.shard_count !== descriptor.shard_count) {
      throw new Error(`Shard total mismatch: ${shardPath}`);
    }
    if (content.row_count !== content.rows.length) {
      throw new Error(`Shard row count mismatch: ${shardPath}`);
    }
    rows.push(...content.rows);
  }

  if (rows.length !== descriptor.row_count) {
    throw new Error(
      `Dataset row count mismatch for ${datasetKey}: `
      + `${rows.length} != ${descriptor.row_count}`,
    );
  }
  if (
    contentFingerprint(rows)
    !== descriptor.content_fingerprint_sha256
  ) {
    throw new Error(`Dataset fingerprint mismatch: ${datasetKey}`);
  }

  return {
    descriptor,
    rows,
    manifest,
  };
}

export async function loadVerifiedShardedDataset(options) {
  return loadVerifiedDatasetFromManifest({
    ...options,
    expectedManifestPackageId:
      'LIVE-JPN-ROW-BASELINE-MANIFEST-V1',
  });
}

export async function writeShardedRows({
  outputRoot,
  datasetKey,
  packageId,
  rows,
  generatedAt,
  retrieval,
  shardSize = 5_000,
}) {
  const shardCount = Math.max(1, Math.ceil(rows.length / shardSize));
  const shardPaths = [];

  for (let index = 0; index < shardCount; index += 1) {
    const shardRows = rows.slice(
      index * shardSize,
      (index + 1) * shardSize,
    );
    const outputPath = path.join(
      outputRoot,
      'rows',
      datasetKey,
      `${datasetKey}_${String(index + 1).padStart(4, '0')}`
        + `_of_${String(shardCount).padStart(4, '0')}.json.gz`,
    );
    await writeJsonArtifact(outputPath, buildArtifact({
      packageId,
      generatedAt,
      retrieval,
      content: {
        dataset_key: datasetKey,
        shard_index: index + 1,
        shard_count: shardCount,
        row_count: shardRows.length,
        rows: shardRows,
      },
    }));
    shardPaths.push(outputPath.replaceAll('\\', '/'));
  }

  return {
    dataset_key: datasetKey,
    row_count: rows.length,
    shard_size: shardSize,
    shard_count: shardCount,
    content_fingerprint_sha256: contentFingerprint(rows),
    shard_paths: shardPaths,
  };
}
