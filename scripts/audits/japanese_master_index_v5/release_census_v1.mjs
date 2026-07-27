import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

import {
  contentFingerprint,
  stableJson,
} from '../japanese_master_index_v4/deterministic_artifact_v1.mjs';

const GENERATOR_VERSION = 'JPN-MASTER-INDEX-V5-RELEASE-CENSUS-V1';
const GENERATED_AT = '2026-07-27T00:00:00.000Z';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v5/release_census';

const paths = {
  registry:
    'docs/audits/japanese_master_index_v4/sets/jpn_set_registry_v1.json',
  sets:
    'docs/audits/japanese_master_index_v4/final/'
    + 'jpn_master_set_adjudication_v1.json',
  cards:
    'docs/audits/japanese_master_index_v4/final/'
    + 'jpn_master_resolved_card_identities_v1.json',
  finalIdentities:
    'docs/audits/japanese_master_index_v4/complete_no_write/'
    + 'jpn_v4_final_identity_disposition.jsonl',
  v4Fingerprints:
    'docs/audits/japanese_master_index_v4/complete_no_write/'
    + 'jpn_v4_final_fingerprints.json',
  v4Attestation:
    'docs/audits/japanese_master_index_v4/complete_no_write/'
    + 'jpn_v4_no_write_attestation.json',
};

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

function readArtifact(filePath) {
  const input = fs.readFileSync(filePath);
  const raw = filePath.endsWith('.gz') ? zlib.gunzipSync(input) : input;
  const artifact = JSON.parse(raw.toString('utf8'));
  if (contentFingerprint(artifact.content)
      !== artifact.content_fingerprint_sha256) {
    throw new Error(`Artifact fingerprint mismatch: ${filePath}`);
  }
  return artifact;
}

function loadRows(descriptor) {
  const rows = descriptor.shard_paths.flatMap((shardPath) =>
    readArtifact(shardPath).content.rows);
  if (rows.length !== descriptor.row_count) {
    throw new Error(`Row count mismatch: ${descriptor.dataset_key}`);
  }
  if (contentFingerprint(rows) !== descriptor.content_fingerprint_sha256) {
    throw new Error(`Dataset fingerprint mismatch: ${descriptor.dataset_key}`);
  }
  return rows;
}

function loadJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function by(values, keyFn) {
  const result = new Map();
  for (const value of values) {
    const key = keyFn(value);
    const rows = result.get(key) ?? [];
    rows.push(value);
    result.set(key, rows);
  }
  return result;
}

function countBy(values, keyFn) {
  return Object.fromEntries(
    [...by(values, keyFn)]
      .map(([key, rows]) => [String(key), rows.length])
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

function uniqueNumbers(values) {
  return [...new Set(values.filter(Number.isFinite))].sort((a, b) => a - b);
}

function denominatorStatus(set) {
  const counts = uniqueNumbers(set.expected_card_count_evidence ?? []);
  if (!set.master_admissible) return 'excluded_set_identity_not_admissible';
  if (counts.length > 1) return 'excluded_conflicting_expected_counts';
  if (counts.length === 0) {
    return set.registry_entry_kind === 'official_product'
      ? 'excluded_product_scope_requires_slot_manifest'
      : 'excluded_missing_expected_count';
  }
  return 'provisional_bounded_unique_expected_count';
}

function dispositionBucket(disposition) {
  if (disposition.includes('ready')) return 'promotion_ready';
  if (disposition.startsWith('existing_production')) return 'existing';
  if (disposition === 'blocked_but_otherwise_admissible') {
    return 'admissible_blocked';
  }
  if (disposition === 'insufficient_evidence') return 'insufficient';
  if (disposition === 'historical_record_deferred_for_later_review') {
    return 'historical';
  }
  if (disposition === 'unresolved_contradiction') return 'contradiction';
  if (disposition === 'duplicate_of_existing_production_identity') {
    return 'duplicate';
  }
  return 'excluded';
}

function buildCandidateCounts(rows) {
  const counts = {
    total: rows.length,
    existing: 0,
    promotion_ready: 0,
    admissible_blocked: 0,
    insufficient: 0,
    historical: 0,
    contradiction: 0,
    duplicate: 0,
    excluded: 0,
    image_ready: 0,
    numbered: 0,
    unnumbered: 0,
  };
  for (const row of rows) {
    counts[dispositionBucket(row.disposition)] += 1;
    if (row.readiness?.image) counts.image_ready += 1;
    if (row.printed_identity?.printed_number) counts.numbered += 1;
    else counts.unnumbered += 1;
  }
  counts.strict_admissible =
    counts.existing + counts.promotion_ready + counts.admissible_blocked;
  return counts;
}

function acquisitionIssues(censusRow) {
  const issues = [];
  const candidates = censusRow.candidate_counts;
  if (candidates.total === 0) {
    issues.push({
      issue_kind: 'missing_container_inventory',
      priority: 1,
      evidence_needed: 'at_least_one_reproducible_card_inventory',
    });
  }
  if (censusRow.denominator_status
      === 'excluded_conflicting_expected_counts') {
    issues.push({
      issue_kind: 'expected_count_conflict',
      priority: 2,
      evidence_needed: 'authoritative_expected_count_resolution',
    });
  } else if (censusRow.denominator_status
      === 'excluded_missing_expected_count') {
    issues.push({
      issue_kind: 'missing_expected_count',
      priority: 3,
      evidence_needed: 'authoritative_or_source_consensus_expected_count',
    });
  } else if (censusRow.denominator_status
      === 'excluded_product_scope_requires_slot_manifest') {
    issues.push({
      issue_kind: 'product_slot_manifest_missing',
      priority: 3,
      evidence_needed: 'product_specific_unique_card_slot_manifest',
    });
  }
  if ((censusRow.coverage?.missing_slot_lower_bound ?? 0) > 0) {
    issues.push({
      issue_kind: 'base_identity_slot_gap',
      priority: 2,
      evidence_needed:
        `${censusRow.coverage.missing_slot_lower_bound}_admissible_slots`,
    });
  }
  const unresolved = candidates.insufficient
    + candidates.historical
    + candidates.contradiction;
  if (unresolved > 0) {
    issues.push({
      issue_kind: 'strict_admission_gap',
      priority: 4,
      evidence_needed: `${unresolved}_candidate_adjudications`,
    });
  }
  return issues;
}

async function writeJson(filePath, value) {
  const serialized = stableJson(value);
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, serialized);
}

async function writeJsonl(filePath, rows) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(
    filePath,
    rows.map((row) => JSON.stringify(row)).join('\n') + '\n',
  );
}

async function fingerprint(filePath) {
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
  await fsp.rm(outputRoot, { force: true, recursive: true });
  await fsp.mkdir(outputRoot, { recursive: true });

  const registryArtifact = readArtifact(paths.registry);
  const setArtifact = readArtifact(paths.sets);
  const cardArtifact = readArtifact(paths.cards);
  const registry = registryArtifact.content.registry_entries;
  const sets = loadRows(setArtifact.content.dataset);
  const cards = loadRows(cardArtifact.content.dataset);
  const finalIdentities = loadJsonl(paths.finalIdentities);
  const v4Fingerprints = readJson(paths.v4Fingerprints);
  const v4Attestation = readJson(paths.v4Attestation);

  const setByKey = new Map(sets.map((row) => [row.jpn_set_key, row]));
  const finalBySet = by(
    finalIdentities,
    (row) => row.printed_identity.jpn_set_key,
  );
  const sourceCardsBySet = by(cards, (row) => row.jpn_set_key);

  const censusRows = registry.map((entry) => {
    const set = setByKey.get(entry.registry_key);
    if (!set) throw new Error(`Set adjudication missing: ${entry.registry_key}`);
    const candidateCounts = buildCandidateCounts(
      finalBySet.get(entry.registry_key) ?? [],
    );
    const expectedCounts = uniqueNumbers(
      set.expected_card_count_evidence ?? [],
    );
    const status = denominatorStatus(set);
    const expected = status === 'provisional_bounded_unique_expected_count'
      ? expectedCounts[0]
      : null;
    const covered = expected === null
      ? null
      : Math.min(expected, candidateCounts.strict_admissible);
    return {
      release_key: entry.registry_key,
      registry_entry_kind: entry.registry_entry_kind,
      release_kind: set.release_kind,
      scope_status: entry.scope_status,
      master_admissible: set.master_admissible,
      names: {
        canonical_name_ja: set.canonical_name_ja,
        collector_facing_name_en: set.collector_facing_name_en,
        aliases: set.source_aliases,
      },
      source_evidence: {
        independent_source_count: set.independent_source_count,
        source_ids: set.source_ids,
        release_dates: set.release_date_evidence,
        era: set.era_evidence,
      },
      expected_card_count_evidence: expectedCounts,
      denominator_status: status,
      candidate_counts: candidateCounts,
      source_card_rows: sourceCardsBySet.get(entry.registry_key)?.length ?? 0,
      coverage: expected === null
        ? null
        : {
          expected_slots: expected,
          strict_admissible_slots_capped: covered,
          missing_slot_lower_bound: Math.max(expected - covered, 0),
          admissible_overflow_outside_bound: Math.max(
            candidateCounts.strict_admissible - expected,
            0,
          ),
          ratio: Number((covered / expected).toFixed(8)),
          interpretation:
            'provisional_container_bound_not_full_ecosystem_coverage',
        },
    };
  }).sort((a, b) => a.release_key.localeCompare(b.release_key));

  const queueRows = censusRows.flatMap((row) =>
    acquisitionIssues(row).map((issue) => ({
      release_key: row.release_key,
      registry_entry_kind: row.registry_entry_kind,
      release_kind: row.release_kind,
      ...issue,
    }))).sort((a, b) =>
    a.priority - b.priority
    || a.release_key.localeCompare(b.release_key)
    || a.issue_kind.localeCompare(b.issue_kind));

  const bounded = censusRows.filter((row) =>
    row.denominator_status === 'provisional_bounded_unique_expected_count');
  const expectedSlots = bounded.reduce(
    (sum, row) => sum + row.coverage.expected_slots,
    0,
  );
  const coveredSlots = bounded.reduce(
    (sum, row) => sum + row.coverage.strict_admissible_slots_capped,
    0,
  );
  const denominatorReport = {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    status: 'initial_provisional_denominator_not_98_percent_claim',
    baseline: {
      v4_aggregate_sha256: v4Fingerprints.aggregate_sha256,
      v4_frozen_live_and_english_match:
        v4Attestation.frozen_live_baseline.all_match,
    },
    registry: {
      total_containers: censusRows.length,
      by_entry_kind: countBy(censusRows, (row) =>
        row.registry_entry_kind),
      by_release_kind: countBy(censusRows, (row) =>
        row.release_kind ?? 'unspecified'),
      by_denominator_status: countBy(censusRows, (row) =>
        row.denominator_status),
      containers_with_candidate_rows: censusRows.filter(
        (row) => row.candidate_counts.total > 0,
      ).length,
      containers_without_candidate_rows: censusRows.filter(
        (row) => row.candidate_counts.total === 0,
      ).length,
    },
    provisional_bounded_coverage: {
      included_container_count: bounded.length,
      expected_slots: expectedSlots,
      strict_admissible_slots_capped: coveredSlots,
      missing_slot_lower_bound: expectedSlots - coveredSlots,
      ratio: Number((coveredSlots / expectedSlots).toFixed(8)),
      percent: Number((coveredSlots * 100 / expectedSlots).toFixed(2)),
      claim_scope:
        'only_admissible_containers_with_one_unique_expected_count',
    },
    acquisition_queue: {
      issue_rows: queueRows.length,
      by_issue_kind: countBy(queueRows, (row) => row.issue_kind),
      by_priority: countBy(queueRows, (row) => row.priority),
    },
    next_gate:
      'resolve_missing_and_conflicting_container_bounds_before_global_ratio',
  };

  const report = [
    '# Japanese Master Index V5 Release Census',
    '',
    `- Governed containers: ${censusRows.length.toLocaleString()}`,
    `- Containers with candidate rows: ${denominatorReport.registry
      .containers_with_candidate_rows.toLocaleString()}`,
    `- Containers without candidate rows: ${denominatorReport.registry
      .containers_without_candidate_rows.toLocaleString()}`,
    `- Provisional bounded containers: ${bounded.length.toLocaleString()}`,
    `- Provisional expected slots: ${expectedSlots.toLocaleString()}`,
    `- Strict admissible slots in bounded containers: ${coveredSlots
      .toLocaleString()}`,
    `- Initial bounded coverage: ${denominatorReport
      .provisional_bounded_coverage.percent}%`,
    '',
    'This is not the global Japanese coverage percentage. Containers with '
      + 'missing, conflicting, or product-specific bounds are excluded until '
      + 'their denominator is defensible.',
    '',
  ].join('\n');

  const files = {
    census: 'jpn_v5_release_census_v1.jsonl',
    denominator: 'jpn_v5_denominator_report_v1.json',
    queue: 'jpn_v5_acquisition_priority_queue_v1.jsonl',
    report: 'jpn_v5_release_census_report_v1.md',
    attestation: 'jpn_v5_no_write_attestation_v1.json',
    fingerprints: 'jpn_v5_release_census_fingerprints_v1.json',
  };
  await writeJsonl(path.join(outputRoot, files.census), censusRows);
  await writeJson(path.join(outputRoot, files.denominator), denominatorReport);
  await writeJsonl(path.join(outputRoot, files.queue), queueRows);
  await fsp.writeFile(path.join(outputRoot, files.report), report);
  await writeJson(path.join(outputRoot, files.attestation), {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    status: 'attested_read_only_no_write',
    database_reads: false,
    database_writes: false,
    source_fetches: false,
    migrations: false,
    storage_writes: false,
    production_mutated: false,
    v4_aggregate_sha256: v4Fingerprints.aggregate_sha256,
  });

  const fingerprintTargets = Object.values(files)
    .filter((filename) => filename !== files.fingerprints)
    .sort();
  const fingerprints = {};
  for (const filename of fingerprintTargets) {
    fingerprints[filename] = await fingerprint(
      path.join(outputRoot, filename),
    );
  }
  await writeJson(path.join(outputRoot, files.fingerprints), {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    files: fingerprints,
    aggregate_sha256: contentFingerprint(fingerprints),
  });

  if (!args.quiet) {
    console.log(JSON.stringify({
      status: denominatorReport.status,
      containers: censusRows.length,
      bounded_containers: bounded.length,
      expected_slots: expectedSlots,
      strict_admissible_slots: coveredSlots,
      provisional_percent:
        denominatorReport.provisional_bounded_coverage.percent,
      queue_rows: queueRows.length,
    }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
