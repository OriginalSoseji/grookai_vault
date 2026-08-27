import crypto from "node:crypto";

export const JAPANESE_POKEMON_MASTER_INDEX_INCREMENTAL_VERSION =
  "JAPANESE_POKEMON_MASTER_INDEX_INCREMENTAL_V1";

function clean(value) {
  return String(value ?? "").trim();
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stableValue(value[key])]),
  );
}

export function stableJapaneseIncrementalJson(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

export function japaneseIncrementalFingerprint(value) {
  return crypto.createHash("sha256")
    .update(stableJapaneseIncrementalJson(value))
    .digest("hex");
}

export function normalizeJapaneseCardCoordinateV1(value) {
  const raw = clean(value).split("/")[0].toLocaleUpperCase("und")
    .replace(/\s+/g, "")
    .replace(/[‐‑‒–—―]/g, "-");
  if (/^\d+$/.test(raw)) return String(Number.parseInt(raw, 10));
  const match = raw.match(/^([^0-9]*?)0+(\d+[A-Z]?)$/);
  return match ? `${match[1]}${match[2]}` : raw;
}

function exactCodeSetMap(sets) {
  const map = new Map();
  for (const set of sets) {
    for (const code of set.official_code_evidence ?? []) {
      const key = clean(code).toLocaleUpperCase("und");
      if (!key) continue;
      const rows = map.get(key) ?? [];
      rows.push(set);
      map.set(key, rows);
    }
  }
  return map;
}

function cardCoordinateMap(cards) {
  const map = new Map();
  for (const card of cards) {
    const coordinate = normalizeJapaneseCardCoordinateV1(card.printed_number);
    if (!card.jpn_set_key || !coordinate) continue;
    const key = `${card.jpn_set_key}|${coordinate}`;
    if (map.has(key)) throw new Error(`Duplicate Japanese Master Index coordinate ${key}.`);
    map.set(key, card);
  }
  return map;
}

function uniqueCoordinateMap(cards, field, label) {
  const map = new Map();
  for (const card of cards) {
    const coordinate = normalizeJapaneseCardCoordinateV1(card?.[field]);
    if (!coordinate) throw new Error(`${label} contains a card without a coordinate.`);
    if (map.has(coordinate)) throw new Error(`${label} repeats coordinate ${coordinate}.`);
    map.set(coordinate, card);
  }
  return map;
}

function sourceCount(row, authority, scope) {
  const evidence = (row.count_evidence ?? []).filter((item) =>
    item.authority === authority && item.scope === scope
  );
  return evidence.length === 1 ? Number(evidence[0].count) : null;
}

function ownerKeyForCode(code) {
  return `jpn-${clean(code).toLocaleLowerCase("und").replace(/[^a-z0-9]+/g, "-")}`;
}

function releaseIsEligible(releaseDate, asOf) {
  return /^\d{4}-\d{2}-\d{2}$/.test(clean(releaseDate)) && releaseDate <= asOf;
}

export function buildJapanesePokemonMasterIndexIncrementalV1({
  sourceSets,
  baseSets,
  baseCards,
  currentOverlay = null,
  asOf,
}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean(asOf))) throw new Error("Invalid asOf date.");
  const priorSets = currentOverlay?.sets ?? [];
  const priorCards = currentOverlay?.cards ?? [];
  const allSets = [...baseSets, ...priorSets];
  const allCards = [...baseCards, ...priorCards];
  const setsByCode = exactCodeSetMap(allSets);
  const cardsByCoordinate = cardCoordinateMap(allCards);
  const overlaySets = new Map(priorSets.map((row) => [row.jpn_set_key, row]));
  const overlayCards = new Map(priorCards.map((row) => [
    `${row.jpn_set_key}|${normalizeJapaneseCardCoordinateV1(row.printed_number)}`,
    row,
  ]));
  const decisions = [];

  for (const source of sourceSets.filter((row) => row.catalog_scope === "pokemon_ja")) {
    const code = clean(source.code).toLocaleUpperCase("und");
    const expected = Number(source.expected_card_count);
    const tcgdexCards = source.tcgdex_cards ?? [];
    const independentCards = source.independent_full_checklist_cards ?? [];
    const tcgdexCount = sourceCount(
      source,
      "tcgdex_japanese_structured_api",
      "full_set",
    );
    const independentCount = sourceCount(
      source,
      "bulbapedia_modern_japanese_set_list",
      "full_set",
    );
    const decision = {
      source_set_code: code || null,
      source_set_id: clean(source.source_set_id) || null,
      expected_card_count: Number.isSafeInteger(expected) ? expected : null,
      decision: "blocked",
      reasons: [],
      added_set_count: 0,
      added_card_count: 0,
    };
    if (!code) decision.reasons.push("missing_source_set_code");
    if (!releaseIsEligible(source.release_date, asOf)) {
      decision.reasons.push("future_or_invalid_release_date");
    }
    if (!Number.isSafeInteger(expected) || expected < 1) {
      decision.reasons.push("invalid_expected_card_count");
    }
    if (source.count_scope !== "full_set" || tcgdexCount !== expected ||
        independentCount !== expected) {
      decision.reasons.push("independent_full_set_counts_do_not_agree");
    }
    if (tcgdexCards.length !== expected || independentCards.length !== expected) {
      decision.reasons.push("independent_card_lists_do_not_close_set");
    }
    if (decision.reasons.length > 0) {
      decisions.push(decision);
      continue;
    }

    let tcgdexByCoordinate;
    let independentByCoordinate;
    try {
      tcgdexByCoordinate = uniqueCoordinateMap(
        tcgdexCards,
        "card_number_raw",
        `${code} TCGdex list`,
      );
      independentByCoordinate = uniqueCoordinateMap(
        independentCards,
        "card_number_raw",
        `${code} independent list`,
      );
    } catch (error) {
      decision.reasons.push(String(error.message ?? error));
      decisions.push(decision);
      continue;
    }
    if ([...tcgdexByCoordinate.keys()].some((key) => !independentByCoordinate.has(key)) ||
        [...independentByCoordinate.keys()].some((key) => !tcgdexByCoordinate.has(key))) {
      decision.reasons.push("independent_coordinate_sets_disagree");
      decisions.push(decision);
      continue;
    }
    const missingPrintedName = [...tcgdexByCoordinate.entries()].find(([, card]) =>
      !clean(card.printed_name_ja)
    );
    if (missingPrintedName) {
      decision.reasons.push(`missing_printed_name:${missingPrintedName[0]}`);
      decisions.push(decision);
      continue;
    }

    const owners = setsByCode.get(code) ?? [];
    if (owners.length > 1) {
      decision.reasons.push("master_index_set_owner_ambiguous");
      decisions.push(decision);
      continue;
    }
    let owner = owners[0] ?? null;
    if (owner) {
      const expectedValues = new Set(
        (owner.expected_card_count_evidence ?? []).map(Number).filter(Number.isSafeInteger),
      );
      if (expectedValues.size > 0 && !expectedValues.has(expected)) {
        decision.reasons.push("master_index_expected_count_conflict");
        decisions.push(decision);
        continue;
      }
    } else {
      const jpnSetKey = ownerKeyForCode(code);
      if (allSets.some((set) => set.jpn_set_key === jpnSetKey)) {
        decision.reasons.push("derived_master_index_owner_collision");
        decisions.push(decision);
        continue;
      }
      owner = {
        canonical_name_ja: clean(source.name) || code,
        collector_facing_name_en: null,
        completion_status: "incremental_source_agreed_identity",
        conflict_keys: [],
        conflict_status: "none",
        era_evidence: [],
        exclusion_reason: null,
        expected_card_count_evidence: [expected],
        independent_source_count: 3,
        jpn_set_key: jpnSetKey,
        master_admissible: true,
        official_code_evidence: [code],
        parent_relationships: [],
        registry_entry_kind: "japanese_card_release",
        release_date_evidence: [source.release_date],
        release_kind: "unknown",
        source_aliases: [...new Set([code, source.name, ...(source.aliases ?? [])]
          .map(clean).filter(Boolean))].sort(),
        source_ids: [
          "bulbapedia_jp_card_lists",
          "pokemon_card_official_jp_products",
          "tcgdex_ja_cards",
        ],
        source_scope_status: "admitted_incremental_set_assertion",
      };
      overlaySets.set(owner.jpn_set_key, owner);
      allSets.push(owner);
      setsByCode.set(code, [owner]);
      decision.added_set_count = 1;
    }

    for (const [coordinate, tcgdexCard] of tcgdexByCoordinate) {
      const key = `${owner.jpn_set_key}|${coordinate}`;
      if (cardsByCoordinate.has(key) || overlayCards.has(key)) continue;
      const independentCard = independentByCoordinate.get(coordinate);
      const printedName = clean(tcgdexCard.printed_name_ja);
      const row = {
        admission_status: "master_admissible",
        baseline_evidence_ids: [],
        candidate_kind: "incremental_missing_parent",
        card_domain: "pokemon",
        card_type: null,
        card_type_evidence: [],
        collector_facing_name_en: clean(independentCard.english_display_name) || null,
        conflict_status: "none",
        disposition_reasons: [],
        distribution_mark_evidence: [],
        edition_mark_evidence: [],
        evidence_status: "independent_coordinate_and_identity_supported",
        existing_card_print_id: null,
        existing_gv_id: null,
        family_key: null,
        family_reason: "family_resolution_deferred_to_canonical_writer",
        family_status: "unresolved",
        final_disposition: "master_admissible",
        governed_unnumbered_key: null,
        human_readable_source_present: true,
        identity_modifiers: [],
        image_urls: [tcgdexCard.image_url].filter(Boolean),
        independent_source_count: 2,
        independent_source_families: ["bulbapedia", "tcgdex"],
        jpn_card_identity_key: `incremental:${owner.jpn_set_key}:${coordinate}`,
        jpn_set_key: owner.jpn_set_key,
        language: "ja",
        market: "JP",
        official_source_present: false,
        printed_name_ja: printedName,
        printed_name_ja_candidates: [printedName],
        printed_number: clean(tcgdexCard.card_number_raw),
        rarity_evidence: [clean(independentCard.rarity)].filter(Boolean),
        regulation_mark_evidence: [],
        source_assertion_keys: [
          japaneseIncrementalFingerprint({
            source: "tcgdex_ja_cards",
            id: tcgdexCard.source_external_id,
            coordinate,
            printed_name: printedName,
          }),
          japaneseIncrementalFingerprint({
            source: "bulbapedia_jp_card_lists",
            id: independentCard.source_external_id,
            coordinate,
            english_name: independentCard.english_display_name,
          }),
        ],
        source_ids: ["bulbapedia_jp_card_lists", "tcgdex_ja_cards"],
      };
      overlayCards.set(key, row);
      cardsByCoordinate.set(key, row);
      decision.added_card_count += 1;
    }
    decision.decision = decision.added_set_count > 0 || decision.added_card_count > 0
      ? "admitted_incremental_delta"
      : "already_complete_in_master_index";
    decisions.push(decision);
  }

  const sets = [...overlaySets.values()].sort((left, right) =>
    left.jpn_set_key.localeCompare(right.jpn_set_key)
  );
  const cards = [...overlayCards.values()].sort((left, right) =>
    left.jpn_set_key.localeCompare(right.jpn_set_key) ||
    normalizeJapaneseCardCoordinateV1(left.printed_number).localeCompare(
      normalizeJapaneseCardCoordinateV1(right.printed_number),
      "en",
      { numeric: true },
    )
  );
  return {
    version: JAPANESE_POKEMON_MASTER_INDEX_INCREMENTAL_VERSION,
    policy: "independent_complete_lists_before_master_index_admission",
    canonical_writes: false,
    sets,
    cards,
    sets_fingerprint_sha256: japaneseIncrementalFingerprint(sets),
    cards_fingerprint_sha256: japaneseIncrementalFingerprint(cards),
    decisions,
  };
}

export function mergeJapaneseMasterIndexIncrementalOverlayV1({
  baseSets,
  baseCards,
  overlay,
}) {
  if (!overlay) return { sets: baseSets, cards: baseCards };
  if (overlay.version !== JAPANESE_POKEMON_MASTER_INDEX_INCREMENTAL_VERSION ||
      japaneseIncrementalFingerprint(overlay.sets) !== overlay.sets_fingerprint_sha256 ||
      japaneseIncrementalFingerprint(overlay.cards) !== overlay.cards_fingerprint_sha256) {
    throw new Error("Japanese incremental Master Index overlay fingerprint mismatch.");
  }
  const sets = new Map(baseSets.map((row) => [row.jpn_set_key, row]));
  for (const row of overlay.sets) {
    if (sets.has(row.jpn_set_key)) {
      throw new Error(`Japanese incremental set owner collision: ${row.jpn_set_key}.`);
    }
    sets.set(row.jpn_set_key, row);
  }
  const cards = new Map();
  for (const row of [...baseCards, ...overlay.cards]) {
    const key = `${row.jpn_set_key}|${normalizeJapaneseCardCoordinateV1(row.printed_number)}`;
    if (cards.has(key)) throw new Error(`Japanese incremental card collision: ${key}.`);
    cards.set(key, row);
  }
  return { sets: [...sets.values()], cards: [...cards.values()] };
}
