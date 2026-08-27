export const COLLECTIBLE_WAVE1_CANONICAL_RECONCILIATION_VERSION =
  "COLLECTIBLE_WAVE1_CANONICAL_RECONCILIATION_V1";

const SOURCE_MAPPING_ALIASES = Object.freeze({
  yugioh_ygoprodeck_api_v7: Object.freeze([
    "yugioh_ygoprodeck_api_v7",
    "ygoprodeck",
  ]),
  gundam_gcg_api_v1: Object.freeze([
    "gundam_gcg_api_v1",
    "gcg-api",
    "gcgapi",
  ]),
});

const GAME_ALIASES = Object.freeze({
  yugioh: Object.freeze(["yugioh", "yu-gi-oh", "yu_gi_oh"]),
  gundam: Object.freeze(["gundam", "gundam-card-game", "gundam_card_game"]),
});

function text(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function key(value) {
  return text(value).toLocaleLowerCase("en-US");
}

function numberKey(value) {
  return key(value).replace(/\s+/g, "");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function sameOptional(left, right) {
  const normalizedLeft = key(left);
  const normalizedRight = key(right);
  return !normalizedLeft || !normalizedRight || normalizedLeft === normalizedRight;
}

function candidateVariantUnresolved(candidate) {
  return candidate?.variant_evidence?.mapping_status === "unresolved" ||
    candidate?.variant_resolution === "unresolved_alternative_artwork_mapping";
}

function gameAliases(game) {
  return new Set([key(game), ...(GAME_ALIASES[key(game)] ?? []).map(key)]);
}

export function expandCandidateGameAliasesV1(games) {
  if (!Array.isArray(games)) throw new Error("candidate games must be an array");
  return unique(games.flatMap((game) => [...gameAliases(game)]));
}

function sourceAliases(sourceId) {
  return new Set([key(sourceId), ...(SOURCE_MAPPING_ALIASES[sourceId] ?? []).map(key)]);
}

function addIndexed(index, indexKey, row) {
  if (!index.has(indexKey)) index.set(indexKey, []);
  index.get(indexKey).push(row);
}

function compoundKey(...values) {
  return values.map((value) => text(value)).join("\u0000");
}

function buildCanonicalIndex(snapshot) {
  const gamesByAlias = new Map();
  const setsByGameAndCode = new Map();
  const setsByGameAndName = new Map();
  const cardsByGameAndSet = new Map();
  const cardsBySourceMapping = new Map();

  for (const game of snapshot.games) {
    for (const alias of unique([
      ...gameAliases(game.code),
      key(game.slug),
      key(game.name),
    ])) {
      addIndexed(gamesByAlias, alias, game);
    }
  }
  for (const set of snapshot.sets) {
    addIndexed(setsByGameAndCode, compoundKey(set.game_id, key(set.code)), set);
    addIndexed(setsByGameAndName, compoundKey(set.game_id, key(set.name)), set);
  }
  for (const card of snapshot.cards) {
    addIndexed(cardsByGameAndSet, compoundKey(card.game_id, card.set_id), card);
    for (const mapping of card.mappings ?? []) {
      if (mapping.active === false) continue;
      addIndexed(cardsBySourceMapping, compoundKey(
        card.game_id,
        key(mapping.source),
        text(mapping.external_id),
      ), card);
    }
  }
  return {
    gamesByAlias,
    setsByGameAndCode,
    setsByGameAndName,
    cardsByGameAndSet,
    cardsBySourceMapping,
  };
}

function cardSetMatches(candidate, canonicalCard) {
  const coordinates = candidate.identity_coordinates ?? {};
  const sourceSetCode = key(coordinates.set_code);
  if (sourceSetCode) return sourceSetCode === key(canonicalCard.set_code);
  return key(coordinates.set_or_product) === key(canonicalCard.set_name);
}

function cardCoordinatesMatch(candidate, canonicalCard) {
  const coordinates = candidate.identity_coordinates ?? {};
  return cardSetMatches(candidate, canonicalCard) &&
    numberKey(coordinates.collector_number) === numberKey(canonicalCard.number) &&
    key(coordinates.card_name) === key(canonicalCard.name) &&
    sameOptional(coordinates.rarity, canonicalCard.rarity);
}

function rowEnvelope(candidate, decision, reasonCodes, canonicalMatches = []) {
  return {
    reconciliation_version: COLLECTIBLE_WAVE1_CANONICAL_RECONCILIATION_VERSION,
    shadow_candidate_id: candidate.shadow_candidate_id,
    source_candidate_id: candidate.source_candidate_id,
    source_evidence_sha256: candidate.source_evidence_sha256,
    candidate_source_id: candidate.candidate_source?.source_id ?? null,
    game: candidate.identity_coordinates?.game ?? null,
    decision,
    reason_codes: unique(reasonCodes),
    canonical_match_ids: unique(canonicalMatches.map((row) => row.id)),
    unresolved_variant_evidence: candidateVariantUnresolved(candidate),
    canonical_authority: false,
    write_authority: false,
  };
}

export function validateCanonicalSnapshotV1(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error("canonical snapshot must be an object");
  }
  for (const field of ["games", "sets", "cards"]) {
    if (!Array.isArray(snapshot[field])) {
      throw new Error(`canonical snapshot ${field} must be an array`);
    }
  }
  const gameIds = new Set();
  for (const game of snapshot.games) {
    if (!text(game?.id) || !text(game?.code) || gameIds.has(game.id)) {
      throw new Error("canonical snapshot contains an invalid or duplicate game");
    }
    gameIds.add(game.id);
  }
  const setIds = new Set();
  for (const set of snapshot.sets) {
    if (!text(set?.id) || !text(set?.game_id) || !text(set?.game) || setIds.has(set.id)) {
      throw new Error("canonical snapshot contains an invalid or duplicate set");
    }
    if (!gameIds.has(set.game_id)) {
      throw new Error(`canonical set references an unknown game: ${set.id}`);
    }
    setIds.add(set.id);
  }
  const setsById = new Map(snapshot.sets.map((set) => [set.id, set]));
  const cardIds = new Set();
  for (const card of snapshot.cards) {
    if (!text(card?.id) || !text(card?.game_id) || !text(card?.set_id) || !text(card?.name) ||
        !text(card?.number) || cardIds.has(card.id)) {
      throw new Error("canonical snapshot contains an invalid or duplicate card");
    }
    if (!gameIds.has(card.game_id)) {
      throw new Error(`canonical card references an unknown game: ${card.id}`);
    }
    if (!setIds.has(card.set_id)) {
      throw new Error(`canonical card references an unknown set: ${card.id}`);
    }
    if (setsById.get(card.set_id).game_id !== card.game_id) {
      throw new Error(`canonical card and set game ownership disagree: ${card.id}`);
    }
    cardIds.add(card.id);
    if (!Array.isArray(card.mappings ?? []) || !Array.isArray(card.identities ?? [])) {
      throw new Error(`canonical card mappings and identities must be arrays: ${card.id}`);
    }
  }
  return { game_count: gameIds.size, set_count: setIds.size, card_count: cardIds.size };
}

function gameFoundations(candidate, index) {
  const aliases = gameAliases(candidate.identity_coordinates?.game);
  const matches = new Map();
  for (const alias of aliases) {
    for (const game of index.gamesByAlias.get(alias) ?? []) matches.set(game.id, game);
  }
  return [...matches.values()];
}

function candidateSets(candidate, index, foundations) {
  const coordinates = candidate.identity_coordinates ?? {};
  const sourceSetCode = key(coordinates.set_code);
  const matches = new Map();
  for (const foundation of foundations) {
    const rows = sourceSetCode
      ? index.setsByGameAndCode.get(compoundKey(foundation.id, sourceSetCode))
      : index.setsByGameAndName.get(compoundKey(
        foundation.id,
        key(coordinates.set_or_product),
      ));
    for (const set of rows ?? []) matches.set(set.id, set);
  }
  return [...matches.values()];
}

function exactSourceMappingCards(candidate, index, foundations) {
  const aliases = sourceAliases(candidate.candidate_source?.source_id);
  const matches = new Map();
  for (const foundation of foundations) {
    for (const alias of aliases) {
      const rows = index.cardsBySourceMapping.get(compoundKey(
        foundation.id,
        alias,
        text(candidate.source_candidate_id),
      ));
      for (const card of rows ?? []) matches.set(card.id, card);
    }
  }
  return [...matches.values()];
}

function reconcileCandidate(candidate, snapshot, index) {
  if (!text(candidate?.shadow_candidate_id) ||
      !text(candidate?.source_candidate_id) ||
      !text(candidate?.source_evidence_sha256) ||
      !text(candidate?.identity_coordinates?.game) ||
      !text(candidate?.identity_coordinates?.set_or_product) ||
      !text(candidate?.identity_coordinates?.collector_number) ||
      !text(candidate?.identity_coordinates?.card_name)) {
    throw new Error("candidate is missing required reconciliation coordinates");
  }
  const foundations = gameFoundations(candidate, index);
  const variantReasons = candidateVariantUnresolved(candidate)
    ? ["unresolved_alternative_artwork_mapping"]
    : [];
  if (foundations.length === 0) {
    return rowEnvelope(candidate, "blocked_missing_game_foundation", [
      "canonical_game_foundation_missing",
      ...variantReasons,
    ]);
  }
  if (foundations.length > 1) {
    return rowEnvelope(candidate, "ambiguous_candidate", [
      "multiple_canonical_game_foundations",
      ...variantReasons,
    ]);
  }

  const mappedCards = exactSourceMappingCards(candidate, index, foundations);
  if (mappedCards.length > 1) {
    return rowEnvelope(candidate, "ambiguous_candidate", [
      "source_mapping_has_multiple_canonical_owners",
      ...variantReasons,
    ], mappedCards);
  }
  if (mappedCards.length === 1) {
    if (!cardCoordinatesMatch(candidate, mappedCards[0])) {
      return rowEnvelope(candidate, "conflicting_candidate", [
        "source_mapping_coordinate_conflict",
        ...variantReasons,
      ], mappedCards);
    }
    return rowEnvelope(candidate, "exact_existing_identity", [
      "exact_source_mapping_and_coordinates",
      ...variantReasons,
    ], mappedCards);
  }

  const matchingSets = candidateSets(candidate, index, foundations);
  if (matchingSets.length === 0) {
    return rowEnvelope(candidate, "new_candidate", [
      "canonical_set_not_found",
      ...variantReasons,
    ]);
  }
  if (matchingSets.length > 1) {
    return rowEnvelope(candidate, "ambiguous_candidate", [
      "multiple_canonical_sets_match_candidate_coordinates",
      ...variantReasons,
    ]);
  }
  const cardsInSet = matchingSets.flatMap((set) =>
    index.cardsByGameAndSet.get(compoundKey(foundations[0].id, set.id)) ?? []);
  const coordinates = candidate.identity_coordinates;
  const numberMatches = cardsInSet.filter((card) =>
    numberKey(card.number) === numberKey(coordinates.collector_number));
  const nameAndNumberMatches = numberMatches.filter((card) =>
    key(card.name) === key(coordinates.card_name));
  const exactMatches = nameAndNumberMatches.filter((card) =>
    sameOptional(coordinates.rarity, card.rarity));

  if (exactMatches.length === 1 && matchingSets.length === 1) {
    return rowEnvelope(candidate, "exact_existing_identity", [
      "exact_canonical_coordinates",
      ...variantReasons,
    ], exactMatches);
  }
  if (exactMatches.length > 1 ||
      (exactMatches.length === 1 && matchingSets.length > 1)) {
    return rowEnvelope(candidate, "ambiguous_candidate", [
      "canonical_coordinates_have_multiple_owners",
      ...variantReasons,
    ], exactMatches);
  }
  if (nameAndNumberMatches.length > 0 && key(coordinates.rarity)) {
    return rowEnvelope(candidate, "conflicting_candidate", [
      "canonical_rarity_conflict",
      ...variantReasons,
    ], nameAndNumberMatches);
  }
  if (numberMatches.length > 0) {
    return rowEnvelope(candidate, "conflicting_candidate", [
      "canonical_number_owned_by_different_name",
      ...variantReasons,
    ], numberMatches);
  }
  return rowEnvelope(candidate, "new_candidate", [
    "canonical_card_not_found",
    ...variantReasons,
  ]);
}

export function reconcileCollectibleCandidateV1(candidate, snapshot) {
  validateCanonicalSnapshotV1(snapshot);
  return reconcileCandidate(candidate, snapshot, buildCanonicalIndex(snapshot));
}

export function reconcileCollectibleCandidatesV1(candidates, snapshot) {
  validateCanonicalSnapshotV1(snapshot);
  if (!Array.isArray(candidates)) throw new Error("candidates must be an array");
  const index = buildCanonicalIndex(snapshot);
  const ids = new Set();
  const rows = [];
  for (const candidate of candidates) {
    if (ids.has(candidate?.shadow_candidate_id)) {
      throw new Error(`duplicate shadow candidate ID: ${candidate.shadow_candidate_id}`);
    }
    ids.add(candidate?.shadow_candidate_id);
    rows.push(reconcileCandidate(candidate, snapshot, index));
  }
  rows.sort((left, right) => left.shadow_candidate_id.localeCompare(right.shadow_candidate_id));
  const counts = {};
  for (const row of rows) counts[row.decision] = (counts[row.decision] ?? 0) + 1;
  return {
    rows,
    decision_counts: Object.fromEntries(Object.entries(counts).sort()),
    unresolved_variant_row_count: rows.filter((row) => row.unresolved_variant_evidence).length,
  };
}
