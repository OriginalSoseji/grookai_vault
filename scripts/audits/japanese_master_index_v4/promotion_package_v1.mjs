import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import {
  readVerifiedArtifact,
  writeShardedRows,
} from './artifact_rows_v1.mjs';
import {
  buildArtifact,
  stableJson,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';
import { assertAuditOnlyArgs } from './read_only_guard_v1.mjs';

export const PROMOTION_PACKAGE_VERSION =
  'JPN-MASTER-INDEX-PROMOTION-PACKAGE-V1';

const DEFAULT_RECONCILIATION_PATH =
  'docs/audits/japanese_master_index_v4/reconciliation/'
  + 'jpn_live_reconciliation_v1.json';
const DEFAULT_FINAL_ROOT =
  'docs/audits/japanese_master_index_v4/final';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v4/promotion_package';

const DATASET_SPECS = [
  {
    key: 'direct_card_candidates',
    datasetKey: 'jpn_promotion_direct_card_candidate_rows_v1',
    packageId: 'JPN-PROMOTION-DIRECT-CARD-CANDIDATE-ROWS-V1',
  },
  {
    key: 'set_insert_candidates',
    datasetKey: 'jpn_promotion_set_insert_candidate_rows_v1',
    packageId: 'JPN-PROMOTION-SET-INSERT-CANDIDATE-ROWS-V1',
  },
  {
    key: 'set_dependent_card_candidates',
    datasetKey: 'jpn_promotion_set_dependent_card_candidate_rows_v1',
    packageId: 'JPN-PROMOTION-SET-DEPENDENT-CARD-CANDIDATE-ROWS-V1',
  },
  {
    key: 'novel_blocked_review',
    datasetKey: 'jpn_promotion_novel_blocked_review_rows_v1',
    packageId: 'JPN-PROMOTION-NOVEL-BLOCKED-REVIEW-ROWS-V1',
  },
  {
    key: 'set_mapping_review',
    datasetKey: 'jpn_promotion_set_mapping_review_rows_v1',
    packageId: 'JPN-PROMOTION-SET-MAPPING-REVIEW-ROWS-V1',
  },
  {
    key: 'existing_parent_review',
    datasetKey: 'jpn_existing_parent_promotion_review_rows_v1',
    packageId: 'JPN-EXISTING-PARENT-PROMOTION-REVIEW-ROWS-V1',
  },
  {
    key: 'evidence_gap_review',
    datasetKey: 'jpn_promotion_evidence_gap_review_rows_v1',
    packageId: 'JPN-PROMOTION-EVIDENCE-GAP-REVIEW-ROWS-V1',
  },
];

function text(value) {
  return String(value ?? '').normalize('NFKC').trim();
}

function unique(values) {
  return [...new Set(
    (values ?? [])
      .filter((value) => value !== null && value !== undefined)
      .map((value) => text(value))
      .filter(Boolean),
  )].sort((left, right) => left.localeCompare(right, 'ja'));
}

function sortRows(rows, keys) {
  return [...rows].sort((left, right) => {
    for (const key of keys) {
      const comparison = text(left[key]).localeCompare(
        text(right[key]),
        'ja',
        { numeric: true },
      );
      if (comparison !== 0) return comparison;
    }
    return 0;
  });
}

function countArrayValues(rows, field) {
  const counts = {};
  for (const row of rows) {
    for (const value of row[field] ?? []) {
      counts[value] = (counts[value] ?? 0) + 1;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort());
}

async function loadDescriptorDataset(
  descriptorPath,
  expectedDatasetKey,
) {
  const { artifact } = await readVerifiedArtifact(descriptorPath);
  const descriptor = artifact.content.dataset;
  if (descriptor?.dataset_key !== expectedDatasetKey) {
    throw new Error(
      `Dataset descriptor mismatch: ${descriptor?.dataset_key} != `
      + expectedDatasetKey,
    );
  }
  return loadRowsFromDescriptor(descriptor);
}

async function loadRowsFromDescriptor(descriptor) {
  if (descriptor.shard_paths.length !== descriptor.shard_count) {
    throw new Error(`Shard count mismatch: ${descriptor.dataset_key}`);
  }
  const rows = [];
  for (let index = 0; index < descriptor.shard_paths.length; index += 1) {
    const { artifact } = await readVerifiedArtifact(
      descriptor.shard_paths[index],
    );
    if (artifact.content.dataset_key !== descriptor.dataset_key) {
      throw new Error(
        `Shard dataset mismatch: ${descriptor.shard_paths[index]}`,
      );
    }
    if (artifact.content.shard_index !== index + 1) {
      throw new Error(
        `Shard order mismatch: ${descriptor.shard_paths[index]}`,
      );
    }
    rows.push(...artifact.content.rows);
  }
  if (rows.length !== descriptor.row_count) {
    throw new Error(
      `Dataset row count mismatch: ${descriptor.dataset_key}`,
    );
  }
  return { descriptor, rows };
}

function mapBy(rows, key) {
  return new Map(rows.map((row) => [row[key], row]));
}

function cardCandidateRow({
  reconciliation,
  master,
  family,
  set,
  lane,
}) {
  const liveMatch = set.live_matches?.length === 1
    ? set.live_matches[0]
    : null;
  return {
    candidate_key: reconciliation.jpn_card_identity_key,
    promotion_lane: lane,
    target_set: {
      jpn_set_key: reconciliation.jpn_set_key,
      live_set_id: lane === 'existing_set' ? liveMatch?.id ?? null : null,
      live_set_code: lane === 'existing_set' ? liveMatch?.code ?? null : null,
      prerequisite: lane === 'existing_set'
        ? 'none'
        : 'promote_set_candidate_first',
    },
    printed_identity: {
      printed_name_ja: reconciliation.printed_name_ja,
      collector_facing_name_en: reconciliation.display_name_en,
      collector_facing_name_source: reconciliation.display_name_source,
      printed_number: reconciliation.printed_number,
      language: master.language,
      market: master.market,
      card_domain: master.card_domain,
      card_type: master.card_type,
      identity_modifiers: master.identity_modifiers ?? [],
    },
    family_relationship: {
      family_key: reconciliation.family_key,
      family_status: reconciliation.family_status,
      relationship_type: family?.relationship_type ?? null,
      species_id: family?.species_id ?? null,
      confidence: family?.confidence ?? null,
      review_status: family?.review_status ?? null,
    },
    source_evidence: {
      source_ids: unique(master.source_ids),
      independent_source_families: unique(
        master.independent_source_families,
      ),
      source_assertion_keys: unique(master.source_assertion_keys),
      baseline_evidence_ids: unique(master.baseline_evidence_ids),
      official_source_present: master.official_source_present === true,
      human_readable_source_present:
        master.human_readable_source_present === true,
    },
    image_evidence: {
      candidate_count: reconciliation.indexed_image_candidate_count,
      urls: unique(master.image_urls),
    },
    future_target_objects: [
      'set_reference',
      'card_print_parent',
      'card_print_identity',
      'source_evidence',
      'family_review_or_species_link',
      'public_child_printing_after_separate_visibility_gate',
    ],
    generated_database_identifiers: false,
    generated_public_gv_id: false,
    promotion_blockers: [],
  };
}

function setCandidateRow(set, masterSet, dependentCount) {
  return {
    candidate_key: set.jpn_set_key,
    promotion_lane: 'set_prerequisite',
    canonical_name_ja: masterSet.canonical_name_ja,
    collector_facing_name_en: masterSet.collector_facing_name_en,
    release_kind: masterSet.release_kind,
    registry_entry_kind: masterSet.registry_entry_kind,
    release_date_evidence: masterSet.release_date_evidence ?? [],
    era_evidence: masterSet.era_evidence ?? [],
    expected_card_count_evidence:
      masterSet.expected_card_count_evidence ?? [],
    official_code_evidence: masterSet.official_code_evidence ?? [],
    source_aliases: masterSet.source_aliases ?? [],
    source_ids: masterSet.source_ids ?? [],
    independent_source_count: masterSet.independent_source_count,
    dependent_novel_card_count: dependentCount,
    generated_database_identifier: false,
    generated_public_route: false,
    promotion_blockers: [],
  };
}

function novelReviewRow(reconciliation, master) {
  return {
    candidate_key: reconciliation.jpn_card_identity_key,
    entity_kind: 'novel_card_identity',
    jpn_set_key: reconciliation.jpn_set_key,
    printed_name_ja: reconciliation.printed_name_ja,
    collector_facing_name_en: reconciliation.display_name_en,
    printed_number: reconciliation.printed_number,
    family_key: reconciliation.family_key,
    image_candidate_count: reconciliation.indexed_image_candidate_count,
    source_ids: unique(master.source_ids),
    promotion_blockers: reconciliation.promotion_blockers,
    proposed_resolution:
      reconciliation.promotion_blockers.includes(
        'collector_facing_english_name_missing',
      )
        ? 'resolve_collector_facing_english_name'
        : 'resolve_set_mapping',
  };
}

function setReviewRow(set, masterSet) {
  return {
    candidate_key: set.jpn_set_key,
    entity_kind: 'set_mapping',
    reconciliation_status: set.reconciliation_status,
    canonical_name_ja: masterSet.canonical_name_ja,
    collector_facing_name_en: masterSet.collector_facing_name_en,
    source_ids: masterSet.source_ids ?? [],
    live_matches: set.live_matches ?? [],
    promotion_blockers: set.promotion_blockers,
    proposed_resolution: set.proposed_action,
  };
}

function existingParentReviewRow(reconciliation, master) {
  return {
    candidate_key: reconciliation.jpn_card_identity_key,
    entity_kind: 'existing_parent',
    existing_card_print_id: reconciliation.existing_card_print_id,
    existing_gv_id: reconciliation.existing_gv_id,
    jpn_set_key: reconciliation.jpn_set_key,
    printed_name_ja: reconciliation.printed_name_ja,
    collector_facing_name_en: reconciliation.display_name_en,
    printed_number: reconciliation.printed_number,
    core_drift_fields: reconciliation.core_drift_fields,
    promotion_blockers: reconciliation.promotion_blockers,
    missing_source_families: reconciliation.missing_source_families,
    source_ids: unique(master.source_ids),
    proposed_resolution: reconciliation.proposed_action,
  };
}

function evidenceGapReviewRow(reconciliation) {
  return {
    candidate_key: reconciliation.jpn_card_identity_key,
    candidate_kind: reconciliation.candidate_kind,
    jpn_set_key: reconciliation.jpn_set_key,
    printed_name_ja: reconciliation.printed_name_ja,
    printed_number: reconciliation.printed_number,
    expected_source_families: reconciliation.expected_source_families,
    missing_source_families: reconciliation.missing_source_families,
    promotion_readiness: reconciliation.promotion_readiness,
  };
}

export function buildPromotionLanes({
  reconciliationCards,
  reconciliationSets,
  masterCards,
  masterSets,
  familyRows,
}) {
  const masterCardByKey = mapBy(masterCards, 'jpn_card_identity_key');
  const masterSetByKey = mapBy(masterSets, 'jpn_set_key');
  const familyByKey = mapBy(familyRows, 'jpn_card_identity_key');
  const setByKey = mapBy(reconciliationSets, 'jpn_set_key');

  const directReconciliation = reconciliationCards.filter(
    (row) => row.promotion_readiness === 'delta_candidate',
  );
  const dependentReconciliation = reconciliationCards.filter(
    (row) => row.promotion_readiness === 'delta_candidate_after_set_insert',
  );
  const blockedReconciliation = reconciliationCards.filter(
    (row) => row.promotion_readiness === 'blocked',
  );
  const setInsertReconciliation = reconciliationSets.filter(
    (row) => row.promotion_readiness === 'set_insert_candidate',
  );

  const dependentCounts = {};
  for (const row of dependentReconciliation) {
    dependentCounts[row.jpn_set_key] =
      (dependentCounts[row.jpn_set_key] ?? 0) + 1;
  }

  const directCardCandidates = directReconciliation.map((row) =>
    cardCandidateRow({
      reconciliation: row,
      master: masterCardByKey.get(row.jpn_card_identity_key),
      family: familyByKey.get(row.jpn_card_identity_key),
      set: setByKey.get(row.jpn_set_key),
      lane: 'existing_set',
    }));
  const setDependentCardCandidates = dependentReconciliation.map((row) =>
    cardCandidateRow({
      reconciliation: row,
      master: masterCardByKey.get(row.jpn_card_identity_key),
      family: familyByKey.get(row.jpn_card_identity_key),
      set: setByKey.get(row.jpn_set_key),
      lane: 'set_prerequisite',
    }));
  const setInsertCandidates = setInsertReconciliation.map((row) =>
    setCandidateRow(
      row,
      masterSetByKey.get(row.jpn_set_key),
      dependentCounts[row.jpn_set_key] ?? 0,
    ));

  const novelBlockedReview = blockedReconciliation.map((row) =>
    novelReviewRow(
      row,
      masterCardByKey.get(row.jpn_card_identity_key),
    ));
  const setMappingReview = reconciliationSets
    .filter((row) => row.promotion_readiness === 'blocked')
    .map((row) => setReviewRow(
      row,
      masterSetByKey.get(row.jpn_set_key),
    ));
  const existingParentReview = reconciliationCards
    .filter((row) => row.promotion_readiness === 'blocked_existing_review')
    .map((row) => existingParentReviewRow(
      row,
      masterCardByKey.get(row.jpn_card_identity_key),
    ));
  const evidenceGapReview = reconciliationCards
    .filter((row) => row.missing_source_families.length > 0)
    .map(evidenceGapReviewRow);

  return {
    direct_card_candidates: sortRows(
      directCardCandidates,
      ['jpn_set_key', 'printed_number', 'candidate_key'],
    ),
    set_insert_candidates: sortRows(
      setInsertCandidates,
      ['candidate_key'],
    ),
    set_dependent_card_candidates: sortRows(
      setDependentCardCandidates,
      ['jpn_set_key', 'printed_number', 'candidate_key'],
    ),
    novel_blocked_review: sortRows(
      novelBlockedReview,
      ['jpn_set_key', 'printed_number', 'candidate_key'],
    ),
    set_mapping_review: sortRows(
      setMappingReview,
      ['candidate_key'],
    ),
    existing_parent_review: sortRows(
      existingParentReview,
      ['jpn_set_key', 'printed_number', 'candidate_key'],
    ),
    evidence_gap_review: sortRows(
      evidenceGapReview,
      ['jpn_set_key', 'printed_number', 'candidate_key'],
    ),
  };
}

export function assertPromotionPackageInvariants(lanes) {
  const direct = lanes.direct_card_candidates;
  const dependent = lanes.set_dependent_card_candidates;
  const blocked = lanes.novel_blocked_review;
  const setCandidates = lanes.set_insert_candidates;
  const directKeys = new Set(direct.map((row) => row.candidate_key));
  const dependentKeys = new Set(dependent.map((row) => row.candidate_key));
  const blockedKeys = new Set(blocked.map((row) => row.candidate_key));
  const setKeys = new Set(setCandidates.map((row) => row.candidate_key));

  if (
    direct.length !== directKeys.size
    || dependent.length !== dependentKeys.size
    || blocked.length !== blockedKeys.size
  ) {
    throw new Error('Duplicate candidate key inside promotion lane');
  }
  for (const key of directKeys) {
    if (dependentKeys.has(key) || blockedKeys.has(key)) {
      throw new Error(`Candidate appears in multiple lanes: ${key}`);
    }
  }
  for (const key of dependentKeys) {
    if (blockedKeys.has(key)) {
      throw new Error(`Candidate appears in multiple lanes: ${key}`);
    }
  }
  if (direct.length + dependent.length + blocked.length !== 5_691) {
    throw new Error('Novel candidate partition does not equal 5,691');
  }
  if (
    direct.some((row) =>
      !row.target_set.live_set_id
      || row.target_set.prerequisite !== 'none')
  ) {
    throw new Error('Direct candidate is missing one live set target');
  }
  if (
    dependent.some((row) =>
      !setKeys.has(row.target_set.jpn_set_key)
      || row.target_set.prerequisite !== 'promote_set_candidate_first')
  ) {
    throw new Error('Set-dependent candidate has no set prerequisite');
  }
  if (
    [...direct, ...dependent].some((row) =>
      !row.printed_identity.collector_facing_name_en
      || row.image_evidence.candidate_count < 1
      || row.generated_database_identifiers
      || row.generated_public_gv_id)
  ) {
    throw new Error('Promotion-ready candidate violates package boundary');
  }
  if (
    setCandidates.some((row) =>
      !row.collector_facing_name_en
      || row.generated_database_identifier
      || row.generated_public_route)
  ) {
    throw new Error('Set candidate violates package boundary');
  }
}

function parseArgs(argv) {
  const options = {
    reconciliationPath: DEFAULT_RECONCILIATION_PATH,
    finalRoot: DEFAULT_FINAL_ROOT,
    outputRoot: DEFAULT_OUTPUT_ROOT,
  };
  for (const arg of argv) {
    if (arg.startsWith('--reconciliation=')) {
      options.reconciliationPath = arg.slice('--reconciliation='.length);
    } else if (arg.startsWith('--final-root=')) {
      options.finalRoot = arg.slice('--final-root='.length);
    } else if (arg.startsWith('--output-root=')) {
      options.outputRoot = arg.slice('--output-root='.length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function markdown(report) {
  const { summary } = report.content;
  const lines = [
    '# Japanese Master Index V4 No-Write Promotion Package',
    '',
    `Status: \`${report.content.status}\``,
    '',
    '## Boundary',
    '',
    '- Local verified artifacts only',
    '- Database reads: false',
    '- Database writes: false',
    '- SQL generated: false',
    '- Database UUIDs generated: false',
    '- Public GV IDs generated: false',
    '- English mutation: false',
    '- Promotion approval implied: false',
    '',
    '## Promotion Lanes',
    '',
    `- Direct cards targeting existing sets: ${summary.direct_card_candidates}`,
    `- New set prerequisites: ${summary.set_insert_candidates}`,
    `- Cards dependent on new sets: ${summary.set_dependent_card_candidates}`,
    `- Total promotion-ready cards: ${summary.total_promotion_ready_cards}`,
    `- Promotion-ready cards with image evidence: ${summary.ready_cards_with_image_evidence}`,
    '',
    '## Review Lanes',
    '',
    `- Novel blocked cards: ${summary.novel_blocked_review}`,
    `- Sets requiring mapping review: ${summary.set_mapping_review}`,
    `- Existing parents with promotion blockers: ${summary.existing_parent_review}`,
    `- Cards missing expected evidence lanes: ${summary.evidence_gap_review}`,
    '',
    '## Novel Blockers',
    '',
    '| Blocker | Rows |',
    '|---|---:|',
    ...Object.entries(report.content.novel_blocker_counts)
      .map(([blocker, count]) => `| ${blocker} | ${count} |`),
    '',
    'This package is planning evidence only. It is not an executable payload.',
    '',
  ];
  return lines.join('\n');
}

export async function runPromotionPackage({
  reconciliationPath = DEFAULT_RECONCILIATION_PATH,
  finalRoot = DEFAULT_FINAL_ROOT,
  outputRoot = DEFAULT_OUTPUT_ROOT,
  generatedAt = new Date().toISOString(),
} = {}) {
  const [
    reconciliationRecord,
    masterCards,
    masterSets,
    familyRows,
  ] = await Promise.all([
    readVerifiedArtifact(reconciliationPath),
    loadDescriptorDataset(
      path.join(finalRoot, 'jpn_master_admissible_cards_v1.json'),
      'master_admissible_card_rows_v1',
    ),
    loadDescriptorDataset(
      path.join(finalRoot, 'jpn_master_admissible_sets_v1.json'),
      'master_admissible_set_rows_v1',
    ),
    loadDescriptorDataset(
      path.join(finalRoot, 'jpn_master_family_relationships_v1.json'),
      'master_family_relationship_rows_v1',
    ),
  ]);
  const reconciliation = reconciliationRecord.artifact;
  const [reconciliationCards, reconciliationSets] = await Promise.all([
    loadRowsFromDescriptor(reconciliation.content.card_dataset),
    loadRowsFromDescriptor(reconciliation.content.set_dataset),
  ]);

  if (!reconciliation.content.english_family_proof.unchanged) {
    throw new Error('Reconciliation did not preserve English family state');
  }

  const lanes = buildPromotionLanes({
    reconciliationCards: reconciliationCards.rows,
    reconciliationSets: reconciliationSets.rows,
    masterCards: masterCards.rows,
    masterSets: masterSets.rows,
    familyRows: familyRows.rows,
  });
  assertPromotionPackageInvariants(lanes);

  const retrieval = {
    access_mode: 'local_verified_artifacts_only',
    database_access: false,
    source_fetches: false,
    storage_access: false,
  };
  const datasets = {};
  for (const spec of DATASET_SPECS) {
    datasets[spec.key] = await writeShardedRows({
      outputRoot,
      datasetKey: spec.datasetKey,
      packageId: spec.packageId,
      rows: lanes[spec.key],
      generatedAt,
      retrieval,
    });
  }

  const readyCards = [
    ...lanes.direct_card_candidates,
    ...lanes.set_dependent_card_candidates,
  ];
  const summary = {
    direct_card_candidates: lanes.direct_card_candidates.length,
    set_insert_candidates: lanes.set_insert_candidates.length,
    set_dependent_card_candidates:
      lanes.set_dependent_card_candidates.length,
    total_promotion_ready_cards: readyCards.length,
    ready_cards_with_image_evidence:
      readyCards.filter((row) => row.image_evidence.candidate_count > 0).length,
    novel_blocked_review: lanes.novel_blocked_review.length,
    set_mapping_review: lanes.set_mapping_review.length,
    existing_parent_review: lanes.existing_parent_review.length,
    evidence_gap_review: lanes.evidence_gap_review.length,
  };
  const content = {
    status: 'complete_no_write_promotion_package',
    generator_version: PROMOTION_PACKAGE_VERSION,
    execution_boundary: {
      database_reads: false,
      database_writes: false,
      storage_writes: false,
      source_fetches: false,
      sql_generated: false,
      database_identifiers_generated: false,
      public_gv_ids_generated: false,
      identity_writes: false,
      family_promotion: false,
      english_mutation: false,
      promotion_approval_implied: false,
    },
    source_fingerprints: {
      reconciliation:
        reconciliation.content_fingerprint_sha256,
      reconciliation_cards:
        reconciliation.content.card_dataset.content_fingerprint_sha256,
      reconciliation_sets:
        reconciliation.content.set_dataset.content_fingerprint_sha256,
      master_cards: masterCards.descriptor.content_fingerprint_sha256,
      master_sets: masterSets.descriptor.content_fingerprint_sha256,
      master_families: familyRows.descriptor.content_fingerprint_sha256,
      english_family:
        reconciliation.content.english_family_proof
          .live_combined_fingerprint_sha256,
    },
    summary,
    novel_blocker_counts: countArrayValues(
      lanes.novel_blocked_review,
      'promotion_blockers',
    ),
    datasets,
  };
  const report = buildArtifact({
    packageId: 'JPN-MASTER-INDEX-PROMOTION-PACKAGE-V1',
    generatedAt,
    retrieval,
    content,
  });
  await writeJsonArtifact(
    path.join(outputRoot, 'jpn_promotion_package_v1.json'),
    report,
  );
  await fs.mkdir(outputRoot, { recursive: true });
  await fs.writeFile(
    path.join(outputRoot, 'jpn_promotion_package_v1.md'),
    markdown(report),
  );
  return report;
}

async function main() {
  const argv = process.argv.slice(2);
  assertAuditOnlyArgs(argv);
  const options = parseArgs(argv);
  const report = await runPromotionPackage(options);
  process.stdout.write(stableJson({
    status: report.content.status,
    content_fingerprint_sha256: report.content_fingerprint_sha256,
    summary: report.content.summary,
  }));
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
