export function normalizeVariantKey(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export function sameVariantKey(left: unknown, right: unknown) {
  return normalizeVariantKey(left) === normalizeVariantKey(right);
}
