import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import {
  contentFingerprint,
  stableJson,
} from '../japanese_master_index_v4/deterministic_artifact_v1.mjs';

const GENERATOR_VERSION = 'JPN-MASTER-INDEX-V5-ACQUISITION-WAVES-V1';
const GENERATED_AT = '2026-07-27T02:00:00.000Z';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v5/acquisition_waves';
const CENSUS_ROOT =
  'docs/audits/japanese_master_index_v5/release_census';
const OFFICIAL_PRODUCT_RESOLUTION_ROOT =
  'docs/audits/japanese_master_index_v5/official_product_identity_resolution';
const WORKING_INDEX_OVERLAY_ROOT =
  'docs/audits/japanese_master_index_v5/working_index_overlay';

const SOURCE_LANE_BY_SET_SOURCE = new Map([
  ['official_jp_products', 'official_jp_cards'],
  ['artofpkm_jp_sets', 'artofpkm_jp_cards'],
  ['limitless_jp_sets', 'limitless_jp_cards'],
  ['tcgdex_ja_sets', 'tcgdex_ja_cards'],
  ['serebii_jp_sets', 'serebii_jp_cards'],
  ['bulbapedia_jp_expansions', 'bulbapedia_jp_card_lists'],
  ['pokeguardian_jp_sets', 'pokeguardian_release_reports'],
  ['tcgcollector_jp_sets', 'tcgcollector_jp_manual'],
  ['pokellector_jp_sets', 'pokellector_jp_manual'],
]);

const FALLBACK_LANES = [
  'official_jp_cards',
  'artofpkm_jp_cards',
  'limitless_jp_cards',
  'tcgdex_ja_cards',
  'serebii_jp_cards',
  'bulbapedia_jp_card_lists',
  'pokeguardian_release_reports',
  'historical_distribution_archives',
  'tcgcollector_jp_manual',
  'pokellector_jp_manual',
  'bounded_marketplace_review',
];

function parseArgs(argv) {
  const result = { outputRoot: DEFAULT_OUTPUT_ROOT, quiet: false };
  for (const value of argv.slice(2)) {
    if (value.startsWith('--output-root=')) {
      result.outputRoot = value.slice('--output-root='.length);
    } else if (value === '--quiet') {
      result.quiet = true;
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  return result;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function readArtifact(filePath) {
  const artifact = readJson(filePath);
  if (contentFingerprint(artifact.content)
      !== artifact.content_fingerprint_sha256) {
    throw new Error(`Artifact fingerprint mismatch: ${filePath}`);
  }
  return artifact;
}

function countBy(values, keyFn) {
  const counts = new Map();
  for (const value of values) {
    const key = String(keyFn(value));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries(
    [...counts].sort(([a], [b]) => a.localeCompare(b)),
  );
}

function groupBy(values, keyFn) {
  const grouped = new Map();
  for (const value of values) {
    const key = keyFn(value);
    const rows = grouped.get(key) ?? [];
    rows.push(value);
    grouped.set(key, rows);
  }
  return grouped;
}

function waveFor(issues) {
  if (issues.has('missing_container_inventory')) {
    return {
      wave: 1,
      wave_key: 'zero_inventory_acquisition',
      objective: 'establish_reproducible_card_inventory',
    };
  }
  if (issues.has('expected_count_conflict')
      || issues.has('missing_expected_count')
      || issues.has('product_slot_manifest_missing')) {
    return {
      wave: 2,
      wave_key: 'denominator_repair',
      objective: 'establish_defensible_expected_slot_manifest',
    };
  }
  if (issues.has('base_identity_slot_gap')) {
    return {
      wave: 3,
      wave_key: 'bounded_slot_completion',
      objective: 'fill_known_expected_base_identity_slots',
    };
  }
  return {
    wave: 4,
    wave_key: 'strict_corroboration',
    objective: 'upgrade_existing_candidates_to_strict_admission',
  };
}

function accessMode(lane) {
  if (lane.automatic_status === 'blocked_without_written_permission') {
    return 'manual_review_only';
  }
  if (lane.automatic_status === 'gap_targeted_after_primary_harvest') {
    return 'bounded_targeted_review';
  }
  return 'reproducible_automation';
}

function laneCandidates(census, wave, laneById) {
  const sourceLinked = census.source_evidence.source_ids
    .map((sourceId) => SOURCE_LANE_BY_SET_SOURCE.get(sourceId))
    .filter(Boolean);
  const required = census.registry_entry_kind === 'official_product'
    ? ['official_jp_cards']
    : [];
  const ordered = [...new Set([...required, ...sourceLinked, ...FALLBACK_LANES])];
  return ordered.map((laneId, index) => {
    const lane = laneById.get(laneId);
    if (!lane) throw new Error(`Unknown source lane: ${laneId}`);
    const mode = accessMode(lane);
    return {
      lane_id: laneId,
      source_family: lane.source_family,
      acquisition_tier: lane.acquisition_tier,
      access_mode: mode,
      rank: index + 1,
      currently_exhausted: lane.exhaustion_status.includes('exhausted'),
      use_rule: wave.wave === 4
        ? 'seek_candidate_level_independent_corroboration'
        : 'seek_container_or_slot_evidence_without_replacing_prior_rows',
    };
  });
}

async function writeJson(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, stableJson(value));
}

async function writeJsonl(filePath, rows) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(
    filePath,
    rows.map((row) => JSON.stringify(row)).join('\n') + '\n',
  );
}

async function fileProof(filePath) {
  const value = await fsp.readFile(filePath);
  return {
    bytes: value.byteLength,
    row_count: filePath.endsWith('.jsonl')
      ? value.toString('utf8').split('\n').filter(Boolean).length
      : null,
    sha256: crypto.createHash('sha256').update(value).digest('hex'),
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const outputRoot = path.resolve(args.outputRoot);
  const canonicalRoot = path.resolve(DEFAULT_OUTPUT_ROOT);
  if (outputRoot !== canonicalRoot
      && !outputRoot.includes(`${path.sep}.tmp${path.sep}`)) {
    throw new Error('Output must be canonical or under .tmp');
  }

  const census = loadJsonl(
    `${CENSUS_ROOT}/jpn_v5_release_census_v1.jsonl`,
  );
  const issueRows = loadJsonl(
    `${CENSUS_ROOT}/jpn_v5_acquisition_priority_queue_v1.jsonl`,
  );
  const scopeDispositions = loadJsonl(
    'docs/audits/japanese_master_index_v5/registry_scope/'
    + 'jpn_v5_registry_scope_dispositions_v1.jsonl',
  );
  const officialProductDispositions = loadJsonl(
    `${OFFICIAL_PRODUCT_RESOLUTION_ROOT}/`
    + 'jpn_v5_official_product_scope_dispositions_v1.jsonl',
  );
  const completedOfficialReleaseScopes = loadJsonl(
    `${OFFICIAL_PRODUCT_RESOLUTION_ROOT}/`
    + 'jpn_v5_official_release_scope_coverage_v1.jsonl',
  );
  const workingIndexOverlay = readJson(
    `${WORKING_INDEX_OVERLAY_ROOT}/jpn_v5_working_index_overlay_report_v1.json`,
  );
  const denominator = readJson(
    `${CENSUS_ROOT}/jpn_v5_denominator_report_v1.json`,
  );
  const sourceExhaustion = readArtifact(
    'docs/audits/japanese_master_index_v4/index/source_exhaustion_v1.json',
  );
  const lanes = sourceExhaustion.content.source_lanes;
  const laneById = new Map(lanes.map((lane) => [lane.lane_id, lane]));
  const censusByKey = new Map(census.map((row) => [row.release_key, row]));
  const removedRegistryKeys = new Set(
    scopeDispositions.map((row) => row.release_key),
  );
  const completedOfficialProductKeys = new Set(
    officialProductDispositions.map((row) => row.product_registry_key),
  );
  const completedOfficialReleaseKeys = new Set(
    completedOfficialReleaseScopes.map(
      (row) => row.canonical_release_registry_key,
    ),
  );
  const completedWorkKeys = new Set([
    ...removedRegistryKeys,
    ...completedOfficialProductKeys,
    ...completedOfficialReleaseKeys,
  ]);
  const activeIssueRows = issueRows.filter(
    (row) => !completedWorkKeys.has(row.release_key),
  );
  const issuesByRelease = groupBy(activeIssueRows, (row) => row.release_key);

  const workpacks = [...issuesByRelease].map(([releaseKey, rows]) => {
    const release = censusByKey.get(releaseKey);
    if (!release) throw new Error(`Missing census release: ${releaseKey}`);
    const issueKinds = [...new Set(rows.map((row) => row.issue_kind))].sort();
    const wave = waveFor(new Set(issueKinds));
    const lanePlan = laneCandidates(release, wave, laneById);
    return {
      work_key: `jpn-v5-wave-${wave.wave}:${releaseKey}`,
      release_key: releaseKey,
      registry_entry_kind: release.registry_entry_kind,
      release_kind: release.release_kind,
      names: release.names,
      issue_kinds: issueKinds,
      issue_count: issueKinds.length,
      priority: Math.min(...rows.map((row) => row.priority)),
      ...wave,
      expected_slots: release.coverage?.expected_slots ?? null,
      strict_admissible_slots:
        release.candidate_counts.strict_admissible,
      missing_slot_lower_bound:
        release.coverage?.missing_slot_lower_bound ?? null,
      candidate_count: release.candidate_counts.total,
      unresolved_candidate_count:
        release.candidate_counts.insufficient
        + release.candidate_counts.historical
        + release.candidate_counts.contradiction,
      source_lane_candidates: lanePlan,
      automatic_lane_count: lanePlan.filter(
        (lane) => lane.access_mode === 'reproducible_automation',
      ).length,
      manual_only_lanes: lanePlan
        .filter((lane) => lane.access_mode === 'manual_review_only')
        .map((lane) => lane.lane_id),
      completion_gate:
        'all_issue_kinds_resolved_or_preserved_with_explicit_evidence_gap',
    };
  }).sort((a, b) =>
    a.wave - b.wave
    || a.priority - b.priority
    || a.release_key.localeCompare(b.release_key));

  const batches = [];
  for (const [waveKey, rows] of groupBy(workpacks, (row) => row.wave_key)) {
    for (let index = 0; index < rows.length; index += 50) {
      const batchRows = rows.slice(index, index + 50);
      batches.push({
        batch_key: `${waveKey}:${String(index / 50 + 1).padStart(3, '0')}`,
        wave: batchRows[0].wave,
        wave_key: waveKey,
        release_count: batchRows.length,
        work_keys: batchRows.map((row) => row.work_key),
        source_fetches_approved: false,
        database_writes_approved: false,
        execution_status: 'planned_not_executed',
      });
    }
  }
  batches.sort((a, b) =>
    a.wave - b.wave || a.batch_key.localeCompare(b.batch_key));

  const summary = {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    status: 'planned_not_executed',
    baseline: {
      release_count: denominator.registry.total_containers,
      reconciled_active_container_count:
        denominator.registry.total_containers
        - removedRegistryKeys.size
        - completedOfficialProductKeys.size,
      original_issue_rows: denominator.acquisition_queue.issue_rows,
      reconciled_issue_rows: activeIssueRows.length,
      reconciled_container_dispositions: scopeDispositions.length,
      completed_official_product_scopes: completedOfficialProductKeys.size,
      completed_official_release_scopes: completedOfficialReleaseKeys.size,
      newly_resolved_official_identities:
        workingIndexOverlay.overlay_identity_count,
      projected_v5_working_identity_count:
        workingIndexOverlay.projected_v5_working_identity_count,
      base_identity_coverage: workingIndexOverlay.base_identity_coverage,
      unique_releases_with_work: workpacks.length,
      active_releases_without_census_issues:
        denominator.registry.total_containers
        - removedRegistryKeys.size
        - completedOfficialProductKeys.size
        - workpacks.length,
    },
    waves: Object.fromEntries(
      [...groupBy(workpacks, (row) => row.wave_key)]
        .map(([key, rows]) => [key, {
          wave: rows[0].wave,
          release_count: rows.length,
          issue_counts: countBy(
            rows.flatMap((row) => row.issue_kinds),
            (value) => value,
          ),
          release_kind_counts: countBy(rows, (row) => row.release_kind),
        }])
        .sort(([, a], [, b]) => a.wave - b.wave),
    ),
    source_lanes: Object.fromEntries(lanes.map((lane) => [
      lane.lane_id,
      {
        access_mode: accessMode(lane),
        exhaustion_status: lane.exhaustion_status,
        acquisition_tier: lane.acquisition_tier,
      },
    ])),
    batches: {
      batch_size: 50,
      batch_count: batches.length,
      source_fetches_approved: false,
      database_writes_approved: false,
    },
    next_gate:
      'approve_and_execute_wave_1_source_specific_harvests_under_existing_source_rules',
  };

  await fsp.rm(outputRoot, { force: true, recursive: true });
  await fsp.mkdir(outputRoot, { recursive: true });
  const outputPaths = {
    workpacks: path.join(outputRoot, 'jpn_v5_release_workpacks_v1.jsonl'),
    batches: path.join(outputRoot, 'jpn_v5_acquisition_batches_v1.json'),
    summary: path.join(outputRoot, 'jpn_v5_acquisition_wave_report_v1.json'),
    attestation: path.join(outputRoot, 'jpn_v5_acquisition_no_write_v1.json'),
  };
  await writeJsonl(outputPaths.workpacks, workpacks);
  await writeJson(outputPaths.batches, batches);
  await writeJson(outputPaths.summary, summary);
  await writeJson(outputPaths.attestation, {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    database_access: false,
    storage_access: false,
    source_fetches: false,
    source_mutations: false,
    production_writes: false,
    execution_status: 'planned_not_executed',
  });

  const proofs = {};
  for (const [key, filePath] of Object.entries(outputPaths)) {
    proofs[key] = await fileProof(filePath);
  }
  const fingerprintPath = path.join(
    outputRoot,
    'jpn_v5_acquisition_wave_fingerprints_v1.json',
  );
  await writeJson(fingerprintPath, {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    files: proofs,
    aggregate_sha256: contentFingerprint(proofs),
  });

  if (!args.quiet) {
    console.log(JSON.stringify({
      status: summary.status,
      releases_with_work: workpacks.length,
      releases_without_issues:
        summary.baseline.active_releases_without_census_issues,
      batches: batches.length,
      waves: Object.fromEntries(
        Object.entries(summary.waves).map(([key, value]) => [
          key,
          value.release_count,
        ]),
      ),
    }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
