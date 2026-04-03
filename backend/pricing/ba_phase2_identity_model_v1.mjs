import '../env.mjs';

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { createBackendClient } from '../supabase_backend_client.mjs';
import { BA_SET_CODES, runUnderlyingIdentityAudit } from './ba_underlying_identity_audit_v1.mjs';

const EXPECTED_BASELINE = {
  mapped_underlying_count: 184,
  conflict_group_count: 9,
  structured_multi_match_count: 6,
  no_underlying_match_count: 138,
};

const DETERMINISTIC_UNDERLYING_CLASSES = new Set([
  'MAPPED_UNDERLYING',
  'TCGPLAYER_BRIDGED_UNDERLYING',
  'STRUCTURED_SINGLE_MATCH',
]);

const OUTPUT_FILENAMES = {
  baseline: 'ba_phase2_identity_model_baseline.json',
  input: 'ba_phase2_identity_model_input.json',
  pass1: 'ba_phase2_identity_model_pass1.json',
  conflictResolution: 'ba_phase2_conflict_resolution_v1.json',
  structuredMulti: 'ba_phase2_structured_multi_resolution_v1.json',
  noUnderlying: 'ba_phase2_no_underlying_reclassification_v1.json',
};

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

function comparePrintedNumbers(left, right) {
  const leftInt = Number.parseInt(String(left), 10);
  const rightInt = Number.parseInt(String(right), 10);

  if (Number.isInteger(leftInt) && Number.isInteger(rightInt) && leftInt !== rightInt) {
    return leftInt - rightInt;
  }

  return String(left ?? '').localeCompare(String(right ?? ''));
}

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizePrintedNameForModel(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  return normalized.replace(/\s+/g, ' ').toLowerCase();
}

function ensureCandidateGradeRows(classifiedRows) {
  return classifiedRows.filter((row) => row.classification !== 'EXCLUDED_FROM_AUDIT');
}

function buildModelInputRows(classifiedRows) {
  return ensureCandidateGradeRows(classifiedRows).map((row) => {
    const rawPrintedName = normalizeTextOrNull(row.normalized_name);
    const normalizedPrintedName = normalizePrintedNameForModel(rawPrintedName);

    if (!row.ba_set_code || !row.parsed_number || !rawPrintedName || !normalizedPrintedName) {
      throw new Error(
        `[ba-phase2-identity-model-v1] STOP: candidate-grade row lacks phase-local model inputs: staging_candidate_id=${row.staging_candidate_id}.`,
      );
    }

    return {
      ba_row_id: row.staging_candidate_id,
      ba_set_code: row.ba_set_code,
      printed_number: row.parsed_number,
      raw_printed_name: rawPrintedName,
      normalized_printed_name: normalizedPrintedName,
      underlying_candidate_count: row.candidate_card_print_ids.length,
      underlying_candidate_ids: row.candidate_card_print_ids,
      prior_classification: row.classification,
      upstream_id: row.upstream_id,
      name_raw: row.name_raw,
      number_raw: row.number_raw,
      parsed_printed_total: row.parsed_printed_total,
    };
  });
}

function buildPriorConflictIndex(conflictGroups) {
  return new Map(
    conflictGroups.map((group) => [
      `${group.ba_set_code}::${group.parsed_number}`,
      {
        ba_set_code: group.ba_set_code,
        parsed_number: group.parsed_number,
        conflict_type: group.conflict_type,
        distinct_normalized_names: group.distinct_normalized_names,
        distinct_printed_totals: group.distinct_printed_totals,
        row_count: group.row_count,
      },
    ]),
  );
}

function buildCanonicalModelKey(row) {
  return `${row.ba_set_code}::${row.printed_number}::${row.normalized_printed_name}`;
}

function buildRowUnderlylingReferenceClassification(row) {
  return DETERMINISTIC_UNDERLYING_CLASSES.has(row.prior_classification)
    ? 'BA_UNDERLYING_REFERENCE_PROVEN'
    : 'BA_UNDERLYING_UNKNOWN';
}

function groupRowsByModelKey(modelInputRows) {
  const grouped = new Map();

  for (const row of modelInputRows) {
    const key = buildCanonicalModelKey(row);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(row);
  }

  return grouped;
}

function sortGroups(groups) {
  return groups.sort((left, right) => {
    return (
      compareSetCodes(left.ba_set_code, right.ba_set_code) ||
      comparePrintedNumbers(left.printed_number, right.printed_number) ||
      String(left.normalized_printed_name ?? '').localeCompare(String(right.normalized_printed_name ?? ''))
    );
  });
}

function sortRows(rows) {
  return rows.sort((left, right) => {
    return (
      compareSetCodes(left.ba_set_code, right.ba_set_code) ||
      comparePrintedNumbers(left.printed_number, right.printed_number) ||
      String(left.normalized_printed_name ?? '').localeCompare(String(right.normalized_printed_name ?? '')) ||
      String(left.upstream_id ?? '').localeCompare(String(right.upstream_id ?? '')) ||
      String(left.ba_row_id ?? '').localeCompare(String(right.ba_row_id ?? ''))
    );
  });
}

function buildModelGroups(modelInputRows, priorConflictIndex) {
  const grouped = groupRowsByModelKey(modelInputRows);
  const modelGroups = [];

  for (const [key, rows] of grouped.entries()) {
    const representative = rows[0];
    const priorConflict = priorConflictIndex.get(`${representative.ba_set_code}::${representative.printed_number}`) ?? null;

    const materializedRows = rows.map((row) => ({
      ...row,
      underlying_reference_classification: buildRowUnderlylingReferenceClassification(row),
    }));

    modelGroups.push({
      canonical_model_key: key,
      ba_set_code: representative.ba_set_code,
      printed_number: representative.printed_number,
      normalized_printed_name: representative.normalized_printed_name,
      raw_printed_name: representative.raw_printed_name,
      model_group_classification: rows.length === 1 ? 'BA_MODEL_SINGLE' : 'BA_MODEL_DUPLICATE',
      number_collision_classification:
        priorConflict && priorConflict.distinct_normalized_names.length > 1
          ? 'BA_NUMBER_COLLISION_RESOLVED'
          : null,
      prior_conflict_group: priorConflict,
      row_count: rows.length,
      rows: sortRows(materializedRows),
    });
  }

  return sortGroups(modelGroups);
}

function buildPass1Summary(modelInputRows, modelGroups, excludedCount) {
  return {
    candidate_grade_row_count: modelInputRows.length,
    excluded_from_audit_count: excludedCount,
    distinct_canonical_model_key_count: modelGroups.length,
    ba_model_single_group_count: modelGroups.filter((group) => group.model_group_classification === 'BA_MODEL_SINGLE')
      .length,
    ba_model_duplicate_group_count: modelGroups.filter(
      (group) => group.model_group_classification === 'BA_MODEL_DUPLICATE',
    ).length,
    ba_number_collision_resolved_group_count: modelGroups.filter(
      (group) => group.number_collision_classification === 'BA_NUMBER_COLLISION_RESOLVED',
    ).length,
    ba_underlying_reference_proven_row_count: modelInputRows.filter(
      (row) => buildRowUnderlylingReferenceClassification(row) === 'BA_UNDERLYING_REFERENCE_PROVEN',
    ).length,
    ba_underlying_unknown_row_count: modelInputRows.filter(
      (row) => buildRowUnderlylingReferenceClassification(row) === 'BA_UNDERLYING_UNKNOWN',
    ).length,
    duplicate_surface_row_count: modelGroups
      .filter((group) => group.model_group_classification === 'BA_MODEL_DUPLICATE')
      .reduce((sum, group) => sum + group.row_count, 0),
  };
}

function buildConflictResolution(conflictGroups, modelGroupsByKey, modelInputByRowId) {
  const output = [];

  for (const conflictGroup of conflictGroups) {
    const relevantRows = conflictGroup.rows
      .map((row) => modelInputByRowId.get(row.staging_candidate_id))
      .filter(Boolean);
    const modelKeys = [...new Set(relevantRows.map((row) => buildCanonicalModelKey(row)))];
    const projectedGroups = sortGroups(
      modelKeys.map((key) => modelGroupsByKey.get(key)).filter(Boolean),
    );

    const namesDiffer = conflictGroup.distinct_normalized_names.length > 1;

    output.push({
      ba_set_code: conflictGroup.ba_set_code,
      printed_number: conflictGroup.parsed_number,
      prior_conflict_type: conflictGroup.conflict_type,
      row_count: conflictGroup.row_count,
      outcome: namesDiffer ? 'BA_NUMBER_COLLISION_RESOLVED' : 'BA_MODEL_DUPLICATE',
      projected_model_groups: projectedGroups.map((group) => ({
        canonical_model_key: group.canonical_model_key,
        model_group_classification: group.model_group_classification,
        row_count: group.row_count,
        normalized_printed_name: group.normalized_printed_name,
        raw_printed_name: group.raw_printed_name,
        rows: group.rows.map((row) => ({
          ba_row_id: row.ba_row_id,
          upstream_id: row.upstream_id,
          prior_classification: row.prior_classification,
          underlying_reference_classification: row.underlying_reference_classification,
          parsed_printed_total: row.parsed_printed_total,
        })),
      })),
    });
  }

  return sortGroups(output);
}

function buildSubsetResolution(modelGroups, allowedPriorClasses, sourceLabel) {
  const allowed = new Set(allowedPriorClasses);
  const groups = modelGroups
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row) => allowed.has(row.prior_classification)),
    }))
    .filter((group) => group.rows.length > 0)
    .map((group) => ({
      source_label: sourceLabel,
      canonical_model_key: group.canonical_model_key,
      ba_set_code: group.ba_set_code,
      printed_number: group.printed_number,
      normalized_printed_name: group.normalized_printed_name,
      model_group_classification: group.rows.length === 1 ? 'BA_MODEL_SINGLE' : 'BA_MODEL_DUPLICATE',
      row_count: group.rows.length,
      rows: sortRows(group.rows.map((row) => ({ ...row }))),
    }));

  return sortGroups(groups);
}

function buildSubsetSummary(groups, sourceCount, sourceLabel) {
  const rowCount = groups.reduce((sum, group) => sum + group.row_count, 0);

  return {
    source_label: sourceLabel,
    source_row_count: sourceCount,
    grouped_row_count: rowCount,
    ba_model_single_group_count: groups.filter((group) => group.model_group_classification === 'BA_MODEL_SINGLE')
      .length,
    ba_model_duplicate_group_count: groups.filter(
      (group) => group.model_group_classification === 'BA_MODEL_DUPLICATE',
    ).length,
    duplicate_surface_row_count: groups
      .filter((group) => group.model_group_classification === 'BA_MODEL_DUPLICATE')
      .reduce((sum, group) => sum + group.row_count, 0),
  };
}

function buildBaselineArtifact(audit) {
  const baseline = {
    generated_at: new Date().toISOString(),
    phase: 'BA_PHASE2_IDENTITY_MODEL_V1',
    expected_counts: EXPECTED_BASELINE,
    actual_counts: {
      mapped_underlying_count: audit.overallSummaryCounts.mapped_underlying_count,
      conflict_group_count: audit.conflictGroups.length,
      structured_multi_match_count: audit.overallSummaryCounts.structured_multi_match_count,
      no_underlying_match_count: audit.overallSummaryCounts.no_underlying_match_count,
      excluded_from_audit_count: audit.overallSummaryCounts.excluded_from_audit_count,
    },
    status: 'LOCKED',
  };

  const mismatches = [];
  for (const [key, expectedValue] of Object.entries(EXPECTED_BASELINE)) {
    if (baseline.actual_counts[key] !== expectedValue) {
      mismatches.push({
        key,
        expected: expectedValue,
        actual: baseline.actual_counts[key],
      });
    }
  }

  if (mismatches.length > 0) {
    throw new Error(
      `[ba-phase2-identity-model-v1] STOP: baseline count drift detected: ${JSON.stringify(mismatches)}.`,
    );
  }

  return baseline;
}

async function writeJsonArtifact(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function buildOutputPaths() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, '..', '..');
  const checkpointsDir = path.join(repoRoot, 'docs', 'checkpoints');

  return Object.fromEntries(
    Object.entries(OUTPUT_FILENAMES).map(([key, filename]) => [key, path.join(checkpointsDir, filename)]),
  );
}

async function runPhase2IdentityModel(options = {}) {
  const supabase = createBackendClient();
  const audit = await runUnderlyingIdentityAudit(supabase, options);
  const baseline = buildBaselineArtifact(audit);

  const modelInputRows = buildModelInputRows(audit.classifiedRows);
  const priorConflictIndex = buildPriorConflictIndex(audit.conflictGroups);
  const modelGroups = buildModelGroups(modelInputRows, priorConflictIndex);
  const modelGroupsByKey = new Map(modelGroups.map((group) => [group.canonical_model_key, group]));
  const modelInputByRowId = new Map(modelInputRows.map((row) => [row.ba_row_id, row]));

  const structuredMultiGroups = buildSubsetResolution(
    modelGroups,
    ['STRUCTURED_MULTI_MATCH'],
    'STRUCTURED_MULTI_MATCH',
  );
  const noUnderlyingGroups = buildSubsetResolution(
    modelGroups,
    ['NO_UNDERLYING_MATCH'],
    'NO_UNDERLYING_MATCH',
  );
  const conflictResolution = buildConflictResolution(
    audit.conflictGroups,
    modelGroupsByKey,
    modelInputByRowId,
  );

  const outputs = {
    baseline,
    input: {
      generated_at: new Date().toISOString(),
      phase: 'BA_PHASE2_IDENTITY_MODEL_V1',
      row_count: modelInputRows.length,
      rows: sortRows(modelInputRows.map((row) => ({ ...row }))),
    },
    pass1: {
      generated_at: new Date().toISOString(),
      phase: 'BA_PHASE2_IDENTITY_MODEL_V1',
      model_definition: {
        phase_local_only: true,
        canonical_model_key: [
          'ba_set_code',
          'printed_number',
          'normalized_printed_name',
        ],
        normalized_printed_name_rules: [
          'trim whitespace',
          'collapse internal whitespace',
          'lowercase comparison only',
        ],
        prohibited_logic: [
          'synonym expansion',
          'fuzzy matching',
          'cross-set equivalence',
          'variant inference',
          'printed_total inference',
        ],
      },
      summary_counts: buildPass1Summary(
        modelInputRows,
        modelGroups,
        audit.overallSummaryCounts.excluded_from_audit_count,
      ),
      groups: modelGroups,
    },
    conflictResolution: {
      generated_at: new Date().toISOString(),
      phase: 'BA_PHASE2_IDENTITY_MODEL_V1',
      summary_counts: {
        total_conflict_groups: conflictResolution.length,
        ba_number_collision_resolved_count: conflictResolution.filter(
          (group) => group.outcome === 'BA_NUMBER_COLLISION_RESOLVED',
        ).length,
        ba_model_duplicate_count: conflictResolution.filter(
          (group) => group.outcome === 'BA_MODEL_DUPLICATE',
        ).length,
      },
      groups: conflictResolution,
    },
    structuredMulti: {
      generated_at: new Date().toISOString(),
      phase: 'BA_PHASE2_IDENTITY_MODEL_V1',
      summary_counts: buildSubsetSummary(
        structuredMultiGroups,
        audit.overallSummaryCounts.structured_multi_match_count,
        'STRUCTURED_MULTI_MATCH',
      ),
      groups: structuredMultiGroups,
    },
    noUnderlying: {
      generated_at: new Date().toISOString(),
      phase: 'BA_PHASE2_IDENTITY_MODEL_V1',
      summary_counts: {
        ...buildSubsetSummary(
          noUnderlyingGroups,
          audit.overallSummaryCounts.no_underlying_match_count,
          'NO_UNDERLYING_MATCH',
        ),
        ba_underlying_unknown_row_count: noUnderlyingGroups.reduce((sum, group) => sum + group.row_count, 0),
      },
      groups: noUnderlyingGroups,
    },
  };

  return { audit, outputs };
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  console.log('[ba-phase2-identity-model-v1] mode=read-only');

  const { outputs } = await runPhase2IdentityModel(options);
  const outputPaths = buildOutputPaths();

  await writeJsonArtifact(outputPaths.baseline, outputs.baseline);
  await writeJsonArtifact(outputPaths.input, outputs.input);
  await writeJsonArtifact(outputPaths.pass1, outputs.pass1);
  await writeJsonArtifact(outputPaths.conflictResolution, outputs.conflictResolution);
  await writeJsonArtifact(outputPaths.structuredMulti, outputs.structuredMulti);
  await writeJsonArtifact(outputPaths.noUnderlying, outputs.noUnderlying);

  console.log(
    JSON.stringify(
      {
        baseline: outputs.baseline.actual_counts,
        pass1_summary_counts: outputs.pass1.summary_counts,
        conflict_resolution_summary_counts: outputs.conflictResolution.summary_counts,
        structured_multi_summary_counts: outputs.structuredMulti.summary_counts,
        no_underlying_summary_counts: outputs.noUnderlying.summary_counts,
        output_paths: outputPaths,
      },
      null,
      2,
    ),
  );
}

export {
  EXPECTED_BASELINE,
  OUTPUT_FILENAMES,
  buildCanonicalModelKey,
  buildModelInputRows,
  buildOutputPaths,
  buildPass1Summary,
  buildRowUnderlylingReferenceClassification,
  normalizePrintedNameForModel,
  runPhase2IdentityModel,
};

const entryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;

if (entryHref === import.meta.url) {
  run().catch((error) => {
    console.error('[ba-phase2-identity-model-v1] Fatal error:', error);
    process.exit(1);
  });
}
