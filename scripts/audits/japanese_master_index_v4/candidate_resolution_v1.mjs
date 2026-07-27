import { contentFingerprint } from './deterministic_artifact_v1.mjs';

export const CANDIDATE_RESOLUTION_VERSION =
  'JPN-MASTER-INDEX-CANDIDATE-RESOLUTION-V1';

function text(value) {
  return String(value ?? '').normalize('NFKC').trim();
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== ''))]
    .sort((left, right) => String(left).localeCompare(String(right), 'ja'));
}

function normalizeAlias(value) {
  return text(value)
    .toLocaleLowerCase('en-US')
    .replaceAll('&', ' and ')
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeSetCode(value) {
  return text(value)
    .replace(/^jpn-/i, '')
    .toLocaleLowerCase('en-US');
}

function normalizeJapaneseName(value) {
  return text(value)
    .toLocaleLowerCase('ja')
    .replace(/[\s\u3000]+/gu, '');
}

function normalizeEnglishName(value) {
  return normalizeAlias(value);
}

function numberCoreFromRaw(value) {
  let normalized = text(value).toLocaleUpperCase('en-US');
  if (!normalized) return null;
  if (/^\d+\s*\/\s*\d+$/.test(normalized)) {
    normalized = normalized.split('/')[0].trim();
  }
  const digitMatch = normalized.match(/\d+/);
  if (digitMatch) {
    return String(Number.parseInt(digitMatch[0], 10));
  }
  return normalized.replace(/[\s-]+/g, '');
}

function assertionNumberCore(assertion) {
  if (Number.isInteger(assertion.card_number_numerator)) {
    return String(assertion.card_number_numerator);
  }
  return numberCoreFromRaw(assertion.card_number_raw);
}

function parentNumberCore(parent) {
  return numberCoreFromRaw(
    parent.printed_number
    ?? parent.number_plain
    ?? parent.printed_number,
  );
}

function normalizedImageUrls(values) {
  return unique(
    (Array.isArray(values) ? values : [])
      .map((value) => text(value))
      .filter((value) => /^https?:\/\//i.test(value)),
  );
}

function addMapArray(map, key, value) {
  if (!key) return;
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

function sortedSet(values) {
  return unique([...(values ?? [])]);
}

function candidateKey(kind, payload) {
  return `jpn-candidate:${kind}:${contentFingerprint(payload)}`;
}

function conflictRow(conflictType, payload) {
  return {
    conflict_key: `jpn-conflict:${contentFingerprint({
      conflict_type: conflictType,
      ...payload,
    })}`,
    conflict_type: conflictType,
    ...payload,
  };
}

function buildRegistryResolver(registryEntries, aliases) {
  const entriesByKey = new Map(
    registryEntries.map((entry) => [entry.registry_key, entry]),
  );
  const entriesByFoldedKey = new Map();
  const keysByCode = new Map();
  const keysByName = new Map();

  for (const entry of registryEntries) {
    addMapSet(
      entriesByFoldedKey,
      text(entry.registry_key).toLocaleLowerCase('en-US'),
      entry.registry_key,
    );
    addMapSet(
      keysByCode,
      normalizeSetCode(entry.registry_key),
      entry.registry_key,
    );
    for (const value of entry.live_set_code_aliases ?? []) {
      addMapSet(keysByCode, normalizeSetCode(value), entry.registry_key);
    }
    for (const value of entry.source_native_names ?? []) {
      addMapSet(keysByName, normalizeAlias(value), entry.registry_key);
    }
  }
  for (const alias of aliases) {
    if (alias.ambiguous) continue;
    if (
      alias.alias_type === 'live_set_code'
      || alias.alias_type === 'source_native_code'
      || alias.alias_type === 'source_set_id'
    ) {
      addMapSet(
        keysByCode,
        normalizeSetCode(alias.alias_value),
        alias.registry_key,
      );
    } else {
      addMapSet(
        keysByName,
        normalizeAlias(alias.alias_value),
        alias.registry_key,
      );
    }
  }

  function resolve(value) {
    const direct = text(value);
    if (entriesByKey.has(direct)) {
      return { registryKey: direct, candidates: [direct] };
    }
    const foldedKeyCandidates = sortedSet(
      entriesByFoldedKey.get(direct.toLocaleLowerCase('en-US')),
    );
    if (foldedKeyCandidates.length === 1) {
      return {
        registryKey: foldedKeyCandidates[0],
        candidates: foldedKeyCandidates,
      };
    }
    const codeCandidates = sortedSet(
      keysByCode.get(normalizeSetCode(value)),
    );
    if (codeCandidates.length === 1) {
      return {
        registryKey: codeCandidates[0],
        candidates: codeCandidates,
      };
    }
    const nameCandidates = sortedSet(keysByName.get(normalizeAlias(value)));
    const candidates = codeCandidates.length > 0
      ? codeCandidates
      : nameCandidates;
    return {
      registryKey: candidates.length === 1 ? candidates[0] : null,
      candidates,
    };
  }

  return { entriesByKey, resolve };
}

function parentJapaneseNames(parent, identityRows) {
  return unique([
    normalizeJapaneseName(parent.printed_name),
    ...identityRows.map((row) => normalizeJapaneseName(
      row.normalized_printed_name ?? row.source_name_raw,
    )),
  ]);
}

function sourceCoordinate(assertion, registryKey) {
  return {
    registry_key: registryKey,
    number_core: assertionNumberCore(assertion),
    printed_name_ja: normalizeJapaneseName(assertion.printed_name) || null,
    source_external_id: assertion.source_external_id,
  };
}

function resolutionPriority(method) {
  return new Map([
    ['existing_exact_set_number_printed_name', 1],
    ['existing_unique_set_number', 2],
    ['existing_exact_image', 3],
    ['existing_unique_set_printed_name_unnumbered', 4],
  ]).get(method) ?? 99;
}

function buildFamilyMaps({
  parents,
  evidenceRows,
  jpnSpeciesLinks,
  englishFamilyCards,
  englishFamilySpeciesLinks,
  speciesRows,
}) {
  const speciesById = new Map(speciesRows.map((row) => [row.id, row]));
  const baseSpeciesByDex = new Map();
  for (const row of speciesRows) {
    if (!row.active || row.is_form || !row.national_dex_number) continue;
    addMapSet(
      baseSpeciesByDex,
      String(row.national_dex_number),
      row.id,
    );
  }

  const jpnSpeciesByCard = new Map();
  for (const link of jpnSpeciesLinks) {
    if (!link.active || link.role !== 'primary') continue;
    addMapSet(jpnSpeciesByCard, link.card_print_id, link.species_id);
  }
  const englishSpeciesByCard = new Map();
  for (const link of englishFamilySpeciesLinks) {
    if (!link.active || link.role !== 'primary') continue;
    addMapSet(englishSpeciesByCard, link.card_print_id, link.species_id);
  }

  const speciesByJapaneseName = new Map();
  for (const parent of parents) {
    const speciesIds = sortedSet(jpnSpeciesByCard.get(parent.card_print_id));
    const name = normalizeJapaneseName(parent.printed_name);
    if (name && speciesIds.length === 1) {
      addMapSet(speciesByJapaneseName, name, speciesIds[0]);
    }
  }

  const speciesByEnglishName = new Map();
  for (const row of englishFamilyCards) {
    const speciesIds = sortedSet(englishSpeciesByCard.get(row.card_print_id));
    const name = normalizeEnglishName(row.name);
    if (name && speciesIds.length === 1) {
      addMapSet(speciesByEnglishName, name, speciesIds[0]);
    }
  }
  for (const row of evidenceRows) {
    if (!row.active) continue;
    const speciesIds = sortedSet(jpnSpeciesByCard.get(row.card_print_id));
    if (speciesIds.length !== 1) continue;
    for (const name of row.evidence_subject?.card_name_en_candidates ?? []) {
      addMapSet(
        speciesByEnglishName,
        normalizeEnglishName(name),
        speciesIds[0],
      );
    }
  }

  return {
    speciesById,
    baseSpeciesByDex,
    jpnSpeciesByCard,
    englishSpeciesByCard,
    speciesByJapaneseName,
    speciesByEnglishName,
  };
}

function inferNovelSpecies(candidate, assertionByKey, familyMaps) {
  const assertions = candidate.assertion_keys.map(
    (key) => assertionByKey.get(key),
  ).filter(Boolean);
  const methodResults = [];
  const ambiguities = [];

  const dexNumbers = unique(
    assertions.flatMap((row) => row.dex_numbers ?? []).map(String),
  );
  if (dexNumbers.length > 0) {
    const speciesIds = unique(
      dexNumbers.flatMap((dex) => sortedSet(
        familyMaps.baseSpeciesByDex.get(dex),
      )),
    );
    if (speciesIds.length === 1) {
      methodResults.push({
        method: 'exact_national_dex_number',
        species_id: speciesIds[0],
        evidence_values: dexNumbers,
      });
    } else {
      ambiguities.push({
        method: 'exact_national_dex_number',
        candidate_species_ids: speciesIds,
        evidence_values: dexNumbers,
      });
    }
  }

  const japaneseNames = unique(
    assertions.map((row) => normalizeJapaneseName(row.printed_name)),
  );
  if (japaneseNames.length > 0) {
    const speciesIds = unique(
      japaneseNames.flatMap((name) => sortedSet(
        familyMaps.speciesByJapaneseName.get(name),
      )),
    );
    if (speciesIds.length === 1) {
      methodResults.push({
        method: 'exact_japanese_printed_name',
        species_id: speciesIds[0],
        evidence_values: japaneseNames,
      });
    } else if (speciesIds.length > 1) {
      ambiguities.push({
        method: 'exact_japanese_printed_name',
        candidate_species_ids: speciesIds,
        evidence_values: japaneseNames,
      });
    }
  }

  const englishNames = unique(
    assertions.map((row) => normalizeEnglishName(row.english_display_name)),
  );
  if (englishNames.length > 0) {
    const speciesIds = unique(
      englishNames.flatMap((name) => sortedSet(
        familyMaps.speciesByEnglishName.get(name),
      )),
    );
    if (speciesIds.length === 1) {
      methodResults.push({
        method: 'exact_english_family_evidence',
        species_id: speciesIds[0],
        evidence_values: englishNames,
      });
    } else if (speciesIds.length > 1) {
      ambiguities.push({
        method: 'exact_english_family_evidence',
        candidate_species_ids: speciesIds,
        evidence_values: englishNames,
      });
    }
  }

  const resolvedSpeciesIds = unique(
    methodResults.map((row) => row.species_id),
  );
  if (ambiguities.length > 0 || resolvedSpeciesIds.length > 1) {
    return {
      status: 'review_required',
      species_id: null,
      methods: methodResults,
      ambiguities,
    };
  }
  if (resolvedSpeciesIds.length === 0) {
    return {
      status: 'no_species_projection',
      species_id: null,
      methods: [],
      ambiguities: [],
    };
  }
  return {
    status: 'projected_exact',
    species_id: resolvedSpeciesIds[0],
    methods: methodResults,
    ambiguities: [],
  };
}

function normalizeFinish(value) {
  return normalizeAlias(value).replaceAll(' ', '_');
}

function buildNovelCandidate({
  kind,
  registryKey,
  numberCore,
  assertions,
  promotionStatus,
  resolutionNotes = [],
}) {
  const assertionKeys = unique(assertions.map((row) => row.assertion_key));
  const payload = {
    candidate_kind: kind,
    registry_key: registryKey,
    number_core: numberCore,
    assertion_keys: assertionKeys,
  };
  return {
    candidate_key: candidateKey(kind, payload),
    candidate_kind: kind,
    promotion_status: promotionStatus,
    existing_card_print_id: null,
    existing_gv_id: null,
    registry_keys: registryKey ? [registryKey] : [],
    number_core: numberCore,
    printed_number_candidates: unique(
      assertions.map((row) => row.card_number_raw),
    ),
    printed_name_ja_candidates: unique(
      assertions.map((row) => row.printed_name),
    ),
    english_name_candidates: unique(
      assertions.map((row) => row.english_display_name),
    ),
    image_urls: unique(assertions.flatMap((row) => row.image_urls ?? [])),
    source_ids: unique(assertions.map((row) => row.source_id)),
    assertion_keys: assertionKeys,
    baseline_evidence_ids: [],
    resolution_notes: resolutionNotes,
  };
}

export function buildJapaneseCandidateUnion({
  parents,
  identityRows,
  evidenceRows,
  printingRows,
  familyReviewRows,
  jpnSpeciesLinks,
  speciesRows,
  englishFamilyCards,
  englishFamilySpeciesLinks,
  registryEntries,
  aliases,
  sourceAssertions,
}) {
  const conflicts = [];
  const registry = buildRegistryResolver(registryEntries, aliases);
  const identitiesByCard = new Map();
  const evidenceByCard = new Map();
  const printingsByCard = new Map();
  const familyReviewsByCard = new Map();
  for (const row of identityRows) addMapArray(identitiesByCard, row.card_print_id, row);
  for (const row of evidenceRows) addMapArray(evidenceByCard, row.card_print_id, row);
  for (const row of printingRows) addMapArray(printingsByCard, row.card_print_id, row);
  for (const row of familyReviewRows) addMapArray(
    familyReviewsByCard,
    row.card_print_id,
    row,
  );

  const parentModels = [];
  const parentById = new Map();
  const parentsByRegistryNumber = new Map();
  const parentsByRegistryName = new Map();
  const parentsByImage = new Map();

  for (const parent of parents) {
    const registryResolution = registry.resolve(parent.set_code);
    const activeIdentities = (identitiesByCard.get(parent.card_print_id) ?? [])
      .filter((row) => row.is_active);
    const names = parentJapaneseNames(parent, activeIdentities);
    const numberCore = parentNumberCore(parent);
    const imageUrls = normalizedImageUrls([
      parent.image_url,
      parent.image_alt_url,
      parent.representative_image_url,
    ]);
    const model = {
      parent,
      registryKey: registryResolution.registryKey,
      registryCandidates: registryResolution.candidates,
      numberCore,
      japaneseNames: names,
      imageUrls,
    };
    parentModels.push(model);
    parentById.set(parent.card_print_id, model);

    if (!model.registryKey) {
      conflicts.push(conflictRow('baseline_parent_registry_unresolved', {
        card_print_id: parent.card_print_id,
        set_code: parent.set_code,
        registry_candidates: model.registryCandidates,
      }));
      continue;
    }
    if (numberCore) {
      addMapArray(
        parentsByRegistryNumber,
        `${model.registryKey}|${numberCore}`,
        model,
      );
    }
    for (const name of names) {
      addMapArray(
        parentsByRegistryName,
        `${model.registryKey}|${name}`,
        model,
      );
    }
    for (const imageUrl of imageUrls) {
      addMapArray(parentsByImage, imageUrl, model);
    }
  }

  const assertions = sourceAssertions
    .flatMap((source) => source.assertions)
    .sort((left, right) => left.assertion_key.localeCompare(right.assertion_key));
  const assertionByKey = new Map(
    assertions.map((row) => [row.assertion_key, row]),
  );

  const sourceExternalRows = new Map();
  for (const assertion of assertions) {
    addMapArray(
      sourceExternalRows,
      `${assertion.source_id}|${assertion.source_external_id}`,
      assertion,
    );
  }
  for (const [key, rows] of sourceExternalRows.entries()) {
    const coordinates = unique(rows.map((row) => JSON.stringify(
      sourceCoordinate(row, registry.resolve(row.registry_key).registryKey),
    )));
    if (coordinates.length > 1) {
      conflicts.push(conflictRow('same_source_id_conflicting_coordinates', {
        source_external_key: key,
        assertion_keys: unique(rows.map((row) => row.assertion_key)),
        coordinate_count: coordinates.length,
      }));
    }
  }

  const resolutionRows = [];
  const matchedAssertionsByParent = new Map();
  const unmatchedNumberedByCoordinate = new Map();
  const unmatchedUnnumbered = [];

  for (const assertion of assertions) {
    const registryResolution = registry.resolve(assertion.registry_key);
    const registryKey = registryResolution.registryKey;
    const numberCore = assertionNumberCore(assertion);
    const japaneseName = normalizeJapaneseName(assertion.printed_name);
    const imageUrls = normalizedImageUrls(assertion.image_urls);

    if (!registryKey) {
      resolutionRows.push({
        assertion_key: assertion.assertion_key,
        source_id: assertion.source_id,
        resolution_status: 'unresolved_registry',
        resolution_method: null,
        candidate_key: null,
        existing_card_print_id: null,
        registry_key: null,
        number_core: numberCore,
        findings: ['registry_alias_unresolved_or_ambiguous'],
      });
      unmatchedUnnumbered.push({
        assertion,
        registryKey: null,
        numberCore,
        unresolvedRegistry: true,
      });
      conflicts.push(conflictRow('registry_alias_unresolved_or_ambiguous', {
        assertion_keys: [assertion.assertion_key],
        supplied_registry_key: assertion.registry_key,
        registry_candidates: registryResolution.candidates,
      }));
      continue;
    }

    const matchMethods = [];
    if (numberCore) {
      const coordinateRows = (
        parentsByRegistryNumber.get(`${registryKey}|${numberCore}`) ?? []
      );
      if (japaneseName) {
        const exactNameRows = coordinateRows.filter(
          (model) => model.japaneseNames.includes(japaneseName),
        );
        if (exactNameRows.length === 1) {
          matchMethods.push({
            method: 'existing_exact_set_number_printed_name',
            model: exactNameRows[0],
          });
        } else if (exactNameRows.length > 1) {
          for (const model of exactNameRows) {
            matchMethods.push({
              method: 'ambiguous_exact_set_number_printed_name',
              model,
            });
          }
        }
      }
      if (coordinateRows.length === 1) {
        matchMethods.push({
          method: 'existing_unique_set_number',
          model: coordinateRows[0],
        });
      }
    }
    for (const imageUrl of imageUrls) {
      const imageRows = (parentsByImage.get(imageUrl) ?? []).filter(
        (model) => !model.registryKey || model.registryKey === registryKey,
      );
      if (imageRows.length === 1) {
        matchMethods.push({
          method: 'existing_exact_image',
          model: imageRows[0],
        });
      }
    }
    if (!numberCore && japaneseName) {
      const nameRows = (
        parentsByRegistryName.get(`${registryKey}|${japaneseName}`) ?? []
      );
      if (nameRows.length === 1) {
        matchMethods.push({
          method: 'existing_unique_set_printed_name_unnumbered',
          model: nameRows[0],
        });
      }
    }

    const matchedParentIds = unique(
      matchMethods.map((row) => row.model.parent.card_print_id),
    );
    if (matchedParentIds.length === 1) {
      const winningMethods = matchMethods
        .filter((row) => row.model.parent.card_print_id === matchedParentIds[0])
        .filter((row) => !row.method.startsWith('ambiguous_'))
        .sort(
          (left, right) => (
            resolutionPriority(left.method) - resolutionPriority(right.method)
          ),
        );
      if (winningMethods.length > 0) {
        const method = winningMethods[0].method;
        addMapArray(
          matchedAssertionsByParent,
          matchedParentIds[0],
          assertion,
        );
        resolutionRows.push({
          assertion_key: assertion.assertion_key,
          source_id: assertion.source_id,
          resolution_status: 'matched_existing_parent',
          resolution_method: method,
          candidate_key: `existing:${matchedParentIds[0]}`,
          existing_card_print_id: matchedParentIds[0],
          registry_key: registryKey,
          number_core: numberCore,
          findings: [],
        });
        continue;
      }
    }
    if (matchedParentIds.length > 1) {
      resolutionRows.push({
        assertion_key: assertion.assertion_key,
        source_id: assertion.source_id,
        resolution_status: 'ambiguous_existing_parent',
        resolution_method: null,
        candidate_key: null,
        existing_card_print_id: null,
        registry_key: registryKey,
        number_core: numberCore,
        findings: ['multiple_existing_parent_candidates'],
      });
      conflicts.push(conflictRow('multiple_existing_parent_candidates', {
        assertion_keys: [assertion.assertion_key],
        candidate_card_print_ids: matchedParentIds,
        registry_key: registryKey,
        number_core: numberCore,
      }));
      continue;
    }

    if (numberCore) {
      addMapArray(
        unmatchedNumberedByCoordinate,
        `${registryKey}|${numberCore}`,
        assertion,
      );
    } else {
      unmatchedUnnumbered.push({
        assertion,
        registryKey,
        numberCore: null,
        unresolvedRegistry: false,
      });
    }
  }

  const identityCandidates = [];
  for (const model of parentModels) {
    const parent = model.parent;
    const matched = matchedAssertionsByParent.get(parent.card_print_id) ?? [];
    const baselineEvidence = evidenceByCard.get(parent.card_print_id) ?? [];
    identityCandidates.push({
      candidate_key: `existing:${parent.card_print_id}`,
      candidate_kind: 'existing_parent',
      promotion_status: 'already_canonical',
      existing_card_print_id: parent.card_print_id,
      existing_gv_id: parent.gv_id,
      registry_keys: model.registryKey ? [model.registryKey] : [],
      number_core: model.numberCore,
      printed_number_candidates: unique([
        parent.printed_number,
        parent.number_plain,
      ]),
      printed_name_ja_candidates: unique([
        parent.printed_name,
        ...model.japaneseNames,
      ]),
      english_name_candidates: unique(
        baselineEvidence.flatMap(
          (row) => row.evidence_subject?.card_name_en_candidates ?? [],
        ),
      ),
      image_urls: model.imageUrls,
      source_ids: unique([
        ...matched.map((row) => row.source_id),
        ...baselineEvidence.map((row) => row.source_key),
      ]),
      assertion_keys: unique(matched.map((row) => row.assertion_key)),
      baseline_evidence_ids: unique(
        baselineEvidence.map((row) => row.evidence_id),
      ),
      resolution_notes: model.registryKey
        ? []
        : ['baseline_parent_registry_unresolved'],
    });
  }

  for (const [coordinate, group] of unmatchedNumberedByCoordinate.entries()) {
    const [registryKey, numberCore] = coordinate.split('|');
    const sourceCounts = new Map();
    for (const assertion of group) {
      sourceCounts.set(
        assertion.source_id,
        (sourceCounts.get(assertion.source_id) ?? 0) + 1,
      );
    }
    const duplicateSources = [...sourceCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([sourceId]) => sourceId)
      .sort();
    const japaneseNames = unique(
      group.map((row) => normalizeJapaneseName(row.printed_name)),
    );
    const modifierSets = unique(
      group
        .filter((row) => (row.identity_modifiers ?? []).length > 0)
        .map((row) => JSON.stringify(row.identity_modifiers)),
    );
    const findings = [];
    if (duplicateSources.length > 0) {
      findings.push('duplicate_number_within_source');
    }
    if (japaneseNames.length > 1) {
      findings.push('same_set_number_conflicting_printed_name');
    }
    if (modifierSets.length > 1) {
      findings.push('same_set_number_conflicting_identity_modifiers');
    }

    if (findings.length === 0) {
      const candidate = buildNovelCandidate({
        kind: 'novel_numbered',
        registryKey,
        numberCore,
        assertions: group,
        promotionStatus: 'index_candidate',
      });
      identityCandidates.push(candidate);
      for (const assertion of group) {
        resolutionRows.push({
          assertion_key: assertion.assertion_key,
          source_id: assertion.source_id,
          resolution_status: 'novel_numbered_candidate',
          resolution_method: 'exact_registry_number_group',
          candidate_key: candidate.candidate_key,
          existing_card_print_id: null,
          registry_key: registryKey,
          number_core: numberCore,
          findings: [],
        });
      }
    } else {
      const payload = {
        assertion_keys: unique(group.map((row) => row.assertion_key)),
        registry_key: registryKey,
        number_core: numberCore,
        duplicate_source_ids: duplicateSources,
        printed_name_ja_candidates: japaneseNames,
        findings,
      };
      conflicts.push(conflictRow('numbered_identity_group_ambiguous', payload));
      for (const assertion of group) {
        resolutionRows.push({
          assertion_key: assertion.assertion_key,
          source_id: assertion.source_id,
          resolution_status: 'ambiguous_novel_numbered_group',
          resolution_method: null,
          candidate_key: null,
          existing_card_print_id: null,
          registry_key: registryKey,
          number_core: numberCore,
          findings,
        });
      }
    }
  }

  const unnumberedByExactImage = new Map();
  const isolatedUnnumbered = [];
  for (const item of unmatchedUnnumbered) {
    const images = normalizedImageUrls(item.assertion.image_urls);
    if (item.registryKey && images.length > 0) {
      for (const imageUrl of images) {
        addMapArray(
          unnumberedByExactImage,
          `${item.registryKey}|${imageUrl}`,
          item,
        );
      }
    } else {
      isolatedUnnumbered.push(item);
    }
  }

  const consumedUnnumbered = new Set();
  for (const [imageKey, items] of unnumberedByExactImage.entries()) {
    const availableItems = items.filter(
      (item) => !consumedUnnumbered.has(item.assertion.assertion_key),
    );
    if (availableItems.length === 0) continue;
    const sourceIds = unique(
      availableItems.map((item) => item.assertion.source_id),
    );
    const assertionsForImage = unique(
      availableItems.map((item) => item.assertion.assertion_key),
    ).map((key) => assertionByKey.get(key));
    if (sourceIds.length < 2) continue;
    const names = unique(
      assertionsForImage.map(
        (row) => normalizeJapaneseName(row.printed_name),
      ),
    );
    if (names.length > 1) continue;
    const registryKey = availableItems[0].registryKey;
    const candidate = buildNovelCandidate({
      kind: 'novel_unnumbered_exact_image',
      registryKey,
      numberCore: null,
      assertions: assertionsForImage,
      promotionStatus: 'index_candidate',
      resolutionNotes: ['cross_source_exact_image_url'],
    });
    identityCandidates.push(candidate);
    for (const assertion of assertionsForImage) {
      consumedUnnumbered.add(assertion.assertion_key);
      resolutionRows.push({
        assertion_key: assertion.assertion_key,
        source_id: assertion.source_id,
        resolution_status: 'novel_unnumbered_exact_image_candidate',
        resolution_method: 'cross_source_exact_image_url',
        candidate_key: candidate.candidate_key,
        existing_card_print_id: null,
        registry_key: registryKey,
        number_core: null,
        findings: [],
      });
    }
  }

  for (const item of unmatchedUnnumbered) {
    if (consumedUnnumbered.has(item.assertion.assertion_key)) continue;
    const kind = item.unresolvedRegistry
      ? 'source_isolated_unresolved_registry'
      : 'source_isolated_unnumbered';
    const candidate = buildNovelCandidate({
      kind,
      registryKey: item.registryKey,
      numberCore: item.numberCore,
      assertions: [item.assertion],
      promotionStatus: 'review_required',
      resolutionNotes: [
        item.unresolvedRegistry
          ? 'registry_alias_unresolved_or_ambiguous'
          : 'name_or_image_only_assertion',
      ],
    });
    identityCandidates.push(candidate);
    const existingResolution = resolutionRows.find(
      (row) => row.assertion_key === item.assertion.assertion_key,
    );
    if (existingResolution) {
      existingResolution.candidate_key = candidate.candidate_key;
    } else {
      resolutionRows.push({
        assertion_key: item.assertion.assertion_key,
        source_id: item.assertion.source_id,
        resolution_status: kind,
        resolution_method: null,
        candidate_key: candidate.candidate_key,
        existing_card_print_id: null,
        registry_key: item.registryKey,
        number_core: item.numberCore,
        findings: candidate.resolution_notes,
      });
    }
    conflicts.push(conflictRow(
      item.unresolvedRegistry
        ? 'source_isolated_unresolved_registry'
        : 'source_isolated_unnumbered_assertion',
      {
        assertion_keys: [item.assertion.assertion_key],
        candidate_key: candidate.candidate_key,
        registry_key: item.registryKey,
      },
    ));
  }

  const resolutionByAssertion = new Map(
    resolutionRows.map((row) => [row.assertion_key, row]),
  );
  const sourceAssertionUnion = [];
  for (const row of evidenceRows) {
    sourceAssertionUnion.push({
      union_row_key: `preserved:${row.evidence_id}`,
      assertion_lane: 'preserved_live_evidence',
      source_key: row.source_key,
      source_external_id: null,
      registry_key:
        registry.resolve(
          row.evidence_subject?.source_canonical_set_key
          ?? row.evidence_subject?.set_code_identity,
        ).registryKey,
      printed_name: (
        row.evidence_subject?.card_name_ja_candidates?.[0] ?? null
      ),
      number_core: numberCoreFromRaw(
        row.evidence_subject?.printed_number,
      ),
      image_urls: [],
      raw_snapshot_ref: null,
      raw_snapshot_sha256: null,
      assertion_key: null,
      evidence_id: row.evidence_id,
      projected_candidate_key: `existing:${row.card_print_id}`,
      projected_existing_card_print_id: row.card_print_id,
      resolution_status: 'preserved_canonical_evidence',
    });
  }
  for (const assertion of assertions) {
    const resolution = resolutionByAssertion.get(assertion.assertion_key);
    sourceAssertionUnion.push({
      union_row_key: `fresh:${assertion.assertion_key}`,
      assertion_lane: 'fresh_source_assertion',
      source_key: assertion.source_id,
      source_external_id: assertion.source_external_id,
      registry_key: resolution?.registry_key ?? null,
      printed_name: assertion.printed_name,
      number_core: assertionNumberCore(assertion),
      image_urls: normalizedImageUrls(assertion.image_urls),
      raw_snapshot_ref: assertion.raw_snapshot_ref,
      raw_snapshot_sha256: assertion.raw_snapshot_sha256,
      assertion_key: assertion.assertion_key,
      evidence_id: null,
      projected_candidate_key: resolution?.candidate_key ?? null,
      projected_existing_card_print_id:
        resolution?.existing_card_print_id ?? null,
      resolution_status: resolution?.resolution_status ?? 'unresolved',
    });
  }

  const familyMaps = buildFamilyMaps({
    parents,
    evidenceRows,
    jpnSpeciesLinks,
    englishFamilyCards,
    englishFamilySpeciesLinks,
    speciesRows,
  });
  const familyCardNodes = [
    ...englishFamilyCards.map((row) => ({
      family_card_key: `existing:${row.card_print_id}`,
      language: 'en',
      candidate_kind: 'existing_english_parent',
      existing_card_print_id: row.card_print_id,
      existing_gv_id: row.gv_id,
      display_name: row.name,
      printed_name: row.name,
      set_code: row.set_code,
      number: row.number,
      promotion_status: 'already_canonical',
    })),
    ...identityCandidates.map((row) => ({
      family_card_key: row.candidate_key,
      language: 'ja',
      candidate_kind: row.candidate_kind,
      existing_card_print_id: row.existing_card_print_id,
      existing_gv_id: row.existing_gv_id,
      display_name: row.english_name_candidates[0] ?? null,
      printed_name: row.printed_name_ja_candidates[0] ?? null,
      set_code: row.registry_keys[0] ?? null,
      number: row.printed_number_candidates[0] ?? row.number_core,
      promotion_status: row.promotion_status,
    })),
  ];

  const familySpeciesLinks = [
    ...englishFamilySpeciesLinks
      .filter((row) => row.active)
      .map((row) => ({
        family_link_key: `existing-en:${row.card_print_species_id}`,
        family_card_key: `existing:${row.card_print_id}`,
        language: 'en',
        species_id: row.species_id,
        role: row.role,
        link_status: 'existing_active',
        projection_methods: [],
      })),
    ...jpnSpeciesLinks
      .filter((row) => row.active)
      .map((row) => ({
        family_link_key: `existing-ja:${row.card_print_species_id}`,
        family_card_key: `existing:${row.card_print_id}`,
        language: 'ja',
        species_id: row.species_id,
        role: row.role,
        link_status: 'existing_active',
        projection_methods: [],
      })),
  ];

  const familyProjectionRows = [];
  for (const candidate of identityCandidates) {
    if (candidate.candidate_kind === 'existing_parent') continue;
    const projection = inferNovelSpecies(
      candidate,
      assertionByKey,
      familyMaps,
    );
    familyProjectionRows.push({
      candidate_key: candidate.candidate_key,
      candidate_kind: candidate.candidate_kind,
      projection_status: projection.status,
      species_id: projection.species_id,
      projection_methods: projection.methods,
      ambiguities: projection.ambiguities,
    });
    if (projection.status === 'projected_exact') {
      familySpeciesLinks.push({
        family_link_key: `projected-ja:${contentFingerprint({
          candidate_key: candidate.candidate_key,
          species_id: projection.species_id,
        })}`,
        family_card_key: candidate.candidate_key,
        language: 'ja',
        species_id: projection.species_id,
        role: 'primary',
        link_status: 'projected_only_not_promoted',
        projection_methods: projection.methods.map((row) => row.method),
      });
    } else if (projection.status === 'review_required') {
      conflicts.push(conflictRow('species_mapping_ambiguous', {
        candidate_key: candidate.candidate_key,
        assertion_keys: candidate.assertion_keys,
        ambiguities: projection.ambiguities,
        resolved_methods: projection.methods,
      }));
    }
  }

  const printingCandidates = printingRows.map((row) => ({
    printing_candidate_key: `existing:${row.card_printing_id}`,
    identity_candidate_key: `existing:${row.card_print_id}`,
    candidate_kind: 'existing_printing',
    existing_card_printing_id: row.card_printing_id,
    existing_printing_gv_id: row.printing_gv_id,
    finish_key: row.finish_key,
    projection_status: 'already_canonical',
    assertion_keys: [],
  }));
  for (const candidate of identityCandidates) {
    if (candidate.candidate_kind === 'existing_parent') {
      const explicitFinishes = unique(
        candidate.assertion_keys.flatMap(
          (key) => assertionByKey.get(key)?.finish_labels ?? [],
        ).map(normalizeFinish),
      );
      const existingFinishes = unique(
        (printingsByCard.get(candidate.existing_card_print_id) ?? [])
          .map((row) => normalizeFinish(row.finish_key)),
      );
      const missing = explicitFinishes.filter(
        (finish) => !existingFinishes.includes(finish),
      );
      if (missing.length > 0) {
        conflicts.push(conflictRow('existing_printing_finish_gap', {
          candidate_key: candidate.candidate_key,
          existing_card_print_id: candidate.existing_card_print_id,
          explicit_finish_keys: explicitFinishes,
          existing_finish_keys: existingFinishes,
          missing_finish_keys: missing,
        }));
      }
      continue;
    }
    const finishLabels = unique(
      candidate.assertion_keys.flatMap(
        (key) => assertionByKey.get(key)?.finish_labels ?? [],
      ).map(normalizeFinish),
    );
    if (finishLabels.length === 0) {
      printingCandidates.push({
        printing_candidate_key: `logical:${contentFingerprint({
          candidate_key: candidate.candidate_key,
          finish_key: null,
        })}`,
        identity_candidate_key: candidate.candidate_key,
        candidate_kind: 'novel_printing_unresolved',
        existing_card_printing_id: null,
        existing_printing_gv_id: null,
        finish_key: null,
        projection_status: 'finish_unresolved_not_guessed',
        assertion_keys: candidate.assertion_keys,
      });
    } else {
      for (const finishKey of finishLabels) {
        printingCandidates.push({
          printing_candidate_key: `logical:${contentFingerprint({
            candidate_key: candidate.candidate_key,
            finish_key: finishKey,
          })}`,
          identity_candidate_key: candidate.candidate_key,
          candidate_kind: 'novel_printing_explicit_finish',
          existing_card_printing_id: null,
          existing_printing_gv_id: null,
          finish_key: finishKey,
          projection_status: 'projected_only_not_promoted',
          assertion_keys: candidate.assertion_keys.filter(
            (key) => (assertionByKey.get(key)?.finish_labels ?? [])
              .map(normalizeFinish)
              .includes(finishKey),
          ),
        });
      }
    }
  }

  const existingCount = identityCandidates.filter(
    (row) => row.candidate_kind === 'existing_parent',
  ).length;
  const novelPromotableCount = identityCandidates.filter(
    (row) => (
      row.candidate_kind !== 'existing_parent'
      && row.promotion_status === 'index_candidate'
    ),
  ).length;
  const sourceIsolatedCount = identityCandidates.filter(
    (row) => row.promotion_status === 'review_required',
  ).length;
  const unresolvedAssertionCount = resolutionRows.filter(
    (row) => !row.candidate_key,
  ).length;
  const summary = {
    existing_jpn_parent_count: existingCount,
    fresh_source_assertion_count: assertions.length,
    preserved_evidence_row_count: evidenceRows.length,
    identity_candidate_count: identityCandidates.length,
    novel_index_candidate_count: novelPromotableCount,
    source_isolated_review_candidate_count: sourceIsolatedCount,
    unresolved_assertion_count: unresolvedAssertionCount,
    conflict_count: conflicts.length,
    conservative_distinct_identity_lower_bound:
      existingCount + novelPromotableCount,
    source_isolated_distinct_identity_upper_bound:
      existingCount + novelPromotableCount + sourceIsolatedCount,
    family_card_node_count: familyCardNodes.length,
    family_species_link_count: familySpeciesLinks.length,
    novel_exact_species_projection_count: familyProjectionRows.filter(
      (row) => row.projection_status === 'projected_exact',
    ).length,
    printing_candidate_count: printingCandidates.length,
    unresolved_finish_count: printingCandidates.filter(
      (row) => row.projection_status === 'finish_unresolved_not_guessed',
    ).length,
  };

  return {
    sourceAssertionUnion: sourceAssertionUnion.sort(
      (left, right) => left.union_row_key.localeCompare(right.union_row_key),
    ),
    assertionResolutions: resolutionRows.sort(
      (left, right) => left.assertion_key.localeCompare(right.assertion_key),
    ),
    identityCandidates: identityCandidates.sort(
      (left, right) => left.candidate_key.localeCompare(right.candidate_key),
    ),
    printingCandidates: printingCandidates.sort(
      (left, right) => (
        left.printing_candidate_key.localeCompare(right.printing_candidate_key)
      ),
    ),
    familyCardNodes: familyCardNodes.sort(
      (left, right) => left.family_card_key.localeCompare(right.family_card_key),
    ),
    familySpeciesLinks: familySpeciesLinks.sort(
      (left, right) => left.family_link_key.localeCompare(right.family_link_key),
    ),
    familyProjectionRows: familyProjectionRows.sort(
      (left, right) => left.candidate_key.localeCompare(right.candidate_key),
    ),
    conflicts: conflicts.sort(
      (left, right) => left.conflict_key.localeCompare(right.conflict_key),
    ),
    summary,
  };
}

export const candidateResolutionInternals = Object.freeze({
  normalizeAlias,
  normalizeSetCode,
  normalizeJapaneseName,
  normalizeEnglishName,
  numberCoreFromRaw,
  assertionNumberCore,
  parentNumberCore,
});
