import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { uploadVerifiedArchiveV1 } from '../../backend/operations/verified_archive_upload_v1.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const prefix = `recovery20260929/${'a'.repeat(64)}`;
async function setup() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'verified-archive-test-'));
  const file = path.join(dir, 'archive.tar.gz');
  const bytes = Buffer.from('An archive byte sequence including \u0000 and several chunks.');
  await fs.writeFile(file, bytes);
  const objects = new Map(); let uploads = 0;
  const adapter = {
    get: async key => objects.has(key) ? Buffer.from(objects.get(key)) : null,
    put: async (key, body, options) => {
      assert.equal(options.upsert, false); assert.equal(objects.has(key), false);
      objects.set(key, Buffer.from(body)); uploads++;
    },
  };
  return { dir, file, bytes, objects, adapter, uploads: () => uploads,
    args: { adapter, prefix, chunkBytes: 7, files: [{ name: 'archive.tar.gz', path: file, sha256: sha(bytes) }] },
    close: async () => {
      assert.equal(path.dirname(dir), path.resolve(os.tmpdir()));
      await fs.rm(dir, { recursive: true });
    },
  };
}
test('backup readback reconstructs exact bytes and repeats without overwriting', async () => {
  const fixture = await setup();
  try {
    const first = await uploadVerifiedArchiveV1(fixture.args);
    const count = fixture.uploads();
    const again = await uploadVerifiedArchiveV1(fixture.args);
    assert.equal(fixture.uploads(), count); assert.deepEqual(again, first);
    const reconstructed = Buffer.concat(first.manifest.files[0].chunks.map(c => fixture.objects.get(c.key)));
    assert.deepEqual(reconstructed, fixture.bytes);
  } finally { await fixture.close(); }
});
test('corrupt readback cannot publish a completion manifest', async () => {
  const fixture = await setup();
  try {
    const get = fixture.adapter.get;
    fixture.adapter.get = async key => { const value = await get(key); if (value) value[0] ^= 1; return value; };
    await assert.rejects(uploadVerifiedArchiveV1(fixture.args), /hash mismatch/);
    assert.equal(fixture.objects.has(`${prefix}/manifest.json`), false);
  } finally { await fixture.close(); }
});
test('interrupted upload resumes existing verified chunks without an early manifest', async () => {
  const fixture = await setup();
  try {
    const put = fixture.adapter.put; let calls = 0;
    fixture.adapter.put = async (...args) => { if (++calls === 3) throw new Error('transport interrupted'); await put(...args); };
    await assert.rejects(uploadVerifiedArchiveV1(fixture.args), /transport interrupted/);
    assert.equal(fixture.objects.has(`${prefix}/manifest.json`), false);
    fixture.adapter.put = put;
    const result = await uploadVerifiedArchiveV1(fixture.args);
    assert.equal(result.verified, true);
  } finally { await fixture.close(); }
});
test('input mutation during upload cannot certify a backup', async () => {
  const fixture = await setup();
  try {
    const put = fixture.adapter.put; let once = false;
    fixture.adapter.put = async (...args) => { await put(...args); if (!once) { once = true; await fs.appendFile(fixture.file, 'changed'); } };
    await assert.rejects(uploadVerifiedArchiveV1(fixture.args), /mismatch|changed/);
    assert.equal(fixture.objects.has(`${prefix}/manifest.json`), false);
  } finally { await fixture.close(); }
});
