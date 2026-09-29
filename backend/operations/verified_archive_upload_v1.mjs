import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sha = value => createHash('sha256').update(value).digest('hex');
const identity = stat => [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs].map(String).join(':');

async function inspect(file) {
  assert.equal(await fs.realpath(file), file, 'Backup inputs must use their exact real paths');
  const stat = await fs.lstat(file, { bigint: true });
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1n);
  assert.ok(stat.size <= BigInt(Number.MAX_SAFE_INTEGER));
  return { identity: identity(stat), bytes: Number(stat.size) };
}

async function* chunks(file, chunkBytes) {
  const fd = await fs.open(file, 'r');
  try {
    let position = 0;
    for (;;) {
      const buffer = Buffer.alloc(chunkBytes);
      const { bytesRead } = await fd.read(buffer, 0, chunkBytes, position);
      if (!bytesRead) return;
      position += bytesRead;
      yield buffer.subarray(0, bytesRead);
    }
  } finally { await fd.close(); }
}

async function digestFile(file, chunkBytes) {
  const hash = createHash('sha256');
  for await (const chunk of chunks(file, chunkBytes)) hash.update(chunk);
  return hash.digest('hex');
}

// The caller must first verify the destination is the approved private bucket.
// Adapter get returns null ONLY for a missing object; other errors must throw.
// Adapter put must be create-only, never upsert or overwrite existing evidence.
// This module does not create buckets, remove files, or mutate a database.
export async function uploadVerifiedArchiveV1({ adapter, prefix, files, chunkBytes = 6 * 1024 * 1024 }) {
  assert.match(prefix, /^[a-zA-Z0-9_-]+\/[a-f0-9]{64}$/);
  assert.ok(Number.isInteger(chunkBytes) && chunkBytes > 0 && chunkBytes <= 6 * 1024 * 1024);
  assert.ok(files.length > 0);
  assert.equal(new Set(files.map(file => file.name)).size, files.length);
  const planned = [];
  for (const file of files) {
    assert.match(file.name, /^[a-zA-Z0-9_.-]+$/);
    assert.ok(file.name !== '.' && file.name !== '..');
    assert.match(file.sha256, /^[a-f0-9]{64}$/);
    const before = await inspect(file.path);
    assert.equal(await digestFile(file.path, chunkBytes), file.sha256, `Input hash mismatch: ${file.name}`);
    assert.equal((await inspect(file.path)).identity, before.identity, 'Input changed while hashing');
    planned.push({ ...file, before });
  }
  const manifest = { version: 'VERIFIED_WORKER_ARCHIVE_UPLOAD_V1', prefix, files: [] };
  async function createAndVerify(key, body, type) {
    const expected = sha(body);
    let stored = await adapter.get(key);
    if (stored === null) {
      await adapter.put(key, body, { contentType: type, upsert: false });
      stored = await adapter.get(key);
    }
    assert.ok(stored !== null, `Uploaded object missing: ${key}`);
    assert.equal(stored.length, body.length, `Stored object size mismatch: ${key}`);
    assert.equal(sha(stored), expected, `Stored object hash mismatch: ${key}`);
    return stored;
  }
  for (const file of planned) {
    const uploaded = { name: file.name, bytes: file.before.bytes, sha256: file.sha256, chunks: [] };
    const reconstructed = createHash('sha256');
    let index = 0, total = 0;
    for await (const body of chunks(file.path, chunkBytes)) {
      const key = `${prefix}/${file.name}/${String(index++).padStart(6, '0')}.part`;
      const retrieved = await createAndVerify(key, body, 'application/octet-stream');
      reconstructed.update(retrieved); total += retrieved.length;
      uploaded.chunks.push({ key, bytes: retrieved.length, sha256: sha(retrieved) });
    }
    assert.equal(total, file.before.bytes, 'Reconstructed byte count mismatch');
    assert.equal(reconstructed.digest('hex'), file.sha256, 'Reconstructed archive hash mismatch');
    assert.equal((await inspect(file.path)).identity, file.before.identity, 'Input changed while uploading');
    manifest.files.push(uploaded);
  }
  // Revalidate every input before publishing the completion marker. The
  // manifest contains no clock-dependent values, making retries idempotent.
  for (const file of planned) assert.equal((await inspect(file.path)).identity, file.before.identity);
  const body = Buffer.from(JSON.stringify(manifest));
  const key = `${prefix}/manifest.json`;
  await createAndVerify(key, body, 'application/json');
  return { verified: true, manifest_key: key, manifest_sha256: sha(body), manifest };
}
