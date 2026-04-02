import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  buildTkManifestV1ForFamily,
  extractTkDeckSlot,
  resolveTkFamilyConfig,
  stripTkSlotSuffix,
} from './tk_manifest_v1.mjs';

const STAGING_TABLE = 'external_discovery_candidates';
const SOURCE = 'justtcg';
const TARGET_BUCKET = 'PRINTED_IDENTITY_REVIEW';
const TARGET_MATCH_STATUS = 'UNMATCHED';
const PAGE_SIZE = 200;

if (process.env.SUPABASE_URL_LOCAL) {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL_LOCAL;
}
if (process.env.SUPABASE_SECRET_KEY_LOCAL) {
  process.env.SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY_LOCAL;
}

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function parsePositiveInteger(value, label) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`[tk-resolve-stage] ${label} must be a non-negative integer.`);
  }
  return parsed;
}

function parseArgs(argv) {
  const options = {
    apply: false,
    setId: null,
    limit: null,
    offset: 0,
    verbose: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--apply') {
      options.apply = true;
    } else if (token === '--set-id' && argv[index + 1]) {
      options.setId = normalizeTextOrNull(argv[index + 1]);
      index += 1;
    } else if (token.startsWith('--set-id=')) {
      options.setId = normalizeTextOrNull(token.slice('--set-id='.length));
    } else if (token === '--limit' && argv[index + 1]) {
      const value = parsePositiveInteger(argv[index + 1], '--limit');
      options.limit = value > 0 ? value : null;
      index += 1;
    } else if (token.startsWith('--limit=')) {
      const value = parsePositiveInteger(token.slice('--limit='.length), '--limit');
      options.limit = value > 0 ? value : null;
    } else if (token === '--offset' && argv[index + 1]) {
      options.offset = parsePositiveInteger(argv[index + 1], '--offset');
      index += 1;
    } else if (token.startsWith('--offset=')) {
      options.offset = parsePositiveInteger(token.slice('--offset='.length), '--offset');
    } else if (token === '--verbose') {
      options.verbose = true;
    }
  }

  return options;
}

async function fetchStageRows(supabase, options) {
  const rows = [];
  let from = 0;

  while (options.limit == null || rows.length < options.limit) {
    let query = supabase
      .from(STAGING_TABLE)
      .select(
        'id,source,raw_import_id,upstream_id,tcgplayer_id,set_id,name_raw,number_raw,normalized_name,normalized_number_left,normalized_number_plain,normalized_printed_total,candidate_bucket,match_status,resolved_set_code,card_print_id',
      )
      .eq('source', SOURCE)
      .eq('candidate_bucket', TARGET_BUCKET)
      .eq('match_status', TARGET_MATCH_STATUS)
      .order('id', { ascending: true });

    if (options.setId) {
      query = query.eq('set_id', options.setId);
    }

    const rangeStart = options.offset + from;
    const rangeEnd = rangeStart + PAGE_SIZE - 1;
    const { data, error } = await query.range(rangeStart, rangeEnd);

    if (error) {
      throw error;
    }

    const batch = data ?? [];
    if (batch.length === 0) {
      break;
    }

    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return options.limit == null ? rows : rows.slice(0, options.limit);
}

function detectDeckFromExplicitMarker(nameRaw, manifest) {
  const normalized = normalizeTextOrNull(nameRaw);
  if (!normalized) {
    return [];
  }

  const matches = [];
  for (const [deckCode, deckManifest] of Object.entries(manifest.decks)) {
    const marker = deckManifest.marker;
    if (marker && normalized.toLowerCase().includes(`(${marker.toLowerCase()})`)) {
      matches.push(deckCode);
    }
  }

  return matches;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripExplicitDeckMarker(nameRaw, marker) {
  const normalized = normalizeTextOrNull(nameRaw);
  if (!normalized || !marker) {
    return normalized;
  }

  const stripped = normalized
    .replace(new RegExp(`\\s*\\(${escapeRegExp(marker)}\\)\\s*$`, 'i'), '')
    .trim();

  return stripped.length > 0 ? stripped : normalized;
}

function resolveRowAgainstManifest(stageRow, manifest) {
  const slot = extractTkDeckSlot(stageRow.number_raw);
  const baseName = stripTkSlotSuffix(stageRow.name_raw);
  if (!baseName) {
    return {
      ...stageRow,
      slot,
      resolved_set_code: null,
      card_print_id: null,
      next_match_status: 'UNMATCHED',
      resolution_reason: 'NO_BASE_NAME',
    };
  }

  const explicitDeckMatches = detectDeckFromExplicitMarker(stageRow.name_raw, manifest);
  if (explicitDeckMatches.length > 1) {
    return {
      ...stageRow,
      slot,
      resolved_set_code: null,
      card_print_id: null,
      next_match_status: 'AMBIGUOUS',
      resolution_reason: 'MULTIPLE_DECK_MARKERS',
    };
  }

  if (explicitDeckMatches.length === 1) {
    const deckCode = explicitDeckMatches[0];
    const occupant = manifest.decks[deckCode]?.slots?.[slot] ?? null;
    const comparisonName = stripExplicitDeckMarker(baseName, manifest.decks[deckCode]?.marker);

    if (!occupant) {
      return {
        ...stageRow,
        slot,
        resolved_set_code: null,
        card_print_id: null,
        next_match_status: 'UNMATCHED',
        resolution_reason: 'DECK_MARKER_SLOT_MISSING',
      };
    }

    if (occupant.name !== comparisonName) {
      return {
        ...stageRow,
        slot,
        resolved_set_code: null,
        card_print_id: null,
        next_match_status: 'UNMATCHED',
        resolution_reason: 'DECK_MARKER_NAME_MISMATCH',
      };
    }

    return {
      ...stageRow,
      slot,
      resolved_set_code: occupant.set_code,
      card_print_id: occupant.card_print_id,
      next_match_status: 'RESOLVED',
      resolution_reason: 'DECK_MARKER',
    };
  }

  const manifestMatches = [];
  for (const [deckCode, deckManifest] of Object.entries(manifest.decks)) {
    const occupant = deckManifest.slots?.[slot] ?? null;
    if (occupant && occupant.name === baseName) {
      manifestMatches.push({
        deckCode,
        occupant,
      });
    }
  }

  if (manifestMatches.length > 1) {
    return {
      ...stageRow,
      slot,
      resolved_set_code: null,
      card_print_id: null,
      next_match_status: 'AMBIGUOUS',
      resolution_reason: 'MULTIPLE_MANIFEST_MATCHES',
    };
  }

  if (manifestMatches.length === 0) {
    return {
      ...stageRow,
      slot,
      resolved_set_code: null,
      card_print_id: null,
      next_match_status: 'UNMATCHED',
      resolution_reason: 'NO_MANIFEST_MATCH',
    };
  }

  return {
    ...stageRow,
    slot,
    resolved_set_code: manifestMatches[0].occupant.set_code,
    card_print_id: manifestMatches[0].occupant.card_print_id,
    next_match_status: 'RESOLVED',
    resolution_reason: 'MANIFEST_SLOT_OCCUPANT',
  };
}

function printSummary(summary) {
  console.log(`[tk-resolve-stage] total_rows=${summary.totalRows}`);
  console.log(`[tk-resolve-stage] resolved_count=${summary.resolvedCount}`);
  console.log(`[tk-resolve-stage] ambiguous_count=${summary.ambiguousCount}`);
  console.log(`[tk-resolve-stage] failed_count=${summary.failedCount}`);
}

async function applyResolution(supabase, row) {
  const updatePayload =
    row.next_match_status === 'RESOLVED'
      ? {
          resolved_set_code: row.resolved_set_code,
          card_print_id: row.card_print_id,
          match_status: 'RESOLVED',
        }
      : {
          resolved_set_code: null,
          card_print_id: null,
          match_status: row.next_match_status,
        };

  const { error } = await supabase
    .from(STAGING_TABLE)
    .update(updatePayload)
    .eq('id', row.id);

  if (error) {
    throw error;
  }
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const supabase = createBackendClient();

  if (!options.apply) {
    console.log('[tk-resolve-stage] Dry run. Use --apply to execute.');
  }

  const stageRows = await fetchStageRows(supabase, options);
  const familyManifests = new Map();
  const resolvedRows = [];

  for (const row of stageRows) {
    resolveTkFamilyConfig(row.set_id);

    if (!familyManifests.has(row.set_id)) {
      familyManifests.set(row.set_id, await buildTkManifestV1ForFamily(supabase, row.set_id));
    }

    resolvedRows.push(resolveRowAgainstManifest(row, familyManifests.get(row.set_id)));
  }

  const summary = {
    totalRows: resolvedRows.length,
    resolvedCount: resolvedRows.filter((row) => row.next_match_status === 'RESOLVED').length,
    ambiguousCount: resolvedRows.filter((row) => row.next_match_status === 'AMBIGUOUS').length,
    failedCount: resolvedRows.filter((row) => row.next_match_status === 'UNMATCHED').length,
  };

  printSummary(summary);

  if (options.verbose) {
    for (const row of resolvedRows.slice(0, 20)) {
      console.log(
        `[tk-resolve-stage][sample] ${JSON.stringify({
          staging_id: row.id,
          upstream_id: row.upstream_id,
          set_id: row.set_id,
          number_raw: row.number_raw,
          slot: row.slot,
          resolved_set_code: row.resolved_set_code,
          card_print_id: row.card_print_id,
          next_match_status: row.next_match_status,
          resolution_reason: row.resolution_reason,
        })}`,
      );
    }
  }

  if (!options.apply) {
    return;
  }

  if (summary.ambiguousCount > 0) {
    throw new Error(
      `[tk-resolve-stage] STOP: ${summary.ambiguousCount} rows remain ambiguous. No staging rows were updated.`,
    );
  }

  for (const row of resolvedRows) {
    await applyResolution(supabase, row);
  }
}

run().catch((error) => {
  console.error('[tk-resolve-stage] Fatal error:', error);
  process.exit(1);
});
