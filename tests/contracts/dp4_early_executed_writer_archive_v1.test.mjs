import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const dir = 'docs/audits/jpn_dp4_execution_writer_archives_20261120';
const expected = {
  identity80: '6820cb906124443b4bf0079f5468dcbba2949850255fa1fa0eb99c7ac2f51714',
  artist84: '78bce17bece89bafc617f22b192808881508a93a811dded3f1d42a2595c8995a',
  family: 'a4b66004d60358fe0121a7d9b27e2816d9275c0ccbafcde0499ade0bb5467364',
  subject: 'a0a6bc1a07db6760f0ec847533fb9efa335af22ea0ff506f3937d83042c08b54',
};
for (const [name, fingerprint] of Object.entries(expected)) {
  test(`${name} archive preserves the exact writer used in rollback and apply`, () => {
    const archive = JSON.parse(gunzipSync(fs.readFileSync(`${dir}/${name}-writer.json.gz`)));
    assert.equal(archive.version, 'DP4_EXECUTED_WRITER_ARCHIVE_V1');
    assert.equal(archive.name, name);
    assert.equal(archive.files.length, 5);
    for (const file of archive.files) assert.equal(sha(Buffer.from(file.content_base64, 'base64')), file.sha256);
    assert.equal(sha(Buffer.from(JSON.stringify(archive.files.map((file) => [file.path, file.sha256])))), fingerprint);
    assert.equal(archive.fingerprint, fingerprint);
    // The identity80 and subject execution files had mixed line endings that
    // Git normalized, so their archives retain the executed bytes.
    if (!['identity80', 'subject'].includes(name)) for (const file of archive.files.slice(0, 2)) assert.equal(sha(fs.readFileSync(file.path)), file.sha256);
  });
}
