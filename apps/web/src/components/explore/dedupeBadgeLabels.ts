function normalizeBadgeLabel(label?: string | null) {
  return (label ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

export function getSecondaryBadgeLabels(labels: string[], excludedLabels: Array<string | undefined>) {
  const excluded = new Set(excludedLabels.map(normalizeBadgeLabel).filter(Boolean));
  const seen = new Set<string>();

  return labels.filter((label) => {
    const normalized = normalizeBadgeLabel(label);
    if (!normalized || excluded.has(normalized) || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}
