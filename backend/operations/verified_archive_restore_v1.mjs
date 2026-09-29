import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const sha = value => createHash('sha256').update(value).digest('hex');
const hashPattern = /^[a-f0-9]{64}$/;
const safeName = name => typeof name === 'string'
  && /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(name)
  && !name.endsWith('.')
  && !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(name);

// expectedManifestSha256 must come from the preserved upload receipt, separately
// from the objects being restored. This function never extracts an archive,
// removes source evidence, overwrites an output, or creates remote resources.
// Failed downloads leave their new output directory for investigation; choose
// a different fresh output directory when retrying.
export async function restoreVerifiedArchiveV1({ adapter, prefix,
  expectedManifestSha256, outputDirectory, maxTotalBytes }) {
  assert.match(prefix, /^[a-zA-Z0-9_-]+\/[a-f0-9]{64}$/);
  assert.match(expectedManifestSha256, hashPattern);
  assert.ok(Number.isSafeInteger(maxTotalBytes) && maxTotalBytes >= 0,
    'An explicit restoration byte budget is required');
  const manifestBytes = await adapter.get(`${prefix}/manifest.json`);
  assert.ok(Buffer.isBuffer(manifestBytes), 'Completion manifest missing');
  assert.ok(manifestBytes.length <= 2 * 1024 * 1024, 'Manifest too large');
  assert.equal(sha(manifestBytes), expectedManifestSha256, 'Manifest hash mismatch');
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  assert.equal(manifest.version, 'VERIFIED_WORKER_ARCHIVE_UPLOAD_V1');
  assert.equal(manifest.prefix, prefix);
  assert.ok(Array.isArray(manifest.files) && manifest.files.length > 0);
  const names = new Set();
  let plannedBytes = 0;
  for (const file of manifest.files) {
    assert.ok(safeName(file.name), 'Unsafe restored filename');
    const normalizedName = file.name.toLowerCase();
    assert.ok(!names.has(normalizedName), 'Duplicate restored filename');
    names.add(normalizedName);
    assert.match(file.sha256, hashPattern);
    assert.ok(Number.isSafeInteger(file.bytes) && file.bytes >= 0);
    assert.ok(Array.isArray(file.chunks));
    let chunkBytes = 0;
    for (const [index, chunk] of file.chunks.entries()) {
      assert.equal(chunk.key, `${prefix}/${file.name}/${String(index).padStart(6, '0')}.part`,
        'Chunk key must belong to its exact manifest file');
      assert.match(chunk.sha256, hashPattern);
      assert.ok(Number.isSafeInteger(chunk.bytes) && chunk.bytes > 0
        && chunk.bytes <= 6 * 1024 * 1024);
      chunkBytes += chunk.bytes;
      assert.ok(Number.isSafeInteger(chunkBytes));
    }
    assert.equal(chunkBytes, file.bytes, 'Manifest byte count mismatch');
    plannedBytes += file.bytes;
    assert.ok(Number.isSafeInteger(plannedBytes) && plannedBytes <= maxTotalBytes,
      'Restoration exceeds byte budget');
  }
  assert.equal(path.resolve(outputDirectory), outputDirectory, 'Use an absolute output path');
  const parent = path.dirname(outputDirectory);
  assert.equal(await fs.realpath(parent), parent, 'Output parent must be its real path');
  await fs.mkdir(outputDirectory, { recursive: false, mode: 0o700 });
  const restored = [];
  for (const file of manifest.files) {
    const destination = path.join(outputDirectory, file.name);
    const fd = await fs.open(destination, 'wx', 0o600);
    const digest = createHash('sha256');
    let bytes = 0;
    try {
      for (const chunk of file.chunks) {
        const body = await adapter.get(chunk.key);
        assert.ok(Buffer.isBuffer(body), 'Archive chunk missing');
        assert.equal(body.length, chunk.bytes, 'Chunk byte count mismatch');
        assert.equal(sha(body), chunk.sha256, 'Chunk hash mismatch');
        await fd.writeFile(body);
        digest.update(body);
        bytes += body.length;
      }
      assert.equal(bytes, file.bytes);
      assert.equal(digest.digest('hex'), file.sha256, 'Restored file hash mismatch');
      await fd.sync();
    } finally { await fd.close(); }
    restored.push({ name: file.name, bytes, sha256: file.sha256 });
  }
  return { verified: true, manifest_sha256: expectedManifestSha256,
    output_directory: outputDirectory, total_bytes: plannedBytes, files: restored };
}
