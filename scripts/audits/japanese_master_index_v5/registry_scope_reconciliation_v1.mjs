import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import {
  contentFingerprint,
  stableJson,
} from '../japanese_master_index_v4/deterministic_artifact_v1.mjs';
import {
  normalizeName,
} from '../japanese_master_index_v4/set_registry_build_v1.mjs';

const GENERATOR_VERSION =
  'JPN-MASTER-INDEX-V5-REGISTRY-SCOPE-RECONCILIATION-V1';
const GENERATED_AT = '2026-07-27T03:00:00.000Z';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v5/registry_scope';

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
  const artifact = readJson(filePath);
  if (contentFingerprint(artifact.content)
      !== artifact.content_fingerprint_sha256) {
    throw new Error(`Artifact fingerprint mismatch: ${filePath}`);
  }
  return artifact;
}

function loadJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function groupBy(values, keyFn) {
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
    [...groupBy(values, keyFn)]
      .map(([key, rows]) => [String(key), rows.length])
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

function coreReleaseName(value = '') {
  return normalizeName(
    value
      .replaceAll('&lt;', ' ')
      .replaceAll('&gt;', ' ')
      .replaceAll('&amp;', ' ')
      .replaceAll('ポケモンカードゲーム', ' ')
      .replace(/(?:強化|ハイクラス|コンセプト)?拡張パック/g, ' ')
      .replace(/第\d+弾/g, ' ')
      .replace(/[「」『』【】]/g, ' '),
  );
}

function normalizedDates(values) {
  const result = new Set();
  for (const value of values ?? []) {
    const japanese = value.match(
      /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/,
    );
    if (japanese) {
      result.add([
        japanese[1],
        japanese[2].padStart(2, '0'),
        japanese[3].padStart(2, '0'),
      ].join('-'));
      continue;
    }
    const parsed = new Date(value.replace(/(\d+)(st|nd|rd|th)/, '$1'));
    if (!Number.isNaN(parsed.valueOf())) {
      result.add(parsed.toISOString().slice(0, 10));
    }
  }
  return [...result].sort();
}

function namesFor(row) {
  return [...new Set([
    row.names.canonical_name_ja,
    row.names.collector_facing_name_en,
    ...(row.names.aliases ?? []),
  ].filter(Boolean).map(coreReleaseName).filter((value) => value.length >= 3))];
}

function intersects(left, right) {
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

function contaminationDispositions(registry, censusByKey) {
  const sourceNameGroups = new Map();
  for (const entry of registry.filter((row) =>
    row.registry_entry_kind === 'japanese_card_release')) {
    for (const sourceId of entry.source_ids) {
      for (const sourceName of entry.source_native_names) {
        const key = `${sourceId}|${normalizeName(sourceName)}`;
        const rows = sourceNameGroups.get(key) ?? new Map();
        rows.set(entry.registry_key, entry);
        sourceNameGroups.set(key, rows);
      }
    }
  }

  const dispositions = [];
  for (const [clusterKey, entryMap] of sourceNameGroups) {
    const entries = [...entryMap.values()];
    const emptySingletons = entries.filter((entry) => {
      const census = censusByKey.get(entry.registry_key);
      return entry.independent_source_count === 1
        && census?.candidate_counts.total === 0;
    });
    const corroboratedTargets = entries.filter((entry) => {
      const census = censusByKey.get(entry.registry_key);
      return entry.independent_source_count >= 2
        && census?.candidate_counts.total > 0;
    });
    if (entries.length < 3
        || emptySingletons.length < 2
        || corroboratedTargets.length !== 1) {
      continue;
    }
    const [sourceId, normalizedSourceName] = clusterKey.split('|');
    const target = corroboratedTargets[0];
    for (const entry of emptySingletons) {
      const census = censusByKey.get(entry.registry_key);
      dispositions.push({
        release_key: entry.registry_key,
        disposition: 'exclude_source_metadata_alias_contamination',
        canonical_release_key: target.registry_key,
        evidence_strength: 'deterministic_cluster',
        evidence: {
          source_id: sourceId,
          normalized_source_name: normalizedSourceName,
          source_native_codes: entry.source_native_codes,
          cluster_distinct_container_count: entries.length,
          empty_single_source_container_count: emptySingletons.length,
          corroborated_target_count: corroboratedTargets.length,
          expected_card_count_evidence:
            census.expected_card_count_evidence,
          candidate_count: census.candidate_counts.total,
        },
      });
    }
  }
  return dispositions;
}

function productAliasDispositions(census, officialScopeByKey) {
  const populatedReleases = census.filter((row) =>
    row.registry_entry_kind === 'japanese_card_release'
    && row.candidate_counts.total > 0);
  const nameIndex = new Map();
  for (const release of populatedReleases) {
    for (const name of namesFor(release)) {
      const rows = nameIndex.get(name) ?? new Map();
      rows.set(release.release_key, release);
      nameIndex.set(name, rows);
    }
  }

  const dispositions = [];
  for (const product of census.filter((row) =>
    row.registry_entry_kind === 'official_product'
    && row.candidate_counts.total === 0)) {
    const scope = officialScopeByKey.get(product.release_key);
    if (scope?.source_scope_disposition !== 'official_expansion_release'
        || scope.source_container_kind !== 'expansion') {
      continue;
    }
    const candidates = new Map();
    for (const name of namesFor(product)) {
      for (const [key, release] of nameIndex.get(name) ?? []) {
        candidates.set(key, release);
      }
    }
    if (candidates.size !== 1) continue;
    const target = [...candidates.values()][0];
    const productDates = normalizedDates(
      product.source_evidence.release_dates,
    );
    const targetDates = normalizedDates(target.source_evidence.release_dates);
    const dateEvidence = intersects(productDates, targetDates)
      ? 'exact_release_date'
      : targetDates.length === 0
        ? 'target_date_unavailable'
        : null;
    if (!dateEvidence) continue;

    dispositions.push({
      release_key: product.release_key,
      disposition: 'merge_official_expansion_product_alias',
      canonical_release_key: target.release_key,
      evidence_strength: dateEvidence === 'exact_release_date'
        ? 'exact_core_name_and_date'
        : 'exact_core_name_unique_target',
      evidence: {
        official_source_assertion_key: scope.source_assertion_key,
        official_source_url: scope.source_url,
        official_source_name: scope.source_native_name,
        normalized_core_names: namesFor(product),
        product_release_dates: productDates,
        canonical_release_dates: targetDates,
        date_evidence: dateEvidence,
        canonical_candidate_count: target.candidate_counts.total,
        canonical_strict_admissible_count:
          target.candidate_counts.strict_admissible,
      },
    });
  }
  return dispositions;
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
    'docs/audits/japanese_master_index_v5/release_census/'
    + 'jpn_v5_release_census_v1.jsonl',
  );
  const denominator = readJson(
    'docs/audits/japanese_master_index_v5/release_census/'
    + 'jpn_v5_denominator_report_v1.json',
  );
  const registry = readArtifact(
    'docs/audits/japanese_master_index_v4/sets/jpn_set_registry_v1.json',
  ).content.registry_entries;
  const officialScope = readArtifact(
    'docs/audits/japanese_master_index_v4/sets/'
    + 'jpn_official_product_scope_v1.json',
  ).content.products;
  const censusByKey = new Map(census.map((row) => [row.release_key, row]));
  const officialScopeByKey = new Map(
    officialScope.map((row) => [row.registry_key, row]),
  );

  const dispositions = [
    ...contaminationDispositions(registry, censusByKey),
    ...productAliasDispositions(census, officialScopeByKey),
  ].sort((a, b) =>
    a.disposition.localeCompare(b.disposition)
    || a.release_key.localeCompare(b.release_key));

  const duplicateKeys = new Set(
    dispositions.map((row) => row.release_key),
  );
  if (duplicateKeys.size !== dispositions.length) {
    throw new Error('One release received multiple scope dispositions');
  }

  const denominatorExclusions = dispositions.filter((row) =>
    row.disposition === 'exclude_source_metadata_alias_contamination'
    && censusByKey.get(row.release_key)?.coverage);
  const removedExpectedSlots = denominatorExclusions.reduce(
    (sum, row) =>
      sum + censusByKey.get(row.release_key).coverage.expected_slots,
    0,
  );
  const removedCoveredSlots = denominatorExclusions.reduce(
    (sum, row) =>
      sum
      + censusByKey.get(row.release_key)
        .coverage.strict_admissible_slots_capped,
    0,
  );
  const previous =
    denominator.provisional_bounded_coverage;
  const expectedSlots = previous.expected_slots - removedExpectedSlots;
  const coveredSlots =
    previous.strict_admissible_slots_capped - removedCoveredSlots;
  const ratio = coveredSlots / expectedSlots;

  const report = {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    status: 'read_only_scope_reconciliation',
    dispositions: {
      row_count: dispositions.length,
      by_disposition: countBy(dispositions, (row) => row.disposition),
      by_evidence_strength: countBy(
        dispositions,
        (row) => row.evidence_strength,
      ),
    },
    wave_1_effect: {
      prior_zero_inventory_release_count: 666,
      resolved_as_container_alias_or_source_contamination:
        dispositions.length,
      remaining_zero_inventory_release_count:
        666 - dispositions.length,
    },
    denominator_effect: {
      previous_expected_slots: previous.expected_slots,
      removed_false_expected_slots: removedExpectedSlots,
      reconciled_expected_slots: expectedSlots,
      covered_slots: coveredSlots,
      previous_percent: previous.percent,
      reconciled_percent: Number((ratio * 100).toFixed(2)),
      ratio: Number(ratio.toFixed(8)),
      interpretation:
        'provisional_bounded_coverage_after_evidence_proven_container_dedup',
    },
    next_gate:
      'rebuild_wave_plan_excluding_reconciled_container_aliases',
  };

  await fsp.rm(outputRoot, { force: true, recursive: true });
  await fsp.mkdir(outputRoot, { recursive: true });
  const paths = {
    dispositions: path.join(
      outputRoot,
      'jpn_v5_registry_scope_dispositions_v1.jsonl',
    ),
    report: path.join(
      outputRoot,
      'jpn_v5_registry_scope_reconciliation_report_v1.json',
    ),
    attestation: path.join(
      outputRoot,
      'jpn_v5_registry_scope_no_write_v1.json',
    ),
  };
  await writeJsonl(paths.dispositions, dispositions);
  await writeJson(paths.report, report);
  await writeJson(paths.attestation, {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    database_access: false,
    storage_access: false,
    source_fetches: false,
    production_writes: false,
    registry_mutation: false,
  });

  const proofs = {};
  for (const [key, filePath] of Object.entries(paths)) {
    proofs[key] = await fileProof(filePath);
  }
  await writeJson(
    path.join(outputRoot, 'jpn_v5_registry_scope_fingerprints_v1.json'),
    {
      generator_version: GENERATOR_VERSION,
      generated_at: GENERATED_AT,
      files: proofs,
      aggregate_sha256: contentFingerprint(proofs),
    },
  );

  if (!args.quiet) {
    console.log(JSON.stringify({
      status: report.status,
      dispositions: report.dispositions,
      wave_1_effect: report.wave_1_effect,
      denominator_effect: report.denominator_effect,
    }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
