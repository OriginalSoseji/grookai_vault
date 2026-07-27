import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadVerifiedDatasetFromManifest,
  readVerifiedArtifact,
  writeShardedRows,
} from './artifact_rows_v1.mjs';
import {
  buildArtifact,
  contentFingerprint,
  stableJson,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';

export const FINAL_ADMISSION_VERSION =
  'JPN-MASTER-INDEX-FINAL-ADMISSION-V1';

const DEFAULT_CANDIDATE_MANIFEST =
  'docs/audits/japanese_master_index_v4/index/'
  + 'candidate_union_manifest_v1.json';
const DEFAULT_SET_REGISTRY =
  'docs/audits/japanese_master_index_v4/sets/jpn_set_registry_v1.json';
const DEFAULT_SET_CONFLICTS =
  'docs/audits/japanese_master_index_v4/sets/'
  + 'jpn_set_conflict_queue_v1.json';
const DEFAULT_SOURCE_EXHAUSTION =
  'docs/audits/japanese_master_index_v4/index/source_exhaustion_v1.json';
const DEFAULT_FUTURE_QUEUE =
  'docs/audits/japanese_master_index_v4/index/'
  + 'deferred_future_targeted_source_queue_v1.json';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v4/final';

const SOURCE_ARTIFACTS = Object.freeze([
  {
    laneId: 'official_jp_cards',
    path: 'docs/audits/japanese_master_index_v4/cards/'
      + 'official_jp_card_assertions_v1.json.gz',
  },
  {
    laneId: 'artofpkm_jp_cards',
    path: 'docs/audits/japanese_master_index_v4/cards/'
      + 'artofpkm_jp_card_assertions_v1.json.gz',
  },
  {
    laneId: 'limitless_jp_cards',
    path: 'docs/audits/japanese_master_index_v4/cards/'
      + 'limitless_jp_card_assertions_v1.json.gz',
  },
  {
    laneId: 'tcgdex_ja_cards',
    path: 'docs/audits/japanese_master_index_v4/cards/'
      + 'tcgdex_ja_card_assertions_v1.json.gz',
  },
  {
    laneId: 'serebii_jp_cards',
    path: 'docs/audits/japanese_master_index_v4/cards/'
      + 'serebii_jp_card_assertions_v1.json.gz',
  },
  {
    laneId: 'bulbapedia_jp_card_lists',
    path: 'docs/audits/japanese_master_index_v4/cards/'
      + 'bulbapedia_jp_card_assertions_v1.json.gz',
  },
  {
    laneId: 'pokeguardian_release_reports',
    path: 'docs/audits/japanese_master_index_v4/cards/'
      + 'pokeguardian_jp_card_assertions_v1.json.gz',
  },
]);

const CANDIDATE_DATASETS = Object.freeze([
  'source_assertion_union_rows_v1',
  'assertion_resolution_rows_v1',
  'identity_candidate_rows_v1',
  'printing_candidate_rows_v1',
  'novel_family_projection_rows_v1',
  'candidate_conflict_rows_v1',
]);

const BASELINE_DATASETS = Object.freeze([
  'live_jpn_parent_rows_v1',
  'live_jpn_evidence_rows_v1',
  'live_jpn_printing_rows_v1',
  'live_jpn_family_review_rows_v1',
  'live_jpn_species_link_rows_v1',
  'language_agnostic_species_rows_v1',
]);

const OUTPUT_DATASETS = Object.freeze([
  {
    key: 'master_set_adjudication_rows_v1',
    packageId: 'JPN-MASTER-SET-ADJUDICATION-ROWS-SHARD-V1',
    requiredFile: 'jpn_master_set_adjudication_v1.json',
  },
  {
    key: 'master_admissible_set_rows_v1',
    packageId: 'JPN-MASTER-ADMISSIBLE-SET-ROWS-SHARD-V1',
    requiredFile: 'jpn_master_admissible_sets_v1.json',
  },
  {
    key: 'master_card_resolution_rows_v1',
    packageId: 'JPN-MASTER-CARD-RESOLUTION-ROWS-SHARD-V1',
    requiredFile: 'jpn_master_resolved_card_identities_v1.json',
  },
  {
    key: 'master_admissible_card_rows_v1',
    packageId: 'JPN-MASTER-ADMISSIBLE-CARD-ROWS-SHARD-V1',
    requiredFile: 'jpn_master_admissible_cards_v1.json',
  },
  {
    key: 'master_printing_fact_rows_v1',
    packageId: 'JPN-MASTER-PRINTING-FACT-ROWS-SHARD-V1',
    requiredFile: 'jpn_master_resolved_printing_facts_v1.json',
  },
  {
    key: 'master_admissible_printing_rows_v1',
    packageId: 'JPN-MASTER-ADMISSIBLE-PRINTING-ROWS-SHARD-V1',
    requiredFile: 'jpn_master_admissible_printings_v1.json',
  },
  {
    key: 'master_family_relationship_rows_v1',
    packageId: 'JPN-MASTER-FAMILY-RELATIONSHIP-ROWS-SHARD-V1',
    requiredFile: 'jpn_master_family_relationships_v1.json',
  },
  {
    key: 'master_assertion_disposition_rows_v1',
    packageId: 'JPN-MASTER-ASSERTION-DISPOSITION-ROWS-SHARD-V1',
    requiredFile: 'jpn_master_assertion_dispositions_v1.json',
  },
  {
    key: 'master_blocked_fact_rows_v1',
    packageId: 'JPN-MASTER-BLOCKED-FACT-ROWS-SHARD-V1',
    requiredFile: 'jpn_master_blocked_facts_v1.json',
  },
  {
    key: 'master_adjudicated_exclusion_rows_v1',
    packageId: 'JPN-MASTER-ADJUDICATED-EXCLUSION-ROWS-SHARD-V1',
    requiredFile: 'jpn_master_adjudicated_exclusions_v1.json',
  },
  {
    key: 'master_coverage_matrix_rows_v1',
    packageId: 'JPN-MASTER-COVERAGE-MATRIX-ROWS-SHARD-V1',
    requiredFile: 'jpn_master_coverage_matrix_v1.json',
  },
  {
    key: 'master_source_gap_rows_v1',
    packageId: 'JPN-MASTER-SOURCE-GAP-ROWS-SHARD-V1',
    requiredFile: 'jpn_master_source_gap_queue_v1.json',
  },
]);

const SOURCE_FAMILY_ALIASES = new Map([
  ['official_jp_cards', 'official_jp'],
  ['pokemon_card_official_jp', 'official_jp'],
  ['artofpkm_jp_cards', 'artofpkm'],
  ['artofpkm_jp', 'artofpkm'],
  ['limitless_jp_cards', 'limitless'],
  ['limitless_tcg_jp', 'limitless'],
  ['tcgcollector_jp', 'tcgcollector'],
  ['tcgcollector_jp_cards', 'tcgcollector'],
  ['pokellector_jp', 'pokellector'],
  ['pokellector_jp_cards', 'pokellector'],
  ['tcgdex_ja_cards', 'tcgdex'],
  ['tcgdex_ja', 'tcgdex'],
  ['bulbapedia_jp_card_lists', 'bulbapedia'],
  ['bulbapedia_jp_card_list', 'bulbapedia'],
  ['bulbapedia_pikachu_tcg', 'bulbapedia'],
  ['serebii_jp_cards', 'serebii'],
  ['serebii_jp', 'serebii'],
  ['pokeguardian_release_reports', 'pokeguardian'],
  ['pokeguardian_jp', 'pokeguardian'],
  ['pokeguardian_jp_release_report', 'pokeguardian'],
]);

const HUMAN_READABLE_FAMILIES = new Set([
  'official_jp',
  'tcgcollector',
  'artofpkm',
  'limitless',
  'pokellector',
  'bulbapedia',
  'serebii',
  'pokeguardian',
]);

const OFFICIAL_FAMILY = 'official_jp';
const REQUIRED_RELEASE_COVERAGE_LANES = Object.freeze([
  'expansion_or_subset',
  'promo_series',
  'constructed_deck',
  'product_exclusive_distribution',
  'tournament_trophy_event',
  'campaign',
  'vending',
  'magazine_movie_media',
  'unnumbered',
]);

function parseArgs(argv) {
  const options = {
    candidateManifest: DEFAULT_CANDIDATE_MANIFEST,
    setRegistry: DEFAULT_SET_REGISTRY,
    setConflicts: DEFAULT_SET_CONFLICTS,
    sourceExhaustion: DEFAULT_SOURCE_EXHAUSTION,
    futureQueue: DEFAULT_FUTURE_QUEUE,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    generatedAt: new Date().toISOString(),
  };
  for (const arg of argv) {
    if (arg.startsWith('--candidate-manifest=')) {
      options.candidateManifest = arg.slice('--candidate-manifest='.length);
    } else if (arg.startsWith('--set-registry=')) {
      options.setRegistry = arg.slice('--set-registry='.length);
    } else if (arg.startsWith('--set-conflicts=')) {
      options.setConflicts = arg.slice('--set-conflicts='.length);
    } else if (arg.startsWith('--source-exhaustion=')) {
      options.sourceExhaustion = arg.slice('--source-exhaustion='.length);
    } else if (arg.startsWith('--future-queue=')) {
      options.futureQueue = arg.slice('--future-queue='.length);
    } else if (arg.startsWith('--output-root=')) {
      options.outputRoot = arg.slice('--output-root='.length);
    } else if (arg.startsWith('--generated-at=')) {
      options.generatedAt = arg.slice('--generated-at='.length);
    } else if (
      arg === '--apply'
      || arg === '--write'
      || arg === '--mutate'
      || arg.startsWith('--database')
      || arg.startsWith('--storage')
    ) {
      throw new Error(`Mutation-capable flag forbidden: ${arg}`);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null
    && value !== undefined
    && String(value).trim() !== ''))].sort();
}

function normalizedText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizedName(value) {
  return normalizedText(value).toLocaleLowerCase('en-US');
}

function printedNameEquivalenceKey(value) {
  return normalizedName(value).replace(/\s+/g, '');
}

function normalizedFinish(value) {
  const normalized = normalizedName(value)
    .replace(/[\s_-]+/g, ' ')
    .trim();
  const aliases = new Map([
    ['standard', 'normal'],
    ['regular', 'normal'],
    ['non holo', 'normal'],
    ['non holofoil', 'normal'],
    ['holofoil', 'holo'],
    ['reverse holofoil', 'reverse_holo'],
    ['reverse holo', 'reverse_holo'],
    ['mirror holo', 'reverse_holo'],
  ]);
  return aliases.get(normalized) ?? normalized.replaceAll(' ', '_');
}

function sourceFamily(value) {
  const normalized = normalizedName(value);
  return SOURCE_FAMILY_ALIASES.get(normalized) ?? null;
}

function sourceFamiliesForCandidate(candidate, assertionByKey) {
  return unique([
    ...(candidate.source_ids ?? []).map(sourceFamily),
    ...(candidate.assertion_keys ?? []).map(
      (key) => sourceFamily(assertionByKey.get(key)?.source_id),
    ),
    ...(candidate.assertion_keys ?? []).map(
      (key) => sourceFamily(assertionByKey.get(key)?.source_family),
    ),
  ]);
}

function hasJapaneseScript(value) {
  return /[\u3040-\u30ff\u3400-\u9fff]/u.test(value ?? '');
}

function releaseLane(entry) {
  const text = normalizedName([
    entry.registry_entry_kind,
    entry.scope_status,
    ...(entry.source_container_kinds ?? []),
    ...(entry.source_release_kinds ?? []),
    ...(entry.source_scope_hints ?? []),
    ...(entry.source_native_names ?? []),
  ].join(' '));
  if (/vending/.test(text)) return 'vending';
  if (/magazine|movie|media/.test(text)) return 'magazine_movie_media';
  if (/trophy|tournament|event/.test(text)) {
    return 'tournament_trophy_event';
  }
  if (/campaign/.test(text)) return 'campaign';
  if (/deck|starter/.test(text)) return 'constructed_deck';
  if (/promo/.test(text)) return 'promo_series';
  if (/gift|box|product|distribution/.test(text)) {
    return 'product_exclusive_distribution';
  }
  if (/reference/.test(text)) return 'non_standard_reference_lane';
  return 'expansion_or_subset';
}

function isPlaceholderRegistryKey(value) {
  return /^(?:tcgcollector|artofpkm|pokellector|tcgdex|bulbapedia|serebii|pokeguardian|official):/i
    .test(value ?? '');
}

function makeCountRows(rows, dimension, valueSelector, statusSelector) {
  const counts = new Map();
  for (const row of rows) {
    const value = valueSelector(row) ?? 'unknown';
    const status = statusSelector(row) ?? 'unknown';
    const key = `${value}|${status}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([key, count]) => {
    const [value, status] = key.split('|');
    return {
      coverage_key: `${dimension}:${value}:${status}`,
      dimension,
      value,
      status,
      count,
    };
  });
}

function classifyAssertionDomain(assertion) {
  const category = normalizedName(assertion?.category);
  const typeLine = normalizedName(assertion?.type_line);
  const imageUrls = assertion?.image_urls ?? [];
  const combined = `${category} ${typeLine}`;

  if (
    /energy|エネルギー/.test(combined)
    || imageUrls.some((url) => /_E_/i.test(url))
  ) {
    return 'energy';
  }
  if (
    /trainer|supporter|item|tool|stadium|トレーナ|グッズ|サポート|スタジアム|どうぐ/
      .test(combined)
    || /^(?:i|su|t|st|pt)(?:\s|$|\[)/i.test(typeLine)
    || imageUrls.some((url) => /_T_/i.test(url))
  ) {
    return 'trainer';
  }
  if (
    /pokemon|pokémon|basic|stage|vmax|vstar|mega|break|level|restored|evolution|たね|進化|ポケモン/
      .test(combined)
    || imageUrls.some((url) => /_P_/i.test(url))
  ) {
    return 'pokemon';
  }
  return null;
}

function classifyFamily({
  candidate,
  assertions,
  existingLinks,
  projection,
  activeReviews,
}) {
  const speciesIds = unique(existingLinks.map((row) => row.species_id));
  if (speciesIds.length === 1) {
    return {
      status: 'resolved_species',
      domain: 'pokemon',
      familyKey: `species:${speciesIds[0]}`,
      speciesId: speciesIds[0],
      relationshipType: 'language_agnostic_species',
      evidenceBasis: 'existing_active_species_relationship',
      confidence: Number(existingLinks[0]?.confidence ?? 1),
      reviewStatus: 'existing_reviewed_relationship',
    };
  }
  if (speciesIds.length > 1) {
    return {
      status: 'blocked',
      domain: 'pokemon',
      reason: 'multiple_active_species_relationships',
      speciesIds,
    };
  }

  const votes = unique(assertions.map(classifyAssertionDomain));
  if (votes.includes('pokemon') && votes.some((row) => row !== 'pokemon')) {
    return {
      status: 'blocked',
      domain: null,
      reason: 'conflicting_card_domain_evidence',
      domainVotes: votes,
    };
  }
  if (votes.includes('trainer') && votes.includes('energy')) {
    return {
      status: 'blocked',
      domain: null,
      reason: 'conflicting_card_domain_evidence',
      domainVotes: votes,
    };
  }
  if (votes.length === 1 && ['trainer', 'energy'].includes(votes[0])) {
    return {
      status: 'resolved_domain',
      domain: votes[0],
      familyKey: `domain:${votes[0]}`,
      speciesId: null,
      relationshipType: 'classified_non_pokemon_domain',
      evidenceBasis: 'explicit_source_card_type',
      confidence: 0.95,
      reviewStatus: 'source_evidence_classified',
    };
  }
  if (projection?.projection_status === 'projected_exact') {
    return {
      status: 'resolved_species',
      domain: 'pokemon',
      familyKey: `species:${projection.species_id}`,
      speciesId: projection.species_id,
      relationshipType: 'language_agnostic_species',
      evidenceBasis: 'deterministic_exact_projection',
      confidence: 0.9,
      reviewStatus: 'reviewed_for_index_only_not_promoted',
      projectionMethods: projection.projection_methods ?? [],
    };
  }
  if (votes.includes('pokemon')) {
    return {
      status: 'blocked',
      domain: 'pokemon',
      reason: projection?.projection_status === 'review_required'
        ? 'pokemon_species_ambiguous'
        : 'pokemon_species_unresolved',
      ambiguities: projection?.ambiguities ?? [],
    };
  }
  if (
    candidate.candidate_kind === 'existing_parent'
    && activeReviews.some((row) => row.review_status === 'rejected')
  ) {
    return {
      status: 'resolved_domain',
      domain: 'documented_non_family',
      familyKey: 'domain:documented_non_family',
      speciesId: null,
      relationshipType: 'documented_non_family_status',
      evidenceBasis: 'existing_active_rejected_family_review',
      confidence: 0.8,
      reviewStatus: 'existing_reviewed_non_family',
    };
  }
  return {
    status: 'blocked',
    domain: null,
    reason: projection?.projection_status === 'review_required'
      ? 'family_relationship_ambiguous'
      : 'family_domain_unresolved',
    ambiguities: projection?.ambiguities ?? [],
  };
}

function setAdjudicationRows({
  registryEntries,
  setConflicts,
  futureRegistryKeys,
}) {
  const conflictsByRegistry = new Map();
  for (const conflict of setConflicts) {
    for (const registryKey of conflict.registry_keys ?? []) {
      const rows = conflictsByRegistry.get(registryKey) ?? [];
      rows.push(conflict);
      conflictsByRegistry.set(registryKey, rows);
    }
  }
  return registryEntries.map((entry) => {
    const future = futureRegistryKeys.has(entry.registry_key);
    const placeholder = isPlaceholderRegistryKey(entry.registry_key);
    const governed = entry.scope_status === 'admitted_set_assertion'
      || entry.scope_status?.startsWith('admitted_official_');
    const conflicts = conflictsByRegistry.get(entry.registry_key) ?? [];
    const japaneseNames = unique(
      (entry.source_native_names ?? []).filter(hasJapaneseScript),
    );
    const englishNames = unique(
      (entry.source_native_names ?? []).filter(
        (value) => !hasJapaneseScript(value),
      ),
    );
    let completionStatus = 'source_limited';
    let masterAdmissible = false;
    let exclusionReason = null;
    if (future) {
      completionStatus = 'out_of_scope';
      exclusionReason = 'future_release_after_build_as_of';
    } else if (placeholder) {
      completionStatus = 'conflict_blocked';
      exclusionReason = 'source_owned_placeholder_registry_key';
    } else if (governed) {
      completionStatus = entry.independent_source_count > 1
        ? 'source_agreed_identity'
        : 'identity_complete_finish_incomplete';
      masterAdmissible = true;
    } else if (entry.scope_status === 'baseline_only') {
      completionStatus = 'source_limited';
    } else {
      completionStatus = 'manual_review_required';
    }
    return {
      jpn_set_key: entry.registry_key,
      canonical_name_ja:
        japaneseNames[0]
        ?? entry.preferred_source_name
        ?? entry.source_native_names?.[0]
        ?? null,
      collector_facing_name_en:
        englishNames[0] ?? entry.preferred_source_name ?? null,
      release_kind: releaseLane(entry),
      era_evidence: unique(entry.source_era_labels ?? []),
      release_date_evidence: unique(entry.source_release_dates ?? []),
      official_code_evidence: unique(entry.source_native_codes ?? []),
      source_aliases: unique([
        ...(entry.source_native_names ?? []),
        ...(entry.live_set_code_aliases ?? []),
      ]),
      expected_card_count_evidence: entry.source_expected_card_counts ?? [],
      parent_relationships: [],
      source_ids: unique(entry.source_ids ?? []),
      independent_source_count: entry.independent_source_count ?? 0,
      registry_entry_kind: entry.registry_entry_kind,
      source_scope_status: entry.scope_status,
      conflict_keys: unique(conflicts.map((row) => row.conflict_key)),
      conflict_status: conflicts.length > 0
        ? 'preserved_non_identity_blocking_conflicts'
        : 'none',
      completion_status: completionStatus,
      master_admissible: masterAdmissible,
      exclusion_reason: exclusionReason,
    };
  }).sort((left, right) => (
    left.jpn_set_key.localeCompare(right.jpn_set_key)
  ));
}

function buildConflictIndexes(conflicts) {
  const hardAssertionConflicts = new Map();
  const conflictsByCandidate = new Map();
  const unresolvedAssertions = new Map();
  for (const conflict of conflicts) {
    if (conflict.candidate_key) {
      const rows = conflictsByCandidate.get(conflict.candidate_key) ?? [];
      rows.push(conflict);
      conflictsByCandidate.set(conflict.candidate_key, rows);
    }
    for (const assertionKey of conflict.assertion_keys ?? []) {
      const rows = unresolvedAssertions.get(assertionKey) ?? [];
      rows.push(conflict);
      unresolvedAssertions.set(assertionKey, rows);
      if (
        conflict.conflict_type === 'same_source_id_conflicting_coordinates'
        || conflict.conflict_type === 'numbered_identity_group_ambiguous'
      ) {
        hardAssertionConflicts.set(assertionKey, true);
      }
    }
  }
  return {
    hardAssertionConflicts,
    conflictsByCandidate,
    unresolvedAssertions,
  };
}

function cardResolutionRows({
  identityCandidates,
  assertionByKey,
  parentById,
  setRowsByKey,
  futureRegistryKeys,
  conflictIndexes,
  speciesLinksByCard,
  projectionByCandidate,
  reviewsByCard,
}) {
  return identityCandidates.map((candidate) => {
    const parent = parentById.get(candidate.existing_card_print_id);
    const assertions = (candidate.assertion_keys ?? [])
      .map((key) => assertionByKey.get(key))
      .filter(Boolean);
    const registryKeys = unique(candidate.registry_keys ?? []);
    const setRows = registryKeys
      .map((key) => setRowsByKey.get(key))
      .filter(Boolean);
    const families = sourceFamiliesForCandidate(candidate, assertionByKey);
    const hasOfficial = families.includes(OFFICIAL_FAMILY);
    const hasHumanReadable = families.some(
      (family) => HUMAN_READABLE_FAMILIES.has(family),
    );
    const rawNames = unique([
      ...(candidate.printed_name_ja_candidates ?? []).map(normalizedText),
      normalizedText(parent?.printed_name),
    ]);
    const japaneseNames = rawNames.filter(hasJapaneseScript);
    const japaneseNameKeys = unique(
      japaneseNames.map(printedNameEquivalenceKey),
    );
    const officialJapaneseNames = unique(
      assertions
        .filter((row) => sourceFamily(row.source_id) === OFFICIAL_FAMILY
          || sourceFamily(row.source_family) === OFFICIAL_FAMILY)
        .map((row) => normalizedText(row.printed_name))
        .filter(hasJapaneseScript),
    );
    const canonicalJapaneseName =
      officialJapaneseNames[0]
      ?? japaneseNames.find(
        (name) => name === normalizedText(parent?.printed_name),
      )
      ?? japaneseNames[0]
      ?? null;
    const printedNumbers = unique([
      ...(candidate.printed_number_candidates ?? []).map(normalizedText),
      normalizedText(parent?.printed_number),
      normalizedText(parent?.number_plain),
    ]);
    const exactNumber = normalizedText(candidate.number_core)
      || printedNumbers[0]
      || null;
    const images = unique([
      ...(candidate.image_urls ?? []),
      parent?.image_url,
      ...assertions.flatMap((row) => row.image_urls ?? []),
    ]);
    const unnumberedGoverned = !exactNumber
      && (
        candidate.candidate_kind === 'novel_unnumbered_exact_image'
        || (
          images.length > 0
          && assertions.some((row) => row.unnumbered_label)
        )
      );
    const hardConflict = (candidate.assertion_keys ?? []).some(
      (key) => conflictIndexes.hardAssertionConflicts.has(key),
    );
    const family = classifyFamily({
      candidate,
      assertions,
      existingLinks:
        speciesLinksByCard.get(candidate.existing_card_print_id) ?? [],
      projection: projectionByCandidate.get(candidate.candidate_key),
      activeReviews: reviewsByCard.get(candidate.existing_card_print_id) ?? [],
    });
    const reasons = [];
    let disposition = 'master_admissible';
    if (registryKeys.length !== 1 || setRows.length !== 1) {
      reasons.push('release_container_unresolved_or_ambiguous');
    } else if (futureRegistryKeys.has(registryKeys[0])) {
      disposition = 'adjudicated_excluded';
      reasons.push('future_release_after_build_as_of');
    } else if (!setRows[0].master_admissible) {
      reasons.push('release_container_not_master_admissible');
    }
    if (registryKeys.some(isPlaceholderRegistryKey)) {
      reasons.push('source_owned_placeholder_registry_key');
    }
    if (!exactNumber && !unnumberedGoverned) {
      reasons.push('printed_number_or_governed_unnumbered_key_missing');
    }
    if (japaneseNameKeys.length !== 1) {
      reasons.push(
        japaneseNameKeys.length === 0
          ? 'japanese_printed_name_missing'
          : 'japanese_printed_name_conflicting',
      );
    }
    if (hardConflict) reasons.push('unresolved_exact_identity_collision');
    if (candidate.promotion_status === 'review_required') {
      reasons.push('candidate_requires_manual_review');
    }
    if (families.length === 0) {
      reasons.push('preserved_source_evidence_missing');
    } else if (
      !hasOfficial
      && !(families.length >= 2 && hasHumanReadable)
    ) {
      reasons.push(
        families.length < 2
          ? 'single_source_only'
          : 'human_readable_source_requirement_not_met',
      );
    }
    if (family.status === 'blocked') {
      reasons.push(family.reason);
    }
    if (disposition !== 'adjudicated_excluded' && reasons.length > 0) {
      disposition = 'blocked';
    }
    const evidenceStatus = hasOfficial
      ? 'official_identity_supported'
      : families.length >= 2 && hasHumanReadable
        ? 'multi_source_identity_supported'
        : families.length === 1
          ? 'single_source_only'
          : 'needs_manual_review';
    const modifiers = unique([
      normalizedText(parent?.printed_identity_modifier),
      ...assertions.flatMap((row) => row.identity_modifiers ?? [])
        .map(normalizedText),
    ]);
    return {
      jpn_card_identity_key: candidate.candidate_key,
      jpn_set_key: registryKeys.length === 1 ? registryKeys[0] : null,
      language: 'ja',
      market: 'JP',
      printed_number: exactNumber,
      governed_unnumbered_key: unnumberedGoverned
        ? `unnumbered:${contentFingerprint({
          set: registryKeys[0] ?? null,
          name: canonicalJapaneseName,
          images,
        })}`
        : null,
      printed_name_ja:
        japaneseNameKeys.length === 1 ? canonicalJapaneseName : null,
      printed_name_ja_candidates: japaneseNames,
      collector_facing_name_en:
        unique(candidate.english_name_candidates ?? [])[0] ?? null,
      identity_modifiers: modifiers,
      edition_mark_evidence: unique(
        assertions.flatMap((row) => row.edition_labels ?? []),
      ),
      regulation_mark_evidence: unique([
        parent?.regulation_mark,
        ...assertions.map((row) => row.regulation_mark),
      ]),
      distribution_mark_evidence: unique([
        ...assertions.flatMap((row) => row.distribution_labels ?? []),
        ...assertions.flatMap((row) => row.stamp_labels ?? []),
      ]),
      rarity_evidence: unique(
        assertions.map((row) => normalizedText(row.rarity)),
      ),
      card_type: family.domain,
      card_type_evidence: unique(assertions.flatMap((row) => [
        normalizedText(row.category),
        normalizedText(row.type_line),
      ])),
      card_domain: family.domain,
      source_assertion_keys: unique(candidate.assertion_keys ?? []),
      baseline_evidence_ids: unique(candidate.baseline_evidence_ids ?? []),
      source_ids: unique(candidate.source_ids ?? []),
      independent_source_families: families,
      independent_source_count: families.length,
      human_readable_source_present: hasHumanReadable,
      official_source_present: hasOfficial,
      evidence_status: evidenceStatus,
      conflict_status: hardConflict ? 'conflicting' : 'none',
      family_status: family.status,
      family_reason: family.reason ?? null,
      family_key: family.familyKey ?? null,
      existing_card_print_id: candidate.existing_card_print_id,
      existing_gv_id: candidate.existing_gv_id,
      image_urls: images,
      candidate_kind: candidate.candidate_kind,
      admission_status: disposition === 'master_admissible'
        ? 'master_admissible'
        : disposition === 'adjudicated_excluded'
          ? 'adjudicated_excluded'
          : evidenceStatus === 'single_source_only'
            ? 'single_source_only'
            : hardConflict
              ? 'conflicting'
              : 'needs_manual_review',
      final_disposition: disposition,
      disposition_reasons: unique(reasons),
    };
  }).sort((left, right) => (
    left.jpn_card_identity_key.localeCompare(right.jpn_card_identity_key)
  ));
}

function familyRelationshipRows({
  cardRows,
  speciesLinksByCard,
  projectionByCandidate,
  assertionByKey,
  reviewsByCard,
}) {
  return cardRows
    .filter((row) => row.final_disposition === 'master_admissible')
    .map((row) => {
      const candidate = {
        candidate_kind: row.candidate_kind,
        existing_card_print_id: row.existing_card_print_id,
      };
      const family = classifyFamily({
        candidate,
        assertions: row.source_assertion_keys
          .map((key) => assertionByKey.get(key))
          .filter(Boolean),
        existingLinks:
          speciesLinksByCard.get(row.existing_card_print_id) ?? [],
        projection: projectionByCandidate.get(row.jpn_card_identity_key),
        activeReviews:
          reviewsByCard.get(row.existing_card_print_id) ?? [],
      });
      if (family.status === 'blocked') {
        throw new Error(
          `Admissible card has blocked family: ${row.jpn_card_identity_key}`,
        );
      }
      return {
        jpn_card_identity_key: row.jpn_card_identity_key,
        language_agnostic_family_key: family.familyKey,
        species_id: family.speciesId ?? null,
        family_domain: family.domain,
        relationship_type: family.relationshipType,
        evidence_basis: family.evidenceBasis,
        confidence: family.confidence,
        review_status: family.reviewStatus,
        projection_methods: family.projectionMethods ?? [],
        database_promotion_status: 'index_only_not_promoted',
      };
    })
    .sort((left, right) => (
      left.jpn_card_identity_key.localeCompare(right.jpn_card_identity_key)
    ));
}

function printingFactRows({
  printingCandidates,
  cardRowsByKey,
  assertionByKey,
  conflictIndexes,
}) {
  return printingCandidates.map((printing) => {
    const parent = cardRowsByKey.get(printing.identity_candidate_key);
    const finish = normalizedFinish(printing.finish_key);
    const parentAssertions = (parent?.source_assertion_keys ?? [])
      .map((key) => assertionByKey.get(key))
      .filter(Boolean);
    const explicitKeys = printing.assertion_keys?.length > 0
      ? printing.assertion_keys
      : parentAssertions
        .filter((assertion) => (
          (assertion.finish_labels ?? [])
            .map(normalizedFinish)
            .includes(finish)
        ))
        .map((assertion) => assertion.assertion_key);
    const evidenceAssertions = unique(explicitKeys)
      .map((key) => assertionByKey.get(key))
      .filter(Boolean);
    const families = unique(evidenceAssertions.flatMap((row) => [
      sourceFamily(row.source_id),
      sourceFamily(row.source_family),
    ]));
    const hasHumanReadable = families.some(
      (family) => HUMAN_READABLE_FAMILIES.has(family),
    );
    const hardConflict = explicitKeys.some(
      (key) => conflictIndexes.hardAssertionConflicts.has(key),
    );
    const reasons = [];
    if (!parent || parent.final_disposition !== 'master_admissible') {
      reasons.push('parent_identity_not_master_admissible');
    }
    if (!finish) reasons.push('canonical_finish_key_missing');
    if (families.length < 2) reasons.push('finish_source_count_below_two');
    if (!hasHumanReadable) {
      reasons.push('finish_human_readable_source_requirement_not_met');
    }
    if (hardConflict) reasons.push('finish_evidence_conflicting');
    const masterAdmissible = reasons.length === 0;
    return {
      printing_fact_key: printing.printing_candidate_key,
      parent_jpn_card_identity_key: printing.identity_candidate_key,
      canonical_finish_key: finish || null,
      exact_source_assertion_keys: unique(explicitKeys),
      independent_source_families: families,
      independent_source_count: families.length,
      human_readable_source_present: hasHumanReadable,
      stamp_details: unique(
        evidenceAssertions.flatMap((row) => row.stamp_labels ?? []),
      ),
      distribution_details: unique(
        evidenceAssertions.flatMap((row) => row.distribution_labels ?? []),
      ),
      source_label_aliases: unique(
        evidenceAssertions.flatMap((row) => row.finish_labels ?? []),
      ),
      confidence: masterAdmissible ? 1 : 0,
      adjudication_status: masterAdmissible
        ? 'master_admissible'
        : finish
          ? 'needs_manual_review'
          : 'working_candidate',
      final_disposition: masterAdmissible
        ? 'master_admissible'
        : 'blocked',
      disposition_reasons: unique(reasons),
      existing_card_printing_id: printing.existing_card_printing_id,
      existing_printing_gv_id: printing.existing_printing_gv_id,
      candidate_kind: printing.candidate_kind,
    };
  }).sort((left, right) => (
    left.printing_fact_key.localeCompare(right.printing_fact_key)
  ));
}

function assertionDispositionRows({
  sourceAssertionUnion,
  cardRowsByKey,
  conflictIndexes,
  futureRegistryKeys,
}) {
  return sourceAssertionUnion.map((row) => {
    const card = cardRowsByKey.get(row.projected_candidate_key);
    const conflictRows = row.assertion_key
      ? conflictIndexes.unresolvedAssertions.get(row.assertion_key) ?? []
      : [];
    let disposition = 'blocked_working_candidate';
    let reason = 'candidate_not_master_admissible';
    if (card?.final_disposition === 'master_admissible') {
      disposition = 'mapped_master_admissible';
      reason = 'candidate_satisfies_identity_and_family_admission';
    } else if (card?.final_disposition === 'adjudicated_excluded') {
      disposition = 'adjudicated_excluded';
      reason = 'future_or_out_of_scope_release';
    } else if (futureRegistryKeys.has(row.registry_key)) {
      disposition = 'adjudicated_excluded';
      reason = 'future_release_after_build_as_of';
    } else if (!row.projected_candidate_key && conflictRows.length > 0) {
      disposition = 'conflict_blocked';
      reason = unique(conflictRows.map((item) => item.conflict_type)).join(',');
    } else if (!row.projected_candidate_key) {
      disposition = 'needs_manual_review';
      reason = row.resolution_status ?? 'identity_candidate_unresolved';
    } else if (card?.admission_status === 'single_source_only') {
      disposition = 'single_source_only';
      reason = 'identity_admission_requires_independent_corroboration';
    }
    return {
      union_row_key: row.union_row_key,
      assertion_key: row.assertion_key,
      evidence_id: row.evidence_id,
      assertion_lane: row.assertion_lane,
      source_key: row.source_key,
      registry_key: row.registry_key,
      projected_candidate_key: row.projected_candidate_key,
      resolution_status: row.resolution_status,
      final_disposition: disposition,
      disposition_reason: reason,
      conflict_keys: unique(conflictRows.map((item) => item.conflict_key)),
    };
  }).sort((left, right) => (
    left.union_row_key.localeCompare(right.union_row_key)
  ));
}

function blockedFactRows({
  setRows,
  cardRows,
  printingRows,
  assertionRows,
}) {
  const rows = [];
  for (const row of setRows.filter((item) => !item.master_admissible
    && item.completion_status !== 'out_of_scope')) {
    rows.push({
      blocked_fact_key: `set:${row.jpn_set_key}`,
      fact_kind: 'set_or_product_identity',
      subject_key: row.jpn_set_key,
      status: row.completion_status,
      reasons: [row.exclusion_reason ?? row.source_scope_status],
    });
  }
  for (const row of cardRows.filter(
    (item) => item.final_disposition === 'blocked',
  )) {
    rows.push({
      blocked_fact_key: `card:${row.jpn_card_identity_key}`,
      fact_kind: 'card_identity',
      subject_key: row.jpn_card_identity_key,
      status: row.admission_status,
      reasons: row.disposition_reasons,
    });
  }
  for (const row of printingRows.filter(
    (item) => item.final_disposition === 'blocked',
  )) {
    rows.push({
      blocked_fact_key: `printing:${row.printing_fact_key}`,
      fact_kind: 'printing_or_finish',
      subject_key: row.printing_fact_key,
      status: row.adjudication_status,
      reasons: row.disposition_reasons,
    });
  }
  for (const row of assertionRows.filter(
    (item) => ['conflict_blocked', 'needs_manual_review']
      .includes(item.final_disposition),
  )) {
    rows.push({
      blocked_fact_key: `assertion:${row.union_row_key}`,
      fact_kind: 'source_assertion',
      subject_key: row.union_row_key,
      status: row.final_disposition,
      reasons: [row.disposition_reason],
    });
  }
  return rows.sort((left, right) => (
    left.blocked_fact_key.localeCompare(right.blocked_fact_key)
  ));
}

function exclusionRows({ setRows, cardRows, assertionRows }) {
  return [
    ...setRows
      .filter((row) => row.completion_status === 'out_of_scope')
      .map((row) => ({
        exclusion_key: `set:${row.jpn_set_key}`,
        fact_kind: 'set_or_product_identity',
        subject_key: row.jpn_set_key,
        exclusion_status: 'out_of_scope',
        reason: row.exclusion_reason,
      })),
    ...cardRows
      .filter((row) => row.final_disposition === 'adjudicated_excluded')
      .map((row) => ({
        exclusion_key: `card:${row.jpn_card_identity_key}`,
        fact_kind: 'card_identity',
        subject_key: row.jpn_card_identity_key,
        exclusion_status: 'adjudicated_excluded',
        reason: row.disposition_reasons.join(','),
      })),
    ...assertionRows
      .filter((row) => row.final_disposition === 'adjudicated_excluded')
      .map((row) => ({
        exclusion_key: `assertion:${row.union_row_key}`,
        fact_kind: 'source_assertion',
        subject_key: row.union_row_key,
        exclusion_status: 'adjudicated_excluded',
        reason: row.disposition_reason,
      })),
  ].sort((left, right) => (
    left.exclusion_key.localeCompare(right.exclusion_key)
  ));
}

function sourceGapRows({
  sourceExhaustionRows,
  cardRows,
  printingRows,
}) {
  const rows = sourceExhaustionRows.map((lane) => ({
    source_gap_key: `lane:${lane.lane_id}`,
    gap_kind: 'source_lane_status',
    subject_key: lane.lane_id,
    status: lane.exhaustion_status,
    source_family: lane.source_family,
    assertion_count: lane.assertion_count,
    preserved_live_evidence_rows: lane.preserved_live_evidence_rows,
    findings: lane.health_finding_count > 0
      ? [`health_findings:${lane.health_finding_count}`]
      : [],
  }));
  for (const card of cardRows.filter(
    (row) => row.final_disposition === 'blocked',
  )) {
    rows.push({
      source_gap_key: `card:${card.jpn_card_identity_key}`,
      gap_kind: card.admission_status === 'single_source_only'
        ? 'single_source_identity'
        : 'card_admission_gap',
      subject_key: card.jpn_card_identity_key,
      status: card.admission_status,
      source_family: null,
      assertion_count: card.source_assertion_keys.length,
      preserved_live_evidence_rows: card.baseline_evidence_ids.length,
      findings: card.disposition_reasons,
    });
  }
  for (const printing of printingRows.filter(
    (row) => row.final_disposition === 'blocked',
  )) {
    rows.push({
      source_gap_key: `printing:${printing.printing_fact_key}`,
      gap_kind: 'printing_evidence_gap',
      subject_key: printing.printing_fact_key,
      status: printing.adjudication_status,
      source_family: null,
      assertion_count: printing.exact_source_assertion_keys.length,
      preserved_live_evidence_rows: 0,
      findings: printing.disposition_reasons,
    });
  }
  return rows.sort((left, right) => (
    left.source_gap_key.localeCompare(right.source_gap_key)
  ));
}

function completionChecks({
  registryEntries,
  setRows,
  sourceAssertionUnion,
  assertionRows,
  admissibleCards,
  admissiblePrintings,
  familyRows,
  coverageRows,
}) {
  const coverageValues = new Set(
    coverageRows
      .filter((row) => row.dimension === 'release_lane')
      .map((row) => row.value),
  );
  const checks = {
    every_set_adjudicated:
      setRows.length === registryEntries.length
      && new Set(setRows.map((row) => row.jpn_set_key)).size === setRows.length,
    every_assertion_disposed:
      assertionRows.length === sourceAssertionUnion.length
      && new Set(assertionRows.map((row) => row.union_row_key)).size
        === assertionRows.length,
    no_placeholder_set_in_admissible_export:
      setRows
        .filter((row) => row.master_admissible)
        .every((row) => !isPlaceholderRegistryKey(row.jpn_set_key))
      && admissibleCards.every(
        (row) => !isPlaceholderRegistryKey(row.jpn_set_key),
      ),
    every_admissible_set_has_required_identity_fields:
      setRows
        .filter((row) => row.master_admissible)
        .every((row) => (
          row.jpn_set_key
          && row.canonical_name_ja
          && row.collector_facing_name_en
          && row.release_kind
          && row.completion_status
        )),
    no_unresolved_exact_collision_in_admissible_export:
      admissibleCards.every((row) => row.conflict_status === 'none'),
    every_admissible_card_passes_source_admission:
      admissibleCards.every((row) => (
        row.official_source_present
        || (
          row.independent_source_count >= 2
          && row.human_readable_source_present
        )
      )),
    every_admissible_printing_passes_strict_rule:
      admissiblePrintings.every((row) => (
        row.independent_source_count >= 2
        && row.human_readable_source_present
        && row.canonical_finish_key
      )),
    required_coverage_lanes_present:
      REQUIRED_RELEASE_COVERAGE_LANES.every(
        (value) => coverageValues.has(value),
      ),
    every_admissible_card_has_required_identity_fields:
      admissibleCards.every((row) => (
        row.jpn_card_identity_key
        && row.jpn_set_key
        && row.language === 'ja'
        && row.market === 'JP'
        && (row.printed_number || row.governed_unnumbered_key)
        && row.printed_name_ja
        && row.card_type
        && Array.isArray(row.rarity_evidence)
        && Array.isArray(row.card_type_evidence)
        && row.evidence_status
        && row.conflict_status === 'none'
      )),
    every_admissible_card_has_family_disposition:
      familyRows.length === admissibleCards.length
      && familyRows.every((row) => row.language_agnostic_family_key),
    no_mutation_artifacts_emitted: true,
  };
  return {
    checks,
    all_static_admission_checks_pass: Object.values(checks).every(Boolean),
    pending_finalizer_checks: [
      'offline_replay_fingerprint_match',
      'english_reference_fingerprint_unchanged',
      'live_no_write_baseline_unchanged',
    ],
  };
}

export function buildFinalAdmission({
  registryEntries,
  setConflicts,
  sourceExhaustionRows,
  futureRegistryKeys,
  sourceAssertionUnion,
  identityCandidates,
  printingCandidates,
  familyProjectionRows,
  candidateConflicts,
  sourceAssertions,
  parents,
  familyReviewRows,
  jpnSpeciesLinks,
}) {
  const assertionByKey = new Map(
    sourceAssertions.map((row) => [row.assertion_key, row]),
  );
  const parentById = new Map(
    parents.map((row) => [row.card_print_id, row]),
  );
  const speciesLinksByCard = new Map();
  for (const link of jpnSpeciesLinks.filter((row) => row.active)) {
    const rows = speciesLinksByCard.get(link.card_print_id) ?? [];
    rows.push(link);
    speciesLinksByCard.set(link.card_print_id, rows);
  }
  const reviewsByCard = new Map();
  for (const review of familyReviewRows.filter((row) => row.active)) {
    const rows = reviewsByCard.get(review.card_print_id) ?? [];
    rows.push(review);
    reviewsByCard.set(review.card_print_id, rows);
  }
  const projectionByCandidate = new Map(
    familyProjectionRows.map((row) => [row.candidate_key, row]),
  );
  const conflictIndexes = buildConflictIndexes(candidateConflicts);
  const setRows = setAdjudicationRows({
    registryEntries,
    setConflicts,
    futureRegistryKeys,
  });
  const setRowsByKey = new Map(
    setRows.map((row) => [row.jpn_set_key, row]),
  );
  const cardRows = cardResolutionRows({
    identityCandidates,
    assertionByKey,
    parentById,
    setRowsByKey,
    futureRegistryKeys,
    conflictIndexes,
    speciesLinksByCard,
    projectionByCandidate,
    reviewsByCard,
  });
  const cardRowsByKey = new Map(
    cardRows.map((row) => [row.jpn_card_identity_key, row]),
  );
  const admissibleCards = cardRows.filter(
    (row) => row.final_disposition === 'master_admissible',
  );
  const printingRows = printingFactRows({
    printingCandidates,
    cardRowsByKey,
    assertionByKey,
    conflictIndexes,
  });
  const admissiblePrintings = printingRows.filter(
    (row) => row.final_disposition === 'master_admissible',
  );
  const familyRows = familyRelationshipRows({
    cardRows,
    speciesLinksByCard,
    projectionByCandidate,
    assertionByKey,
    reviewsByCard,
  });
  const assertionRows = assertionDispositionRows({
    sourceAssertionUnion,
    cardRowsByKey,
    conflictIndexes,
    futureRegistryKeys,
  });
  const blockedRows = blockedFactRows({
    setRows,
    cardRows,
    printingRows,
    assertionRows,
  });
  const exclusions = exclusionRows({
    setRows,
    cardRows,
    assertionRows,
  });

  const releaseCoverage = makeCountRows(
    setRows,
    'release_lane',
    (row) => row.release_kind,
    (row) => row.completion_status,
  );
  const unnumberedCoverage = makeCountRows(
    cardRows.filter((row) => row.governed_unnumbered_key),
    'release_lane',
    () => 'unnumbered',
    (row) => row.final_disposition,
  );
  if (unnumberedCoverage.length === 0) {
    unnumberedCoverage.push({
      coverage_key: 'release_lane:unnumbered:none',
      dimension: 'release_lane',
      value: 'unnumbered',
      status: 'none',
      count: 0,
    });
  }
  const representedReleaseLanes = new Set([
    ...releaseCoverage.map((row) => row.value),
    ...unnumberedCoverage.map((row) => row.value),
  ]);
  const explicitEmptyReleaseCoverage = REQUIRED_RELEASE_COVERAGE_LANES
    .filter((value) => !representedReleaseLanes.has(value))
    .map((value) => ({
      coverage_key: `release_lane:${value}:no_discovered_release`,
      dimension: 'release_lane',
      value,
      status: 'no_discovered_release',
      count: 0,
    }));
  const coverageRows = [
    ...releaseCoverage,
    ...unnumberedCoverage,
    ...explicitEmptyReleaseCoverage,
    ...makeCountRows(
      cardRows,
      'card_admission',
      (row) => row.admission_status,
      (row) => row.final_disposition,
    ),
    ...makeCountRows(
      printingRows,
      'printing_admission',
      (row) => row.adjudication_status,
      (row) => row.final_disposition,
    ),
    ...makeCountRows(
      familyRows,
      'family_domain',
      (row) => row.family_domain,
      (row) => row.review_status,
    ),
    ...sourceExhaustionRows.map((row) => ({
      coverage_key: `source_lane:${row.lane_id}:${row.exhaustion_status}`,
      dimension: 'source_lane',
      value: row.lane_id,
      status: row.exhaustion_status,
      count: row.assertion_count ?? 0,
    })),
  ].sort((left, right) => (
    left.coverage_key.localeCompare(right.coverage_key)
  ));
  const gapRows = sourceGapRows({
    sourceExhaustionRows,
    cardRows,
    printingRows,
  });
  const checks = completionChecks({
    registryEntries,
    setRows,
    sourceAssertionUnion,
    assertionRows,
    admissibleCards,
    admissiblePrintings,
    familyRows,
    coverageRows,
  });
  const summary = {
    discovered_set_or_product_count: setRows.length,
    master_admissible_set_count: setRows.filter(
      (row) => row.master_admissible,
    ).length,
    source_assertion_union_count: sourceAssertionUnion.length,
    assertion_disposition_count: assertionRows.length,
    working_identity_candidate_count: cardRows.length,
    master_admissible_identity_count: admissibleCards.length,
    blocked_identity_count: cardRows.filter(
      (row) => row.final_disposition === 'blocked',
    ).length,
    excluded_identity_count: cardRows.filter(
      (row) => row.final_disposition === 'adjudicated_excluded',
    ).length,
    working_printing_fact_count: printingRows.length,
    master_admissible_printing_fact_count: admissiblePrintings.length,
    blocked_printing_fact_count: printingRows.length
      - admissiblePrintings.length,
    family_relationship_count: familyRows.length,
    blocked_fact_count: blockedRows.length,
    adjudicated_exclusion_count: exclusions.length,
    source_gap_count: gapRows.length,
  };
  return {
    datasets: {
      master_set_adjudication_rows_v1: setRows,
      master_admissible_set_rows_v1: setRows.filter(
        (row) => row.master_admissible,
      ),
      master_card_resolution_rows_v1: cardRows,
      master_admissible_card_rows_v1: admissibleCards,
      master_printing_fact_rows_v1: printingRows,
      master_admissible_printing_rows_v1: admissiblePrintings,
      master_family_relationship_rows_v1: familyRows,
      master_assertion_disposition_rows_v1: assertionRows,
      master_blocked_fact_rows_v1: blockedRows,
      master_adjudicated_exclusion_rows_v1: exclusions,
      master_coverage_matrix_rows_v1: coverageRows,
      master_source_gap_rows_v1: gapRows,
    },
    summary,
    completion: checks,
  };
}

async function ensureOutputPathSafe(outputRoot) {
  const repoRoot = path.resolve(process.cwd());
  const absolute = path.resolve(outputRoot);
  const relative = path.relative(repoRoot, absolute);
  if (
    relative.startsWith('..')
    || path.isAbsolute(relative)
    || relative === ''
  ) {
    throw new Error(`Output root must be inside repository: ${absolute}`);
  }
  return absolute;
}

async function resetDatasetDirectory(outputRoot, datasetKey) {
  const safeRoot = await ensureOutputPathSafe(outputRoot);
  const target = path.resolve(safeRoot, 'rows', datasetKey);
  const relative = path.relative(safeRoot, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing unsafe dataset cleanup: ${target}`);
  }
  await fs.rm(target, { recursive: true, force: true });
}

function markdownSummary({ generatedAt, result, datasets, status }) {
  const checks = Object.entries(result.completion.checks)
    .map(([key, passed]) => `| ${key} | ${passed ? 'PASS' : 'FAIL'} |`)
    .join('\n');
  const datasetRows = datasets
    .map((row) => (
      `| ${row.dataset_key} | ${row.row_count}`
      + ` | \`${row.content_fingerprint_sha256}\` |`
    ))
    .join('\n');
  return `# Japanese Master Index V4 Final Admission

Generated: ${generatedAt}

Status: \`${status}\`

This is an index-only package. It performs no database, Storage, pricing,
identity, image, family-promotion, cleanup, quarantine, or deletion writes.

## Counts

| Measure | Count |
| --- | ---: |
${Object.entries(result.summary)
    .map(([key, value]) => `| ${key} | ${value} |`)
    .join('\n')}

## Static Admission Checks

| Check | Result |
| --- | --- |
${checks}

## Datasets

| Dataset | Rows | Content fingerprint |
| --- | ---: | --- |
${datasetRows}

## Pending Finalizer Proofs

${result.completion.pending_finalizer_checks
    .map((row) => `- ${row}`)
    .join('\n')}
`;
}

export async function runFinalAdmission(options = {}) {
  const resolved = {
    ...parseArgs([]),
    ...options,
  };
  const generatedAt = resolved.generatedAt;
  await ensureOutputPathSafe(resolved.outputRoot);

  const candidateManifestRecord = await readVerifiedArtifact(
    resolved.candidateManifest,
    {
      expectedPackageId:
        'JPN-MASTER-INDEX-CANDIDATE-UNION-MANIFEST-V1',
    },
  );
  const candidateManifest = candidateManifestRecord.artifact;
  const candidateData = {};
  for (const datasetKey of CANDIDATE_DATASETS) {
    candidateData[datasetKey] = (
      await loadVerifiedDatasetFromManifest({
        manifestPath: resolved.candidateManifest,
        datasetKey,
      })
    ).rows;
  }
  const baselineManifestPath = candidateManifest.content.baseline_manifest;
  const baselineData = {};
  for (const datasetKey of BASELINE_DATASETS) {
    baselineData[datasetKey] = (
      await loadVerifiedDatasetFromManifest({
        manifestPath: baselineManifestPath,
        datasetKey,
      })
    ).rows;
  }
  const [
    setRegistryRecord,
    setConflictRecord,
    sourceExhaustionRecord,
    futureQueueRecord,
  ] = await Promise.all([
    readVerifiedArtifact(resolved.setRegistry),
    readVerifiedArtifact(resolved.setConflicts),
    readVerifiedArtifact(resolved.sourceExhaustion),
    readVerifiedArtifact(resolved.futureQueue),
  ]);

  const sourceAssertions = [];
  const sourceArtifactFingerprints = [];
  for (const spec of SOURCE_ARTIFACTS) {
    const record = await readVerifiedArtifact(spec.path, {
      expectedPackageId:
        'JPN-MASTER-INDEX-V4-CARD-ACQUISITION-HARVEST-V1',
    });
    const assertions = record.artifact.content.assertions ?? [];
    const expectedStatus = candidateManifest.content.source_statuses.find(
      (row) => row.lane_id === spec.laneId,
    );
    if (
      !expectedStatus
      || expectedStatus.assertion_fingerprint_sha256
        !== contentFingerprint(assertions)
    ) {
      throw new Error(
        `Source assertion fingerprint drift for ${spec.laneId}`,
      );
    }
    sourceAssertions.push(...assertions);
    sourceArtifactFingerprints.push({
      lane_id: spec.laneId,
      path: spec.path,
      assertion_count: assertions.length,
      assertion_fingerprint_sha256: contentFingerprint(assertions),
      artifact_fingerprint_sha256:
        record.artifact.content_fingerprint_sha256,
    });
  }
  if (
    sourceAssertions.length
    !== candidateManifest.content.summary.fresh_source_assertion_count
  ) {
    throw new Error('Fresh source assertion count drift');
  }

  const futureRegistryKeys = new Set(
    (futureQueueRecord.artifact.content.work_items ?? [])
      .map((row) => row.registry_key),
  );
  const result = buildFinalAdmission({
    registryEntries:
      setRegistryRecord.artifact.content.registry_entries ?? [],
    setConflicts: setConflictRecord.artifact.content.conflicts ?? [],
    sourceExhaustionRows:
      sourceExhaustionRecord.artifact.content.source_lanes ?? [],
    futureRegistryKeys,
    sourceAssertionUnion:
      candidateData.source_assertion_union_rows_v1,
    identityCandidates: candidateData.identity_candidate_rows_v1,
    printingCandidates: candidateData.printing_candidate_rows_v1,
    familyProjectionRows:
      candidateData.novel_family_projection_rows_v1,
    candidateConflicts: candidateData.candidate_conflict_rows_v1,
    sourceAssertions,
    parents: baselineData.live_jpn_parent_rows_v1,
    familyReviewRows: baselineData.live_jpn_family_review_rows_v1,
    jpnSpeciesLinks: baselineData.live_jpn_species_link_rows_v1,
  });
  if (!result.completion.all_static_admission_checks_pass) {
    const failed = Object.entries(result.completion.checks)
      .filter(([, passed]) => !passed)
      .map(([key]) => key);
    throw new Error(`Static admission checks failed: ${failed.join(', ')}`);
  }

  const retrieval = {
    access_mode: 'local_verified_artifacts_only',
    database_access: false,
    storage_access: false,
    source_fetches: false,
  };
  const descriptors = [];
  const requiredFiles = [];
  for (const spec of OUTPUT_DATASETS) {
    await resetDatasetDirectory(resolved.outputRoot, spec.key);
    const descriptor = await writeShardedRows({
      outputRoot: resolved.outputRoot,
      datasetKey: spec.key,
      packageId: spec.packageId,
      rows: result.datasets[spec.key],
      generatedAt,
      retrieval,
    });
    descriptors.push(descriptor);
    const requiredPath = path.join(resolved.outputRoot, spec.requiredFile);
    const record = await writeJsonArtifact(requiredPath, buildArtifact({
      packageId: `${spec.packageId}-DESCRIPTOR`,
      generatedAt,
      retrieval,
      content: {
        generator_version: FINAL_ADMISSION_VERSION,
        dataset: descriptor,
      },
    }));
    requiredFiles.push(record);
  }

  const admissibleExportContent = {
    generator_version: FINAL_ADMISSION_VERSION,
    status: 'master_admissible_index_built',
    set_dataset: descriptors.find(
      (row) => row.dataset_key === 'master_admissible_set_rows_v1',
    ),
    card_dataset: descriptors.find(
      (row) => row.dataset_key === 'master_admissible_card_rows_v1',
    ),
    printing_dataset: descriptors.find(
      (row) => row.dataset_key
        === 'master_admissible_printing_rows_v1',
    ),
    family_dataset: descriptors.find(
      (row) => row.dataset_key
        === 'master_family_relationship_rows_v1',
    ),
    summary: result.summary,
    execution_boundary: {
      database_writes: false,
      storage_writes: false,
      pricing_writes: false,
      identity_writes: false,
      image_writes: false,
      family_promotion: false,
      cleanup: false,
      quarantine: false,
      deletion: false,
    },
  };
  const admissibleExportPath = path.join(
    resolved.outputRoot,
    'jpn_master_admissible_export_v1.json',
  );
  const admissibleExport = await writeJsonArtifact(
    admissibleExportPath,
    buildArtifact({
      packageId: 'JPN-MASTER-ADMISSIBLE-EXPORT-V1',
      generatedAt,
      retrieval,
      content: admissibleExportContent,
    }),
  );
  const manifestContent = {
    generator_version: FINAL_ADMISSION_VERSION,
    status: 'static_admission_complete_finalizer_proofs_pending',
    candidate_manifest: resolved.candidateManifest.replaceAll('\\', '/'),
    candidate_manifest_fingerprint_sha256:
      candidateManifest.content_fingerprint_sha256,
    baseline_manifest: baselineManifestPath,
    baseline_manifest_fingerprint_sha256:
      candidateManifest.content.baseline_manifest_fingerprint_sha256,
    set_registry_fingerprint_sha256:
      setRegistryRecord.artifact.content_fingerprint_sha256,
    set_conflict_fingerprint_sha256:
      setConflictRecord.artifact.content_fingerprint_sha256,
    source_exhaustion_fingerprint_sha256:
      sourceExhaustionRecord.artifact.content_fingerprint_sha256,
    future_queue_fingerprint_sha256:
      futureQueueRecord.artifact.content_fingerprint_sha256,
    source_artifacts: sourceArtifactFingerprints,
    summary: result.summary,
    completion: result.completion,
    datasets: descriptors,
    required_files: requiredFiles,
    master_admissible_export: admissibleExport,
    execution_boundary: admissibleExportContent.execution_boundary,
  };
  const manifestPath = path.join(
    resolved.outputRoot,
    'jpn_master_build_manifest_v1.json',
  );
  const manifest = await writeJsonArtifact(
    manifestPath,
    buildArtifact({
      packageId: 'JPN-MASTER-BUILD-MANIFEST-V1',
      generatedAt,
      retrieval,
      content: manifestContent,
    }),
  );
  const summaryPath = path.join(
    resolved.outputRoot,
    'jpn_master_completion_report_v1.md',
  );
  await fs.mkdir(path.dirname(summaryPath), { recursive: true });
  await fs.writeFile(summaryPath, markdownSummary({
    generatedAt,
    result,
    datasets: descriptors,
    status: manifestContent.status,
  }), 'utf8');

  return {
    manifest_path: manifest.path,
    completion_report_path: summaryPath.replaceAll('\\', '/'),
    master_admissible_export_path: admissibleExport.path,
    package_fingerprint_sha256:
      manifest.content_fingerprint_sha256,
    summary: result.summary,
    completion: result.completion,
    output_fingerprint_sha256: contentFingerprint(
      descriptors.map((row) => ({
        dataset_key: row.dataset_key,
        content_fingerprint_sha256: row.content_fingerprint_sha256,
      })),
    ),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runFinalAdmission(options);
  process.stdout.write(stableJson(result));
}

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
