import '../env.mjs';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createBackendClient } from '../supabase_backend_client.mjs';

const SOURCE = 'justtcg_discovery';
const KIND = 'justtcg_missing_pricing_candidate';
const SNAPSHOT_FETCH_CHUNK = 200;

function parseArgs(argv) {
  return {
    apply: argv.includes('--apply'),
    limit: readLimit(argv),
    cardPrintId: readTextFlag(argv, '--card-print-id'),
    externalId: readTextFlag(argv, '--external-id'),
    reportPath: readTextFlag(argv, '--report'),
  };
}

function readLimit(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--limit' && argv[index + 1]) {
      const value = Number.parseInt(argv[index + 1], 10);
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
      index += 1;
      continue;
    }

    if (token.startsWith('--limit=')) {
      const value = Number.parseInt(token.slice('--limit='.length), 10);
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }
  }

  return null;
}

function readTextFlag(argv, name) {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === name && argv[index + 1]) {
      return normalizeText(argv[index + 1]);
    }

    if (token.startsWith(`${name}=`)) {
      return normalizeText(token.slice(name.length + 1));
    }
  }

  return null;
}

function normalizeText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function chunkArray(values, chunkSize) {
  const chunks = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

async function countActiveJustTcgMappings(supabase) {
  const { count, error } = await supabase
    .from('external_mappings')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'justtcg')
    .eq('active', true);

  if (error) {
    throw error;
  }

  return typeof count === 'number' ? count : 0;
}

async function fetchScopedJustTcgMappings(supabase, options) {
  const rows = [];
  let from = 0;
  const pageSize = 1000;

  while (options.limit == null || rows.length < options.limit) {
    const to = from + pageSize - 1;
    let query = supabase
      .from('external_mappings')
      .select('card_print_id,external_id')
      .eq('source', 'justtcg')
      .eq('active', true)
      .order('card_print_id', { ascending: true })
      .order('external_id', { ascending: true });

    if (options.cardPrintId) {
      query = query.eq('card_print_id', options.cardPrintId);
    }

    if (options.externalId) {
      query = query.eq('external_id', options.externalId);
    }

    const { data, error } = await query.range(from, to);

    if (error) {
      throw error;
    }

    const batch = data ?? [];
    if (batch.length === 0) {
      break;
    }

    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return options.limit == null ? rows : rows.slice(0, options.limit);
}

async function fetchSnapshotCoverageByCardPrintId(supabase, cardPrintIds) {
  const covered = new Set();
  const pageSize = 1000;

  for (const chunk of chunkArray(cardPrintIds, SNAPSHOT_FETCH_CHUNK)) {
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from('justtcg_variant_price_snapshots')
        .select('card_print_id')
        .in('card_print_id', chunk)
        .order('card_print_id', { ascending: true })
        .order('fetched_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        throw error;
      }

      const batch = data ?? [];
      for (const row of batch) {
        const cardPrintId = normalizeText(row.card_print_id);
        if (cardPrintId) {
          covered.add(cardPrintId);
        }
      }

      if (batch.length < pageSize) {
        break;
      }

      from += pageSize;
    }
  }

  return covered;
}

async function upsertRawImportCandidate(supabase, candidate) {
  const externalId = candidate.justtcg_card_id;
  const payload = {
    _kind: KIND,
    _external_id: externalId,
    _source: SOURCE,
    discovered_at: new Date().toISOString(),
    reason: 'active_justtcg_mapping_without_price_snapshots',
    card_print_id: candidate.card_print_id,
    justtcg_card_id: candidate.justtcg_card_id,
  };

  const { data: existingRows, error: existingError } = await supabase
    .from('raw_imports')
    .select('id')
    .eq('source', SOURCE)
    .eq('payload->>_kind', KIND)
    .eq('payload->>_external_id', externalId)
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  if (existingRows && existingRows.length > 0) {
    const { error: updateError } = await supabase
      .from('raw_imports')
      .update({
        payload,
        status: 'pending',
        processed_at: null,
      })
      .eq('id', existingRows[0].id);

    if (updateError) {
      throw updateError;
    }

    return { created: false, id: existingRows[0].id };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('raw_imports')
    .insert({
      source: SOURCE,
      payload,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError) {
    throw insertError;
  }

  return { created: true, id: inserted?.id ?? null };
}

async function writeReport(reportPath, reportRows) {
  const normalizedPath = path.resolve(reportPath);
  await mkdir(path.dirname(normalizedPath), { recursive: true });
  const contents =
    reportRows.map((row) => JSON.stringify(row)).join('\n') + (reportRows.length > 0 ? '\n' : '');
  await writeFile(normalizedPath, contents, 'utf8');
  return normalizedPath;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const supabase = createBackendClient();
  const reportRows = [];
  const reportRowByKey = new Map();

  if (!options.apply) {
    console.log('[justtcg-discovery] Dry run. Use --apply to execute.');
  }

  console.log('[justtcg-discovery] Starting scan...');

  const totalMappingsRead = await countActiveJustTcgMappings(supabase);
  const mappings = await fetchScopedJustTcgMappings(supabase, options);
  const totalScopedMappings = mappings.length;

  if (mappings.length === 0) {
    console.log('[justtcg-discovery] No active justtcg mappings found.');
    console.log(`[justtcg-discovery] Summary: total_mappings_read=${totalMappingsRead} total_scoped_mappings=0 total_candidates_missing_pricing=0 total_queued=0`);
    if (options.reportPath) {
      const writtenPath = await writeReport(options.reportPath, reportRows);
      console.log(`[justtcg-discovery] Report written: ${writtenPath}`);
    }
    return;
  }

  console.log(`[justtcg-discovery] Found ${totalMappingsRead} mappings`);
  console.log(`[justtcg-discovery] Scoped mappings: ${totalScopedMappings}`);

  const cardPrintIds = [...new Set(mappings.map((row) => normalizeText(row.card_print_id)).filter(Boolean))];
  const coveredCardPrintIds = await fetchSnapshotCoverageByCardPrintId(supabase, cardPrintIds);

  const candidates = mappings
    .map((row) => ({
      card_print_id: normalizeText(row.card_print_id),
      justtcg_card_id: normalizeText(row.external_id),
    }))
    .filter((row) => row.card_print_id && row.justtcg_card_id)
    .filter((row) => {
      const hasSnapshots = coveredCardPrintIds.has(row.card_print_id);
      const reportRow = {
        card_print_id: row.card_print_id,
        justtcg_card_id: row.justtcg_card_id,
        has_snapshots: hasSnapshots,
        action: hasSnapshots ? 'skip_has_snapshots' : 'candidate_missing_pricing',
      };
      reportRows.push(reportRow);
      reportRowByKey.set(`${row.card_print_id}::${row.justtcg_card_id}`, reportRow);
      return !hasSnapshots;
    });

  console.log(`[justtcg-discovery] Missing pricing for ${candidates.length} cards`);

  if (!options.apply) {
    console.log('[justtcg-discovery] Candidates:', candidates.slice(0, 20));
    console.log(
      `[justtcg-discovery] Summary: total_mappings_read=${totalMappingsRead} total_scoped_mappings=${totalScopedMappings} total_candidates_missing_pricing=${candidates.length} total_queued=0`,
    );
    if (options.reportPath) {
      const writtenPath = await writeReport(options.reportPath, reportRows);
      console.log(`[justtcg-discovery] Report written: ${writtenPath}`);
    }
    return;
  }

  let created = 0;
  let updated = 0;

  for (const candidate of candidates) {
    const result = await upsertRawImportCandidate(supabase, candidate);
    const reportRow = reportRowByKey.get(`${candidate.card_print_id}::${candidate.justtcg_card_id}`);
    if (reportRow) {
      reportRow.action = 'queued_raw_import';
    }
    if (result.created) {
      created += 1;
    } else {
      updated += 1;
    }
  }

  const totalQueued = created + updated;
  console.log(
    `[justtcg-discovery] Inserted candidates into raw_imports. created=${created} updated=${updated}`,
  );
  console.log(
    `[justtcg-discovery] Summary: total_mappings_read=${totalMappingsRead} total_scoped_mappings=${totalScopedMappings} total_candidates_missing_pricing=${candidates.length} total_queued=${totalQueued}`,
  );
  if (options.reportPath) {
    const writtenPath = await writeReport(options.reportPath, reportRows);
    console.log(`[justtcg-discovery] Report written: ${writtenPath}`);
  }
}

run().catch((error) => {
  console.error('[justtcg-discovery] Fatal error:', error);
  process.exit(1);
});
