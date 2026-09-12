export const CARD_CONDITIONS = [
  ["NM", "Near Mint"], ["LP", "Lightly Played"], ["MP", "Moderately Played"],
  ["HP", "Heavily Played"], ["DMG", "Damaged"],
] as const;

export function parseCardAddOptions(condition: unknown, quantity: unknown) {
  const conditionLabel = condition == null ? "NM" : String(condition).trim().toUpperCase();
  const count = quantity == null ? 1 : Number(quantity);
  if (!CARD_CONDITIONS.some(([key]) => key === conditionLabel)) throw new Error("Select a valid condition.");
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error("Quantity must be between 1 and 20.");
  return { conditionLabel, quantity: count };
}

export async function addCopies<T>(quantity: number, add: () => Promise<T>) {
  parseCardAddOptions("NM", quantity);
  const completed: T[] = [];
  for (let index = 0; index < quantity; index++) {
    try { completed.push(await add()); }
    catch (error) { return { completed, error }; }
  }
  return { completed, error: null };
}
