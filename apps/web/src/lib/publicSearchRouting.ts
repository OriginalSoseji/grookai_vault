const EXACT_SET_ALIASES = new Set([
  "151",
  "base set",
  "base set 2",
  "black and white",
  "brilliant stars",
  "brs",
  "detective pikachu",
  "legendary treasures",
  "lor",
  "lost origin",
  "obs",
  "pokemon 151",
  "prismatic evolutions",
  "pris evo",
  "scarlet and violet",
  "sit",
  "silver tempest",
  "svi",
]);

const SET_PHRASES = [
  "base set",
  "base set 2",
  "black and white",
  "brilliant stars",
  "detective pikachu",
  "legendary treasures",
  "lost origin",
  "pokemon 151",
  "prismatic evolutions",
  "scarlet and violet",
  "silver tempest",
  "trainer gallery",
];

const EXACT_SET_ALIAS_TOKENS = new Set(["151", "base1", "brs", "lor", "ltr", "obs", "sit", "svi"]);

function normalizeForClassification(raw: string) {
  return normalizeSearchInput(raw)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\s+/g, " ");
}

function tokenizeForClassification(raw: string) {
  return normalizeForClassification(raw).match(/[a-z0-9./-]+/g) ?? [];
}

function looksLikeGrookaiId(normalized: string) {
  const compact = normalized.replace(/[\s-]+/g, "");
  if (/^gvpk[a-z0-9.]+$/i.test(compact) && compact.length > 6) {
    return true;
  }

  return /^gv[\s-]*pk(?:[\s-]+[a-z0-9.]+){2,}$/i.test(normalized);
}

function looksLikeCollectorFraction(tokens: string[]) {
  return tokens.some((token) => /^[a-z]{0,5}\d+[a-z]?\/[a-z]{0,5}\d+[a-z]?$/i.test(token));
}

function isPrintedNumberToken(token?: string) {
  if (!token) {
    return false;
  }

  return /^(?:\d{1,4}[a-z]?|[a-z]{1,5}\d{1,4}[a-z]?)$/i.test(token);
}

function isLikelySetCodeToken(token?: string) {
  if (!token) {
    return false;
  }

  if (EXACT_SET_ALIAS_TOKENS.has(token)) {
    return true;
  }

  return (
    /^sv\d{1,2}(?:\.\d)?$/i.test(token) ||
    /^swsh\d{1,2}(?:tg)?$/i.test(token) ||
    /^sm\d{1,2}$/i.test(token) ||
    /^xy\d{1,3}$/i.test(token) ||
    /^bw\d{1,2}$/i.test(token) ||
    /^dp\d{1,2}$/i.test(token) ||
    /^pl\d{1,2}$/i.test(token) ||
    /^hgss\d{1,2}$/i.test(token) ||
    /^base\d+$/i.test(token) ||
    /^det\d+$/i.test(token) ||
    /^pr-[a-z]{2,5}$/i.test(token)
  );
}

function hasSetPhrase(normalized: string) {
  return SET_PHRASES.some((phrase) => (` ${normalized} `).includes(` ${phrase} `));
}

function isPrefixedCollectorNumber(token?: string) {
  if (!token) {
    return false;
  }

  return /^[a-z]{1,5}\d{1,4}[a-z]?$/i.test(token);
}

export function normalizeSearchInput(raw: string) {
  return raw.trim().replace(/\s+/g, " ");
}

export function isStructuredPublicSearchQuery(raw: string): boolean {
  const normalized = normalizeForClassification(raw);
  if (!normalized) {
    return false;
  }

  const tokens = tokenizeForClassification(raw);
  if (looksLikeGrookaiId(normalized)) {
    return true;
  }

  if (looksLikeCollectorFraction(tokens)) {
    return true;
  }

  if (tokens.length === 1 && (EXACT_SET_ALIASES.has(normalized) || isLikelySetCodeToken(tokens[0]))) {
    return true;
  }

  if (EXACT_SET_ALIASES.has(normalized)) {
    return true;
  }

  const terminalToken = tokens[tokens.length - 1];
  if (!isPrintedNumberToken(terminalToken)) {
    return false;
  }

  const leadingTokens = tokens.slice(0, -1);
  if (leadingTokens.some((token) => isLikelySetCodeToken(token))) {
    return true;
  }

  return hasSetPhrase(normalized);
}

export function shouldUseResolverRoute(raw: string): boolean {
  const normalized = normalizeForClassification(raw);
  if (!normalized) {
    return false;
  }

  const tokens = tokenizeForClassification(raw);
  if (looksLikeGrookaiId(normalized)) {
    return true;
  }

  if (looksLikeCollectorFraction(tokens)) {
    return true;
  }

  if (tokens.length === 1 && (EXACT_SET_ALIASES.has(normalized) || isLikelySetCodeToken(tokens[0]))) {
    return true;
  }

  const terminalToken = tokens[tokens.length - 1];
  if (!isPrintedNumberToken(terminalToken)) {
    return false;
  }

  const leadingTokens = tokens.slice(0, -1);

  if (leadingTokens.some((token) => isLikelySetCodeToken(token)) || hasSetPhrase(normalized)) {
    return true;
  }

  return isPrefixedCollectorNumber(terminalToken);
}

export function buildPublicSearchDestination(raw: string): { pathname: "/search" | "/explore"; q: string } {
  const q = normalizeSearchInput(raw);

  // Resolver collapse rule:
  // /explore is the single authoritative results surface for searches that are likely
  // to end in ranked results. Reserve /search for direct-resolution candidates only.
  if (!q) {
    return { pathname: "/explore", q };
  }

  return {
    pathname: shouldUseResolverRoute(q) ? "/search" : "/explore",
    q,
  };
}
