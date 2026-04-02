import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';

const SOURCE = 'justtcg';
const KIND = 'card';
const STAGING_TABLE = 'external_discovery_candidates';
const CLASSIFIER_VERSION = 'JUSTTCG_CANON_GATE_V2';
const RAW_PAGE_SIZE = 500;
const LOOKUP_CHUNK_SIZE = 200;
const INSERT_CHUNK_SIZE = 200;

// Allow local verification without editing backend/.env.local.
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
    throw new Error(`[justtcg-stage] ${label} must be a non-negative integer.`);
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

function chunkArray(values, chunkSize) {
  const chunks = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

function buildCandidateKey(row) {
  return `${row.source}::${row.upstream_id}::${row.raw_import_id}`;
}

function toStageRow(row) {
  const { has_tk_marker, ...stageRow } = row;
  return stageRow;
}

function hasTkMarker(justtcgSetId, justtcgNameRaw) {
  const setId = justtcgSetId?.toLowerCase() ?? '';
  const rawName = justtcgNameRaw?.toLowerCase() ?? '';

  return (
    setId.includes('trainer-kit') ||
    setId.startsWith('tk-') ||
    setId.includes('-tk-') ||
    rawName.includes('trainer kit')
  );
}

function parseJustTcgNumber(numberRaw) {
  const trimmed = normalizeTextOrNull(numberRaw);
  const slashMatch = trimmed?.match(
    /^([0-9A-Za-z.\-]*[0-9][0-9A-Za-z.\-]*)\s*\/\s*([0-9A-Za-z.\-]*[0-9][0-9A-Za-z.\-]*)$/,
  );

  const hasSlashNumber = Boolean(slashMatch);
  const normalizedNumberLeft = hasSlashNumber
    ? normalizeTextOrNull(slashMatch[1])
    : trimmed && trimmed.toUpperCase() !== 'N/A'
      ? trimmed
      : null;
  const normalizedPrintedTotal = hasSlashNumber ? normalizeTextOrNull(slashMatch[2]) : null;
  const normalizedNumberPlain =
    normalizedNumberLeft && /^[0-9]+$/.test(normalizedNumberLeft) ? normalizedNumberLeft : null;
  const hasAlphaSuffixNumber = Boolean(
    normalizedNumberLeft &&
      /[0-9]/.test(normalizedNumberLeft) &&
      /[A-Za-z]/.test(normalizedNumberLeft),
  );

  return {
    normalizedNumberLeft,
    normalizedPrintedTotal,
    normalizedNumberPlain,
    hasSlashNumber,
    hasAlphaSuffixNumber,
  };
}

function parseJustTcgName(nameRaw, normalizedNumberLeft, normalizedPrintedTotal) {
  const trimmed = normalizeTextOrNull(nameRaw);
  if (!trimmed) {
    return {
      normalizedName: null,
      hasParentheticalModifier: false,
    };
  }

  const withModifierMatch = trimmed.match(
    /^\s*(.*?)\s*-\s*([0-9A-Za-z.\-]*[0-9][0-9A-Za-z.\-]*)\s*\/\s*([0-9A-Za-z.\-]*[0-9][0-9A-Za-z.\-]*)\s*\((.+)\)\s*$/,
  );
  if (
    withModifierMatch &&
    normalizeTextOrNull(withModifierMatch[2]) === normalizedNumberLeft &&
    normalizeTextOrNull(withModifierMatch[3]) === normalizedPrintedTotal
  ) {
    return {
      normalizedName: normalizeTextOrNull(withModifierMatch[1]),
      hasParentheticalModifier: true,
    };
  }

  const plainMatch = trimmed.match(
    /^\s*(.*?)\s*-\s*([0-9A-Za-z.\-]*[0-9][0-9A-Za-z.\-]*)\s*\/\s*([0-9A-Za-z.\-]*[0-9][0-9A-Za-z.\-]*)\s*$/,
  );
  if (
    plainMatch &&
    normalizeTextOrNull(plainMatch[2]) === normalizedNumberLeft &&
    normalizeTextOrNull(plainMatch[3]) === normalizedPrintedTotal
  ) {
    return {
      normalizedName: normalizeTextOrNull(plainMatch[1]),
      hasParentheticalModifier: false,
    };
  }

  return {
    normalizedName: trimmed,
    hasParentheticalModifier: false,
  };
}

function classifyCandidate(rawRow, matchedTcgplayerIds) {
  const payload = rawRow?.payload ?? {};
  const justtcgCardId = normalizeTextOrNull(payload?.id);
  const tcgplayerId = normalizeTextOrNull(payload?.tcgplayerId);
  const justtcgSetId = normalizeTextOrNull(payload?.set);
  const justtcgNameRaw = normalizeTextOrNull(payload?.name);
  const justtcgNumberRaw = normalizeTextOrNull(payload?.number);
  const tkMarker = hasTkMarker(justtcgSetId, justtcgNameRaw);

  const numberShape = parseJustTcgNumber(justtcgNumberRaw);
  const nameShape = parseJustTcgName(
    justtcgNameRaw,
    numberShape.normalizedNumberLeft,
    numberShape.normalizedPrintedTotal,
  );

  const matchStatus =
    tcgplayerId && matchedTcgplayerIds.has(tcgplayerId) ? 'MATCHED' : 'UNMATCHED';
  const hasValidRawNumber =
    justtcgNumberRaw !== null && justtcgNumberRaw.length > 0 && justtcgNumberRaw.toUpperCase() !== 'N/A';

  let candidateBucket = 'NON_CANDIDATE';
  if (
    matchStatus === 'UNMATCHED' &&
    justtcgCardId &&
    justtcgSetId &&
    justtcgNameRaw &&
    nameShape.normalizedName &&
    numberShape.normalizedNumberPlain !== null &&
    hasValidRawNumber &&
    numberShape.hasAlphaSuffixNumber === false
  ) {
    candidateBucket = tkMarker ? 'PRINTED_IDENTITY_REVIEW' : 'CLEAN_CANON_CANDIDATE';
  } else if (
    matchStatus === 'UNMATCHED' &&
    (
      numberShape.hasAlphaSuffixNumber ||
      nameShape.hasParentheticalModifier ||
      (numberShape.hasSlashNumber && numberShape.normalizedNumberPlain === null)
    )
  ) {
    candidateBucket = 'PRINTED_IDENTITY_REVIEW';
  }

  return {
    source: SOURCE,
    raw_import_id: rawRow.id,
    upstream_id: justtcgCardId,
    tcgplayer_id: tcgplayerId,
    set_id: justtcgSetId,
    name_raw: justtcgNameRaw,
    number_raw: justtcgNumberRaw,
    normalized_name: nameShape.normalizedName,
    normalized_number_left: numberShape.normalizedNumberLeft,
    normalized_number_plain: numberShape.normalizedNumberPlain,
    normalized_printed_total: numberShape.normalizedPrintedTotal,
    has_slash_number: numberShape.hasSlashNumber,
    has_alpha_suffix_number: numberShape.hasAlphaSuffixNumber,
    has_parenthetical_modifier: nameShape.hasParentheticalModifier,
    has_tk_marker: tkMarker,
    match_status: matchStatus,
    candidate_bucket: candidateBucket,
    classifier_version: CLASSIFIER_VERSION,
    payload,
  };
}

async function fetchRawImportBatch(supabase, options, rangeFrom) {
  const query = supabase
    .from('raw_imports')
    .select('id,payload,ingested_at')
    .eq('source', SOURCE)
    .filter('payload->>_kind', 'eq', KIND)
    .order('id', { ascending: true });

  const rangeStart = options.offset + rangeFrom;
  const rangeEnd = rangeStart + RAW_PAGE_SIZE - 1;
  const { data, error } = await query.range(rangeStart, rangeEnd);

  if (error) {
    throw error;
  }

  const sourceBatch = data ?? [];
  const filteredBatch = !options.setId
    ? sourceBatch
    : sourceBatch.filter((row) => normalizeTextOrNull(row?.payload?.set) === options.setId);

  return {
    sourceBatch,
    filteredBatch,
  };
}

async function fetchMatchedTcgplayerIds(supabase, tcgplayerIds) {
  const matched = new Set();
  const uniqueIds = [...new Set(tcgplayerIds.map((value) => normalizeTextOrNull(value)).filter(Boolean))];

  for (const chunk of chunkArray(uniqueIds, LOOKUP_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from('external_mappings')
      .select('external_id')
      .eq('source', 'tcgplayer')
      .eq('active', true)
      .in('external_id', chunk);

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      const externalId = normalizeTextOrNull(row.external_id);
      if (externalId) {
        matched.add(externalId);
      }
    }
  }

  return matched;
}

async function fetchExistingStageKeys(supabase, candidateRows) {
  const keys = new Set();
  const rawImportIds = [...new Set(candidateRows.map((row) => row.raw_import_id).filter(Number.isInteger))];

  for (const chunk of chunkArray(rawImportIds, LOOKUP_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from(STAGING_TABLE)
      .select('source,upstream_id,raw_import_id')
      .eq('source', SOURCE)
      .in('raw_import_id', chunk);

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      keys.add(
        buildCandidateKey({
          source: normalizeTextOrNull(row.source),
          upstream_id: normalizeTextOrNull(row.upstream_id),
          raw_import_id: row.raw_import_id,
        }),
      );
    }
  }

  return keys;
}

function printSummary(summary) {
  console.log(`[justtcg-stage] destination_table_name=${STAGING_TABLE}`);
  console.log(`[justtcg-stage] mode=${summary.mode}`);
  console.log(`[justtcg-stage] rows_scanned=${summary.rowsScanned}`);
  console.log(`[justtcg-stage] rows_unmatched=${summary.rowsUnmatched}`);
  console.log(`[justtcg-stage] rows_clean_candidates=${summary.rowsCleanCandidates}`);
  console.log(`[justtcg-stage] rows_identity_review=${summary.rowsIdentityReview}`);
  console.log(`[justtcg-stage] rows_non_candidate=${summary.rowsNonCandidate}`);
  console.log(`[justtcg-stage] rows_ready_for_write=${summary.rowsReadyForWrite}`);

  if (summary.mode === 'apply') {
    console.log(`[justtcg-stage] rows_written=${summary.rowsWritten}`);
    console.log(`[justtcg-stage] rows_skipped=${summary.rowsSkipped}`);
    console.log(`[justtcg-stage] rows_failed=${summary.rowsFailed}`);
  }
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const supabase = createBackendClient();

  if (!options.apply) {
    console.log('[justtcg-stage] Dry run. Use --apply to execute.');
  }

  const summary = {
    mode: options.apply ? 'apply' : 'dry-run',
    rowsScanned: 0,
    rowsUnmatched: 0,
    rowsCleanCandidates: 0,
    rowsIdentityReview: 0,
    rowsNonCandidate: 0,
    rowsReadyForWrite: 0,
    rowsWritten: 0,
    rowsSkipped: 0,
    rowsFailed: 0,
  };

  const verboseSamples = [];
  let processed = 0;
  let rangeFrom = 0;

  while (options.limit == null || processed < options.limit) {
    const { sourceBatch, filteredBatch } = await fetchRawImportBatch(supabase, options, rangeFrom);
    if (sourceBatch.length === 0) {
      break;
    }

    if (options.setId && sourceBatch.length > 0 && filteredBatch.length === 0) {
      console.log('[justtcg-stage] page had no matches for set-id, continuing scan');
    }

    const scopedBatch =
      options.limit == null
        ? filteredBatch
        : filteredBatch.slice(0, Math.max(options.limit - processed, 0));
    if (scopedBatch.length === 0) {
      rangeFrom += sourceBatch.length;
      continue;
    }

    const matchedTcgplayerIds = await fetchMatchedTcgplayerIds(
      supabase,
      scopedBatch.map((row) => row?.payload?.tcgplayerId),
    );
    const classifiedRows = scopedBatch.map((row) => classifyCandidate(row, matchedTcgplayerIds));
    const cleanCandidates = classifiedRows.filter(
      (row) => row.candidate_bucket === 'CLEAN_CANON_CANDIDATE',
    );
    const identityReviewRows = classifiedRows.filter(
      (row) => row.candidate_bucket === 'PRINTED_IDENTITY_REVIEW',
    );
    const nonCandidates = classifiedRows.filter(
      (row) => row.candidate_bucket === 'NON_CANDIDATE',
    );

    summary.rowsScanned += classifiedRows.length;
    summary.rowsUnmatched += classifiedRows.filter((row) => row.match_status === 'UNMATCHED').length;
    summary.rowsCleanCandidates += cleanCandidates.length;
    summary.rowsIdentityReview += identityReviewRows.length;
    summary.rowsNonCandidate += nonCandidates.length;

    const writeEligibleRows = [...cleanCandidates, ...identityReviewRows.filter((row) => row.has_tk_marker)];

    const existingKeys = writeEligibleRows.length > 0
      ? await fetchExistingStageKeys(supabase, writeEligibleRows)
      : new Set();
    const readyForWriteRows = writeEligibleRows.filter(
      (row) => !existingKeys.has(buildCandidateKey(row)),
    );

    summary.rowsReadyForWrite += readyForWriteRows.length;
    summary.rowsSkipped += writeEligibleRows.length - readyForWriteRows.length;

    if (options.verbose) {
      for (const row of writeEligibleRows) {
        if (verboseSamples.length >= 20) {
          break;
        }
        verboseSamples.push({
          raw_import_id: row.raw_import_id,
          justtcg_card_id: row.upstream_id,
          justtcg_set_id: row.set_id,
          candidate_bucket: row.candidate_bucket,
          normalized_name: row.normalized_name,
          normalized_number_plain: row.normalized_number_plain,
        });
      }
    }

    if (options.apply && readyForWriteRows.length > 0) {
      for (const chunk of chunkArray(readyForWriteRows, INSERT_CHUNK_SIZE)) {
        const { data, error } = await supabase
          .from(STAGING_TABLE)
          .upsert(chunk.map((row) => toStageRow(row)), {
            onConflict: 'source,upstream_id,raw_import_id',
            ignoreDuplicates: true,
          })
          .select('id');

        if (error) {
          summary.rowsFailed += chunk.length;
          console.error('[justtcg-stage] Failed staging batch:', error);
          continue;
        }

        const insertedCount = Array.isArray(data) ? data.length : 0;
        summary.rowsWritten += insertedCount;
        summary.rowsSkipped += chunk.length - insertedCount;
      }
    }

    processed += scopedBatch.length;
    rangeFrom += sourceBatch.length;

    if (options.limit != null && processed >= options.limit) {
      break;
    }
  }

  printSummary(summary);

  if (options.verbose && verboseSamples.length > 0) {
    for (const sample of verboseSamples) {
      console.log(`[justtcg-stage][sample] ${JSON.stringify(sample)}`);
    }
  }
}

run().catch((error) => {
  console.error('[justtcg-stage] Fatal error:', error);
  process.exit(1);
});
