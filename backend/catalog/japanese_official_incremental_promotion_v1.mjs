import {
  deterministicUuidV5,
} from "../pricing/one_piece_canonical_import_staging_v1.mjs";
import {
  sha256,
  stableJson,
} from "./universal_catalog_discovery_v1.mjs";

export const JAPANESE_OFFICIAL_INCREMENTAL_PROMOTION_VERSION =
  "JAPANESE_OFFICIAL_INCREMENTAL_PROMOTION_V1";
export const JAPANESE_OFFICIAL_IDENTITY_VERSION = "pokemon_jpn:official_v1";

function clean(value) {
  return String(value ?? "").normalize("NFKC").trim();
}

function numericNumber(value) {
  const token = clean(value).split("/", 1)[0];
  return /^\d+$/.test(token) ? String(Number(token)) : null;
}

function slug(value) {
  return clean(value).toLocaleLowerCase("und")
    .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
}

function compactSetCode(value) {
  return clean(value).toLocaleLowerCase("und").replace(/^jpn[-_]?/, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function isCompatibleJapanesePrintedSetCodeV1({
  existingPrintedSetCode,
  sourcePrintedSetCode,
  canonicalSetCode,
}) {
  const existing = compactSetCode(existingPrintedSetCode);
  if (!existing) return true;
  return existing === compactSetCode(sourcePrintedSetCode) ||
    existing === compactSetCode(canonicalSetCode);
}

function uniqueByNumber(rows, getter, label) {
  const result = new Map();
  for (const row of rows ?? []) {
    const number = numericNumber(getter(row));
    if (!number) throw new Error(`${label} card lacks an exact numeric coordinate`);
    if (result.has(number)) throw new Error(`${label} repeats card number ${number}`);
    result.set(number, row);
  }
  return result;
}

function cardFacts(card) {
  const category = clean(card?.category);
  const name = clean(card?.printed_name);
  if (Number(card?.hp) > 0) {
    return {
      card_domain: "pokemon",
      card_type: "pokemon",
      family_status: "unresolved_japanese_species",
      family_candidate: `printed-name-ja:${slug(name)}`,
    };
  }
  if (/エネルギー/.test(`${category} ${name}`)) {
    return {
      card_domain: "energy",
      card_type: "energy",
      family_status: "resolved_non_species_identity",
      family_candidate: `energy:${slug(name)}`,
    };
  }
  return {
    card_domain: "trainer",
    card_type: "trainer",
    family_status: "resolved_non_species_identity",
    family_candidate: `trainer:${slug(name)}`,
  };
}

function evidenceRow({ cardPrintId, identityId, sourceKey, sourceExternalId,
  sourceUrl, subject, payload }) {
  const acquisitionKey =
    `${JAPANESE_OFFICIAL_INCREMENTAL_PROMOTION_VERSION}|${sourceKey}|${sourceExternalId}`;
  const evidencePayload = {
    source_external_id: String(sourceExternalId),
    source_url: sourceUrl,
    ...payload,
  };
  return {
    id: deterministicUuidV5(
      `${JAPANESE_OFFICIAL_INCREMENTAL_PROMOTION_VERSION}:evidence:` +
      `${sourceKey}:${sourceExternalId}`,
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
    evidence_payload: evidencePayload,
    active: true,
  };
}

export function buildJapaneseOfficialIncrementalSetPlanV1({
  set,
  sourceSet,
  officialCards = [],
  existingCards = [],
}) {
  if (!set?.id || !set?.code || !sourceSet?.code) {
    throw new Error("Japanese official promotion requires one exact canonical set");
  }
  const printedSetCode = clean(sourceSet.code).toUpperCase();
  const expected = Number(sourceSet.expected_card_count);
  const checklist = sourceSet.numbered_base_cards ?? [];
  if (sourceSet.count_scope !== "numbered_base_set" ||
      !Number.isSafeInteger(expected) || expected < 1 || checklist.length !== expected) {
    throw new Error("Japanese numbered-base checklist contract failed");
  }
  const checklistByNumber = uniqueByNumber(
    checklist,
    (row) => row.card_number_raw,
    "Limitless checklist",
  );
  const expectedCoordinates = [...checklistByNumber.keys()]
    .sort((left, right) => Number(left) - Number(right));
  const existingByNumber = uniqueByNumber(
    existingCards,
    (row) => row.number_plain ?? row.number,
    "Canonical set",
  );
  const officialByNumber = uniqueByNumber(
    officialCards,
    (row) => row.card_number_raw ?? row.card_number_numerator,
    "Official source",
  );
  const missingCoordinates = expectedCoordinates.filter((number) =>
    !existingByNumber.has(number));
  const officialCoordinates = [...officialByNumber.keys()]
    .sort((left, right) => Number(left) - Number(right));
  if (stableJson(missingCoordinates) !== stableJson(officialCoordinates)) {
    throw new Error(
      `Official missing-card closure failed: expected ${missingCoordinates.join(",")}; ` +
      `received ${officialCoordinates.join(",")}`,
    );
  }
  if ([...existingByNumber.keys()].some((number) => !checklistByNumber.has(number))) {
    throw new Error("Canonical set contains a coordinate absent from the numbered checklist");
  }
  const denominators = [...new Set(officialCards.map((card) =>
    Number(card.card_number_denominator)).filter(Number.isSafeInteger))];
  if (denominators.length > 1) throw new Error("Official printed denominators disagree");
  const printedTotal = denominators[0] ?? expected;
  const rows = [];
  for (const number of missingCoordinates) {
    const official = officialByNumber.get(number);
    const limitless = checklistByNumber.get(number);
    if (clean(official.source_set_code).toUpperCase() !== printedSetCode) {
      throw new Error(`Official card ${official.card_id} belongs to another set`);
    }
    if (!clean(official.printed_name) || !clean(official.card_id) ||
        !clean(official.source_url)) {
      throw new Error(`Official card ${number} lacks canonical identity evidence`);
    }
    const facts = cardFacts(official);
    const cardPrintId = deterministicUuidV5(
      `${JAPANESE_OFFICIAL_INCREMENTAL_PROMOTION_VERSION}:card:${set.code}:${number}`,
    );
    const identityId = deterministicUuidV5(
      `${JAPANESE_OFFICIAL_INCREMENTAL_PROMOTION_VERSION}:identity:${set.code}:${number}`,
    );
    const identityPayload = {
      language_code: "ja",
      variant_key_current: "base",
      release_context: {
        registry_key: printedSetCode,
        set_code_identity: set.code,
      },
      card_domain: facts.card_domain,
      card_type: facts.card_type,
      family_key: facts.family_candidate,
      printed_identity_modifier: null,
      collector_facing_name_source: "official_japanese_printed_name",
    };
    const subject = {
      identity_domain: "pokemon_jpn",
      language_scope: "ja",
      set_code_identity: set.code,
      printed_set_abbrev: printedSetCode,
      printed_number: number,
      printed_name_ja: clean(official.printed_name),
      family_key: facts.family_candidate,
    };
    const evidence = [
      evidenceRow({
        cardPrintId,
        identityId,
        sourceKey: "official_jp_cards",
        sourceExternalId: official.card_id,
        sourceUrl: official.source_url,
        subject,
        payload: { card: official },
      }),
      evidenceRow({
        cardPrintId,
        identityId,
        sourceKey: "limitless_jp_structured_checklist",
        sourceExternalId: `${printedSetCode}:${number}`,
        sourceUrl: limitless.source_url ??
          `https://limitlesstcg.com/cards/jp/${encodeURIComponent(printedSetCode)}?show=all`,
        subject,
        payload: { card: limitless },
      }),
    ];
    const imageCandidateUrls = [...new Set([
      official.image_url,
      limitless.image_url,
    ].map(clean).filter(Boolean))];
    const identityHashInput = {
      identity_domain: "pokemon_jpn",
      identity_key_version: JAPANESE_OFFICIAL_IDENTITY_VERSION,
      set_code_identity: set.code,
      printed_number: number,
      normalized_printed_name: clean(official.printed_name),
      source_name_raw: clean(official.printed_name),
      identity_payload: identityPayload,
    };
    const familyReviewSubject = {
      ...subject,
      family_status: facts.family_status,
      confidence: facts.card_domain === "pokemon" ? 0.7 : 0.99,
      relationship_type: facts.card_domain === "pokemon"
        ? "unresolved_language_agnostic_species"
        : "language_agnostic_non_species_identity",
    };
    rows.push({
      number,
      card_print: {
        id: cardPrintId,
        set_id: set.id,
        name: clean(official.printed_name),
        number,
        number_plain: number,
        variant_key: "",
        rarity: clean(official.rarity) || null,
        artist: clean(official.illustrator) || null,
        image_url: null,
        image_alt_url: null,
        image_source: null,
        image_status: "missing",
        image_note: imageCandidateUrls.length > 0
          ? "Exact external candidates require separate self-hosting promotion."
          : "No exact image candidate was present in the frozen discovery evidence.",
        external_ids: {
          japanese_official_incremental_promotion_v1: {
            official_jp_card_id: String(official.card_id),
            source_urls: evidence.map((row) => row.evidence_payload.source_url),
            image_candidate_urls: imageCandidateUrls,
          },
        },
        variants: {},
        print_identity_key: null,
        ai_metadata: null,
        data_quality_flags: {
          japanese_official_incremental_promotion_v1: {
            family_status: facts.family_status,
            family_link_promotion_allowed: false,
            public_child_status: "deferred_visibility_and_storage_gate",
          },
        },
        image_res: null,
        gv_id: `GV-PK-JPN-${printedSetCode}-${number}`,
        set_code: set.code,
        printed_set_abbrev: printedSetCode,
        printed_total: printedTotal,
        regulation_mark: null,
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
        normalized_printed_name: clean(official.printed_name),
        source_name_raw: clean(official.printed_name),
        identity_payload: identityPayload,
        identity_key_version: JAPANESE_OFFICIAL_IDENTITY_VERSION,
        identity_key_hash: sha256(stableJson(identityHashInput)),
        is_active: true,
      },
      identity_hash_input: identityHashInput,
      evidence,
      family_review: {
        id: deterministicUuidV5(
          `${JAPANESE_OFFICIAL_INCREMENTAL_PROMOTION_VERSION}:family:${set.code}:${number}`,
        ),
        card_print_identity_id: identityId,
        card_print_id: cardPrintId,
        acquisition_key:
          `${JAPANESE_OFFICIAL_INCREMENTAL_PROMOTION_VERSION}|${set.code}|${number}`,
        family_status: facts.family_status,
        family_candidate_source: "official_japanese_printed_name",
        normalized_family_candidate: facts.family_candidate,
        review_status: "pending",
        family_link_promotion_allowed: false,
        review_key_hash: sha256(stableJson(familyReviewSubject)),
        evidence_subject: familyReviewSubject,
        active: true,
      },
    });
  }
  const payload = {
    set: {
      id: set.id,
      code: set.code,
      name: set.name,
      printed_set_abbrev: printedSetCode,
    },
    source: {
      source_set_id: sourceSet.source_set_id,
      source_url: sourceSet.source_url,
      count_scope: sourceSet.count_scope,
      expected_numbered_base_count: expected,
    },
    source_counts: {
      numbered_base_checklist: checklist.length,
      existing_canonical: existingByNumber.size,
      official_missing_cards: officialCards.length,
      resulting_canonical: existingByNumber.size + rows.length,
    },
    rows,
    image_candidates: rows.flatMap((row) =>
      row.card_print.external_ids.japanese_official_incremental_promotion_v1
        .image_candidate_urls.map((sourceUrl) => ({
          card_print_id: row.card_print.id,
          gv_id: row.card_print.gv_id,
          source_url: sourceUrl,
          destination_status: "self_hosting_pending",
        }))),
  };
  return {
    version: JAPANESE_OFFICIAL_INCREMENTAL_PROMOTION_VERSION,
    target: `pokemon_jpn:${printedSetCode}`,
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

export function validateJapaneseOfficialIncrementalSetPlanV1(plan) {
  const findings = [];
  const rows = plan?.payload?.rows ?? [];
  if (plan?.version !== JAPANESE_OFFICIAL_INCREMENTAL_PROMOTION_VERSION) {
    findings.push("version_mismatch");
  }
  if (new Set(rows.map((row) => row.number)).size !== rows.length) {
    findings.push("duplicate_number");
  }
  if (new Set(rows.map((row) => row.card_print.id)).size !== rows.length) {
    findings.push("duplicate_card_id");
  }
  if (new Set(rows.map((row) => row.card_print.gv_id)).size !== rows.length) {
    findings.push("duplicate_gv_id");
  }
  if (plan?.payload?.source_counts?.resulting_canonical !==
      plan?.payload?.source_counts?.numbered_base_checklist) {
    findings.push("numbered_base_closure_mismatch");
  }
  for (const row of rows) {
    if (row.identity.card_print_id !== row.card_print.id) {
      findings.push(`identity_fk:${row.number}`);
    }
    if (row.card_print.image_url || row.card_print.representative_image_url) {
      findings.push(`external_image_pointer_admitted:${row.number}`);
    }
    if ((row.evidence ?? []).length !== 2 ||
        !row.evidence.some((item) => item.source_key === "official_jp_cards") ||
        !row.evidence.some((item) =>
          item.source_key === "limitless_jp_structured_checklist")) {
      findings.push(`evidence_contract:${row.number}`);
    }
    if ((row.evidence ?? []).some((item) =>
      item.card_print_id !== row.card_print.id ||
      item.card_print_identity_id !== row.identity.id)) {
      findings.push(`evidence_fk:${row.number}`);
    }
    if (row.family_review.family_link_promotion_allowed ||
        row.family_review.review_status !== "pending") {
      findings.push(`family_boundary:${row.number}`);
    }
    if (row.identity.identity_key_hash !== sha256(stableJson(row.identity_hash_input))) {
      findings.push(`identity_hash:${row.number}`);
    }
  }
  if (plan?.payload_fingerprint_sha256 !== sha256(stableJson(plan?.payload))) {
    findings.push("payload_fingerprint_mismatch");
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
