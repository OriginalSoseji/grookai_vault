import crypto from "node:crypto";

export const UNIVERSAL_CATALOG_DISCOVERY_VERSION =
  "UNIVERSAL_CATALOG_DISCOVERY_V1";

export async function runDegradedCatalogSourceLaneV1({
  authority,
  operation,
  failures,
  fallback,
  recordedAt = () => new Date().toISOString(),
}) {
  if (!authority || typeof operation !== "function" || !Array.isArray(failures)) {
    throw new Error("A source authority, operation, and failure collection are required");
  }
  try {
    return await operation();
  } catch (error) {
    const message = String(error?.message ?? error);
    if (!message.includes("[SOURCE_UNAVAILABLE]")) throw error;
    failures.push({
      authority,
      failure_class: "source_unavailable",
      message,
      recorded_at: recordedAt(),
    });
    return typeof fallback === "function" ? fallback() : fallback;
  }
}

export const CATALOG_GAP_STATUSES = Object.freeze({
  AMBIGUOUS_SOURCE_IDENTITY: "ambiguous_source_identity",
  EXACT_COMPLETE: "exact_complete",
  FUTURE_RELEASE: "future_release",
  INCOMPLETE_CARDS: "incomplete_cards",
  MISSING_SET: "missing_set",
  PRESENT_UNVERIFIED: "present_unverified",
  SOURCE_BEHIND: "source_behind",
  SOURCE_NO_ELIGIBLE_CARDS: "source_no_eligible_cards",
});

export const JAPANESE_CARD_COVERAGE_STATUSES = Object.freeze({
  AMBIGUOUS_CANONICAL_MATCH: "ambiguous_canonical_match",
  CANONICAL_CARD_MISSING: "canonical_card_missing",
  CANONICAL_PRESENT_OFFICIAL_EVIDENCE_MISSING:
    "canonical_present_official_evidence_missing",
  OFFICIAL_EVIDENCE_PRESENT: "official_evidence_present",
});

export const POKEMON_MASTER_INDEX_RECONCILIATION_VERSION =
  "POKEMON_LANGUAGE_MASTER_INDEX_RECONCILIATION_V1";

function clean(value) {
  return String(value ?? "").trim();
}

export function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return crypto.createHash("sha256").update(
    typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : stableJson(value),
  ).digest("hex");
}

export function normalizeCatalogText(value) {
  return clean(value)
    .normalize("NFKC")
    .toLocaleLowerCase("und")
    .replace(/&/g, " and ")
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCatalogSetCode(gameCode, value) {
  const compact = clean(value).toLocaleLowerCase("und").replace(/[^a-z0-9]+/g, "");
  if (!compact) return "";
  if (gameCode === "one_piece") {
    const match = compact.match(/^(op|st|eb|prb)(\d{1,2})$/i);
    if (match) return `${match[1].toLowerCase()}${match[2].padStart(2, "0")}`;
  }
  return compact;
}

export function normalizeJapanesePrintedSetCode(value) {
  return clean(value)
    .normalize("NFKC")
    .toLocaleLowerCase("und")
    .replace(/^jpn[-_\s]*/i, "")
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeCollectorNumber(value) {
  const token = clean(value).split("/", 1)[0].toLocaleUpperCase("und");
  return /^\d+$/.test(token) ? String(Number(token)) : token.replace(/\s+/g, "");
}

export function reconcileJapaneseOfficialCardCoverage({
  card,
  officialEvidenceIds = [],
  canonicalCards = [],
}) {
  const sourceExternalId = clean(card?.card_id);
  if (new Set(officialEvidenceIds.map(clean)).has(sourceExternalId)) {
    return {
      status: JAPANESE_CARD_COVERAGE_STATUSES.OFFICIAL_EVIDENCE_PRESENT,
      canonical_matches: [],
    };
  }

  const sourceSetCode = normalizeJapanesePrintedSetCode(card?.source_set_code);
  const sourceNumber = normalizeCollectorNumber(
    card?.card_number_raw ?? card?.card_number_numerator,
  );
  const coordinateMatches = (canonicalCards ?? []).filter((candidate) =>
    sourceSetCode && sourceNumber &&
    [candidate.set_code, candidate.printed_set_abbrev]
      .some((value) => normalizeJapanesePrintedSetCode(value) === sourceSetCode) &&
    normalizeCollectorNumber(candidate.number_plain ?? candidate.number) === sourceNumber);
  const sourceName = normalizeCatalogText(card?.printed_name);
  const exactNameMatches = coordinateMatches.filter((candidate) =>
    sourceName && normalizeCatalogText(candidate.name) === sourceName);
  const matches = exactNameMatches.length === 1 ? exactNameMatches : coordinateMatches;
  const canonicalMatches = matches.map((candidate) => ({
    card_print_id: candidate.id,
    gv_id: candidate.gv_id,
    name: candidate.name,
    number: candidate.number,
    set_code: candidate.set_code,
  }));
  if (matches.length === 1) {
    return {
      status:
        JAPANESE_CARD_COVERAGE_STATUSES.CANONICAL_PRESENT_OFFICIAL_EVIDENCE_MISSING,
      canonical_matches: canonicalMatches,
    };
  }
  if (matches.length > 1) {
    return {
      status: JAPANESE_CARD_COVERAGE_STATUSES.AMBIGUOUS_CANONICAL_MATCH,
      canonical_matches: canonicalMatches,
    };
  }
  return {
    status: JAPANESE_CARD_COVERAGE_STATUSES.CANONICAL_CARD_MISSING,
    canonical_matches: [],
  };
}

export function catalogSetScope(row) {
  const explicit = normalizeCatalogText(row?.catalog_scope);
  if (explicit) return explicit;
  const gameCode = clean(row?.game_code);
  if (gameCode !== "pokemon") return normalizeCatalogText(gameCode) || "global";
  const domains = [row?.identity_domain, ...(row?.identity_domains ?? [])]
    .map(normalizeCatalogText).filter(Boolean);
  if (domains.some((domain) => domain === "pokemon jpn")) return "pokemon ja";
  if (domains.some((domain) => domain.startsWith("pokemon eng"))) return "pokemon en";
  return "pokemon unspecified";
}

export function catalogSetMatchKeys(row) {
  const gameCode = clean(row.game_code);
  const scope = catalogSetScope(row);
  const scoped = (kind, value) => value ? `${scope}|${kind}:${value}` : "";
  return [...new Set([
    scoped("code", normalizeCatalogSetCode(gameCode, row.code)),
    ...(row.code_aliases ?? []).map((alias) =>
      scoped("code", normalizeCatalogSetCode(gameCode, alias))),
    scoped("source", normalizeCatalogText(row.source_set_id)),
    scoped("name", normalizeCatalogText(row.name)),
    ...(row.aliases ?? []).map((alias) => scoped("name", normalizeCatalogText(alias))),
  ].filter((value) => value && !value.endsWith(":")))];
}

function masterSetCodes(row, language) {
  const values = language === "en"
    ? [
        row.key,
        row.pokemontcg,
        row.tcgdex,
        ...(row.manual_aliases ?? []),
        ...Object.values(row.source_aliases ?? {}),
      ]
    : [
        ...(row.official_code_evidence ?? []),
        clean(row.jpn_set_key).replace(/^jpn-/i, ""),
      ];
  return new Set(values.map((value) =>
    normalizeCatalogSetCode("pokemon", value)).filter(Boolean));
}

export function classifyPokemonDatabaseSetScopesV1({
  databaseSets = [],
  englishMasterSets = [],
  japaneseMasterSets = [],
}) {
  const englishCodes = new Set(englishMasterSets.flatMap((row) =>
    [...masterSetCodes(row, "en")]));
  const japaneseCodes = new Set(japaneseMasterSets.flatMap((row) =>
    [...masterSetCodes(row, "ja")]));
  return databaseSets.map((row) => {
    if (row.game_code !== "pokemon" || catalogSetScope(row) !== "pokemon unspecified") {
      return row;
    }
    const code = normalizeCatalogSetCode("pokemon", row.code);
    const englishMatch = englishCodes.has(code);
    const japaneseMatch = japaneseCodes.has(code);
    if (englishMatch === japaneseMatch) {
      return { ...row, catalog_scope: "pokemon_unspecified" };
    }
    return {
      ...row,
      catalog_scope: englishMatch ? "pokemon_en" : "pokemon_ja",
      catalog_scope_evidence: englishMatch
        ? "english_master_index_set_code"
        : "japanese_master_index_set_code",
    };
  });
}

function integerOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function compareDate(value, asOf) {
  const date = clean(value);
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.localeCompare(asOf) : -1;
}

export function reconcileCatalogSets({ sourceSets, databaseSets, asOf }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean(asOf))) {
    throw new Error("asOf must use YYYY-MM-DD");
  }
  const databaseIndex = new Map();
  for (const row of databaseSets ?? []) {
    for (const key of catalogSetMatchKeys(row)) {
      const candidates = databaseIndex.get(key) ?? [];
      candidates.push(row);
      databaseIndex.set(key, candidates);
    }
  }

  const sourceCodeCounts = new Map();
  for (const source of sourceSets ?? []) {
    const code = normalizeCatalogSetCode(source.game_code, source.code);
    if (!code) continue;
    const key = `${source.game_code}:${catalogSetScope(source)}:${code}`;
    sourceCodeCounts.set(key, (sourceCodeCounts.get(key) ?? 0) + 1);
  }
  const results = [];
  for (const source of sourceSets ?? []) {
    let candidates = [];
    for (const key of catalogSetMatchKeys(source)) {
      const candidateMap = new Map((databaseIndex.get(key) ?? []).map((row) => [
        `${row.game_code}:${row.code}`,
        row,
      ]));
      if (candidateMap.size === 0) continue;
      candidates = [...candidateMap.values()];
      break;
    }
    const expected = integerOrNull(source.expected_card_count);
    let database = candidates.length === 1 ? candidates[0] : null;
    if (!database && candidates.length > 1) {
      const exactCountMatches = expected === null ? [] : candidates.filter((row) =>
        integerOrNull(row.card_count) === expected);
      const populated = candidates.filter((row) => (integerOrNull(row.card_count) ?? 0) > 0);
      if (exactCountMatches.length === 1) database = exactCountMatches[0];
      else if (populated.length === 1) database = populated[0];
    }
    const actual = integerOrNull(database?.card_count);
    const countScope = clean(source.count_scope) || "full_set";
    const hasCompleteCountAuthority = countScope === "full_set" ||
      countScope === "canonical_parent_rows" ||
      countScope === "canonical_parent_rows_owned_by_set";
    let status;
    const normalizedSourceCode = normalizeCatalogSetCode(source.game_code, source.code);
    if (normalizedSourceCode &&
      (sourceCodeCounts.get(
        `${source.game_code}:${catalogSetScope(source)}:${normalizedSourceCode}`,
      ) ?? 0) > 1) {
      status = CATALOG_GAP_STATUSES.AMBIGUOUS_SOURCE_IDENTITY;
    } else if (!database && candidates.length > 1) {
      status = CATALOG_GAP_STATUSES.AMBIGUOUS_SOURCE_IDENTITY;
    } else if (!database && expected === 0) {
      status = CATALOG_GAP_STATUSES.SOURCE_NO_ELIGIBLE_CARDS;
    } else if (compareDate(source.release_date, asOf) > 0) {
      status = CATALOG_GAP_STATUSES.FUTURE_RELEASE;
    } else if (!database) {
      status = CATALOG_GAP_STATUSES.MISSING_SET;
    } else if (expected === null || actual === null) {
      status = CATALOG_GAP_STATUSES.PRESENT_UNVERIFIED;
    } else if (actual < expected) {
      status = CATALOG_GAP_STATUSES.INCOMPLETE_CARDS;
    } else if (!hasCompleteCountAuthority) {
      status = CATALOG_GAP_STATUSES.PRESENT_UNVERIFIED;
    } else if (actual > expected) {
      status = CATALOG_GAP_STATUSES.SOURCE_BEHIND;
    } else {
      status = CATALOG_GAP_STATUSES.EXACT_COMPLETE;
    }

    results.push({
      game_code: source.game_code,
      catalog_scope: catalogSetScope(source),
      source_id: source.source_id,
      source_set_id: source.source_set_id ?? null,
      source_code: source.code ?? null,
      source_name: source.name,
      source_url: source.source_url,
      release_date: source.release_date ?? null,
      expected_card_count: expected,
      count_scope: countScope,
      count_evidence: source.count_evidence ?? [],
      database_code: database?.code ?? null,
      database_name: database?.name ?? null,
      database_card_count: actual,
      candidate_database_codes: candidates.map((row) => row.code).sort(),
      status,
      missing_card_count:
        status === CATALOG_GAP_STATUSES.INCOMPLETE_CARDS
          ? expected - actual
          : null,
    });
  }
  return results.sort((left, right) =>
    left.game_code.localeCompare(right.game_code) ||
    String(left.release_date ?? "").localeCompare(String(right.release_date ?? "")) ||
    String(left.source_code ?? left.source_name).localeCompare(
      String(right.source_code ?? right.source_name), undefined, { numeric: true },
    ));
}

export function summarizeCatalogReconciliation(rows) {
  const byStatus = {};
  const byGame = {};
  for (const row of rows ?? []) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    const game = byGame[row.game_code] ?? { total: 0, actionable_gaps: 0, statuses: {} };
    game.total += 1;
    game.statuses[row.status] = (game.statuses[row.status] ?? 0) + 1;
    if ([CATALOG_GAP_STATUSES.MISSING_SET, CATALOG_GAP_STATUSES.INCOMPLETE_CARDS]
      .includes(row.status)) {
      game.actionable_gaps += 1;
    }
    byGame[row.game_code] = game;
  }
  const actionable = (rows ?? []).filter((row) =>
    [CATALOG_GAP_STATUSES.MISSING_SET, CATALOG_GAP_STATUSES.INCOMPLETE_CARDS]
      .includes(row.status));
  return {
    version: UNIVERSAL_CATALOG_DISCOVERY_VERSION,
    source_set_count: rows?.length ?? 0,
    actionable_gap_count: actionable.length,
    by_status: byStatus,
    by_game: byGame,
    actionable_gap_fingerprint: sha256(actionable),
  };
}

export function buildPokemonLanguageMasterIndexReconciliationV1({
  reconciliation = [],
  englishMasterCards = [],
  englishAliasResolutions = [],
  japaneseMasterSets = [],
  japaneseMasterCards = [],
}) {
  const englishCardsBySet = new Map();
  for (const card of englishMasterCards) {
    const key = clean(card.set_key).toLocaleLowerCase("en");
    const rows = englishCardsBySet.get(key) ?? [];
    rows.push(card);
    englishCardsBySet.set(key, rows);
  }
  const englishAliasBySource = new Map(englishAliasResolutions.map((row) => [
    clean(row.source_code).toLocaleLowerCase("en"),
    row,
  ]));
  const japaneseSetsByCode = new Map();
  for (const set of japaneseMasterSets) {
    for (const code of set.official_code_evidence ?? []) {
      const key = normalizeJapanesePrintedSetCode(code);
      if (!key) continue;
      const rows = japaneseSetsByCode.get(key) ?? [];
      rows.push(set);
      japaneseSetsByCode.set(key, rows);
    }
  }
  const japaneseCardsBySet = new Map();
  for (const card of japaneseMasterCards) {
    const key = clean(card.jpn_set_key);
    if (!key) continue;
    const rows = japaneseCardsBySet.get(key) ?? [];
    rows.push(card);
    japaneseCardsBySet.set(key, rows);
  }
  const rows = reconciliation.filter((row) => row.game_code === "pokemon").map((row) => {
    const language = row.catalog_scope === "pokemon en"
      ? "en"
      : row.catalog_scope === "pokemon ja" ? "ja" : "unknown";
    const sourceCode = clean(row.source_code);
    const expected = integerOrNull(row.expected_card_count);
    const alias = language === "en"
      ? englishAliasBySource.get(sourceCode.toLocaleLowerCase("en")) ?? null
      : null;
    const masterCards = language === "en"
      ? englishCardsBySet.get(sourceCode.toLocaleLowerCase("en")) ?? []
      : [];
    const japaneseSetMatches = language === "ja"
      ? japaneseSetsByCode.get(normalizeJapanesePrintedSetCode(sourceCode)) ?? []
      : [];
    const japaneseMasterSet = japaneseSetMatches.length === 1
      ? japaneseSetMatches[0]
      : null;
    const japaneseMasterSetCards = japaneseMasterSet
      ? japaneseCardsBySet.get(clean(japaneseMasterSet.jpn_set_key)) ?? []
      : [];
    const completeEnglishAuthority = language === "en" && expected !== null &&
      masterCards.length === expected && masterCards.every((card) =>
        card.status === "master_verified" && Number(card.source_count) >= 2);
    const completeJapaneseAuthority = language === "ja" &&
      japaneseMasterSet !== null && expected !== null &&
      japaneseMasterSet.master_admissible === true &&
      (japaneseMasterSet.expected_card_count_evidence ?? [])
        .some((count) => Number(count) === expected) &&
      japaneseMasterSetCards.length === expected &&
      japaneseMasterSetCards.every((card) =>
        card.master_admissible !== false &&
        card.admission_status === "master_admissible" &&
        clean(card.printed_number));

    let masterIndexStatus = "candidate_update_required";
    let promotionDecision = "blocked_master_index_incomplete";
    let canonicalOwnerCode = row.database_code ?? null;
    if (language === "unknown") {
      masterIndexStatus = "unsupported_language_scope";
      promotionDecision = "blocked_language_scope";
    } else if (alias) {
      masterIndexStatus = "alias_or_subset_owner_resolved";
      promotionDecision = "no_write_existing_canonical_owner";
      canonicalOwnerCode = alias.canonical_code;
    } else if (language === "en" && completeEnglishAuthority) {
      masterIndexStatus = "master_verified";
      promotionDecision = row.status === CATALOG_GAP_STATUSES.INCOMPLETE_CARDS && row.database_code
        ? "canonical_delta_eligible"
        : row.status === CATALOG_GAP_STATUSES.EXACT_COMPLETE
          ? "no_write_exact_complete"
          : row.status === CATALOG_GAP_STATUSES.SOURCE_BEHIND
            ? "no_write_source_scope_behind"
            : "blocked_master_set_owner_unresolved";
    } else if (language === "ja" && japaneseMasterSet) {
      masterIndexStatus = completeJapaneseAuthority
        ? "master_verified"
        : "master_set_owner_verified_cards_incomplete";
      canonicalOwnerCode = row.database_code ?? japaneseMasterSet.jpn_set_key;
      promotionDecision = row.status === CATALOG_GAP_STATUSES.INCOMPLETE_CARDS &&
        row.database_code && completeJapaneseAuthority
        ? "canonical_delta_eligible"
        : row.status === CATALOG_GAP_STATUSES.EXACT_COMPLETE
          ? "no_write_exact_complete"
          : row.status === CATALOG_GAP_STATUSES.SOURCE_BEHIND
            ? "no_write_source_scope_behind"
            : row.status === CATALOG_GAP_STATUSES.MISSING_SET && completeJapaneseAuthority
              ? "blocked_missing_canonical_set_writer"
              : "blocked_master_index_incomplete";
    }
    return {
      language,
      source_id: row.source_id,
      source_set_id: row.source_set_id,
      source_code: row.source_code,
      source_name: row.source_name,
      expected_card_count: expected,
      master_index_card_count: language === "en"
        ? masterCards.length
        : language === "ja" ? japaneseMasterSetCards.length : null,
      master_index_status: masterIndexStatus,
      canonical_owner_code: canonicalOwnerCode,
      canonical_reconciliation_status: row.status,
      promotion_decision: promotionDecision,
      source_url: row.source_url,
    };
  });
  const byLanguage = {};
  const byDecision = {};
  for (const row of rows) {
    byLanguage[row.language] = (byLanguage[row.language] ?? 0) + 1;
    byDecision[row.promotion_decision] = (byDecision[row.promotion_decision] ?? 0) + 1;
  }
  return {
    version: POKEMON_MASTER_INDEX_RECONCILIATION_VERSION,
    policy: "pokemon_sources_update_language_master_index_before_canonical_reconciliation",
    supported_languages: ["en", "ja"],
    summary: {
      row_count: rows.length,
      by_language: byLanguage,
      by_promotion_decision: byDecision,
    },
    rows,
  };
}

export function buildPokemonMasterIndexUpdateCandidatesV1(masterIndexReconciliation) {
  return (masterIndexReconciliation?.rows ?? []).filter((row) =>
    row.promotion_decision.startsWith("blocked_")).map((row) => ({
    language: row.language,
    source_id: row.source_id,
    source_set_id: row.source_set_id,
    source_code: row.source_code,
    source_name: row.source_name,
    expected_card_count: row.expected_card_count,
    observed_master_index_card_count: row.master_index_card_count,
    current_status: row.master_index_status,
    blocked_reason: row.promotion_decision,
    required_next_evidence: row.promotion_decision === "blocked_master_index_incomplete"
      ? "collect_independent_language_source_evidence_and_rebuild_master_index"
      : row.promotion_decision === "blocked_master_set_owner_unresolved"
        ? "resolve_language_master_set_owner_or_alias_before_canonical_reconciliation"
        : row.promotion_decision === "blocked_missing_canonical_set_writer"
          ? "add_and_prove_a_governed_missing_set_writer_after_master_index_admission"
        : "resolve_language_scope_before_master_index_admission",
    source_url: row.source_url,
  }));
}

export function buildCanonicalPromotionCandidatesV1({
  actionableGaps = [],
  pokemonMasterIndexReconciliation,
}) {
  const pokemonGateBySource = new Map(
    (pokemonMasterIndexReconciliation?.rows ?? []).map((row) => [
      [row.language, row.source_id, row.source_set_id, row.source_code].join("|"),
      row,
    ]),
  );
  return actionableGaps.flatMap((gap) => {
    if (gap.game_code !== "pokemon") return [gap];
    const language = gap.catalog_scope === "pokemon en"
      ? "en"
      : gap.catalog_scope === "pokemon ja" ? "ja" : "unknown";
    const gate = pokemonGateBySource.get([
      language,
      gap.source_id,
      gap.source_set_id,
      gap.source_code,
    ].join("|"));
    if (gate?.promotion_decision !== "canonical_delta_eligible") return [];
    return [{
      ...gap,
      master_index_gate: {
        version: pokemonMasterIndexReconciliation.version,
        language,
        master_index_status: gate.master_index_status,
        canonical_owner_code: gate.canonical_owner_code,
        decision: gate.promotion_decision,
      },
    }];
  });
}

export function buildCatalogSearchAliases(rows) {
  const aliases = [];
  for (const row of rows ?? []) {
    if (!row.database_code) continue;
    for (const alias of [row.source_name, row.source_code, row.database_name]) {
      const normalized = normalizeCatalogText(alias);
      if (!normalized) continue;
      aliases.push({
        game_code: row.game_code,
        alias: normalized,
        set_codes: [row.database_code.toLowerCase()],
        authority: "source_reconciled_set_identity",
        source_id: row.source_id,
        source_url: row.source_url,
      });
    }
  }
  const unique = new Map();
  for (const alias of aliases) {
    const key = `${alias.game_code}:${alias.alias}:${alias.set_codes.join(",")}`;
    unique.set(key, alias);
  }
  return [...unique.values()].sort((left, right) =>
    left.game_code.localeCompare(right.game_code) || left.alias.localeCompare(right.alias));
}
