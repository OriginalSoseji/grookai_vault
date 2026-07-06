export const MARKET_LISTING_TITLE_RETARGET_VERSION = "MEE_EBAY_TITLE_RETARGET_EXACT_SET_NUMBER_V1";

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
    .replace(/[&]/g, " and ")
    .replace(/[^a-z0-9/' .-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeNumber(value) {
  return compact(value).replace(/^#/, "").replace(/^0+(\d)/, "$1");
}

function textHasWord(text, word) {
  const normalized = normalize(word);
  if (!normalized) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRegex(normalized)}([^a-z0-9]|$)`, "i").test(text);
}

function titleHasName(text, name) {
  const normalized = normalize(name);
  if (!normalized) return false;
  const aliases = new Set([
    normalized,
    normalized.replace(/\s+ex$/i, " ex"),
    normalized.replace(/\s+vmax$/i, " vmax"),
    normalized.replace(/\s+vstar$/i, " vstar"),
  ]);
  return [...aliases].some((alias) => text.includes(alias));
}

function titleHasNumberTotal(text, number, total) {
  const normalizedNumber = normalizeNumber(number);
  const normalizedTotal = normalizeNumber(total);
  if (!normalizedNumber || !normalizedTotal) return false;
  return new RegExp(
    `(^|[^0-9])0*${escapeRegex(normalizedNumber)}\\s*/\\s*0*${escapeRegex(normalizedTotal)}([^0-9]|$)`,
    "i",
  ).test(text);
}

function titleHasExactNumber(text, number) {
  const normalizedNumber = normalizeNumber(number);
  if (!normalizedNumber) return false;
  return new RegExp(`(^|[^0-9/])0*${escapeRegex(normalizedNumber)}\\s*(/|of|#|$|[^0-9])`, "i").test(text);
}

function titleHasSetContext(text, card) {
  const setTerms = [
    card.set_name,
    card.printed_set_abbrev,
    card.set_code,
  ].map(normalize).filter((term) => term.length >= 2);

  for (const term of setTerms) {
    if (term.length >= 4 && text.includes(term)) return true;
    if (term.length >= 2 && textHasWord(text, term)) return true;
  }
  return false;
}

function cardNumber(card) {
  return normalizeNumber(card.number_plain ?? card.number);
}

function targetKey(target) {
  return target?.card_print_id || target?.gv_id || null;
}

function scoreCardTitleMatch(text, card) {
  const reasons = [];
  let score = 0;

  if (!titleHasName(text, card.name)) return null;
  score += 30;
  reasons.push("title_has_card_name");

  const number = cardNumber(card);
  const hasNumberTotal = titleHasNumberTotal(text, number, card.printed_total);
  const hasExactNumber = titleHasExactNumber(text, number);
  if (hasNumberTotal) {
    score += 50;
    reasons.push("title_has_exact_number_total");
  } else if (hasExactNumber) {
    score += 25;
    reasons.push("title_has_exact_number");
  } else {
    return null;
  }

  if (titleHasSetContext(text, card)) {
    score += 35;
    reasons.push("title_has_set_context");
  } else if (!hasNumberTotal) {
    return null;
  }

  if (card.rarity && /\b(special illustration|illustration|secret|hyper|sir|sar)\b/i.test(card.rarity)) {
    score += 5;
    reasons.push("collector_rarity_bonus");
  }

  return {
    card,
    score,
    reasons,
  };
}

export function resolveMarketListingTitleTargetV1({ listingTitle, originalTarget, catalog }) {
  const normalizedTitle = normalize(listingTitle);
  const candidates = [];

  for (const card of catalog ?? []) {
    const scored = scoreCardTitleMatch(normalizedTitle, card);
    if (scored) candidates.push(scored);
  }

  candidates.sort((left, right) =>
    right.score - left.score
    || String(left.card.gv_id ?? "").localeCompare(String(right.card.gv_id ?? "")));

  const best = candidates[0] ?? null;
  const second = candidates[1] ?? null;
  const original = targetKey(originalTarget);

  if (!best) {
    return {
      target: originalTarget,
      retargeted: false,
      status: "no_exact_title_target",
      version: MARKET_LISTING_TITLE_RETARGET_VERSION,
      normalized_title: normalizedTitle,
    };
  }

  const ambiguous = second && second.score === best.score;
  if (ambiguous) {
    return {
      target: originalTarget,
      retargeted: false,
      status: "ambiguous_exact_title_target",
      version: MARKET_LISTING_TITLE_RETARGET_VERSION,
      normalized_title: normalizedTitle,
      best_match: {
        gv_id: best.card.gv_id,
        card_print_id: best.card.card_print_id,
        score: best.score,
      },
      second_match: {
        gv_id: second.card.gv_id,
        card_print_id: second.card.card_print_id,
        score: second.score,
      },
    };
  }

  const resolvedTarget = {
    ...(originalTarget ?? {}),
    card_print_id: best.card.card_print_id,
    gv_id: best.card.gv_id,
    name: best.card.name,
    set_code: best.card.set_code,
    set_name: best.card.set_name,
    printed_set_abbrev: best.card.printed_set_abbrev,
    number: best.card.number,
    number_plain: best.card.number_plain,
    rarity: best.card.rarity,
    title_retarget_version: MARKET_LISTING_TITLE_RETARGET_VERSION,
  };

  return {
    target: resolvedTarget,
    retargeted: original !== targetKey(resolvedTarget),
    status: original === targetKey(resolvedTarget) ? "title_confirmed_original_target" : "title_retargeted_exact_set_number",
    version: MARKET_LISTING_TITLE_RETARGET_VERSION,
    normalized_title: normalizedTitle,
    score: best.score,
    reasons: best.reasons,
    original_target: originalTarget ?? null,
  };
}
