function normalizeSetCode(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

const EXACT_SET_ACCENTS: Record<string, string> = {
  "sv03.5": "#22c55e",
  "sv04.5": "#0f766e",
  "sv8pt5": "#f59e0b",
  "swsh45": "#1d4ed8",
  "swsh45sv": "#7c3aed",
  "sm3.5": "#d97706",
  pgo: "#2563eb",
};

const FAMILY_ACCENTS: Array<{ match: RegExp; color: string }> = [
  { match: /^sv/, color: "#0f766e" },
  { match: /^swsh/, color: "#2563eb" },
  { match: /^sm/, color: "#d97706" },
  { match: /^xy/, color: "#db2777" },
  { match: /^(bw|bwp)/, color: "#475569" },
  { match: /^(dp|pl|hgss)/, color: "#4f46e5" },
  { match: /^(ex|tk)/, color: "#0891b2" },
  { match: /^(neo|gym|base|ecard)/, color: "#64748b" },
];

const DEFAULT_SET_ACCENT = "#cbd5e1";

export function getSetAccentColor(setCode?: string | null) {
  const normalizedCode = normalizeSetCode(setCode);
  if (!normalizedCode) {
    return DEFAULT_SET_ACCENT;
  }

  const exactColor = EXACT_SET_ACCENTS[normalizedCode];
  if (exactColor) {
    return exactColor;
  }

  const familyMatch = FAMILY_ACCENTS.find((entry) => entry.match.test(normalizedCode));
  return familyMatch?.color ?? DEFAULT_SET_ACCENT;
}
