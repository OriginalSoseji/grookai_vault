export type VaultInstancePricingMode = "market" | "asking";

export function normalizeVaultInstancePricingMode(
  value: string | null | undefined,
): VaultInstancePricingMode | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "market" || normalized === "asking" ? normalized : null;
}

export function normalizeVaultInstancePricingCurrency(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized.length !== 3 || /[^A-Z]/.test(normalized)) {
    return null;
  }

  return normalized;
}

export function normalizeVaultInstancePricingNote(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 160);
}

export function normalizeVaultInstancePricingAmount(
  value: number | string | null | undefined,
): number | null {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }

  return Math.round(numeric * 100) / 100;
}

export function formatVaultInstancePrice(
  amount: number | null | undefined,
  currency: string | null | undefined = "USD",
) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return "—";
  }

  const normalizedCurrency = normalizeVaultInstancePricingCurrency(currency) ?? "USD";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${normalizedCurrency} ${amount.toFixed(2)}`;
  }
}

export function getVaultInstancePricingModeLabel(mode: VaultInstancePricingMode) {
  return mode === "asking" ? "Asking price" : "Market reference";
}

export function getVaultInstancePricingSourceLabel(source?: string | null) {
  const normalized = typeof source === "string" ? source.trim().toLowerCase() : "";
  if (normalized === "justtcg") {
    return "JustTCG";
  }

  if (normalized === "ebay") {
    return "eBay";
  }

  return "Market reference";
}
