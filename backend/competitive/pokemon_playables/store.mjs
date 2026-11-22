import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { assert, digest, EngineError, iso, stableJson, timestamp } from './common.mjs';

export const STORAGE_BUCKET = 'pokemon-playables-private';
export const RAW_SOURCE = 'grookai_pokemon_playables_engine_v1';

function validateKey(key) {
  assert(typeof key === 'string' && /^[a-zA-Z0-9_./-]+$/.test(key) && !key.split('/').some(part => !part || part === '.' || part === '..'), 'INVALID_ARTIFACT_KEY');
  return key;
}

async function storageErrorDetails(error) {
  let body = null;
  // Some installed storage-js download paths wrap a non-2xx Response in StorageUnknownError.
  // Inspect only its structured error body; never turn a generic network/authorization failure into absence.
  if (typeof error?.originalError?.clone === 'function') {
    try { body = await error.originalError.clone().json(); } catch {}
  }
  return { status: String(body?.statusCode ?? error?.statusCode ?? error?.originalError?.status ?? ''),
    code: body?.code ?? body?.error ?? '', message: String(body?.message ?? error?.message ?? '') };
}

export class ArtifactStore {
  async withLock(task) {
    const token = randomUUID();
    try { await this.put('worker-lock.json', { token }, { immutable: true }); }
    catch (error) { if (error.code === 'ARTIFACT_EXISTS') throw new EngineError('WORKER_BUSY'); throw error; }
    try { return await task(); }
    finally {
      const lock = await this.get('worker-lock.json');
      if (lock?.token === token) await this.remove('worker-lock.json');
    }
  }

  async saveRaw(receipt, retainUntil) {
    const hash = digest(receipt), key = `raw/${hash}.json`;
    const existing = await this.get(key);
    if (existing) {
      assert(existing.receipt_hash === hash && digest(existing.receipt) === hash, 'RAW_RECEIPT_READBACK_MISMATCH');
      return { key, receipt_hash: hash, raw_import_id: existing.raw_import_id ?? null };
    }
    const rawImportId = await this.insertRaw(receipt, hash);
    await this.put(key, { kind: 'raw_receipt', retain_until: retainUntil, receipt_hash: hash, raw_import_id: rawImportId, receipt }, { immutable: true });
    return { key, receipt_hash: hash, raw_import_id: rawImportId };
  }

  async insertRaw() { return null; }
  async deleteRaw() {}

  async refineRawRetention(reference, retainUntil) {
    const record = await this.get(reference.key);
    assert(record && digest(record.receipt) === reference.receipt_hash, 'RAW_RECEIPT_READBACK_MISMATCH');
    // Only lifecycle metadata is refined, monotonically earlier. Original source bytes and DB evidence are never edited.
    if (!record.retain_until || timestamp(retainUntil) < timestamp(record.retain_until)) {
      await this.put(reference.key, { ...record, retain_until: retainUntil });
    }
  }

  async saveRun(run) {
    await this.put(`runs/${run.run_id}.json`, { ...run, retain_until: new Date(timestamp(run.started_at) + 30 * 86_400_000).toISOString() });
  }
}

export class FileArtifactStore extends ArtifactStore {
  constructor(root) { super(); this.root = path.resolve(root); this.local = true; }
  location(key) {
    const absolute = path.resolve(this.root, validateKey(key));
    assert(absolute.startsWith(`${this.root}${path.sep}`), 'ARTIFACT_PATH_ESCAPE');
    return absolute;
  }
  async get(key) {
    try { return JSON.parse(await fs.readFile(this.location(key), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  async put(key, value, { immutable = false } = {}) {
    const destination = this.location(key);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.${randomUUID()}.tmp`;
    try {
      const file = await fs.open(temporary, 'wx', 0o600);
      try { await file.writeFile(`${stableJson(value)}\n`); await file.sync(); } finally { await file.close(); }
      if (immutable) {
        try { await fs.link(temporary, destination); }
        catch (error) { if (error.code === 'EEXIST') throw new EngineError('ARTIFACT_EXISTS'); throw error; }
      } else await fs.rename(temporary, destination);
    } finally { await fs.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  }
  async remove(key) { await fs.unlink(this.location(key)).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  async list(prefix) {
    validateKey(prefix);
    let files;
    try { files = await fs.readdir(this.location(prefix)); }
    catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    return files.filter(file => /^[a-zA-Z0-9_-]+\.json$/.test(file)).sort().map(file => `${prefix}/${file}`);
  }
}

export class SupabaseArtifactStore extends ArtifactStore {
  constructor(client) { super(); this.client = client; this.local = false; this.bucket = client.storage.from(STORAGE_BUCKET); }
  async initialize({ provision = false } = {}) {
    const { data, error } = await this.client.storage.getBucket(STORAGE_BUCKET);
    if (error) {
      assert(provision && String(error.statusCode) === '404', 'PRIVATE_BUCKET_NOT_PROVISIONED');
      const result = await this.client.storage.createBucket(STORAGE_BUCKET, { public: false, fileSizeLimit: 32 * 1024 * 1024, allowedMimeTypes: ['application/json'] });
      assert(!result.error, 'PRIVATE_BUCKET_PROVISION_FAILED');
    } else assert(data?.public === false, 'PLAYABLES_BUCKET_MUST_BE_PRIVATE');
  }
  async get(key) {
    const { data, error } = await this.bucket.download(validateKey(key));
    if (error) {
      const details = await storageErrorDetails(error);
      if (details.status === '404' && (['NoSuchKey', 'not_found'].includes(details.code) || /object not found/i.test(details.message))) return null;
      throw new EngineError('ARTIFACT_READ_FAILED');
    }
    const body = await data.text();
    assert(Buffer.byteLength(body) <= 32 * 1024 * 1024, 'ARTIFACT_TOO_LARGE');
    try { return JSON.parse(body); } catch { throw new EngineError('ARTIFACT_INVALID_JSON'); }
  }
  async put(key, value, { immutable = false } = {}) {
    const body = stableJson(value);
    assert(Buffer.byteLength(body) <= 32 * 1024 * 1024, 'ARTIFACT_TOO_LARGE');
    const { error } = await this.bucket.upload(validateKey(key), Buffer.from(body), { upsert: !immutable, contentType: 'application/json', cacheControl: '0' });
    if (error) {
      const details = await storageErrorDetails(error);
      if (immutable && (details.status === '409' || /already exists|duplicate/i.test(details.message))) throw new EngineError('ARTIFACT_EXISTS');
      throw new EngineError('ARTIFACT_WRITE_FAILED');
    }
  }
  async remove(key) {
    const { error } = await this.bucket.remove([validateKey(key)]);
    assert(!error, 'ARTIFACT_DELETE_FAILED');
  }
  async list(prefix) {
    validateKey(prefix);
    const keys = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await this.bucket.list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });
      assert(!error, 'ARTIFACT_LIST_FAILED');
      for (const object of data ?? []) if (/^[a-zA-Z0-9_-]+\.json$/.test(object.name)) keys.push(`${prefix}/${object.name}`);
      if ((data ?? []).length < 100) return keys;
      assert(offset < 100000, 'ARTIFACT_LIST_BOUND');
    }
  }
  async insertRaw(receipt, hash) {
    const query = await this.client.from('raw_imports').select('id,payload')
      .eq('source', RAW_SOURCE).eq('status', 'playables_receipt_v1').eq('payload->>receipt_hash', hash).limit(2);
    assert(!query.error && query.data.length <= 1, 'RAW_RECEIPT_LOOKUP_FAILED');
    if (query.data.length) {
      assert(digest(query.data[0].payload.receipt) === hash, 'RAW_RECEIPT_READBACK_MISMATCH');
      return String(query.data[0].id);
    }
    const { data, error } = await this.client.from('raw_imports').insert({ source: RAW_SOURCE, status: 'playables_receipt_v1',
      payload: { _kind: 'pokemon_playables_source_receipt_v1', receipt_hash: hash, receipt }, processed_at: iso(receipt.observed_at), notes: 'Private competitive evidence only; no canonical writes.' }).select('id,payload').single();
    assert(!error && data && digest(data.payload.receipt) === hash, 'RAW_RECEIPT_INSERT_FAILED');
    return String(data.id);
  }
  async deleteRaw(record) {
    if (!record.raw_import_id) return;
    const result = await this.client.from('raw_imports').delete().eq('id', record.raw_import_id).eq('source', RAW_SOURCE)
      .eq('status', 'playables_receipt_v1').eq('payload->>receipt_hash', record.receipt_hash).select('id');
    assert(!result.error, 'RAW_RETENTION_DELETE_FAILED');
  }
  async saveRun(run) {
    // Immutable DB run receipts survive bucket/object publication failures. They contain no decklists or player identifiers.
    const { error } = await this.client.from('raw_imports').insert({ source: RAW_SOURCE, status: 'playables_run_v1',
      payload: { _kind: 'pokemon_playables_run_receipt_v1', ...run }, notes: 'Non-canonical engine operational receipt.' });
    assert(!error, 'RUN_RECEIPT_PERSISTENCE_FAILED');
    await super.saveRun(run);
  }
}
