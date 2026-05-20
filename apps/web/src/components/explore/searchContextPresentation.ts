export function isCameoSearchContext(label?: string | null) {
  const normalized = label?.trim().toLowerCase() ?? "";
  return normalized.startsWith("cameo:") || normalized.startsWith("cameo trainer:");
}

export function getSearchContextClassName(label?: string | null) {
  return isCameoSearchContext(label)
    ? "gv-hi-metadata block truncate text-xs font-medium"
    : "block truncate text-xs font-semibold text-slate-800";
}

export function getSearchContextBadgeTone(label?: string | null) {
  return isCameoSearchContext(label) ? ("context" as const) : ("selected" as const);
}
