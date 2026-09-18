export function normalizeExactGvId(value: string): string | null {
  const candidate = value.trim().toUpperCase();
  return /^GV-[A-Z0-9]+-[A-Z0-9]+(?:[._-][A-Z0-9]+)*$/.test(candidate)
    ? candidate
    : null;
}
