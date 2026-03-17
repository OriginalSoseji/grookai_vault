import '../env.mjs';

import { pathToFileURL } from 'node:url';
import { createBackendClient } from '../supabase_backend_client.mjs';

const DEFAULT_LIMIT = 100;
const DEFAULT_RAW_POOL_SIZE = 500;
const FETCH_PAGE_SIZE = 1000;
// Supabase REST `.in(...)` filters can fail with oversized URL/query payloads.
// Keep batched card_print_id lookups conservative for VPS stability.
const CARD_ID_CHUNK_SIZE = 50;
const SLEEP_MS = 15 * 60 * 1000;
const COOLDOWN_MS = 2 * 60 * 60 * 1000;
const COARSE_STALE_FLOOR_MS = 6 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const HOT_LISTING_THRESHOLD = 10;
const NORMAL_LISTING_THRESHOLD = 25;
const HOT_VALUE_THRESHOLD = 100;
const NORMAL_VALUE_THRESHOLD = 25;
const HOT_VAULT_THRESHOLD = 10;
const NORMAL_VAULT_THRESHOLD = 3;

function parseArgs(argv) {
  let once = false;
  let limit = DEFAULT_LIMIT;
  let rawPoolSize = DEFAULT_RAW_POOL_SIZE;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--once') {
      once = true;
    } else if (arg === '--limit') {
      const next = Number.parseInt(argv[i + 1], 10);
      if (Number.isFinite(next) && next > 0) {
        limit = next;
      }
      i += 1;
    } else if (arg === '--raw-pool') {
      const next = Number.parseInt(argv[i + 1], 10);
      if (Number.isFinite(next) && next > 0) {
        rawPoolSize = next;
      }
      i += 1;
    }
  }

  return { once, limit, rawPoolSize };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray(items, chunkSize) {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function logChunkQuery(helperName, chunkIndex, totalChunks, ids) {
  console.log(
    `[pricing_scheduler_v1] helper=${helperName} chunk=${chunkIndex + 1}/${totalChunks} chunk_size=${ids.length} sample_ids=${ids.slice(0, 3).join(',') || 'none'}`,
  );
}

function parseTimestamp(value) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function determineFreshnessTier({ listingCount, activeInstanceCount, grookaiValueNm }) {
  if (
    (listingCount > 0 && listingCount <= HOT_LISTING_THRESHOLD) ||
    activeInstanceCount >= HOT_VAULT_THRESHOLD ||
    (grookaiValueNm !== null && grookaiValueNm >= HOT_VALUE_THRESHOLD)
  ) {
    return { tier: 'hot', ttlMs: 6 * HOUR_MS };
  }

  if (
    (listingCount > HOT_LISTING_THRESHOLD && listingCount <= NORMAL_LISTING_THRESHOLD) ||
    activeInstanceCount >= NORMAL_VAULT_THRESHOLD ||
    (grookaiValueNm !== null && grookaiValueNm >= NORMAL_VALUE_THRESHOLD)
  ) {
    return { tier: 'normal', ttlMs: 24 * HOUR_MS };
  }

  if (listingCount > NORMAL_LISTING_THRESHOLD || activeInstanceCount > 0 || grookaiValueNm !== null) {
    return { tier: 'long_tail', ttlMs: 72 * HOUR_MS };
  }

  return { tier: 'cold_catalog', ttlMs: 7 * DAY_MS };
}

async function fetchCoarseStaleCandidates(supabase, rawPoolSize) {
  const staleCutoffIso = new Date(Date.now() - COARSE_STALE_FLOOR_MS).toISOString();
  const { data, error } = await supabase
    .from('card_print_active_prices')
    .select('card_print_id,updated_at')
    .not('card_print_id', 'is', null)
    .or(`updated_at.is.null,updated_at.lt.${staleCutoffIso}`)
    .order('updated_at', { ascending: true, nullsFirst: true })
    .limit(rawPoolSize);

  if (error) {
    throw new Error(`coarse stale candidate query failed: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    cardPrintId: row.card_print_id,
    updatedAt: row.updated_at ?? null,
  }));
}

async function fetchGrookaiValueMap(supabase, cardPrintIds) {
  const out = new Map();
  const chunks = chunkArray(cardPrintIds, CARD_ID_CHUNK_SIZE);
  for (const [chunkIndex, ids] of chunks.entries()) {
    logChunkQuery('fetchGrookaiValueMap', chunkIndex, chunks.length, ids);

    let data;
    let error;
    try {
      ({ data, error } = await supabase
        .from('v_best_prices_all_gv_v1')
        .select('card_id,base_market,base_source,base_ts')
        .in('card_id', ids));
    } catch (err) {
      throw new Error(
        `fetchGrookaiValueMap chunk ${chunkIndex + 1}/${chunks.length} failed (chunk_size=${ids.length}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (error) {
      throw new Error(
        `fetchGrookaiValueMap chunk ${chunkIndex + 1}/${chunks.length} failed (chunk_size=${ids.length}): ${error.message}`,
      );
    }

    for (const row of data ?? []) {
      if (!row.card_id) {
        continue;
      }
      out.set(row.card_id, {
        baseMarket: typeof row.base_market === 'number' ? row.base_market : null,
        baseSource: typeof row.base_source === 'string' ? row.base_source : null,
        baseTs: row.base_ts ?? null,
      });
    }
  }
  return out;
}

async function fetchListingCountMap(supabase, cardPrintIds) {
  const out = new Map();
  const chunks = chunkArray(cardPrintIds, CARD_ID_CHUNK_SIZE);
  for (const [chunkIndex, ids] of chunks.entries()) {
    logChunkQuery('fetchListingCountMap', chunkIndex, chunks.length, ids);

    let data;
    let error;
    try {
      ({ data, error } = await supabase
        .from('ebay_active_prices_latest')
        .select('card_print_id,listing_count')
        .in('card_print_id', ids));
    } catch (err) {
      throw new Error(
        `fetchListingCountMap chunk ${chunkIndex + 1}/${chunks.length} failed (chunk_size=${ids.length}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (error) {
      throw new Error(
        `fetchListingCountMap chunk ${chunkIndex + 1}/${chunks.length} failed (chunk_size=${ids.length}): ${error.message}`,
      );
    }

    for (const row of data ?? []) {
      if (!row.card_print_id) {
        continue;
      }
      out.set(row.card_print_id, typeof row.listing_count === 'number' ? row.listing_count : 0);
    }
  }
  return out;
}

async function fetchActiveInstanceCountMap(supabase, cardPrintIds) {
  const out = new Map();
  const chunks = chunkArray(cardPrintIds, CARD_ID_CHUNK_SIZE);
  for (const [chunkIndex, ids] of chunks.entries()) {
    logChunkQuery('fetchActiveInstanceCountMap', chunkIndex, chunks.length, ids);

    let rawInstanceRows;
    let rawInstanceError;
    try {
      ({ data: rawInstanceRows, error: rawInstanceError } = await supabase
        .from('vault_item_instances')
        .select('card_print_id')
        .is('archived_at', null)
        .in('card_print_id', ids));
    } catch (err) {
      throw new Error(
        `fetchActiveInstanceCountMap raw chunk ${chunkIndex + 1}/${chunks.length} failed (chunk_size=${ids.length}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (rawInstanceError) {
      throw new Error(
        `fetchActiveInstanceCountMap raw chunk ${chunkIndex + 1}/${chunks.length} failed (chunk_size=${ids.length}): ${rawInstanceError.message}`,
      );
    }

    for (const row of rawInstanceRows ?? []) {
      if (!row.card_print_id) {
        continue;
      }
      out.set(row.card_print_id, (out.get(row.card_print_id) ?? 0) + 1);
    }

    let slabCertRows;
    let slabCertError;
    try {
      ({ data: slabCertRows, error: slabCertError } = await supabase
        .from('slab_certs')
        .select('id,card_print_id')
        .in('card_print_id', ids));
    } catch (err) {
      throw new Error(
        `fetchActiveInstanceCountMap slab-cert chunk ${chunkIndex + 1}/${chunks.length} failed (chunk_size=${ids.length}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (slabCertError) {
      throw new Error(
        `fetchActiveInstanceCountMap slab-cert chunk ${chunkIndex + 1}/${chunks.length} failed (chunk_size=${ids.length}): ${slabCertError.message}`,
      );
    }

    const slabCertIdToCardPrintId = new Map();
    for (const row of slabCertRows ?? []) {
      if (row.id && row.card_print_id) {
        slabCertIdToCardPrintId.set(row.id, row.card_print_id);
      }
    }

    const slabCertIds = Array.from(slabCertIdToCardPrintId.keys());
    if (slabCertIds.length === 0) {
      continue;
    }

    const slabChunks = chunkArray(slabCertIds, CARD_ID_CHUNK_SIZE);
    for (const [slabChunkIndex, slabIds] of slabChunks.entries()) {
      let slabInstanceRows;
      let slabInstanceError;
      try {
        ({ data: slabInstanceRows, error: slabInstanceError } = await supabase
          .from('vault_item_instances')
          .select('slab_cert_id')
          .is('archived_at', null)
          .in('slab_cert_id', slabIds));
      } catch (err) {
        throw new Error(
          `fetchActiveInstanceCountMap slab-instance chunk ${chunkIndex + 1}.${slabChunkIndex + 1} failed (chunk_size=${slabIds.length}): ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      if (slabInstanceError) {
        throw new Error(
          `fetchActiveInstanceCountMap slab-instance chunk ${chunkIndex + 1}.${slabChunkIndex + 1} failed (chunk_size=${slabIds.length}): ${slabInstanceError.message}`,
        );
      }

      for (const row of slabInstanceRows ?? []) {
        if (!row.slab_cert_id) {
          continue;
        }
        const cardPrintId = slabCertIdToCardPrintId.get(row.slab_cert_id);
        if (!cardPrintId) {
          continue;
        }
        out.set(cardPrintId, (out.get(cardPrintId) ?? 0) + 1);
      }
    }
  }

  return out;
}

function buildEligibleCandidates(activeRows, grookaiValueByCardId, listingCountByCardId, activeInstanceCountByCardId) {
  const now = Date.now();
  const eligible = [];

  for (const row of activeRows) {
    const cardPrintId = row.cardPrintId;
    const listingCount = listingCountByCardId.get(cardPrintId) ?? 0;
    const compatibilityPrice = grookaiValueByCardId.get(cardPrintId) ?? null;
    const grookaiValueNm = compatibilityPrice?.baseMarket ?? null;
    const activeInstanceCount = activeInstanceCountByCardId.get(cardPrintId) ?? 0;
    const updatedAtMs =
      parseTimestamp(compatibilityPrice?.baseTs ?? null) ??
      parseTimestamp(row.updatedAt);
    const freshness = determineFreshnessTier({
      listingCount,
      activeInstanceCount,
      grookaiValueNm,
    });
    const ageMs = updatedAtMs === null ? Number.POSITIVE_INFINITY : Math.max(0, now - updatedAtMs);

    if (ageMs <= freshness.ttlMs) {
      continue;
    }

    eligible.push({
      cardPrintId,
      activeInstanceCount,
      grookaiValueNm,
      listingCount,
      updatedAt: row.updatedAt,
      updatedAtMs,
      tier: freshness.tier,
      ttlMs: freshness.ttlMs,
    });
  }

  eligible.sort((a, b) => {
    if (a.activeInstanceCount !== b.activeInstanceCount) {
      return b.activeInstanceCount - a.activeInstanceCount;
    }

    const aValue = a.grookaiValueNm ?? Number.NEGATIVE_INFINITY;
    const bValue = b.grookaiValueNm ?? Number.NEGATIVE_INFINITY;
    if (aValue !== bValue) {
      return bValue - aValue;
    }

    if (a.listingCount !== b.listingCount) {
      return a.listingCount - b.listingCount;
    }

    const aUpdated = a.updatedAtMs ?? Number.NEGATIVE_INFINITY;
    const bUpdated = b.updatedAtMs ?? Number.NEGATIVE_INFINITY;
    if (aUpdated !== bUpdated) {
      return aUpdated - bUpdated;
    }

    return a.cardPrintId.localeCompare(b.cardPrintId);
  });

  return eligible;
}

async function fetchOpenJobSet(supabase, cardPrintIds) {
  const out = new Set();
  const chunks = chunkArray(cardPrintIds, CARD_ID_CHUNK_SIZE);
  for (const [chunkIndex, ids] of chunks.entries()) {
    logChunkQuery('fetchOpenJobSet', chunkIndex, chunks.length, ids);

    let data;
    let error;
    try {
      ({ data, error } = await supabase
        .from('pricing_jobs')
        .select('card_print_id')
        .in('status', ['pending', 'running'])
        .in('card_print_id', ids));
    } catch (err) {
      throw new Error(
        `fetchOpenJobSet chunk ${chunkIndex + 1}/${chunks.length} failed (chunk_size=${ids.length}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (error) {
      throw new Error(
        `fetchOpenJobSet chunk ${chunkIndex + 1}/${chunks.length} failed (chunk_size=${ids.length}): ${error.message}`,
      );
    }

    for (const row of data ?? []) {
      if (row.card_print_id) {
        out.add(row.card_print_id);
      }
    }
  }

  return out;
}

async function fetchLatestRequestMap(supabase, cardPrintIds) {
  const out = new Map();
  const chunks = chunkArray(cardPrintIds, CARD_ID_CHUNK_SIZE);
  for (const [chunkIndex, ids] of chunks.entries()) {
    logChunkQuery('fetchLatestRequestMap', chunkIndex, chunks.length, ids);

    let data;
    let error;
    try {
      ({ data, error } = await supabase
        .from('pricing_jobs')
        .select('card_print_id,requested_at')
        .in('card_print_id', ids)
        .order('requested_at', { ascending: false }));
    } catch (err) {
      throw new Error(
        `fetchLatestRequestMap chunk ${chunkIndex + 1}/${chunks.length} failed (chunk_size=${ids.length}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (error) {
      throw new Error(
        `fetchLatestRequestMap chunk ${chunkIndex + 1}/${chunks.length} failed (chunk_size=${ids.length}): ${error.message}`,
      );
    }

    for (const row of data ?? []) {
      if (!row.card_print_id || out.has(row.card_print_id)) {
        continue;
      }
      out.set(row.card_print_id, parseTimestamp(row.requested_at));
    }
  }
  return out;
}

async function enqueueScheduledJobs(supabase, eligibleCandidates, limit, openJobs, latestRequestedAtByCardId) {
  const now = Date.now();
  const queuedIds = [];
  let skippedOpenJob = 0;
  let skippedCooldown = 0;

  for (const candidate of eligibleCandidates) {
    if (queuedIds.length >= limit) {
      break;
    }

    if (openJobs.has(candidate.cardPrintId)) {
      skippedOpenJob += 1;
      continue;
    }

    const lastRequestedAtMs = latestRequestedAtByCardId.get(candidate.cardPrintId);
    if (lastRequestedAtMs !== undefined && lastRequestedAtMs !== null && now - lastRequestedAtMs < COOLDOWN_MS) {
      skippedCooldown += 1;
      continue;
    }

    const { error } = await supabase.from('pricing_jobs').insert({
      card_print_id: candidate.cardPrintId,
      priority: 'scheduled',
      reason: 'scheduled_refresh',
      status: 'pending',
      requested_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`scheduled insert failed for ${candidate.cardPrintId}: ${error.message}`);
    }

    queuedIds.push(candidate.cardPrintId);
  }

  return {
    queuedIds,
    skippedOpenJob,
    skippedCooldown,
  };
}

async function runSchedulerCycle({ supabase, limit, rawPoolSize }) {
  const coarseCandidates = await fetchCoarseStaleCandidates(supabase, rawPoolSize);
  const coarseCandidateIds = coarseCandidates
    .map((row) => row.cardPrintId)
    .filter(Boolean);
  const [grookaiValueByCardId, listingCountByCardId, activeInstanceCountByCardId, openJobs, latestRequestedAtByCardId] = await Promise.all([
    fetchGrookaiValueMap(supabase, coarseCandidateIds),
    fetchListingCountMap(supabase, coarseCandidateIds),
    fetchActiveInstanceCountMap(supabase, coarseCandidateIds),
    fetchOpenJobSet(supabase, coarseCandidateIds),
    fetchLatestRequestMap(supabase, coarseCandidateIds),
  ]);

  const eligibleCandidates = buildEligibleCandidates(
    coarseCandidates,
    grookaiValueByCardId,
    listingCountByCardId,
    activeInstanceCountByCardId,
  );
  const { queuedIds, skippedOpenJob, skippedCooldown } = await enqueueScheduledJobs(
    supabase,
    eligibleCandidates,
    limit,
    openJobs,
    latestRequestedAtByCardId,
  );

  const cycleTs = new Date().toISOString();
  console.log(`[pricing_scheduler_v1] cycle=${cycleTs} coarse_candidates=${coarseCandidates.length} enriched_candidates=${coarseCandidateIds.length} eligible_after_tiering=${eligibleCandidates.length} queued=${queuedIds.length} open_job_skip=${skippedOpenJob} cooldown_skip=${skippedCooldown}`);
  console.log(`[pricing_scheduler_v1] queued_first5=${queuedIds.slice(0, 5).join(',') || 'none'}`);

  return {
    cycleTs,
    coarseCandidates: coarseCandidates.length,
    enrichedCandidates: coarseCandidateIds.length,
    eligibleCount: eligibleCandidates.length,
    queuedCount: queuedIds.length,
    skippedOpenJob,
    skippedCooldown,
    queuedIds,
  };
}

async function main() {
  const { once, limit, rawPoolSize } = parseArgs(process.argv.slice(2));
  const supabase = createBackendClient();

  do {
    await runSchedulerCycle({ supabase, limit, rawPoolSize });
    if (!once) {
      await sleep(SLEEP_MS);
    }
  } while (!once);
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
    console.error('[pricing_scheduler_v1] failed:', err);
    process.exitCode = 1;
  });
}

export {
  buildEligibleCandidates,
  determineFreshnessTier,
  parseArgs,
  runSchedulerCycle,
};
