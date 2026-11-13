import assert from 'node:assert/strict';
import test from 'node:test';
import { gzipSync } from 'node:zlib';
import { assertSourceReceiptEntriesV1 } from '../../scripts/audits/japanese_master_index_v4/admission_receipt_verification_v1.mjs';
import { verifyRawArchiveBytes } from '../../scripts/audits/japanese_master_index_v4/package_preserved_evidence_v1.mjs';
import { contentFingerprint, sha256 } from '../../scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';

const lane = { source_lane: 'source', archive_path: 'archive.tar.gz' };
const sha = 'a'.repeat(64);
const entry = { entry_path: 'set/card.json', sha256: sha };
const assertion = { assertion_key: 'one', source_id: 'source', raw_snapshot_ref: 'tar+gzip://archive.tar.gz#set/card.json', raw_snapshot_sha256: sha };

test('admission receipt must refer to the exact captured archive member and bytes', () => {
  assert.doesNotThrow(() => assertSourceReceiptEntriesV1([assertion], lane, [entry]));
  assert.throws(() => assertSourceReceiptEntriesV1([{ ...assertion, raw_snapshot_sha256: 'b'.repeat(64) }], lane, [entry]), /raw hash mismatch/);
  assert.throws(() => assertSourceReceiptEntriesV1([assertion], lane, []), /raw hash mismatch/);
  assert.throws(() => assertSourceReceiptEntriesV1([{ ...assertion, raw_snapshot_ref: 'tar+gzip:\/\/other.tar.gz#set/card.json' }], lane, [entry]), /archive reference mismatch/);
  assert.throws(() => assertSourceReceiptEntriesV1([{ ...assertion, source_id: 'other' }], lane, [entry]), /archive reference mismatch/);
  assert.throws(() => assertSourceReceiptEntriesV1([assertion], lane, [entry, entry]), /Duplicate archive member/);
});

test('archive bytes and member fingerprint are checked before receipt comparison', () => {
  const body = Buffer.from('captured body');
  const header = Buffer.alloc(512);
  header.write('set/card.json', 0, 'utf8');
  header.write(`${body.length.toString(8).padStart(11, '0')}\0`, 124, 'ascii');
  header[156] = 48;
  const archive = gzipSync(Buffer.concat([header, body, Buffer.alloc(512 - body.length), Buffer.alloc(1024)]));
  const entries = [{ entry_path: 'set/card.json', byte_size: body.length, sha256: sha256(body) }];
  const expected = { archive_sha256: sha256(archive), entry_manifest_fingerprint_sha256: contentFingerprint(entries) };
  assert.deepEqual(verifyRawArchiveBytes(archive, expected), entries);
  assert.throws(() => verifyRawArchiveBytes(archive, { ...expected, archive_sha256: '0'.repeat(64) }), /archive hash mismatch/);
  assert.throws(() => verifyRawArchiveBytes(archive, { ...expected, entry_manifest_fingerprint_sha256: '0'.repeat(64) }), /entry proof mismatch/);
  const duplicated = gzipSync(Buffer.concat([header, body, Buffer.alloc(512 - body.length), header, body, Buffer.alloc(512 - body.length), Buffer.alloc(1024)]));
  assert.throws(() => verifyRawArchiveBytes(duplicated, { ...expected, archive_sha256: sha256(duplicated) }), /duplicate raw archive entry/);
});
