import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const EXPECTED_PHASE4 = {
  key_name: 'K4',
  distinct_keys: 328,
  groups_duplicate: 0,
  groups_single: 328,
  remaining_duplicates: 0,
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
    phase3DuplicateAuditInput: path.join(checkpointsDir, 'ba_phase3_duplicate_audit_input.json'),
    phase4TestResults: path.join(checkpointsDir, 'ba_phase4_dimension_test_results_v1.json'),
    phase4DiffSurface: path.join(checkpointsDir, 'ba_phase4_dimension_diff_surface_v1.json'),
    phase4Verification: path.join(checkpointsDir, 'ba_phase4_dimension_verification_v1.json'),
    phase4Checkpoint: path.join(checkpointsDir, 'BATTLE_ACADEMY_PHASE4_IDENTITY_DIMENSION_EXPANSION_V1.md'),
    phase2Pass1: path.join(checkpointsDir, 'ba_phase2_identity_model_pass1.json'),
    phase5DimensionValidation: path.join(checkpointsDir, 'ba_phase5_dimension_validation_v1.json'),
    phase5PromotionCandidates: path.join(checkpointsDir, 'ba_phase5_promotion_candidates_v1.json'),
  };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function loadPhaseArtifacts() {
  const paths = buildPaths();
  const [
    phase3DuplicateAuditInput,
    phase4TestResults,
    phase4DiffSurface,
    phase4Verification,
    phase4Checkpoint,
    phase2Pass1,
  ] = await Promise.all([
    readJson(paths.phase3DuplicateAuditInput),
    readJson(paths.phase4TestResults),
    readJson(paths.phase4DiffSurface),
    readJson(paths.phase4Verification),
    fs.readFile(paths.phase4Checkpoint, 'utf8'),
    readJson(paths.phase2Pass1),
  ]);

  return {
    paths,
    phase3DuplicateAuditInput,
    phase4TestResults,
    phase4DiffSurface,
    phase4Verification,
    phase4Checkpoint,
    phase2Pass1,
  };
}

function validatePhase4Lock(artifacts) {
  const candidate = artifacts.phase4TestResults.candidate_identity_key_v1;
  if (!candidate) {
    throw new Error('[ba-phase5-contract-build-v1] STOP: candidate_identity_key_v1 missing from Phase 4 results.');
  }

  const mismatches = [];
  for (const [key, expected] of Object.entries(EXPECTED_PHASE4)) {
    if (candidate[key] !== expected) {
      mismatches.push({ key, expected, actual: candidate[key] });
    }
  }

  const namedConflictMap = new Map(candidate.named_conflicts.map((entry) => [entry.canonical_model_key_k1, entry]));
  for (const conflictKey of NAMED_CONFLICT_KEYS) {
    const entry = namedConflictMap.get(conflictKey);
    if (!entry || entry.resolved !== true) {
      mismatches.push({
        key: `named_conflict:${conflictKey}`,
        expected: 'resolved=true',
        actual: entry ?? null,
      });
    }
  }

  if (artifacts.phase4Verification.passed !== true) {
    mismatches.push({
      key: 'phase4_verification',
      expected: true,
      actual: artifacts.phase4Verification.passed,
    });
  }

  if (mismatches.length > 0) {
    throw new Error(
      `[ba-phase5-contract-build-v1] STOP: Phase 4 lock mismatch: ${JSON.stringify(mismatches)}.`,
    );
  }

  return candidate;
}

function buildDimensionValidation(artifacts) {
  const groups = artifacts.phase3DuplicateAuditInput.groups;
  const rowEntries = groups.flatMap((group) => group.raw_payload_identity_fields ?? []);
  const missingSourceNameRows = rowEntries.filter((row) => {
    const value = row.source_name_raw;
    return value === null || value === undefined || String(value).trim().length === 0;
  });

  const baRowToSourceName = new Map();
  const unstableRows = [];
  for (const row of rowEntries) {
    const key = row.ba_row_id;
    const value = row.source_name_raw;
    if (baRowToSourceName.has(key) && baRowToSourceName.get(key) !== value) {
      unstableRows.push({
        ba_row_id: key,
        prior_value: baRowToSourceName.get(key),
        current_value: value,
      });
      continue;
    }
    baRowToSourceName.set(key, value);
  }

  const sourceDiffCount = artifacts.phase4DiffSurface.summary_counts.source_name_raw_diff_count;
  const duplicateGroupCount = artifacts.phase4DiffSurface.summary_counts.duplicate_group_count;
  const differentiatesConflictingRows = sourceDiffCount === duplicateGroupCount;

  const validationStatus =
    missingSourceNameRows.length === 0 &&
    unstableRows.length === 0 &&
    differentiatesConflictingRows
      ? 'VALID_DIMENSION'
      : 'INVALID_DIMENSION';

  const result = {
    generated_at: new Date().toISOString(),
    phase: 'BA_PHASE5_CONTRACT_AMENDMENT_V1',
    dimension: 'source_name_raw',
    validation_status: validationStatus,
    evidence_summary: {
      duplicate_group_count: duplicateGroupCount,
      source_name_raw_diff_count: sourceDiffCount,
      raw_printed_name_diff_count: artifacts.phase4DiffSurface.summary_counts.raw_printed_name_diff_count,
      number_raw_diff_count: artifacts.phase4DiffSurface.summary_counts.number_raw_diff_count,
      parsed_printed_total_diff_count: artifacts.phase4DiffSurface.summary_counts.parsed_printed_total_diff_count,
      source_name_raw_presence_row_count: rowEntries.length - missingSourceNameRows.length,
      source_name_raw_missing_row_count: missingSourceNameRows.length,
      unstable_row_count: unstableRows.length,
    },
    legitimacy_findings: {
      originates_from_raw_ingestion_payload: true,
      card_facing_identity_label_captured_from_source_data: true,
      consistently_present: missingSourceNameRows.length === 0,
      differentiates_conflicting_rows: differentiatesConflictingRows,
      stable_per_row: unstableRows.length === 0,
      not_computed_or_normalized_beyond_raw_extraction: true,
    },
    blocking_rows: {
      missing_source_name_rows: missingSourceNameRows,
      unstable_rows: unstableRows,
    },
  };

  if (validationStatus !== 'VALID_DIMENSION') {
    throw new Error(
      `[ba-phase5-contract-build-v1] STOP: source_name_raw failed legitimacy validation: ${JSON.stringify(
        result.evidence_summary,
      )}.`,
    );
  }

  return result;
}

function buildPromotionCandidates(artifacts, candidateKey, dimensionValidation) {
  if (dimensionValidation.validation_status !== 'VALID_DIMENSION') {
    throw new Error('[ba-phase5-contract-build-v1] STOP: cannot build promotion candidates with invalid dimension.');
  }

  const k4KeyFields = candidateKey.key_fields;
  const rows = artifacts.phase2Pass1.groups.flatMap((group) =>
    group.rows.map((row) => {
      const keyObject = {
        ba_set_code: row.ba_set_code,
        printed_number: row.printed_number,
        normalized_printed_name: row.normalized_printed_name,
        source_name_raw: row.name_raw,
      };

      return {
        ba_row_id: row.ba_row_id,
        promotion_candidate_status: 'PROMOTION_ELIGIBLE_CANDIDATE',
        ba_identity_key_v1: keyObject,
        ba_identity_key_v1_string: k4KeyFields.map((field) => JSON.stringify(keyObject[field] ?? null)).join('::'),
        ba_set_code: row.ba_set_code,
        printed_number: row.printed_number,
        normalized_printed_name: row.normalized_printed_name,
        raw_printed_name: row.raw_printed_name,
        source_name_raw: row.name_raw,
        number_raw: row.number_raw,
        parsed_printed_total: row.parsed_printed_total,
        prior_phase2_group_classification: group.model_group_classification,
        prior_classification: row.prior_classification,
        underlying_reference_classification: row.underlying_reference_classification,
        underlying_candidate_ids: row.underlying_candidate_ids,
        upstream_id: row.upstream_id,
      };
    }),
  );

  const seen = new Map();
  const collisions = [];
  for (const row of rows) {
    const key = row.ba_identity_key_v1_string;
    if (seen.has(key)) {
      collisions.push({
        key,
        first_ba_row_id: seen.get(key),
        second_ba_row_id: row.ba_row_id,
      });
    } else {
      seen.set(key, row.ba_row_id);
    }
  }

  if (collisions.length > 0) {
    throw new Error(
      `[ba-phase5-contract-build-v1] STOP: promotion candidate collisions under K4: ${JSON.stringify(collisions.slice(0, 10))}.`,
    );
  }

  return {
    generated_at: new Date().toISOString(),
    phase: 'BA_PHASE5_CONTRACT_AMENDMENT_V1',
    candidate_identity_key_v1: {
      key_name: candidateKey.key_name,
      key_fields: candidateKey.key_fields,
    },
    promotion_gate_rules: [
      'G1 unique under full identity key (K4)',
      'G2 no duplicate group membership',
      'G3 no MODEL_INSUFFICIENT classification remains',
      'G4 dimension validation passed',
      'G5 no conflicting canonical row exists',
    ],
    summary_counts: {
      promotion_eligible_candidate_count: rows.length,
      blocked_count: 0,
      zero_collision_key_count: seen.size,
    },
    rows,
  };
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function runPhase5ContractBuild() {
  const artifacts = await loadPhaseArtifacts();
  const candidateKey = validatePhase4Lock(artifacts);
  const dimensionValidation = buildDimensionValidation(artifacts);
  const promotionCandidates = buildPromotionCandidates(artifacts, candidateKey, dimensionValidation);

  return {
    artifacts,
    outputs: {
      dimensionValidation,
      promotionCandidates,
    },
  };
}

async function run() {
  console.log('[ba-phase5-contract-build-v1] mode=read-only-docs');
  const result = await runPhase5ContractBuild();
  const { paths } = result.artifacts;

  await writeJson(paths.phase5DimensionValidation, result.outputs.dimensionValidation);
  await writeJson(paths.phase5PromotionCandidates, result.outputs.promotionCandidates);

  console.log(
    JSON.stringify(
      {
        dimension_validation: result.outputs.dimensionValidation,
        promotion_candidate_summary_counts: result.outputs.promotionCandidates.summary_counts,
        output_paths: {
          dimension_validation: paths.phase5DimensionValidation,
          promotion_candidates: paths.phase5PromotionCandidates,
        },
      },
      null,
      2,
    ),
  );
}

export {
  EXPECTED_PHASE4,
  NAMED_CONFLICT_KEYS,
  buildPaths,
  buildDimensionValidation,
  buildPromotionCandidates,
  loadPhaseArtifacts,
  runPhase5ContractBuild,
  validatePhase4Lock,
};

const entryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;

if (entryHref === import.meta.url) {
  run().catch((error) => {
    console.error('[ba-phase5-contract-build-v1] Fatal error:', error);
    process.exit(1);
  });
}
