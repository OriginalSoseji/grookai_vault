import {
  deterministicUuidV5,
  sha256,
  stableJson,
} from "../pricing/one_piece_canonical_import_staging_v1.mjs";
import { buildCardPrintGvIdV1 } from "../warehouse/buildCardPrintGvIdV1.mjs";

export const ENGLISH_POKEMON_INCREMENTAL_PROMOTION_VERSION =
  "ENGLISH_POKEMON_INCREMENTAL_PROMOTION_V1";
export const ENGLISH_POKEMON_IDENTITY_VERSION = "pokemon_eng_standard:v1";

function clean(value) {
  return String(value ?? "").normalize("NFKC").trim();
}

export function normalizeEnglishPokemonCardNumberV1(value) {
  const token = clean(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
  if (!token) return "";
  return /^\d+$/.test(token) ? String(Number(token)) : token;
}

export function normalizeEnglishPokemonCardNameV1(value) {
  return clean(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, " ").trim();
}

function slug(value) {
  return normalizeEnglishPokemonCardNameV1(value).replace(/\s+/g, "-");
}

function coordinate(number, name) {
  return `${normalizeEnglishPokemonCardNumberV1(number)}|${normalizeEnglishPokemonCardNameV1(name)}`;
}

function sourcePairs(card) {
  if (Array.isArray(card?.source_evidence) && card.source_evidence.length > 0) {
    if (card.source_evidence.length < 2 || Number(card?.source_count) < 2) {
      throw new Error(`Master Index card ${card?.set_key}:${card?.card_number} lacks two sources`);
    }
    return card.source_evidence.map((source) => ({
      source_key: clean(source?.source_key),
      source_url: clean(source?.source_url) || null,
      source_authority: clean(source?.source_authority) || null,
      source_kind: clean(source?.source_kind) || null,
    }));
  }
  const sources = card?.sources ?? [];
  const urls = card?.evidence_urls ?? [];
  if (sources.length < 2 || urls.length < 2 || Number(card?.source_count) < 2) {
    throw new Error(`Master Index card ${card?.set_key}:${card?.card_number} lacks two sources`);
  }
  return sources.map((sourceKey, index) => ({
    source_key: clean(sourceKey),
    source_url: clean(urls[index] ?? urls.find((url) => clean(url))) || null,
    source_authority: clean(card?.source_authorities?.[index]) || null,
    source_kind: clean(card?.source_kinds?.[index]) || null,
  }));
}

function evidenceRow({ cardPrintId, identityId, setCode, card, source }) {
  const sourceExternalId = `${setCode}:${normalizeEnglishPokemonCardNumberV1(card.card_number)}`;
  const acquisitionKey = [
    ENGLISH_POKEMON_INCREMENTAL_PROMOTION_VERSION,
    source.source_key,
    sourceExternalId,
  ].join("|");
  const subject = {
    identity_domain: "pokemon_eng_standard",
    language_scope: "en",
    set_code_identity: setCode,
    printed_number: clean(card.card_number),
    printed_name: clean(card.card_name),
  };
  const payload = {
    source_external_id: sourceExternalId,
    source_url: source.source_url,
    source_authority: source.source_authority,
    source_kind: source.source_kind,
    master_index_status: card.status,
    master_index_fact_key: card.key,
    master_index_source_count: card.source_count,
  };
  return {
    id: deterministicUuidV5(
      `${ENGLISH_POKEMON_INCREMENTAL_PROMOTION_VERSION}:evidence:${source.source_key}:${sourceExternalId}`,
    ),
    card_print_identity_id: identityId,
    card_print_id: cardPrintId,
    acquisition_key: acquisitionKey,
    source_key: source.source_key,
    evidence_key_hash: sha256(stableJson({
      acquisition_key: acquisitionKey,
      source_key: source.source_key,
      evidence_subject: subject,
      evidence_payload: payload,
    })),
    evidence_subject: subject,
    evidence_payload: payload,
    active: true,
  };
}

function speciesNameCandidates(name) {
  const value = clean(name);
  return [...new Set([
    value,
    value.replace(/^(?:Dark|Light)\s+/i, ""),
    value.replace(/^[^']+'s\s+/i, ""),
  ].map(normalizeEnglishPokemonCardNameV1).filter(Boolean))];
}

function resolveFamily(card, detail, speciesRows) {
  const speciesByDex = new Map((speciesRows ?? []).map((row) =>
    [Number(row.national_dex_number), row]));
  const speciesByName = new Map();
  for (const row of speciesRows ?? []) {
    const key = normalizeEnglishPokemonCardNameV1(row.display_name);
    const values = speciesByName.get(key) ?? [];
    values.push(row);
    speciesByName.set(key, values);
  }
  const category = clean(detail?.category).toLocaleLowerCase("en");
  if (category === "trainer" || category === "energy") {
    return {
      card_domain: category,
      card_type: category === "trainer"
        ? slug(detail?.trainerType) || "trainer"
        : slug(detail?.energyType) || "energy",
      family_key: `${category}:${slug(card.card_name)}`,
      family_status: "resolved_non_species_identity",
      normalized_family_candidate: `${category}:${slug(card.card_name)}`,
      species_id: null,
    };
  }
  const normalizedName = normalizeEnglishPokemonCardNameV1(card.card_name);
  if (/^(?:grass|fire|water|lightning|psychic|fighting|darkness|metal|fairy) energy$/.test(
    normalizedName,
  )) {
    return {
      card_domain: "energy",
      card_type: normalizedName.replace(/\s+energy$/, ""),
      family_key: `energy:${slug(card.card_name)}`,
      family_status: "resolved_non_species_identity",
      normalized_family_candidate: `energy:${slug(card.card_name)}`,
      species_id: null,
    };
  }
  const dexIds = [...new Set((detail?.dexId ?? []).map(Number)
    .filter((value) => Number.isSafeInteger(value) && value > 0))];
  let matches = dexIds.length === 1 && speciesByDex.has(dexIds[0])
    ? [speciesByDex.get(dexIds[0])]
    : [];
  if (matches.length === 0) {
    matches = speciesNameCandidates(card.card_name)
      .flatMap((candidate) => speciesByName.get(candidate) ?? []);
  }
  matches = [...new Map(matches.map((row) => [row.id, row])).values()];
  if (matches.length !== 1) {
    throw new Error(
      `English card ${card.set_key}:${card.card_number} lacks one exact species resolution`,
    );
  }
  const species = matches[0];
  return {
    card_domain: "pokemon",
    card_type: "pokemon",
    family_key: `species:${species.id}`,
    family_status: "resolved_species",
    normalized_family_candidate: species.id,
    species_id: species.id,
  };
}

export function deriveEnglishPokemonCanonicalAliasOverlayV1({
  databaseSets = [],
  databaseCards = [],
  masterCards = [],
  masterSetRemaps = [],
}) {
  const masterBySet = new Map();
  for (const card of masterCards.filter((row) => row.status === "master_verified")) {
    const rows = masterBySet.get(card.set_key) ?? [];
    rows.push(card);
    masterBySet.set(card.set_key, rows);
  }
  const databaseBySetAndCoordinate = new Map();
  for (const card of databaseCards) {
    const setCode = clean(card.set_code).toLocaleLowerCase("en");
    const key = `${setCode}|${coordinate(card.number ?? card.number_plain, card.name)}`;
    databaseBySetAndCoordinate.set(key, true);
  }
  const setCodes = [...new Set(databaseSets.map((row) =>
    clean(row.code).toLocaleLowerCase("en")))];
  const resolutions = [];
  const explicitSources = new Set();
  for (const remap of masterSetRemaps) {
    const sourceCode = clean(
      remap.source_set_key ?? remap.from_set_key,
    ).toLocaleLowerCase("en");
    const canonicalCode = clean(
      remap.canonical_set_key ?? remap.to_set_key,
    ).toLocaleLowerCase("en");
    if (!sourceCode || !canonicalCode || sourceCode === canonicalCode) continue;
    const owners = databaseSets.filter((row) =>
      clean(row.code).toLocaleLowerCase("en") === canonicalCode);
    if (owners.length !== 1) continue;
    const aliasSet = databaseSets.find((row) =>
      clean(row.code).toLocaleLowerCase("en") === sourceCode);
    if (aliasSet && Number(aliasSet.card_count ?? 0) !== 0) continue;
    resolutions.push({
      source_code: sourceCode,
      canonical_code: canonicalCode,
      evidence_card_count: null,
      evidence_row_count: Number(remap.evidence_rows ?? 0) || null,
      authority: clean(remap.authority) ||
        "ENGLISH_MASTER_INDEX_SET_ALIAS_NORMALIZATION_V1",
    });
    explicitSources.add(sourceCode);
  }
  for (const [sourceCodeRaw, cards] of masterBySet) {
    const sourceCode = clean(sourceCodeRaw).toLocaleLowerCase("en");
    if (cards.length === 0 || explicitSources.has(sourceCode)) continue;
    const owners = setCodes.filter((setCode) => cards.every((card) =>
      databaseBySetAndCoordinate.has(`${setCode}|${coordinate(card.card_number, card.card_name)}`)));
    if (owners.length !== 1 || owners[0] === sourceCode) continue;
    const aliasSet = databaseSets.find((row) =>
      clean(row.code).toLocaleLowerCase("en") === sourceCode);
    if (aliasSet && Number(aliasSet.card_count ?? 0) !== 0) continue;
    resolutions.push({
      source_code: sourceCodeRaw,
      canonical_code: owners[0],
      evidence_card_count: cards.length,
      authority: "ENGLISH_MASTER_INDEX_COMPLETION_V1",
    });
  }
  resolutions.sort((left, right) =>
    left.source_code.localeCompare(right.source_code) ||
    left.canonical_code.localeCompare(right.canonical_code));
  const resolutionBySource = new Map(resolutions.map((row) =>
    [clean(row.source_code).toLocaleLowerCase("en"), row]));
  const sets = databaseSets.filter((row) => !resolutionBySource.has(
    clean(row.code).toLocaleLowerCase("en"),
  )).map((row) => {
    const aliases = resolutions.filter((resolution) =>
      resolution.canonical_code === clean(row.code).toLocaleLowerCase("en"))
      .map((resolution) => resolution.source_code);
    return aliases.length > 0
      ? { ...row, code_aliases: [...new Set([...(row.code_aliases ?? []), ...aliases])] }
      : row;
  });
  return { sets, resolutions };
}

export function buildEnglishPokemonIncrementalSetPlanV1({
  set,
  sourceSet,
  masterCards = [],
  existingCards = [],
  speciesRows = [],
  tcgdexDetails = [],
}) {
  const expected = Number(sourceSet?.cardCount?.total);
  if (!Number.isSafeInteger(expected) || expected < 1) {
    throw new Error("TCGdex English full-set count contract failed");
  }
  const eligible = masterCards.filter((row) => row.set_key === sourceSet.id);
  if (eligible.length !== expected || eligible.some((row) => row.status !== "master_verified")) {
    throw new Error(
      `Master Index full-set admission failed: ${eligible.length}/${expected}`,
    );
  }
  const masterCoordinates = new Set();
  for (const card of eligible) {
    const key = coordinate(card.card_number, card.card_name);
    if (!key.startsWith("|") && masterCoordinates.has(key)) {
      throw new Error(`Master Index repeats coordinate ${card.card_number}`);
    }
    if (!normalizeEnglishPokemonCardNumberV1(card.card_number) ||
        !normalizeEnglishPokemonCardNameV1(card.card_name)) {
      throw new Error("Master Index card lacks an exact coordinate");
    }
    masterCoordinates.add(key);
    sourcePairs(card);
  }
  const existingByNumber = new Map();
  for (const card of existingCards) {
    const number = normalizeEnglishPokemonCardNumberV1(card.number ?? card.number_plain);
    const existingCoordinate = coordinate(card.number ?? card.number_plain, card.name);
    if (!masterCoordinates.has(existingCoordinate)) {
      throw new Error(
        `Canonical set contains coordinate absent from admitted Master Index: ${card.number ?? card.number_plain}`,
      );
    }
    const rows = existingByNumber.get(number) ?? [];
    rows.push(card);
    existingByNumber.set(number, rows);
  }
  const detailsByCoordinate = new Map((tcgdexDetails ?? []).map((detail) => [
    coordinate(detail.localId, detail.name),
    detail,
  ]));
  const rows = [];
  for (const card of eligible) {
    const numberKey = normalizeEnglishPokemonCardNumberV1(card.card_number);
    const existing = existingByNumber.get(numberKey) ?? [];
    if (existing.length > 0) {
      if (existing.length !== 1 ||
          normalizeEnglishPokemonCardNameV1(existing[0].name) !==
            normalizeEnglishPokemonCardNameV1(card.card_name)) {
        throw new Error(`Canonical coordinate collision at ${card.card_number}`);
      }
      continue;
    }
    const detail = detailsByCoordinate.get(coordinate(card.card_number, card.card_name)) ?? null;
    const family = resolveFamily(card, detail, speciesRows);
    const number = clean(card.card_number);
    const cardPrintId = deterministicUuidV5(
      `${ENGLISH_POKEMON_INCREMENTAL_PROMOTION_VERSION}:card:${set.code}:${number}:${card.card_name}`,
    );
    const identityId = deterministicUuidV5(
      `${ENGLISH_POKEMON_INCREMENTAL_PROMOTION_VERSION}:identity:${set.code}:${number}:${card.card_name}`,
    );
    const identityPayload = {
      language_code: "en",
      variant_key_current: "base",
      release_context: {
        registry_key: sourceSet.id,
        set_code_identity: set.code,
      },
      card_domain: family.card_domain,
      card_type: family.card_type,
      family_key: family.family_key,
      printed_identity_modifier: null,
      master_index_status: "master_verified",
    };
    const evidence = sourcePairs(card).map((source) => evidenceRow({
      cardPrintId,
      identityId,
      setCode: set.code,
      card,
      source,
    }));
    const rarityValues = (card.rarity_values ?? []).map(clean)
      .filter((value) => value && value !== "None" && value !== "—");
    const reviewSubject = {
      identity_domain: "pokemon_eng_standard",
      language_scope: "en",
      set_code_identity: set.code,
      printed_number: number,
      printed_name: clean(card.card_name),
      family_key: family.family_key,
      species_id: family.species_id,
      confidence: 0.99,
    };
    const gvId = buildCardPrintGvIdV1({
      setCode: set.code,
      printedSetAbbrev: set.printed_set_abbrev ?? set.code,
      number,
      numberPlain: number,
      variantKey: "base",
    });
    const imageCandidateUrls = clean(detail?.image)
      ? [`${clean(detail.image).replace(/\/$/, "")}/high.webp`]
      : [];
    rows.push({
      number,
      card_print: {
        id: cardPrintId,
        set_id: set.id,
        name: clean(card.card_name),
        number,
        number_plain: number,
        variant_key: "",
        rarity: clean(detail?.rarity) || rarityValues[0] || null,
        artist: clean(detail?.illustrator) || null,
        image_url: null,
        image_alt_url: null,
        image_source: null,
        image_status: "missing",
        image_note: "No external image is admitted by the English identity promotion gate.",
        external_ids: {
          english_pokemon_incremental_promotion_v1: {
            master_index_fact_key: card.key,
            source_set_id: sourceSet.id,
            source_urls: evidence.map((row) => row.evidence_payload.source_url),
            image_candidate_urls: imageCandidateUrls,
          },
        },
        variants: {},
        print_identity_key: null,
        ai_metadata: null,
        data_quality_flags: {
          english_pokemon_incremental_promotion_v1: {
            source_count: evidence.length,
            family_status: family.family_status,
            public_child_status: "deferred_visibility_and_storage_gate",
          },
        },
        image_res: null,
        gv_id: gvId,
        set_code: set.code,
        printed_set_abbrev: set.printed_set_abbrev ?? set.code.toUpperCase(),
        printed_total: expected,
        regulation_mark: clean(detail?.regulationMark) || null,
        identity_domain: "pokemon_eng_standard",
        printed_identity_modifier: null,
        set_identity_model: "standard",
        representative_image_url: null,
      },
      identity: {
        id: identityId,
        card_print_id: cardPrintId,
        identity_domain: "pokemon_eng_standard",
        set_code_identity: set.code,
        printed_number: number,
        normalized_printed_name: clean(card.card_name),
        source_name_raw: clean(card.card_name),
        identity_payload: identityPayload,
        identity_key_version: ENGLISH_POKEMON_IDENTITY_VERSION,
        identity_key_hash: null,
        is_active: true,
      },
      identity_hash_input: {
        identity_domain: "pokemon_eng_standard",
        identity_key_version: ENGLISH_POKEMON_IDENTITY_VERSION,
        set_code_identity: set.code,
        printed_number: number,
        normalized_printed_name: clean(card.card_name),
        source_name_raw: clean(card.card_name),
        identity_payload: identityPayload,
      },
      evidence,
      family_review: {
        id: deterministicUuidV5(
          `${ENGLISH_POKEMON_INCREMENTAL_PROMOTION_VERSION}:family:${set.code}:${number}:${card.card_name}`,
        ),
        card_print_identity_id: identityId,
        card_print_id: cardPrintId,
        acquisition_key: `${ENGLISH_POKEMON_INCREMENTAL_PROMOTION_VERSION}|${set.code}|${number}`,
        family_status: family.family_status,
        family_candidate_source: "english_pokemon_incremental_promotion_v1",
        normalized_family_candidate: family.normalized_family_candidate,
        review_status: "pending",
        family_link_promotion_allowed: false,
        review_key_hash: sha256(stableJson(reviewSubject)),
        evidence_subject: reviewSubject,
        active: true,
      },
    });
  }
  if (existingCards.length + rows.length !== expected) {
    throw new Error(
      `Resulting canonical count does not equal admitted set count: ${existingCards.length + rows.length}/${expected}`,
    );
  }
  const payload = {
    set: { id: set.id, code: set.code, name: set.name },
    source_set: { id: sourceSet.id, name: sourceSet.name, expected_card_count: expected },
    source_counts: {
      tcgdex_full_set: expected,
      master_index_verified: eligible.length,
      existing_canonical: existingCards.length,
    },
    rows,
    image_candidates: rows.flatMap((row) =>
      row.card_print.external_ids.english_pokemon_incremental_promotion_v1
        .image_candidate_urls.map((sourceUrl) => ({
          card_print_id: row.card_print.id,
          gv_id: row.card_print.gv_id,
          source_url: sourceUrl,
          destination_status: "self_hosting_pending",
        }))),
  };
  return {
    version: ENGLISH_POKEMON_INCREMENTAL_PROMOTION_VERSION,
    target: `pokemon_en:${sourceSet.id}`,
    counts: {
      card_prints: rows.length,
      identities: rows.length,
      evidence: rows.reduce((sum, row) => sum + row.evidence.length, 0),
      family_reviews: rows.length,
      image_candidates: payload.image_candidates.length,
    },
    payload_fingerprint_sha256: sha256(stableJson(payload)),
    payload,
  };
}

export function validateEnglishPokemonIncrementalSetPlanV1(plan) {
  const findings = [];
  const rows = plan?.payload?.rows ?? [];
  if (plan?.version !== ENGLISH_POKEMON_INCREMENTAL_PROMOTION_VERSION) {
    findings.push("version_mismatch");
  }
  for (const key of ["number", "card_print.id", "card_print.gv_id", "identity.id"]) {
    const values = rows.map((row) => key.split(".").reduce((value, part) => value?.[part], row));
    if (new Set(values).size !== values.length) findings.push(`duplicate:${key}`);
  }
  for (const row of rows) {
    if (row.card_print.set_id !== plan.payload.set.id) findings.push(`set_fk:${row.number}`);
    if (row.identity.card_print_id !== row.card_print.id) findings.push(`identity_fk:${row.number}`);
    if (row.family_review.card_print_id !== row.card_print.id ||
        row.family_review.card_print_identity_id !== row.identity.id) {
      findings.push(`family_fk:${row.number}`);
    }
    const authorities = new Set((row.evidence ?? []).map((evidence) =>
      evidence.evidence_payload.source_authority || evidence.source_key));
    if ((row.evidence ?? []).length < 2 || authorities.size < 2) {
      findings.push(`insufficient_independent_sources:${row.number}`);
    }
    if ((row.evidence ?? []).some((evidence) =>
      evidence.card_print_id !== row.card_print.id ||
      evidence.card_print_identity_id !== row.identity.id)) {
      findings.push(`evidence_fk:${row.number}`);
    }
    if (row.card_print.image_url || row.card_print.representative_image_url ||
        row.card_print.image_source) {
      findings.push(`image_boundary:${row.number}`);
    }
  }
  if (plan?.payload_fingerprint_sha256 !== sha256(stableJson(plan?.payload))) {
    findings.push("payload_fingerprint_mismatch");
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
