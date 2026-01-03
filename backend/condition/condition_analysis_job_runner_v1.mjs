// condition_analysis_job_runner_v1.mjs
// Backend Highway Service V1 for condition_analysis_v1 jobs.

import '../env.mjs';
import { spawn } from 'node:child_process';
import { createBackendClient } from '../supabase_backend_client.mjs';

const JOB_TYPE = 'condition_analysis_v1';
const LOCKED_BY = 'condition_analysis_job_runner_v1';

function log(event, payload = {}) {
  const entry = { ts: new Date().toISOString(), event, ...payload };
  console.log(JSON.stringify(entry));
}

function parseArgs(argv) {
  const opts = {
    once: false,
    maxJobs: null,
    sleepMs: 1500,
    lockTtlMs: 10 * 60 * 1000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--once') {
      opts.once = true;
      if (opts.maxJobs === null) opts.maxJobs = 1;
    } else if (arg === '--max-jobs') {
      const val = parseInt(argv[i + 1], 10);
      if (!Number.isNaN(val) && val > 0) opts.maxJobs = val;
      i += 1;
    } else if (arg === '--sleep-ms') {
      const val = parseInt(argv[i + 1], 10);
      if (!Number.isNaN(val) && val >= 0) opts.sleepMs = val;
      i += 1;
    } else if (arg === '--lock-ttl-ms') {
      const val = parseInt(argv[i + 1], 10);
      if (!Number.isNaN(val) && val > 0) opts.lockTtlMs = val;
      i += 1;
    }
  }

  if (opts.maxJobs === null) {
    opts.maxJobs = 5;
  }
  return opts;
}

async function claimJob(supabase, lockTtlMs) {
  const nowIso = new Date().toISOString();
  const ttlCutoff = new Date(Date.now() - lockTtlMs).toISOString();

  // First: pending oldest
  const { data: pending, error: pendingErr } = await supabase
    .from('ingestion_jobs')
    .select('*')
    .eq('job_type', JOB_TYPE)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pendingErr) throw new Error(`claim select pending failed: ${pendingErr.message}`);

  const target = pending;
  let reclaimed = false;

  let candidate = target;

  if (!candidate) {
    // Second: stale processing, oldest locked_at
    const { data: stale, error: staleErr } = await supabase
      .from('ingestion_jobs')
      .select('*')
      .eq('job_type', JOB_TYPE)
      .eq('status', 'processing')
      .lt('locked_at', ttlCutoff)
      .order('locked_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (staleErr) throw new Error(`claim select stale failed: ${staleErr.message}`);

    if (stale) {
      candidate = stale;
      reclaimed = true;
    }
  }

  if (!candidate) return null;

  const nextAttempts = (candidate.attempts ?? 0) + 1;

  const { data: updated, error: updateErr } = await supabase
    .from('ingestion_jobs')
    .update({
      locked_by: LOCKED_BY,
      locked_at: nowIso,
      last_attempt_at: nowIso,
      status: 'processing',
      attempts: nextAttempts,
    })
    .eq('id', candidate.id)
    .in('status', ['pending', 'processing'])
    .select()
    .maybeSingle();

  if (updateErr) {
    throw new Error(`claim update failed: ${updateErr.message}`);
  }

  if (!updated) return null;

  return { job: updated, reclaimed };
}

function runCenteringWorker(snapshotId) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'node',
      [
        'condition/centering_measurement_worker_v2.mjs',
        '--snapshot-id',
        snapshotId,
        '--analysis-version',
        'v2_centering',
        '--dry-run',
        'false',
      ],
      { stdio: ['ignore', 'inherit', 'inherit'], cwd: process.cwd() },
    );

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`centering worker exited with code ${code}`));
    });
  });
}

async function markStatus(supabase, jobId, status, extra = {}) {
  const { error } = await supabase
    .from('ingestion_jobs')
    .update({
      status,
      locked_by: null,
      locked_at: null,
      last_attempt_at: new Date().toISOString(),
      ...extra,
    })
    .eq('id', jobId);

  if (error) {
    throw new Error(`update status failed: ${error.message}`);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const supabase = createBackendClient();
  log('daemon_start', {
    mode: opts.once ? 'once' : 'daemon',
    maxJobs: opts.maxJobs,
    sleepMs: opts.sleepMs,
    lockTtlMs: opts.lockTtlMs,
  });

  let processed = 0;
  let backoffMs = 0;
  const maxJobs = opts.maxJobs ?? 1;

  while (true) {
    if (opts.once && processed >= maxJobs) break;
    if (!opts.once && processed >= maxJobs) break; // loop will reset processed on completion

    if (backoffMs > 0) {
      await new Promise((r) => setTimeout(r, backoffMs));
      backoffMs = 0;
    }

    let claimed = null;
    try {
      claimed = await claimJob(supabase, opts.lockTtlMs);
    } catch (err) {
      log('job_error', { error: err.message });
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    if (!claimed) {
      log('claim_noop', { reason: 'no_pending_or_stale' });
      await new Promise((r) => setTimeout(r, opts.sleepMs));
      if (!opts.once) {
        processed = 0; // keep looping forever; processed threshold only applies to jobs done
        continue;
      }
      break;
    }

    const { job, reclaimed } = claimed;
    const snapshotId = job.payload?.snapshot_id;
    log('claim_ok', {
      jobId: job.id,
      snapshotId,
      attempts: job.attempts,
      reclaimed: reclaimed || false,
    });

    if (!snapshotId || typeof snapshotId !== 'string' || snapshotId.trim().length === 0) {
      await markStatus(supabase, job.id, 'failed');
      log('job_error', { jobId: job.id, snapshotId, error: 'missing_snapshot_id' });
      processed += 1;
      continue;
    }

    const started = Date.now();
    try {
      await runCenteringWorker(snapshotId);
      await markStatus(supabase, job.id, 'completed');
      const ms = Date.now() - started;
      log('job_ok', { jobId: job.id, snapshotId, ms });
    } catch (err) {
      await markStatus(supabase, job.id, 'failed');
      log('job_error', { jobId: job.id, snapshotId, error: err.message });
      backoffMs = 1000;
    }

    processed += 1;

    if (!opts.once && processed >= maxJobs) {
      // reset counter and keep running
      processed = 0;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
