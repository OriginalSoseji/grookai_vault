// pricing_job_runner_v1.mjs
// Backend Highway Service for pricing_jobs (daemon or single-run).

import '../env.mjs';
import { spawn } from 'node:child_process';
import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  getEbayBrowseBudgetSnapshot,
  getNextUtcDayStartMs,
  getPricingJobMinStartDelayMs,
  logEbayBrowseBudgetConfig,
} from '../clients/ebay_browse_budget_v1.mjs';
import {
  AUTHORITATIVE_PRICING_CLAIM_STRATEGY,
  AUTHORITATIVE_PRICING_RUNNER,
  PRICING_QUEUE_PRIORITY_ORDER,
  isKnownPricingPriority,
  normalizePricingPriority,
} from './pricing_queue_priority_contract.mjs';

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

  // pending oldest first
  const { data: pending, error: pendingErr } = await supabase
    .from('pricing_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pendingErr) throw new Error(`claim select pending failed: ${pendingErr.message}`);

  let candidate = pending;
  let reclaimed = false;

  if (!candidate) {
    // stale running
    const { data: stale, error: staleErr } = await supabase
      .from('pricing_jobs')
      .select('*')
      .eq('status', 'running')
      .lt('started_at', ttlCutoff)
      .order('started_at', { ascending: true })
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
    .from('pricing_jobs')
    .update({
      status: 'running',
      started_at: nowIso,
      attempts: nextAttempts,
    })
    .eq('id', candidate.id)
    .in('status', ['pending', 'running'])
    .select()
    .maybeSingle();

  if (updateErr) {
    throw new Error(`claim update failed: ${updateErr.message}`);
  }

  if (!updated) return null;
  return { job: updated, reclaimed };
}

function runPricingWorker(cardPrintId) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'node',
      [
        'pricing/ebay_browse_prices_worker.mjs',
        '--card-print-id',
        cardPrintId,
      ],
      { stdio: ['ignore', 'inherit', 'inherit'], cwd: process.cwd() },
    );

    child.on('error', reject);
    child.on('close', (code) => {
      const exitCode = typeof code === 'number' ? code : 1;
      resolve(exitCode);
    });
  });
}

async function markStatus(supabase, jobId, status, errorMsg = null) {
  const payload = {
    status,
    completed_at: status === 'done' || status === 'failed' ? new Date().toISOString() : null,
    error: errorMsg ? errorMsg.slice(0, 500) : null,
  };

  const { error } = await supabase.from('pricing_jobs').update(payload).eq('id', jobId);
  if (error) throw new Error(`update status failed: ${error.message}`);
}

async function markRetryable(supabase, jobId, errorMsg = null) {
  const payload = {
    status: 'pending',
    started_at: null,
    completed_at: null,
    error: errorMsg ? errorMsg.slice(0, 500) : 'retryable_error',
  };

  const { error } = await supabase.from('pricing_jobs').update(payload).eq('id', jobId);
  if (error) throw new Error(`update retryable status failed: ${error.message}`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const supabase = createBackendClient();
  logEbayBrowseBudgetConfig('pricing_job_runner_v1');

  log('daemon_start', {
    runnerAuthority: AUTHORITATIVE_PRICING_RUNNER,
    claimStrategy: AUTHORITATIVE_PRICING_CLAIM_STRATEGY,
    supportedPriorities: Object.keys(PRICING_QUEUE_PRIORITY_ORDER),
    mode: opts.once ? 'once' : 'daemon',
    maxJobs: opts.maxJobs,
    sleepMs: opts.sleepMs,
    lockTtlMs: opts.lockTtlMs,
  });

  let processed = 0;
  let backoffMs = 0;
  const maxJobs = opts.maxJobs ?? 1;
  const minJobStartDelayMs = getPricingJobMinStartDelayMs();
  let lastJobStartedAt = 0;
  let budgetPauseUntilMs = 0;

  while (true) {
    if (opts.once && processed >= maxJobs) break;
    if (!opts.once && processed >= maxJobs) processed = 0;

    if (!opts.once && budgetPauseUntilMs > Date.now()) {
      const waitMs = budgetPauseUntilMs - Date.now();
      log('budget_pause_active', { waitMs });
      await new Promise((r) => setTimeout(r, waitMs));
      budgetPauseUntilMs = 0;
      continue;
    }

    if (backoffMs > 0) {
      await new Promise((r) => setTimeout(r, backoffMs));
      backoffMs = 0;
    }

    let budgetSnapshot = null;
    try {
      budgetSnapshot = await getEbayBrowseBudgetSnapshot({ supabase });
      log('budget_snapshot', {
        remainingCalls: budgetSnapshot.remaining_calls,
        consumedCalls: budgetSnapshot.consumed_calls,
        dailyBudget: budgetSnapshot.daily_budget,
        usageDate: budgetSnapshot.usage_date,
      });
    } catch (err) {
      log('job_error', { error: err.message, stage: 'budget_snapshot' });
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    if (budgetSnapshot.exhausted) {
      const pauseUntilMs = getNextUtcDayStartMs();
      const waitMs = Math.max(0, pauseUntilMs - Date.now());
      log('budget_exhausted_pause', {
        remainingCalls: budgetSnapshot.remaining_calls,
        consumedCalls: budgetSnapshot.consumed_calls,
        dailyBudget: budgetSnapshot.daily_budget,
        usageDate: budgetSnapshot.usage_date,
        waitMs,
      });
      if (opts.once) {
        break;
      }
      budgetPauseUntilMs = pauseUntilMs;
      continue;
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
      if (opts.once) break;
      else continue;
    }

    const { job, reclaimed } = claimed;
    const cardPrintId = job.card_print_id;
    const normalizedPriority = normalizePricingPriority(job.priority);
    log('claim_ok', {
      jobId: job.id,
      cardPrintId,
      attempts: job.attempts,
      priority: normalizedPriority,
      reclaimed: reclaimed || false,
    });

    if (!isKnownPricingPriority(job.priority)) {
      log('job_priority_unknown', {
        jobId: job.id,
        cardPrintId,
        rawPriority: job.priority ?? null,
        normalizedPriority,
      });
    }

    if (!cardPrintId) {
      await markStatus(supabase, job.id, 'failed', 'missing_card_print_id');
      log('job_error', { jobId: job.id, cardPrintId, error: 'missing_card_print_id' });
      processed += 1;
      continue;
    }

    try {
      budgetSnapshot = await getEbayBrowseBudgetSnapshot({ supabase });
      log('budget_before_job_start', {
        jobId: job.id,
        cardPrintId,
        remainingCalls: budgetSnapshot.remaining_calls,
        consumedCalls: budgetSnapshot.consumed_calls,
        dailyBudget: budgetSnapshot.daily_budget,
        usageDate: budgetSnapshot.usage_date,
      });
    } catch (err) {
      await markRetryable(supabase, job.id, `retryable_budget_snapshot: ${err.message}`);
      log('job_retryable', {
        jobId: job.id,
        cardPrintId,
        error: err.message,
        stage: 'budget_before_job_start',
      });
      backoffMs = 1000;
      processed += 1;
      continue;
    }

    if (budgetSnapshot.exhausted) {
      await markRetryable(
        supabase,
        job.id,
        'retryable_quota_exhausted: daily_browse_budget_exhausted_before_start',
      );
      const pauseUntilMs = getNextUtcDayStartMs();
      budgetPauseUntilMs = pauseUntilMs;
      log('job_retryable_budget_exhausted_before_start', {
        jobId: job.id,
        cardPrintId,
        remainingCalls: budgetSnapshot.remaining_calls,
        consumedCalls: budgetSnapshot.consumed_calls,
        dailyBudget: budgetSnapshot.daily_budget,
        usageDate: budgetSnapshot.usage_date,
        waitMs: Math.max(0, pauseUntilMs - Date.now()),
      });
      processed += 1;
      continue;
    }

    if (!opts.once && minJobStartDelayMs > 0 && lastJobStartedAt > 0) {
      const elapsedMs = Date.now() - lastJobStartedAt;
      const waitMs = minJobStartDelayMs - elapsedMs;
      if (waitMs > 0) {
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }

    const started = Date.now();
    if (!opts.once) {
      lastJobStartedAt = started;
    }
    try {
      const exitCode = await runPricingWorker(cardPrintId);

      if (exitCode === 0) {
        await markStatus(supabase, job.id, 'done', null);
        const ms = Date.now() - started;
        log('job_ok', { jobId: job.id, cardPrintId, ms });
      } else if (exitCode === 42) {
        await markRetryable(
          supabase,
          job.id,
          `retryable_429: rate_limited (exit=${exitCode})`,
        );
        log('job_retryable', { jobId: job.id, cardPrintId, exitCode });

        // Strong backoff to reduce repeated 429s.
        backoffMs = 60_000;
      } else if (exitCode === 43) {
        await markRetryable(
          supabase,
          job.id,
          'retryable_quota_exhausted: daily_browse_budget_exhausted',
        );
        const pauseUntilMs = getNextUtcDayStartMs();
        budgetPauseUntilMs = pauseUntilMs;
        try {
          budgetSnapshot = await getEbayBrowseBudgetSnapshot({ supabase });
        } catch (snapshotErr) {
          log('job_error', {
            jobId: job.id,
            cardPrintId,
            error: snapshotErr.message,
            stage: 'budget_exhausted_snapshot',
          });
          budgetSnapshot = {
            remaining_calls: 0,
            consumed_calls: null,
            daily_budget: null,
            usage_date: null,
          };
        }
        log('job_retryable_budget_exhausted', {
          jobId: job.id,
          cardPrintId,
          remainingCalls: budgetSnapshot.remaining_calls,
          consumedCalls: budgetSnapshot.consumed_calls,
          dailyBudget: budgetSnapshot.daily_budget,
          usageDate: budgetSnapshot.usage_date,
          waitMs: Math.max(0, pauseUntilMs - Date.now()),
        });
      } else {
        await markStatus(supabase, job.id, 'failed', `pricing worker exited with code ${exitCode}`);
        log('job_error', { jobId: job.id, cardPrintId, error: `exit_${exitCode}` });
        backoffMs = 1000;
      }
    } catch (err) {
      await markStatus(supabase, job.id, 'failed', err.message);
      log('job_error', { jobId: job.id, cardPrintId, error: err.message });
      backoffMs = 1000;
    }

    processed += 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
