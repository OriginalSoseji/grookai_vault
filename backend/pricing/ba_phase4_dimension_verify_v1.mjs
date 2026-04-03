import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { KEY_DEFINITIONS, buildPaths } from './ba_phase4_dimension_test_v1.mjs';

const REQUIRED_DIMENSIONS = [
  'normalized_printed_name',
  'raw_printed_name',
  'source_name_raw',
  'printed_number',
  'number_raw',
  'parsed_printed_total',
  'ba_set_code',
];

const FORBIDDEN_HEURISTIC_TOKENS = [
  'fuzzymatch(',
  'fuzzy_match(',
  'similarity(',
  'levenshtein(',
  'jarowinkler(',
  'cosinesimilarity(',
  'expandsynonyms(',
];

const FORBIDDEN_EXTERNAL_TOKENS = [
  'createbackendclient(',
  '.from(',
  'fetch(',
  'axios',
  'open(',
  'search_query',
  'external data',
];

const FORBIDDEN_WRITE_TOKENS = [
  '.insert(',
  '.update(',
  '.upsert(',
  '.delete(',
];

const FORBIDDEN_GV_ID_TOKEN = 'gv_id';

function buildCheck(name, passed, detail) {
  return { name, passed, detail };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function runVerification() {
  const paths = buildPaths();
  const [
    phase4Source,
    phase2Pass1,
    phase3DuplicateAuditInput,
    diffSurface,
    testResults,
  ] = await Promise.all([
    fs.readFile(path.join(paths.repoRoot, 'backend', 'pricing', 'ba_phase4_dimension_test_v1.mjs'), 'utf8'),
    readJson(paths.phase2Pass1),
    readJson(paths.phase3DuplicateAuditInput),
    readJson(paths.phase4DiffSurface),
    readJson(paths.phase4TestResults),
  ]);

  const lowerSource = phase4Source.toLowerCase();
  const allRows = phase2Pass1.groups.flatMap((group) => group.rows);
  const availableFields = new Set([
    'normalized_printed_name',
    'raw_printed_name',
    'source_name_raw',
    'printed_number',
    'number_raw',
    'parsed_printed_total',
    'ba_set_code',
  ]);
  const allKeyFields = [...new Set(Object.values(KEY_DEFINITIONS).flat())];

  const checks = [
    buildCheck(
      'V1_ALL_DIMENSIONS_FROM_REPO_ARTIFACTS',
      REQUIRED_DIMENSIONS.every((field) => availableFields.has(field)) &&
        allKeyFields.every((field) => REQUIRED_DIMENSIONS.includes(field)) &&
        phase3DuplicateAuditInput.groups.every(
          (group) =>
            group.normalized_printed_name != null &&
            group.ba_set_code != null &&
            group.printed_number != null,
        ) &&
        allRows.every(
          (row) =>
            row.ba_set_code != null &&
            row.printed_number != null &&
            row.normalized_printed_name != null &&
            row.raw_printed_name != null,
        ),
      {
        required_dimensions: REQUIRED_DIMENSIONS,
        tested_key_fields: allKeyFields,
      },
    ),
    buildCheck(
      'V2_NO_FUZZY_MATCHING_USED',
      FORBIDDEN_HEURISTIC_TOKENS.every((token) => !lowerSource.includes(token)),
      {
        rejected_tokens: FORBIDDEN_HEURISTIC_TOKENS,
      },
    ),
    buildCheck(
      'V3_NO_CROSS_SET_INFERENCE',
      !lowerSource.includes('cross-set') &&
        !lowerSource.includes('cross set') &&
        !lowerSource.includes('equivalence'),
      {
        rejected_tokens: ['cross-set', 'cross set', 'equivalence'],
      },
    ),
    buildCheck(
      'V4_NO_EXTERNAL_DATA_USED',
      FORBIDDEN_EXTERNAL_TOKENS.every((token) => !lowerSource.includes(token)),
      {
        rejected_tokens: FORBIDDEN_EXTERNAL_TOKENS,
      },
    ),
    buildCheck(
      'V5_NO_CANON_WRITES_PERFORMED',
      FORBIDDEN_WRITE_TOKENS.every((token) => !phase4Source.includes(token)),
      {
        rejected_tokens: FORBIDDEN_WRITE_TOKENS,
      },
    ),
    buildCheck(
      'V6_NO_GV_ID_GENERATED',
      !lowerSource.includes(FORBIDDEN_GV_ID_TOKEN),
      {
        rejected_tokens: [FORBIDDEN_GV_ID_TOKEN],
      },
    ),
    buildCheck(
      'V7_NO_MAPPINGS_WRITTEN',
      !lowerSource.includes('external_mappings') &&
        FORBIDDEN_WRITE_TOKENS.every((token) => !phase4Source.includes(token)),
      {
        rejected_tokens: ['external_mappings', ...FORBIDDEN_WRITE_TOKENS],
      },
    ),
  ];

  const verification = {
    generated_at: new Date().toISOString(),
    phase: 'BA_PHASE4_IDENTITY_DIMENSION_EXPANSION_V1',
    verified_artifacts: {
      diff_surface: path.basename(paths.phase4DiffSurface),
      test_results: path.basename(paths.phase4TestResults),
    },
    key_definitions: KEY_DEFINITIONS,
    diff_surface_summary_counts: diffSurface.summary_counts,
    candidate_identity_key_v1: testResults.candidate_identity_key_v1,
    checks,
    passed: checks.every((check) => check.passed),
  };

  if (!verification.passed) {
    throw new Error(
      `[ba-phase4-dimension-verify-v1] STOP: verification failed: ${JSON.stringify(
        checks.filter((check) => !check.passed),
      )}.`,
    );
  }

  return { paths, verification };
}

async function run() {
  console.log('[ba-phase4-dimension-verify-v1] mode=read-only');
  const { paths, verification } = await runVerification();
  const outputPath = path.join(paths.checkpointsDir, 'ba_phase4_dimension_verification_v1.json');
  await fs.writeFile(outputPath, `${JSON.stringify(verification, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(verification, null, 2));
}

export { runVerification };

const entryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;

if (entryHref === import.meta.url) {
  run().catch((error) => {
    console.error('[ba-phase4-dimension-verify-v1] Fatal error:', error);
    process.exit(1);
  });
}
