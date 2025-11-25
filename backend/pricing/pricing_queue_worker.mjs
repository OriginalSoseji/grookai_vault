// pricing_queue_worker.mjs
// Usage:
//   node backend/pricing/pricing_queue_worker.mjs --limit 10 --dry-run
//   node backend/pricing/pricing_queue_worker.mjs --limit 10

// Load environment variables
import '../env.mjs';

import { pathToFileURL } from 'node:url';
import { createBackendClient } from '../supabase_backend_client.mjs';
import { updatePricingForCardPrint } from './ebay_browse_prices_worker.mjs';

const PRIORITY_ORDER = {
  user: 0,
  vault: 1,
  rarity_auto: 2,
  hot: 3,
  normal: 4,
};

function parseArgs(argv) {
  const result = {
    dryRun: false,
    limit: 10,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--limit') {
      const raw = argv[i + 1];
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        result.limit = Math.floor(parsed);
      }
      i += 1;
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    }
  }

  return result;
}

function printUsage() {
  console.log('Usage:');
  console.log('  node backend/pricing/pricing_queue_worker.mjs --limit <n> [--dry-run]');
}

function priorityScore(priority) {
  const normalized = (priority || 'normal').toLowerCase();
  return PRIORITY_ORDER.hasOwnProperty(normalized) ? PRIORITY_ORDER[normalized] : 99;
}

function sortJobs(jobs) {
  return jobs.sort((a, b) => {
    const priorityDiff = priorityScore(a.priority) - priorityScore(b.priority);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    const aRequested = a.requested_at ? new Date(a.requested_at).getTime() : 0;
    const bRequested = b.requested_at ? new Date(b.requested_at).getTime() : 0;
    return aRequested - bRequested;
  });
}

async function fetchPendingJobs(supabase, limit) {
  const effectiveLimit = Math.max(limit, 1);
  const fetchLimit = effectiveLimit * 3; // grab extra rows for local priority sorting

  const { data, error } = await supabase
    .from('pricing_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })
    .limit(fetchLimit);

  if (error) {
    throw new Error(`[pricing_queue] Failed to fetch jobs: ${error.message}`);
  }

  const sorted = sortJobs(data || []);
  return sorted.slice(0, effectiveLimit);
}

async function markJobRunning(supabase, job) {
  const { data, error } = await supabase
    .from('pricing_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      attempts: (job.attempts || 0) + 1,
    })
    .eq('id', job.id)
    .eq('status', 'pending')
    .select('id');

  if (error) {
    throw new Error(`[pricing_queue] Failed to mark job ${job.id} running: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.log(`[pricing_queue] job ${job.id} already claimed by another worker, skipping.`);
    return false;
  }

  return true;
}

async function markJobDone(supabase, jobId) {
  const { error } = await supabase
    .from('pricing_jobs')
    .update({
      status: 'done',
      completed_at: new Date().toISOString(),
      error: null,
    })
    .eq('id', jobId);

  if (error) {
    console.error(`[pricing_queue] Failed to mark job ${jobId} done:`, error);
  }
}

async function markJobFailed(supabase, jobId, message) {
  const truncated = (message || '').slice(0, 500);
  const { error } = await supabase
    .from('pricing_jobs')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error: truncated,
    })
    .eq('id', jobId);

  if (error) {
    console.error(`[pricing_queue] Failed to mark job ${jobId} failed:`, error);
  }
}

async function processJobs({ supabase, limit, dryRun }) {
  const jobs = await fetchPendingJobs(supabase, limit);
  if (jobs.length === 0) {
    console.log('[pricing_queue] No pending jobs found.');
    return 0;
  }

  for (const job of jobs) {
    if (dryRun) {
      console.log(
        `[pricing_queue] would process job=${job.id} card_print=${job.card_print_id} priority=${job.priority} reason=${job.reason || ''}`,
      );
      continue;
    }

    const claimed = await markJobRunning(supabase, job);
    if (!claimed) {
      continue;
    }

    try {
      await updatePricingForCardPrint({
        supabase,
        cardPrintId: job.card_print_id,
        dryRun: false,
      });
      await markJobDone(supabase, job.id);
    } catch (err) {
      console.error(`[pricing_queue] Job ${job.id} failed:`, err);
      await markJobFailed(supabase, job.id, err?.message || String(err));
    }
  }

  return jobs.length;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.limit || args.limit <= 0) {
    printUsage();
    process.exit(1);
  }

  try {
    const supabase = createBackendClient();
    const processedCount = await processJobs({
      supabase,
      limit: args.limit,
      dryRun: args.dryRun,
    });
    console.log(
      `[pricing_queue] processed ${processedCount} jobs (dryRun=${args.dryRun ? 'true' : 'false'})`,
    );
  } catch (err) {
    console.error('[pricing_queue] Worker failed:', err);
    process.exitCode = 1;
  }
}

const isMain = (() => {
  if (!process.argv[1]) {
    return false;
  }
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();

if (isMain) {
  main();
}
