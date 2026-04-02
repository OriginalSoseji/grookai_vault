import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  BA_SET_CODES,
  analyzePreparedRow,
  buildNameTypeMap,
  fetchStagedRows,
  prepareRowForAnalysis,
} from './ba_promote_v1.mjs';

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

function buildConflictGroups(candidateRows) {
  const grouped = new Map();

  for (const row of candidateRows) {
    const key = `${row.set_code}::${row.number}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(row);
  }

  const conflictGroups = [];

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

    conflictGroups.push({
      ba_set_code: representative.set_code,
      parsed_number: representative.number,
      conflict_type: conflictType,
      distinct_normalized_names: distinctNormalizedNames,
      distinct_printed_totals: distinctPrintedTotals,
      row_count: rows.length,
      sample_rows: rows.slice(0, 10).map((row) => ({
        upstream_id: row.upstream_id,
        name_raw: row.name_raw,
        normalized_name: row.validated_name,
        number_raw: row.number_raw,
      })),
    });
  }

  return conflictGroups.sort((left, right) => {
    return (
      compareSetCodes(left.ba_set_code, right.ba_set_code) ||
      compareParsedNumbers(left.parsed_number, right.parsed_number)
    );
  });
}

function buildSummaryCounts(conflictGroups) {
  const summary = {
    identity_name_conflict_count: 0,
    identity_printed_total_conflict_count: 0,
    identity_name_and_total_conflict_count: 0,
    total_conflict_groups: conflictGroups.length,
  };

  for (const group of conflictGroups) {
    if (group.conflict_type === 'IDENTITY_NAME_CONFLICT') {
      summary.identity_name_conflict_count += 1;
    } else if (group.conflict_type === 'IDENTITY_PRINTED_TOTAL_CONFLICT') {
      summary.identity_printed_total_conflict_count += 1;
    } else if (group.conflict_type === 'IDENTITY_NAME_AND_TOTAL_CONFLICT') {
      summary.identity_name_and_total_conflict_count += 1;
    }
  }

  return summary;
}

function buildBreakdownBySet(conflictGroups) {
  return BA_SET_CODES.map((baSetCode) => {
    const groups = conflictGroups.filter((group) => group.ba_set_code === baSetCode);
    return {
      ba_set_code: baSetCode,
      conflict_group_count: groups.length,
      total_staged_rows_in_conflicts: groups.reduce((sum, group) => sum + group.row_count, 0),
    };
  });
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const supabase = createBackendClient();

  console.log('[ba-conflict-audit-v1] mode=read-only');

  const stagedRows = await fetchStagedRows(supabase, options);
  const preparedRows = stagedRows.map((row) => prepareRowForAnalysis(row));
  const candidateNames = preparedRows
    .filter((row) => row.status === 'prepared')
    .flatMap((row) => row.name_candidates ?? []);
  const nameTypeMap = await buildNameTypeMap(supabase, candidateNames);
  const analyzedRows = preparedRows.map((row) => analyzePreparedRow(row, nameTypeMap));
  const candidateRows = analyzedRows.filter((row) => row.status === 'candidate');
  const conflictGroups = buildConflictGroups(candidateRows);

  console.log(
    JSON.stringify(
      {
        summary_counts: buildSummaryCounts(conflictGroups),
        breakdown_by_ba_set: buildBreakdownBySet(conflictGroups),
        detailed_conflicts: conflictGroups,
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error('[ba-conflict-audit-v1] Fatal error:', error);
  process.exit(1);
});
