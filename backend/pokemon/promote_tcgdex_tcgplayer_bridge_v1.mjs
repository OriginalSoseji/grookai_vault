import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const TCGDEX_BRIDGE_REVIEW_POLICY = 'TCGDEX_TCGPLAYER_REVIEW_ONLY_V1';

const SOURCE = 'tcgdex';
const TARGET_SOURCE = 'tcgplayer';
const PAGE_SIZE = 200;
const PRODUCT_ID_PATHS = [
  { key: 'normal', path: 'pricing.tcgplayer.normal.productId' },
  { key: 'holofoil', path: 'pricing.tcgplayer.holofoil.productId' },
  { key: 'reverse-holofoil', path: 'pricing.tcgplayer.reverse-holofoil.productId' },
  { key: '1st-edition', path: 'pricing.tcgplayer.1st-edition.productId' },
  { key: '1st-edition-holofoil', path: 'pricing.tcgplayer.1st-edition-holofoil.productId' },
  { key: 'unlimited', path: 'pricing.tcgplayer.unlimited.productId' },
  { key: 'unlimited-holofoil', path: 'pricing.tcgplayer.unlimited-holofoil.productId' },
];

export function parseArgs(args = process.argv.slice(2)) {
  const options = {
    dryRun: true,
    limit: 50,
    output: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--dry-run') {
      continue;
    } else if (token === '--apply' || token.startsWith('--apply=')) {
      throw new Error('DIRECT_MAPPING_APPLY_RETIRED: price-bucket agreement is a review lead, not Master Index authority. Use the reviewed exact-mapping plan and bounded maintenance executor.');
    } else if (token === '--limit' || token.startsWith('--limit=')) {
      const value = Number(token === '--limit' ? args[++index] : token.slice(8));
      if (!Number.isSafeInteger(value) || value < 1 || value > 500) {
        throw new Error('limit must be an integer from 1 to 500');
      }
      options.limit = value;
    } else if (token === '--output' || token.startsWith('--output=')) {
      const value = token === '--output' ? args[++index] : token.slice(9);
      if (!value || value.startsWith('--')) throw new Error('output directory is required');
      options.output = path.resolve(value);
    } else {
      throw new Error(`Unknown bridge option: ${token}`);
    }
  }

  return options;
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter((value) => typeof value === 'string' && value.trim())));
}

export function collectProductIdDetails(cardPayload) {
  const tcgplayerPricing = cardPayload?.pricing?.tcgplayer;
  if (!tcgplayerPricing || typeof tcgplayerPricing !== 'object') {
    return {
      productIds: [],
      observedVariantPaths: [],
    };
  }

  const productIds = [];
  const observedVariantPaths = [];

  for (const entry of PRODUCT_ID_PATHS) {
    const value = tcgplayerPricing?.[entry.key]?.productId;
    if (value === undefined || value === null) {
      continue;
    }

    const normalized = String(value).trim();
    if (!/^[1-9]\d*$/.test(normalized) || !['string', 'number'].includes(typeof value)
        || (typeof value === 'number' && !Number.isSafeInteger(value))) {
      throw new Error('INVALID_PROVIDER_PRODUCT_ID');
    }

    productIds.push(normalized);
    observedVariantPaths.push(entry.path);
  }

  return {
    productIds,
    observedVariantPaths,
  };
}

export function evaluateProductIds(productIds) {
  if (productIds.length === 0) {
    return {
      result: 'FAIL',
      reason: 'No pricing.tcgplayer.*.productId fields were present in the full TCGdex card payload.',
      candidateProductId: null,
    };
  }

  const distinctProductIds = uniqueValues(productIds);
  if (distinctProductIds.length === 1) {
    return {
      result: 'REVIEW_REQUIRED',
      reason: 'Provider product IDs agree; independent source identity and reviewed Master Index evidence are still required.',
      candidateProductId: distinctProductIds[0],
    };
  }

  return {
    result: 'AMBIGUOUS',
    reason: `Multiple distinct TCGplayer productIds were present across variant buckets (${distinctProductIds.join(', ')}).`,
    candidateProductId: null,
  };
}

async function fetchTcgdexMappingPage(supabase, offset, pageSize) {
  const { data, error } = await supabase
    .from('external_mappings')
    .select('card_print_id,external_id,synced_at')
    .eq('source', SOURCE)
    .eq('active', true)
    .order('synced_at', { ascending: false })
    .order('card_print_id', { ascending: true })
    .order('external_id', { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (error) {
    throw new Error(`[tcgdex-tcgplayer-bridge] tcgdex mapping query failed: ${error.message}`);
  }

  return data ?? [];
}

async function fetchCardIdentities(supabase, cardPrintIds) {
  if (!Array.isArray(cardPrintIds) || cardPrintIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('card_prints')
    .select('id,name,gv_id,set_id,number_plain,variant_key')
    .in('id', cardPrintIds);

  if (error) {
    throw new Error(`[tcgdex-tcgplayer-bridge] card name query failed: ${error.message}`);
  }

  return new Map((data ?? []).map((row) => [row.id, row]));
}

async function loadScopedCards(supabase, limit) {
  const seenCardPrintIds = new Set();
  const scoped = [];
  let offset = 0;

  while (limit == null || scoped.length < limit) {
    const rows = await fetchTcgdexMappingPage(supabase, offset, PAGE_SIZE);
    if (rows.length === 0) {
      break;
    }

    offset += rows.length;

    const pageScoped = [];
    for (const row of rows) {
      const cardPrintId = row.card_print_id;
      const tcgdexExternalId = row.external_id;
      if (!cardPrintId || !tcgdexExternalId || seenCardPrintIds.has(cardPrintId)) {
        continue;
      }

      seenCardPrintIds.add(cardPrintId);
      pageScoped.push({ cardPrintId, tcgdexExternalId });

      if (limit != null && scoped.length + pageScoped.length >= limit) {
        break;
      }
    }

    const identityById = await fetchCardIdentities(
      supabase,
      pageScoped.map((row) => row.cardPrintId),
    );

    for (const row of pageScoped) {
      scoped.push({
        cardPrintId: row.cardPrintId,
        tcgdexExternalId: row.tcgdexExternalId,
        name: identityById.get(row.cardPrintId)?.name ?? '',
        targetIdentity: identityById.get(row.cardPrintId) ?? null,
      });

      if (limit != null && scoped.length >= limit) {
        break;
      }
    }

    if (rows.length < PAGE_SIZE) {
      break;
    }
  }

  return scoped;
}

async function loadActiveTcgplayerMappingsForCard(supabase, cardPrintId) {
  const { data, error } = await supabase
    .from('external_mappings')
    .select('card_print_id,external_id,active')
    .eq('source', TARGET_SOURCE)
    .eq('card_print_id', cardPrintId)
    .eq('active', true);

  if (error) {
    throw new Error(`[tcgdex-tcgplayer-bridge] existing card mapping query failed: ${error.message}`);
  }

  return data ?? [];
}

async function loadAnyTcgplayerMappingsByExternalId(supabase, externalId) {
  const { data, error } = await supabase
    .from('external_mappings')
    .select('card_print_id,external_id,active')
    .eq('source', TARGET_SOURCE)
    .eq('external_id', externalId);

  if (error) {
    throw new Error(`[tcgdex-tcgplayer-bridge] existing external id query failed: ${error.message}`);
  }

  return data ?? [];
}

function logResult(row) {
  console.log('\nROW:');
  console.log(`card_print_id: ${row.cardPrintId}`);
  console.log(`name: ${row.name}`);
  console.log(`tcgdex external id: ${row.tcgdexExternalId}`);
  console.log(`collected productIds: ${row.productIds.length > 0 ? JSON.stringify(row.productIds) : '[]'}`);
  console.log(`status: ${row.status}`);
  console.log(`reason: ${row.reason}`);
}

export async function runReadOnlyBridge({ supabase, tcgdexClient, limit = 50, onRow = async () => {}, onSelection = async () => {} }) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) throw new Error('Invalid bridge limit');
  const summary = {
    policy: TCGDEX_BRIDGE_REVIEW_POLICY,
    write_ready: false,
    database_writes: 0,
    catalog_completeness_verified: false,
    inspected: 0,
    review_required: 0,
    existing_mapping_requires_review: 0,
    no_product_id: 0,
    ambiguous: 0,
    conflicting_existing: 0,
    errors: 0,
  };
  const scopedCards = await loadScopedCards(supabase, limit);
  await onSelection(scopedCards);
  const rows = [];
  for (const card of scopedCards) {
    summary.inspected += 1;
    const row = {
      ...card, policy: TCGDEX_BRIDGE_REVIEW_POLICY, write_ready: false,
      observed_at: new Date().toISOString(), productIds: [], observedVariantPaths: [],
      candidateProductId: null, source_payload: null, source_payload_sha256: null,
      source_serialization: 'parsed_json_utf8_not_original_response_bytes',
      active_card_mappings: [], external_id_mappings: [],
    };
    let phase = 'source_fetch';
    try {
      const payload = await tcgdexClient.fetchTcgdexCardById(card.tcgdexExternalId);
      // Preserve the provider evidence even when identity or bucket validation fails.
      const serialized = JSON.stringify(payload);
      row.source_payload = JSON.parse(serialized);
      row.source_payload_sha256 = createHash('sha256').update(serialized).digest('hex');
      phase = 'source_validation';
      if (!payload || payload.id !== card.tcgdexExternalId) throw new Error('SOURCE_ID_MISMATCH');
      if (!card.targetIdentity) throw new Error('TARGET_IDENTITY_MISSING');
      Object.assign(row, collectProductIdDetails(payload));
      const evaluation = evaluateProductIds(row.productIds);
      row.candidateProductId = evaluation.candidateProductId;
      row.reason = evaluation.reason;
      if (evaluation.result === 'FAIL') {
        summary.no_product_id += 1;
        row.status = 'SKIP_NO_PRODUCT_ID';
      } else if (evaluation.result === 'AMBIGUOUS') {
        summary.ambiguous += 1;
        row.status = 'SKIP_AMBIGUOUS_PRODUCT_IDS';
      } else {
        phase = 'mapping_read';
        row.active_card_mappings = await loadActiveTcgplayerMappingsForCard(supabase, card.cardPrintId);
        row.external_id_mappings = await loadAnyTcgplayerMappingsByExternalId(supabase, row.candidateProductId);
        const existingIds = uniqueValues(row.active_card_mappings.map(mapping => String(mapping.external_id)));
        if (existingIds.some(id => id !== row.candidateProductId)
            || row.external_id_mappings.some(mapping => mapping.card_print_id !== card.cardPrintId)) {
          summary.conflicting_existing += 1;
          row.status = 'SKIP_CONFLICTING_EXISTING_TCGPLAYER_MAPPING';
          row.reason = 'Existing mapping ownership conflicts with this provider candidate; preserve both for adjudication.';
        } else if (existingIds.includes(row.candidateProductId)) {
          summary.existing_mapping_requires_review += 1;
          row.status = 'EXISTING_MAPPING_REQUIRES_REVIEW';
          row.reason = 'Existing mapping agrees with provider IDs, but that agreement does not verify canonical identity or finish.';
        } else {
          summary.review_required += 1;
          row.status = 'REVIEW_REQUIRED';
        }
      }
    } catch (error) {
      summary.errors += 1;
      row.status = 'SKIP_ERROR';
      row.error_phase = phase;
      row.reason = ['SOURCE_ID_MISMATCH', 'TARGET_IDENTITY_MISSING', 'INVALID_PROVIDER_PRODUCT_ID'].includes(error?.message)
        ? error.message : 'BRIDGE_READ_FAILED';
      row.http_status = Number.isInteger(error?.status) ? error.status : null;
    }
    // Artifact failure stops the run instead of becoming a silently skipped card.
    await onRow(row, rows.length);
    rows.push(row);
  }
  return { summary, rows };
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  const output = options.output ?? path.resolve('artifacts', 'tcgdex_mapping_review', randomUUID());
  await mkdir(path.dirname(output), { recursive: true });
  await mkdir(output); // Refuse an existing run directory, including partial runs.
  await writeFile(path.join(output, 'run_plan.json'), JSON.stringify({
    policy: TCGDEX_BRIDGE_REVIEW_POLICY, started_at: new Date().toISOString(),
    limit: options.limit, database_writes: false, write_ready: false,
    handoff: 'Source adjudication and reviewed Master Index required before a fresh exact-mapping plan. This report is not executable.',
  }, null, 2) + '\n', { flag: 'wx' });
  await import('../env.mjs');
  const { createBackendClient } = await import('../supabase_backend_client.mjs');
  const { createTcgdexClient } = await import('../clients/tcgdex.mjs');
  const { summary } = await runReadOnlyBridge({
    supabase: createBackendClient(), tcgdexClient: createTcgdexClient(), limit: options.limit,
    onSelection: async cards => {
      const sourceBase = new URL(process.env.TCGDEX_BASE_URL);
      sourceBase.username = '';
      sourceBase.password = '';
      sourceBase.search = '';
      sourceBase.hash = '';
      await writeFile(path.join(output, 'selection.json'), JSON.stringify({
        selected_at: new Date().toISOString(), source: 'tcgdex',
        source_base: sourceBase.href, source_language: process.env.TCGDEX_LANG || 'en',
        scope: 'bounded_active_mapping_sample_not_complete_catalog', cards,
      }, null, 2) + '\n', { flag: 'wx' });
    },
    onRow: async (row, index) => {
      await writeFile(path.join(output, `row-${String(index + 1).padStart(4, '0')}.json`),
        JSON.stringify(row, null, 2) + '\n', { flag: 'wx' });
      logResult(row);
    },
  });
  await writeFile(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ ...summary, output }, null, 2));
  if (summary.errors > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(`[tcgdex-tcgplayer-bridge] ${error.message}`);
    process.exitCode = 1;
  });
}
