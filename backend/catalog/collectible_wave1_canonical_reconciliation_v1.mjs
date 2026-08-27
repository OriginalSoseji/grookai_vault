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
    if (!text(set?.id) || !text(set?.game) || setIds.has(set.id)) {
      throw new Error("canonical snapshot contains an invalid or duplicate set");
    }
    setIds.add(set.id);
  }
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
    cardIds.add(card.id);
    if (!Array.isArray(card.mappings ?? []) || !Array.isArray(card.identities ?? [])) {
      throw new Error(`canonical card mappings and identities must be arrays: ${card.id}`);
    }
  }
  return { game_count: gameIds.size, set_count: setIds.size, card_count: cardIds.size };
}

function gameFoundations(candidate, snapshot) {
  const aliases = gameAliases(candidate.identity_coordinates?.game);
  return snapshot.games.filter((game) =>
    aliases.has(key(game.code)) || aliases.has(key(game.slug)) || aliases.has(key(game.name)));
}

function candidateSets(candidate, snapshot, foundations) {
  const gameIds = new Set(foundations.map((row) => row.id));
  const aliases = gameAliases(candidate.identity_coordinates?.game);
  const coordinates = candidate.identity_coordinates ?? {};
  const sourceSetCode = key(coordinates.set_code);
  return snapshot.sets.filter((set) => {
    const sameGame = gameIds.has(set.game_id) || aliases.has(key(set.game));
    if (!sameGame) return false;
    if (sourceSetCode) return sourceSetCode === key(set.code);
    return key(coordinates.set_or_product) === key(set.name);
  });
}

function exactSourceMappingCards(candidate, snapshot, foundations) {
  const aliases = sourceAliases(candidate.candidate_source?.source_id);
  const gameIds = new Set(foundations.map((row) => row.id));
  return snapshot.cards.filter((card) => {
    if (!gameIds.has(card.game_id)) return false;
    return (card.mappings ?? []).some((mapping) =>
      mapping.active !== false && aliases.has(key(mapping.source)) &&
      text(mapping.external_id) === text(candidate.source_candidate_id));
  });
}

export function reconcileCollectibleCandidateV1(candidate, snapshot) {
  if (!text(candidate?.shadow_candidate_id) ||
      !text(candidate?.source_candidate_id) ||
      !text(candidate?.source_evidence_sha256) ||
      !text(candidate?.identity_coordinates?.game) ||
      !text(candidate?.identity_coordinates?.set_or_product) ||
      !text(candidate?.identity_coordinates?.collector_number) ||
      !text(candidate?.identity_coordinates?.card_name)) {
    throw new Error("candidate is missing required reconciliation coordinates");
  }
  const foundations = gameFoundations(candidate, snapshot);
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

  const mappedCards = exactSourceMappingCards(candidate, snapshot, foundations);
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

  const matchingSets = candidateSets(candidate, snapshot, foundations);
  if (matchingSets.length === 0) {
    return rowEnvelope(candidate, "new_candidate", [
      "canonical_set_not_found",
      ...variantReasons,
    ]);
  }
  const setIds = new Set(matchingSets.map((row) => row.id));
  const cardsInSet = snapshot.cards.filter((card) => setIds.has(card.set_id));
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

export function reconcileCollectibleCandidatesV1(candidates, snapshot) {
  validateCanonicalSnapshotV1(snapshot);
  if (!Array.isArray(candidates)) throw new Error("candidates must be an array");
  const ids = new Set();
  const rows = [];
  for (const candidate of candidates) {
    if (ids.has(candidate?.shadow_candidate_id)) {
      throw new Error(`duplicate shadow candidate ID: ${candidate.shadow_candidate_id}`);
    }
    ids.add(candidate?.shadow_candidate_id);
    rows.push(reconcileCollectibleCandidateV1(candidate, snapshot));
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
