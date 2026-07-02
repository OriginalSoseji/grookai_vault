export type PublicLanguageScope = "all" | "en" | "ja";

export const PUBLIC_LANGUAGE_SCOPE_OPTIONS: Array<{
  value: PublicLanguageScope;
  label: string;
  shortLabel: string;
}> = [
  { value: "all", label: "All languages", shortLabel: "All" },
  { value: "en", label: "English", shortLabel: "English" },
  { value: "ja", label: "Japanese", shortLabel: "Japanese" },
];

export function normalizePublicLanguageScope(value?: string | null): PublicLanguageScope {
  return value === "en" || value === "ja" ? value : "all";
}

export function getPublicLanguageScopeLabel(scope: PublicLanguageScope) {
  return PUBLIC_LANGUAGE_SCOPE_OPTIONS.find((option) => option.value === scope)?.shortLabel ?? "All";
}

export function isJapanesePublicCardIdentity(value?: string | null) {
  const normalized = (value ?? "").trim().toUpperCase();
  return normalized.includes("-JPN-") || normalized.startsWith("GV-PK-JPN-");
}

export function matchesPublicLanguageScope(
  value: { gv_id?: string | null },
  scope: PublicLanguageScope,
) {
  if (scope === "all") {
    return true;
  }

  const isJapanese = isJapanesePublicCardIdentity(value.gv_id);
  return scope === "ja" ? isJapanese : !isJapanese;
}
