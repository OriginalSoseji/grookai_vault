import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  EXPECTED_PHASE2_COUNTS,
  OUTPUT_FILENAMES,
  buildPaths,
} from './ba_phase3_duplicate_audit_v1.mjs';

function buildCheck(name, passed, detail) {
  return { name, passed, detail };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function asSortedKeySet(values) {
  return [...new Set(values)].sort((left, right) => String(left).localeCompare(String(right)));
}

async function runVerification() {
  const paths = buildPaths();
  const [
    phase3Source,
    verifySource,
    phase2Pass1,
    duplicateClassification,
    promotionGatePartition,
    verification,
  ] = await Promise.all([
    fs.readFile(path.join(paths.repoRoot, 'backend', 'pricing', 'ba_phase3_duplicate_audit_v1.mjs'), 'utf8'),
    fs.readFile(path.join(paths.repoRoot, 'backend', 'pricing', 'ba_phase3_duplicate_audit_verify_v1.mjs'), 'utf8'),
    readJson(paths.phase2.pass1),
    readJson(paths.phase3.duplicateClassification),
    readJson(paths.phase3.promotionGatePartition),
    readJson(paths.phase2.verification),
  ]);

  const duplicateKeysFromPhase2 = asSortedKeySet(
    phase2Pass1.groups
      .filter((group) => group.model_group_classification === 'BA_MODEL_DUPLICATE')
      .map((group) => group.canonical_model_key),
  );
  const duplicateKeysFromPhase3 = asSortedKeySet(
    duplicateClassification.groups.map((group) => group.canonical_model_key),
  );

  const partitionKeys = asSortedKeySet(
    Object.values(promotionGatePartition.partitions).flat().map((entry) => entry.canonical_model_key),
  );
  const phase2AllKeys = asSortedKeySet(phase2Pass1.groups.map((group) => group.canonical_model_key));
  const partitionEntries = Object.values(promotionGatePartition.partitions).flat();
  const partitionCountsByKey = partitionEntries.reduce((map, entry) => {
    map.set(entry.canonical_model_key, (map.get(entry.canonical_model_key) ?? 0) + 1);
    return map;
  }, new Map());

  const lowerPhase3Source = phase3Source.toLowerCase();
  const lowerVerifySource = verifySource.toLowerCase();
  const forbiddenHeuristicTokens = [
    'fuzzymatch(',
    'fuzzy_match(',
    'similarity(',
    'levenshtein(',
    'jarowinkler(',
    'cosinesimilarity(',
    'expandsynonyms(',
  ];
  const forbiddenWriteTokens = ['.insert(', '.update(', '.upsert(', '.delete('];
  const forbiddenTableTokens = ['card_prints', 'external_mappings'];
  const forbiddenGvIdToken = 'gv_id';

  const checks = [
    buildCheck(
      'V1_EVERY_PHASE2_DUPLICATE_GROUP_CLASSIFIED_ONCE',
      JSON.stringify(duplicateKeysFromPhase2) === JSON.stringify(duplicateKeysFromPhase3),
      {
        expected_duplicate_group_count: EXPECTED_PHASE2_COUNTS.ba_model_duplicate_group_count,
        actual_duplicate_group_count: duplicateKeysFromPhase3.length,
      },
    ),
    buildCheck(
      'V2_EVERY_WORKING_KEY_PARTITIONED_ONCE',
      JSON.stringify(phase2AllKeys) === JSON.stringify(partitionKeys) &&
        [...partitionCountsByKey.values()].every((count) => count === 1),
      {
        expected_working_key_count: EXPECTED_PHASE2_COUNTS.distinct_canonical_model_key_count,
        actual_working_key_count: partitionKeys.length,
      },
    ),
    buildCheck(
      'V3_NO_KEY_IN_MULTIPLE_GATE_BUCKETS',
      [...partitionCountsByKey.values()].every((count) => count === 1),
      {
        multi_bucket_key_count: [...partitionCountsByKey.values()].filter((count) => count !== 1).length,
      },
    ),
    buildCheck(
      'V4_NO_HEURISTIC_LOGIC_EXISTS',
      forbiddenHeuristicTokens.every((token) => !lowerPhase3Source.includes(token)),
      {
        rejected_tokens: forbiddenHeuristicTokens,
      },
    ),
    buildCheck(
      'V5_NO_SILENT_CONTRACT_AMENDMENT_IMPLIED',
      verification.passed === true &&
        promotionGatePartition.summary_counts.promotion_eligible_count === 0 &&
        promotionGatePartition.summary_counts.blocked_contract_count ===
          EXPECTED_PHASE2_COUNTS.ba_model_single_group_count,
      {
        promotion_eligible_count: promotionGatePartition.summary_counts.promotion_eligible_count,
        blocked_contract_count: promotionGatePartition.summary_counts.blocked_contract_count,
      },
    ),
    buildCheck(
      'V6_NO_CANON_ROWS_INSERTED',
      forbiddenWriteTokens.every((token) => !phase3Source.includes(token)) &&
        forbiddenTableTokens.every((token) => !lowerPhase3Source.includes(token)),
      {
        rejected_tokens: [...forbiddenWriteTokens, ...forbiddenTableTokens],
      },
    ),
    buildCheck(
      'V7_NO_MAPPINGS_WRITTEN',
      forbiddenWriteTokens.every((token) => !phase3Source.includes(token)) &&
        !lowerPhase3Source.includes('external_mappings'),
      {
        rejected_tokens: [...forbiddenWriteTokens, 'external_mappings'],
      },
    ),
    buildCheck(
      'V8_NO_GV_ID_VALUES_GENERATED',
      !lowerPhase3Source.includes(forbiddenGvIdToken),
      {
        rejected_tokens: [forbiddenGvIdToken],
      },
    ),
  ];

  const output = {
    generated_at: new Date().toISOString(),
    phase: 'BA_PHASE3_DUPLICATE_AUDIT_AND_PROMOTION_GATE_V1',
    verified_artifacts: {
      duplicate_audit_input: OUTPUT_FILENAMES.duplicateAuditInput,
      duplicate_classification: OUTPUT_FILENAMES.duplicateClassification,
      named_conflict_findings: OUTPUT_FILENAMES.namedConflictFindings,
      promotion_gate_partition: OUTPUT_FILENAMES.promotionGatePartition,
    },
    checks,
    passed: checks.every((check) => check.passed),
  };

  if (!output.passed) {
    throw new Error(
      `[ba-phase3-duplicate-audit-verify-v1] STOP: verification failed: ${JSON.stringify(
        checks.filter((check) => !check.passed),
      )}.`,
    );
  }

  return { paths, output };
}

async function run() {
  console.log('[ba-phase3-duplicate-audit-verify-v1] mode=read-only');
  const { paths, output } = await runVerification();
  await fs.writeFile(
    path.join(paths.checkpointsDir, 'ba_phase3_duplicate_audit_verification_v1.json'),
    `${JSON.stringify(output, null, 2)}\n`,
    'utf8',
  );
  console.log(JSON.stringify(output, null, 2));
}

export { runVerification };

const entryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;

if (entryHref === import.meta.url) {
  run().catch((error) => {
    console.error('[ba-phase3-duplicate-audit-verify-v1] Fatal error:', error);
    process.exit(1);
  });
}
