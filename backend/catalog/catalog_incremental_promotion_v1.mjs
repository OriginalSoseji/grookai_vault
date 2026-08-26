import {
  deterministicUuidV5,
  sha256,
  stableJson,
} from "../pricing/one_piece_canonical_import_staging_v1.mjs";

export const CATALOG_INCREMENTAL_PROMOTION_VERSION =
  "CATALOG_INCREMENTAL_PROMOTION_V1";
export const JAPANESE_INCREMENTAL_IDENTITY_VERSION = "pokemon_jpn:v1";

function clean(value) {
  return String(value ?? "").normalize("NFKC").trim();
}

function numericNumber(value) {
  const token = clean(value).split("/", 1)[0];
  if (!/^\d+$/.test(token)) return null;
  return String(Number(token));
}

function slug(value) {
  return clean(value).toLocaleLowerCase("und")
    .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
}

function uniqueByNumber(rows, getter) {
  const result = new Map();
  for (const row of rows ?? []) {
    const number = numericNumber(getter(row));
    if (!number) throw new Error("Source card is missing an exact numeric coordinate");
    if (result.has(number)) throw new Error(`Source repeats card number ${number}`);
    result.set(number, row);
  }
  return result;
}

function categoryFacts(detail) {
  const category = clean(detail?.category).toLocaleLowerCase("und");
  if (category === "pokemon") {
    return { card_domain: "pokemon", card_type: "pokemon" };
  }
  if (category === "trainer") {
    return {
      card_domain: "trainer",
      card_type: slug(detail?.trainerType) || "trainer",
    };
  }
  if (category === "energy") {
    return {
      card_domain: "energy",
      card_type: slug(detail?.energyType) || "energy",
    };
  }
  throw new Error(`Unsupported Japanese card category: ${detail?.category}`);
}

function familyFacts(detail, englishName, speciesByDex) {
  const { card_domain } = categoryFacts(detail);
  if (card_domain !== "pokemon") {
    return {
      family_key: `${card_domain}:${slug(englishName)}`,
      family_status: "resolved_non_species_identity",
      normalized_family_candidate: `${card_domain}:${slug(englishName)}`,
      species_id: null,
      display_name: clean(englishName),
    };
  }
  const dexIds = [...new Set((detail?.dexId ?? []).map(Number)
    .filter((value) => Number.isSafeInteger(value) && value > 0))];
  if (dexIds.length !== 1) {
    throw new Error(`Pokemon ${detail?.id} lacks one exact species coordinate`);
  }
  const species = speciesByDex.get(dexIds[0]);
  if (!species) throw new Error(`Pokemon ${detail?.id} has unresolved species ${dexIds[0]}`);
  return {
    family_key: `species:${species.id}`,
    family_status: "resolved_species",
    normalized_family_candidate: species.id,
    species_id: species.id,
    display_name: species.display_name,
  };
}

function evidenceRow({ cardPrintId, identityId, sourceKey, sourceExternalId,
  sourceUrl, subject, payload }) {
  const acquisitionKey = `${CATALOG_INCREMENTAL_PROMOTION_VERSION}|${sourceKey}|${sourceExternalId}`;
  const evidencePayload = { source_external_id: String(sourceExternalId), ...payload };
  return {
    id: deterministicUuidV5(
      `${CATALOG_INCREMENTAL_PROMOTION_VERSION}:evidence:${sourceKey}:${sourceExternalId}`,
    ),
    card_print_identity_id: identityId,
    card_print_id: cardPrintId,
    acquisition_key: acquisitionKey,
    source_key: sourceKey,
    evidence_key_hash: sha256(stableJson({
      acquisition_key: acquisitionKey,
      source_key: sourceKey,
      evidence_subject: subject,
      evidence_payload: evidencePayload,
    })),
    evidence_subject: subject,
    evidence_payload: { ...evidencePayload, source_url: sourceUrl },
    active: true,
  };
}

export function buildJapaneseOfficialEvidenceEnrichmentV1({
  cardPrint,
  identity,
  officialCard,
}) {
  if (!cardPrint?.id || !identity?.id || identity.card_print_id !== cardPrint.id) {
    throw new Error("Official evidence enrichment lacks one exact canonical identity");
  }
  const subject = {
    identity_domain: identity.identity_domain,
    language_scope: "ja",
    set_code_identity: identity.set_code_identity,
    printed_number: identity.printed_number,
    printed_name_ja: officialCard.printed_name,
    collector_facing_name_en: cardPrint.name,
  };
  return evidenceRow({
    cardPrintId: cardPrint.id,
    identityId: identity.id,
    sourceKey: "official_jp_cards",
    sourceExternalId: officialCard.card_id,
    sourceUrl: officialCard.source_url,
    subject,
    payload: { card: officialCard },
  });
}

export function buildJapaneseIncrementalSetPlanV1({
  set,
  tcgdexSet,
  tcgdexDetails,
  bulbapediaCards,
  officialDetails = [],
  limitlessCards = [],
  existingNumbers = [],
  speciesRows = [],
}) {
  const total = Number(tcgdexSet?.cardCount?.total);
  const denominator = Number(tcgdexSet?.cardCount?.official);
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(denominator) ||
      total < denominator || tcgdexSet.cards?.length !== total) {
    throw new Error("TCGdex full-set count contract failed");
  }
  if ((bulbapediaCards ?? []).length !== total) {
    throw new Error("Independent full-set checklist count does not match TCGdex");
  }
  const tcgdexByNumber = uniqueByNumber(tcgdexSet.cards, (row) => row.localId);
  const detailByNumber = uniqueByNumber(tcgdexDetails, (row) => row.localId);
  const bulbapediaByNumber = uniqueByNumber(
    bulbapediaCards,
    (row) => row.card_number_raw,
  );
  const officialByNumber = uniqueByNumber(
    officialDetails,
    (row) => row.card_number_raw,
  );
  const limitlessByNumber = uniqueByNumber(
    limitlessCards,
    (row) => row.card_number_raw,
  );
  const speciesByDex = new Map(speciesRows.map((row) =>
    [Number(row.national_dex_number), row]));
  const existing = new Set(existingNumbers.map(numericNumber).filter(Boolean));
  const rows = [];
  for (let numberValue = 1; numberValue <= total; numberValue += 1) {
    const number = String(numberValue);
    const brief = tcgdexByNumber.get(number);
    const bulba = bulbapediaByNumber.get(number);
    if (!brief || !bulba) throw new Error(`Full-set coordinate ${number} is missing`);
    if (existing.has(number)) continue;
    const detail = detailByNumber.get(number);
    if (!detail || clean(detail.id) !== clean(brief.id)) {
      throw new Error(`TCGdex detail missing for ${brief.id}`);
    }
    const facts = categoryFacts(detail);
    const family = familyFacts(detail, bulba.english_display_name, speciesByDex);
    const cardPrintId = deterministicUuidV5(
      `${CATALOG_INCREMENTAL_PROMOTION_VERSION}:pokemon-jpn:${set.code}:${number}`,
    );
    const identityId = deterministicUuidV5(
      `${CATALOG_INCREMENTAL_PROMOTION_VERSION}:pokemon-jpn-identity:${set.code}:${number}`,
    );
    const official = officialByNumber.get(number) ?? null;
    const limitless = limitlessByNumber.get(number) ?? null;
    const imageCandidateUrls = [...new Set([
      official?.image_url,
      limitless?.image_url,
    ].map(clean).filter(Boolean))];
    const identityPayload = {
      edition_marking: [],
      language_code: "ja",
      rarity_policy: "source_evidence_preserved",
      release_context: {
        registry_key: set.code,
        set_code_identity: set.code,
      },
      variant_key_current: "base",
      card_domain: facts.card_domain,
      card_type: facts.card_type,
      collector_facing_name_source: "independent_bilingual_number_binding",
      family_key: family.family_key,
      printed_identity_modifier: null,
    };
    const subject = {
      identity_domain: "pokemon_jpn",
      language_scope: "ja",
      set_code_identity: set.code,
      printed_number: number,
      printed_name_ja: detail.name,
      collector_facing_name_en: family.display_name,
      family_key: family.family_key,
      species_id: family.species_id,
    };
    const evidence = [
      evidenceRow({
        cardPrintId,
        identityId,
        sourceKey: "tcgdex_ja_cards",
        sourceExternalId: detail.id,
        sourceUrl: `https://api.tcgdex.net/v2/ja/cards/${encodeURIComponent(detail.id)}`,
        subject,
        payload: { card: detail },
      }),
      evidenceRow({
        cardPrintId,
        identityId,
        sourceKey: "bulbapedia_jp_card_lists",
        sourceExternalId: bulba.source_external_id,
        sourceUrl: bulba.source_url,
        subject,
        payload: { card: bulba },
      }),
    ];
    if (official) {
      evidence.push(evidenceRow({
        cardPrintId,
        identityId,
        sourceKey: "official_jp_cards",
        sourceExternalId: official.card_id,
        sourceUrl: official.source_url,
        subject,
        payload: { card: official },
      }));
    }
    const reviewSubject = {
      ...subject,
      confidence: family.species_id ? 0.99 : 0.95,
      relationship_type: family.species_id
        ? "language_agnostic_species"
        : "language_agnostic_non_species_identity",
    };
    const reviewKeyHash = sha256(stableJson(reviewSubject));
    rows.push({
      number,
      card_print: {
        id: cardPrintId,
        set_id: set.id,
        name: family.display_name,
        number,
        number_plain: number,
        variant_key: "",
        rarity: clean(detail.rarity) || null,
        artist: clean(detail.illustrator) || null,
        image_url: null,
        image_alt_url: null,
        image_source: null,
        image_status: "missing",
        image_note: imageCandidateUrls.length > 0
          ? "Exact external image candidate is evidence-only until self-hosting promotion."
          : "No source image was admitted by the incremental identity gate.",
        external_ids: {
          catalog_incremental_promotion_v1: {
            tcgdex_id: detail.id,
            official_jp_card_id: official?.card_id ?? null,
            source_urls: evidence.map((row) => row.evidence_payload.source_url),
            image_candidate_urls: imageCandidateUrls,
          },
        },
        variants: {},
        print_identity_key: null,
        ai_metadata: null,
        data_quality_flags: {
          catalog_incremental_promotion_v1: {
            family_status: family.family_status,
            source_count: evidence.length,
            public_child_status: "deferred_visibility_and_storage_gate",
          },
        },
        image_res: null,
        gv_id: `GV-PK-JPN-${clean(set.code).replace(/^jpn-/i, "").toUpperCase()}-${number}`,
        set_code: set.code,
        printed_set_abbrev: tcgdexSet.id,
        printed_total: denominator,
        regulation_mark: clean(detail.regulationMark) || null,
        identity_domain: "pokemon_jpn",
        printed_identity_modifier: null,
        set_identity_model: "standard",
        representative_image_url: null,
      },
      identity: {
        id: identityId,
        card_print_id: cardPrintId,
        identity_domain: "pokemon_jpn",
        set_code_identity: set.code,
        printed_number: number,
        normalized_printed_name: family.display_name,
        source_name_raw: detail.name,
        identity_payload: identityPayload,
        identity_key_version: JAPANESE_INCREMENTAL_IDENTITY_VERSION,
        identity_key_hash: null,
        is_active: true,
      },
      identity_hash_input: {
        identity_domain: "pokemon_jpn",
        identity_key_version: JAPANESE_INCREMENTAL_IDENTITY_VERSION,
        set_code_identity: set.code,
        printed_number: number,
        normalized_printed_name: family.display_name,
        source_name_raw: detail.name,
        identity_payload: identityPayload,
      },
      evidence,
      family_review: {
        id: deterministicUuidV5(
          `${CATALOG_INCREMENTAL_PROMOTION_VERSION}:family-review:${set.code}:${number}`,
        ),
        card_print_identity_id: identityId,
        card_print_id: cardPrintId,
        acquisition_key: `${CATALOG_INCREMENTAL_PROMOTION_VERSION}|${set.code}|${number}`,
        family_status: family.family_status,
        family_candidate_source: "catalog_incremental_promotion_v1",
        normalized_family_candidate: family.normalized_family_candidate,
        review_status: "pending",
        family_link_promotion_allowed: false,
        review_key_hash: reviewKeyHash,
        evidence_subject: reviewSubject,
        active: true,
      },
    });
  }
  const payload = {
    set: { id: set.id, code: set.code, name: set.name },
    source_counts: {
      tcgdex_full_set: total,
      bulbapedia_full_set: bulbapediaCards.length,
      official_product_linked: officialDetails.length,
      limitless_base_set: limitlessCards.length,
      existing_canonical: existing.size,
    },
    rows,
  };
  return {
    version: CATALOG_INCREMENTAL_PROMOTION_VERSION,
    target: `pokemon:${tcgdexSet.id}`,
    counts: {
      card_prints: rows.length,
      identities: rows.length,
      evidence: rows.reduce((sum, row) => sum + row.evidence.length, 0),
      family_reviews: rows.length,
    },
    payload_fingerprint_sha256: sha256(stableJson(payload)),
    payload,
  };
}

export function validateJapaneseIncrementalSetPlanV1(plan) {
  const findings = [];
  const rows = plan?.payload?.rows ?? [];
  if (plan?.version !== CATALOG_INCREMENTAL_PROMOTION_VERSION) findings.push("version_mismatch");
  if (new Set(rows.map((row) => row.number)).size !== rows.length) findings.push("duplicate_number");
  if (new Set(rows.map((row) => row.card_print.id)).size !== rows.length) findings.push("duplicate_card_id");
  if (new Set(rows.map((row) => row.card_print.gv_id)).size !== rows.length) findings.push("duplicate_gv_id");
  for (const row of rows) {
    if (row.card_print.set_id !== plan.payload.set.id) findings.push(`set_id_mismatch:${row.number}`);
    if (row.identity.card_print_id !== row.card_print.id) findings.push(`identity_fk:${row.number}`);
    if ((row.evidence ?? []).length < 2) findings.push(`insufficient_sources:${row.number}`);
    if ((row.evidence ?? []).some((evidence) =>
      evidence.card_print_id !== row.card_print.id ||
      evidence.card_print_identity_id !== row.identity.id)) {
      findings.push(`evidence_fk:${row.number}`);
    }
  }
  const { payload_fingerprint_sha256: ignored, ...withoutFingerprint } = plan ?? {};
  void ignored;
  if (plan?.payload_fingerprint_sha256 !== sha256(stableJson(plan?.payload))) {
    findings.push("payload_fingerprint_mismatch");
  }
  void withoutFingerprint;
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
