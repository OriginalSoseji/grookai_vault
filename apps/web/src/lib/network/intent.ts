export const VAULT_INTENT_VALUES = ["trade", "sell", "showcase", "hold"] as const;
export const DISCOVERABLE_VAULT_INTENT_VALUES = ["trade", "sell", "showcase"] as const;

export type VaultIntent = (typeof VAULT_INTENT_VALUES)[number];
export type DiscoverableVaultIntent = (typeof DISCOVERABLE_VAULT_INTENT_VALUES)[number];

export function normalizeVaultIntent(value?: string | null): VaultIntent | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return VAULT_INTENT_VALUES.find((intent) => intent === normalized) ?? null;
}

export function normalizeDiscoverableVaultIntent(value?: string | null): DiscoverableVaultIntent | null {
  const normalized = normalizeVaultIntent(value);
  if (!normalized || normalized === "hold") {
    return null;
  }

  return normalized;
}

export function getVaultIntentLabel(intent: VaultIntent | string | null | undefined) {
  switch (normalizeVaultIntent(intent)) {
    case "trade":
      return "Trade";
    case "sell":
      return "Sell";
    case "showcase":
      return "Showcase";
    case "hold":
      return "Hold";
    default:
      return "Hold";
  }
}

export function getVaultIntentActionLabel(intent: DiscoverableVaultIntent | string | null | undefined) {
  switch (normalizeDiscoverableVaultIntent(intent)) {
    case "trade":
      return "Ask to trade";
    case "sell":
      return "Ask to buy";
    case "showcase":
      return "Contact owner";
    default:
      return "Contact owner";
  }
}
