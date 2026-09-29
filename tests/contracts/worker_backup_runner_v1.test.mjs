import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { executeWorkerBackupV1, discoverFinalizedMeeArchivesV1 } from '../../backend/operations/worker_backup_runner_v1.mjs';
import { runWorkerCloudBackupV1 } from '../../scripts/workers/worker_cloud_backup_v1.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
async function fixture(t) {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'backup-worker-test-')));
  t.after(async () => {
    assert.equal(path.dirname(dir), await fs.realpath(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith('backup-worker-test-'));
    await fs.rm(dir, { recursive: true });
  });
  const objects = new Map();
  const adapter = { get: async key => objects.has(key) ? Buffer.from(objects.get(key)) : null,
    put: async (key, bytes, options) => { assert.equal(options.upsert, false); assert.equal(objects.has(key), false); objects.set(key, Buffer.from(bytes)); } };
  const output = path.join(dir, 'output'); await fs.mkdir(output);
  const runDirectory = path.join(output, 'run1'); await fs.mkdir(runDirectory);
  const input = path.join(dir, 'evidence.json'); await fs.writeFile(input, 'preserved evidence');
  const item = { prefix: `mee/${sha('preserved evidence')}`, bytes: 18,
    files: [{ name: 'evidence.json', path: input, sha256: sha('preserved evidence') }] };
  return { dir, output, runDirectory, adapter, objects, item,
    args: { output, runDirectory, adapter, packages: [item], snapshot: { at: 'first' },
      limits: { seedBytes: 0, totalBytes: 10000, dailyBytes: 1000, packages: 20 } } };
}
test('scheduled backup restores health, resumes archives and retains sources', async t => {
  const f = await fixture(t); const first = await executeWorkerBackupV1(f.args);
  assert.equal(first.archived.length, 2); assert.equal(first.restore.verified, true);
  assert.equal(first.source_files_removed, 0);
  assert.equal(await fs.readFile(f.item.files[0].path, 'utf8'), 'preserved evidence');
  const next = path.join(f.output, 'run2'); await fs.mkdir(next);
  const second = await executeWorkerBackupV1({ ...f.args, runDirectory: next, snapshot: { at: 'second' } });
  assert.equal(second.previously_verified, 1); assert.equal(second.archived.length, 1);
  f.objects.delete(`${f.item.prefix}/manifest.json`);
  const third = path.join(f.output, 'run3'); await fs.mkdir(third);
  await assert.rejects(executeWorkerBackupV1({ ...f.args, runDirectory: third, snapshot: { at: 'third' } }), /MISSING_OR_CHANGED/);
});
test('daily budget enumerates deferrals; total budget fails closed', async t => {
  const f = await fixture(t);
  const result = await executeWorkerBackupV1({ ...f.args, limits: { ...f.args.limits, dailyBytes: 20 } });
  assert.equal(result.pending.length, 1); assert.equal(result.restore.verified, true);
  const next = path.join(f.output, 'run2'); await fs.mkdir(next);
  await assert.rejects(executeWorkerBackupV1({ ...f.args, runDirectory: next,
    limits: { ...f.args.limits, totalBytes: 1 } }), /TOTAL_BUDGET_REACHED/);
});
test('archive discovery requires finalized exact-path hash-bound evidence', async t => {
  const f = await fixture(t); const root = path.join(f.dir, 'archives'); await fs.mkdir(root);
  const base = 'mee_11l_market_listing_acquisition_daily_batch_fetch_2026-09-29T01-00-00-000Z';
  const archive = path.join(root, `${base}.tar.zst`); await fs.writeFile(archive, 'archive');
  const manifest = Buffer.from('frozen file hashes'); await fs.writeFile(path.join(root, `${base}.files.sha256`), manifest);
  const meta = { schema_version: 'MEE_RUNTIME_ARTIFACT_ARCHIVE_V1', source_removal_status: 'completed_verified',
    archive_path: archive, archive_bytes: 7, archive_sha256: sha('archive'), source_manifest_sha256: sha(manifest) };
  const metaPath = path.join(root, `${base}.archive.json`); await fs.writeFile(metaPath, JSON.stringify(meta));
  assert.equal((await discoverFinalizedMeeArchivesV1(root)).length, 1);
  meta.archive_path = path.join(f.dir, 'outside'); await fs.writeFile(metaPath, JSON.stringify(meta));
  await assert.rejects(discoverFinalizedMeeArchivesV1(root));
});
test('worker persists terminal success and sanitized failure receipts', async t => {
  const f = await fixture(t); await fs.writeFile(path.join(f.dir, 'RELEASE_COMMIT_SHA'), 'a'.repeat(40));
  const good = await runWorkerCloudBackupV1({ output: f.output, root: f.dir, perform: async () => ({ verified: true }) });
  assert.equal(good.status, 'completed');
  await assert.rejects(runWorkerCloudBackupV1({ output: f.output, root: f.dir,
    perform: async () => { throw new Error('Sensitive transport content must not be logged'); } }));
  const latest = JSON.parse(await fs.readFile(path.join(f.output, 'latest.json')));
  assert.equal(latest.status, 'failed'); assert.equal(latest.error_code, 'BACKUP_VERIFICATION_FAILED');
  assert.equal((await fs.readdir(path.join(f.output, 'runs'))).length, 2);
});
