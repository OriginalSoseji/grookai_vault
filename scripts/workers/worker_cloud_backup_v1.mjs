import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createBackendClient } from '../../backend/supabase_backend_client.mjs';
import { BACKUP_PROJECT, requireBackupBucketV1, backupStorageAdapterV1,
  backupTransportV1 } from '../../backend/operations/worker_backup_storage_v1.mjs';
import { discoverFinalizedMeeArchivesV1, executeWorkerBackupV1 } from '../../backend/operations/worker_backup_runner_v1.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUTPUT = '/var/lib/grookai/worker-cloud-backups';

export async function runWorkerCloudBackupV1({ output = OUTPUT, root = ROOT,
  perform = async ({ runDirectory, receipt }) => {
    if (new URL(process.env.SUPABASE_URL).origin !== `https://${BACKUP_PROJECT}.supabase.co`)
      throw new Error('BACKUP_PROJECT_MISMATCH');
    if (process.env.GV_USER_ACCESS_TOKEN) throw new Error('BACKUP_REQUIRES_SYSTEM_IDENTITY');
    const control = JSON.parse(fs.readFileSync('/var/lib/grookai/production-control-plane/current/live_control_plane_v1.json'));
    const age = Date.now() - Date.parse(control.observed_at);
    if (control.launch_status !== 'healthy' || !Number.isFinite(age) || age < -60000 || age > 2700000)
      throw new Error('BACKUP_REQUIRES_FRESH_HEALTHY_CRITICAL_SERVICES');
    const disk = fs.statfsSync('/');
    if (disk.bavail * disk.bsize < 15000000000) throw new Error('BACKUP_PAUSED_BELOW_CAPACITY_FLOOR');
    const client = createBackendClient({ fetch: backupTransportV1() });
    receipt.bucket = await requireBackupBucketV1(client);
    const adapter = backupStorageAdapterV1(client);
    const seed = JSON.parse(fs.readFileSync('/etc/grookai/worker-backup-seed.json'));
    if (seed.archives.length !== 14 || seed.total_archive_bytes !== 2835276805)
      throw new Error('BACKUP_SEED_INVENTORY_INVALID');
    for (const archive of seed.archives) {
      if (!/^recovery20260929\/[a-f0-9]{64}$/.test(archive.prefix)) throw new Error('BACKUP_SEED_PREFIX_INVALID');
      const manifest = await adapter.get(`${archive.prefix}/manifest.json`);
      if (!manifest || createHash('sha256').update(manifest).digest('hex') !== archive.manifest_sha256)
        throw new Error('BACKUP_SEED_MANIFEST_MISSING_OR_CHANGED');
    }
    receipt.seed_manifests_verified = seed.archives.length;
    const packages = await discoverFinalizedMeeArchivesV1('/var/lib/grookai/mee/archive/runtime');
    const mtg = JSON.parse(fs.readFileSync('/var/lib/grookai/mtg-catalog-supervisor/latest.json'));
    const snapshot = { schema_version: 'WORKER_RECOVERY_HEALTH_V1', at: receipt.started_at,
      producer_commit_sha: receipt.producer_commit_sha,
      control: { observed_at: control.observed_at, launch_status: control.launch_status, summary: control.summary },
      mtg: { run_id: mtg.run_id, status: mtg.status, completed_at: mtg.completed_at,
        producer_commit_sha: mtg.producer_commit_sha, artifact_hashes: mtg.artifact_hashes },
      runtime_pointers: Object.fromEntries(['pricing', 'mee', 'control_plane', 'mtg_supervisor'].map(
        name => [name, fs.realpathSync(`/opt/grookai_${name}_current`)])) };
    return executeWorkerBackupV1({ adapter, output,
      runDirectory, snapshot, packages });
  } } = {}) {
  const started = new Date().toISOString();
  const runId = `${started.replace(/[:.]/g, '-')}-${randomUUID()}`;
  const runDirectory = path.join(output, 'runs', runId);
  fs.mkdirSync(runDirectory, { recursive: true, mode: 0o700 });
  const receipt = { schema_version: 'WORKER_CLOUD_BACKUP_V1', run_id: runId,
    started_at: started, status: 'running', invocation_id: process.env.INVOCATION_ID ?? null };
  fs.writeFileSync(path.join(runDirectory, 'attempt.json'), JSON.stringify(receipt), { flag: 'wx', mode: 0o600 });
  let finished = false;
  const finish = (status, error_code = null) => {
    if (finished) return; finished = true;
    Object.assign(receipt, { status, completed_at: new Date().toISOString(), error_code });
    fs.writeFileSync(path.join(runDirectory, 'receipt.json'), JSON.stringify(receipt, null, 2), { flag: 'wx', mode: 0o600 });
    const pending = path.join(output, `${runId}.pending`);
    fs.writeFileSync(pending, JSON.stringify(receipt), { flag: 'wx', mode: 0o600 });
    fs.renameSync(pending, path.join(output, 'latest.json'));
  };
  const interrupted = () => { finish('failed', 'INTERRUPTED'); process.exit(143); };
  process.once('SIGTERM', interrupted); process.once('SIGINT', interrupted);
  try {
    receipt.producer_commit_sha = fs.readFileSync(path.join(root, 'RELEASE_COMMIT_SHA'), 'utf8').trim();
    if (!/^[a-f0-9]{40}$/.test(receipt.producer_commit_sha)) throw new Error('BACKUP_RELEASE_INVALID');
    receipt.result = await perform({ runDirectory, receipt });
    finish('completed'); return receipt;
  } catch (error) {
    finish('failed', /^[A-Z][A-Z_]{3,100}$/.test(error.message) ? error.message : 'BACKUP_VERIFICATION_FAILED');
    throw error;
  } finally {
    process.removeListener('SIGTERM', interrupted); process.removeListener('SIGINT', interrupted);
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('Scheduled backup worker accepts no CLI arguments');
  runWorkerCloudBackupV1().catch(() => {
    console.error('Worker backup failed; inspect the persisted receipt.'); process.exitCode = 1;
  });
}
