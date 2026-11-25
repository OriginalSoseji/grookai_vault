#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  buildMtgTcgplayerGlobalExactReviewQueueV1,
} from '../../backend/pricing/mtg_tcgplayer_global_exact_review_queue_v1.mjs';

function value(argv, name) {
  return argv.find((arg) => arg.startsWith(`--${name}=`))
    ?.slice(name.length + 3).trim() ?? '';
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function jsonl(rows) {
  return rows.length ? `${rows.map((row) => JSON.stringify(row)).join('\n')}\n` : '';
}

async function readJsonl(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return {
    raw,
    rows: raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)),
  };
}

async function writeExclusive(filePath, bytes) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, bytes, { flag: 'wx' });
}

function packageArtifacts(queue, inputPath, inputRaw, sourceCommit, createdAt) {
  const batchIndex = queue.batches.map((batch) => ({
    batch_index: batch.batch_index,
    batch_id: batch.batch_id,
    row_count: batch.row_count,
    manifest_sha256: batch.manifest_sha256,
    founder_review_required: batch.founder_review_required,
    mapping_authority: batch.mapping_authority,
    publication_authority: batch.publication_authority,
  }));
  const summary = {
    policy_version: queue.policy_version,
    status: queue.status,
    created_at: createdAt,
    source_commit: sourceCommit,
    input: {
      path: inputPath,
      sha256: sha256(inputRaw),
    },
    counts: queue.counts,
    manifest_sha256: queue.manifest_sha256,
    boundaries: queue.boundaries,
    batches: batchIndex,
  };
  const artifacts = new Map([
    ['summary.json', `${JSON.stringify(summary, null, 2)}\n`],
    ['ready_review_queue.jsonl', jsonl(queue.ready)],
    ['held_rows.jsonl', jsonl(queue.held)],
    ['batch_index.json', `${JSON.stringify({
      policy_version: queue.policy_version,
      manifest_sha256: queue.manifest_sha256,
      batches: batchIndex,
    }, null, 2)}\n`],
  ]);
  for (const batch of queue.batches) {
    const prefix = `batches/batch-${String(batch.batch_index).padStart(4, '0')}`;
    artifacts.set(`${prefix}/review_candidates.jsonl`, jsonl(batch.rows));
    artifacts.set(`${prefix}/summary.json`, `${JSON.stringify({
      policy_version: queue.policy_version,
      batch_index: batch.batch_index,
      batch_id: batch.batch_id,
      row_count: batch.row_count,
      manifest_sha256: batch.manifest_sha256,
      founder_review_required: true,
      mapping_authority: false,
      publication_authority: false,
    }, null, 2)}\n`);
  }
  return { artifacts, summary };
}

function artifactHashes(artifacts) {
  return Object.fromEntries(
    [...artifacts.entries()].map(([relativePath, bytes]) => [
      relativePath,
      sha256(bytes),
    ]),
  );
}

async function filesBelow(root, current = '') {
  const directory = path.join(root, current);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.posix.join(current.replaceAll('\\', '/'), entry.name);
    if (entry.isDirectory()) {
      files.push(...await filesBelow(root, relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    } else {
      throw new Error(`artifact package contains unsupported entry: ${relativePath}`);
    }
  }
  return files.sort();
}

async function verifyExistingPackage({ outDir, queue, inputPath, inputRaw, sourceCommit }) {
  const summaryPath = path.join(outDir, 'summary.json');
  const completePath = path.join(outDir, 'COMPLETE_V1.json');
  const hashesPath = path.join(outDir, 'artifact_hashes.json');
  const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
  if (!Number.isFinite(Date.parse(summary.created_at))) {
    throw new Error('summary created_at is invalid');
  }
  const expected = packageArtifacts(
    queue,
    inputPath,
    inputRaw,
    sourceCommit,
    summary.created_at,
  );
  const expectedHashes = artifactHashes(expected.artifacts);
  const hashesBytes = `${JSON.stringify(expectedHashes, null, 2)}\n`;
  const actualHashesBytes = await fs.readFile(hashesPath, 'utf8');
  if (actualHashesBytes !== hashesBytes) {
    throw new Error('artifact hash manifest does not match the source-bound package');
  }
  for (const [relativePath, expectedBytes] of expected.artifacts) {
    const actualBytes = await fs.readFile(path.join(outDir, relativePath), 'utf8');
    if (actualBytes !== expectedBytes) {
      throw new Error(`artifact bytes do not match: ${relativePath}`);
    }
  }
  const complete = JSON.parse(await fs.readFile(completePath, 'utf8'));
  const expectedComplete = {
    policy_version: queue.policy_version,
    status: 'complete',
    source_commit: sourceCommit,
    input_sha256: sha256(inputRaw),
    manifest_sha256: queue.manifest_sha256,
    artifact_count: expected.artifacts.size,
    artifact_hashes_sha256: sha256(hashesBytes),
  };
  if (JSON.stringify(complete) !== JSON.stringify(expectedComplete)) {
    throw new Error('completion marker does not match the source-bound package');
  }
  const expectedFiles = [
    ...expected.artifacts.keys(),
    'artifact_hashes.json',
    'COMPLETE_V1.json',
  ].sort();
  const actualFiles = await filesBelow(outDir);
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error('artifact package contains missing or unexpected files');
  }
  return { summary, artifactCount: expected.artifacts.size };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--apply') || argv.includes('--run')) {
    throw new Error('MTG global exact review queue generation is read-only');
  }
  const inputValue = value(argv, 'input');
  const outputValue = value(argv, 'out-dir');
  const sourceCommit = value(argv, 'source-commit').toLocaleLowerCase('en-US');
  if (!inputValue || !outputValue || !sourceCommit) {
    throw new Error('--input, --out-dir and --source-commit are required');
  }
  if (!/^[a-f0-9]{40}$/.test(sourceCommit)) {
    throw new Error('--source-commit must be a full 40-character Git SHA');
  }

  const inputPath = path.resolve(inputValue);
  const outDir = path.resolve(outputValue);
  const input = await readJsonl(inputPath);
  const queue = buildMtgTcgplayerGlobalExactReviewQueueV1(input.rows);
  if (argv.includes('--verify-existing')) {
    const verified = await verifyExistingPackage({
      outDir,
      queue,
      inputPath,
      inputRaw: input.raw,
      sourceCommit,
    });
    process.stdout.write(`${JSON.stringify({
      status: 'verified_complete',
      manifest_sha256: queue.manifest_sha256,
      artifact_count: verified.artifactCount,
      artifact_root: outDir,
    }, null, 2)}\n`);
    return;
  }

  const packageResult = packageArtifacts(
    queue,
    inputPath,
    input.raw,
    sourceCommit,
    new Date().toISOString(),
  );

  await fs.mkdir(outDir, { recursive: true });
  await Promise.all([...packageResult.artifacts.entries()].map(
    ([relativePath, bytes]) => writeExclusive(path.join(outDir, relativePath), bytes),
  ));

  const hashes = artifactHashes(packageResult.artifacts);
  const hashesBytes = `${JSON.stringify(hashes, null, 2)}\n`;
  await writeExclusive(
    path.join(outDir, 'artifact_hashes.json'),
    hashesBytes,
  );
  await writeExclusive(
    path.join(outDir, 'COMPLETE_V1.json'),
    `${JSON.stringify({
      policy_version: queue.policy_version,
      status: 'complete',
      source_commit: sourceCommit,
      input_sha256: sha256(input.raw),
      manifest_sha256: queue.manifest_sha256,
      artifact_count: packageResult.artifacts.size,
      artifact_hashes_sha256: sha256(hashesBytes),
    }, null, 2)}\n`,
  );

  process.stdout.write(`${JSON.stringify({
    status: queue.status,
    counts: queue.counts,
    manifest_sha256: queue.manifest_sha256,
    boundaries: queue.boundaries,
    artifact_root: outDir,
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`[mtg-tcgplayer-global-exact-review-queue] ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
