// A named finish is a constraint on an existing governed child, not permission
// to create a printing or substitute ordinary Holo. Keep all source text intact.
export function collectrPokemonNamedFinish(value: string): { name: string; finishKey: string } | null {
  const labels: Record<string, string> = {
    "cosmos holo": "cosmos", "cosmo holo": "cosmos",
    "cosmos foil": "cosmos", "cosmo foil": "cosmos",
    "cracked ice holo": "cracked_ice",
    "poke ball pattern": "pokeball", "poké ball pattern": "pokeball",
    "master ball pattern": "masterball",
  };
  const match = /^([^()]+)\s+\(([^()]+)\)$/.exec(value.trim().replace(/\s+/g, " ").toLowerCase());
  const finishKey = match ? labels[match[2]] : null;
  return match && finishKey ? { name: match[1].trim(), finishKey } : null;
}
export function collectrNamedFinishVarianceAgrees(value: string): boolean {
  // Collectr uses its generic Holofoil column for these explicit name labels.
  // A conflicting Normal/Reverse/Foil/edition value must never be overwritten.
  return ["", "holo", "holofoil"].includes(value.trim().replace(/\s+/g, " ").toLowerCase());
}
