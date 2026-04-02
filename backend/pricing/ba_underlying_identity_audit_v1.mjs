import '../env.mjs';

import { pathToFileURL } from 'node:url';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  BA_SET_CODES,
  BA_SET_CONFIG,
  SOURCE,
  TARGET_BUCKET,
  TARGET_MATCH_STATUS,
  analyzePreparedRow,
  buildNameTypeMap,
  prepareRowForAnalysis,
} from './ba_promote_v1.mjs';

const STAGING_TABLE = 'external_discovery_candidates';
const CARD_PRINTS_TABLE = 'card_prints';
const EXTERNAL_MAPPINGS_TABLE = 'external_mappings';
const PAGE_SIZE = 500;
const LOOKUP_CHUNK_SIZE = 200;

const CLASSIFICATIONS = [
  'MAPPED_UNDERLYING',
  'TCGPLAYER_BRIDGED_UNDERLYING',
  'STRUCTURED_SINGLE_MATCH',
  'STRUCTURED_MULTI_MATCH',
  'NO_UNDERLYING_MATCH',
  'EXCLUDED_FROM_AUDIT',
];

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function parseArgs(argv) {
  const options = {
    limit: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--limit' && argv[index + 1]) {
      const parsed = Number.parseInt(String(argv[index + 1]), 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        options.limit = parsed;
      }
      index += 1;
    } else if (token.startsWith('--limit=')) {
      const parsed = Number.parseInt(token.slice('--limit='.length), 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        options.limit = parsed;
      }
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

function addToIndex(index, key, cardPrint) {
  if (!index.has(key)) {
    index.set(key, []);
  }
  index.get(key).push(cardPrint);
}

function addUniqueRows(target, rows) {
  const deduped = new Map(target.map((row) => [row.id, row]));
  for (const row of rows) {
    deduped.set(row.id, row);
  }
  return [...deduped.values()];
}

function compareSetCodes(left, right) {
  const leftIndex = BA_SET_CODES.indexOf(left);
  const rightIndex = BA_SET_CODES.indexOf(right);

  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }

  return String(left ?? '').localeCompare(String(right ?? ''));
}

function compareParsedNumbers(left, right) {
  const leftInt = Number.parseInt(String(left), 10);
  const rightInt = Number.parseInt(String(right), 10);

  if (Number.isInteger(leftInt) && Number.isInteger(rightInt) && leftInt !== rightInt) {
    return leftInt - rightInt;
  }

  return String(left ?? '').localeCompare(String(right ?? ''));
}

function summarizeCounts(rows, field) {
  const summary = {};
  for (const row of rows) {
    const key = row[field];
    summary[key] = (summary[key] ?? 0) + 1;
  }
  return summary;
}

async function fetchAuditStagedRows(supabase, options) {
  const rows = [];
  let from = 0;

  while (options.limit == null || rows.length < options.limit) {
    const { data, error } = await supabase
      .from(STAGING_TABLE)
      .select(
        [
          'id',
          'source',
          'raw_import_id',
          'upstream_id',
          'tcgplayer_id',
          'set_id',
          'name_raw',
          'number_raw',
          'normalized_name',
          'normalized_number_left',
          'normalized_number_plain',
          'normalized_printed_total',
          'candidate_bucket',
          'match_status',
          'resolved_set_code',
          'card_print_id',
        ].join(','),
      )
      .eq('source', SOURCE)
      .in('set_id', Object.keys(BA_SET_CONFIG))
      .eq('candidate_bucket', TARGET_BUCKET)
      .eq('match_status', TARGET_MATCH_STATUS)
      .order('set_id', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const batch = (data ?? []).map((row) => ({
      id: row.id,
      source: normalizeTextOrNull(row.source),
      raw_import_id: row.raw_import_id,
      upstream_id: normalizeTextOrNull(row.upstream_id),
      tcgplayer_id: normalizeTextOrNull(row.tcgplayer_id),
      set_id: normalizeTextOrNull(row.set_id),
      name_raw: normalizeTextOrNull(row.name_raw),
      number_raw: normalizeTextOrNull(row.number_raw),
      normalized_name: normalizeTextOrNull(row.normalized_name),
      normalized_number_left: normalizeTextOrNull(row.normalized_number_left),
      normalized_number_plain: normalizeTextOrNull(row.normalized_number_plain),
      normalized_printed_total: normalizeTextOrNull(row.normalized_printed_total),
      candidate_bucket: normalizeTextOrNull(row.candidate_bucket),
      match_status: normalizeTextOrNull(row.match_status),
      resolved_set_code: normalizeTextOrNull(row.resolved_set_code),
      card_print_id: normalizeTextOrNull(row.card_print_id),
    }));

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

async function fetchAllCardPrints(supabase) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(CARD_PRINTS_TABLE)
      .select('id,gv_id,name,number,number_plain,set_code,printed_total')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const batch = (data ?? []).map((row) => ({
      id: row.id,
      gv_id: normalizeTextOrNull(row.gv_id),
      name: normalizeTextOrNull(row.name),
      number: normalizeTextOrNull(row.number),
      number_plain: normalizeTextOrNull(row.number_plain),
      set_code: normalizeTextOrNull(row.set_code),
      printed_total: row.printed_total ?? null,
    }));

    if (batch.length === 0) {
      break;
    }

    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchBridgeMap(supabase, source, externalIds) {
  const bridgeMap = new Map();
  const uniqueIds = [...new Set(externalIds.map((value) => normalizeTextOrNull(value)).filter(Boolean))];

  for (const chunk of chunkArray(uniqueIds, LOOKUP_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from(EXTERNAL_MAPPINGS_TABLE)
      .select('external_id,card_print_id')
      .eq('source', source)
      .eq('active', true)
      .in('external_id', chunk);

    if (error) throw error;

    for (const row of data ?? []) {
      const externalId = normalizeTextOrNull(row.external_id);
      const cardPrintId = normalizeTextOrNull(row.card_print_id);
      if (!externalId || !cardPrintId) {
        continue;
      }

      if (!bridgeMap.has(externalId)) {
        bridgeMap.set(externalId, []);
      }

      const bucket = bridgeMap.get(externalId);
      if (!bucket.includes(cardPrintId)) {
        bucket.push(cardPrintId);
      }
    }
  }

  return bridgeMap;
}

function buildAnySetKeys(cardPrint) {
  const keys = [];
  if (cardPrint.name && cardPrint.number_plain) {
    keys.push(`plain::${cardPrint.name}::${cardPrint.number_plain}`);
  }
  if (cardPrint.name && cardPrint.number) {
    keys.push(`left::${cardPrint.name}::${cardPrint.number}`);
  }
  return keys;
}

function buildIndexes(cardPrints) {
  const anySetIndex = new Map();
  const byId = new Map();

  for (const cardPrint of cardPrints) {
    byId.set(cardPrint.id, cardPrint);
    for (const key of buildAnySetKeys(cardPrint)) {
      addToIndex(anySetIndex, key, cardPrint);
    }
  }

  return { anySetIndex, byId };
}

function getStructuredMatches(row, anySetIndex) {
  let matches = [];
  if (!row.validated_name || !row.number) {
    return matches;
  }

  if (row.number_plain) {
    matches = addUniqueRows(
      matches,
      anySetIndex.get(`plain::${row.validated_name}::${row.number_plain}`) ?? [],
    );
  }

  matches = addUniqueRows(
    matches,
    anySetIndex.get(`left::${row.validated_name}::${row.number}`) ?? [],
  );

  const usablePrintedTotal = row.printed_total ?? null;
  if (usablePrintedTotal === null) {
    return matches;
  }

  const totalFiltered = matches.filter((match) => (match.printed_total ?? null) === usablePrintedTotal);
  return totalFiltered.length > 0 ? totalFiltered : matches;
}

function buildResolvedOutput(row, classification, evidenceLane, matchRows) {
  const uniqueMatchRows = addUniqueRows([], matchRows ?? []);
  const singleMatch = uniqueMatchRows.length === 1 ? uniqueMatchRows[0] : null;

  return {
    staging_candidate_id: row.id,
    set_id: row.set_id,
    ba_set_code: row.set_code,
    upstream_id: row.upstream_id,
    tcgplayer_id: row.tcgplayer_id ?? null,
    name_raw: row.name_raw,
    normalized_name: row.validated_name ?? row.normalized_name ?? null,
    number_raw: row.number_raw,
    parsed_number: row.number ?? null,
    parsed_printed_total: row.printed_total ?? null,
    classification,
    evidence_lane: evidenceLane,
    mapped_card_print_id: singleMatch?.id ?? null,
    candidate_card_print_ids: uniqueMatchRows.map((match) => match.id),
    candidate_set_codes: [...new Set(uniqueMatchRows.map((match) => match.set_code).filter(Boolean))],
  };
}

function classifyCandidateRow(row, justtcgBridgeMap, tcgplayerBridgeMap, indexes) {
  const { anySetIndex, byId } = indexes;

  const justtcgMatchIds = justtcgBridgeMap.get(row.upstream_id) ?? [];
  const justtcgMatches = justtcgMatchIds.map((id) => byId.get(id)).filter(Boolean);
  if (justtcgMatches.length === 1) {
    return buildResolvedOutput(row, 'MAPPED_UNDERLYING', 'JUSTTCG_ACTIVE_MAPPING', justtcgMatches);
  }
  if (justtcgMatches.length > 1) {
    return buildResolvedOutput(row, 'STRUCTURED_MULTI_MATCH', 'JUSTTCG_ACTIVE_MAPPING_MULTI', justtcgMatches);
  }

  const tcgplayerMatchIds = tcgplayerBridgeMap.get(row.tcgplayer_id) ?? [];
  const tcgplayerMatches = tcgplayerMatchIds.map((id) => byId.get(id)).filter(Boolean);
  if (tcgplayerMatches.length === 1) {
    return buildResolvedOutput(
      row,
      'TCGPLAYER_BRIDGED_UNDERLYING',
      'TCGPLAYER_ACTIVE_MAPPING',
      tcgplayerMatches,
    );
  }
  if (tcgplayerMatches.length > 1) {
    return buildResolvedOutput(
      row,
      'STRUCTURED_MULTI_MATCH',
      'TCGPLAYER_ACTIVE_MAPPING_MULTI',
      tcgplayerMatches,
    );
  }

  const structuredMatches = getStructuredMatches(row, anySetIndex);
  if (structuredMatches.length === 1) {
    return buildResolvedOutput(
      row,
      'STRUCTURED_SINGLE_MATCH',
      'STRUCTURED_ANY_SET_COMPARE',
      structuredMatches,
    );
  }
  if (structuredMatches.length > 1) {
    return buildResolvedOutput(
      row,
      'STRUCTURED_MULTI_MATCH',
      'STRUCTURED_ANY_SET_COMPARE',
      structuredMatches,
    );
  }

  return buildResolvedOutput(row, 'NO_UNDERLYING_MATCH', 'STRUCTURED_ANY_SET_COMPARE', []);
}

function classifyAuditRows(analyzedRows, justtcgBridgeMap, tcgplayerBridgeMap, indexes) {
  return analyzedRows.map((row) => {
    if (row.status !== 'candidate') {
      return {
        staging_candidate_id: row.id,
        set_id: row.set_id,
        ba_set_code: row.set_code ?? BA_SET_CONFIG[row.set_id]?.setCode ?? null,
        upstream_id: row.upstream_id,
        tcgplayer_id: row.tcgplayer_id ?? null,
        name_raw: row.name_raw,
        normalized_name: row.validated_name ?? row.normalized_name ?? null,
        number_raw: row.number_raw,
        parsed_number: row.number ?? null,
        parsed_printed_total: row.printed_total ?? null,
        classification: 'EXCLUDED_FROM_AUDIT',
        evidence_lane: row.reason ?? 'EXCLUDED',
        mapped_card_print_id: null,
        candidate_card_print_ids: [],
        candidate_set_codes: [],
      };
    }

    return classifyCandidateRow(row, justtcgBridgeMap, tcgplayerBridgeMap, indexes);
  });
}

function classifyConflictType(distinctNames, distinctPrintedTotals) {
  const hasNameConflict = distinctNames.length > 1;
  const hasPrintedTotalConflict = distinctPrintedTotals.length > 1;

  if (hasNameConflict && hasPrintedTotalConflict) {
    return 'IDENTITY_NAME_AND_TOTAL_CONFLICT';
  }
  if (hasNameConflict) {
    return 'IDENTITY_NAME_CONFLICT';
  }
  if (hasPrintedTotalConflict) {
    return 'IDENTITY_PRINTED_TOTAL_CONFLICT';
  }
  return null;
}

function buildConflictGroups(candidateRows, classifiedByStageId) {
  const grouped = new Map();

  for (const row of candidateRows) {
    const key = `${row.set_code}::${row.number}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(row);
  }

  const resolvedClasses = new Set([
    'MAPPED_UNDERLYING',
    'TCGPLAYER_BRIDGED_UNDERLYING',
    'STRUCTURED_SINGLE_MATCH',
  ]);

  const groups = [];
  for (const rows of grouped.values()) {
    const representative = rows[0];
    const distinctNormalizedNames = [...new Set(rows.map((row) => row.validated_name))];
    const distinctPrintedTotals = [
      ...new Set(rows.map((row) => row.printed_total).filter((value) => value !== null && value !== undefined)),
    ];
    const conflictType = classifyConflictType(distinctNormalizedNames, distinctPrintedTotals);
    if (!conflictType) {
      continue;
    }

    const classifiedRows = rows.map((row) => classifiedByStageId.get(row.id)).filter(Boolean);
    const resolvedCount = classifiedRows.filter((row) => resolvedClasses.has(row.classification)).length;

    let readiness = 'BLOCKED_UNDERLYING_IDENTITY';
    if (resolvedCount === classifiedRows.length && classifiedRows.length > 0) {
      readiness = 'READY_FOR_OVERLAY_MODEL';
    } else if (resolvedCount > 0) {
      readiness = 'PARTIALLY_READY';
    }

    groups.push({
      ba_set_code: representative.set_code,
      parsed_number: representative.number,
      conflict_type: conflictType,
      distinct_normalized_names: distinctNormalizedNames,
      distinct_printed_totals: distinctPrintedTotals,
      row_count: rows.length,
      readiness,
      classification_counts: summarizeCounts(classifiedRows, 'classification'),
      rows: classifiedRows.slice(0, 10),
    });
  }

  return groups.sort((left, right) => {
    return (
      compareSetCodes(left.ba_set_code, right.ba_set_code) ||
      compareParsedNumbers(left.parsed_number, right.parsed_number)
    );
  });
}

function buildOverallSummaryCounts(classifiedRows) {
  const counts = {
    mapped_underlying_count: 0,
    tcgplayer_bridged_underlying_count: 0,
    structured_single_match_count: 0,
    structured_multi_match_count: 0,
    no_underlying_match_count: 0,
    excluded_from_audit_count: 0,
  };

  for (const row of classifiedRows) {
    if (row.classification === 'MAPPED_UNDERLYING') {
      counts.mapped_underlying_count += 1;
    } else if (row.classification === 'TCGPLAYER_BRIDGED_UNDERLYING') {
      counts.tcgplayer_bridged_underlying_count += 1;
    } else if (row.classification === 'STRUCTURED_SINGLE_MATCH') {
      counts.structured_single_match_count += 1;
    } else if (row.classification === 'STRUCTURED_MULTI_MATCH') {
      counts.structured_multi_match_count += 1;
    } else if (row.classification === 'NO_UNDERLYING_MATCH') {
      counts.no_underlying_match_count += 1;
    } else if (row.classification === 'EXCLUDED_FROM_AUDIT') {
      counts.excluded_from_audit_count += 1;
    }
  }

  return counts;
}

function buildPerReleaseSummaryCounts(classifiedRows) {
  return BA_SET_CODES.map((baSetCode) => {
    const rows = classifiedRows.filter((row) => row.ba_set_code === baSetCode);
    return {
      ba_set_code: baSetCode,
      mapped_underlying_count: rows.filter((row) => row.classification === 'MAPPED_UNDERLYING').length,
      tcgplayer_bridged_underlying_count: rows.filter(
        (row) => row.classification === 'TCGPLAYER_BRIDGED_UNDERLYING',
      ).length,
      structured_single_match_count: rows.filter((row) => row.classification === 'STRUCTURED_SINGLE_MATCH')
        .length,
      structured_multi_match_count: rows.filter((row) => row.classification === 'STRUCTURED_MULTI_MATCH')
        .length,
      no_underlying_match_count: rows.filter((row) => row.classification === 'NO_UNDERLYING_MATCH').length,
      excluded_from_audit_count: rows.filter((row) => row.classification === 'EXCLUDED_FROM_AUDIT').length,
    };
  });
}

async function runUnderlyingIdentityAudit(supabase, options = {}) {
  const [stagedRows, cardPrints] = await Promise.all([
    fetchAuditStagedRows(supabase, options),
    fetchAllCardPrints(supabase),
  ]);

  const preparedRows = stagedRows.map((row) => prepareRowForAnalysis(row));
  const candidateNames = preparedRows
    .filter((row) => row.status === 'prepared')
    .flatMap((row) => row.name_candidates ?? []);
  const nameTypeMap = await buildNameTypeMap(supabase, candidateNames);
  const analyzedRows = preparedRows.map((row) => analyzePreparedRow(row, nameTypeMap));
  const candidateRows = analyzedRows.filter((row) => row.status === 'candidate');

  const [justtcgBridgeMap, tcgplayerBridgeMap] = await Promise.all([
    fetchBridgeMap(
      supabase,
      'justtcg',
      candidateRows.map((row) => row.upstream_id),
    ),
    fetchBridgeMap(
      supabase,
      'tcgplayer',
      candidateRows.map((row) => row.tcgplayer_id),
    ),
  ]);

  const indexes = buildIndexes(cardPrints);
  const classifiedRows = classifyAuditRows(analyzedRows, justtcgBridgeMap, tcgplayerBridgeMap, indexes);
  const classifiedByStageId = new Map(classifiedRows.map((row) => [row.staging_candidate_id, row]));
  const conflictGroups = buildConflictGroups(candidateRows, classifiedByStageId);

  return {
    stagedRows,
    preparedRows,
    analyzedRows,
    candidateRows,
    classifiedRows,
    classifiedByStageId,
    conflictGroups,
    overallSummaryCounts: buildOverallSummaryCounts(classifiedRows),
    perReleaseSummaryCounts: buildPerReleaseSummaryCounts(classifiedRows),
  };
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const supabase = createBackendClient();

  console.log('[ba-underlying-identity-audit-v1] mode=read-only');

  const audit = await runUnderlyingIdentityAudit(supabase, options);

  console.log(
    JSON.stringify(
      {
        overall_summary_counts: audit.overallSummaryCounts,
        per_release_summary_counts: audit.perReleaseSummaryCounts,
        conflict_readiness_report: audit.conflictGroups.map((group) => ({
          ba_set_code: group.ba_set_code,
          parsed_number: group.parsed_number,
          conflict_type: group.conflict_type,
          readiness: group.readiness,
          row_count: group.row_count,
          classification_counts: group.classification_counts,
        })),
        detailed_structured_multi_match_rows: audit.classifiedRows.filter(
          (row) => row.classification === 'STRUCTURED_MULTI_MATCH',
        ),
        detailed_no_underlying_match_rows: audit.classifiedRows.filter(
          (row) => row.classification === 'NO_UNDERLYING_MATCH',
        ),
        detailed_non_ready_conflict_groups: audit.conflictGroups.filter(
          (group) => group.readiness !== 'READY_FOR_OVERLAY_MODEL',
        ),
      },
      null,
      2,
    ),
  );
}

export {
  BA_SET_CODES,
  BA_SET_CONFIG,
  CLASSIFICATIONS,
  buildConflictGroups,
  buildIndexes,
  buildOverallSummaryCounts,
  buildPerReleaseSummaryCounts,
  classifyAuditRows,
  classifyCandidateRow,
  fetchAuditStagedRows,
  fetchAllCardPrints,
  fetchBridgeMap,
  getStructuredMatches,
  runUnderlyingIdentityAudit,
};

const entryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;

if (entryHref === import.meta.url) {
  run().catch((error) => {
    console.error('[ba-underlying-identity-audit-v1] Fatal error:', error);
    process.exit(1);
  });
}
