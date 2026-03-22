// Write mode only.
// Derives public.justtcg_variant_prices_latest from
// public.justtcg_variant_price_snapshots using:
//   fetched_at desc, created_at desc, id desc
// as the deterministic latest-row tie-break per variant_id.
//
// Usage:
//   node backend/pricing/justtcg_variant_prices_latest_builder_v1.mjs --apply

import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import { chunkArray } from './justtcg_client.mjs';

const SNAPSHOT_PAGE_SIZE = 1000;
const VARIANT_PAGE_SIZE = 1000;
const WRITE_CHUNK_SIZE = 500;

function parseArgs(argv) {
  const options = {
    apply: false,
  };

  for (const token of argv) {
    if (token === '--apply') {
      options.apply = true;
    }
  }

  return options;
}

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeNumericOrNull(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sortStable(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

async function fetchSnapshotCount(supabase) {
  const { count, error } = await supabase
    .from('justtcg_variant_price_snapshots')
    .select('id', { count: 'exact', head: true });

  if (error) {
    throw new Error(`[justtcg-latest-builder] snapshot count query failed: ${error.message}`);
  }

  return count ?? 0;
}

async function fetchSnapshotPage(supabase, from, to) {
  const { data, error } = await supabase
    .from('justtcg_variant_price_snapshots')
    .select('id,variant_id,card_print_id,price,avg_price,price_change_24h,price_change_7d,fetched_at,created_at')
    .order('variant_id', { ascending: true })
    .order('fetched_at', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`[justtcg-latest-builder] snapshot page query failed: ${error.message}`);
  }

  return data ?? [];
}

async function loadLatestSnapshotsByVariant(supabase) {
  const latestByVariant = new Map();
  let from = 0;
  let pageIndex = 0;

  while (true) {
    const rows = await fetchSnapshotPage(supabase, from, from + SNAPSHOT_PAGE_SIZE - 1);
    if (rows.length === 0) {
      break;
    }

    pageIndex += 1;

    for (const row of rows) {
      const variantId = normalizeTextOrNull(row.variant_id);
      if (!variantId) {
        throw new Error('[justtcg-latest-builder] encountered snapshot row without variant_id.');
      }

      if (!latestByVariant.has(variantId)) {
        latestByVariant.set(variantId, row);
      }
    }

    console.log(
      `SNAPSHOT_SCAN page=${pageIndex} rows=${rows.length} distinct_variants=${latestByVariant.size}`,
    );

    if (rows.length < SNAPSHOT_PAGE_SIZE) {
      break;
    }

    from += SNAPSHOT_PAGE_SIZE;
  }

  return latestByVariant;
}

async function fetchVariantMetadataPage(supabase, from, to) {
  const { data, error } = await supabase
    .from('justtcg_variants')
    .select('variant_id,card_print_id,condition,printing,language')
    .order('variant_id', { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(`[justtcg-latest-builder] variant metadata page query failed: ${error.message}`);
  }

  return data ?? [];
}

function buildLatestRow(snapshotRow, variantRow) {
  const variantId = normalizeTextOrNull(variantRow.variant_id);
  const condition = normalizeTextOrNull(variantRow.condition);
  const printing = normalizeTextOrNull(variantRow.printing);
  const language = normalizeTextOrNull(variantRow.language);
  const cardPrintId = variantRow.card_print_id;
  const snapshotCardPrintId = snapshotRow.card_print_id;
  const updatedAt = normalizeTextOrNull(snapshotRow.fetched_at);

  if (!variantId || !condition || !printing || !cardPrintId || !updatedAt) {
    throw new Error(
      `[justtcg-latest-builder] incomplete latest row inputs for variant_id ${variantRow.variant_id ?? 'unknown'}.`,
    );
  }

  if (cardPrintId !== snapshotCardPrintId) {
    throw new Error(
      `[justtcg-latest-builder] card_print_id mismatch between variant and snapshot for variant_id ${variantId}.`,
    );
  }

  return {
    variant_id: variantId,
    card_print_id: cardPrintId,
    condition,
    printing,
    language,
    price: normalizeNumericOrNull(snapshotRow.price),
    avg_price: normalizeNumericOrNull(snapshotRow.avg_price),
    price_change_24h: normalizeNumericOrNull(snapshotRow.price_change_24h),
    price_change_7d: normalizeNumericOrNull(snapshotRow.price_change_7d),
    updated_at: updatedAt,
  };
}

async function upsertLatestRows(supabase, latestRows) {
  if (latestRows.length === 0) {
    return 0;
  }

  let written = 0;

  for (const rows of chunkArray(latestRows, WRITE_CHUNK_SIZE)) {
    const { error } = await supabase
      .from('justtcg_variant_prices_latest')
      .upsert(rows, { onConflict: 'variant_id' });

    if (error) {
      throw new Error(`[justtcg-latest-builder] latest upsert failed: ${error.message}`);
    }

    written += rows.length;
  }

  return written;
}

async function buildAndWriteLatestRows(supabase, latestByVariant) {
  const expectedVariantIds = new Set(latestByVariant.keys());
  const matchedVariantIds = new Set();
  let from = 0;
  let pageIndex = 0;
  let written = 0;

  while (true) {
    const rows = await fetchVariantMetadataPage(supabase, from, from + VARIANT_PAGE_SIZE - 1);
    if (rows.length === 0) {
      break;
    }

    pageIndex += 1;
    const latestRows = [];
    let matchedInPage = 0;

    for (const variantRow of rows) {
      const variantId = normalizeTextOrNull(variantRow.variant_id);
      if (!variantId || !expectedVariantIds.has(variantId)) {
        continue;
      }

      const snapshotRow = latestByVariant.get(variantId);
      if (!snapshotRow) {
        throw new Error(`[justtcg-latest-builder] latest snapshot missing for variant_id ${variantId}.`);
      }

      latestRows.push(buildLatestRow(snapshotRow, variantRow));
      matchedVariantIds.add(variantId);
      matchedInPage += 1;
    }

    written += await upsertLatestRows(supabase, latestRows);

    console.log(
      `VARIANT_SCAN page=${pageIndex} rows=${rows.length} matched=${matchedInPage} latest_rows_written=${written}`,
    );

    if (rows.length < VARIANT_PAGE_SIZE) {
      break;
    }

    from += VARIANT_PAGE_SIZE;
  }

  if (matchedVariantIds.size !== expectedVariantIds.size) {
    const missingVariantIds = [];

    for (const variantId of expectedVariantIds) {
      if (!matchedVariantIds.has(variantId)) {
        missingVariantIds.push(variantId);
        if (missingVariantIds.length >= 20) {
          break;
        }
      }
    }

    throw new Error(
      `[justtcg-latest-builder] variant metadata missing for ${expectedVariantIds.size - matchedVariantIds.size} variant_ids. Sample: ${missingVariantIds.join(', ')}`,
    );
  }

  return written;
}

function printSummary(summary) {
  console.log('SUMMARY:');
  console.log(JSON.stringify(summary, null, 2));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.apply) {
    console.error('[justtcg-latest-builder] Refusing to run without explicit --apply.');
    process.exit(1);
  }

  const supabase = createBackendClient();
  const startedAt = new Date().toISOString();
  const summary = {
    source_snapshot_count: 0,
    distinct_variant_count: 0,
    latest_rows_written: 0,
    started_at: startedAt,
    finished_at: null,
  };

  console.log('RUN_CONFIG:');
  console.log('mode: apply');
  console.log('reads: justtcg_variant_price_snapshots + justtcg_variants');
  console.log('writes: justtcg_variant_prices_latest');
  console.log('strategy: deterministic upsert from snapshots');
  console.log(
    'tie_break: fetched_at desc, created_at desc, id desc',
  );

  try {
    summary.source_snapshot_count = await fetchSnapshotCount(supabase);

    const latestByVariant = await loadLatestSnapshotsByVariant(supabase);
    summary.distinct_variant_count = latestByVariant.size;
    summary.latest_rows_written = await buildAndWriteLatestRows(supabase, latestByVariant);
  } catch (error) {
    summary.finished_at = new Date().toISOString();
    printSummary(summary);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  summary.finished_at = new Date().toISOString();
  printSummary(summary);
}

main().catch((error) => {
  console.error('❌ Unhandled JustTCG latest builder failure:', error);
  process.exit(1);
});
