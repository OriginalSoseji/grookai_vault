/** Decimal input to integer cents. Blank is unknown; zero is a known free cost. */
export function parseCollectorMoney(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    throw new Error("Enter an amount with up to two decimal places.");
  }
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > 100_000_000_000) {
    throw new Error("Amount is too large.");
  }
  return cents;
}

export function splitCollectorCost(
  cents: number | null,
  quantity: number,
): (number | null)[] {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    throw new Error("Quantity must be between 1 and 100.");
  }
  return Array.from(
    { length: quantity },
    (_, index) =>
      cents === null
        ? null
        : Math.floor(cents / quantity) + (index < cents % quantity ? 1 : 0),
  );
}
