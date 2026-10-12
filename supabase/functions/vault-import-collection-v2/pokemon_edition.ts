export type CollectrPokemonEdition = "first_edition" | "shadowless" | "unlimited";

const text = (value: unknown) => typeof value === "string"
  ? value.trim().replace(/\s+/g, " ").toLowerCase()
  : "";

export function collectrPokemonEdition({ set, variance }: { set: string; variance: string }): {
  editionKey: CollectrPokemonEdition | null;
  finishKey: "normal" | "holo" | null;
  recognizedVariance: boolean;
} {
  const sourceSet = text(set), sourceVariance = text(variance);
  const editions: Record<string, { editionKey: CollectrPokemonEdition; finishKey: "normal" | "holo" }> = {
    "1st edition": { editionKey: "first_edition", finishKey: "normal" },
    "first edition": { editionKey: "first_edition", finishKey: "normal" },
    "1st edition holofoil": { editionKey: "first_edition", finishKey: "holo" },
    "first edition holofoil": { editionKey: "first_edition", finishKey: "holo" },
    shadowless: { editionKey: "shadowless", finishKey: "normal" },
    "shadowless holofoil": { editionKey: "shadowless", finishKey: "holo" },
    unlimited: { editionKey: "unlimited", finishKey: "normal" },
    "unlimited holofoil": { editionKey: "unlimited", finishKey: "holo" },
  };
  if (editions[sourceVariance]) return { ...editions[sourceVariance], recognizedVariance: true };
  if (sourceSet === "base set (unlimited)") return {
    editionKey: "unlimited",
    finishKey: null,
    recognizedVariance: false,
  };
  return { editionKey: null, finishKey: null, recognizedVariance: false };
}

export function matchesCollectrPokemonEdition({ editionKey, card }: {
  editionKey: CollectrPokemonEdition | null;
  card: Record<string, unknown>;
}): boolean {
  if (editionKey === null) return true;
  const setCode = text(card.set_code), variant = text(card.variant_key), modifier = text(card.printed_identity_modifier);
  if (setCode === "base2") return modifier === `edition:${editionKey}`;
  if (setCode !== "base1") return false;
  if (editionKey === "unlimited") return !variant && !modifier;
  if (editionKey === "first_edition") return modifier.startsWith("edition:first_edition") && !modifier.includes("stamp_error:");
  return modifier.startsWith("print_run:shadowless") && !modifier.includes("edition:first_edition") && !modifier.includes("stamp_error:");
}
