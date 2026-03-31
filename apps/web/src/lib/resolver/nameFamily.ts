const DECORATOR_STOPWORDS = new Set([
  "ex",
  "gx",
  "v",
  "vmax",
  "vstar",
  "lv",
  "lv.x",
  "x",
  "break",
  "tag",
  "team",
]);

function normalizeFamilyToken(token: string) {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .trim();
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function normalizeNameForFamily(value: string | null | undefined) {
  if (!value) return [];

  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s.]+/g, " ")
    .split(/\s+/)
    .map((token) => normalizeFamilyToken(token))
    .filter(Boolean);
}

export function getPrimaryFamilyTokens(value: string | null | undefined) {
  return normalizeNameForFamily(value).filter((token) => !DECORATOR_STOPWORDS.has(token));
}

export function getPrimaryFamilyTokensFromTokens(tokens: string[]) {
  const normalizedTokens = uniqueValues(
    tokens
      .map((token) => normalizeFamilyToken(token))
      .filter((token) => token.length > 0 && !DECORATOR_STOPWORDS.has(token)),
  );

  return normalizedTokens.filter(
    (token) =>
      !normalizedTokens.some(
        (candidate) => candidate !== token && candidate.length > token.length && candidate.startsWith(token),
      ),
  );
}

export function queryContainsNameDecoratorTokens(tokens: string[]) {
  return tokens
    .map((token) => normalizeFamilyToken(token))
    .some((token) => token.length > 0 && DECORATOR_STOPWORDS.has(token));
}

export function rowMatchesNameFamily(
  rowName: string | null | undefined,
  queryTokens: string[],
) {
  const normalizedQueryTokens = getPrimaryFamilyTokensFromTokens(queryTokens);
  if (!rowName || normalizedQueryTokens.length === 0) {
    return false;
  }

  const familyTokens = new Set(getPrimaryFamilyTokens(rowName));
  return normalizedQueryTokens.every((token) => familyTokens.has(token));
}
