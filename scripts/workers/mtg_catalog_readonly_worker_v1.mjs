import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { runMtgCatalogSupervisorV1 } from '../audits/mtg_catalog_supervisor_v1.mjs';
import { MTG_WORKER_SCHEMA_V1, mtgEvidenceHashV1 } from '../../backend/operations/mtg_worker_evidence_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUTPUT = '/var/lib/grookai/mtg-catalog-supervisor';

export function checkMtgWorkerCapacityV1({ now = new Date(), freeBytes, control } = {}) {
  const age = now.getTime() - Date.parse(control?.observed_at);
  if (!Number.isFinite(freeBytes) || freeBytes < 15_000_000_000) throw new Error('MTG background audit paused below the worker capacity target');
  if (control?.launch_status !== 'healthy' || !Number.isFinite(age) || age < -60_000 || age > 45 * 60_000) {
    throw new Error('MTG background audit requires fresh healthy launch-critical evidence');
  }
  return { free_bytes: freeBytes, launch_observed_at: control.observed_at, launch_status: control.launch_status };
}

function runtimePreflight() {
  const disk = fs.statfsSync('/');
  return checkMtgWorkerCapacityV1({ freeBytes: disk.bavail * disk.bsize,
    control: JSON.parse(fs.readFileSync('/var/lib/grookai/production-control-plane/current/live_control_plane_v1.json', 'utf8')) });
}

export function writeMtgWorkerReceiptV1(output, receipt) {
  const runDir = path.join(output, 'runs', receipt.run_id);
  fs.writeFileSync(path.join(runDir, 'worker_receipt.json'), JSON.stringify(receipt, null, 2), { flag: 'wx' });
  const pending = path.join(output, `${receipt.run_id}.pending`);
  fs.writeFileSync(pending, JSON.stringify(receipt, null, 2), { flag: 'wx' });
  fs.renameSync(pending, path.join(output, 'latest.json'));
}

export async function runMtgReadonlyWorkerV1({ output = OUTPUT, root = ROOT, execute = runMtgCatalogSupervisorV1, preflight = runtimePreflight } = {}) {
  const started = new Date().toISOString();
  const runId = `${started.replace(/[:.]/g, '-')}-${randomUUID()}`;
  const runDir = path.join(output, 'runs', runId);
  fs.mkdirSync(runDir, { recursive: true });
  const receipt = { schema_version: MTG_WORKER_SCHEMA_V1, run_id: runId, started_at: started,
    producer_commit_sha: null, trigger: process.env.INVOCATION_ID ? 'systemd' : 'operator',
    artifact_hashes: {}, status: 'running' };
  fs.writeFileSync(path.join(runDir, 'attempt.json'), JSON.stringify(receipt, null, 2), { flag: 'wx' });
  let finished = false;
  const finish = (status, error = null) => {
    if (finished) return;
    finished = true;
    for (const name of ['summary.json', 'run_plan.json', 'catalog_readback.json', 'runner_runs.json', 'failure.json']) {
      const file = path.join(runDir, name);
      if (fs.existsSync(file)) receipt.artifact_hashes[name] = mtgEvidenceHashV1(fs.readFileSync(file));
    }
    Object.assign(receipt, { status, completed_at: new Date().toISOString(), error });
    writeMtgWorkerReceiptV1(output, receipt);
  };
  const interrupted = () => { finish('failed', { code: 'INTERRUPTED', detail: 'Worker received a termination signal.' }); process.exit(143); };
  process.once('SIGTERM', interrupted);
  process.once('SIGINT', interrupted);
  try {
    const sha = fs.readFileSync(path.join(root, 'RELEASE_COMMIT_SHA'), 'utf8').trim();
    if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Immutable worker release SHA is invalid');
    receipt.producer_commit_sha = sha;
    if (process.env.CATALOG_AUTOMATION_MODE !== 'shadow-only') throw new Error('Worker requires shadow-only mode');
    receipt.preflight = preflight();
    await execute(['--shadow-only', '--public-read-only', '--repository=OriginalSoseji/grookai_vault',
      `--as-of=${started.slice(0, 10)}`, '--max-sets=25', '--max-consecutive-failures=3', `--out-dir=${runDir}`]);
    finish('completed');
    return receipt;
  } catch (error) {
    finish('failed', { code: error.code ?? 'AUDIT_FAILED',
      detail: String(error.message).replace(/postgres(?:ql)?:\/\/\S+/gi, '[DATABASE_URL]').slice(0, 500) });
    throw error;
  } finally {
    process.removeListener('SIGTERM', interrupted);
    process.removeListener('SIGINT', interrupted);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('Scheduled read-only worker accepts no CLI arguments');
  runMtgReadonlyWorkerV1().catch(() => { console.error('MTG read-only worker failed; inspect its persisted receipt.'); process.exitCode = 1; });
}
