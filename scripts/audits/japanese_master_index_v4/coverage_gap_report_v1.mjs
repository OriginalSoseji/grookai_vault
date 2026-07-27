import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import {
  loadVerifiedDatasetFromManifest,
  readVerifiedArtifact,
} from './artifact_rows_v1.mjs';
import {
  buildArtifact,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';

export const COVERAGE_GAP_REPORT_VERSION =
  'JPN-MASTER-INDEX-COVERAGE-GAP-REPORT-V1';

const DEFAULT_INDEX_ROOT =
  'docs/audits/japanese_master_index_v4/index';
const DEFAULT_CARDS_ROOT =
  'docs/audits/japanese_master_index_v4/cards';
const DEFAULT_SETS_ROOT =
  'docs/audits/japanese_master_index_v4/sets';

const HEALTH_FILES = Object.freeze(new Map([
  ['artofpkm_jp_cards', 'artofpkm_jp_card_source_health_v1.json'],
  ['limitless_jp_cards', 'limitless_jp_card_source_health_v1.json'],
  ['official_jp_cards', 'official_jp_card_source_health_v1.json'],
  ['serebii_jp_cards', 'serebii_jp_card_source_health_v1.json'],
  ['tcgdex_ja_cards', 'tcgdex_ja_card_source_health_v1.json'],
  ['bulbapedia_jp_card_lists', 'bulbapedia_jp_card_source_health_v1.json'],
  [
    'pokeguardian_release_reports',
    'pokeguardian_jp_card_source_health_v1.json',
  ],
]));

function parseArgs(argv) {
  const options = {
    indexRoot: DEFAULT_INDEX_ROOT,
    cardsRoot: DEFAULT_CARDS_ROOT,
    setsRoot: DEFAULT_SETS_ROOT,
    generatedAt: null,
  };
  for (const arg of argv) {
    if (arg.startsWith('--index-root=')) {
      options.indexRoot = arg.slice('--index-root='.length);
    } else if (arg.startsWith('--cards-root=')) {
      options.cardsRoot = arg.slice('--cards-root='.length);
    } else if (arg.startsWith('--sets-root=')) {
      options.setsRoot = arg.slice('--sets-root='.length);
    } else if (arg.startsWith('--generated-at=')) {
      options.generatedAt = arg.slice('--generated-at='.length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
    .sort((left, right) => String(left).localeCompare(String(right), 'ja'));
}

function countBy(rows, keyBuilder) {
  const counts = {};
  for (const row of rows) {
    const key = keyBuilder(row);
    if (!key) continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(
      ([left], [right]) => left.localeCompare(right),
    ),
  );
}

function addMapArray(map, key, value) {
  if (!key) return;
  const rows = map.get(key) ?? [];
  rows.push(value);
  map.set(key, rows);
}

async function loadDataset(manifestPath, datasetKey) {
  return (
    await loadVerifiedDatasetFromManifest({
      manifestPath,
      datasetKey,
      expectedManifestPackageId:
        'JPN-MASTER-INDEX-CANDIDATE-UNION-MANIFEST-V1',
    })
  ).rows;
}

async function loadHealth(cardsRoot, laneId) {
  const filename = HEALTH_FILES.get(laneId);
  if (!filename) return null;
  try {
    return (
      await readVerifiedArtifact(path.join(cardsRoot, filename))
    ).artifact.content;
  } catch {
    return null;
  }
}

export function buildSourceExhaustionRows({
  acquisitionPlan,
  unionManifest,
  healthByLane,
}) {
  const sourceStatusByLane = new Map(
    unionManifest.content.source_statuses.map(
      (row) => [row.lane_id, row],
    ),
  );
  return acquisitionPlan.content.source_inventory.map((source) => {
    const laneId = source.lane_id;
    const status = sourceStatusByLane.get(laneId) ?? null;
    const health = healthByLane.get(laneId) ?? null;
    const healthCounts = health?.summary?.container_status_counts
      ?? status?.source_status_counts
      ?? {};
    const healthFindingCount = Object.entries(healthCounts)
      .filter(([key]) => key !== 'complete')
      .reduce((sum, [, count]) => sum + count, 0);

    let exhaustionStatus = 'not_a_card_harvest_lane';
    if (source.automatic_status === 'blocked_without_written_permission') {
      exhaustionStatus = 'preserved_manual_only';
    } else if (source.disposition_counts?.scheduled) {
      if (!status?.complete) {
        exhaustionStatus = 'primary_harvest_incomplete';
      } else if (healthFindingCount > 0) {
        exhaustionStatus = 'primary_exhausted_with_explicit_findings';
      } else {
        exhaustionStatus = 'primary_exhausted_clean';
      }
    } else if (source.disposition_counts?.targeted_after_primary_delta) {
      if (status?.complete && healthFindingCount > 0) {
        exhaustionStatus = 'targeted_exhausted_with_explicit_findings';
      } else if (status?.complete) {
        exhaustionStatus = 'targeted_exhausted_clean';
      } else if (unionManifest.content.targeted_sources_included) {
        exhaustionStatus = 'targeted_harvest_incomplete';
      } else {
        exhaustionStatus = 'targeted_lane_pending_measured_delta';
      }
    } else if (source.disposition_counts?.release_context_only) {
      exhaustionStatus = 'release_context_only';
    } else if (
      source.automatic_status === 'gap_targeted_after_primary_harvest'
    ) {
      exhaustionStatus = source.work_item_count > 0
        ? 'gap_targeted_lane_not_yet_invoked'
        : 'future_lane_without_governed_work_items';
    }

    return {
      lane_id: laneId,
      source_set_id: source.source_set_id ?? null,
      source_family: source.source_family ?? null,
      acquisition_tier: source.acquisition_tier ?? null,
      automatic_status: source.automatic_status,
      disposition_counts: source.disposition_counts,
      expected_scheduled_container_count:
        source.disposition_counts?.scheduled ?? 0,
      expected_targeted_container_count:
        source.disposition_counts?.targeted_after_primary_delta ?? 0,
      harvested_container_count:
        status?.harvested_container_count ?? 0,
      assertion_count: status?.assertion_count ?? 0,
      source_status_counts: healthCounts,
      health_finding_count: healthFindingCount,
      exhaustion_status: exhaustionStatus,
      preserved_live_evidence_rows: source.preserved_live_evidence_rows,
      preservation_rule: source.preservation_rule,
    };
  }).sort((left, right) => left.lane_id.localeCompare(right.lane_id));
}

export function buildTargetedSourceQueue({
  workItems,
  coverageRows,
  completedTargetedLanes = new Set(),
  generatedAt = null,
  futureOnly = false,
}) {
  const coverageByRegistry = new Map(
    coverageRows.map((row) => [row.registry_key, row]),
  );
  const asOf = generatedAt ? new Date(generatedAt) : null;
  return workItems
    .filter((item) => item.disposition === 'targeted_after_primary_delta')
    .flatMap((item) => {
      if (completedTargetedLanes.has(item.lane_id)) return [];
      const coverage = coverageByRegistry.get(item.registry_key);
      if (!coverage?.targeted_followup_required) return [];
      const releaseTimestamp = Date.parse(item.source_release_date ?? '');
      const isFuture = (
        asOf
        && Number.isFinite(releaseTimestamp)
        && releaseTimestamp > asOf.getTime()
      );
      if (futureOnly !== Boolean(isFuture)) return [];
      const severity = (
        coverage.unresolved_assertion_count > 0
        || coverage.conflict_count > 0
      )
        ? 'high'
        : coverage.fresh_assertion_count === 0
          ? 'medium'
          : 'corroboration';
      return [{
        targeted_work_item_key: item.work_item_key,
        lane_id: item.lane_id,
        registry_key: item.registry_key,
        source_container_id: item.source_container_id,
        source_container_url: item.source_container_url,
        source_native_name: item.source_native_name,
        source_release_date: item.source_release_date ?? null,
        source_expected_card_count: item.source_expected_card_count,
        priority: severity,
        measured_gap_reasons: coverage.targeted_followup_reasons,
        measured_counts: {
          fresh_assertions: coverage.fresh_assertion_count,
          novel_candidates: coverage.novel_index_candidate_count,
          source_isolated_candidates:
            coverage.source_isolated_candidate_count,
          unresolved_assertions: coverage.unresolved_assertion_count,
          conflicts: coverage.conflict_count,
        },
      }];
    })
    .sort(
      (left, right) => (
        ['high', 'medium', 'corroboration'].indexOf(left.priority)
        - ['high', 'medium', 'corroboration'].indexOf(right.priority)
        || left.registry_key.localeCompare(right.registry_key)
        || left.lane_id.localeCompare(right.lane_id)
      ),
    );
}

function markdown({
  generatedAt,
  unionStatus,
  coverageRows,
  targetedQueue,
  sourceExhaustion,
  summary,
}) {
  const sourceLines = sourceExhaustion.map((row) => (
    `| ${row.lane_id} | ${row.assertion_count}`
    + ` | ${row.exhaustion_status} |`
  ));
  return `${[
    '# Japanese Master Index V4 Coverage and Exhaustion',
    '',
    `Generated: \`${generatedAt}\``,
    `Candidate union status: \`${unionStatus}\``,
    '',
    '## Coverage',
    '',
    `- Registry releases: **${coverageRows.length}**`,
    `- Releases requiring targeted follow-up: **${summary.targeted_registry_count}**`,
    `- Targeted source work items queued: **${targetedQueue.length}**`,
    `- Future-release work items deferred: **${summary.deferred_future_targeted_work_item_count}**`,
    `- Releases with no fresh primary assertion: **${summary.no_fresh_primary_registry_count}**`,
    `- Releases with unresolved numbered assertions: **${summary.unresolved_numbered_registry_count}**`,
    `- Releases with source-isolated assertions: **${summary.source_isolated_registry_count}**`,
    '',
    '## Source Exhaustion',
    '',
    '| Lane | Assertions | Disposition |',
    '|---|---:|---|',
    ...sourceLines,
    '',
    'A source marked exhausted may still carry explicit mismatch/fetch '
      + 'findings. Those findings remain in the review queue; exhausted '
      + 'means the governed worklist was attempted, not that the source '
      + 'was silently treated as perfect.',
    '',
  ].join('\n')}`;
}

export async function runCoverageGapReport(options) {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const unionManifestPath = path.join(
    options.indexRoot,
    'candidate_union_manifest_v1.json',
  );
  const [
    unionManifest,
    acquisitionPlan,
    registryArtifact,
    sourceUnion,
    assertionResolutions,
    identityCandidates,
    familyProjections,
    conflicts,
  ] = await Promise.all([
    readVerifiedArtifact(unionManifestPath),
    readVerifiedArtifact(path.join(
      options.cardsRoot,
      'card_acquisition_plan_v1.json',
    )),
    readVerifiedArtifact(path.join(
      options.setsRoot,
      'jpn_set_registry_v1.json',
    )),
    loadDataset(unionManifestPath, 'source_assertion_union_rows_v1'),
    loadDataset(unionManifestPath, 'assertion_resolution_rows_v1'),
    loadDataset(unionManifestPath, 'identity_candidate_rows_v1'),
    loadDataset(unionManifestPath, 'novel_family_projection_rows_v1'),
    loadDataset(unionManifestPath, 'candidate_conflict_rows_v1'),
  ]);

  const healthByLane = new Map();
  for (const laneId of HEALTH_FILES.keys()) {
    healthByLane.set(
      laneId,
      await loadHealth(options.cardsRoot, laneId),
    );
  }

  const sourceRowsByRegistry = new Map();
  for (const row of sourceUnion) {
    if (row.assertion_lane !== 'fresh_source_assertion') continue;
    addMapArray(sourceRowsByRegistry, row.registry_key, row);
  }
  const resolutionsByRegistry = new Map();
  for (const row of assertionResolutions) {
    addMapArray(resolutionsByRegistry, row.registry_key, row);
  }
  const candidatesByRegistry = new Map();
  const candidateByKey = new Map();
  for (const row of identityCandidates) {
    candidateByKey.set(row.candidate_key, row);
    for (const registryKey of row.registry_keys) {
      addMapArray(candidatesByRegistry, registryKey, row);
    }
  }
  const familyByRegistry = new Map();
  for (const row of familyProjections) {
    const candidate = candidateByKey.get(row.candidate_key);
    for (const registryKey of candidate?.registry_keys ?? []) {
      addMapArray(familyByRegistry, registryKey, row);
    }
  }
  const conflictsByRegistry = new Map();
  for (const row of conflicts) {
    const registryKeys = unique([
      row.registry_key,
      ...(candidateByKey.get(row.candidate_key)?.registry_keys ?? []),
    ]);
    for (const registryKey of registryKeys) {
      addMapArray(conflictsByRegistry, registryKey, row);
    }
  }

  const coverageRows = (
    registryArtifact.artifact.content.registry_entries
  ).map((entry) => {
    const registryKey = entry.registry_key;
    const sourceRows = sourceRowsByRegistry.get(registryKey) ?? [];
    const resolutions = resolutionsByRegistry.get(registryKey) ?? [];
    const candidates = candidatesByRegistry.get(registryKey) ?? [];
    const familyRows = familyByRegistry.get(registryKey) ?? [];
    const conflictRows = conflictsByRegistry.get(registryKey) ?? [];
    const freshSourceIds = unique(sourceRows.map((row) => row.source_key));
    const novelCandidates = candidates.filter(
      (row) => row.candidate_kind !== 'existing_parent',
    );
    const sourceIsolated = novelCandidates.filter(
      (row) => row.promotion_status === 'review_required',
    );
    const unresolved = resolutions.filter((row) => !row.candidate_key);
    const singleSourceNovel = novelCandidates.filter(
      (row) => row.source_ids.length === 1,
    );
    const reasons = [];
    if (sourceRows.length === 0) reasons.push('no_fresh_primary_assertion');
    if (unresolved.length > 0) reasons.push('unresolved_assertions');
    if (sourceIsolated.length > 0) {
      reasons.push('source_isolated_unnumbered_assertions');
    }
    if (singleSourceNovel.length > 0) {
      reasons.push('single_source_novel_candidates');
    }
    if (conflictRows.length > 0) reasons.push('candidate_conflicts');
    if (
      freshSourceIds.length < 2
      && novelCandidates.length > 0
    ) {
      reasons.push('novel_candidates_need_independent_corroboration');
    }

    return {
      registry_key: registryKey,
      preferred_source_name: entry.preferred_source_name,
      scope_status: entry.scope_status,
      live_parent_rows: entry.live_parent_rows,
      live_public_rows: entry.live_public_rows,
      expected_card_counts: entry.source_expected_card_counts,
      independent_set_source_count: entry.independent_source_count,
      fresh_card_source_ids: freshSourceIds,
      fresh_card_source_count: freshSourceIds.length,
      fresh_assertion_count: sourceRows.length,
      matched_existing_assertion_count: resolutions.filter(
        (row) => row.resolution_status === 'matched_existing_parent',
      ).length,
      novel_index_candidate_count: novelCandidates.filter(
        (row) => row.promotion_status === 'index_candidate',
      ).length,
      source_isolated_candidate_count: sourceIsolated.length,
      single_source_novel_candidate_count: singleSourceNovel.length,
      unresolved_assertion_count: unresolved.length,
      conflict_count: conflictRows.length,
      conflict_type_counts: countBy(
        conflictRows,
        (row) => row.conflict_type,
      ),
      family_projection_status_counts: countBy(
        familyRows,
        (row) => row.projection_status,
      ),
      targeted_followup_required: reasons.length > 0,
      targeted_followup_reasons: unique(reasons),
    };
  }).sort((left, right) => left.registry_key.localeCompare(right.registry_key));

  const targetedQueue = buildTargetedSourceQueue({
    workItems: acquisitionPlan.artifact.content.work_items,
    coverageRows,
    completedTargetedLanes: new Set(
      unionManifest.artifact.content.targeted_sources_included
        ? unionManifest.artifact.content.source_statuses
          .filter((row) =>
            row.source_tier === 'targeted' && row.complete)
          .map((row) => row.lane_id)
        : [],
    ),
    generatedAt,
  });
  const deferredFutureQueue = buildTargetedSourceQueue({
    workItems: acquisitionPlan.artifact.content.work_items,
    coverageRows,
    generatedAt,
    futureOnly: true,
  });

  const sourceExhaustion = buildSourceExhaustionRows({
    acquisitionPlan: acquisitionPlan.artifact,
    unionManifest: unionManifest.artifact,
    healthByLane,
  });
  const summary = {
    union_status: unionManifest.artifact.content.status,
    registry_count: coverageRows.length,
    targeted_registry_count: coverageRows.filter(
      (row) => row.targeted_followup_required,
    ).length,
    targeted_work_item_count: targetedQueue.length,
    deferred_future_targeted_work_item_count: deferredFutureQueue.length,
    no_fresh_primary_registry_count: coverageRows.filter(
      (row) => row.fresh_assertion_count === 0,
    ).length,
    unresolved_numbered_registry_count: coverageRows.filter(
      (row) => row.unresolved_assertion_count > 0,
    ).length,
    source_isolated_registry_count: coverageRows.filter(
      (row) => row.source_isolated_candidate_count > 0,
    ).length,
    source_exhaustion_status_counts: countBy(
      sourceExhaustion,
      (row) => row.exhaustion_status,
    ),
  };

  const retrieval = {
    access_mode: 'local_verified_artifacts_only',
    database_access: false,
    storage_access: false,
    source_fetches: false,
  };
  const postTargeted =
    unionManifest.artifact.content.targeted_sources_included === true;
  const outputs = [
    [
      'coverage_by_registry_v1.json',
      'JPN-MASTER-INDEX-COVERAGE-BY-REGISTRY-V1',
      { summary, registry_coverage: coverageRows },
    ],
    [
      postTargeted
        ? 'residual_targeted_source_queue_v1.json'
        : 'targeted_source_queue_v1.json',
      postTargeted
        ? 'JPN-MASTER-INDEX-RESIDUAL-TARGETED-SOURCE-QUEUE-V1'
        : 'JPN-MASTER-INDEX-TARGETED-SOURCE-QUEUE-V1',
      {
        summary: {
          queued_work_item_count: targetedQueue.length,
          priority_counts: countBy(targetedQueue, (row) => row.priority),
        },
        work_items: targetedQueue,
      },
    ],
    [
      'deferred_future_targeted_source_queue_v1.json',
      'JPN-MASTER-INDEX-DEFERRED-FUTURE-TARGETED-SOURCE-QUEUE-V1',
      {
        summary: {
          queued_work_item_count: deferredFutureQueue.length,
          priority_counts: countBy(
            deferredFutureQueue,
            (row) => row.priority,
          ),
          as_of: generatedAt,
        },
        work_items: deferredFutureQueue,
      },
    ],
    [
      'source_exhaustion_v1.json',
      'JPN-MASTER-INDEX-SOURCE-EXHAUSTION-V1',
      {
        summary: {
          lane_count: sourceExhaustion.length,
          exhaustion_status_counts:
            summary.source_exhaustion_status_counts,
        },
        source_lanes: sourceExhaustion,
      },
    ],
  ];
  const written = [];
  for (const [filename, packageId, content] of outputs) {
    written.push(await writeJsonArtifact(
      path.join(options.indexRoot, filename),
      buildArtifact({
        packageId,
        generatedAt,
        retrieval,
        content,
      }),
    ));
  }
  const markdownBody = markdown({
    generatedAt,
    unionStatus: summary.union_status,
    coverageRows,
    targetedQueue,
    sourceExhaustion,
    summary,
  });
  const markdownPath = path.join(
    options.indexRoot,
    'coverage_gap_summary_v1.md',
  );
  await fs.writeFile(markdownPath, markdownBody, 'utf8');

  return {
    summary,
    artifacts: written.map((row) => row.path),
    summary_path: markdownPath.replaceAll('\\', '/'),
  };
}

async function main() {
  const result = await runCoverageGapReport(
    parseArgs(process.argv.slice(2)),
  );
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
