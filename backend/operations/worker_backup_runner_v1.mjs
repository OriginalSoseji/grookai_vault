import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { uploadVerifiedArchiveV1 } from './verified_archive_upload_v1.mjs';
import { restoreVerifiedArchiveV1 } from './verified_archive_restore_v1.mjs';

export const BACKUP_LIMITS = Object.freeze({ dailyBytes: 536870912, packages: 20,
  totalBytes: 10000000000, seedBytes: 2835276805 });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const realFile = async file => {
  assert.equal(await fs.realpath(file), file);
  const stat = await fs.lstat(file);
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1);
  return stat;
};
const fileHash = async file => {
  await realFile(file); const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
};
export async function discoverFinalizedMeeArchivesV1(root) {
  assert.equal(await fs.realpath(root), root);
  const names = (await fs.readdir(root)).filter(name => name.endsWith('.archive.json')).sort();
  assert.ok(names.length <= 10000, 'Archive queue exceeded discovery limit');
  const packages = [];
  for (const name of names) {
    assert.match(name, /^mee_11[lm]_[a-z_]+_[0-9TZ-]+\.archive\.json$/);
    const metadataPath = path.join(root, name);
    assert.ok((await realFile(metadataPath)).size <= 65536);
    const metadataBytes = await fs.readFile(metadataPath);
    const metadata = JSON.parse(metadataBytes);
    assert.equal(metadata.schema_version, 'MEE_RUNTIME_ARTIFACT_ARCHIVE_V1');
    if (metadata.source_removal_status !== 'completed_verified') continue;
    assert.match(metadata.archive_sha256, /^[a-f0-9]{64}$/);
    const base = name.slice(0, -'.archive.json'.length);
    const archive = path.join(root, `${base}.tar.zst`);
    assert.equal(metadata.archive_path, archive);
    assert.equal((await realFile(archive)).size, metadata.archive_bytes);
    const manifest = path.join(root, `${base}.files.sha256`);
    assert.equal(await fileHash(manifest), metadata.source_manifest_sha256);
    const fingerprint = sha(metadataBytes);
    packages.push({ prefix: `mee/${fingerprint}`, bytes: metadata.archive_bytes,
      files: [ { name: 'source.tar.zst', path: archive, sha256: metadata.archive_sha256 },
        { name: 'metadata.json', path: metadataPath, sha256: fingerprint },
        { name: 'files.sha256', path: manifest, sha256: metadata.source_manifest_sha256 } ] });
  }
  return packages;
}

export async function executeWorkerBackupV1({ adapter, output, runDirectory, snapshot,
  packages, limits = BACKUP_LIMITS }) {
  const completedDirectory = path.join(output, 'completed');
  await fs.mkdir(completedDirectory, { recursive: true, mode: 0o700 });
  let knownBytes = limits.seedBytes;
  for (const name of await fs.readdir(completedDirectory)) {
    assert.match(name, /^(mee|health)-[a-f0-9]{64}\.json$/);
    const receipt = JSON.parse(await fs.readFile(path.join(completedDirectory, name)));
    assert.equal(receipt.verified, true);
    assert.ok(Number.isSafeInteger(receipt.bytes) && receipt.bytes >= 0);
    knownBytes += receipt.bytes;
  }
  assert.ok(knownBytes < limits.totalBytes, 'BACKUP_TOTAL_BUDGET_REACHED');
  const result = { archived: [], previously_verified: 0, pending: [],
    uploaded_bytes: 0, known_bytes: knownBytes, source_files_removed: 0 };
  const healthFile = path.join(runDirectory, 'health.json');
  const health = Buffer.from(JSON.stringify(snapshot));
  assert.ok(health.length <= 2 * 1024 * 1024);
  await fs.writeFile(healthFile, health, { flag: 'wx', mode: 0o600 });
  const healthPackage = { prefix: `health/${sha(health)}`, bytes: health.length,
    files: [{ name: 'health.json', path: healthFile, sha256: sha(health) }] };
  for (const item of [healthPackage, ...packages]) {
    assert.match(item.prefix, /^(mee|health)\/[a-f0-9]{64}$/);
    const receiptPath = path.join(completedDirectory, `${item.prefix.replace('/', '-')}.json`);
    let previous;
    try { previous = JSON.parse(await fs.readFile(receiptPath)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (previous) {
      const remote = await adapter.get(`${item.prefix}/manifest.json`);
      assert.ok(remote !== null && sha(remote) === previous.manifest_sha256,
        'PREVIOUS_BACKUP_MANIFEST_MISSING_OR_CHANGED');
      result.previously_verified++;
      continue;
    }
    let bytes = 0;
    for (const file of item.files) bytes += (await realFile(file.path)).size;
    if (result.archived.length >= limits.packages || result.uploaded_bytes + bytes > limits.dailyBytes) {
      result.pending.push({ prefix: item.prefix, bytes, reason: 'DAILY_BUDGET' }); continue;
    }
    assert.ok(result.known_bytes + bytes <= limits.totalBytes, 'BACKUP_TOTAL_BUDGET_REACHED');
    const uploaded = await uploadVerifiedArchiveV1({ adapter, prefix: item.prefix, files: item.files });
    const receipt = { verified: true, prefix: item.prefix, bytes,
      manifest_sha256: uploaded.manifest_sha256, verified_at: new Date().toISOString() };
    await fs.writeFile(receiptPath, JSON.stringify(receipt), { flag: 'wx', mode: 0o600 });
    result.archived.push(receipt); result.uploaded_bytes += bytes; result.known_bytes += bytes;
    if (item === healthPackage) {
      result.restore = await restoreVerifiedArchiveV1({ adapter, prefix: item.prefix,
        expectedManifestSha256: uploaded.manifest_sha256,
        outputDirectory: path.join(runDirectory, 'restored-health'), maxTotalBytes: bytes });
      assert.deepEqual(await fs.readFile(path.join(runDirectory, 'restored-health', 'health.json')), health);
    }
  }
  assert.ok(result.restore?.verified, 'Fresh daily health restore was not verified');
  return result;
}
