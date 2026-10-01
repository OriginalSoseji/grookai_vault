import type { PublicGameScope } from "../publicGameScope";

// Some anniversary releases have regional names without an anniversary number.
// Use exact catalog codes, never release years or substring matches (for example,
// Prismatic Evolutions and Start Deck Generations are unrelated releases).
const POKEMON_ANNIVERSARIES = new Map([
  ["g1", "20th"],
  ["xy12", "20th"],
  ["cel25", "25th"],
  ["cel25c", "25th"],
  ["mcd21", "25th"],
  ["2021swsh", "25th"],
]);

function ordinal(number: number) {
  const suffix = number % 100 >= 11 && number % 100 <= 13 ? "th"
    : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[number % 10] ?? "th";
  return `${number}${suffix}`;
}

// Called only for caller-visible sets in the selected game. Localized catalog
// titles count too; the number need not be the first word of a product name.
export function anniversarySetOrdinals(game: PublicGameScope, code: string, names: string[]) {
  const anniversaries = new Set<string>();
  const curated = game === "pokemon" ? POKEMON_ANNIVERSARIES.get(code.toLowerCase()) : undefined;
  if (curated) anniversaries.add(curated);
  for (const name of names) {
    for (const match of name.matchAll(/\b([1-9][0-9]{0,2})(st|nd|rd|th)[\s-]+(anniversary|celebration)\b/gi)) {
      if (match[3].toLowerCase() === "celebration" && game !== "pokemon") continue;
      const value = ordinal(Number(match[1]));
      if (value === `${match[1]}${match[2]}`.toLowerCase()) anniversaries.add(value);
    }
    for (const match of name.matchAll(/(?<![0-9])([1-9][0-9]{0,2})\s*周年/gu)) {
      anniversaries.add(ordinal(Number(match[1])));
    }
  }
  return anniversaries;
}
