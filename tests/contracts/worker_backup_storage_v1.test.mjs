import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { backupStorageAdapterV1, requireBackupBucketV1, backupTransportV1,
  BACKUP_BUCKET, BUCKET_OPTIONS } from '../../backend/operations/worker_backup_storage_v1.mjs';
const key = `mee/${'a'.repeat(64)}/source.tar.zst/000000.part`;
test('pinned real SDK wrapped download responses distinguish missing objects from outages and auth failures', async () => {
  for (const [status, body, missing] of [
    [400, { statusCode: '404', error: 'not_found', message: 'Object not found', code: 'NoSuchKey' }, true],
    [400, { statusCode: '404', error: 'not_found', message: 'Bucket not found', code: 'NoSuchBucket' }, false],
    [403, { statusCode: '403', code: 'AccessDenied', message: 'Access denied' }, false],
    [503, { statusCode: '503', code: 'InternalError', message: 'Service unavailable' }, false],
  ]) {
    const client = createClient('https://ycdxbpibncqcchqiihfz.supabase.co', 'isolated-fixture', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }) },
    });
    const adapter = backupStorageAdapterV1(client);
    if (missing) assert.equal(await adapter.get(key), null);
    else await assert.rejects(adapter.get(key), /READ_FAILED/);
  }
});
test('only explicit missing-object errors are interpreted as missing', async () => {
  for (const error of [ { statusCode: '403', message: 'denied' },
    { statusCode: '404', code: 'NoSuchBucket' }, { statusCode: '500', message: 'Object not found' } ]) {
    const adapter = backupStorageAdapterV1({ storage: { from: () => ({ download: async () => ({ error }) }) } });
    await assert.rejects(adapter.get(key), /READ_FAILED/);
  }
  const adapter = backupStorageAdapterV1({ storage: { from: () => ({ download: async () =>
    ({ error: { statusCode: '404', code: 'NoSuchKey' } }) }) } });
  assert.equal(await adapter.get(key), null);
});
test('adapter cannot overwrite or write outside its content-addressed prefix', async () => {
  let calls = 0;
  const adapter = backupStorageAdapterV1({ storage: { from: () => ({ upload: async () => { calls++; return {}; } }) } });
  await assert.rejects(adapter.put(key, Buffer.from('x'), { upsert: true, contentType: 'application/octet-stream' }));
  await assert.rejects(adapter.put('../outside', Buffer.from('x'), { upsert: false, contentType: 'application/octet-stream' }));
  assert.equal(calls, 0);
  await adapter.put(key, Buffer.from('x'), { upsert: false, contentType: 'application/octet-stream' });
  assert.equal(calls, 1);
});
test('existing public bucket fails without modification', async () => {
  let writes = 0;
  const bucket = { id: BACKUP_BUCKET, public: true, file_size_limit: 8388608, allowed_mime_types: BUCKET_OPTIONS.allowedMimeTypes };
  const client = { storage: { listBuckets: async () => ({ data: [bucket] }), getBucket: async () => ({ data: bucket }),
    createBucket: async () => { writes++; return {}; } } };
  await assert.rejects(requireBackupBucketV1(client, { create: true }), /private/);
  assert.equal(writes, 0); bucket.public = false;
  assert.equal((await requireBackupBucketV1(client)).public, false);
});
test('transport prevents credential-bearing redirects and other origins', async () => {
  let received;
  const transport = backupTransportV1(async (url, options) => { received = options; return {}; });
  assert.throws(() => transport('https://example.com/storage/v1/bucket'));
  assert.throws(() => transport('https://ycdxbpibncqcchqiihfz.supabase.co/rest/v1/cards'));
  await transport('https://ycdxbpibncqcchqiihfz.supabase.co/storage/v1/bucket');
  assert.equal(received.redirect, 'error'); assert.ok(received.signal);
});
