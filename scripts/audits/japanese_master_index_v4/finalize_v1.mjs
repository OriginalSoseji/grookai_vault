#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import {
  readVerifiedArtifact,
} from './artifact_rows_v1.mjs';
import {
  buildArtifact,
  sha256,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';
import {
  runCandidateUnion,
} from './candidate_union_v1.mjs';
import {
  runCoverageGapReport,
} from './coverage_gap_report_v1.mjs';
import {
  runFinalAdmission,
} from './final_admission_v1.mjs';

export const FINALIZE_VERSION =
  'JPN-MASTER-INDEX-FINALIZE-V1';

const DEFAULT_INDEX_ROOT =
  'docs/audits/japanese_master_index_v4/index';
const DEFAULT_CARDS_ROOT =
  'docs/audits/japanese_master_index_v4/cards';
const DEFAULT_SETS_ROOT =
  'docs/audits/japanese_master_index_v4/sets';
const DEFAULT_BASELINE_ROOT =
  'docs/audits/japanese_master_index_v4/baseline';
const DEFAULT_FINAL_ROOT =
  'docs/audits/japanese_master_index_v4/final';
const DEFAULT_PRESERVATION_LEDGER =
  'docs/audits/japanese_master_index_v4/cards/'
  + 'raw_evidence_preservation_ledger_v1.json.gz';
const GIT_OUTPUT_MAX_BUFFER = 64 * 1024 * 1024;

const BASELINE_PROOF_FILES = Object.freeze([
  'live_jpn_parent_summary_v1.json',
  'live_jpn_source_coverage_v1.json',
  'live_jpn_set_code_inventory_v1.json',
  'live_jpn_identity_gap_queue_v1.json',
  'english_family_reference_fingerprint_v1.json',
  'live_jpn_source_manifest_v1.json',
]);

const EXPECTED_SOURCE_LANES = Object.freeze([
  'artofpkm_jp_cards',
  'bulbapedia_jp_card_lists',
  'limitless_jp_cards',
  'official_jp_cards',
  'pokeguardian_release_reports',
  'serebii_jp_cards',
  'tcgdex_ja_cards',
]);

const ALLOWED_CHANGED_PATH_PATTERNS = Object.freeze([
  /^docs\/audits\/japanese_master_index_v4\//,
  /^docs\/contracts\/JAPANESE_MASTER_INDEX_COMPLETION_V1\.md$/,
  /^docs\/plans\/japanese_master_index_v4\/PLAN\.md$/,
  /^scripts\/audits\/japanese_master_index_v4\//,
  /^tests\/contracts\/japanese_master_index_v4_[^/]+\.test\.mjs$/,
  /^package\.json$/,
]);

function parseArgs(argv) {
  const options = {
    indexRoot: DEFAULT_INDEX_ROOT,
    cardsRoot: DEFAULT_CARDS_ROOT,
    setsRoot: DEFAULT_SETS_ROOT,
    baselineRoot: DEFAULT_BASELINE_ROOT,
    finalRoot: DEFAULT_FINAL_ROOT,
    preservationLedger: DEFAULT_PRESERVATION_LEDGER,
    liveRecheckRoot: null,
    targetedQueue: path.join(
      DEFAULT_INDEX_ROOT,
      'targeted_source_queue_v1.json',
    ),
    generatedAt: null,
    replay: true,
  };
  for (const arg of argv) {
    if (arg.startsWith('--index-root=')) {
      options.indexRoot = arg.slice('--index-root='.length);
    } else if (arg.startsWith('--cards-root=')) {
      options.cardsRoot = arg.slice('--cards-root='.length);
    } else if (arg.startsWith('--sets-root=')) {
      options.setsRoot = arg.slice('--sets-root='.length);
    } else if (arg.startsWith('--baseline-root=')) {
      options.baselineRoot = arg.slice('--baseline-root='.length);
    } else if (arg.startsWith('--final-root=')) {
      options.finalRoot = arg.slice('--final-root='.length);
    } else if (arg.startsWith('--preservation-ledger=')) {
      options.preservationLedger = arg.slice(
        '--preservation-ledger='.length,
      );
    } else if (arg.startsWith('--live-recheck-root=')) {
      options.liveRecheckRoot = arg.slice(
        '--live-recheck-root='.length,
      );
    } else if (arg.startsWith('--targeted-queue=')) {
      options.targetedQueue = arg.slice('--targeted-queue='.length);
    } else if (arg.startsWith('--generated-at=')) {
      options.generatedAt = new Date(
        arg.slice('--generated-at='.length),
      ).toISOString();
    } else if (arg === '--skip-replay') {
      options.replay = false;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function verifyPreservationLedger(ledgerPath) {
  const record = await readVerifiedArtifact(ledgerPath, {
    expectedPackageId:
      'JPN-MASTER-INDEX-PRESERVED-EVIDENCE-PACKAGE-V1',
  });
  const content = record.artifact.content;
  const archiveChecks = [];
  for (const lane of content.source_lanes ?? []) {
    const archive = await fs.readFile(path.resolve(lane.archive_path));
    const assertion = await readVerifiedArtifact(lane.assertion_path);
    const manifest = await readVerifiedArtifact(lane.manifest_path);
    archiveChecks.push({
      source_lane: lane.source_lane,
      archive_exists: true,
      archive_hash_matches: sha256(archive) === lane.archive_sha256,
      assertion_fingerprint_matches:
        assertion.artifact.content_fingerprint_sha256
          === lane.assertion_content_fingerprint_sha256,
      manifest_archive_hash_matches:
        manifest.artifact.content.raw_archive?.archive_sha256
          === lane.archive_sha256,
      entry_count: lane.entry_count,
    });
  }
  const oldUnpackedRawRoot = path.resolve(
    DEFAULT_CARDS_ROOT,
    'raw',
  );
  const oldPlainAssertions = EXPECTED_SOURCE_LANES.map((laneId) => {
    const lane = content.source_lanes.find(
      (row) => row.source_lane === laneId,
    );
    return lane?.assertion_path?.replace(/\.gz$/u, '') ?? null;
  }).filter(Boolean);
  const unpackedRawPresent = await fs.access(oldUnpackedRawRoot)
    .then(() => true)
    .catch(() => false);
  const plainAssertionPresence = await Promise.all(
    oldPlainAssertions.map(async (filename) => ({
      path: filename,
      present: await fs.access(path.resolve(filename))
        .then(() => true)
        .catch(() => false),
    })),
  );
  const laneIds = (content.source_lanes ?? [])
    .map((row) => row.source_lane)
    .sort();
  return {
    record,
    archive_checks: archiveChecks,
    all_archives_verified: (
      archiveChecks.length === EXPECTED_SOURCE_LANES.length
      && archiveChecks.every((row) => (
        row.archive_hash_matches
        && row.assertion_fingerprint_matches
        && row.manifest_archive_hash_matches
      ))
      && laneIds.join('\n')
        === [...EXPECTED_SOURCE_LANES].sort().join('\n')
    ),
    unpacked_raw_present: unpackedRawPresent,
    plain_assertion_presence: plainAssertionPresence,
    release_is_archive_only:
      !unpackedRawPresent
      && plainAssertionPresence.every((row) => !row.present),
  };
}

function check(name, passed, evidence) {
  return { name, passed: Boolean(passed), evidence };
}

function descriptorMap(manifest) {
  return new Map(
    manifest.content.datasets.map((row) => [row.dataset_key, row]),
  );
}

function sourceMap(manifest) {
  return new Map(
    manifest.content.source_statuses.map((row) => [row.lane_id, row]),
  );
}

function compareDatasetDescriptors(expectedManifest, actualManifest) {
  const expectedDatasets = descriptorMap(expectedManifest);
  const actualDatasets = descriptorMap(actualManifest);
  const comparisons = [...expectedDatasets.entries()].map(
    ([datasetKey, expected]) => {
      const actual = actualDatasets.get(datasetKey);
      return {
        dataset_key: datasetKey,
        expected_rows: expected.row_count,
        actual_rows: actual?.row_count ?? null,
        expected_fingerprint_sha256:
          expected.content_fingerprint_sha256,
        actual_fingerprint_sha256:
          actual?.content_fingerprint_sha256 ?? null,
        matches: Boolean(
          actual
          && actual.row_count === expected.row_count
          && actual.content_fingerprint_sha256
            === expected.content_fingerprint_sha256
        ),
      };
    },
  );
  const unexpectedDatasetKeys = [...actualDatasets.keys()]
    .filter((datasetKey) => !expectedDatasets.has(datasetKey))
    .sort();
  return {
    comparisons,
    unexpected_dataset_keys: unexpectedDatasetKeys,
    all_match:
      comparisons.every((row) => row.matches)
      && unexpectedDatasetKeys.length === 0,
  };
}

function normalizedGitPath(value) {
  return String(value).trim().replaceAll('\\', '/');
}

function gitChangedPaths() {
  const tracked = execFileSync(
    'git',
    ['diff', '--name-only', 'origin/main'],
    {
      encoding: 'utf8',
      maxBuffer: GIT_OUTPUT_MAX_BUFFER,
    },
  ).split(/\r?\n/u);
  const untracked = execFileSync(
    'git',
    ['ls-files', '--others', '--exclude-standard'],
    {
      encoding: 'utf8',
      maxBuffer: GIT_OUTPUT_MAX_BUFFER,
    },
  ).split(/\r?\n/u);
  return [...new Set(
    [...tracked, ...untracked]
      .map(normalizedGitPath)
      .filter(Boolean),
  )].sort();
}

async function compareReplay({
  options,
  finalUnion,
  finalAdmissionManifest,
  finalCoverageArtifacts,
  generatedAt,
  coverageGeneratedAt,
}) {
  await fs.mkdir(path.resolve('.tmp'), { recursive: true });
  const replayRoot = await fs.mkdtemp(
    path.resolve('.tmp', 'grookai-jpn-final-replay-'),
  );
  const replayAdmissionRoot = await fs.mkdtemp(
    path.resolve('.tmp', 'grookai-jpn-admission-replay-'),
  );
  try {
    await runCandidateUnion({
      baselineManifest: path.join(
        options.baselineRoot,
        'live_jpn_row_baseline_manifest_v1.json',
      ),
      setRegistry: path.join(
        options.setsRoot,
        'jpn_set_registry_v1.json',
      ),
      aliasMap: path.join(
        options.setsRoot,
        'jpn_set_alias_map_v1.json',
      ),
      acquisitionPlan: path.join(
        options.cardsRoot,
        'card_acquisition_plan_v1.json',
      ),
      cardsRoot: options.cardsRoot,
      outputRoot: replayRoot,
      targetedQueue: options.targetedQueue,
      includeTargetedSources: true,
      allowIncompleteSources: false,
      generatedAt,
    });
    await runCoverageGapReport({
      indexRoot: replayRoot,
      cardsRoot: options.cardsRoot,
      setsRoot: options.setsRoot,
      generatedAt: coverageGeneratedAt,
    });
    await runFinalAdmission({
      candidateManifest: path.join(
        replayRoot,
        'candidate_union_manifest_v1.json',
      ),
      setRegistry: path.join(
        options.setsRoot,
        'jpn_set_registry_v1.json',
      ),
      setConflicts: path.join(
        options.setsRoot,
        'jpn_set_conflict_queue_v1.json',
      ),
      sourceExhaustion: path.join(
        replayRoot,
        'source_exhaustion_v1.json',
      ),
      futureQueue: path.join(
        replayRoot,
        'deferred_future_targeted_source_queue_v1.json',
      ),
      outputRoot: replayAdmissionRoot,
      generatedAt,
    });

    const replayUnion = (
      await readVerifiedArtifact(path.join(
        replayRoot,
        'candidate_union_manifest_v1.json',
      ))
    ).artifact;
    const replayAdmissionManifest = (
      await readVerifiedArtifact(path.join(
        replayAdmissionRoot,
        'jpn_master_build_manifest_v1.json',
      ), {
        expectedPackageId: 'JPN-MASTER-BUILD-MANIFEST-V1',
      })
    ).artifact;
    const unionDatasetComparison =
      compareDatasetDescriptors(finalUnion, replayUnion);
    const admissionDatasetComparison = compareDatasetDescriptors(
      finalAdmissionManifest,
      replayAdmissionManifest,
    );

    const coverageComparisons = [];
    for (const [filename, finalArtifact] of finalCoverageArtifacts) {
      const replayed = (
        await readVerifiedArtifact(path.join(replayRoot, filename))
      ).artifact;
      coverageComparisons.push({
        filename,
        expected_fingerprint_sha256:
          finalArtifact.content_fingerprint_sha256,
        replay_fingerprint_sha256:
          replayed.content_fingerprint_sha256,
        matches:
          replayed.content_fingerprint_sha256
          === finalArtifact.content_fingerprint_sha256,
      });
    }
    return {
      performed: true,
      candidate_union_dataset_comparisons:
        unionDatasetComparison.comparisons,
      strict_admission_dataset_comparisons:
        admissionDatasetComparison.comparisons,
      coverage_comparisons: coverageComparisons,
      all_match:
        unionDatasetComparison.all_match
        && admissionDatasetComparison.all_match
        && coverageComparisons.every((row) => row.matches),
    };
  } finally {
    await fs.rm(replayRoot, { recursive: true, force: true });
    await fs.rm(
      replayAdmissionRoot,
      { recursive: true, force: true },
    );
  }
}

async function compareLiveBaseline({
  baselineRoot,
  liveRecheckRoot,
}) {
  if (!liveRecheckRoot) {
    return {
      performed: false,
      all_match: false,
      reason: 'live_recheck_root_not_provided',
    };
  }
  const [
    frozenRowsRecord,
    liveRowsRecord,
    liveManifestRecord,
  ] = await Promise.all([
    readVerifiedArtifact(path.join(
      baselineRoot,
      'live_jpn_row_baseline_manifest_v1.json',
    ), {
      expectedPackageId: 'LIVE-JPN-ROW-BASELINE-MANIFEST-V1',
    }),
    readVerifiedArtifact(path.join(
      liveRecheckRoot,
      'live_jpn_row_baseline_manifest_v1.json',
    ), {
      expectedPackageId: 'LIVE-JPN-ROW-BASELINE-MANIFEST-V1',
    }),
    readVerifiedArtifact(path.join(
      liveRecheckRoot,
      'live_jpn_baseline_manifest_v1.json',
    ), {
      expectedPackageId: 'LIVE-JPN-BASELINE-MANIFEST-V1',
    }),
  ]);
  const rowComparison = compareDatasetDescriptors(
    frozenRowsRecord.artifact,
    liveRowsRecord.artifact,
  );
  const artifactComparisons = [];
  for (const filename of BASELINE_PROOF_FILES) {
    const [frozenRecord, liveRecord] = await Promise.all([
      readVerifiedArtifact(path.join(baselineRoot, filename)),
      readVerifiedArtifact(path.join(liveRecheckRoot, filename)),
    ]);
    artifactComparisons.push({
      filename,
      expected_fingerprint_sha256:
        frozenRecord.artifact.content_fingerprint_sha256,
      live_fingerprint_sha256:
        liveRecord.artifact.content_fingerprint_sha256,
      matches:
        frozenRecord.artifact.content_fingerprint_sha256
        === liveRecord.artifact.content_fingerprint_sha256,
    });
  }
  const retrieval = liveManifestRecord.artifact.retrieval ?? {};
  const noWriteBoundary =
    liveManifestRecord.artifact.content.no_write_boundary ?? {};
  const noWriteGuardEstablished = Boolean(
    retrieval.guard_version
    && retrieval.transaction_read_only === 'on'
    && retrieval.default_transaction_read_only === 'on'
    && Object.values(noWriteBoundary).every((value) => value === false),
  );
  return {
    performed: true,
    live_recheck_root: liveRecheckRoot.replaceAll('\\', '/'),
    schema_fingerprint_sha256:
      retrieval.schema_fingerprint_sha256 ?? null,
    no_write_guard_established: noWriteGuardEstablished,
    row_dataset_comparisons: rowComparison.comparisons,
    artifact_comparisons: artifactComparisons,
    all_match:
      noWriteGuardEstablished
      && rowComparison.all_match
      && artifactComparisons.every((row) => row.matches),
  };
}

function markdown(content) {
  const sourceLines = content.source_statuses.map((row) => (
    `| ${row.source_tier} | ${row.lane_id}`
    + ` | ${row.harvested_container_count}`
    + ` / ${row.expected_container_count}`
    + ` | ${row.assertion_count}`
    + ` | ${row.complete ? 'complete' : 'incomplete'} |`
  ));
  const checkLines = content.checks.map((row) => (
    `| ${row.passed ? 'PASS' : 'FAIL'} | ${row.name} |`
  ));
  return `${[
    '# Japanese Master Index V4 Final Package',
    '',
    `Generated: \`${content.generated_at}\``,
    `Status: \`${content.status}\``,
    '',
    '## Index',
    '',
    `- Existing Japanese parents: **${content.summary.existing_jpn_parent_count}**`,
    `- Fresh source assertions: **${content.summary.fresh_source_assertion_count}**`,
    `- Identity candidates: **${content.summary.identity_candidate_count}**`,
    `- Conservative distinct lower bound: **${content.summary.conservative_distinct_identity_lower_bound}**`,
    `- Source-isolated upper bound: **${content.summary.source_isolated_distinct_identity_upper_bound}**`,
    `- Novel conservative candidates: **${content.summary.novel_index_candidate_count}**`,
    `- Explicit conflict rows: **${content.summary.conflict_count}**`,
    `- Residual automated targeted work: **${content.residual_targeted_work_item_count}**`,
    `- Future-release work deferred: **${content.deferred_future_targeted_work_item_count}**`,
    '',
    '## Strict Admission',
    '',
    `- Discovered sets/products adjudicated: **${content.strict_admission_summary.discovered_set_or_product_count}**`,
    `- Master-admissible sets/products: **${content.strict_admission_summary.master_admissible_set_count}**`,
    `- Source assertions disposed: **${content.strict_admission_summary.assertion_disposition_count}**`,
    `- Working card identities: **${content.strict_admission_summary.working_identity_candidate_count}**`,
    `- Master-admissible card identities: **${content.strict_admission_summary.master_admissible_identity_count}**`,
    `- Blocked card identities: **${content.strict_admission_summary.blocked_identity_count}**`,
    `- Adjudicated identity exclusions: **${content.strict_admission_summary.excluded_identity_count}**`,
    `- Working printing facts: **${content.strict_admission_summary.working_printing_fact_count}**`,
    `- Master-admissible printing facts: **${content.strict_admission_summary.master_admissible_printing_fact_count}**`,
    `- Blocked printing facts: **${content.strict_admission_summary.blocked_printing_fact_count}**`,
    `- Family relationships: **${content.strict_admission_summary.family_relationship_count}**`,
    `- Explicit source gaps: **${content.strict_admission_summary.source_gap_count}**`,
    '',
    '## Source Completion',
    '',
    '| Tier | Lane | Containers | Assertions | Status |',
    '|---|---|---:|---:|---|',
    ...sourceLines,
    '',
    '## Gates',
    '',
    '| Result | Gate |',
    '|---|---|',
    ...checkLines,
    '',
    '## Boundary',
    '',
    '- Database writes: `false`',
    '- Storage writes: `false`',
    '- Canonical identity promotion: `false`',
    '- Family promotion: `false`',
    '- English mutation: `false`',
    '',
    'This package is a strict master-admissible index plus explicit blocked, '
      + 'conflict, exclusion, and source-gap records. It is not a database '
      + 'payload and does not authorize promotion.',
    '',
  ].join('\n')}`;
}

export async function runFinalization(options = {}) {
  const resolved = {
    ...parseArgs([]),
    ...options,
  };
  const generatedAt = resolved.generatedAt ?? new Date().toISOString();
  const unionPath = path.join(
    resolved.indexRoot,
    'candidate_union_manifest_v1.json',
  );
  await runFinalAdmission({
    candidateManifest: unionPath,
    setRegistry: path.join(
      resolved.setsRoot,
      'jpn_set_registry_v1.json',
    ),
    setConflicts: path.join(
      resolved.setsRoot,
      'jpn_set_conflict_queue_v1.json',
    ),
    sourceExhaustion: path.join(
      resolved.indexRoot,
      'source_exhaustion_v1.json',
    ),
    futureQueue: path.join(
      resolved.indexRoot,
      'deferred_future_targeted_source_queue_v1.json',
    ),
    outputRoot: resolved.finalRoot,
    generatedAt,
  });
  const [
    unionRecord,
    finalAdmissionRecord,
    coverageRecord,
    exhaustionRecord,
    residualRecord,
    deferredRecord,
    targetedQueueRecord,
    baselineRecord,
    englishRecord,
    preservation,
  ] = await Promise.all([
    readVerifiedArtifact(unionPath, {
      expectedPackageId:
        'JPN-MASTER-INDEX-CANDIDATE-UNION-MANIFEST-V1',
    }),
    readVerifiedArtifact(path.join(
      resolved.finalRoot,
      'jpn_master_build_manifest_v1.json',
    ), {
      expectedPackageId: 'JPN-MASTER-BUILD-MANIFEST-V1',
    }),
    readVerifiedArtifact(path.join(
      resolved.indexRoot,
      'coverage_by_registry_v1.json',
    )),
    readVerifiedArtifact(path.join(
      resolved.indexRoot,
      'source_exhaustion_v1.json',
    )),
    readVerifiedArtifact(path.join(
      resolved.indexRoot,
      'residual_targeted_source_queue_v1.json',
    )),
    readVerifiedArtifact(path.join(
      resolved.indexRoot,
      'deferred_future_targeted_source_queue_v1.json',
    )),
    readVerifiedArtifact(resolved.targetedQueue, {
      expectedPackageId:
        'JPN-MASTER-INDEX-TARGETED-SOURCE-QUEUE-V1',
    }),
    readVerifiedArtifact(path.join(
      resolved.baselineRoot,
      'live_jpn_row_baseline_manifest_v1.json',
    ), {
      expectedPackageId: 'LIVE-JPN-ROW-BASELINE-MANIFEST-V1',
    }),
    readVerifiedArtifact(path.join(
      resolved.baselineRoot,
      'english_family_reference_fingerprint_v1.json',
    ), {
      expectedPackageId: 'ENGLISH-FAMILY-REFERENCE-FINGERPRINT-V1',
    }),
    verifyPreservationLedger(resolved.preservationLedger),
  ]);
  const union = unionRecord.artifact;
  const finalAdmission = finalAdmissionRecord.artifact;
  const sourceStatuses = sourceMap(union);
  const changedPaths = gitChangedPaths();
  const disallowedChangedPaths = changedPaths.filter(
    (changedPath) => !ALLOWED_CHANGED_PATH_PATTERNS.some(
      (pattern) => pattern.test(changedPath),
    ),
  );
  const missingSourceLanes = EXPECTED_SOURCE_LANES.filter(
    (laneId) => !sourceStatuses.has(laneId),
  );
  const incompleteSourceLanes = EXPECTED_SOURCE_LANES.filter(
    (laneId) => !sourceStatuses.get(laneId)?.complete,
  );
  const failedSourceLanes = EXPECTED_SOURCE_LANES.filter(
    (laneId) =>
      Number(sourceStatuses.get(laneId)?.failed_container_count ?? 0) > 0,
  );
  const residualCount =
    residualRecord.artifact.content.summary.queued_work_item_count;
  const exhaustionStatuses =
    exhaustionRecord.artifact.content.summary.exhaustion_status_counts;
  const incompleteExhaustionStatuses = Object.keys(
    exhaustionStatuses,
  ).filter((status) =>
    /(?:incomplete|pending|not_yet_invoked)/u.test(status));

  const finalCoverageArtifacts = new Map([
    ['coverage_by_registry_v1.json', coverageRecord.artifact],
    ['source_exhaustion_v1.json', exhaustionRecord.artifact],
    [
      'residual_targeted_source_queue_v1.json',
      residualRecord.artifact,
    ],
    [
      'deferred_future_targeted_source_queue_v1.json',
      deferredRecord.artifact,
    ],
  ]);
  const replay = resolved.replay
    ? await compareReplay({
      options: resolved,
      finalUnion: union,
      finalAdmissionManifest: finalAdmission,
      finalCoverageArtifacts,
      generatedAt,
      coverageGeneratedAt: coverageRecord.artifact.generated_at,
    })
    : { performed: false, all_match: null };
  const liveBaseline = await compareLiveBaseline({
    baselineRoot: resolved.baselineRoot,
    liveRecheckRoot: resolved.liveRecheckRoot,
  });

  const checks = [
    check(
      'final_union_includes_primary_and_targeted_sources',
      union.content.status
        === 'complete_primary_and_targeted_source_union'
        && union.content.targeted_sources_included === true,
      union.content.status,
    ),
    check(
      'all_governed_source_lanes_present',
      missingSourceLanes.length === 0,
      { missing_source_lanes: missingSourceLanes },
    ),
    check(
      'all_governed_source_lanes_complete',
      incompleteSourceLanes.length === 0,
      { incomplete_source_lanes: incompleteSourceLanes },
    ),
    check(
      'zero_source_fetch_or_parser_failures',
      failedSourceLanes.length === 0,
      { failed_source_lanes: failedSourceLanes },
    ),
    check(
      'raw_source_evidence_archives_are_verified',
      preservation.all_archives_verified,
      preservation.archive_checks,
    ),
    check(
      'release_uses_packaged_source_evidence_only',
      preservation.release_is_archive_only,
      {
        unpacked_raw_present: preservation.unpacked_raw_present,
        plain_assertion_presence:
          preservation.plain_assertion_presence,
      },
    ),
    check(
      'targeted_queue_fingerprint_is_pinned',
      union.content.targeted_queue_fingerprint_sha256
        === targetedQueueRecord.artifact.content_fingerprint_sha256,
      {
        union:
          union.content.targeted_queue_fingerprint_sha256,
        queue:
          targetedQueueRecord.artifact.content_fingerprint_sha256,
      },
    ),
    check(
      'zero_residual_automated_targeted_work',
      residualCount === 0,
      { residual_targeted_work_item_count: residualCount },
    ),
    check(
      'zero_incomplete_or_pending_governed_source_lanes',
      incompleteExhaustionStatuses.length === 0,
      { statuses: incompleteExhaustionStatuses },
    ),
    check(
      'baseline_manifest_is_the_frozen_union_input',
      union.content.baseline_manifest_fingerprint_sha256
        === baselineRecord.artifact.content_fingerprint_sha256,
      {
        union:
          union.content.baseline_manifest_fingerprint_sha256,
        baseline:
          baselineRecord.artifact.content_fingerprint_sha256,
      },
    ),
    check(
      'strict_admission_checks_all_pass',
      finalAdmission.content.completion
        .all_static_admission_checks_pass === true,
      finalAdmission.content.completion,
    ),
    check(
      'strict_admission_uses_final_candidate_union',
      finalAdmission.content.candidate_manifest_fingerprint_sha256
        === union.content_fingerprint_sha256,
      {
        strict_admission:
          finalAdmission.content.candidate_manifest_fingerprint_sha256,
        candidate_union: union.content_fingerprint_sha256,
      },
    ),
    check(
      'strict_admission_execution_boundary_has_no_mutation',
      Object.values(finalAdmission.content.execution_boundary)
        .every((value) => value === false),
      finalAdmission.content.execution_boundary,
    ),
    check(
      'fresh_live_read_only_baseline_matches_frozen_baseline',
      liveBaseline.performed && liveBaseline.all_match,
      liveBaseline,
    ),
    check(
      'english_family_reference_is_unchanged_live',
      liveBaseline.artifact_comparisons?.some((row) => (
        row.filename === 'english_family_reference_fingerprint_v1.json'
        && row.matches
      )) === true,
      liveBaseline.artifact_comparisons ?? [],
    ),
    check(
      'union_execution_boundary_has_no_mutation',
      Object.values(union.content.execution_boundary)
        .every((value) => value === false),
      union.content.execution_boundary,
    ),
    check(
      'repository_change_scope_is_audit_only',
      disallowedChangedPaths.length === 0,
      {
        changed_path_count: changedPaths.length,
        disallowed_changed_paths: disallowedChangedPaths,
      },
    ),
    check(
      'full_local_replay_is_reproducible',
      replay.performed && replay.all_match,
      replay,
    ),
  ];
  const failedChecks = checks.filter((row) => !row.passed);
  const content = {
    generator_version: FINALIZE_VERSION,
    generated_at: generatedAt,
    status: failedChecks.length === 0
      ? 'complete_no_write_master_index'
      : 'blocked_by_failed_completion_gates',
    summary: union.content.summary,
    strict_admission_summary: finalAdmission.content.summary,
    strict_admission_completion: finalAdmission.content.completion,
    source_statuses: union.content.source_statuses,
    source_exhaustion_status_counts: exhaustionStatuses,
    residual_targeted_work_item_count: residualCount,
    deferred_future_targeted_work_item_count:
      deferredRecord.artifact.content.summary.queued_work_item_count,
    english_family_reference:
      englishRecord.artifact.content,
    dependency_fingerprints: {
      candidate_union:
        union.content_fingerprint_sha256,
      coverage:
        coverageRecord.artifact.content_fingerprint_sha256,
      source_exhaustion:
        exhaustionRecord.artifact.content_fingerprint_sha256,
      targeted_queue:
        targetedQueueRecord.artifact.content_fingerprint_sha256,
      baseline:
        baselineRecord.artifact.content_fingerprint_sha256,
      strict_admission:
        finalAdmission.content_fingerprint_sha256,
      preserved_evidence:
        preservation.record.artifact.content_fingerprint_sha256,
    },
    changed_paths: changedPaths,
    replay,
    live_baseline_recheck: liveBaseline,
    checks,
    execution_boundary: {
      database_reads: true,
      database_reads_are_transaction_guarded_and_read_only: true,
      database_writes: false,
      storage_reads: false,
      storage_writes: false,
      source_fetches: false,
      canonical_id_allocation: false,
      family_promotion: false,
      english_mutation: false,
    },
  };
  const artifact = buildArtifact({
    packageId: 'JPN-MASTER-INDEX-FINAL-PACKAGE-V1',
    generatedAt,
    retrieval: {
      access_mode: 'local_verified_artifacts_and_git_scope_only',
      reproducibility_replay: resolved.replay,
      live_baseline_recheck:
        resolved.liveRecheckRoot?.replaceAll('\\', '/') ?? null,
    },
    content,
  });
  const jsonPath = path.join(
    resolved.indexRoot,
    'jpn_master_index_final_package_v1.json',
  );
  const markdownPath = path.join(
    resolved.indexRoot,
    'jpn_master_index_final_summary_v1.md',
  );
  await writeJsonArtifact(jsonPath, artifact);
  await fs.writeFile(markdownPath, markdown(content), 'utf8');

  if (failedChecks.length > 0) {
    throw new Error(
      `Finalization failed: ${failedChecks.map((row) => row.name).join(', ')}`,
    );
  }
  return {
    status: content.status,
    package_path: jsonPath.replaceAll('\\', '/'),
    summary_path: markdownPath.replaceAll('\\', '/'),
    package_fingerprint_sha256:
      artifact.content_fingerprint_sha256,
    output_fingerprint_sha256: sha256(
      `${artifact.content_fingerprint_sha256}:`
      + englishRecord.artifact.content.combined_fingerprint_sha256,
    ),
  };
}

async function main() {
  const result = await runFinalization(
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
