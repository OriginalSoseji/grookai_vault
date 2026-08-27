import crypto from "node:crypto";

export const POKEMON_LANGUAGE_MASTER_INDEX_VERSION =
  "POKEMON_LANGUAGE_MASTER_INDEX_V1";

export const TCGDEX_POKEMON_LANGUAGE_SCOPES = Object.freeze([
  "de",
  "en",
  "es",
  "es-mx",
  "fr",
  "id",
  "it",
  "ja",
  "ko",
  "nl",
  "pl",
  "pt",
  "pt-br",
  "pt-pt",
  "ru",
  "th",
  "zh-cn",
  "zh-tw",
]);

export const TCGDEX_LIVE_POKEMON_LANGUAGE_SCOPES = Object.freeze([
  "de",
  "en",
  "es",
  "fr",
  "id",
  "it",
  "ja",
  "pt-br",
  "th",
  "zh-tw",
]);

function clean(value) {
  return String(value ?? "").trim();
}

function integerOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, sortObject(value[key])]),
  );
}

export function stablePokemonLanguageJson(value) {
  return `${JSON.stringify(sortObject(value), null, 2)}\n`;
}

export function pokemonLanguageFingerprint(value) {
  return crypto.createHash("sha256")
    .update(stablePokemonLanguageJson(value))
    .digest("hex");
}

function sourceSetForCard(cardId, setIds) {
  const matches = setIds.filter((setId) => cardId.startsWith(`${setId}-`));
  if (matches.length === 0) return null;
  matches.sort((left, right) => right.length - left.length || left.localeCompare(right));
  if (matches.length > 1 && matches[0].length === matches[1].length) {
    throw new Error(`Ambiguous TCGdex set ownership for card ${cardId}.`);
  }
  return matches[0];
}

function sourceAnomalyId({ language, entityType, anomalyType, sourceKey, payload, ordinal }) {
  const fingerprint = pokemonLanguageFingerprint(payload).slice(0, 16);
  return [
    language,
    entityType,
    anomalyType,
    clean(sourceKey).toLocaleLowerCase("und") || "missing-key",
    String(ordinal).padStart(3, "0"),
    fingerprint,
  ].join(":");
}

function buildSourceAnomaly({
  language,
  entityType,
  anomalyType,
  sourceKey,
  sourcePayload,
  ordinal = 1,
}) {
  const payload = sortObject(sourcePayload ?? {});
  return {
    source_anomaly_id: sourceAnomalyId({
      language,
      entityType,
      anomalyType,
      sourceKey,
      payload,
      ordinal,
    }),
    language,
    source_entity_type: entityType,
    anomaly_type: anomalyType,
    source_key: clean(sourceKey) || null,
    source_payload: payload,
    source_presence: "observed",
    revalidation_required: true,
    authority: "tcgdex_language_candidate_quarantine",
    canonical_authority: false,
  };
}

export function normalizePokemonLanguageSourceSnapshotV1({
  language,
  sets,
  cards,
  source = "tcgdex_v2",
  sourceCommitSha = null,
}) {
  const normalizedLanguage = clean(language).toLocaleLowerCase("und");
  if (!TCGDEX_POKEMON_LANGUAGE_SCOPES.includes(normalizedLanguage)) {
    throw new Error(`Unsupported Pokemon language scope: ${language}`);
  }
  if (!Array.isArray(sets) || !Array.isArray(cards)) {
    throw new Error("TCGdex language snapshot requires set and card arrays.");
  }

  const sourceAnomalies = [];
  const setIds = [];
  const setRows = [];
  const setsById = new Map();
  for (const [sourceIndex, source] of sets.entries()) {
    const sourceSetId = clean(source?.id);
    if (!sourceSetId) {
      sourceAnomalies.push(buildSourceAnomaly({
        language: normalizedLanguage,
        entityType: "set",
        anomalyType: "missing_source_set_id",
        sourceKey: null,
        sourcePayload: source,
        ordinal: sourceIndex + 1,
      }));
      continue;
    }
    const key = sourceSetId.toLocaleLowerCase("und");
    const group = setsById.get(key) ?? [];
    group.push(source);
    setsById.set(key, group);
  }
  for (const [key, group] of [...setsById].sort(([left], [right]) =>
    left.localeCompare(right))) {
    if (group.length > 1) {
      const ordered = [...group].sort((left, right) =>
        stablePokemonLanguageJson(left).localeCompare(stablePokemonLanguageJson(right))
      );
      ordered.forEach((source, index) => sourceAnomalies.push(buildSourceAnomaly({
        language: normalizedLanguage,
        entityType: "set",
        anomalyType: "duplicate_source_set_id",
        sourceKey: clean(source?.id) || key,
        sourcePayload: source,
        ordinal: index + 1,
      })));
      continue;
    }
    const [source] = group;
    const sourceSetId = clean(source.id);
    setIds.push(sourceSetId);
    setRows.push({
      language: normalizedLanguage,
      source_set_id: sourceSetId,
      source_set_name: clean(source?.name),
      source_official_card_count: integerOrNull(source?.cardCount?.official),
      source_total_card_count: integerOrNull(source?.cardCount?.total),
      source_logo_reference: clean(source?.logo) || null,
      source_symbol_reference: clean(source?.symbol) || null,
      source_evidence_reference: clean(source?.sourceReference) || null,
      prior_source_set_names: [],
      source_presence: "observed",
      revalidation_required: false,
      authority: "tcgdex_language_candidate",
      canonical_authority: false,
    });
  }

  const cardRows = [];
  const cardsById = new Map();
  for (const [sourceIndex, source] of cards.entries()) {
    const sourceCardId = clean(source?.id);
    if (!sourceCardId) {
      sourceAnomalies.push(buildSourceAnomaly({
        language: normalizedLanguage,
        entityType: "card",
        anomalyType: "missing_source_card_id",
        sourceKey: null,
        sourcePayload: source,
        ordinal: sourceIndex + 1,
      }));
      continue;
    }
    const key = sourceCardId.toLocaleLowerCase("und");
    const group = cardsById.get(key) ?? [];
    group.push(source);
    cardsById.set(key, group);
  }
  const cardsBySet = new Map();
  for (const [key, group] of [...cardsById].sort(([left], [right]) =>
    left.localeCompare(right))) {
    if (group.length > 1) {
      const ordered = [...group].sort((left, right) =>
        stablePokemonLanguageJson(left).localeCompare(stablePokemonLanguageJson(right))
      );
      ordered.forEach((source, index) => sourceAnomalies.push(buildSourceAnomaly({
        language: normalizedLanguage,
        entityType: "card",
        anomalyType: "duplicate_source_card_id",
        sourceKey: clean(source?.id) || key,
        sourcePayload: source,
        ordinal: index + 1,
      })));
      continue;
    }
    const [source] = group;
    const sourceCardId = clean(source?.id);
    const printedNumber = clean(source?.localId);
    const printedName = clean(source?.name);
    if (!sourceCardId || !printedNumber || !printedName) {
      sourceAnomalies.push(buildSourceAnomaly({
        language: normalizedLanguage,
        entityType: "card",
        anomalyType: "missing_card_identity_field",
        sourceKey: sourceCardId,
        sourcePayload: source,
      }));
      continue;
    }
    const sourceSetId = sourceSetForCard(sourceCardId, setIds);
    if (!sourceSetId) {
      sourceAnomalies.push(buildSourceAnomaly({
        language: normalizedLanguage,
        entityType: "card",
        anomalyType: "source_card_without_set_owner",
        sourceKey: sourceCardId,
        sourcePayload: source,
      }));
      continue;
    }
    cardsBySet.set(sourceSetId, (cardsBySet.get(sourceSetId) ?? 0) + 1);
    cardRows.push({
      language: normalizedLanguage,
      source_set_id: sourceSetId,
      source_card_id: sourceCardId,
      printed_number: printedNumber,
      printed_name: printedName,
      source_image_reference: clean(source?.image) || null,
      source_evidence_reference: clean(source?.sourceReference) || null,
      prior_printed_names: [],
      source_presence: "observed",
      revalidation_required: false,
      evidence_status: "single_source_candidate",
      authority: "tcgdex_language_candidate",
      canonical_authority: false,
    });
  }

  for (const row of setRows) {
    const observed = cardsBySet.get(row.source_set_id) ?? 0;
    row.observed_card_count = observed;
    const expected = row.source_total_card_count ?? row.source_official_card_count;
    row.source_coverage_status = expected === null
      ? "source_count_not_declared"
      : observed === expected
        ? "complete_against_source_count"
        : observed > expected
          ? "source_contains_additional_cards"
          : "source_partial";
  }

  setRows.sort((left, right) => left.source_set_id.localeCompare(right.source_set_id));
  cardRows.sort((left, right) =>
    left.source_set_id.localeCompare(right.source_set_id) ||
    left.printed_number.localeCompare(right.printed_number, "en", { numeric: true }) ||
    left.source_card_id.localeCompare(right.source_card_id)
  );
  sourceAnomalies.sort((left, right) =>
    left.source_anomaly_id.localeCompare(right.source_anomaly_id)
  );

  return {
    version: POKEMON_LANGUAGE_MASTER_INDEX_VERSION,
    language: normalizedLanguage,
    source: clean(source),
    source_commit_sha: clean(sourceCommitSha) || null,
    source_authority: "candidate_only",
    canonical_authority: false,
    sets: setRows,
    cards: cardRows,
    source_anomalies: sourceAnomalies,
  };
}

function mergeAliases(currentName, previousNames = []) {
  return [...new Set([...previousNames, currentName].map(clean).filter(Boolean))].sort();
}

export function mergePokemonLanguageCandidateSnapshotV1({
  baseline = null,
  current,
  catastrophicDropRatio = 0.8,
}) {
  if (!current || current.version !== POKEMON_LANGUAGE_MASTER_INDEX_VERSION) {
    throw new Error("Current Pokemon language snapshot is invalid.");
  }
  if (!baseline) return current;
  if (baseline.version !== POKEMON_LANGUAGE_MASTER_INDEX_VERSION ||
      baseline.language !== current.language) {
    throw new Error("Pokemon language baseline does not match current scope.");
  }
  if (baseline.cards.length >= 100 &&
      current.cards.length < baseline.cards.length * catastrophicDropRatio) {
    throw new Error(
      `Catastrophic ${current.language} source regression: ` +
      `${baseline.cards.length} -> ${current.cards.length}.`,
    );
  }

  const sets = new Map(baseline.sets.map((row) => [row.source_set_id, row]));
  for (const row of current.sets) {
    const prior = sets.get(row.source_set_id);
    sets.set(row.source_set_id, {
      ...row,
      prior_source_set_names: mergeAliases(
        row.source_set_name,
        [...(prior?.prior_source_set_names ?? []), prior?.source_set_name],
      ).filter((name) => name !== row.source_set_name),
    });
  }
  const currentSetIds = new Set(current.sets.map((row) => row.source_set_id));
  for (const [key, row] of sets) {
    if (!currentSetIds.has(key)) {
      sets.set(key, {
        ...row,
        source_presence: "temporarily_unobserved",
        revalidation_required: true,
      });
    }
  }

  const cards = new Map(baseline.cards.map((row) => [row.source_card_id, row]));
  for (const row of current.cards) {
    const prior = cards.get(row.source_card_id);
    if (prior && (prior.source_set_id !== row.source_set_id ||
        prior.printed_number !== row.printed_number)) {
      throw new Error(`Pokemon language coordinate changed for ${row.source_card_id}.`);
    }
    cards.set(row.source_card_id, {
      ...row,
      prior_printed_names: mergeAliases(
        row.printed_name,
        [...(prior?.prior_printed_names ?? []), prior?.printed_name],
      ).filter((name) => name !== row.printed_name),
    });
  }
  const currentCardIds = new Set(current.cards.map((row) => row.source_card_id));
  for (const [key, row] of cards) {
    if (!currentCardIds.has(key)) {
      cards.set(key, {
        ...row,
        source_presence: "temporarily_unobserved",
        revalidation_required: true,
      });
    }
  }

  const anomalies = new Map(
    (baseline.source_anomalies ?? []).map((row) => [row.source_anomaly_id, row]),
  );
  for (const row of current.source_anomalies ?? []) {
    anomalies.set(row.source_anomaly_id, row);
  }
  const currentAnomalyIds = new Set(
    (current.source_anomalies ?? []).map((row) => row.source_anomaly_id),
  );
  for (const [key, row] of anomalies) {
    if (!currentAnomalyIds.has(key)) {
      anomalies.set(key, {
        ...row,
        source_presence: "temporarily_unobserved",
        revalidation_required: true,
      });
    }
  }

  return {
    ...current,
    sets: [...sets.values()].sort((left, right) =>
      left.source_set_id.localeCompare(right.source_set_id)
    ),
    cards: [...cards.values()].sort((left, right) =>
      left.source_set_id.localeCompare(right.source_set_id) ||
      left.printed_number.localeCompare(right.printed_number, "en", { numeric: true }) ||
      left.source_card_id.localeCompare(right.source_card_id)
    ),
    source_anomalies: [...anomalies.values()].sort((left, right) =>
      left.source_anomaly_id.localeCompare(right.source_anomaly_id)
    ),
  };
}

export function summarizePokemonLanguageCandidateSnapshotV1(snapshot) {
  const observedSets = snapshot.sets.filter((row) => row.source_presence === "observed");
  const observedCards = snapshot.cards.filter((row) => row.source_presence === "observed");
  const sourceAnomalies = snapshot.source_anomalies ?? [];
  const observedSourceAnomalies = sourceAnomalies.filter((row) =>
    row.source_presence === "observed"
  );
  return {
    version: POKEMON_LANGUAGE_MASTER_INDEX_VERSION,
    language: snapshot.language,
    source: snapshot.source,
    source_commit_sha: snapshot.source_commit_sha ?? null,
    source_authority: snapshot.source_authority,
    canonical_authority: false,
    set_count: snapshot.sets.length,
    card_count: snapshot.cards.length,
    observed_set_count: observedSets.length,
    observed_card_count: observedCards.length,
    revalidation_set_count: snapshot.sets.length - observedSets.length,
    revalidation_card_count: snapshot.cards.length - observedCards.length,
    source_anomaly_count: sourceAnomalies.length,
    observed_source_anomaly_count: observedSourceAnomalies.length,
    revalidation_source_anomaly_count:
      sourceAnomalies.length - observedSourceAnomalies.length,
    complete_source_set_count: observedSets.filter((row) =>
      row.source_coverage_status === "complete_against_source_count" ||
      row.source_coverage_status === "source_contains_additional_cards"
    ).length,
    sets_fingerprint_sha256: pokemonLanguageFingerprint(snapshot.sets),
    cards_fingerprint_sha256: pokemonLanguageFingerprint(snapshot.cards),
    source_anomalies_fingerprint_sha256: pokemonLanguageFingerprint(sourceAnomalies),
  };
}

export function buildPokemonLanguageCandidateIndexReconciliationV1({
  registry,
  canonicalCardCountsByLanguage = {},
}) {
  if (!registry || registry.version !== POKEMON_LANGUAGE_MASTER_INDEX_VERSION ||
      registry.canonical_authority !== false || !Array.isArray(registry.languages)) {
    throw new Error("Pokemon language candidate registry is invalid.");
  }
  const byLanguage = new Map();
  for (const row of registry.languages) {
    const language = clean(row?.language).toLocaleLowerCase("und");
    if (!TCGDEX_POKEMON_LANGUAGE_SCOPES.includes(language) || byLanguage.has(language)) {
      throw new Error(`Pokemon language candidate registry has invalid scope ${language}.`);
    }
    byLanguage.set(language, row);
  }

  const languages = TCGDEX_POKEMON_LANGUAGE_SCOPES.map((language) => {
    const candidate = byLanguage.get(language) ?? null;
    const canonicalCount = integerOrNull(canonicalCardCountsByLanguage[language]);
    const admissionAdapter = language === "en"
      ? "english_master_index_v1"
      : language === "ja"
        ? "japanese_master_index_v4_plus_incremental_v1"
        : null;
    return {
      language,
      source_status: candidate?.status ?? "candidate_index_not_initialized",
      candidate_set_count: integerOrNull(candidate?.set_count) ?? 0,
      candidate_card_count: integerOrNull(candidate?.card_count) ?? 0,
      candidate_sets_fingerprint_sha256: clean(
        candidate?.sets_fingerprint_sha256,
      ) || null,
      candidate_cards_fingerprint_sha256: clean(
        candidate?.cards_fingerprint_sha256,
      ) || null,
      candidate_source_anomaly_count:
        integerOrNull(candidate?.source_anomaly_count) ?? 0,
      candidate_source_anomalies_fingerprint_sha256: clean(
        candidate?.source_anomalies_fingerprint_sha256,
      ) || null,
      candidate_authority: "candidate_only",
      canonical_authority: false,
      canonical_database_card_count: canonicalCount,
      admission_adapter: admissionAdapter,
      admission_status: admissionAdapter
        ? "independent_evidence_adapter_available"
        : "candidate_only_pending_independent_evidence_adapter",
      promotion_candidate_count: 0,
    };
  });

  return {
    version: POKEMON_LANGUAGE_MASTER_INDEX_VERSION,
    policy: "candidate_capture_precedes_independent_canonical_admission",
    canonical_authority: false,
    registry_fingerprint_sha256: pokemonLanguageFingerprint(registry),
    summary: {
      language_scope_count: languages.length,
      initialized_language_count: languages.filter((row) =>
        row.source_status !== "candidate_index_not_initialized"
      ).length,
      candidate_card_count: languages.reduce(
        (sum, row) => sum + row.candidate_card_count,
        0,
      ),
      candidate_source_anomaly_count: languages.reduce(
        (sum, row) => sum + row.candidate_source_anomaly_count,
        0,
      ),
      admission_adapter_language_count: languages.filter((row) =>
        row.admission_adapter !== null
      ).length,
      candidate_only_language_count: languages.filter((row) =>
        row.admission_adapter === null
      ).length,
      promotion_candidate_count: 0,
    },
    languages,
  };
}
