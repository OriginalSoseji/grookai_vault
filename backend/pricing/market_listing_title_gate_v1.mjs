export const MARKET_LISTING_TITLE_GATE_VERSION = "MEE_EBAY_GVID_ASSIGNMENT_HARDENING_V1";

const WRONG_SET_PHRASES = [
  "topps",
  "carddass",
  "unbroken bonds",
  "hidden fates",
  "celebrations",
  "dream league",
  "surging sparks",
  "evolutions",
  "generations",
  "silver tempest",
  "lost origin",
  "fusion strike",
];

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return compact(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/pok├⌐|pokémon/g, "pokemon")
    .replace(/[’]/g, "'")
    .replace(/[&]/g, " and ");
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function includesAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function textHasWord(text, word) {
  return new RegExp(`(^|[^a-z0-9])${escapeRegex(normalize(word))}([^a-z0-9]|$)`, "i").test(text);
}

function normalizeNumber(value) {
  return compact(value).replace(/^#/, "").replace(/^0+(\d)/, "$1");
}

function exactNumberPattern(number) {
  const normalized = normalizeNumber(number);
  if (!normalized) return null;
  const escaped = escapeRegex(normalized);
  return new RegExp(`(^|[^0-9/])0*${escaped}\\s*(/|of|#|$|[^0-9])`, "i");
}

function hasExactNumber(text, number) {
  const pattern = exactNumberPattern(number);
  return pattern ? pattern.test(text) : false;
}

function hasNumeratorNumber(text, number) {
  const normalized = normalizeNumber(number);
  if (!normalized) return false;
  return new RegExp(`(^|[^0-9])0*${escapeRegex(normalized)}\\s*/\\s*\\d+`, "i").test(text);
}

function setNameTerms(card) {
  const raw = [
    card?.set_name,
    card?.printed_set_abbrev,
  ].map(normalize).filter(Boolean);
  const terms = new Set();
  for (const value of raw) {
    terms.add(value);
    terms.add(value.replace(/^ex\s+/, ""));
    terms.add(value.replace(/^xy\s+/, ""));
    terms.add(value.replace(/^sun and moon\s+/, ""));
    terms.add(value.replace(/^sword and shield\s+/, ""));
  }
  return [...terms].filter((term) => term.length >= 3);
}

function hasSetContext(text, card) {
  const terms = setNameTerms(card);
  if (terms.some((term) => text.includes(term))) return true;
  const setCode = normalize(card?.set_code);
  if (setCode && setCode.length >= 3 && textHasWord(text, setCode)) return true;
  return false;
}

function parseBaseLane(gvId) {
  if (!gvId?.startsWith("GV-PK-BASE1-")) return null;
  const body = gvId.replace("GV-PK-BASE1-", "");
  if (body.endsWith("-FIRST-EDITION")) return { lane: "first_edition", number: body.replace("-FIRST-EDITION", "") };
  if (body.endsWith("-SHADOWLESS")) return { lane: "shadowless", number: body.replace("-SHADOWLESS", "") };
  if (body.endsWith("-1999-2000")) return { lane: "1999_2000", number: body.replace("-1999-2000", "") };
  return { lane: "base_or_unlimited", number: body };
}

function parseTrainerKitNumber(gvId, card) {
  const fromCard = normalizeNumber(card?.number_plain ?? card?.number);
  if (fromCard) return fromCard;
  const match = String(gvId ?? "").match(/-(\d+)$/);
  return match?.[1] ?? null;
}

function parsePromoCode(gvId, card) {
  const values = [
    card?.number,
    card?.number_plain,
    String(gvId ?? "").match(/-(BW\d+)$/i)?.[1],
    String(gvId ?? "").match(/-(SM\d+)$/i)?.[1],
    String(gvId ?? "").match(/-(SWSH\d+)$/i)?.[1],
    String(gvId ?? "").match(/-(MEP-\d+)/i)?.[1],
  ].filter(Boolean);
  return values.map((value) => compact(value).toUpperCase()).find(Boolean) ?? null;
}

function hasPromoCode(text, code) {
  if (!code) return false;
  const compactCode = normalize(code).replace(/[^a-z0-9]/g, "");
  if (!compactCode) return false;
  const spacedCode = compactCode.replace(/^([a-z]+)(\d+)$/i, "$1\\s*0*$2");
  return new RegExp(`(^|[^a-z0-9])${spacedCode}([^a-z0-9]|$)`, "i").test(text.replace(/[^a-z0-9/]+/g, " "));
}

function hasExpectedName(text, card) {
  const name = normalize(card?.name);
  if (!name) return true;
  const aliases = [name, name.replace(/\s+δ/g, " delta"), name.replace(/\s+ex$/i, " ex")];
  return aliases.some((alias) => text.includes(alias));
}

function addUniversalReasons(text, reasons) {
  const hasPokemon = text.includes("pokemon");
  const hasLotNoise = includesAny(text, [" lot ", "bundle", "choose a card", "buy 3 get 3", "playset", "x4 ", "4x "]);
  const hasForeignNoise = includesAny(text, ["japanese", "italiano", "dutch", "german", "french", "spanish", "korean", "chinese"]);
  if (!hasPokemon) reasons.push("missing_pokemon_token");
  if (hasLotNoise) reasons.push("lot_or_bulk_title_noise");
  if (hasForeignNoise) reasons.push("foreign_language_title_noise");
}

function gateBaseLane(text, card, baseLane, reasons) {
  const hasBaseSet = includesAny(text, ["base set", "base-set"]);
  const hasBaseSet2 = includesAny(text, ["base set 2", "base 2", "/130"]);
  const hasFirstEdition = includesAny(text, ["1st edition", "first edition", "1st. edition"]);
  const hasShadowless = text.includes("shadowless");
  const has1999_2000 = includesAny(text, ["1999-2000", "4th print", "fourth print"]);
  const expectedNumber = card?.number_plain ?? card?.number ?? baseLane.number;

  if (!hasBaseSet) reasons.push("base_lane_missing_base_set");
  if (!hasExactNumber(text, expectedNumber)) reasons.push("base_lane_missing_exact_number");
  if (hasBaseSet2) reasons.push("base_lane_has_base_set_2_noise");
  if (baseLane.lane === "first_edition" && !hasFirstEdition) reasons.push("first_edition_lane_missing_title_token");
  if (baseLane.lane === "shadowless" && !hasShadowless) reasons.push("shadowless_lane_missing_title_token");
  if (baseLane.lane === "1999_2000" && !has1999_2000) reasons.push("1999_2000_lane_missing_title_token");
}

function gateSpecialLane(text, row, card, reasons) {
  const gvId = row.gv_id ?? card?.gv_id ?? "";
  const setName = normalize(card?.set_name);
  const expectedNumber = normalizeNumber(card?.number_plain ?? card?.number);
  const promoCode = parsePromoCode(gvId, card);

  if (gvId.startsWith("GV-PK-TK-")) {
    const tkNumber = parseTrainerKitNumber(gvId, card);
    if (!includesAny(text, ["trainer kit", "trainer deck"])) reasons.push("trainer_kit_lane_missing_title_token");
    if (!hasNumeratorNumber(text, tkNumber) && !hasExactNumber(text, tkNumber)) reasons.push("trainer_kit_lane_missing_exact_number");
  }

  if (gvId.startsWith("GV-PK-WCD-") || setName.includes("world championship")) {
    if (!includesAny(text, ["world championship", "championship deck", "worlds", "deck replica"])) {
      reasons.push("world_championship_lane_missing_title_token");
    }
  }

  if (gvId.startsWith("GV-PK-MCD-") || setName.includes("mcdonald")) {
    if (!includesAny(text, ["mcdonald", "mcdonalds", "mcdonald's", "mcd"])) reasons.push("mcdonalds_lane_missing_title_token");
    const year = setName.match(/\b(20\d{2})\b/)?.[1];
    if (year && !text.includes(year)) reasons.push("mcdonalds_lane_missing_year_token");
    if (expectedNumber && !hasExactNumber(text, expectedNumber)) reasons.push("mcdonalds_lane_missing_exact_number");
  }

  if (gvId.startsWith("GV-PK-MEP-") || setName.includes("mega evolution promo")) {
    if (!includesAny(text, ["mep", "mega evolution promo", "me: mega evolution promo", "phantasmal flames", "perfect order"])) {
      reasons.push("mep_lane_missing_title_token");
    }
    if (expectedNumber && !hasExactNumber(text, expectedNumber) && !hasPromoCode(text, `MEP${expectedNumber}`)) {
      reasons.push("mep_lane_missing_exact_number");
    }
    if (gvId.includes("STAFF-STAMP") && !text.includes("staff")) reasons.push("staff_stamp_lane_missing_title_token");
  }

  if (/GV-PK-PR-BLW-BW\d+/.test(gvId) || /^BW\d+$/i.test(promoCode ?? "")) {
    const hasBwCode = hasPromoCode(text, promoCode);
    const hasBlackWhitePromo = includesAny(text, ["black star promo", "black and white promo", "black & white promo", "bw promo"]);
    if (!hasBwCode && !hasBlackWhitePromo) reasons.push("bw_promo_lane_missing_promo_token");
    if (expectedNumber && !hasBwCode && !hasExactNumber(text, expectedNumber)) reasons.push("bw_promo_lane_missing_exact_number");
  }
}

function gateOrdinarySetContext(text, row, card, reasons) {
  const gvId = row.gv_id ?? card?.gv_id ?? "";
  if (
    gvId.startsWith("GV-PK-TK-") ||
    gvId.startsWith("GV-PK-WCD-") ||
    gvId.startsWith("GV-PK-MCD-") ||
    gvId.startsWith("GV-PK-MEP-") ||
    /GV-PK-PR-BLW-BW\d+/.test(gvId) ||
    gvId.startsWith("GV-PK-BASE1-")
  ) {
    return;
  }

  const strategy = row.strategy ?? row.title_features?.strategy;
  const expectedNumber = card?.number_plain ?? card?.number;
  const hasSet = hasSetContext(text, card);
  const hasNumber = hasExactNumber(text, expectedNumber);

  if (!hasExpectedName(text, card)) reasons.push("ordinary_lane_missing_card_name");
  if (!hasNumber) reasons.push("ordinary_lane_missing_exact_number");
  if (!hasSet) reasons.push(strategy === "name_number" ? "name_number_lane_missing_set_context" : "ordinary_lane_missing_set_context");
}

function gateWrongSetPhrases(text, row, card, reasons) {
  const setText = `${normalize(card?.set_name)} ${normalize(card?.printed_set_abbrev)} ${normalize(card?.set_code)}`;
  for (const phrase of WRONG_SET_PHRASES) {
    if (text.includes(phrase) && !setText.includes(phrase)) {
      reasons.push(`wrong_set_phrase:${phrase.replace(/\s+/g, "_")}`);
    }
  }
}

export function evaluateMarketListingTitleGateV1(row) {
  const card = row.card ?? {};
  const text = normalize(row.listing_title);
  const reasons = [];

  addUniversalReasons(text, reasons);

  const baseLane = parseBaseLane(row.gv_id ?? card.gv_id);
  if (baseLane) gateBaseLane(text, card, baseLane, reasons);
  else {
    gateSpecialLane(text, row, card, reasons);
    gateOrdinarySetContext(text, row, card, reasons);
  }

  gateWrongSetPhrases(text, row, card, reasons);

  return {
    version: MARKET_LISTING_TITLE_GATE_VERSION,
    passes: reasons.length === 0,
    reasons,
    derived: {
      normalized_title: text,
      expected_number: normalizeNumber(card?.number_plain ?? card?.number),
      set_context_detected: hasSetContext(text, card),
    },
  };
}
