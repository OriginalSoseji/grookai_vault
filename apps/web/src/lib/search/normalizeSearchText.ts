export function normalizeSearchText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
