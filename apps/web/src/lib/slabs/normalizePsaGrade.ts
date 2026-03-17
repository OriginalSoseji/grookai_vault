export function normalizePsaGradeValue(input?: string | null): string | undefined {
  if (typeof input !== "string") {
    return undefined;
  }

  const normalized = input.trim();
  if (!normalized) {
    return undefined;
  }

  const match = normalized.match(/(\d+(?:\.\d+)?)\s*$/);
  return match?.[1];
}
