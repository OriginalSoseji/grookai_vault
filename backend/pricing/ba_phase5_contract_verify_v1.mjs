import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildPaths } from './ba_phase5_contract_build_v1.mjs';

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
];

const FORBIDDEN_WRITE_TOKENS = [
  '.insert(',
  '.update(',
  '.upsert(',
  '.delete(',
];

function buildCheck(name, passed, detail) {
  return { name, passed, detail };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function runVerification() {
  const paths = buildPaths();
  const [
    buildSource,
    verifySource,
    dimensionValidation,
    promotionCandidates,
  ] = await Promise.all([
    fs.readFile(path.join(paths.repoRoot, 'backend', 'pricing', 'ba_phase5_contract_build_v1.mjs'), 'utf8'),
    fs.readFile(path.join(paths.repoRoot, 'backend', 'pricing', 'ba_phase5_contract_verify_v1.mjs'), 'utf8'),
    readJson(paths.phase5DimensionValidation),
    readJson(paths.phase5PromotionCandidates),
  ]);

  const lowerBuildSource = buildSource.toLowerCase();
  const keyCounts = new Map();
  for (const row of promotionCandidates.rows) {
    keyCounts.set(row.ba_identity_key_v1_string, (keyCounts.get(row.ba_identity_key_v1_string) ?? 0) + 1);
  }

  const nondeterministicRows = promotionCandidates.rows.filter(
    (row) =>
      row.promotion_candidate_status !== 'PROMOTION_ELIGIBLE_CANDIDATE' ||
      row.ba_identity_key_v1 == null ||
      row.ba_identity_key_v1_string == null ||
      row.source_name_raw == null,
  );

  const checks = [
    buildCheck(
      'V1_IDENTITY_KEY_PRODUCES_ZERO_COLLISIONS',
      [...keyCounts.values()].every((count) => count === 1),
      {
        promotion_candidate_count: promotionCandidates.rows.length,
        unique_key_count: keyCounts.size,
      },
    ),
    buildCheck(
      'V2_NO_HEURISTIC_LOGIC_INTRODUCED',
      FORBIDDEN_HEURISTIC_TOKENS.every((token) => !lowerBuildSource.includes(token)),
      {
        rejected_tokens: FORBIDDEN_HEURISTIC_TOKENS,
      },
    ),
    buildCheck(
      'V3_NO_EXTERNAL_DATA_USED',
      FORBIDDEN_EXTERNAL_TOKENS.every((token) => !lowerBuildSource.includes(token)),
      {
        rejected_tokens: FORBIDDEN_EXTERNAL_TOKENS,
      },
    ),
    buildCheck(
      'V4_NO_CANON_ROWS_INSERTED',
      FORBIDDEN_WRITE_TOKENS.every((token) => !buildSource.includes(token)),
      {
        rejected_tokens: FORBIDDEN_WRITE_TOKENS,
      },
    ),
    buildCheck(
      'V5_NO_MAPPINGS_WRITTEN',
      !lowerBuildSource.includes('external_mappings') &&
        FORBIDDEN_WRITE_TOKENS.every((token) => !buildSource.includes(token)),
      {
        rejected_tokens: ['external_mappings', ...FORBIDDEN_WRITE_TOKENS],
      },
    ),
    buildCheck(
      'V6_NO_GV_ID_GENERATED_YET',
      !lowerBuildSource.includes('gv_id'),
      {
        rejected_tokens: ['gv_id'],
      },
    ),
    buildCheck(
      'V7_PROMOTION_CANDIDATES_DETERMINISTIC',
      dimensionValidation.validation_status === 'VALID_DIMENSION' &&
        promotionCandidates.summary_counts.promotion_eligible_candidate_count === promotionCandidates.rows.length &&
        nondeterministicRows.length === 0,
      {
        validation_status: dimensionValidation.validation_status,
        promotion_candidate_count: promotionCandidates.rows.length,
        nondeterministic_row_count: nondeterministicRows.length,
      },
    ),
  ];

  const output = {
    generated_at: new Date().toISOString(),
    phase: 'BA_PHASE5_CONTRACT_AMENDMENT_V1',
    verified_artifacts: {
      dimension_validation: path.basename(paths.phase5DimensionValidation),
      promotion_candidates: path.basename(paths.phase5PromotionCandidates),
    },
    checks,
    passed: checks.every((check) => check.passed),
  };

  if (!output.passed) {
    throw new Error(
      `[ba-phase5-contract-verify-v1] STOP: verification failed: ${JSON.stringify(
        checks.filter((check) => !check.passed),
      )}.`,
    );
  }

  return { paths, output };
}

async function run() {
  console.log('[ba-phase5-contract-verify-v1] mode=read-only');
  const { paths, output } = await runVerification();
  const outputPath = path.join(paths.checkpointsDir, 'ba_phase5_contract_verification_v1.json');
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(output, null, 2));
}

export { runVerification };

const entryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;

if (entryHref === import.meta.url) {
  run().catch((error) => {
    console.error('[ba-phase5-contract-verify-v1] Fatal error:', error);
    process.exit(1);
  });
}
