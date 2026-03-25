import {
  normalizeDiscoverableVaultIntent,
  normalizeVaultIntent,
  type DiscoverableVaultIntent,
  type VaultIntent,
} from "@/lib/network/intent";

export type VaultIntentCounts = {
  holdCount: number;
  tradeCount: number;
  sellCount: number;
  showcaseCount: number;
};

export function createEmptyVaultIntentCounts(): VaultIntentCounts {
  return {
    holdCount: 0,
    tradeCount: 0,
    sellCount: 0,
    showcaseCount: 0,
  };
}

export function countVaultIntents(values: Array<{ intent?: string | null } | string | null | undefined>): VaultIntentCounts {
  const counts = createEmptyVaultIntentCounts();

  for (const value of values) {
    const normalized =
      typeof value === "string" || value == null
        ? normalizeVaultIntent(value)
        : normalizeVaultIntent(value.intent);

    switch (normalized ?? "hold") {
      case "trade":
        counts.tradeCount += 1;
        break;
      case "sell":
        counts.sellCount += 1;
        break;
      case "showcase":
        counts.showcaseCount += 1;
        break;
      case "hold":
      default:
        counts.holdCount += 1;
        break;
    }
  }

  return counts;
}

export function getInPlayCount(counts: VaultIntentCounts) {
  return counts.tradeCount + counts.sellCount + counts.showcaseCount;
}

export function getSingleDiscoverableIntent(counts: VaultIntentCounts): DiscoverableVaultIntent | null {
  const intents = (
    [
      counts.tradeCount > 0 ? "trade" : null,
      counts.sellCount > 0 ? "sell" : null,
      counts.showcaseCount > 0 ? "showcase" : null,
    ] as const
  ).filter((value): value is DiscoverableVaultIntent => Boolean(value));

  return intents.length === 1 ? intents[0] : null;
}

export function getPrimaryVaultIntent(counts: VaultIntentCounts): VaultIntent {
  const discoverableIntent = getSingleDiscoverableIntent(counts);
  if (discoverableIntent) {
    return discoverableIntent;
  }

  return getInPlayCount(counts) === 0 ? "hold" : "hold";
}

export function hasMixedDiscoverableIntents(counts: VaultIntentCounts) {
  return (
    Number(counts.tradeCount > 0) + Number(counts.sellCount > 0) + Number(counts.showcaseCount > 0) > 1
  );
}

export function getDiscoverableIntentCount(
  counts: VaultIntentCounts,
  intent: DiscoverableVaultIntent | string | null | undefined,
) {
  switch (normalizeDiscoverableVaultIntent(intent)) {
    case "trade":
      return counts.tradeCount;
    case "sell":
      return counts.sellCount;
    case "showcase":
      return counts.showcaseCount;
    default:
      return 0;
  }
}
