import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import dotenv from 'dotenv';

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
import {
  assertAuditOnlyArgs,
  withReadOnlyClient,
} from './read_only_guard_v1.mjs';

export const LIVE_RECONCILIATION_VERSION =
  'JPN-MASTER-INDEX-LIVE-RECONCILIATION-V1';

const DEFAULT_FINAL_ROOT =
  'docs/audits/japanese_master_index_v4/final';
const DEFAULT_LIVE_BASELINE_ROOT =
  '.tmp/jpn_master_index_v4_reconciliation_live_v1';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v4/reconciliation';
const FINAL_PACKAGE_PATH =
  'docs/audits/japanese_master_index_v4/index/'
  + 'jpn_master_index_final_package_v1.json';

function text(value) {
  return String(value ?? '').normalize('NFKC').trim();
}

function unique(values) {
  return [...new Set(
    values
      .filter((value) => value !== null && value !== undefined)
      .map((value) => text(value))
      .filter(Boolean),
  )].sort((left, right) => left.localeCompare(right, 'ja'));
}

export function normalizeSetCode(value) {
  return text(value).toLocaleLowerCase('en-US');
}

export function normalizeJapaneseName(value) {
  return text(value)
    .toLocaleLowerCase('ja')
    .replace(/[\s\u3000]+/gu, '');
}

export function normalizeName(value) {
  return text(value)
    .toLocaleLowerCase('en-US')
    .replaceAll('&', ' and ')
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function numberCore(value) {
  let normalized = text(value).toLocaleUpperCase('en-US');
  if (!normalized) return null;
  if (normalized.includes('/')) normalized = normalized.split('/')[0].trim();
  const digitMatch = normalized.match(/\d+/);
  if (digitMatch) {
    const number = String(Number.parseInt(digitMatch[0], 10));
    const suffix = normalized
      .slice((digitMatch.index ?? 0) + digitMatch[0].length)
      .replace(/[\s-]+/g, '');
    return `${number}${suffix}`;
  }
  return normalized.replace(/[\s-]+/g, '');
}

function increment(counts, key) {
  counts[key] = (counts[key] ?? 0) + 1;
}

function addMapArray(map, key, value) {
  const rows = map.get(key) ?? [];
  rows.push(value);
  map.set(key, rows);
}

function addMapSet(map, key, value) {
  if (!key || !value) return;
  const values = map.get(key) ?? new Set();
  values.add(value);
  map.set(key, values);
}

function sourceFamily(value) {
  const source = text(value).toLocaleLowerCase('en-US');
  if (source.includes('artofpkm')) return 'artofpkm';
  if (source.includes('bulbapedia')) return 'bulbapedia';
  if (source.includes('limitless')) return 'limitless';
  if (source.includes('official')) return 'official_jp';
  if (source.includes('pokellector')) return 'pokellector';
  if (source.includes('pokeguardian')) return 'pokeguardian';
  if (source.includes('serebii')) return 'serebii';
  if (source.includes('tcgcollector')) return 'tcgcollector';
  if (source.includes('tcgdex')) return 'tcgdex';
  return source || null;
}

function descriptorPath(root, filename) {
  return path.join(root, filename);
}

async function loadDescriptorDataset(inputPath, expectedDatasetKey) {
  const { artifact: descriptorArtifact } = await readVerifiedArtifact(inputPath);
  const descriptor = descriptorArtifact.content.dataset;
  if (descriptor?.dataset_key !== expectedDatasetKey) {
    throw new Error(
      `Dataset descriptor mismatch: ${descriptor?.dataset_key} != `
      + expectedDatasetKey,
    );
  }
  if (descriptor.shard_paths.length !== descriptor.shard_count) {
    throw new Error(`Shard count mismatch: ${inputPath}`);
  }

  const rows = [];
  for (let index = 0; index < descriptor.shard_paths.length; index += 1) {
    const { artifact: shard } = await readVerifiedArtifact(
      descriptor.shard_paths[index],
    );
    if (shard.content.dataset_key !== expectedDatasetKey) {
      throw new Error(`Shard dataset mismatch: ${descriptor.shard_paths[index]}`);
    }
    if (shard.content.shard_index !== index + 1) {
      throw new Error(`Shard order mismatch: ${descriptor.shard_paths[index]}`);
    }
    rows.push(...shard.content.rows);
  }

  if (
    rows.length !== descriptor.row_count
    || contentFingerprint(rows) !== descriptor.content_fingerprint_sha256
  ) {
    throw new Error(`Dataset content mismatch: ${inputPath}`);
  }

  return { descriptor, rows };
}

async function loadLiveDataset(liveBaselineRoot, datasetKey) {
  return loadVerifiedDatasetFromManifest({
    manifestPath: path.join(
      liveBaselineRoot,
      'live_jpn_row_baseline_manifest_v1.json',
    ),
    datasetKey,
    expectedManifestPackageId: 'LIVE-JPN-ROW-BASELINE-MANIFEST-V1',
  });
}

function liveSetAliasKeys(masterSet) {
  return unique([
    masterSet.jpn_set_key,
    ...(masterSet.source_aliases ?? []).filter(
      (value) => /^jpn-/i.test(text(value)),
    ),
    ...(masterSet.official_code_evidence ?? []).map(
      (value) => `jpn-${text(value)}`,
    ),
  ]).map(normalizeSetCode);
}

export function buildMasterSetAnchors(masterCards, liveParents) {
  const parentById = new Map(
    liveParents.map((row) => [row.card_print_id, row]),
  );
  const anchorSets = new Map();
  for (const card of masterCards) {
    if (
      card.candidate_kind !== 'existing_parent'
      || !card.existing_card_print_id
    ) {
      continue;
    }
    const parent = parentById.get(card.existing_card_print_id);
    if (!parent?.set_id) continue;
    const setKey = normalizeSetCode(card.jpn_set_key);
    if (!anchorSets.has(setKey)) anchorSets.set(setKey, new Set());
    anchorSets.get(setKey).add(parent.set_id);
  }
  return new Map(
    [...anchorSets.entries()].map(([setKey, ids]) => [
      setKey,
      [...ids].sort(),
    ]),
  );
}

export function reconcileSets(
  masterSets,
  liveSets,
  liveSetAnchorIdsByMasterKey = new Map(),
) {
  const liveByCode = new Map();
  const liveByName = new Map();
  const liveById = new Map();
  for (const row of liveSets) {
    addMapArray(liveByCode, normalizeSetCode(row.code), row);
    addMapArray(liveByName, normalizeName(row.name), row);
    liveById.set(row.id, row);
  }

  return masterSets.map((masterSet) => {
    const setKey = normalizeSetCode(masterSet.jpn_set_key);
    const exactMatches = liveByCode.get(setKey) ?? [];
    const anchorIds = unique(
      liveSetAnchorIdsByMasterKey.get(setKey) ?? [],
    );
    const anchorMatches = anchorIds
      .map((id) => liveById.get(id))
      .filter(Boolean);
    const aliasMatches = unique(liveSetAliasKeys(masterSet)
      .flatMap((key) => (liveByCode.get(key) ?? []).map((row) => row.id)))
      .map((id) => liveById.get(id));
    const nameKeys = unique([
      masterSet.canonical_name_ja,
      masterSet.collector_facing_name_en,
      ...(masterSet.source_aliases ?? []),
    ]).map(normalizeName);
    const nameMatches = unique(
      nameKeys.flatMap(
        (key) => (liveByName.get(key) ?? []).map((row) => row.id),
      ),
    ).map((id) => liveById.get(id));

    let reconciliationStatus;
    let action;
    let matches;
    if (anchorIds.length > 1) {
      reconciliationStatus = 'existing_parent_anchor_ambiguous';
      action = 'resolve_existing_parent_set_conflict_before_card_promotion';
      matches = anchorMatches;
    } else if (
      anchorIds.length === 1
      && (
        anchorMatches.length !== 1
        || (
          exactMatches.length === 1
          && exactMatches[0].id !== anchorIds[0]
        )
        || (
          exactMatches.length > 1
          && !exactMatches.some((row) => row.id === anchorIds[0])
        )
      )
    ) {
      reconciliationStatus = 'existing_parent_anchor_conflict';
      action = 'resolve_existing_parent_set_conflict_before_card_promotion';
      matches = unique([
        ...anchorIds,
        ...exactMatches.map((row) => row.id),
      ]).map((id) => liveById.get(id)).filter(Boolean);
    } else if (exactMatches.length === 1) {
      reconciliationStatus = 'existing_exact_code';
      action = 'none';
      matches = exactMatches;
    } else if (anchorMatches.length === 1) {
      reconciliationStatus = 'existing_parent_anchor';
      action = 'none';
      matches = anchorMatches;
    } else if (exactMatches.length > 1) {
      reconciliationStatus = 'existing_exact_code_ambiguous';
      action = 'resolve_live_set_alias_before_card_promotion';
      matches = exactMatches;
    } else if (aliasMatches.length === 1) {
      reconciliationStatus = 'existing_alias_review_required';
      action = 'review_live_set_alias_mapping';
      matches = aliasMatches;
    } else if (aliasMatches.length > 1) {
      reconciliationStatus = 'existing_alias_ambiguous';
      action = 'resolve_live_set_alias_before_card_promotion';
      matches = aliasMatches;
    } else if (nameMatches.length === 1) {
      reconciliationStatus = 'existing_name_review_required';
      action = 'review_live_set_name_mapping';
      matches = nameMatches;
    } else if (nameMatches.length > 1) {
      reconciliationStatus = 'existing_name_ambiguous';
      action = 'resolve_live_set_name_before_card_promotion';
      matches = nameMatches;
    } else {
      reconciliationStatus = 'missing_set';
      action = 'insert_set_candidate';
      matches = [];
    }

    const requiredName = text(
      masterSet.collector_facing_name_en ?? masterSet.canonical_name_ja,
    );
    const blockers = [];
    if (!masterSet.jpn_set_key) blockers.push('set_key_missing');
    if (!requiredName) blockers.push('set_name_missing');
    if (
      reconciliationStatus.includes('ambiguous')
      || reconciliationStatus.includes('conflict')
    ) {
      blockers.push('live_set_match_ambiguous');
    }
    if (reconciliationStatus.includes('review_required')) {
      blockers.push('live_set_mapping_requires_review');
    }

    return {
      jpn_set_key: masterSet.jpn_set_key,
      canonical_name_ja: masterSet.canonical_name_ja,
      collector_facing_name_en: masterSet.collector_facing_name_en,
      release_kind: masterSet.release_kind,
      source_ids: masterSet.source_ids,
      reconciliation_status: reconciliationStatus,
      proposed_action: action,
      live_matches: matches.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        source: row.source,
        printed_total: row.printed_total,
      })),
      promotion_blockers: blockers,
      promotion_readiness: blockers.length === 0
        ? reconciliationStatus === 'missing_set'
          ? 'set_insert_candidate'
          : 'already_live'
        : 'blocked',
    };
  });
}

function buildLiveIndexes({
  liveParents,
  liveIdentities,
  liveEvidence,
  livePrintings,
  liveSpeciesLinks,
}) {
  const parentById = new Map(
    liveParents.map((row) => [row.card_print_id, row]),
  );
  const parentsBySetNumber = new Map();
  for (const row of liveParents) {
    const key = `${normalizeSetCode(row.set_code)}|${numberCore(
      row.number_plain ?? row.printed_number,
    )}`;
    addMapArray(parentsBySetNumber, key, row);
  }

  const namesByCard = new Map();
  const activeIdentityCountByCard = new Map();
  for (const row of liveIdentities.filter((identity) => identity.is_active)) {
    activeIdentityCountByCard.set(
      row.card_print_id,
      (activeIdentityCountByCard.get(row.card_print_id) ?? 0) + 1,
    );
    for (const name of [
      row.normalized_printed_name,
      row.source_name_raw,
      ...(row.identity_payload?.card_name_ja_candidates ?? []),
    ]) {
      addMapSet(
        namesByCard,
        row.card_print_id,
        normalizeJapaneseName(name),
      );
    }
  }
  for (const row of liveParents) {
    addMapSet(
      namesByCard,
      row.card_print_id,
      normalizeJapaneseName(row.printed_name),
    );
  }

  const sourceFamiliesByCard = new Map();
  for (const row of liveEvidence.filter((evidence) => evidence.active)) {
    addMapSet(
      sourceFamiliesByCard,
      row.card_print_id,
      sourceFamily(row.source_key),
    );
  }

  const childCountByCard = new Map();
  for (const row of livePrintings) {
    childCountByCard.set(
      row.card_print_id,
      (childCountByCard.get(row.card_print_id) ?? 0) + 1,
    );
  }

  const speciesByCard = new Map();
  for (const row of liveSpeciesLinks.filter(
    (link) => link.active && link.role === 'primary',
  )) {
    addMapSet(speciesByCard, row.card_print_id, row.species_id);
  }

  return {
    activeIdentityCountByCard,
    childCountByCard,
    namesByCard,
    parentById,
    parentsBySetNumber,
    sourceFamiliesByCard,
    speciesByCard,
  };
}

function familyState(card, cardPrintId, indexes) {
  if (!cardPrintId) {
    return card.family_status === 'resolved_species'
      ? 'requires_parent_before_species_link'
      : 'domain_relationship_no_species_row';
  }
  if (card.family_status !== 'resolved_species') {
    return 'domain_relationship_no_species_row';
  }
  const expectedSpeciesId = String(card.family_key).replace(/^species:/, '');
  const liveSpecies = indexes.speciesByCard.get(cardPrintId) ?? new Set();
  if (liveSpecies.has(expectedSpeciesId)) return 'already_linked';
  if (liveSpecies.size === 0) return 'missing_species_link';
  return 'species_link_conflict';
}

function displayIdentity(card, speciesById) {
  if (text(card.collector_facing_name_en)) {
    return {
      display_name_en: text(card.collector_facing_name_en),
      display_name_source: 'master_index_explicit',
    };
  }
  const speciesId = String(card.family_key ?? '').replace(/^species:/, '');
  const species = speciesById.get(speciesId);
  if (card.family_status === 'resolved_species' && species?.canonical_name) {
    return {
      display_name_en: species.canonical_name,
      display_name_source: 'language_agnostic_species_fallback',
    };
  }
  return {
    display_name_en: null,
    display_name_source: 'missing',
  };
}

function coreDrift(card, liveParent, indexes) {
  const drift = [];
  if (normalizeSetCode(liveParent.set_code) !== normalizeSetCode(card.jpn_set_key)) {
    drift.push('set_code');
  }
  if (
    numberCore(liveParent.number_plain ?? liveParent.printed_number)
    !== numberCore(card.printed_number)
  ) {
    drift.push('printed_number');
  }
  if (
    card.existing_gv_id
    && liveParent.gv_id !== card.existing_gv_id
  ) {
    drift.push('gv_id');
  }
  if (liveParent.identity_domain !== 'pokemon_jpn') {
    drift.push('identity_domain');
  }
  if ((indexes.activeIdentityCountByCard.get(liveParent.card_print_id) ?? 0) === 0) {
    drift.push('active_identity_missing');
  }
  const expectedName = normalizeJapaneseName(card.printed_name_ja);
  const liveNames = indexes.namesByCard.get(liveParent.card_print_id) ?? new Set();
  if (expectedName && !liveNames.has(expectedName)) {
    drift.push('printed_name_ja');
  }
  return drift;
}

export function reconcileCards({
  masterCards,
  setRows,
  liveParents,
  liveIdentities,
  liveEvidence,
  livePrintings,
  liveSpeciesLinks,
  speciesRows,
}) {
  const indexes = buildLiveIndexes({
    liveParents,
    liveIdentities,
    liveEvidence,
    livePrintings,
    liveSpeciesLinks,
  });
  const setByKey = new Map(
    setRows.map((row) => [normalizeSetCode(row.jpn_set_key), row]),
  );
  const speciesById = new Map(
    speciesRows.map((row) => [row.id, row]),
  );

  return masterCards.map((card) => {
    const expectedSources = new Set(
      (card.independent_source_families ?? []).map(sourceFamily).filter(Boolean),
    );
    const identityDisplay = displayIdentity(card, speciesById);
    let reconciliationStatus;
    let proposedAction;
    let matchedParents = [];
    let drift = [];

    if (card.existing_card_print_id) {
      const parent = indexes.parentById.get(card.existing_card_print_id);
      if (!parent) {
        reconciliationStatus = 'existing_parent_missing_from_live';
        proposedAction = 'block_and_investigate_missing_existing_parent';
      } else {
        matchedParents = [parent];
        drift = coreDrift(card, parent, indexes);
        reconciliationStatus = drift.length === 0
          ? 'existing_parent_aligned'
          : 'existing_parent_core_drift';
        proposedAction = drift.length === 0
          ? 'none'
          : 'review_existing_parent_drift';
      }
    } else {
      const key = `${normalizeSetCode(card.jpn_set_key)}|${numberCore(
        card.printed_number,
      )}`;
      const numberMatches = indexes.parentsBySetNumber.get(key) ?? [];
      const expectedNames = new Set(
        (card.printed_name_ja_candidates ?? [card.printed_name_ja])
          .map(normalizeJapaneseName)
          .filter(Boolean),
      );
      const exactNameMatches = numberMatches.filter((parent) => {
        const liveNames = indexes.namesByCard.get(parent.card_print_id) ?? new Set();
        return [...expectedNames].some((name) => liveNames.has(name));
      });

      if (exactNameMatches.length === 1) {
        reconciliationStatus = 'novel_candidate_already_live_exact';
        proposedAction = 'review_and_reanchor_to_live_parent';
        matchedParents = exactNameMatches;
      } else if (exactNameMatches.length > 1) {
        reconciliationStatus = 'novel_candidate_live_exact_ambiguous';
        proposedAction = 'resolve_live_identity_collision';
        matchedParents = exactNameMatches;
      } else if (numberMatches.length > 0) {
        reconciliationStatus = 'novel_candidate_number_occupied_name_mismatch';
        proposedAction = 'review_number_occupants_before_parent_insert';
        matchedParents = numberMatches;
      } else {
        reconciliationStatus = 'novel_candidate_missing_from_live';
        proposedAction = 'prepare_parent_identity_delta';
      }
    }

    const cardPrintId = matchedParents.length === 1
      ? matchedParents[0].card_print_id
      : null;
    const liveSourceFamilies = cardPrintId
      ? indexes.sourceFamiliesByCard.get(cardPrintId) ?? new Set()
      : new Set();
    const missingSourceFamilies = [...expectedSources]
      .filter((family) => !liveSourceFamilies.has(family))
      .sort();
    const setRow = setByKey.get(normalizeSetCode(card.jpn_set_key));
    const familyStatus = familyState(card, cardPrintId, indexes);
    const blockers = [];

    if (reconciliationStatus.includes('ambiguous')) {
      blockers.push('live_identity_match_ambiguous');
    }
    if (reconciliationStatus.includes('number_occupied')) {
      blockers.push('live_set_number_occupied_by_different_name');
    }
    if (reconciliationStatus === 'existing_parent_missing_from_live') {
      blockers.push('master_existing_parent_absent_live');
    }
    if (reconciliationStatus === 'existing_parent_core_drift') {
      blockers.push('existing_parent_core_drift');
    }
    if (
      setRow
      && ![
        'existing_exact_code',
        'existing_parent_anchor',
        'missing_set',
      ].includes(
        setRow.reconciliation_status,
      )
    ) {
      blockers.push('set_mapping_not_promotion_safe');
    }
    if (!setRow) blockers.push('master_set_reconciliation_missing');
    if (!identityDisplay.display_name_en) {
      blockers.push('collector_facing_english_name_missing');
    }
    if (familyStatus === 'species_link_conflict') {
      blockers.push('species_link_conflict');
    }

    let promotionReadiness = 'already_live';
    if (card.candidate_kind !== 'existing_parent') {
      if (reconciliationStatus === 'novel_candidate_missing_from_live') {
        promotionReadiness = blockers.length === 0
          ? setRow?.reconciliation_status === 'missing_set'
            ? 'delta_candidate_after_set_insert'
            : 'delta_candidate'
          : 'blocked';
      } else {
        promotionReadiness = 'blocked';
      }
    } else if (blockers.length > 0) {
      promotionReadiness = 'blocked_existing_review';
    }

    const liveParent = matchedParents.length === 1 ? matchedParents[0] : null;
    return {
      jpn_card_identity_key: card.jpn_card_identity_key,
      candidate_kind: card.candidate_kind,
      jpn_set_key: card.jpn_set_key,
      printed_number: card.printed_number,
      printed_name_ja: card.printed_name_ja,
      display_name_en: identityDisplay.display_name_en,
      display_name_source: identityDisplay.display_name_source,
      family_key: card.family_key,
      family_status: card.family_status,
      reconciliation_status: reconciliationStatus,
      proposed_action: proposedAction,
      promotion_readiness: promotionReadiness,
      promotion_blockers: unique(blockers),
      existing_card_print_id: card.existing_card_print_id,
      existing_gv_id: card.existing_gv_id,
      matched_live_parents: matchedParents.map((parent) => ({
        card_print_id: parent.card_print_id,
        gv_id: parent.gv_id,
        set_id: parent.set_id,
        set_code: parent.set_code,
        printed_number: parent.printed_number,
        printed_name: parent.printed_name,
      })),
      core_drift_fields: drift,
      live_state: liveParent ? {
        active_identity_count:
          indexes.activeIdentityCountByCard.get(liveParent.card_print_id) ?? 0,
        child_printing_count:
          indexes.childCountByCard.get(liveParent.card_print_id) ?? 0,
        has_public_gv_id: Boolean(liveParent.gv_id),
        has_image: Boolean(
          liveParent.image_url
          ?? liveParent.representative_image_url
          ?? liveParent.image_alt_url,
        ),
        source_families: [
          ...(indexes.sourceFamiliesByCard.get(liveParent.card_print_id)
            ?? new Set()),
        ].sort(),
      } : null,
      expected_source_families: [...expectedSources].sort(),
      missing_source_families: missingSourceFamilies,
      family_reconciliation_status: familyStatus,
      indexed_image_candidate_count: (card.image_urls ?? []).length,
    };
  });
}

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) increment(counts, row[field] ?? 'null');
  return Object.fromEntries(Object.entries(counts).sort());
}

function countArrayValues(rows, field) {
  const counts = {};
  for (const row of rows) {
    for (const value of row[field] ?? []) increment(counts, value);
  }
  return Object.fromEntries(Object.entries(counts).sort());
}

function sum(rows, selector) {
  return rows.reduce((total, row) => total + selector(row), 0);
}

function markdown(report) {
  const counts = report.content.summary;
  const lines = [
    '# Japanese Master Index V4 Live Reconciliation',
    '',
    `Status: \`${report.content.status}\``,
    '',
    '## Boundary',
    '',
    '- Production database reads: transaction-guarded and read-only',
    '- Database writes: false',
    '- Storage writes: false',
    '- English mutation: false',
    '- Promotion payload generated: false',
    '',
    '## Summary',
    '',
    `- Master-admissible cards: ${counts.master_admissible_cards}`,
    `- Existing parents aligned: ${counts.existing_parents_aligned}`,
    `- Existing parents with core drift: ${counts.existing_parents_with_core_drift}`,
    `- Existing parents with any promotion blocker: ${
      counts.existing_parents_with_any_promotion_blocker
    }`,
    `- Novel parent delta candidates: ${counts.novel_parent_delta_candidates}`,
    `- Novel candidates dependent on set inserts: ${counts.novel_candidates_after_set_insert}`,
    `- Novel candidates blocked: ${counts.novel_candidates_blocked}`,
    `- Promotion-ready novel candidates with image evidence: ${
      counts.promotion_ready_novel_candidates_with_image_evidence
    }`,
    `- Master-admissible sets: ${counts.master_admissible_sets}`,
    `- Existing exact live sets: ${counts.existing_exact_live_sets}`,
    `- Existing parent-anchored live sets: ${
      counts.existing_parent_anchored_live_sets
    }`,
    `- Set insert candidates: ${counts.set_insert_candidates}`,
    `- Sets requiring mapping review: ${counts.set_mapping_review}`,
    `- Missing evidence-lane memberships: ${counts.missing_evidence_lane_memberships}`,
    `- Cards missing at least one expected evidence lane: ${
      counts.cards_missing_any_evidence_lane
    }`,
    `- Missing species links on matched parents: ${counts.missing_species_links}`,
    `- English family fingerprint unchanged: ${counts.english_family_unchanged}`,
    '',
    '## Card Reconciliation Status',
    '',
    '| Status | Rows |',
    '|---|---:|',
    ...Object.entries(report.content.card_status_counts)
      .map(([status, rows]) => `| ${status} | ${rows} |`),
    '',
    '## Promotion Readiness',
    '',
    '| Status | Rows |',
    '|---|---:|',
    ...Object.entries(report.content.card_promotion_readiness_counts)
      .map(([status, rows]) => `| ${status} | ${rows} |`),
    '',
    '## Set Reconciliation Status',
    '',
    '| Status | Rows |',
    '|---|---:|',
    ...Object.entries(report.content.set_status_counts)
      .map(([status, rows]) => `| ${status} | ${rows} |`),
    '',
    '## Novel Candidate Blockers',
    '',
    '| Blocker | Rows |',
    '|---|---:|',
    ...Object.entries(report.content.novel_candidate_blocker_counts)
      .map(([status, rows]) => `| ${status} | ${rows} |`),
    '',
    '## Missing Evidence Lanes',
    '',
    '| Source family | Rows |',
    '|---|---:|',
    ...Object.entries(report.content.missing_evidence_source_counts)
      .map(([status, rows]) => `| ${status} | ${rows} |`),
    '',
    'This is a reconciliation report, not a database payload or promotion approval.',
    '',
  ];
  return lines.join('\n');
}

function parseArgs(argv) {
  const options = {
    envFile: null,
    finalRoot: DEFAULT_FINAL_ROOT,
    liveBaselineRoot: DEFAULT_LIVE_BASELINE_ROOT,
    outputRoot: DEFAULT_OUTPUT_ROOT,
  };
  for (const arg of argv) {
    if (arg.startsWith('--env-file=')) {
      options.envFile = arg.slice('--env-file='.length);
    } else if (arg.startsWith('--final-root=')) {
      options.finalRoot = arg.slice('--final-root='.length);
    } else if (arg.startsWith('--live-baseline-root=')) {
      options.liveBaselineRoot = arg.slice('--live-baseline-root='.length);
    } else if (arg.startsWith('--output-root=')) {
      options.outputRoot = arg.slice('--output-root='.length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function fetchLiveSets(connectionString) {
  return withReadOnlyClient({
    connectionString,
    environmentLabel: 'production-read-only-reconciliation',
  }, async (db, guard) => {
    const result = await db.query(`
      select
        id::text,
        code,
        name,
        source,
        printed_total
      from public.sets
      order by lower(code), code, id
    `);
    return { guard, rows: result.rows };
  });
}

export async function runReconciliation({
  connectionString,
  finalRoot = DEFAULT_FINAL_ROOT,
  liveBaselineRoot = DEFAULT_LIVE_BASELINE_ROOT,
  outputRoot = DEFAULT_OUTPUT_ROOT,
  generatedAt = new Date().toISOString(),
}) {
  const [
    masterCards,
    masterSets,
    masterFamilies,
    liveParents,
    liveIdentities,
    liveEvidence,
    livePrintings,
    liveSpeciesLinks,
    speciesRows,
    finalPackage,
    liveEnglishFamily,
    liveBaselineManifest,
    liveSets,
  ] = await Promise.all([
    loadDescriptorDataset(
      descriptorPath(finalRoot, 'jpn_master_admissible_cards_v1.json'),
      'master_admissible_card_rows_v1',
    ),
    loadDescriptorDataset(
      descriptorPath(finalRoot, 'jpn_master_admissible_sets_v1.json'),
      'master_admissible_set_rows_v1',
    ),
    loadDescriptorDataset(
      descriptorPath(finalRoot, 'jpn_master_family_relationships_v1.json'),
      'master_family_relationship_rows_v1',
    ),
    loadLiveDataset(liveBaselineRoot, 'live_jpn_parent_rows_v1'),
    loadLiveDataset(liveBaselineRoot, 'live_jpn_identity_rows_v1'),
    loadLiveDataset(liveBaselineRoot, 'live_jpn_evidence_rows_v1'),
    loadLiveDataset(liveBaselineRoot, 'live_jpn_printing_rows_v1'),
    loadLiveDataset(liveBaselineRoot, 'live_jpn_species_link_rows_v1'),
    loadLiveDataset(liveBaselineRoot, 'language_agnostic_species_rows_v1'),
    readVerifiedArtifact(FINAL_PACKAGE_PATH),
    readVerifiedArtifact(path.join(
      liveBaselineRoot,
      'english_family_reference_fingerprint_v1.json',
    )),
    readVerifiedArtifact(path.join(
      liveBaselineRoot,
      'live_jpn_baseline_manifest_v1.json',
    )),
    fetchLiveSets(connectionString),
  ]);

  const setAnchors = buildMasterSetAnchors(
    masterCards.rows,
    liveParents.rows,
  );
  const setRows = reconcileSets(
    masterSets.rows,
    liveSets.rows,
    setAnchors,
  );
  const familyByCard = new Map(
    masterFamilies.rows.map((row) => [row.jpn_card_identity_key, row]),
  );
  const cardsWithFamilies = masterCards.rows.map((card) => ({
    ...card,
    ...(familyByCard.get(card.jpn_card_identity_key) ?? {}),
  }));
  const cardRows = reconcileCards({
    masterCards: cardsWithFamilies,
    setRows,
    liveParents: liveParents.rows,
    liveIdentities: liveIdentities.rows,
    liveEvidence: liveEvidence.rows,
    livePrintings: livePrintings.rows,
    liveSpeciesLinks: liveSpeciesLinks.rows,
    speciesRows: speciesRows.rows,
  });

  const retrieval = {
    guard_version: liveSets.guard.guard_version,
    transaction_read_only: liveSets.guard.transaction_read_only,
    default_transaction_read_only:
      liveSets.guard.default_transaction_read_only,
    environment_label: liveSets.guard.environment_label,
    environment_key_sha256: liveSets.guard.environment_key_sha256,
    baseline_guard:
      liveBaselineManifest.artifact.retrieval?.guard_version ?? null,
    baseline_transaction_read_only:
      liveBaselineManifest.artifact.retrieval?.transaction_read_only ?? null,
  };
  const cardDataset = await writeShardedRows({
    outputRoot,
    datasetKey: 'jpn_live_card_reconciliation_rows_v1',
    packageId: 'JPN-LIVE-CARD-RECONCILIATION-ROWS-V1',
    rows: cardRows,
    generatedAt,
    retrieval,
  });
  const setDataset = await writeShardedRows({
    outputRoot,
    datasetKey: 'jpn_live_set_reconciliation_rows_v1',
    packageId: 'JPN-LIVE-SET-RECONCILIATION-ROWS-V1',
    rows: setRows,
    generatedAt,
    retrieval,
  });

  const cardStatusCounts = countBy(cardRows, 'reconciliation_status');
  const cardReadinessCounts = countBy(cardRows, 'promotion_readiness');
  const setStatusCounts = countBy(setRows, 'reconciliation_status');
  const englishExpected =
    finalPackage.artifact.content.english_family_reference
      .combined_fingerprint_sha256;
  const englishActual =
    liveEnglishFamily.artifact.content.combined_fingerprint_sha256;
  const summary = {
    master_admissible_cards: cardRows.length,
    existing_parents_aligned:
      cardStatusCounts.existing_parent_aligned ?? 0,
    existing_parents_with_core_drift: cardRows.filter(
      (row) => row.candidate_kind === 'existing_parent'
        && row.reconciliation_status !== 'existing_parent_aligned',
    ).length,
    existing_parents_with_any_promotion_blocker:
      cardReadinessCounts.blocked_existing_review ?? 0,
    novel_parent_delta_candidates:
      cardReadinessCounts.delta_candidate ?? 0,
    novel_candidates_after_set_insert:
      cardReadinessCounts.delta_candidate_after_set_insert ?? 0,
    novel_candidates_blocked:
      cardReadinessCounts.blocked ?? 0,
    promotion_ready_novel_candidates_with_image_evidence: cardRows.filter(
      (row) => [
        'delta_candidate',
        'delta_candidate_after_set_insert',
      ].includes(row.promotion_readiness)
        && row.indexed_image_candidate_count > 0,
    ).length,
    master_admissible_sets: setRows.length,
    existing_exact_live_sets:
      setStatusCounts.existing_exact_code ?? 0,
    existing_parent_anchored_live_sets:
      setStatusCounts.existing_parent_anchor ?? 0,
    set_insert_candidates:
      setStatusCounts.missing_set ?? 0,
    set_mapping_review: setRows.filter(
      (row) => ![
        'existing_exact_code',
        'existing_parent_anchor',
        'missing_set',
      ].includes(
        row.reconciliation_status,
      ),
    ).length,
    missing_evidence_lane_memberships: sum(
      cardRows,
      (row) => row.missing_source_families.length,
    ),
    cards_missing_any_evidence_lane: cardRows.filter(
      (row) => row.missing_source_families.length > 0,
    ).length,
    missing_species_links: cardRows.filter(
      (row) => row.family_reconciliation_status === 'missing_species_link',
    ).length,
    english_family_unchanged: englishExpected === englishActual,
  };

  const content = {
    status: 'complete_read_only_reconciliation',
    generator_version: LIVE_RECONCILIATION_VERSION,
    execution_boundary: {
      database_reads: true,
      database_reads_are_transaction_guarded_and_read_only: true,
      database_writes: false,
      storage_writes: false,
      pricing_writes: false,
      identity_writes: false,
      family_promotion: false,
      english_mutation: false,
      promotion_payload_generated: false,
    },
    source_fingerprints: {
      final_package:
        finalPackage.artifact.content_fingerprint_sha256,
      master_cards: masterCards.descriptor.content_fingerprint_sha256,
      master_sets: masterSets.descriptor.content_fingerprint_sha256,
      master_families:
        masterFamilies.descriptor.content_fingerprint_sha256,
      live_parents: liveParents.descriptor.content_fingerprint_sha256,
      live_identities: liveIdentities.descriptor.content_fingerprint_sha256,
      live_evidence: liveEvidence.descriptor.content_fingerprint_sha256,
      live_printings: livePrintings.descriptor.content_fingerprint_sha256,
      live_species_links:
        liveSpeciesLinks.descriptor.content_fingerprint_sha256,
      live_sets: contentFingerprint(liveSets.rows),
    },
    english_family_proof: {
      expected_combined_fingerprint_sha256: englishExpected,
      live_combined_fingerprint_sha256: englishActual,
      unchanged: englishExpected === englishActual,
    },
    summary,
    card_status_counts: cardStatusCounts,
    card_promotion_readiness_counts: cardReadinessCounts,
    novel_candidate_blocker_counts: countArrayValues(
      cardRows.filter((row) => row.promotion_readiness === 'blocked'),
      'promotion_blockers',
    ),
    existing_parent_blocker_counts: countArrayValues(
      cardRows.filter(
        (row) => row.promotion_readiness === 'blocked_existing_review',
      ),
      'promotion_blockers',
    ),
    missing_evidence_source_counts: countArrayValues(
      cardRows,
      'missing_source_families',
    ),
    display_name_source_counts: countBy(cardRows, 'display_name_source'),
    set_status_counts: setStatusCounts,
    set_promotion_readiness_counts: countBy(setRows, 'promotion_readiness'),
    card_dataset: cardDataset,
    set_dataset: setDataset,
  };
  if (!summary.english_family_unchanged) {
    throw new Error('English family fingerprint changed during reconciliation');
  }
  const report = buildArtifact({
    packageId: 'JPN-MASTER-INDEX-LIVE-RECONCILIATION-V1',
    generatedAt,
    retrieval,
    content,
  });
  await writeJsonArtifact(
    path.join(outputRoot, 'jpn_live_reconciliation_v1.json'),
    report,
  );
  await fs.mkdir(outputRoot, { recursive: true });
  await fs.writeFile(
    path.join(outputRoot, 'jpn_live_reconciliation_v1.md'),
    markdown(report),
  );
  return report;
}

async function main() {
  const argv = process.argv.slice(2);
  assertAuditOnlyArgs(argv);
  const options = parseArgs(argv);
  dotenv.config(options.envFile ? { path: options.envFile } : {});
  const connectionString = (
    process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
  );
  const result = await runReconciliation({
    connectionString,
    finalRoot: options.finalRoot,
    liveBaselineRoot: options.liveBaselineRoot,
    outputRoot: options.outputRoot,
  });
  process.stdout.write(stableJson({
    status: result.content.status,
    content_fingerprint_sha256: result.content_fingerprint_sha256,
    summary: result.content.summary,
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
