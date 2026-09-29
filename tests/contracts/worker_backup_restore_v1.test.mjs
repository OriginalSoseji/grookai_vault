import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { uploadVerifiedArchiveV1 } from '../../backend/operations/verified_archive_upload_v1.mjs';
import { restoreVerifiedArchiveV1 } from '../../backend/operations/verified_archive_restore_v1.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const prefix = `recovery20260929/${'b'.repeat(64)}`;
async function fixture(t) {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'restore-proof-')));
  t.after(async () => {
    assert.equal(path.dirname(dir), await fs.realpath(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith('restore-proof-'));
    await fs.rm(dir, { recursive: true });
  });
  const original = Buffer.from('Recovery evidence\0'.repeat(1000));
  const compressed = gzipSync(original);
  const input = path.join(dir, 'source.gz');
  await fs.writeFile(input, compressed);
  const objects = new Map();
  const adapter = {
    get: async key => objects.has(key) ? Buffer.from(objects.get(key)) : null,
    put: async (key, bytes, options) => {
      assert.equal(options.upsert, false); assert.equal(objects.has(key), false);
      objects.set(key, Buffer.from(bytes));
    },
  };
  const uploaded = await uploadVerifiedArchiveV1({ adapter, prefix, chunkBytes: 17,
    files: [{ name: 'source.gz', path: input, sha256: sha(compressed) }] });
  const args = { adapter, prefix, expectedManifestSha256: uploaded.manifest_sha256,
    outputDirectory: path.join(dir, 'restored'), maxTotalBytes: compressed.length };
  const rewriteManifest = change => {
    const manifest = structuredClone(uploaded.manifest); change(manifest);
    const bytes = Buffer.from(JSON.stringify(manifest));
    objects.set(`${prefix}/manifest.json`, bytes); args.expectedManifestSha256 = sha(bytes);
  };
  return { dir, original, compressed, objects, uploaded, args, rewriteManifest };
}

test('downloaded chunks restore identical compressed bytes and decompress correctly', async t => {
  const f = await fixture(t);
  const result = await restoreVerifiedArchiveV1(f.args);
  assert.equal(result.verified, true);
  assert.equal(result.total_bytes, f.compressed.length);
  const restored = await fs.readFile(path.join(f.args.outputDirectory, 'source.gz'));
  assert.deepEqual(restored, f.compressed); assert.deepEqual(gunzipSync(restored), f.original);
  await assert.rejects(restoreVerifiedArchiveV1(f.args), { code: 'EEXIST' });
  assert.deepEqual(await fs.readFile(path.join(f.args.outputDirectory, 'source.gz')), f.compressed);
});

test('tampered or missing completion manifests cannot create output', async t => {
  const f = await fixture(t);
  f.objects.set(`${prefix}/manifest.json`, Buffer.from('{}'));
  await assert.rejects(restoreVerifiedArchiveV1(f.args), /Manifest hash mismatch/);
  f.objects.delete(`${prefix}/manifest.json`);
  await assert.rejects(restoreVerifiedArchiveV1(f.args), /Completion manifest missing/);
  await assert.rejects(fs.stat(f.args.outputDirectory), { code: 'ENOENT' });
});

for (const kind of ['missing', 'corrupt']) {
  test(`${kind} downloaded chunk cannot certify a restore`, async t => {
    const f = await fixture(t);
    const key = f.uploaded.manifest.files[0].chunks[1].key;
    if (kind === 'missing') f.objects.delete(key);
    else f.objects.get(key)[0] ^= 1;
    await assert.rejects(restoreVerifiedArchiveV1(f.args), /Archive chunk missing|Chunk hash mismatch/);
    assert.ok((await fs.stat(f.args.outputDirectory)).isDirectory());
  });
}

for (const [label, change] of [
  ['traversal', m => { m.files[0].name = '../outside'; }],
  ['foreign chunk', m => { m.files[0].chunks[0].key = 'another-archive/000000.part'; }],
  ['duplicate filenames', m => { m.files.push(structuredClone(m.files[0])); }],
  ['Windows device filename', m => { m.files[0].name = 'CON.gz'; }],
  ['byte count inconsistency', m => { m.files[0].bytes++; }],
]) {
  test(`reject ${label} before writing output`, async t => {
    const f = await fixture(t); f.rewriteManifest(change);
    await assert.rejects(restoreVerifiedArchiveV1(f.args));
    await assert.rejects(fs.stat(f.args.outputDirectory), { code: 'ENOENT' });
  });
}

test('explicit byte budget prevents an oversized restore', async t => {
  const f = await fixture(t); f.args.maxTotalBytes--;
  await assert.rejects(restoreVerifiedArchiveV1(f.args), /exceeds byte budget/);
  await assert.rejects(fs.stat(f.args.outputDirectory), { code: 'ENOENT' });
});

test('whole-file digest catches inconsistent signed chunk metadata', async t => {
  const f = await fixture(t);
  f.rewriteManifest(m => { m.files[0].sha256 = '0'.repeat(64); });
  await assert.rejects(restoreVerifiedArchiveV1(f.args), /Restored file hash mismatch/);
});
