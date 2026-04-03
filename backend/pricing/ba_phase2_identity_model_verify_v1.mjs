import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  OUTPUT_FILENAMES,
  buildOutputPaths,
} from './ba_phase2_identity_model_v1.mjs';

const REQUIRED_COUNTS = {
  mapped_underlying_count: 184,
  conflict_group_count: 9,
  structured_multi_match_count: 6,
  no_underlying_match_count: 138,
};

function parseArgs(argv) {
  const options = {
    write: true,
  };

  for (const token of argv) {
    if (token === '--no-write') {
      options.write = false;
    }
  }

  return options;
}

function buildPaths() {
  const artifactPaths = buildOutputPaths();
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, '..', '..');

  return {
    repoRoot,
    mainScript: path.join(repoRoot, 'backend', 'pricing', 'ba_phase2_identity_model_v1.mjs'),
    verificationJson: path.join(repoRoot, 'docs', 'checkpoints', 'ba_phase2_identity_model_verification.json'),
    artifactPaths,
  };
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function collectAllRows(groups) {
  return groups.flatMap((group) => group.rows ?? []);
}

function buildCheck(name, passed, detail) {
  return { name, passed, detail };
}

async function runVerification(options = {}) {
  const paths = buildPaths();
  const [
    mainScriptSource,
    baseline,
    pass1,
    conflictResolution,
    structuredMulti,
    noUnderlying,
  ] = await Promise.all([
    fs.readFile(paths.mainScript, 'utf8'),
    readJson(paths.artifactPaths.baseline),
    readJson(paths.artifactPaths.pass1),
    readJson(paths.artifactPaths.conflictResolution),
    readJson(paths.artifactPaths.structuredMulti),
    readJson(paths.artifactPaths.noUnderlying),
  ]);

  const forbiddenHeuristicCodeTokens = [
    'fuzzymatch(',
    'fuzzy_match(',
    'similarity(',
    'levenshtein(',
    'jarowinkler(',
    'cosinesimilarity(',
    'expandsynonyms(',
  ];
  const writeTokens = ['.insert(', '.update(', '.upsert(', '.delete('];
  const gvIdToken = 'gv_id';

  const conflictOutcomes = new Set(conflictResolution.groups.map((group) => group.outcome));
  const structuredMultiRows = collectAllRows(structuredMulti.groups);
  const noUnderlyingRows = collectAllRows(noUnderlying.groups);
  const pass1Rows = collectAllRows(pass1.groups);
  const perGroupSingleSet = pass1.groups.every(
    (group) => new Set((group.rows ?? []).map((row) => row.ba_set_code)).size === 1,
  );

  const checks = [
    buildCheck(
      'V1_NO_HEURISTIC_LOGIC_PRESENT',
      forbiddenHeuristicCodeTokens.every(
        (token) => !mainScriptSource.toLowerCase().includes(token),
      ),
      { rejected_tokens: forbiddenHeuristicCodeTokens },
    ),
    buildCheck(
      'V2_NO_CANON_WRITES_PERFORMED',
      writeTokens.every((token) => !mainScriptSource.includes(token)),
      { rejected_tokens: writeTokens },
    ),
    buildCheck(
      'V3_NO_GV_ID_GENERATED',
      !mainScriptSource.includes(gvIdToken),
      { rejected_tokens: [gvIdToken] },
    ),
    buildCheck(
      'V4_ALL_CONFLICTS_RESOLVED_OR_ISOLATED',
      conflictResolution.summary_counts.total_conflict_groups === REQUIRED_COUNTS.conflict_group_count &&
        [...conflictOutcomes].every(
          (outcome) => outcome === 'BA_NUMBER_COLLISION_RESOLVED' || outcome === 'BA_MODEL_DUPLICATE',
        ),
      {
        total_conflict_groups: conflictResolution.summary_counts.total_conflict_groups,
        outcomes: [...conflictOutcomes],
      },
    ),
    buildCheck(
      'V5_STRUCTURED_MULTI_HANDLED_DETERMINISTICALLY',
      structuredMulti.summary_counts.source_row_count === REQUIRED_COUNTS.structured_multi_match_count &&
        structuredMultiRows.length === REQUIRED_COUNTS.structured_multi_match_count &&
        structuredMulti.groups.every(
          (group) =>
            group.model_group_classification === 'BA_MODEL_SINGLE' ||
            group.model_group_classification === 'BA_MODEL_DUPLICATE',
        ),
      {
        source_row_count: structuredMulti.summary_counts.source_row_count,
        grouped_row_count: structuredMulti.summary_counts.grouped_row_count,
      },
    ),
    buildCheck(
      'V6_NO_UNDERLYING_ROWS_PROPERLY_CLASSIFIED',
      baseline.actual_counts.no_underlying_match_count === REQUIRED_COUNTS.no_underlying_match_count &&
        noUnderlying.summary_counts.source_row_count === REQUIRED_COUNTS.no_underlying_match_count &&
        noUnderlying.summary_counts.ba_underlying_unknown_row_count === REQUIRED_COUNTS.no_underlying_match_count &&
        noUnderlyingRows.every(
          (row) => row.underlying_reference_classification === 'BA_UNDERLYING_UNKNOWN',
        ),
      {
        baseline_no_underlying_match_count: baseline.actual_counts.no_underlying_match_count,
        source_row_count: noUnderlying.summary_counts.source_row_count,
        ba_underlying_unknown_row_count: noUnderlying.summary_counts.ba_underlying_unknown_row_count,
      },
    ),
    buildCheck(
      'V7_NO_CROSS_SET_MERGES_PERFORMED',
      perGroupSingleSet &&
        pass1Rows.every((row) => row.ba_set_code != null) &&
        pass1.groups.every((group) => group.canonical_model_key.startsWith(`${group.ba_set_code}::`)),
      {
        distinct_canonical_model_key_count: pass1.summary_counts.distinct_canonical_model_key_count,
        group_count: pass1.groups.length,
      },
    ),
  ];

  const verification = {
    generated_at: new Date().toISOString(),
    phase: 'BA_PHASE2_IDENTITY_MODEL_V1',
    verified_artifacts: {
      baseline: OUTPUT_FILENAMES.baseline,
      pass1: OUTPUT_FILENAMES.pass1,
      conflict_resolution: OUTPUT_FILENAMES.conflictResolution,
      structured_multi: OUTPUT_FILENAMES.structuredMulti,
      no_underlying: OUTPUT_FILENAMES.noUnderlying,
    },
    checks,
    passed: checks.every((check) => check.passed),
  };

  if (!verification.passed) {
    throw new Error(
      `[ba-phase2-identity-model-verify-v1] STOP: verification failed: ${JSON.stringify(checks.filter((check) => !check.passed))}.`,
    );
  }

  if (options.write !== false) {
    await fs.writeFile(paths.verificationJson, `${JSON.stringify(verification, null, 2)}\n`, 'utf8');
  }

  return verification;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  console.log('[ba-phase2-identity-model-verify-v1] mode=read-only');
  const verification = await runVerification(options);
  console.log(JSON.stringify(verification, null, 2));
}

export { runVerification };

const entryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;

if (entryHref === import.meta.url) {
  run().catch((error) => {
    console.error('[ba-phase2-identity-model-verify-v1] Fatal error:', error);
    process.exit(1);
  });
}
