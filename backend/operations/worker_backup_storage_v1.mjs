import assert from 'node:assert/strict';
export const BACKUP_PROJECT = 'ycdxbpibncqcchqiihfz';
export const BACKUP_BUCKET = 'worker-recovery-archives';
export const BUCKET_OPTIONS = Object.freeze({ public: false, fileSizeLimit: 8388608,
  allowedMimeTypes: ['application/octet-stream', 'application/json'] });
const keyPattern = /^[a-zA-Z0-9_-]+\/[a-f0-9]{64}\/(?:manifest\.json|[a-zA-Z0-9_.-]+\/[0-9]{6}\.part)$/;

export function backupTransportV1(transport = globalThis.fetch) {
  return (input, init = {}) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    assert.equal(url.origin, `https://${BACKUP_PROJECT}.supabase.co`);
    assert.ok(url.pathname.startsWith('/storage/v1/'));
    return transport(input, { ...init, redirect: 'error',
      signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(90000)]) : AbortSignal.timeout(90000) });
  };
}
export async function requireBackupBucketV1(client, { create = false } = {}) {
  // Listing distinguishes an absent bucket from authorization failures.
  const { data: buckets, error } = await client.storage.listBuckets();
  if (error) throw new Error('BACKUP_BUCKET_LIST_FAILED');
  let bucket = buckets.find(row => row.id === BACKUP_BUCKET);
  if (!bucket && create) {
    const result = await client.storage.createBucket(BACKUP_BUCKET, BUCKET_OPTIONS);
    if (result.error) throw new Error('BACKUP_BUCKET_CREATE_FAILED');
  }
  const result = await client.storage.getBucket(BACKUP_BUCKET);
  if (result.error) throw new Error('BACKUP_BUCKET_READ_FAILED');
  bucket = result.data;
  assert.equal(bucket.id, BACKUP_BUCKET);
  assert.equal(bucket.public, false, 'Backup bucket must remain private');
  assert.equal(Number(bucket.file_size_limit), BUCKET_OPTIONS.fileSizeLimit);
  assert.deepEqual([...bucket.allowed_mime_types].sort(), [...BUCKET_OPTIONS.allowedMimeTypes].sort());
  return { id: bucket.id, public: bucket.public, file_size_limit: bucket.file_size_limit };
}
export function backupStorageAdapterV1(client) {
  const bucket = client.storage.from(BACKUP_BUCKET);
  return {
    async get(key) {
      assert.match(key, keyPattern);
      const { data, error } = await bucket.download(key);
      if (error) {
        // The pinned storage-js download path wraps non-2xx Responses in
        // StorageUnknownError instead of exposing the decoded StorageApiError.
        // Decode only a bounded failure response; auth/bucket/provider failures
        // must never be mistaken for an absent object.
        if (error.originalError instanceof Response && [400, 404].includes(error.originalError.status)) {
          let body;
          try { body = await error.originalError.clone().json(); } catch { body = null; }
          if (body?.code === 'NoSuchKey' && String(body.statusCode) === '404') return null;
        }
        if ((error.code === 'NoSuchKey' && String(error.statusCode) === '404')
          || (String(error.statusCode) === '400' && error.message === 'Object not found')) return null;
        throw new Error('BACKUP_OBJECT_READ_FAILED');
      }
      assert.ok(data.size <= 8388608, 'Stored object exceeds backup limit');
      return Buffer.from(await data.arrayBuffer());
    },
    async put(key, body, options) {
      assert.match(key, keyPattern);
      assert.ok(Buffer.isBuffer(body) && body.length <= 8388608);
      assert.equal(options.upsert, false);
      assert.ok(BUCKET_OPTIONS.allowedMimeTypes.includes(options.contentType));
      const { error } = await bucket.upload(key, body, { upsert: false, contentType: options.contentType });
      if (error) throw new Error('BACKUP_OBJECT_CREATE_FAILED');
    },
  };
}
