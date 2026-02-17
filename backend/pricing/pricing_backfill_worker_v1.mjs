// pricing_backfill_worker_v1.mjs
// Enqueue backfill pricing jobs for high-value, unpriced card prints.
// Usage:
//   node backend/pricing/pricing_backfill_worker_v1.mjs
//   node backend/pricing/pricing_backfill_worker_v1.mjs --limit 25

import '../env.mjs';

import { pathToFileURL } from 'node:url';
import { createBackendClient } from '../supabase_backend_client.mjs';

const DEFAULT_LIMIT = 25;
const FETCH_PAGE_SIZE = 1000;
const CARD_ID_CHUNK_SIZE = 400;

function parseArgs(argv) {
  let limit = DEFAULT_LIMIT;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--limit') {
      const next = Number.parseInt(argv[i + 1], 10);
      if (Number.isFinite(next) && next > 0) {
        limit = next;
      }
      i += 1;
    }
  }

  return { limit };
}

function chunkArray(items, chunkSize) {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

async function fetchEligibleCardPrints(supabase) {
  const out = [];
  let from = 0;

  while (true) {
    const to = from + FETCH_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('card_prints')
      .select(`
        id,
        name,
        lap:ebay_active_prices_latest!left(card_print_id)
      `)
      .not('rarity', 'is', null)
      .not('rarity', 'in', '(Common,Uncommon)')
      .is('lap.card_print_id', null)
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`eligible query failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const row of data) {
      out.push({
        id: row.id,
        name: row.name || '',
      });
    }

    if (data.length < FETCH_PAGE_SIZE) {
      break;
    }

    from += FETCH_PAGE_SIZE;
  }

  return out;
}

async function fetchVaultStatsAll(supabase) {
  const stats = new Map();
  let from = 0;

  while (true) {
    const to = from + FETCH_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('vault_items')
      .select('card_id,qty,created_at')
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`vault stats query failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const row of data) {
      const cardId = row.card_id;
      if (!cardId) {
        continue;
      }

      const qty = Number(row.qty) || 0;
      const createdMs = row.created_at ? Date.parse(row.created_at) : Number.NaN;
      const createdAtMs = Number.isFinite(createdMs) ? createdMs : null;

      const current = stats.get(cardId) || { qtySum: 0, latestCreatedAtMs: null };
      current.qtySum += qty;

      if (createdAtMs !== null) {
        if (current.latestCreatedAtMs === null || createdAtMs > current.latestCreatedAtMs) {
          current.latestCreatedAtMs = createdAtMs;
        }
      }

      stats.set(cardId, current);
    }

    if (data.length < FETCH_PAGE_SIZE) {
      break;
    }

    from += FETCH_PAGE_SIZE;
  }

  return stats;
}

function rankCandidates(candidates, vaultStatsByCardId) {
  const ranked = candidates.map((row) => {
    const stats = vaultStatsByCardId.get(row.id) || { qtySum: 0, latestCreatedAtMs: null };
    return {
      id: row.id,
      name: row.name || '',
      qtySum: stats.qtySum,
      latestCreatedAtMs: stats.latestCreatedAtMs,
    };
  });

  ranked.sort((a, b) => {
    if (a.qtySum !== b.qtySum) {
      return b.qtySum - a.qtySum;
    }

    const aTs = a.latestCreatedAtMs;
    const bTs = b.latestCreatedAtMs;
    if (aTs === null && bTs !== null) return 1;
    if (aTs !== null && bTs === null) return -1;
    if (aTs !== null && bTs !== null && aTs !== bTs) {
      return bTs - aTs;
    }

    const nameCmp = a.name.localeCompare(b.name);
    if (nameCmp !== 0) {
      return nameCmp;
    }

    return a.id.localeCompare(b.id);
  });

  return ranked;
}

async function fetchExistingOpenJobsForIds(supabase, cardPrintIds) {
  const open = new Set();
  if (cardPrintIds.length === 0) {
    return open;
  }

  const chunks = chunkArray(cardPrintIds, CARD_ID_CHUNK_SIZE);
  for (const ids of chunks) {
    const { data, error } = await supabase
      .from('pricing_jobs')
      .select('card_print_id')
      .in('status', ['pending', 'running'])
      .in('card_print_id', ids);

    if (error) {
      throw new Error(`open-job dedupe query failed: ${error.message}`);
    }

    if (!data) {
      continue;
    }

    for (const row of data) {
      if (row.card_print_id) {
        open.add(row.card_print_id);
      }
    }
  }

  return open;
}

async function enqueueBackfillJobs(supabase, rankedCandidates, limit) {
  const topIds = rankedCandidates.slice(0, limit).map((c) => c.id);
  const existingOpen = await fetchExistingOpenJobsForIds(supabase, topIds);
  const insertedIds = [];
  const runSeen = new Set();

  for (const candidate of rankedCandidates) {
    if (insertedIds.length >= limit) {
      break;
    }

    const cardPrintId = candidate.id;
    if (!cardPrintId || runSeen.has(cardPrintId) || existingOpen.has(cardPrintId)) {
      continue;
    }

    const payload = {
      card_print_id: cardPrintId,
      priority: 'backfill',
      reason: 'backfill_v1',
      status: 'pending',
    };

    const { error } = await supabase.from('pricing_jobs').insert(payload);
    if (error) {
      throw new Error(`insert failed for ${cardPrintId}: ${error.message}`);
    }

    runSeen.add(cardPrintId);
    insertedIds.push(cardPrintId);
  }

  return insertedIds;
}

async function main() {
  const { limit } = parseArgs(process.argv.slice(2));
  const supabase = createBackendClient();

  const eligible = await fetchEligibleCardPrints(supabase);
  const vaultStatsByCardId = await fetchVaultStatsAll(supabase);
  const ranked = rankCandidates(eligible, vaultStatsByCardId);
  const insertedIds = await enqueueBackfillJobs(supabase, ranked, limit);

  console.log(`[pricing-backfill-v1] candidates_found=${ranked.length} limit=${limit}`);
  console.log(`[pricing-backfill-v1] inserted=${insertedIds.length}`);
  console.log(
    `[pricing-backfill-v1] inserted_first5=${insertedIds.slice(0, 5).join(',') || 'none'}`,
  );
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
  main().catch((err) => {
    console.error('[pricing-backfill-v1] failed:', err);
    process.exitCode = 1;
  });
}
