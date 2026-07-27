import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildArtifact,
  contentFingerprint,
  sha256,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';
import { assertAuditOnlyArgs } from './read_only_guard_v1.mjs';

const PACKAGE_ID = 'JPN-MASTER-INDEX-V4-SET-REGISTRY-BUILD-V1';
const DEFAULT_ASSERTIONS_PATH =
  'docs/audits/japanese_master_index_v4/sets/source_set_assertions_v1.json';
const DEFAULT_BASELINE_PATH =
  'docs/audits/japanese_master_index_v4/baseline/live_jpn_set_code_inventory_v1.json';
const DEFAULT_OUTPUT_DIRECTORY = 'docs/audits/japanese_master_index_v4/sets';
const PLACEHOLDER_PATTERN =
  /^jpn-(?<source>artofpkm|tcgcollector):(?<sourceSetId>\d+)$/i;
const SOURCE_PRECEDENCE = new Map([
  ['tcgdex_ja_sets', 0],
  ['limitless_jp_sets', 1],
  ['tcgcollector_jp_sets', 2],
  ['artofpkm_jp_sets', 3],
  ['serebii_jp_sets', 4],
  ['bulbapedia_jp_expansions', 5],
  ['pokeguardian_jp_sets', 6],
  ['official_jp_products', 7],
]);

function parseArgs(argv) {
  const options = {
    assertionsPath: DEFAULT_ASSERTIONS_PATH,
    baselinePath: DEFAULT_BASELINE_PATH,
    outputDirectory: DEFAULT_OUTPUT_DIRECTORY,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--assertions' && argv[index + 1]) {
      options.assertionsPath = argv[++index];
    } else if (token === '--baseline' && argv[index + 1]) {
      options.baselinePath = argv[++index];
    } else if (token === '--output-dir' && argv[index + 1]) {
      options.outputDirectory = argv[++index];
    }
  }
  return options;
}

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replaceAll('&', ' and ')
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeCode(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/^jpn-/i, '')
    .toLocaleLowerCase('en-US');
}

function sourceAssertionKey(row) {
  return `${row.source_id}:${row.source_set_id}`;
}

function sourceIdForPlaceholder(source) {
  if (source.toLocaleLowerCase('en-US') === 'artofpkm') {
    return 'artofpkm_jp_sets';
  }
  return 'tcgcollector_jp_sets';
}

function compareAssertions(left, right) {
  return (
    (SOURCE_PRECEDENCE.get(left.source_id) ?? 99) -
      (SOURCE_PRECEDENCE.get(right.source_id) ?? 99) ||
    left.source_id.localeCompare(right.source_id) ||
    left.source_set_id.localeCompare(right.source_set_id, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  );
}

function uniqueSorted(values) {
  return [
    ...new Set(values.filter((value) => value !== null && value !== '')),
  ].sort((left, right) =>
    String(left).localeCompare(String(right), undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  );
}

class UnionFind {
  constructor(keys) {
    this.parent = new Map(keys.map((key) => [key, key]));
  }

  find(key) {
    const parent = this.parent.get(key);
    if (parent === undefined) throw new Error(`Unknown union key: ${key}`);
    if (parent === key) return key;
    const root = this.find(parent);
    this.parent.set(key, root);
    return root;
  }

  union(left, right) {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot === rightRoot) return;
    const [first, second] = [leftRoot, rightRoot].sort();
    this.parent.set(second, first);
  }
}

function groupBy(rows, keyBuilder) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyBuilder(row);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return groups;
}

function groupIsUniquePerSource(rows) {
  const counts = new Map();
  for (const row of rows) {
    counts.set(row.source_id, (counts.get(row.source_id) ?? 0) + 1);
  }
  return [...counts.values()].every((count) => count === 1);
}

function buildAssertionClusters(assertions) {
  const assertionByKey = new Map(
    assertions.map((row) => [sourceAssertionKey(row), row]),
  );
  const union = new UnionFind(assertionByKey.keys());
  const nameGroups = groupBy(assertions, (row) =>
    normalizeName(row.source_native_name),
  );
  const codeGroups = groupBy(
    assertions.filter((row) => row.source_id !== 'official_jp_products'),
    (row) => normalizeCode(row.source_native_code),
  );

  for (const rows of nameGroups.values()) {
    if (rows.length < 2 || !groupIsUniquePerSource(rows)) continue;
    const firstKey = sourceAssertionKey(rows[0]);
    for (const row of rows.slice(1)) {
      union.union(firstKey, sourceAssertionKey(row));
    }
  }
  for (const rows of codeGroups.values()) {
    if (rows.length < 2 || !groupIsUniquePerSource(rows)) continue;
    const firstKey = sourceAssertionKey(rows[0]);
    for (const row of rows.slice(1)) {
      union.union(firstKey, sourceAssertionKey(row));
    }
  }

  const clusters = new Map();
  for (const row of assertions) {
    const root = union.find(sourceAssertionKey(row));
    const cluster = clusters.get(root) ?? [];
    cluster.push(row);
    clusters.set(root, cluster);
  }
  return {
    clusters: [...clusters.values()].map((rows) =>
      [...rows].sort(compareAssertions),
    ),
    nameGroups,
    codeGroups,
  };
}

function baselineCanonicalKey(foldedSetCode) {
  return foldedSetCode.toLocaleLowerCase('en-US');
}

function internalRegistryKey(cluster) {
  const preferred = [...cluster].sort(compareAssertions)[0];
  const entryKind = cluster.every(
    (row) => row.source_id === 'official_jp_products',
  )
    ? 'product'
    : 'release';
  const signature = [
    entryKind,
    preferred.source_id,
    preferred.source_set_id,
    normalizeName(preferred.source_native_name),
    preferred.source_release_date ?? '',
  ].join('|');
  return `jpn-${entryKind}-${sha256(signature).slice(0, 16)}`;
}

function sourceCodeTargets(cluster, baselineByCode) {
  const targets = new Set();
  for (const row of cluster) {
    const code = normalizeCode(row.source_native_code);
    if (!code) continue;
    const target = baselineByCode.get(code);
    if (target && !PLACEHOLDER_PATTERN.test(target)) targets.add(target);
  }
  return [...targets].sort();
}

function clusterScopeStatus(cluster) {
  if (cluster.some((row) => row.source_id !== 'official_jp_products')) {
    return 'admitted_set_assertion';
  }
  if (cluster.some((row) => row.source_scope_hint === 'card_list_linked')) {
    return 'admitted_official_card_product';
  }
  if (
    cluster.some(
      (row) => row.source_scope_hint === 'official_expansion_release',
    )
  ) {
    return 'admitted_official_expansion_release';
  }
  if (
    cluster.some(
      (row) => row.source_scope_hint === 'official_constructed_deck_product',
    )
  ) {
    return 'admitted_official_constructed_deck_product';
  }
  if (
    cluster.some(
      (row) => row.source_scope_hint === 'official_card_distribution_product',
    )
  ) {
    return 'admitted_official_card_distribution_product';
  }
  return 'requires_product_scope_review';
}

function buildRegistry({ assertions, baseline }) {
  const { clusters, nameGroups, codeGroups } =
    buildAssertionClusters(assertions);
  const baselineRows = baseline.set_codes;
  const baselineByFolded = new Map();
  const baselineByCode = new Map();
  for (const row of baselineRows) {
    const folded = baselineCanonicalKey(row.folded_set_code);
    const group = baselineByFolded.get(folded) ?? [];
    group.push(row);
    baselineByFolded.set(folded, group);
    if (!PLACEHOLDER_PATTERN.test(row.set_code)) {
      baselineByCode.set(normalizeCode(row.set_code), folded);
    }
  }

  const clusterRecords = [];
  const assertionToRegistry = new Map();
  const assertionToCluster = new Map();
  for (const cluster of clusters) {
    const targets = sourceCodeTargets(cluster, baselineByCode);
    const registryKey = targets.length === 1
      ? targets[0]
      : internalRegistryKey(cluster);
    clusterRecords.push({
      registry_key: registryKey,
      target_conflict: targets.length > 1,
      target_candidates: targets,
      assertions: cluster,
      baseline_alias_merge: false,
    });
  }

  const targetClaims = new Map();
  for (const record of clusterRecords) {
    for (const target of record.target_candidates) {
      const claims = targetClaims.get(target) ?? [];
      claims.push(record);
      targetClaims.set(target, claims);
    }
  }
  const baselineTargetRemap = new Map();
  for (const record of clusterRecords) {
    if (record.target_candidates.length < 2) continue;
    const exclusivelyClaimed = record.target_candidates.every(
      (target) => (targetClaims.get(target) ?? []).length === 1,
    );
    if (!exclusivelyClaimed) continue;
    record.target_conflict = false;
    record.baseline_alias_merge = true;
    for (const target of record.target_candidates) {
      baselineTargetRemap.set(target, record.registry_key);
    }
  }

  for (const record of clusterRecords) {
    const registryKey = record.registry_key;
    const cluster = record.assertions;
    for (const row of cluster) {
      assertionToRegistry.set(sourceAssertionKey(row), registryKey);
      assertionToCluster.set(sourceAssertionKey(row), cluster);
    }
  }

  const placeholderResolutions = [];
  const placeholderToRegistry = new Map();
  for (const placeholder of baseline.source_placeholder_sets) {
    const match = placeholder.set_code.match(PLACEHOLDER_PATTERN);
    if (!match?.groups) {
      throw new Error(
        `Unrecognized source placeholder: ${placeholder.set_code}`,
      );
    }
    const directSourceKey = `${sourceIdForPlaceholder(match.groups.source)}:${match.groups.sourceSetId}`;
    const registryKey = assertionToRegistry.get(directSourceKey);
    if (!registryKey) {
      throw new Error(
        `Source placeholder has no direct source assertion: ${placeholder.set_code}`,
      );
    }
    const cluster = assertionToCluster.get(directSourceKey);
    const directAssertion = cluster.find(
      (row) => sourceAssertionKey(row) === directSourceKey,
    );
    const corroboratingSources = uniqueSorted(
      cluster
        .filter((row) => sourceAssertionKey(row) !== directSourceKey)
        .map((row) => row.source_id),
    );
    const counts = uniqueSorted(
      cluster.map((row) => row.source_expected_card_count),
    );
    const resolutionStatus = registryKey.startsWith('jpn-release-')
      ? 'resolved_to_internal_release_identity'
      : 'resolved_to_existing_canonical_code';
    placeholderToRegistry.set(placeholder.set_code, registryKey);
    placeholderResolutions.push({
      placeholder_set_code: placeholder.set_code,
      resolved_registry_key: registryKey,
      resolution_status: resolutionStatus,
      evidence_status:
        corroboratingSources.length > 0
          ? 'cross_source_corroborated'
          : 'single_source_direct',
      direct_source_key: directSourceKey,
      direct_source_name: directAssertion.source_native_name,
      direct_source_expected_card_count:
        directAssertion.source_expected_card_count,
      corroborating_sources: corroboratingSources,
      observed_expected_card_counts: counts,
      live_parent_rows: placeholder.parent_rows,
      live_public_rows: placeholder.public_rows,
    });
  }

  const entryBuilders = new Map();
  function ensureEntry(registryKey) {
    let entry = entryBuilders.get(registryKey);
    if (!entry) {
      entry = {
        registry_key: registryKey,
        baseline_rows: [],
        assertions: [],
      };
      entryBuilders.set(registryKey, entry);
    }
    return entry;
  }

  for (const [folded, rows] of baselineByFolded) {
    const placeholderRow = rows.find((row) =>
      PLACEHOLDER_PATTERN.test(row.set_code),
    );
    const registryKey = placeholderRow
      ? placeholderToRegistry.get(placeholderRow.set_code)
      : (baselineTargetRemap.get(folded) ?? folded);
    const entry = ensureEntry(registryKey);
    entry.baseline_rows.push(...rows);
  }
  for (const record of clusterRecords) {
    const entry = ensureEntry(record.registry_key);
    entry.assertions.push(...record.assertions);
  }

  const registryEntries = [...entryBuilders.values()]
    .map((entry) => {
      const assertionsForEntry = [...entry.assertions].sort(compareAssertions);
      const preferred = assertionsForEntry[0] ?? null;
      const liveAliases = uniqueSorted(
        entry.baseline_rows.map((row) => row.set_code),
      );
      const exactNames = uniqueSorted(
        assertionsForEntry.map((row) => row.source_native_name),
      );
      const nativeCodes = uniqueSorted(
        assertionsForEntry.map((row) => row.source_native_code),
      );
      const expectedCounts = uniqueSorted(
        assertionsForEntry.map((row) => row.source_expected_card_count),
      );
      const sources = uniqueSorted(
        assertionsForEntry.map((row) => row.source_id),
      );
      return {
        registry_key: entry.registry_key,
        registry_entry_kind:
          assertionsForEntry.length > 0 &&
          assertionsForEntry.every(
            (row) => row.source_id === 'official_jp_products',
          )
            ? 'official_product'
            : 'japanese_card_release',
        scope_status:
          assertionsForEntry.length > 0
            ? clusterScopeStatus(assertionsForEntry)
            : 'baseline_only',
        preferred_source_name: preferred?.source_native_name ?? null,
        source_native_names: exactNames,
        source_native_codes: nativeCodes,
        source_ids: sources,
        source_assertion_keys: assertionsForEntry.map(sourceAssertionKey),
        source_release_dates: uniqueSorted(
          assertionsForEntry.map((row) => row.source_release_date),
        ),
        source_era_labels: uniqueSorted(
          assertionsForEntry.map((row) => row.source_era_label),
        ),
        source_release_kinds: uniqueSorted(
          assertionsForEntry.map((row) => row.source_release_kind),
        ),
        source_container_kinds: uniqueSorted(
          assertionsForEntry.map((row) => row.source_container_kind),
        ),
        source_scope_hints: uniqueSorted(
          assertionsForEntry.map((row) => row.source_scope_hint),
        ),
        source_expected_card_counts: expectedCounts,
        independent_source_count: sources.length,
        live_set_code_aliases: liveAliases,
        live_parent_rows: entry.baseline_rows.reduce(
          (sum, row) => sum + row.parent_rows,
          0,
        ),
        live_public_rows: entry.baseline_rows.reduce(
          (sum, row) => sum + row.public_rows,
          0,
        ),
      };
    })
    .sort((left, right) =>
      left.registry_key.localeCompare(right.registry_key, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    );

  const nativeCodeDestinations = new Map();
  for (const entry of registryEntries) {
    for (const code of entry.source_native_codes) {
      const normalizedCode = normalizeCode(code);
      const destinations = nativeCodeDestinations.get(normalizedCode) ?? [];
      destinations.push(entry.registry_key);
      nativeCodeDestinations.set(normalizedCode, destinations);
    }
  }

  const aliases = [];
  for (const entry of registryEntries) {
    for (const alias of entry.live_set_code_aliases) {
      aliases.push({
        alias_type: 'live_set_code',
        alias_value: alias,
        normalized_alias_value: alias.toLocaleLowerCase('en-US'),
        registry_key: entry.registry_key,
        ambiguous: false,
      });
    }
    for (const assertionKey of entry.source_assertion_keys) {
      aliases.push({
        alias_type: 'source_set_id',
        alias_value: assertionKey,
        normalized_alias_value: assertionKey.toLocaleLowerCase('en-US'),
        registry_key: entry.registry_key,
        ambiguous: false,
      });
    }
    for (const code of entry.source_native_codes) {
      const normalizedCode = normalizeCode(code);
      aliases.push({
        alias_type: 'source_native_code',
        alias_value: code,
        normalized_alias_value: normalizedCode,
        registry_key: entry.registry_key,
        ambiguous:
          uniqueSorted(nativeCodeDestinations.get(normalizedCode) ?? [])
            .length > 1,
      });
    }
  }
  aliases.sort(
    (left, right) =>
      left.alias_type.localeCompare(right.alias_type) ||
      left.normalized_alias_value.localeCompare(
        right.normalized_alias_value,
        undefined,
        { numeric: true, sensitivity: 'base' },
      ) ||
      left.registry_key.localeCompare(right.registry_key),
  );

  const conflicts = [];
  for (const [nameKey, rows] of nameGroups) {
    if (groupIsUniquePerSource(rows)) continue;
    conflicts.push({
      conflict_type: 'source_name_reused_within_source',
      conflict_key: nameKey,
      severity: 'review',
      registry_keys: uniqueSorted(
        rows.map((row) => assertionToRegistry.get(sourceAssertionKey(row))),
      ),
      source_assertion_keys: rows.map(sourceAssertionKey).sort(),
    });
  }
  for (const [codeKey, rows] of codeGroups) {
    const registryKeys = uniqueSorted(
      rows.map((row) => assertionToRegistry.get(sourceAssertionKey(row))),
    );
    if (registryKeys.length < 2) continue;
    conflicts.push({
      conflict_type: 'native_code_maps_to_multiple_releases',
      conflict_key: codeKey,
      severity: 'blocking_for_code_promotion',
      registry_keys: registryKeys,
      source_assertion_keys: rows.map(sourceAssertionKey).sort(),
    });
  }
  for (const entry of registryEntries) {
    if (entry.source_expected_card_counts.length > 1) {
      conflicts.push({
        conflict_type: 'expected_card_count_disagreement',
        conflict_key: entry.registry_key,
        severity: 'review',
        registry_keys: [entry.registry_key],
        observed_values: entry.source_expected_card_counts,
        source_assertion_keys: entry.source_assertion_keys,
      });
    }
    if (entry.scope_status === 'requires_product_scope_review') {
      conflicts.push({
        conflict_type: 'official_product_scope_review',
        conflict_key: entry.registry_key,
        severity: 'scope_review',
        registry_keys: [entry.registry_key],
        source_assertion_keys: entry.source_assertion_keys,
      });
    }
  }
  conflicts.sort(
    (left, right) =>
      left.conflict_type.localeCompare(right.conflict_type) ||
      left.conflict_key.localeCompare(right.conflict_key, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
  );

  const representedAssertions = registryEntries.reduce(
    (sum, entry) => sum + entry.source_assertion_keys.length,
    0,
  );
  const unresolvedPlaceholders = placeholderResolutions.filter(
    (row) =>
      !row.resolved_registry_key ||
      PLACEHOLDER_PATTERN.test(row.resolved_registry_key),
  );
  const caseAliasRows = baseline.case_only_alias_groups.map((group) => ({
    folded_set_code: group.folded_set_code,
    registry_key: baselineCanonicalKey(group.folded_set_code),
    exact_set_codes: group.exact_set_codes,
    live_parent_rows: group.parent_rows,
    resolution_status: 'resolved_case_only_alias',
  }));

  return {
    summary: {
      source_assertion_count: assertions.length,
      represented_source_assertion_count: representedAssertions,
      registry_entry_count: registryEntries.length,
      japanese_release_entry_count: registryEntries.filter(
        (entry) => entry.registry_entry_kind === 'japanese_card_release',
      ).length,
      official_product_entry_count: registryEntries.filter(
        (entry) => entry.registry_entry_kind === 'official_product',
      ).length,
      baseline_only_entry_count: registryEntries.filter(
        (entry) => entry.scope_status === 'baseline_only',
      ).length,
      source_corroborated_baseline_alias_merge_count:
        baselineTargetRemap.size,
      source_placeholder_count: placeholderResolutions.length,
      unresolved_source_placeholder_count: unresolvedPlaceholders.length,
      case_only_alias_group_count: caseAliasRows.length,
      alias_count: aliases.length,
      conflict_count: conflicts.length,
      blocking_code_conflict_count: conflicts.filter(
        (row) => row.severity === 'blocking_for_code_promotion',
      ).length,
      product_scope_review_count: conflicts.filter(
        (row) => row.severity === 'scope_review',
      ).length,
    },
    registryEntries,
    aliases,
    conflicts,
    placeholderResolutions: placeholderResolutions.sort((left, right) =>
      left.placeholder_set_code.localeCompare(
        right.placeholder_set_code,
        undefined,
        { numeric: true, sensitivity: 'base' },
      ),
    ),
    caseAliasRows,
  };
}

function countedRows(rows, keyBuilder) {
  const counts = new Map();
  for (const row of rows) {
    const keys = keyBuilder(row);
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      if (key === null || key === undefined || key === '') continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        String(left.key).localeCompare(String(right.key), undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
    );
}

function coverageReport({ assertions, result }) {
  return {
    summary: result.summary,
    assertion_counts_by_source: countedRows(assertions, (row) => row.source_id),
    registry_counts_by_scope_status: countedRows(
      result.registryEntries,
      (row) => row.scope_status,
    ),
    registry_counts_by_entry_kind: countedRows(
      result.registryEntries,
      (row) => row.registry_entry_kind,
    ),
    registry_counts_by_source_depth: countedRows(
      result.registryEntries,
      (row) => String(row.independent_source_count),
    ),
    registry_counts_by_era_label: countedRows(
      result.registryEntries,
      (row) => row.source_era_labels,
    ),
    assertion_counts_by_release_kind: countedRows(
      assertions,
      (row) => row.source_release_kind,
    ),
    assertion_counts_by_official_container: countedRows(
      assertions.filter((row) => row.source_id === 'official_jp_products'),
      (row) => row.source_container_kind,
    ),
    assertion_counts_by_scope_hint: countedRows(
      assertions,
      (row) => row.source_scope_hint,
    ),
    conflict_counts_by_type: countedRows(
      result.conflicts,
      (row) => row.conflict_type,
    ),
    placeholder_counts_by_evidence_status: countedRows(
      result.placeholderResolutions,
      (row) => row.evidence_status,
    ),
    gate: {
      every_assertion_represented:
        result.summary.source_assertion_count ===
        result.summary.represented_source_assertion_count,
      source_placeholders_remaining:
        result.summary.unresolved_source_placeholder_count,
      unexplained_alias_collisions: result.conflicts.filter(
        (row) =>
          row.severity === 'blocking_for_code_promotion' &&
          !row.source_assertion_keys?.length,
      ).length,
      official_product_scope_reviews_remaining:
        result.summary.product_scope_review_count,
      card_level_promotion_allowed: false,
      reason:
        result.summary.product_scope_review_count === 0
          ? 'phase_2_registry_complete_card_level_work_remains_separately_gated'
          : 'phase_2_registry_review_is_still_active',
    },
  };
}

function coverageMarkdown(coverage) {
  const table = (rows, label) =>
    rows
      .map((row) => `| ${row.key} | ${row.count.toLocaleString('en-US')} |`)
      .join('\n') || `| No ${label} | 0 |`;
  return `# Japanese Master Index V4 Set Registry Coverage

Generated from preserved, offline-replayable source assertions. This report
does not authorize database or card-level promotion.

## Summary

| Measure | Count |
|---|---:|
| Source assertions | ${coverage.summary.source_assertion_count.toLocaleString('en-US')} |
| Registry entries | ${coverage.summary.registry_entry_count.toLocaleString('en-US')} |
| Japanese release entries | ${coverage.summary.japanese_release_entry_count.toLocaleString('en-US')} |
| Official product entries | ${coverage.summary.official_product_entry_count.toLocaleString('en-US')} |
| Source placeholders resolved | ${coverage.summary.source_placeholder_count.toLocaleString('en-US')} |
| Source placeholders unresolved | ${coverage.summary.unresolved_source_placeholder_count.toLocaleString('en-US')} |
| Case-only alias groups resolved | ${coverage.summary.case_only_alias_group_count.toLocaleString('en-US')} |
| Blocking native-code collisions | ${coverage.summary.blocking_code_conflict_count.toLocaleString('en-US')} |
| Official product scope reviews | ${coverage.summary.product_scope_review_count.toLocaleString('en-US')} |

## Assertions By Source

| Source | Assertions |
|---|---:|
${table(coverage.assertion_counts_by_source, 'sources')}

## Registry Scope

| Scope status | Entries |
|---|---:|
${table(coverage.registry_counts_by_scope_status, 'scope rows')}

## Registry Source Depth

| Independent sources | Entries |
|---:|---:|
${table(coverage.registry_counts_by_source_depth, 'source-depth rows')}

## Era Labels

Era labels are source-native and are not forced into a single chronology.

| Source era label | Registry entries |
|---|---:|
${table(coverage.registry_counts_by_era_label, 'era labels')}

## Official Product Containers

| Official container | Assertions |
|---|---:|
${table(coverage.assertion_counts_by_official_container, 'official containers')}

## Conflict Queue

| Conflict type | Rows |
|---|---:|
${table(coverage.conflict_counts_by_type, 'conflicts')}

## Gate

- Every source assertion represented: ${coverage.gate.every_assertion_represented}
- Source placeholders remaining: ${coverage.gate.source_placeholders_remaining}
- Unexplained alias collisions: ${coverage.gate.unexplained_alias_collisions}
- Official product scope reviews remaining: ${coverage.gate.official_product_scope_reviews_remaining}
- Card-level promotion allowed: ${coverage.gate.card_level_promotion_allowed}
- Registry completion does not authorize card-level promotion.
`;
}

async function readArtifact(inputPath) {
  return JSON.parse(await fs.readFile(path.resolve(inputPath), 'utf8'));
}

async function build(options) {
  assertAuditOnlyArgs(process.argv.slice(2));
  const [assertionsArtifact, baselineArtifact] = await Promise.all([
    readArtifact(options.assertionsPath),
    readArtifact(options.baselinePath),
  ]);
  const assertions = assertionsArtifact.content.assertions;
  const baseline = baselineArtifact.content;
  const result = buildRegistry({ assertions, baseline });
  if (
    result.summary.represented_source_assertion_count !==
    result.summary.source_assertion_count
  ) {
    throw new Error(
      'Not every source assertion is represented in the registry.',
    );
  }
  if (result.summary.unresolved_source_placeholder_count !== 0) {
    throw new Error('Source-placeholder resolution is incomplete.');
  }

  const generatedAt = assertionsArtifact.generated_at;
  const retrieval = {
    mode: 'offline_registry_resolution',
    source_assertions_path: options.assertionsPath.replaceAll('\\', '/'),
    source_assertions_fingerprint_sha256:
      assertionsArtifact.content_fingerprint_sha256,
    baseline_path: options.baselinePath.replaceAll('\\', '/'),
    baseline_fingerprint_sha256: baselineArtifact.content_fingerprint_sha256,
    resolver_version: PACKAGE_ID,
  };
  const outputDirectory = path.resolve(options.outputDirectory);
  const coverage = coverageReport({ assertions, result });
  const registryByAssertion = new Map(
    result.registryEntries.flatMap((entry) =>
      entry.source_assertion_keys.map((key) => [key, entry.registry_key]),
    ),
  );
  const officialScopeRows = assertions
    .filter((row) => row.source_id === 'official_jp_products')
    .map((row) => ({
      source_assertion_key: `${row.source_id}:${row.source_set_id}`,
      source_set_id: row.source_set_id,
      source_native_name: row.source_native_name,
      source_release_date: row.source_release_date,
      source_container_kind: row.source_container_kind,
      source_scope_disposition: row.source_scope_hint,
      source_url: row.source_url,
      registry_key: registryByAssertion.get(
        `${row.source_id}:${row.source_set_id}`,
      ),
    }));
  const conflictTypeCounts = new Map();
  for (const conflict of result.conflicts) {
    conflictTypeCounts.set(
      conflict.conflict_type,
      (conflictTypeCounts.get(conflict.conflict_type) ?? 0) + 1,
    );
  }
  const outputs = [
    [
      'jpn_set_registry_v1.json',
      {
        summary: result.summary,
        registry_entries: result.registryEntries,
      },
    ],
    [
      'jpn_set_alias_map_v1.json',
      {
        summary: {
          alias_count: result.aliases.length,
          case_only_alias_group_count: result.caseAliasRows.length,
        },
        case_only_alias_resolutions: result.caseAliasRows,
        aliases: result.aliases,
      },
    ],
    [
      'jpn_set_conflict_queue_v1.json',
      {
        summary: {
          conflict_count: result.conflicts.length,
          conflict_type_counts: [...conflictTypeCounts.entries()]
            .map(([conflictType, count]) => ({
              conflict_type: conflictType,
              count,
            }))
            .sort((left, right) =>
              left.conflict_type.localeCompare(right.conflict_type),
            ),
        },
        conflicts: result.conflicts,
      },
    ],
    [
      'jpn_source_placeholder_resolution_v1.json',
      {
        summary: {
          source_placeholder_count: result.placeholderResolutions.length,
          unresolved_source_placeholder_count:
            result.summary.unresolved_source_placeholder_count,
          resolution_fingerprint_sha256: contentFingerprint(
            result.placeholderResolutions,
          ),
        },
        resolutions: result.placeholderResolutions,
      },
    ],
    [
      'jpn_official_product_scope_v1.json',
      {
        summary: {
          official_product_count: officialScopeRows.length,
          disposition_counts: countedRows(
            officialScopeRows,
            (row) => row.source_scope_disposition,
          ),
          unresolved_scope_review_count: officialScopeRows.filter(
            (row) =>
              row.source_scope_disposition === 'requires_product_scope_review',
          ).length,
        },
        products: officialScopeRows,
      },
    ],
    ['jpn_set_registry_coverage_v1.json', coverage],
  ];

  for (const [fileName, content] of outputs) {
    await writeJsonArtifact(
      path.join(outputDirectory, fileName),
      buildArtifact({
        packageId: PACKAGE_ID,
        generatedAt,
        retrieval,
        content,
      }),
    );
  }
  await fs.writeFile(
    path.join(outputDirectory, 'jpn_set_registry_coverage_v1.md'),
    coverageMarkdown(coverage),
    'utf8',
  );
  console.log(
    `[jpn-master-index][registry] entries=${result.summary.registry_entry_count} aliases=${result.summary.alias_count} conflicts=${result.summary.conflict_count} placeholders=${result.summary.source_placeholder_count} unresolved=${result.summary.unresolved_source_placeholder_count}`,
  );
  return result;
}

export {
  DEFAULT_ASSERTIONS_PATH,
  DEFAULT_BASELINE_PATH,
  DEFAULT_OUTPUT_DIRECTORY,
  PACKAGE_ID,
  build,
  buildRegistry,
  coverageReport,
  normalizeCode,
  normalizeName,
  parseArgs,
};

const isEntrypoint =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));
if (isEntrypoint) {
  build(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error('[jpn-master-index][registry] fatal:', error);
    process.exitCode = 1;
  });
}
