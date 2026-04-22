export const VAULT_INTENT_VALUES = ["trade", "sell", "showcase", "hold"] as const;
export const DISCOVERABLE_VAULT_INTENT_VALUES = ["trade", "sell", "showcase"] as const;

export type VaultIntent = (typeof VAULT_INTENT_VALUES)[number];
export type DiscoverableVaultIntent = (typeof DISCOVERABLE_VAULT_INTENT_VALUES)[number];
export type IntentPresentation = Readonly<{
  value: VaultIntent;
  label: string;
  helper: string | null;
  discoverable: boolean;
  contactable: boolean;
  contactCtaLabel: string | null;
}>;

// LOCK: Intent product language must remain short, calm, and consistent across surfaces.
// LOCK: Intent labels and CTA meaning must remain consistent across web discoverability surfaces.
const INTENT_PRESENTATION_BY_VALUE: Record<VaultIntent, IntentPresentation> = {
  hold: {
    value: "hold",
    label: "Hold",
    helper: "Private to your vault.",
    discoverable: false,
    contactable: false,
    contactCtaLabel: null,
  },
  trade: {
    value: "trade",
    label: "Trade",
    helper: "Visible to collectors for trade messages.",
    discoverable: true,
    contactable: true,
    contactCtaLabel: "Message collector",
  },
  sell: {
    value: "sell",
    label: "Sell",
    helper: "Visible to collectors for sale messages.",
    discoverable: true,
    contactable: true,
    contactCtaLabel: "Message collector",
  },
  showcase: {
    value: "showcase",
    label: "Showcase",
    helper: "Visible to collectors for questions and interest.",
    discoverable: true,
    contactable: true,
    contactCtaLabel: "Message collector",
  },
};

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

export function getVaultIntentPresentation(
  intent: VaultIntent | string | null | undefined,
): IntentPresentation {
  return INTENT_PRESENTATION_BY_VALUE[normalizeVaultIntent(intent) ?? "hold"];
}

export function getVaultIntentLabel(intent: VaultIntent | string | null | undefined) {
  return getVaultIntentPresentation(intent).label;
}

export function getVaultIntentHelper(intent: VaultIntent | string | null | undefined) {
  return getVaultIntentPresentation(intent).helper;
}

export function isVaultIntentDiscoverable(intent: VaultIntent | string | null | undefined) {
  return getVaultIntentPresentation(intent).discoverable;
}

export function isVaultIntentContactable(intent: VaultIntent | string | null | undefined) {
  return getVaultIntentPresentation(intent).contactable;
}

export function getVaultIntentActionLabel(intent: DiscoverableVaultIntent | string | null | undefined) {
  return getVaultIntentPresentation(normalizeDiscoverableVaultIntent(intent)).contactCtaLabel ?? "Message collector";
}
