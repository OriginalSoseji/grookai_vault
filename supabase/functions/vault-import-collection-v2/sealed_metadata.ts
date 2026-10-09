import { date, field, ImportValidationError, text, type SourceRow } from "./source.ts";

const key = (s: string) => text(s).toLowerCase();
const supported = new Set([
  "product name", "card name", "set", "series", "card number", "number", "category", "game",
  "grade", "watchlist", "variance", "finish", "quantity", "qty", "card condition", "condition",
  "average cost paid", "average cost", "cost", "currency", "acquisition currency", "date added", "added",
  "notes", "comment", "portfolio name", "collection name", "rarity",
]);
// Conflicting aliases must remain reviewable instead of silently choosing one.
function uniqueField(row: SourceRow, ...names: string[]): string {
  const values = Object.entries(row).filter(([k, v]) => names.includes(key(k)) && v.trim()).map(([, v]) => v);
  if (new Set(values.map(text)).size > 1) throw new ImportValidationError("conflicting_sealed_metadata");
  return values[0] ?? "";
}
export function sealedMetadata(row: SourceRow, purchaseCurrency?: string | null) {
  for (const aliases of [["product name", "card name"], ["set", "series"], ["category", "game"], ["card number", "number"], ["variance", "finish"]]) {
    uniqueField(row, ...aliases);
  }
  for (const [name, value] of Object.entries(row)) {
    if (!value.trim() || supported.has(key(name)) || key(name).startsWith("market price")) continue;
    if (key(name) === "price override" && /^0(?:\.0+)?$/.test(value.trim())) continue;
    throw new ImportValidationError("import_column_requires_review");
  }
  const supplied = purchaseCurrency == null ? "" : text(purchaseCurrency).toUpperCase();
  const recorded = text(uniqueField(row, "currency", "acquisition currency")).toUpperCase();
  if ((supplied && !/^[A-Z]{3}$/.test(supplied)) || (recorded && !/^[A-Z]{3}$/.test(recorded))) {
    throw new ImportValidationError("invalid_import_currency");
  }
  if (supplied && recorded && supplied !== recorded) throw new ImportValidationError("conflicting_import_currency");
  const raw = text(uniqueField(row, "average cost paid", "average cost", "cost"));
  // Collectr exports per-copy average costs with up to four decimal places.
  // Preserve that amount exactly; extra trailing zeroes are formatting only.
  // Never round or allocate a source average across different copies.
  // Dollar signs are an amount marker, not evidence of USD.
  if (raw && !/^\$?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,4}0*)?$/.test(raw)) {
    throw new ImportValidationError("invalid_import_cost");
  }
  const acquisitionCost = raw ? Number(raw.replace(/[$,]/g, "")) : null;
  if (acquisitionCost !== null && (!Number.isFinite(acquisitionCost) || acquisitionCost > 9999999999.99)) {
    throw new ImportValidationError("invalid_import_cost");
  }
  const acquisitionCurrency = acquisitionCost === null ? null : recorded || supplied;
  if (acquisitionCost !== null && !acquisitionCurrency) throw new ImportValidationError("import_currency_requires_review");
  const rawDate = uniqueField(row, "date added", "added");
  const rawNotes = uniqueField(row, "notes", "comment");
  if (rawNotes.length > 4000) throw new ImportValidationError("invalid_import_notes");
  const rawQuantity = text(uniqueField(row, "quantity", "qty")) || "1";
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(rawQuantity)) throw new ImportValidationError("invalid_import_quantity");
  const quantityText = rawQuantity.replaceAll(",", "");
  const quantity = Number(quantityText);
  if (!/^\d+$/.test(quantityText) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 50000) {
    throw new ImportValidationError("invalid_import_quantity");
  }
  // These remain source evidence. A card grade/condition cannot prove a seal.
  if (uniqueField(row, "card number", "number").trim() ||
    !["", "ungraded"].includes(key(field(row, "grade"))) ||
    !["", "false"].includes(key(field(row, "watchlist"))) ||
    !["", "normal"].includes(key(uniqueField(row, "variance", "finish")))) {
    throw new ImportValidationError("unsupported_sealed_source");
  }
  return {
    quantity, sealState: "unknown" as const, packageCondition: "unknown" as const,
    acquisitionCost, acquisitionCurrency, createdAt: date(rawDate),
    createdAtDateOnly: !!rawDate.trim() && !text(rawDate).includes("T"), notes: rawNotes.trim() ? rawNotes : null,
  };
}
