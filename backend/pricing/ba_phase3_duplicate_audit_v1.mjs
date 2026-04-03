import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const EXPECTED_PHASE2_COUNTS = {
  distinct_canonical_model_key_count: 115,
  ba_model_single_group_count: 52,
  ba_model_duplicate_group_count: 63,
};

const DUPLICATE_CLASSES = [
  'SOURCE_ROW_DUPLICATE',
  'MODEL_INSUFFICIENT',
  'EVIDENCE_INSUFFICIENT',
];

const GATE_BUCKETS = [
  'PROMOTION_ELIGIBLE',
  'BLOCKED_DUPLICATE',
  'BLOCKED_CONTRACT',
];

const OUTPUT_FILENAMES = {
  duplicateAuditInput: 'ba_phase3_duplicate_audit_input.json',
  duplicateClassification: 'ba_phase3_duplicate_classification_v1.json',
  namedConflictFindings: 'ba_phase3_named_conflict_duplicate_findings_v1.json',
  promotionGatePartition: 'ba_phase3_promotion_gate_partition_v1.json',
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
    phase2: {
      baseline: path.join(checkpointsDir, 'ba_phase2_identity_model_baseline.json'),
      input: path.join(checkpointsDir, 'ba_phase2_identity_model_input.json'),
      pass1: path.join(checkpointsDir, 'ba_phase2_identity_model_pass1.json'),
      conflictResolution: path.join(checkpointsDir, 'ba_phase2_conflict_resolution_v1.json'),
      structuredMulti: path.join(checkpointsDir, 'ba_phase2_structured_multi_resolution_v1.json'),
      noUnderlying: path.join(checkpointsDir, 'ba_phase2_no_underlying_reclassification_v1.json'),
      verification: path.join(checkpointsDir, 'ba_phase2_identity_model_verification.json'),
      checkpoint: path.join(checkpointsDir, 'BATTLE_ACADEMY_PHASE2_IDENTITY_MODEL_V1.md'),
    },
    phase3: Object.fromEntries(
      Object.entries(OUTPUT_FILENAMES).map(([key, filename]) => [key, path.join(checkpointsDir, filename)]),
    ),
  };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function loadLockedPhase2Artifacts() {
  const paths = buildPaths();

  const [
    baseline,
    input,
    pass1,
    conflictResolution,
    structuredMulti,
    noUnderlying,
    verification,
    checkpointMarkdown,
  ] = await Promise.all([
    readJson(paths.phase2.baseline),
    readJson(paths.phase2.input),
    readJson(paths.phase2.pass1),
    readJson(paths.phase2.conflictResolution),
    readJson(paths.phase2.structuredMulti),
    readJson(paths.phase2.noUnderlying),
    readJson(paths.phase2.verification),
    fs.readFile(paths.phase2.checkpoint, 'utf8'),
  ]);

  return {
    paths,
    baseline,
    input,
    pass1,
    conflictResolution,
    structuredMulti,
    noUnderlying,
    verification,
    checkpointMarkdown,
  };
}

function verifyLockedPhase2Counts(phase2) {
  const actual = {
    distinct_canonical_model_key_count: phase2.pass1.summary_counts.distinct_canonical_model_key_count,
    ba_model_single_group_count: phase2.pass1.summary_counts.ba_model_single_group_count,
    ba_model_duplicate_group_count: phase2.pass1.summary_counts.ba_model_duplicate_group_count,
  };

  const mismatches = Object.entries(EXPECTED_PHASE2_COUNTS)
    .filter(([key, expected]) => actual[key] !== expected)
    .map(([key, expected]) => ({ key, expected, actual: actual[key] }));

  if (mismatches.length > 0) {
    throw new Error(
      `[ba-phase3-duplicate-audit-v1] STOP: Phase 2 locked counts drifted: ${JSON.stringify(mismatches)}.`,
    );
  }

  if (phase2.verification.passed !== true) {
    throw new Error('[ba-phase3-duplicate-audit-v1] STOP: Phase 2 verification is not passed.');
  }

  return actual;
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function uniqueObjects(values) {
  return [...new Set(values.map((value) => JSON.stringify(value)))].map((value) => JSON.parse(value));
}

function groupRowsByUnderlyingCardPrintId(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const ids = row.underlying_candidate_ids ?? [];
    const key = ids.length === 1 ? String(ids[0]) : JSON.stringify(ids);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push({
      ba_row_id: row.ba_row_id,
      upstream_id: row.upstream_id,
      name_raw: row.name_raw,
      number_raw: row.number_raw,
      parsed_printed_total: row.parsed_printed_total,
    });
  }

  return [...grouped.entries()].map(([underlying_key, groupedRows]) => ({
    underlying_key,
    row_count: groupedRows.length,
    rows: groupedRows,
  }));
}

function buildDuplicateAuditInput(phase2) {
  const duplicateGroups = phase2.pass1.groups
    .filter((group) => group.model_group_classification === 'BA_MODEL_DUPLICATE')
    .map((group) => ({
      canonical_model_key: group.canonical_model_key,
      ba_set_code: group.ba_set_code,
      printed_number: group.printed_number,
      normalized_printed_name: group.normalized_printed_name,
      row_count: group.row_count,
      ba_row_ids: group.rows.map((row) => row.ba_row_id),
      raw_printed_names: uniqueValues(group.rows.map((row) => row.raw_printed_name)),
      source_name_raw_values: uniqueValues(group.rows.map((row) => row.name_raw)),
      number_raw_values: uniqueValues(group.rows.map((row) => row.number_raw)),
      parsed_printed_totals: uniqueObjects(group.rows.map((row) => row.parsed_printed_total)),
      prior_classifications: uniqueValues(group.rows.map((row) => row.prior_classification)),
      underlying_candidate_counts: uniqueObjects(group.rows.map((row) => row.underlying_candidate_count)),
      underlying_candidate_ids: uniqueObjects(group.rows.map((row) => row.underlying_candidate_ids)),
      source_row_identifiers: group.rows.map((row) => ({
        ba_row_id: row.ba_row_id,
        upstream_id: row.upstream_id,
      })),
      raw_payload_identity_fields: group.rows.map((row) => ({
        ba_row_id: row.ba_row_id,
        upstream_id: row.upstream_id,
        raw_printed_name: row.raw_printed_name,
        source_name_raw: row.name_raw,
        number_raw: row.number_raw,
        parsed_printed_total: row.parsed_printed_total,
      })),
      prior_conflict_group: group.prior_conflict_group ?? null,
      rows_grouped_by_underlying_candidate: groupRowsByUnderlyingCardPrintId(group.rows),
    }));

  return {
    generated_at: new Date().toISOString(),
    phase: 'BA_PHASE3_DUPLICATE_AUDIT_AND_PROMOTION_GATE_V1',
    source_phase2_summary_counts: phase2.pass1.summary_counts,
    duplicate_group_count: duplicateGroups.length,
    groups: duplicateGroups,
  };
}

function classifyDuplicateGroup(group) {
  const printedEvidenceDifferences = [];

  if ((group.source_name_raw_values ?? []).length > 1) {
    printedEvidenceDifferences.push('source_name_raw');
  }
  if ((group.number_raw_values ?? []).length > 1) {
    printedEvidenceDifferences.push('number_raw');
  }
  if ((group.parsed_printed_totals ?? []).length > 1) {
    printedEvidenceDifferences.push('parsed_printed_total');
  }

  if (printedEvidenceDifferences.length > 0) {
    return {
      duplicate_classification: 'MODEL_INSUFFICIENT',
      rationale:
        'Audited artifacts contain additional printed evidence differences not represented in the current working key.',
      printed_evidence_difference_fields: printedEvidenceDifferences,
    };
  }

  const upstreamIds = group.source_row_identifiers.map((row) => row.upstream_id);
  const duplicateUpstreamIdsExist = uniqueValues(upstreamIds).length < upstreamIds.length;

  if (duplicateUpstreamIdsExist) {
    return {
      duplicate_classification: 'SOURCE_ROW_DUPLICATE',
      rationale:
        'Rows share the same working key and the same printed evidence, and the duplicate surface is proven by repeated source-row identity.',
      printed_evidence_difference_fields: [],
    };
  }

  return {
    duplicate_classification: 'EVIDENCE_INSUFFICIENT',
    rationale:
      'Rows share the same working key, but audited artifacts do not prove whether the duplicate surface is harmless source duplication or distinct printed identity.',
    printed_evidence_difference_fields: [],
  };
}

function buildDuplicateClassification(duplicateAuditInput) {
  const groups = duplicateAuditInput.groups.map((group) => {
    const classification = classifyDuplicateGroup(group);
    return {
      canonical_model_key: group.canonical_model_key,
      ba_set_code: group.ba_set_code,
      printed_number: group.printed_number,
      normalized_printed_name: group.normalized_printed_name,
      row_count: group.row_count,
      duplicate_classification: classification.duplicate_classification,
      rationale: classification.rationale,
      printed_evidence_difference_fields: classification.printed_evidence_difference_fields,
      prior_classifications: group.prior_classifications,
      underlying_candidate_counts: group.underlying_candidate_counts,
      underlying_candidate_ids: group.underlying_candidate_ids,
      source_row_identifiers: group.source_row_identifiers,
      raw_payload_identity_fields: group.raw_payload_identity_fields,
      prior_conflict_group: group.prior_conflict_group,
    };
  });

  return {
    generated_at: new Date().toISOString(),
    phase: 'BA_PHASE3_DUPLICATE_AUDIT_AND_PROMOTION_GATE_V1',
    summary_counts: {
      total_duplicate_groups: groups.length,
      source_row_duplicate_count: groups.filter(
        (group) => group.duplicate_classification === 'SOURCE_ROW_DUPLICATE',
      ).length,
      model_insufficient_count: groups.filter(
        (group) => group.duplicate_classification === 'MODEL_INSUFFICIENT',
      ).length,
      evidence_insufficient_count: groups.filter(
        (group) => group.duplicate_classification === 'EVIDENCE_INSUFFICIENT',
      ).length,
    },
    groups,
  };
}

function buildNamedConflictFindings(duplicateClassification) {
  const indexed = new Map(
    duplicateClassification.groups.map((group) => [group.canonical_model_key, group]),
  );

  const findings = NAMED_CONFLICT_KEYS.map((key) => {
    const finding = indexed.get(key);
    if (!finding) {
      throw new Error(
        `[ba-phase3-duplicate-audit-v1] STOP: named conflict key missing from duplicate classification: ${key}.`,
      );
    }
    return finding;
  });

  return {
    generated_at: new Date().toISOString(),
    phase: 'BA_PHASE3_DUPLICATE_AUDIT_AND_PROMOTION_GATE_V1',
    named_conflict_keys: NAMED_CONFLICT_KEYS,
    findings,
  };
}

function buildPromotionGatePartition(phase2, duplicateClassification) {
  const duplicateClassByKey = new Map(
    duplicateClassification.groups.map((group) => [group.canonical_model_key, group]),
  );

  const partitionEntries = phase2.pass1.groups.map((group) => {
    const duplicateGroup = duplicateClassByKey.get(group.canonical_model_key) ?? null;

    if (duplicateGroup) {
      return {
        canonical_model_key: group.canonical_model_key,
        ba_set_code: group.ba_set_code,
        printed_number: group.printed_number,
        normalized_printed_name: group.normalized_printed_name,
        phase2_group_classification: group.model_group_classification,
        gate_bucket: 'BLOCKED_DUPLICATE',
        gate_reason: duplicateGroup.duplicate_classification,
      };
    }

    if (group.model_group_classification === 'BA_MODEL_SINGLE') {
      return {
        canonical_model_key: group.canonical_model_key,
        ba_set_code: group.ba_set_code,
        printed_number: group.printed_number,
        normalized_printed_name: group.normalized_printed_name,
        phase2_group_classification: group.model_group_classification,
        gate_bucket: 'BLOCKED_CONTRACT',
        gate_reason: 'BA_CANONICAL_LAW_NOT_AMENDED',
      };
    }

    throw new Error(
      `[ba-phase3-duplicate-audit-v1] STOP: unpartitioned Phase 2 group encountered: ${group.canonical_model_key}.`,
    );
  });

  return {
    generated_at: new Date().toISOString(),
    phase: 'BA_PHASE3_DUPLICATE_AUDIT_AND_PROMOTION_GATE_V1',
    promotion_permitted_in_phase: false,
    summary_counts: {
      total_working_keys: partitionEntries.length,
      promotion_eligible_count: partitionEntries.filter((entry) => entry.gate_bucket === 'PROMOTION_ELIGIBLE')
        .length,
      blocked_duplicate_count: partitionEntries.filter((entry) => entry.gate_bucket === 'BLOCKED_DUPLICATE')
        .length,
      blocked_contract_count: partitionEntries.filter((entry) => entry.gate_bucket === 'BLOCKED_CONTRACT')
        .length,
    },
    partitions: {
      PROMOTION_ELIGIBLE: partitionEntries.filter((entry) => entry.gate_bucket === 'PROMOTION_ELIGIBLE'),
      BLOCKED_DUPLICATE: partitionEntries.filter((entry) => entry.gate_bucket === 'BLOCKED_DUPLICATE'),
      BLOCKED_CONTRACT: partitionEntries.filter((entry) => entry.gate_bucket === 'BLOCKED_CONTRACT'),
    },
  };
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function runPhase3DuplicateAudit() {
  const phase2 = await loadLockedPhase2Artifacts();
  const lockedCounts = verifyLockedPhase2Counts(phase2);

  const duplicateAuditInput = buildDuplicateAuditInput(phase2);
  const duplicateClassification = buildDuplicateClassification(duplicateAuditInput);
  const namedConflictFindings = buildNamedConflictFindings(duplicateClassification);
  const promotionGatePartition = buildPromotionGatePartition(phase2, duplicateClassification);

  return {
    phase2,
    lockedCounts,
    outputs: {
      duplicateAuditInput,
      duplicateClassification,
      namedConflictFindings,
      promotionGatePartition,
    },
  };
}

async function run() {
  console.log('[ba-phase3-duplicate-audit-v1] mode=read-only');
  const result = await runPhase3DuplicateAudit();
  const paths = buildPaths();

  await writeJson(paths.phase3.duplicateAuditInput, result.outputs.duplicateAuditInput);
  await writeJson(paths.phase3.duplicateClassification, result.outputs.duplicateClassification);
  await writeJson(paths.phase3.namedConflictFindings, result.outputs.namedConflictFindings);
  await writeJson(paths.phase3.promotionGatePartition, result.outputs.promotionGatePartition);

  console.log(
    JSON.stringify(
      {
        locked_phase2_counts: result.lockedCounts,
        duplicate_classification_summary_counts: result.outputs.duplicateClassification.summary_counts,
        named_conflict_keys: result.outputs.namedConflictFindings.named_conflict_keys,
        promotion_gate_summary_counts: result.outputs.promotionGatePartition.summary_counts,
        output_paths: paths.phase3,
      },
      null,
      2,
    ),
  );
}

export {
  DUPLICATE_CLASSES,
  EXPECTED_PHASE2_COUNTS,
  GATE_BUCKETS,
  OUTPUT_FILENAMES,
  buildDuplicateAuditInput,
  buildDuplicateClassification,
  buildNamedConflictFindings,
  buildPaths,
  buildPromotionGatePartition,
  classifyDuplicateGroup,
  loadLockedPhase2Artifacts,
  runPhase3DuplicateAudit,
  verifyLockedPhase2Counts,
};

const entryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;

if (entryHref === import.meta.url) {
  run().catch((error) => {
    console.error('[ba-phase3-duplicate-audit-v1] Fatal error:', error);
    process.exit(1);
  });
}
