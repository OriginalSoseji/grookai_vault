import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import {
  ARTIFACT_ROWS_VERSION,
  loadVerifiedShardedDataset,
  readVerifiedArtifact,
  writeShardedRows,
} from './artifact_rows_v1.mjs';
import {
  buildJapaneseCandidateUnion,
  CANDIDATE_RESOLUTION_VERSION,
} from './candidate_resolution_v1.mjs';
import {
  buildArtifact,
  contentFingerprint,
  sha256,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';
import {
  validateJapaneseCardAssertion,
} from './card_assertion_contract_v1.mjs';

export const CANDIDATE_UNION_VERSION =
  'JPN-MASTER-INDEX-CANDIDATE-UNION-V1';

const DEFAULT_BASELINE_MANIFEST =
  'docs/audits/japanese_master_index_v4/baseline/'
  + 'live_jpn_row_baseline_manifest_v1.json';
const DEFAULT_SET_REGISTRY =
  'docs/audits/japanese_master_index_v4/sets/jpn_set_registry_v1.json';
const DEFAULT_ALIAS_MAP =
  'docs/audits/japanese_master_index_v4/sets/jpn_set_alias_map_v1.json';
const DEFAULT_ACQUISITION_PLAN =
  'docs/audits/japanese_master_index_v4/cards/'
  + 'card_acquisition_plan_v1.json';
const DEFAULT_CARDS_ROOT =
  'docs/audits/japanese_master_index_v4/cards';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v4/index';
const DEFAULT_TARGETED_QUEUE =
  'docs/audits/japanese_master_index_v4/index/'
  + 'targeted_source_queue_v1.json';

const PRIMARY_SOURCE_ARTIFACTS = Object.freeze([
  {
    laneId: 'artofpkm_jp_cards',
    assertionFile: 'artofpkm_jp_card_assertions_v1.json.gz',
    sourceTier: 'primary',
  },
  {
    laneId: 'limitless_jp_cards',
    assertionFile: 'limitless_jp_card_assertions_v1.json.gz',
    sourceTier: 'primary',
  },
  {
    laneId: 'official_jp_cards',
    assertionFile: 'official_jp_card_assertions_v1.json.gz',
    sourceTier: 'primary',
  },
  {
    laneId: 'serebii_jp_cards',
    assertionFile: 'serebii_jp_card_assertions_v1.json.gz',
    sourceTier: 'primary',
  },
  {
    laneId: 'tcgdex_ja_cards',
    assertionFile: 'tcgdex_ja_card_assertions_v1.json.gz',
    sourceTier: 'primary',
  },
]);

const TARGETED_SOURCE_ARTIFACTS = Object.freeze([
  {
    laneId: 'bulbapedia_jp_card_lists',
    assertionFile: 'bulbapedia_jp_card_assertions_v1.json.gz',
    sourceTier: 'targeted',
  },
  {
    laneId: 'pokeguardian_release_reports',
    assertionFile: 'pokeguardian_jp_card_assertions_v1.json.gz',
    sourceTier: 'targeted',
  },
]);

const BASELINE_DATASET_KEYS = Object.freeze([
  'live_jpn_parent_rows_v1',
  'live_jpn_identity_rows_v1',
  'live_jpn_evidence_rows_v1',
  'live_jpn_printing_rows_v1',
  'live_jpn_family_review_rows_v1',
  'live_jpn_species_link_rows_v1',
  'language_agnostic_species_rows_v1',
  'english_family_card_rows_v1',
  'english_family_species_link_rows_v1',
]);

function parseArgs(argv) {
  const options = {
    baselineManifest: DEFAULT_BASELINE_MANIFEST,
    setRegistry: DEFAULT_SET_REGISTRY,
    aliasMap: DEFAULT_ALIAS_MAP,
    acquisitionPlan: DEFAULT_ACQUISITION_PLAN,
    cardsRoot: DEFAULT_CARDS_ROOT,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    targetedQueue: DEFAULT_TARGETED_QUEUE,
    includeTargetedSources: false,
    allowIncompleteSources: false,
    generatedAt: null,
  };

  for (const arg of argv) {
    if (arg === '--allow-incomplete-sources') {
      options.allowIncompleteSources = true;
    } else if (arg.startsWith('--baseline-manifest=')) {
      options.baselineManifest = arg.slice('--baseline-manifest='.length);
    } else if (arg.startsWith('--set-registry=')) {
      options.setRegistry = arg.slice('--set-registry='.length);
    } else if (arg.startsWith('--alias-map=')) {
      options.aliasMap = arg.slice('--alias-map='.length);
    } else if (arg.startsWith('--acquisition-plan=')) {
      options.acquisitionPlan = arg.slice('--acquisition-plan='.length);
    } else if (arg.startsWith('--cards-root=')) {
      options.cardsRoot = arg.slice('--cards-root='.length);
    } else if (arg.startsWith('--output-root=')) {
      options.outputRoot = arg.slice('--output-root='.length);
    } else if (arg === '--include-targeted-sources') {
      options.includeTargetedSources = true;
    } else if (arg.startsWith('--targeted-queue=')) {
      options.targetedQueue = arg.slice('--targeted-queue='.length);
    } else if (arg.startsWith('--generated-at=')) {
      options.generatedAt = arg.slice('--generated-at='.length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function loadSourceAssertions({
  cardsRoot,
  acquisitionPlan,
  targetedQueue,
  sourceSpecs,
  allowIncompleteSources,
}) {
  const expectedByLane = new Map();
  for (const item of acquisitionPlan.content.work_items) {
    if (item.disposition !== 'scheduled') continue;
    expectedByLane.set(
      item.lane_id,
      (expectedByLane.get(item.lane_id) ?? 0) + 1,
    );
  }
  for (const item of targetedQueue?.content.work_items ?? []) {
    expectedByLane.set(
      item.lane_id,
      (expectedByLane.get(item.lane_id) ?? 0) + 1,
    );
  }

  const sources = [];
  const incomplete = [];
  for (const source of sourceSpecs) {
    const artifactPath = path.join(cardsRoot, source.assertionFile);
    let loaded;
    try {
      loaded = await readVerifiedArtifact(artifactPath);
    } catch (error) {
      incomplete.push({
        lane_id: source.laneId,
        expected_container_count: expectedByLane.get(source.laneId) ?? 0,
        harvested_container_count: 0,
        reason: `artifact_unavailable:${error.message}`,
      });
      continue;
    }

    const assertions = loaded.artifact.content.assertions ?? [];
    const summary = loaded.artifact.content.summary ?? {};
    const expectedContainerCount = expectedByLane.get(source.laneId) ?? 0;
    const selectedContainerCount = summary.selected_container_count ?? 0;
    const trackedContainerCount = summary.tracked_container_count ?? 0;
    const isComplete = (
      expectedContainerCount === selectedContainerCount
      && selectedContainerCount === trackedContainerCount
    );
    if (!isComplete) {
      incomplete.push({
        lane_id: source.laneId,
        expected_container_count: expectedContainerCount,
        harvested_container_count: selectedContainerCount,
        tracked_container_count: trackedContainerCount,
        reason: 'scheduled_container_coverage_incomplete',
      });
    }

    const invalidAssertions = [];
    for (const assertion of assertions) {
      const validation = validateJapaneseCardAssertion(assertion);
      if (!validation.valid) {
        invalidAssertions.push({
          assertion_key: assertion.assertion_key,
          errors: validation.errors,
        });
      }
    }
    if (invalidAssertions.length > 0) {
      throw new Error(
        `${source.laneId} has ${invalidAssertions.length} invalid assertions`,
      );
    }
    if (
      summary.assertion_fingerprint_sha256
      && summary.assertion_fingerprint_sha256
        !== contentFingerprint(assertions)
    ) {
      throw new Error(
        `Assertion fingerprint mismatch: ${source.laneId}`,
      );
    }

    sources.push({
      laneId: source.laneId,
      sourceTier: source.sourceTier,
      assertions,
      artifactPath: artifactPath.replaceAll('\\', '/'),
      artifactContentFingerprint:
        loaded.artifact.content_fingerprint_sha256,
      assertionFingerprint: contentFingerprint(assertions),
      expectedContainerCount,
      selectedContainerCount,
      trackedContainerCount,
      sourceStatusCounts: summary.container_status_counts ?? {},
      failedContainerCount: summary.failed_container_count ?? 0,
      isComplete,
    });
  }

  if (incomplete.length > 0 && !allowIncompleteSources) {
    throw new Error(
      'Selected source harvest incomplete. Re-run after harvest completion '
      + 'or use --allow-incomplete-sources for an explicitly provisional '
      + `projection. ${JSON.stringify(incomplete)}`,
    );
  }

  return { sources, incomplete };
}

function markdownSummary({
  generatedAt,
  status,
  sourceStatuses,
  result,
  datasets,
}) {
  const lines = [
    '# Japanese Master Index V4 Candidate Union',
    '',
    `Generated: \`${generatedAt}\``,
    `Status: \`${status}\``,
    '',
    '## Boundary',
    '',
    '- Database writes: `false`',
    '- Storage writes: `false`',
    '- Canonical ID allocation: `false`',
    '- English family mutation: `false`',
    '',
    '## Included Sources',
    '',
    '| Tier | Lane | Containers | Assertions | Status |',
    '|---|---|---:|---:|---|',
    ...sourceStatuses.map((source) => (
      `| ${source.source_tier} | ${source.lane_id}`
      + ` | ${source.harvested_container_count}`
      + ` / ${source.expected_container_count}`
      + ` | ${source.assertion_count}`
      + ` | ${source.complete ? 'complete' : 'incomplete'} |`
    )),
    '',
    '## Candidate Summary',
    '',
    `- Existing JPN parents: **${result.summary.existing_jpn_parent_count}**`,
    `- Fresh source assertions: **${result.summary.fresh_source_assertion_count}**`,
    `- Novel conservative candidates: **${result.summary.novel_index_candidate_count}**`,
    `- Source-isolated review candidates: **${result.summary.source_isolated_review_candidate_count}**`,
    `- Unresolved source assertions: **${result.summary.unresolved_assertion_count}**`,
    `- Conservative distinct identity lower bound: **${result.summary.conservative_distinct_identity_lower_bound}**`,
    `- Source-isolated upper bound: **${result.summary.source_isolated_distinct_identity_upper_bound}**`,
    `- Conflict rows: **${result.summary.conflict_count}**`,
    `- Exact novel species projections: **${result.summary.novel_exact_species_projection_count}**`,
    '',
    '## Datasets',
    '',
    '| Dataset | Rows | Fingerprint |',
    '|---|---:|---|',
    ...datasets.map((dataset) => (
      `| ${dataset.dataset_key} | ${dataset.row_count}`
      + ` | \`${dataset.content_fingerprint_sha256}\` |`
    )),
    '',
    'All novel IDs in these artifacts are logical candidate keys only. '
      + 'Nothing in this package is a database promotion payload.',
    '',
  ];
  return lines.join('\n');
}

export async function runCandidateUnion(options) {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const [
    registryArtifact,
    aliasArtifact,
    acquisitionPlanArtifact,
  ] = await Promise.all([
    readVerifiedArtifact(options.setRegistry),
    readVerifiedArtifact(options.aliasMap),
    readVerifiedArtifact(options.acquisitionPlan),
  ]);
  const targetedQueueArtifact = options.includeTargetedSources
    ? await readVerifiedArtifact(options.targetedQueue)
    : null;
  if (
    targetedQueueArtifact
    && targetedQueueArtifact.artifact.package_id
      !== 'JPN-MASTER-INDEX-TARGETED-SOURCE-QUEUE-V1'
  ) {
    throw new Error(
      `Unexpected targeted queue package: ${targetedQueueArtifact.artifact.package_id}`,
    );
  }
  const sourceSpecs = options.includeTargetedSources
    ? [...PRIMARY_SOURCE_ARTIFACTS, ...TARGETED_SOURCE_ARTIFACTS]
    : [...PRIMARY_SOURCE_ARTIFACTS];

  const baseline = {};
  for (const datasetKey of BASELINE_DATASET_KEYS) {
    baseline[datasetKey] = (
      await loadVerifiedShardedDataset({
        manifestPath: options.baselineManifest,
        datasetKey,
      })
    ).rows;
  }
  const { sources, incomplete } = await loadSourceAssertions({
    cardsRoot: options.cardsRoot,
    acquisitionPlan: acquisitionPlanArtifact.artifact,
    targetedQueue: targetedQueueArtifact?.artifact ?? null,
    sourceSpecs,
    allowIncompleteSources: options.allowIncompleteSources,
  });

  const result = buildJapaneseCandidateUnion({
    parents: baseline.live_jpn_parent_rows_v1,
    identityRows: baseline.live_jpn_identity_rows_v1,
    evidenceRows: baseline.live_jpn_evidence_rows_v1,
    printingRows: baseline.live_jpn_printing_rows_v1,
    familyReviewRows: baseline.live_jpn_family_review_rows_v1,
    jpnSpeciesLinks: baseline.live_jpn_species_link_rows_v1,
    speciesRows: baseline.language_agnostic_species_rows_v1,
    englishFamilyCards: baseline.english_family_card_rows_v1,
    englishFamilySpeciesLinks:
      baseline.english_family_species_link_rows_v1,
    registryEntries:
      registryArtifact.artifact.content.registry_entries,
    aliases: aliasArtifact.artifact.content.aliases,
    sourceAssertions: sources,
  });

  const retrieval = {
    access_mode: 'local_verified_artifacts_only',
    database_access: false,
    storage_access: false,
    source_fetches: false,
  };
  const datasetSpecs = [
    [
      'source_assertion_union_rows_v1',
      'JPN-SOURCE-ASSERTION-UNION-ROWS-SHARD-V1',
      result.sourceAssertionUnion,
    ],
    [
      'assertion_resolution_rows_v1',
      'JPN-ASSERTION-RESOLUTION-ROWS-SHARD-V1',
      result.assertionResolutions,
    ],
    [
      'identity_candidate_rows_v1',
      'JPN-IDENTITY-CANDIDATE-ROWS-SHARD-V1',
      result.identityCandidates,
    ],
    [
      'printing_candidate_rows_v1',
      'JPN-PRINTING-CANDIDATE-ROWS-SHARD-V1',
      result.printingCandidates,
    ],
    [
      'master_family_card_nodes_v1',
      'MASTER-FAMILY-CARD-NODES-SHARD-V1',
      result.familyCardNodes,
    ],
    [
      'master_family_species_links_v1',
      'MASTER-FAMILY-SPECIES-LINKS-SHARD-V1',
      result.familySpeciesLinks,
    ],
    [
      'novel_family_projection_rows_v1',
      'JPN-NOVEL-FAMILY-PROJECTION-ROWS-SHARD-V1',
      result.familyProjectionRows,
    ],
    [
      'candidate_conflict_rows_v1',
      'JPN-CANDIDATE-CONFLICT-ROWS-SHARD-V1',
      result.conflicts,
    ],
  ];
  const datasets = [];
  for (const [datasetKey, packageId, rows] of datasetSpecs) {
    datasets.push(await writeShardedRows({
      outputRoot: options.outputRoot,
      datasetKey,
      packageId,
      rows,
      generatedAt,
      retrieval,
    }));
  }

  const sourceStatuses = sourceSpecs.map((spec) => {
    const source = sources.find((row) => row.laneId === spec.laneId);
    const incompleteRow = incomplete.find(
      (row) => row.lane_id === spec.laneId,
    );
    return {
      lane_id: spec.laneId,
      source_tier: spec.sourceTier,
      expected_container_count:
        source?.expectedContainerCount
        ?? incompleteRow?.expected_container_count
        ?? 0,
      harvested_container_count:
        source?.selectedContainerCount
        ?? incompleteRow?.harvested_container_count
        ?? 0,
      tracked_container_count:
        source?.trackedContainerCount
        ?? incompleteRow?.tracked_container_count
        ?? 0,
      assertion_count: source?.assertions.length ?? 0,
      assertion_fingerprint_sha256:
        source?.assertionFingerprint ?? null,
      source_status_counts: source?.sourceStatusCounts ?? {},
      failed_container_count: source?.failedContainerCount ?? null,
      complete: source?.isComplete ?? false,
      incomplete_reason: incompleteRow?.reason ?? null,
    };
  });
  const status = incomplete.length > 0
    ? 'provisional_incomplete_sources'
    : options.includeTargetedSources
      ? 'complete_primary_and_targeted_source_union'
      : 'complete_primary_source_union';
  const manifestContent = {
    generator_version: CANDIDATE_UNION_VERSION,
    resolution_version: CANDIDATE_RESOLUTION_VERSION,
    artifact_rows_version: ARTIFACT_ROWS_VERSION,
    status,
    targeted_sources_included: options.includeTargetedSources,
    source_statuses: sourceStatuses,
    incomplete_sources: incomplete,
    baseline_manifest: options.baselineManifest.replaceAll('\\', '/'),
    baseline_manifest_fingerprint_sha256: (
      await readVerifiedArtifact(options.baselineManifest)
    ).artifact.content_fingerprint_sha256,
    set_registry_fingerprint_sha256:
      registryArtifact.artifact.content_fingerprint_sha256,
    alias_map_fingerprint_sha256:
      aliasArtifact.artifact.content_fingerprint_sha256,
    acquisition_plan_fingerprint_sha256:
      acquisitionPlanArtifact.artifact.content_fingerprint_sha256,
    targeted_queue_fingerprint_sha256:
      targetedQueueArtifact?.artifact.content_fingerprint_sha256 ?? null,
    summary: result.summary,
    datasets,
    execution_boundary: {
      database_writes: false,
      storage_writes: false,
      source_fetches: false,
      canonical_id_allocation: false,
      family_promotion: false,
      english_mutation: false,
    },
  };
  const manifestArtifact = buildArtifact({
    packageId: 'JPN-MASTER-INDEX-CANDIDATE-UNION-MANIFEST-V1',
    generatedAt,
    retrieval,
    content: manifestContent,
  });
  const manifestPath = path.join(
    options.outputRoot,
    'candidate_union_manifest_v1.json',
  );
  const manifestRecord = await writeJsonArtifact(
    manifestPath,
    manifestArtifact,
  );

  const markdown = markdownSummary({
    generatedAt,
    status,
    sourceStatuses,
    result,
    datasets,
  });
  const markdownPath = path.join(
    options.outputRoot,
    'candidate_union_summary_v1.md',
  );
  await fs.mkdir(path.dirname(markdownPath), { recursive: true });
  await fs.writeFile(markdownPath, markdown, 'utf8');

  return {
    manifest_path: manifestRecord.path,
    summary_path: markdownPath.replaceAll('\\', '/'),
    status: manifestContent.status,
    summary: result.summary,
    package_fingerprint_sha256:
      manifestArtifact.content_fingerprint_sha256,
    source_statuses: sourceStatuses,
    output_fingerprint_sha256: sha256(
      datasets
        .map((dataset) => (
          `${dataset.dataset_key}:${dataset.content_fingerprint_sha256}`
        ))
        .join('|'),
    ),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runCandidateUnion(options);
  console.log(JSON.stringify(result, null, 2));
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
