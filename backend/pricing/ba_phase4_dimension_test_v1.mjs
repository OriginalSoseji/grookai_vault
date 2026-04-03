import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const EXPECTED_PHASE3_COUNTS = {
  total_duplicate_groups: 63,
  source_row_duplicate_count: 0,
  model_insufficient_count: 63,
  evidence_insufficient_count: 0,
};

const KEY_DEFINITIONS = {
  K1: ['ba_set_code', 'printed_number', 'normalized_printed_name'],
  K2: ['ba_set_code', 'printed_number', 'normalized_printed_name', 'number_raw'],
  K3: ['ba_set_code', 'printed_number', 'normalized_printed_name', 'parsed_printed_total'],
  K4: ['ba_set_code', 'printed_number', 'normalized_printed_name', 'source_name_raw'],
  K5: ['ba_set_code', 'printed_number', 'normalized_printed_name', 'raw_printed_name'],
  K6: ['ba_set_code', 'printed_number', 'normalized_printed_name', 'number_raw', 'parsed_printed_total'],
  K7: ['ba_set_code', 'printed_number', 'normalized_printed_name', 'number_raw', 'source_name_raw'],
  K8: ['ba_set_code', 'printed_number', 'normalized_printed_name', 'parsed_printed_total', 'source_name_raw'],
  K9: [
    'ba_set_code',
    'printed_number',
    'normalized_printed_name',
    'number_raw',
    'parsed_printed_total',
    'source_name_raw',
  ],
};

const OUTPUT_FILENAMES = {
  diffSurface: 'ba_phase4_dimension_diff_surface_v1.json',
  testResults: 'ba_phase4_dimension_test_results_v1.json',
};

const NAMED_CONFLICT_KEYS = [
  'ba-2022::226::bug catcher',
  'ba-2024::188::potion',
];

function buildPaths() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, '..', '..');
  const checkpointsDir = path.join(repoRoot, 'docs', 'checkpoints');

  return {
    repoRoot,
    checkpointsDir,
    phase2Pass1: path.join(checkpointsDir, 'ba_phase2_identity_model_pass1.json'),
    phase3DuplicateClassification: path.join(checkpointsDir, 'ba_phase3_duplicate_classification_v1.json'),
    phase3DuplicateAuditInput: path.join(checkpointsDir, 'ba_phase3_duplicate_audit_input.json'),
    phase3NamedConflictFindings: path.join(checkpointsDir, 'ba_phase3_named_conflict_duplicate_findings_v1.json'),
    phase4DiffSurface: path.join(checkpointsDir, OUTPUT_FILENAMES.diffSurface),
    phase4TestResults: path.join(checkpointsDir, OUTPUT_FILENAMES.testResults),
  };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function loadPhaseArtifacts() {
  const paths = buildPaths();
  const [
    phase2Pass1,
    phase3DuplicateClassification,
    phase3DuplicateAuditInput,
    phase3NamedConflictFindings,
  ] = await Promise.all([
    readJson(paths.phase2Pass1),
    readJson(paths.phase3DuplicateClassification),
    readJson(paths.phase3DuplicateAuditInput),
    readJson(paths.phase3NamedConflictFindings),
  ]);

  return {
    paths,
    phase2Pass1,
    phase3DuplicateClassification,
    phase3DuplicateAuditInput,
    phase3NamedConflictFindings,
  };
}

function verifyPhase3Lock(artifacts) {
  const actual = artifacts.phase3DuplicateClassification.summary_counts;
  const mismatches = Object.entries(EXPECTED_PHASE3_COUNTS)
    .filter(([key, expected]) => actual[key] !== expected)
    .map(([key, expected]) => ({ key, expected, actual: actual[key] }));

  if (mismatches.length > 0) {
    throw new Error(
      `[ba-phase4-dimension-test-v1] STOP: Phase 3 counts drifted: ${JSON.stringify(mismatches)}.`,
    );
  }
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => JSON.stringify(value)))].map((value) => JSON.parse(value));
}

function flattenCandidateRows(phase2Pass1) {
  return phase2Pass1.groups.flatMap((group) =>
    group.rows.map((row) => ({
      ba_row_id: row.ba_row_id,
      ba_set_code: row.ba_set_code,
      printed_number: row.printed_number,
      normalized_printed_name: row.normalized_printed_name,
      raw_printed_name: row.raw_printed_name,
      source_name_raw: row.name_raw,
      number_raw: row.number_raw,
      parsed_printed_total: row.parsed_printed_total,
      canonical_model_key_k1: group.canonical_model_key,
      phase2_group_classification: group.model_group_classification,
    })),
  );
}

function buildDimensionDiffSurface(duplicateAuditInput) {
  const groups = duplicateAuditInput.groups.map((group) => {
    const differing_fields = [];

    if ((group.raw_printed_names ?? []).length > 1) {
      differing_fields.push('raw_printed_name');
    }
    if ((group.source_name_raw_values ?? []).length > 1) {
      differing_fields.push('source_name_raw');
    }
    if ((group.number_raw_values ?? []).length > 1) {
      differing_fields.push('number_raw');
    }
    if ((group.parsed_printed_totals ?? []).length > 1) {
      differing_fields.push('parsed_printed_total');
    }

    return {
      canonical_model_key: group.canonical_model_key,
      ba_set_code: group.ba_set_code,
      printed_number: group.printed_number,
      normalized_printed_name: group.normalized_printed_name,
      row_count: group.row_count,
      differing_fields,
      field_value_counts: {
        normalized_printed_name: 1,
        raw_printed_name: (group.raw_printed_names ?? []).length,
        source_name_raw: (group.source_name_raw_values ?? []).length,
        printed_number: 1,
        number_raw: (group.number_raw_values ?? []).length,
        parsed_printed_total: (group.parsed_printed_totals ?? []).length,
        ba_set_code: 1,
      },
    };
  });

  const fieldDifferenceSummary = {
    raw_printed_name_diff_count: groups.filter((group) => group.differing_fields.includes('raw_printed_name')).length,
    source_name_raw_diff_count: groups.filter((group) => group.differing_fields.includes('source_name_raw')).length,
    number_raw_diff_count: groups.filter((group) => group.differing_fields.includes('number_raw')).length,
    parsed_printed_total_diff_count: groups.filter(
      (group) => group.differing_fields.includes('parsed_printed_total'),
    ).length,
  };

  return {
    generated_at: new Date().toISOString(),
    phase: 'BA_PHASE4_IDENTITY_DIMENSION_EXPANSION_V1',
    summary_counts: {
      duplicate_group_count: groups.length,
      ...fieldDifferenceSummary,
    },
    groups,
  };
}

function makeKey(row, fields) {
  return fields.map((field) => JSON.stringify(row[field] ?? null)).join('::');
}

function regroupRowsByKey(rows, fields) {
  const grouped = new Map();

  for (const row of rows) {
    const key = makeKey(row, fields);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(row);
  }

  return grouped;
}

function classifyCandidateKey(result) {
  if (result.remaining_duplicates === 0) {
    return 'MINIMALLY_SUFFICIENT';
  }
  if (result.remaining_duplicates < EXPECTED_PHASE3_COUNTS.total_duplicate_groups) {
    return 'PARTIALLY_SUFFICIENT';
  }
  return 'INSUFFICIENT';
}

function buildNamedConflictResults(grouped, keyFields) {
  const namedResults = [];

  for (const canonicalKey of NAMED_CONFLICT_KEYS) {
    const matchingGroups = [...grouped.values()].filter((rows) => rows.some((row) => row.canonical_model_key_k1 === canonicalKey));
    namedResults.push({
      canonical_model_key_k1: canonicalKey,
      resolved: matchingGroups.length > 1 || matchingGroups.every((rows) => rows.length === 1),
      resulting_group_count: matchingGroups.length,
      resulting_group_sizes: matchingGroups.map((rows) => rows.length),
      key_fields: keyFields,
    });
  }

  return namedResults;
}

function testCandidateKey(rows, keyName, keyFields) {
  const grouped = regroupRowsByKey(rows, keyFields);
  const groups = [...grouped.values()];
  const groupsSingle = groups.filter((groupRows) => groupRows.length === 1).length;
  const groupsDuplicate = groups.filter((groupRows) => groupRows.length > 1).length;

  const k1DuplicateGroups = rows.filter((row) => row.phase2_group_classification === 'BA_MODEL_DUPLICATE');
  const k1DuplicateRowIds = new Set(k1DuplicateGroups.map((row) => row.ba_row_id));
  const remainingDuplicateGroupsTouchingK1Duplicates = groups.filter(
    (groupRows) =>
      groupRows.length > 1 && groupRows.some((row) => k1DuplicateRowIds.has(row.ba_row_id)),
  );

  const duplicateReduction = EXPECTED_PHASE3_COUNTS.total_duplicate_groups - remainingDuplicateGroupsTouchingK1Duplicates.length;
  const namedConflictResults = buildNamedConflictResults(grouped, keyFields);

  return {
    key_name: keyName,
    key_fields: keyFields,
    distinct_keys: groups.length,
    groups_single: groupsSingle,
    groups_duplicate: groupsDuplicate,
    duplicate_reduction: duplicateReduction,
    remaining_duplicates: remainingDuplicateGroupsTouchingK1Duplicates.length,
    named_conflicts: namedConflictResults,
    sufficiency_classification: classifyCandidateKey({
      remaining_duplicates: remainingDuplicateGroupsTouchingK1Duplicates.length,
    }),
  };
}

function selectCandidateIdentityKey(results) {
  const minimallySufficient = results.filter((result) => result.sufficiency_classification === 'MINIMALLY_SUFFICIENT');
  if (minimallySufficient.length === 0) {
    return null;
  }

  return minimallySufficient.sort((left, right) => {
    if (left.key_fields.length !== right.key_fields.length) {
      return left.key_fields.length - right.key_fields.length;
    }
    return left.key_name.localeCompare(right.key_name);
  })[0];
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function runPhase4DimensionTest() {
  const artifacts = await loadPhaseArtifacts();
  verifyPhase3Lock(artifacts);

  const rows = flattenCandidateRows(artifacts.phase2Pass1);
  const diffSurface = buildDimensionDiffSurface(artifacts.phase3DuplicateAuditInput);
  const testResults = Object.entries(KEY_DEFINITIONS).map(([keyName, fields]) =>
    testCandidateKey(rows, keyName, fields),
  );
  const candidateIdentityKey = selectCandidateIdentityKey(testResults);

  return {
    artifacts,
    outputs: {
      diffSurface,
      testResults: {
        generated_at: new Date().toISOString(),
        phase: 'BA_PHASE4_IDENTITY_DIMENSION_EXPANSION_V1',
        source_row_count: rows.length,
        key_definitions: KEY_DEFINITIONS,
        results: testResults,
        candidate_identity_key_v1: candidateIdentityKey,
      },
    },
  };
}

async function run() {
  console.log('[ba-phase4-dimension-test-v1] mode=read-only');
  const result = await runPhase4DimensionTest();
  const { paths } = result.artifacts;

  await writeJson(paths.phase4DiffSurface, result.outputs.diffSurface);
  await writeJson(paths.phase4TestResults, result.outputs.testResults);

  console.log(
    JSON.stringify(
      {
        phase3_lock_counts: EXPECTED_PHASE3_COUNTS,
        diff_surface_summary_counts: result.outputs.diffSurface.summary_counts,
        candidate_identity_key_v1: result.outputs.testResults.candidate_identity_key_v1,
        results: result.outputs.testResults.results,
        output_paths: {
          diff_surface: paths.phase4DiffSurface,
          test_results: paths.phase4TestResults,
        },
      },
      null,
      2,
    ),
  );
}

export {
  EXPECTED_PHASE3_COUNTS,
  KEY_DEFINITIONS,
  OUTPUT_FILENAMES,
  buildDimensionDiffSurface,
  buildPaths,
  flattenCandidateRows,
  runPhase4DimensionTest,
  selectCandidateIdentityKey,
  testCandidateKey,
  verifyPhase3Lock,
};

const entryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;

if (entryHref === import.meta.url) {
  run().catch((error) => {
    console.error('[ba-phase4-dimension-test-v1] Fatal error:', error);
    process.exit(1);
  });
}
