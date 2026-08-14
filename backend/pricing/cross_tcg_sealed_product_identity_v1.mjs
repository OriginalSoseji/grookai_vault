export const CROSS_TCG_SEALED_PRODUCT_IDENTITY_POLICY_V1 =
  "CROSS_TCG_SEALED_PRODUCT_IDENTITY_POLICY_V1";

export const SEALED_CLASSIFICATIONS_V1 = Object.freeze([
  "sealed_candidate",
  "nonsealed_card",
  "ambiguous_review",
  "excluded_non_tcg_product",
]);

const CARD_FIELD_NAMES = new Set([
  "attribute",
  "cardtype",
  "color",
  "cost",
  "hp",
  "life",
  "number",
  "power",
  "rarity",
  "retreatcost",
  "stage",
  "subtype",
  "subtypes",
  "weakness",
]);

const LANGUAGE_MARKERS = [
  ["chinese", "Chinese"],
  ["english", "English"],
  ["french", "French"],
  ["german", "German"],
  ["italian", "Italian"],
  ["japanese", "Japanese"],
  ["korean", "Korean"],
  ["portuguese", "Portuguese"],
  ["russian", "Russian"],
  ["spanish", "Spanish"],
];

const PACKAGE_RULES = [
  {
    form: "case",
    code: "exact_case_phrase",
    phrases: [
      "booster display case",
      "booster box case",
      "booster case",
      "display case of",
      "case of booster",
      "case of displays",
      "case of boxes",
      "deck display case",
      "starter deck case",
    ],
  },
  {
    form: "deck_display",
    code: "exact_deck_display_phrase",
    phrases: [
      "deck display",
      "starter deck display",
      "structure deck display",
      "theme deck display",
      "commander deck display",
      "display of decks",
    ],
  },
  {
    form: "sleeved_pack",
    code: "exact_sleeved_pack_phrase",
    phrases: [
      "sleeved booster pack",
      "sleeved play booster pack",
      "sleeved collector booster pack",
      "sleeved draft booster pack",
    ],
  },
  {
    form: "booster_box",
    code: "exact_booster_box_phrase",
    phrases: ["booster box", "collector booster box", "draft booster box", "play booster box"],
  },
  {
    form: "display",
    code: "exact_display_phrase",
    phrases: [
      "booster display",
      "display box",
      "booster display box",
      "pack display",
    ],
  },
  {
    form: "promo_pack",
    code: "exact_promo_pack_phrase",
    phrases: [
      "promo pack",
      "promotional pack",
      "event pack",
      "winner pack",
      "prize pack",
      "tournament pack",
      "special don card pack",
    ],
  },
  {
    form: "pack",
    code: "exact_booster_pack_phrase",
    phrases: [
      "booster pack",
      "collector booster",
      "draft booster",
      "play booster",
      "set booster",
      "theme booster",
      "jumpstart booster",
    ],
  },
  {
    form: "deck",
    code: "exact_deck_product_phrase",
    phrases: [
      "starter deck",
      "structure deck",
      "commander deck",
      "theme deck",
      "battle deck",
      "league battle deck",
      "challenge deck",
      "intro pack",
      "preconstructed deck",
      "ready to play deck",
    ],
  },
  {
    form: "kit",
    code: "exact_kit_phrase",
    phrases: [
      "prerelease kit",
      "pre release kit",
      "starter kit",
      "build and battle box",
      "build & battle box",
      "trainer toolkit",
    ],
  },
  {
    form: "tin",
    code: "exact_tin_phrase",
    phrases: ["collector tin", "mini tin", "stacking tin", "tin box", "tin"],
  },
  {
    form: "collection",
    code: "exact_collection_phrase",
    phrases: [
      "premium collection",
      "special collection",
      "collection box",
      "collection set",
      "poster collection",
      "figure collection",
    ],
  },
  {
    form: "bundle",
    code: "exact_bundle_phrase",
    phrases: [
      "sealed promotional bundle",
      "gift bundle",
      "fat pack bundle",
      "booster bundle",
      "bundle",
    ],
  },
];

const GENERIC_PACKAGE_WORDS = [
  "box",
  "bundle",
  "case",
  "collection",
  "deck",
  "display",
  "kit",
  "pack",
  "tin",
];

const CUSTOM_PRODUCT_PHRASES = [
  "custom bundle",
  "custom pack",
  "grab bag",
  "mystery repack",
  "random lot",
  "repack",
  "retailer bundle",
];

const ACCESSORY_PHRASES = [
  "binder",
  "card sleeves",
  "deck box",
  "deck protector",
  "dice set",
  "figurine",
  "playmat",
  "portfolio",
  "storage box",
  "toploader",
];

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function normalizeFieldName(value) {
  return lower(value).replace(/[^a-z0-9]/g, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function phrasePattern(phrase) {
  const tokens = lower(phrase).match(/[a-z0-9]+/g) ?? [];
  const body = tokens.map(escapeRegExp).join("[^a-z0-9]+");
  return new RegExp(`(^|[^a-z0-9])${body}([^a-z0-9]|$)`, "i");
}

function hasPhrase(value, phrase) {
  return phrasePattern(phrase).test(clean(value));
}

function htmlToText(value) {
  return clean(
    String(value ?? "")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&"),
  );
}

function extendedEntries(product) {
  return Array.isArray(product?.extended_data)
    ? product.extended_data
    : Array.isArray(product?.extendedData)
      ? product.extendedData
      : [];
}

function extendedMap(product) {
  const map = new Map();
  for (const entry of extendedEntries(product)) {
    const key = normalizeFieldName(entry?.name);
    const value = clean(entry?.value);
    if (key && value && !map.has(key)) map.set(key, value);
  }
  return map;
}

function evidence(code, field, value, strength = "strong") {
  return { code, field, value: clean(value), strength };
}

function cardEvidence(product, fields) {
  const results = [];
  const number = fields.get("number");
  const cardType = fields.get("cardtype");
  if (number) results.push(evidence("explicit_card_number", "extended_data.Number", number));
  if (cardType) results.push(evidence("explicit_card_type", "extended_data.CardType", cardType));

  const populatedCardFields = [...fields.entries()].filter(
    ([key, value]) => CARD_FIELD_NAMES.has(key) && value,
  );
  if (!number && !cardType && populatedCardFields.length >= 2) {
    results.push(
      evidence(
        "multiple_card_specific_fields",
        "extended_data",
        populatedCardFields.map(([key]) => key).sort().join(","),
      ),
    );
  }

  if (
    hasPhrase(product?.name, "don card") &&
    ([fields.get("rarity"), cardType]
      .map((value) => lower(value).replace(/[^a-z0-9]/g, ""))
      .includes("don"))
  ) {
    results.push(evidence("protected_one_piece_don_card", "name+extended_data", product.name));
  }
  return results;
}

function packageEvidence(product, combinedText) {
  const matches = [];
  for (const rule of PACKAGE_RULES) {
    const matchedPhrase = rule.phrases.find((phrase) => hasPhrase(product?.name, phrase));
    if (matchedPhrase) {
      matches.push({
        package_form: rule.form,
        evidence: evidence(rule.code, "name", matchedPhrase),
      });
    }
  }

  const explicitSealed = /(^|[^a-z])sealed([^a-z]|$)/i.test(combinedText);
  if (explicitSealed) {
    matches.push({
      package_form: null,
      evidence: evidence("explicit_sealed_wording", "extended_data", "sealed"),
    });
  }

  const contentsLanguage =
    /(^|[^a-z])(contains?|contents?|includes?)([^a-z]|$)/i.test(combinedText) &&
    /\b(cards?|boosters?|packs?|decks?|boxes?|displays?|tins?)\b/i.test(combinedText);
  if (contentsLanguage) {
    matches.push({
      package_form: null,
      evidence: evidence("explicit_tcg_contents", "extended_data", "contents statement"),
    });
  }
  return matches;
}

function parseQuantities(product) {
  const sourceValues = extendedEntries(product)
    .filter((entry) => clean(entry?.value))
    .map((entry) => ({ field: `extended_data.${clean(entry.name) || "unknown"}`, text: htmlToText(entry.value) }));
  const units = {
    card: "card",
    cards: "card",
    pack: "pack",
    packs: "pack",
    booster: "booster_pack",
    boosters: "booster_pack",
    "booster pack": "booster_pack",
    "booster packs": "booster_pack",
    box: "box",
    boxes: "box",
    case: "case",
    cases: "case",
    deck: "deck",
    decks: "deck",
    display: "display",
    displays: "display",
    tin: "tin",
    tins: "tin",
    token: "token",
    tokens: "token",
  };
  const found = new Map();
  const pattern = /\b(\d{1,5})\s*(?:x\s*)?(?:(?:random|assorted|sealed|individual)\s+)?(booster packs?|boosters?|cards?|packs?|boxes?|cases?|decks?|displays?|tins?|tokens?)\b/gi;
  for (const source of sourceValues) {
    for (const match of source.text.matchAll(pattern)) {
      const quantity = Number.parseInt(match[1], 10);
      const rawUnit = lower(match[2]);
      const unit = units[rawUnit];
      if (!Number.isInteger(quantity) || quantity <= 0 || !unit) continue;
      const key = `${quantity}:${unit}:${source.field}`;
      if (!found.has(key)) {
        found.set(key, {
          quantity,
          unit,
          source_field: source.field,
          matched_text: clean(match[0]),
        });
      }
    }
  }
  return [...found.values()].sort((a, b) =>
    `${a.unit}:${a.quantity}:${a.source_field}`.localeCompare(
      `${b.unit}:${b.quantity}:${b.source_field}`,
    ),
  );
}

function detectLanguageRegion(product) {
  const name = clean(product?.name);
  const categoryName = clean(product?.category_display_name ?? product?.category_name);
  const language = LANGUAGE_MARKERS.find(([marker]) => hasPhrase(name, marker));
  if (language) {
    return {
      language: language[1],
      region: null,
      evidence: [evidence("explicit_language_marker", "name", language[0])],
    };
  }
  if (lower(categoryName) === "pokemon japan") {
    return {
      language: "Japanese",
      region: "Japan",
      evidence: [evidence("source_category_language_region", "category", categoryName)],
    };
  }
  return { language: null, region: null, evidence: [] };
}

function detectEditionWave(product) {
  const name = clean(product?.name);
  const patterns = [
    /\b(?:first|1st) edition\b/i,
    /\bwave\s+[a-z0-9.-]+\b/i,
    /\b(?:version|ver\.)\s*[a-z0-9.-]+\b/i,
    /\bvol\.?\s*[a-z0-9.-]+\b/i,
  ];
  const values = patterns
    .map((pattern) => name.match(pattern)?.[0])
    .filter(Boolean)
    .map(clean);
  return [...new Set(values)];
}

function releaseState(product) {
  const raw = product?.presale_info ?? product?.presaleInfo;
  const value = raw && typeof raw === "object" ? raw : {};
  const isPresale = value.isPresale === true || value.is_presale === true;
  const releasedOn = clean(value.releasedOn ?? value.released_on) || null;
  return {
    state: isPresale ? "presale" : releasedOn ? "release_date_stated" : "not_stated",
    is_presale: isPresale,
    released_on: releasedOn,
    evidence: isPresale || releasedOn
      ? [evidence("source_presale_info", "presale_info", JSON.stringify({ is_presale: isPresale, released_on: releasedOn }))]
      : [],
  };
}

function candidateIdentity(product, packageForm) {
  const languageRegion = detectLanguageRegion(product);
  return {
    game_category: {
      source_category_id: product?.category_id ?? null,
      source_category_name: clean(product?.category_display_name ?? product?.category_name) || null,
    },
    product_line_set: {
      source_group_id: product?.group_id ?? null,
      source_group_name: clean(product?.group_name) || null,
    },
    canonical_product_family: null,
    package_form: packageForm,
    language_region: languageRegion,
    edition_wave: detectEditionWave(product),
    quantity_contents: parseQuantities(product),
    release_presale_state: releaseState(product),
    exact_source_mapping: {
      provider: "tcgplayer",
      source_category_id: product?.category_id ?? null,
      source_group_id: product?.group_id ?? null,
      source_product_id: product?.product_id ?? null,
      source_product_name: clean(product?.name ?? product?.clean_name) || null,
      source_url: clean(product?.source_url) || null,
    },
  };
}

export function classifyCrossTcgSealedProductV1(product = {}) {
  const name = clean(product.name ?? product.clean_name);
  const fields = extendedMap(product);
  const extendedText = extendedEntries(product)
    .map((entry) => htmlToText(entry?.value))
    .join("\n");
  const combinedText = `${name}\n${extendedText}`;
  const cards = cardEvidence({ ...product, name }, fields);
  const packages = packageEvidence({ ...product, name }, combinedText);
  const customSignals = CUSTOM_PRODUCT_PHRASES.filter((phrase) => hasPhrase(combinedText, phrase));
  const accessorySignals = ACCESSORY_PHRASES.filter((phrase) => hasPhrase(combinedText, phrase));
  const genericSignals = GENERIC_PACKAGE_WORDS.filter((phrase) => hasPhrase(name, phrase));
  const explicitCardContents = /\b(?:contains?|includes?|contents?)\b[^\n.]{0,100}\b\d+\s*(?:x\s*)?cards?\b/i.test(extendedText)
    || /\b\d+\s*(?:x\s*)?cards?\s+(?:included|inside|per|in)\b/i.test(extendedText);

  let classification = "ambiguous_review";
  let confidence = 0.5;
  let packageForm = packages.find((entry) => entry.package_form)?.package_form ?? null;
  const reasons = [];
  const allEvidence = [
    ...cards,
    ...packages.map((entry) => entry.evidence),
    ...customSignals.map((value) => evidence("custom_or_retailer_signal", "name_or_extended_data", value, "moderate")),
    ...accessorySignals.map((value) => evidence("accessory_signal", "name_or_extended_data", value, "moderate")),
    ...genericSignals.map((value) => evidence("generic_package_word", "name", value, "weak")),
  ];

  if (cards.length > 0) {
    classification = "nonsealed_card";
    confidence = cards.some((entry) => entry.code === "explicit_card_number") ? 0.99 : 0.97;
    packageForm = null;
    reasons.push("Individual-card source fields take precedence over packaging-like name text.");
  } else if (accessorySignals.length > 0 && !explicitCardContents) {
    classification = "excluded_non_tcg_product";
    confidence = 0.94;
    packageForm = null;
    reasons.push("Source evidence describes accessories or merchandise without explicit TCG card contents.");
  } else if (customSignals.length > 0) {
    classification = "ambiguous_review";
    confidence = 0.62;
    reasons.push("Custom, repack, lot, or retailer-bundle language requires human review.");
  } else if (packages.some((entry) => entry.package_form)) {
    classification = "sealed_candidate";
    const hasContents = packages.some((entry) => entry.evidence.code === "explicit_tcg_contents");
    const hasSealed = packages.some((entry) => entry.evidence.code === "explicit_sealed_wording");
    confidence = hasContents && hasSealed ? 0.99 : hasContents || hasSealed ? 0.97 : 0.92;
    reasons.push("A precise package-form phrase provides positive sealed-product evidence.");
  } else if (packages.length > 0) {
    classification = "ambiguous_review";
    confidence = 0.66;
    reasons.push("Sealed or contents wording exists, but the package form is unresolved.");
  } else if (genericSignals.length > 0) {
    classification = "ambiguous_review";
    confidence = 0.45;
    reasons.push("Generic packaging language is insufficient without a precise form or contents evidence.");
  } else {
    reasons.push("No positive individual-card or sealed-product evidence was found.");
  }

  if (!name) {
    classification = "ambiguous_review";
    confidence = 0;
    packageForm = null;
    reasons.unshift("Source product name is missing.");
  }

  return {
    policy_version: CROSS_TCG_SEALED_PRODUCT_IDENTITY_POLICY_V1,
    classification,
    confidence,
    evidence: allEvidence,
    reasons,
    candidate_identity: candidateIdentity({ ...product, name }, packageForm),
    candidate_only: true,
    canonical_authority: false,
    publication_authority: false,
    card_print_write_authority: false,
    requires_human_review: classification === "ambiguous_review",
  };
}
