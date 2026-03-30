import "server-only";

type JsonRecord = Record<string, unknown>;

function normalizeTextOrNull(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function toLowerSnakeCase(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

export function asPrintedModifierRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonRecord;
}

export function getPrintedModifierLabel(printedModifier: JsonRecord | null) {
  return (
    normalizeTextOrNull(printedModifier?.modifier_label) ??
    normalizeTextOrNull(printedModifier?.modifier_key)
  );
}

export function isStampVariantKey(value: string | null | undefined) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return false;
  }

  return normalized === "stamp" || normalized.endsWith("_stamp");
}

export function normalizePrintedModifierVariantKey(printedModifier: JsonRecord | null) {
  const status = normalizeTextOrNull(printedModifier?.status);
  if (status !== "READY") {
    return null;
  }

  const modifierKey = normalizeTextOrNull(printedModifier?.modifier_key);
  if (modifierKey) {
    const normalizedKey = toLowerSnakeCase(modifierKey);
    return isStampVariantKey(normalizedKey) ? normalizedKey : null;
  }

  const modifierLabel = normalizeTextOrNull(printedModifier?.modifier_label);
  if (!modifierLabel || !/\bstamp\b/i.test(modifierLabel)) {
    return null;
  }

  const normalizedFromLabel = toLowerSnakeCase(modifierLabel);
  const variantKey = normalizedFromLabel.endsWith("_stamp")
    ? normalizedFromLabel
    : `${normalizedFromLabel}_stamp`;

  return isStampVariantKey(variantKey) ? variantKey : null;
}

export function isReadyStampPrintedModifier(printedModifier: JsonRecord | null) {
  return Boolean(normalizePrintedModifierVariantKey(printedModifier));
}
