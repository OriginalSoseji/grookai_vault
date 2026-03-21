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
import {
  buildPricingJobOutcomePatch,
  classifyPricingRunOutcome,
  isBroadPricingQueueEnabled,
  isDemandDrivenPriority,
  isVaultPricingJob,
  sortPricingClaimCandidates,
} from './pricing_queue_policy_v1.mjs';

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
  const broadQueueEnabled = isBroadPricingQueueEnabled();

  let pendingQuery = supabase
    .from('pricing_jobs')
    .select('*')
    .eq('status', 'pending')
    .or(`next_eligible_at.is.null,next_eligible_at.lte.${nowIso}`)
    .order('requested_at', { ascending: true })
    .limit(100);

  if (!broadQueueEnabled) {
    pendingQuery = pendingQuery.in('priority', ['vault', 'user']);
  }

  const { data: pendingRows, error: pendingErr } = await pendingQuery;

  if (pendingErr) throw new Error(`claim select pending failed: ${pendingErr.message}`);

  let candidate = sortPricingClaimCandidates(pendingRows ?? [])[0] ?? null;
  let reclaimed = false;

  if (!candidate) {
    let staleQuery = supabase
      .from('pricing_jobs')
      .select('*')
      .eq('status', 'running')
      .lt('started_at', ttlCutoff)
      .order('started_at', { ascending: true })
      .limit(100);

    if (!broadQueueEnabled) {
      staleQuery = staleQuery.in('priority', ['vault', 'user']);
    }

    const { data: staleRows, error: staleErr } = await staleQuery;

    if (staleErr) throw new Error(`claim select stale failed: ${staleErr.message}`);

    const stale = sortPricingClaimCandidates(staleRows ?? [])[0] ?? null;
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
    .eq('status', candidate.status)
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

async function markJobOutcome(supabase, job, patch) {
  const { error } = await supabase.from('pricing_jobs').update(patch).eq('id', job.id);
  if (error) throw new Error(`update pricing job outcome failed: ${error.message}`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const supabase = createBackendClient();
  logEbayBrowseBudgetConfig('pricing_job_runner_v1');

  log('daemon_start', {
    runnerAuthority: AUTHORITATIVE_PRICING_RUNNER,
    claimStrategy: AUTHORITATIVE_PRICING_CLAIM_STRATEGY,
    supportedPriorities: Object.keys(PRICING_QUEUE_PRIORITY_ORDER),
    broadQueueEnabled: isBroadPricingQueueEnabled(),
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
      demandDriven: isDemandDrivenPriority(job.priority),
      vaultDriven: isVaultPricingJob(job),
      nextEligibleAt: job.next_eligible_at ?? null,
      lastMeaningfulAttemptAt: job.last_meaningful_attempt_at ?? null,
      lastOutcome: job.last_outcome ?? null,
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
      await markJobOutcome(
        supabase,
        job,
        buildPricingJobOutcomePatch(job, {
          outcome: 'attempted_failure',
          errorClass: 'invalid_job',
          errorMessage: 'missing_card_print_id',
          keepPending: false,
        }),
      );
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
      const outcome = classifyPricingRunOutcome({ stage: 'budget_snapshot_retryable' });
      const patch = buildPricingJobOutcomePatch(job, {
        outcome,
        errorClass: 'transient_budget_snapshot',
        errorMessage: `retryable_budget_snapshot: ${err.message}`,
        keepPending: true,
      });
      await markJobOutcome(supabase, job, patch);
      log('job_retryable', {
        jobId: job.id,
        cardPrintId,
        error: err.message,
        stage: 'budget_before_job_start',
        outcome,
        nextEligibleAt: patch.next_eligible_at,
      });
      backoffMs = 1000;
      processed += 1;
      continue;
    }

    if (budgetSnapshot.exhausted) {
      const outcome = classifyPricingRunOutcome({ stage: 'budget_exhausted_before_start' });
      const patch = buildPricingJobOutcomePatch(job, {
        outcome,
        errorClass: 'budget_blocked',
        errorMessage: 'retryable_quota_exhausted: daily_browse_budget_exhausted_before_start',
        keepPending: true,
      });
      await markJobOutcome(supabase, job, patch);
      const pauseUntilMs = getNextUtcDayStartMs();
      budgetPauseUntilMs = pauseUntilMs;
      log('job_retryable_budget_exhausted_before_start', {
        jobId: job.id,
        cardPrintId,
        outcome,
        nextEligibleAt: patch.next_eligible_at,
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
        const outcome = classifyPricingRunOutcome({ exitCode });
        const patch = buildPricingJobOutcomePatch(job, {
          outcome,
          errorClass: null,
          errorMessage: null,
          keepPending: false,
        });
        await markJobOutcome(supabase, job, patch);
        const ms = Date.now() - started;
        log('job_ok', {
          jobId: job.id,
          cardPrintId,
          ms,
          outcome,
          nextEligibleAt: patch.next_eligible_at,
        });
      } else if (exitCode === 42) {
        const outcome = classifyPricingRunOutcome({ exitCode });
        const patch = buildPricingJobOutcomePatch(job, {
          outcome,
          errorClass: 'throttle_blocked',
          errorMessage: `throttle_blocked: rate_limited (exit=${exitCode})`,
          keepPending: true,
        });
        await markJobOutcome(supabase, job, patch);
        log('job_retryable', {
          jobId: job.id,
          cardPrintId,
          exitCode,
          outcome,
          nextEligibleAt: patch.next_eligible_at,
        });

        // Strong backoff to reduce repeated 429s.
        backoffMs = 60_000;
      } else if (exitCode === 43) {
        const outcome = classifyPricingRunOutcome({ exitCode });
        const patch = buildPricingJobOutcomePatch(job, {
          outcome,
          errorClass: 'budget_blocked',
          errorMessage: 'retryable_quota_exhausted: daily_browse_budget_exhausted',
          keepPending: true,
        });
        await markJobOutcome(supabase, job, patch);
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
          outcome,
          nextEligibleAt: patch.next_eligible_at,
          remainingCalls: budgetSnapshot.remaining_calls,
          consumedCalls: budgetSnapshot.consumed_calls,
          dailyBudget: budgetSnapshot.daily_budget,
          usageDate: budgetSnapshot.usage_date,
          waitMs: Math.max(0, pauseUntilMs - Date.now()),
        });
      } else {
        const outcome = classifyPricingRunOutcome({ exitCode });
        const patch = buildPricingJobOutcomePatch(job, {
          outcome,
          errorClass: 'worker_exit',
          errorMessage: `pricing worker exited with code ${exitCode}`,
          keepPending: false,
        });
        await markJobOutcome(supabase, job, patch);
        log('job_error', {
          jobId: job.id,
          cardPrintId,
          error: `exit_${exitCode}`,
          outcome,
          nextEligibleAt: patch.next_eligible_at,
        });
      }
    } catch (err) {
      const outcome = classifyPricingRunOutcome({ exitCode: 1 });
      const patch = buildPricingJobOutcomePatch(job, {
        outcome,
        errorClass: 'runner_exception',
        errorMessage: err.message,
        keepPending: false,
      });
      await markJobOutcome(supabase, job, patch);
      log('job_error', {
        jobId: job.id,
        cardPrintId,
        error: err.message,
        outcome,
        nextEligibleAt: patch.next_eligible_at,
      });
    }

    processed += 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
