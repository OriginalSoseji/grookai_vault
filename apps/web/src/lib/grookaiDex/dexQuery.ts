const POSTGREST_WILDCARD_PATTERN = /[%_]/g;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/g;

export function normalizeGrookaiDexSearchQuery(
  value: string | null | undefined,
) {
  return (value ?? "")
    .trim()
    .replace(POSTGREST_WILDCARD_PATTERN, "")
    .replace(CONTROL_CHARACTER_PATTERN, "")
    .slice(0, 64);
}

export function quotePostgrestFilterValue(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function buildGrookaiDexSpeciesSearchFilter(searchQuery: string) {
  const normalizedQuery = normalizeGrookaiDexSearchQuery(searchQuery);
  if (!normalizedQuery) {
    return "";
  }

  const clauses = [
    `display_name.ilike.${quotePostgrestFilterValue(`%${normalizedQuery}%`)}`,
    `slug.ilike.${quotePostgrestFilterValue(`%${normalizedQuery.toLowerCase()}%`)}`,
  ];
  const numericSearch = Number.parseInt(
    normalizedQuery.replace(/^#/, ""),
    10,
  );
  if (Number.isInteger(numericSearch) && numericSearch > 0) {
    clauses.push(`national_dex_number.eq.${numericSearch}`);
  }
  return clauses.join(",");
}

export function getEffectiveGrookaiDexPage(
  requestedPage: number,
  totalPages: number,
) {
  const safeTotalPages =
    Number.isSafeInteger(totalPages) && totalPages > 0 ? totalPages : 1;
  const safeRequestedPage =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  return Math.min(safeRequestedPage, safeTotalPages);
}
