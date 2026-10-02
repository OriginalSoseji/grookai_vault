// Source interpretation for the source-aware importer. No catalog/ownership writes.
import { collectrPokemonNamedFinish, collectrNamedFinishVarianceAgrees } from "./pokemon_named_finish.ts";
export type SourceRow = Record<string, string>;
export class ImportValidationError extends Error {}
export const text = (value: string) => value.trim().replace(/\s+/g, " ");
const lower = (value: string) => text(value).toLowerCase();
export function field(row: SourceRow, ...names: string[]): string {
  const keys = Object.keys(row);
  const key = names.map((name) => keys.find((key) => lower(key) === name)).find(
    (key) => key !== undefined,
  );
  return key === undefined ? "" : row[key];
}
export function parseCsv(csv: string): SourceRow[] {
  const table: string[][] = [];
  let row: string[] = [], value = "", quoted = false, closed = false;
  csv = csv.replace(/^\ufeff/, "");
  const cell = () => {
    row.push(value);
    value = "";
    closed = false;
  };
  const line = () => {
    cell();
    if (row.some((x) => x.trim())) table.push(row);
    row = [];
  };
  for (let index = 0; index < csv.length; index++) {
    const c = csv[index];
    if (c === '"') {
      if (quoted && csv[index + 1] === '"') {
        value += '"';
        index++;
      } else if (quoted) {
        quoted = false;
        closed = true;
      } else if (!value && !closed) quoted = true;
      else throw new ImportValidationError("invalid_csv_quotes");
    } else if (c === "," && !quoted) cell();
    else if ((c === "\r" || c === "\n") && !quoted) {
      if (c === "\r" && csv[index + 1] === "\n") index++;
      line();
    } else {
      if (closed) throw new ImportValidationError("invalid_csv_quotes");
      value += c;
    }
  }
  if (quoted) throw new ImportValidationError("invalid_csv_quotes");
  line();
  if (table.length < 2 || table.length > 5001) {
    throw new ImportValidationError("invalid_csv_row_count");
  }
  const headers = table[0].map((x) => x.trim());
  if (
    headers.some((x) => !x) ||
    new Set(headers.map(lower)).size !== headers.length
  ) throw new ImportValidationError("invalid_csv_headers");
  for (
    const options of [["product name", "card name"], ["set", "series"], [
      "card number",
      "number",
    ]]
  ) {
    if (!headers.some((key) => options.includes(lower(key)))) {
      throw new ImportValidationError("missing_csv_headers");
    }
  }
  return table.slice(1).map((cells) => {
    if (cells.length > headers.length) {
      throw new ImportValidationError("invalid_csv_columns");
    }
    return Object.fromEntries(
      headers.map((key, index) => [key, cells[index] ?? ""]),
    );
  });
}
export const game = (value: string): string => ({
  "pokemon": "pokemon",
  "pokémon": "pokemon",
  "pokémon tcg": "pokemon",
  "magic: the gathering": "mtg",
  "magic the gathering": "mtg",
  "mtg": "mtg",
  "gundam": "gundam",
  "gundam card game": "gundam",
  "one piece": "one_piece",
  "one piece card game": "one_piece",
  "yu-gi-oh!": "yugioh",
  "yu-gi-oh": "yugioh",
}[lower(value)] ?? "");
const aliases: Record<string, Record<string, string>> = {
  mtg: {
    "universes beyond: final fantasy": "final fantasy",
    "commander: final fantasy": "final fantasy commander",
    "universes beyond: final fantasy: through the ages":
      "final fantasy: through the ages",
    "avatar: the last airbender: eternal-legal":
      "avatar: the last airbender eternal",
  },
  pokemon: {
    "sv: 151": "151",
    "scarlet & violet base set": "scarlet & violet",
    "sword & shield base set": "sword & shield",
    "sun & moon base set": "sun & moon",
    "crown zenith: galarian gallery": "crown zenith galarian gallery",
    "ex holon phantoms": "holon phantoms",
    "ex power keepers": "power keepers",
    "sword & shield promo": "swsh black star promos",
    "sun & moon promo": "sm black star promos",
    "scarlet & violet promo": "scarlet & violet black star promos",
    "xy promos": "xy black star promos",
    "wotc promo": "wizards black star promos",
    "pokemon go": "pokémon go",
    "xy base set": "xy",
    "ex delta species": "delta species",
    "ex emerald": "emerald",
    "ex ruby & sapphire": "ruby & sapphire",
    "ex sandstorm": "sandstorm",
    "ex team magma vs team aqua": "team magma vs team aqua",
    "black and white promos": "bw black star promos",
    "diamond and pearl promos": "dp black star promos",
    "nintendo promos": "nintendo black star promos",
    "hgss promos": "hgss black star promos",
    "platinum arceus": "arceus",
    "undaunted": "hs—undaunted",
    "expedition": "expedition base set",
    "rumble": "pokémon rumble",
    "shining fates: shiny vault": "shining fates shiny vault",
    "mcdonald's 25th anniversary promos": "mcdonald's collection 2021",
    "mcdonald's promos 2022": "mcdonald's collection 2022",
    "mcdonald's promos 2024": "mcdonald's collection 2024",
  },
};
export function setName(value: string, scope: string): string {
  const name = lower(value);
  return aliases[scope]?.[name] ??
    ({
      "base set (unlimited)": "base set",
      "base set (1st edition & shadowless)": "base set",
      "black and white": "black & white",
    }[name] ?? name);
}
export function number(value: string): string {
  const result = text(value).replace(/^#/, "").split("/")[0].trim();
  const parts = /^([A-Za-z]*)(\d+)([A-Za-z]*)$/.exec(result);
  return parts
    ? parts[1].toUpperCase() + (parts[2].replace(/^0+/, "") || "0") +
      parts[3].toUpperCase()
    : result.toUpperCase();
}
const conditions: Record<string, string> = {
  nm: "NM",
  "near mint": "NM",
  lp: "LP",
  "light play": "LP",
  "lightly played": "LP",
  mp: "MP",
  "moderate play": "MP",
  "moderately played": "MP",
  hp: "HP",
  "heavy play": "HP",
  "heavily played": "HP",
  dmg: "DMG",
  damaged: "DMG",
};
const finishes: Record<string, string> = {
  normal: "normal",
  holo: "holo",
  holofoil: "holo",
  "reverse holo": "reverse",
  "reverse holofoil": "reverse",
  foil: "foil",
};
const supportedColumns = new Set([
  "product name",
  "card name",
  "set",
  "series",
  "card number",
  "number",
  "card condition",
  "condition",
  "quantity",
  "qty",
  "average cost paid",
  "average cost",
  "cost",
  "date added",
  "added",
  "notes",
  "comment",
  "category",
  "game",
  "variance",
  "finish",
  "grade",
  "portfolio name",
  "collection name",
  "watchlist",
  "rarity",
]);
function date(value: string): string | null {
  if (!value.trim()) return null;
  const raw = text(value),
    us = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(raw);
  if (/T\d{2}:\d{2}:\d{2}\.\d{7,}/.test(raw)) {
    throw new ImportValidationError("invalid_import_date_precision");
  }
  const normalized = us
    ? `${us[3].length === 2 ? "20" : ""}${us[3]}-${us[1].padStart(2, "0")}-${
      us[2].padStart(2, "0")
    }`
    : raw;
  const parts = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(normalized);
  if (normalized.includes("T") && !/(?:Z|[+-]\d{2}:\d{2})$/.test(normalized)) {
    throw new ImportValidationError("invalid_import_date");
  }
  const timestamp = Date.parse(normalized);
  if (!parts || !Number.isFinite(timestamp)) {
    throw new ImportValidationError("invalid_import_date");
  }
  const check = new Date(Date.UTC(+parts[1], +parts[2] - 1, +parts[3]));
  if (
    check.getUTCFullYear() !== +parts[1] ||
    check.getUTCMonth() + 1 !== +parts[2] || check.getUTCDate() !== +parts[3]
  ) throw new ImportValidationError("invalid_import_date");
  // Keep sub-millisecond precision and the original timezone on timestamps.
  return normalized.includes("T") ? normalized : new Date(timestamp).toISOString();
}
export type Normalized = {
  name: string;
  set: string;
  number: string;
  game: string;
  finishKey: string | null;
  quantity: number;
  condition: string;
  acquisitionCost: number | null;
  createdAt: string | null;
  createdAtDateOnly: boolean;
  notes: string | null;
};
export function normalize(row: SourceRow): Normalized {
  const name = lower(field(row, "product name", "card name")),
    rawGame = field(row, "category", "game"),
    scope = game(rawGame);
  const set = setName(field(row, "set", "series"), scope),
    collector = number(field(row, "card number", "number"));
  const grade = lower(field(row, "grade")),
    watchlist = lower(field(row, "watchlist"));
  if (
    !name || !set || !collector || (rawGame.trim() && !scope) ||
    !["", "ungraded"].includes(grade) || !["", "false"].includes(watchlist)
  ) throw new ImportValidationError("import_target_requires_review");
  const rawFinish = lower(field(row, "variance", "finish"));
  const namedFinish = scope === "pokemon" ? collectrPokemonNamedFinish(name) : null;
  if (namedFinish && !collectrNamedFinishVarianceAgrees(rawFinish)) {
    throw new ImportValidationError("import_finish_requires_review");
  }
  const finishKey = namedFinish?.finishKey ?? finishes[rawFinish] ?? null;
  if (rawFinish && !finishKey) {
    throw new ImportValidationError("import_finish_requires_review");
  }
  // A finish does not resolve edition identity (e.g. both editions can be holo).
  if (/1st edition|shadowless|unlimited/i.test(field(row, "set", "series"))) {
    throw new ImportValidationError("import_edition_requires_review");
  }
  for (const [key, value] of Object.entries(row)) {
    // Collectr emits zero for an unused override. Retain it as source evidence;
    // nonzero owner pricing still needs an explicit destination and review.
    if (lower(key) === "price override" && /^0(?:\.0+)?$/.test(value.trim())) {
      continue;
    }
    if (
      value.trim() && !supportedColumns.has(lower(key)) &&
      !lower(key).startsWith("market price")
    ) throw new ImportValidationError("import_column_requires_review");
  }
  const rawQuantity = text(field(row, "quantity", "qty")).replaceAll(",", "") ||
    "1";
  if (!/^\d+$/.test(rawQuantity)) {
    throw new ImportValidationError("invalid_import_quantity");
  }
  const quantity = Number(rawQuantity);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 50000) {
    throw new ImportValidationError("invalid_import_quantity");
  }
  const rawCondition = lower(field(row, "card condition", "condition"));
  const condition = rawCondition ? conditions[rawCondition] : "NM";
  if (!condition) throw new ImportValidationError("invalid_import_condition");
  const rawCost = text(field(row, "average cost paid", "average cost", "cost"))
    .replace(/[$,]/g, "");
  if (rawCost && !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(rawCost)) {
    throw new ImportValidationError("invalid_import_cost");
  }
  const acquisitionCost = rawCost ? Number(rawCost) : null;
  if (
    acquisitionCost !== null &&
    (!Number.isFinite(acquisitionCost) || acquisitionCost < 0)
  ) throw new ImportValidationError("invalid_import_cost");
  const rawNotes = field(row, "notes", "comment");
  const notes = rawNotes.trim() ? rawNotes : null;
  if (notes !== null && notes.length > 4000) {
    throw new ImportValidationError("invalid_import_notes");
  }
  return {
    name,
    set,
    number: collector,
    game: scope,
    finishKey,
    quantity,
    condition,
    acquisitionCost,
    createdAt: date(field(row, "date added", "added")),
    createdAtDateOnly: !!field(row, "date added", "added").trim() &&
      !text(field(row, "date added", "added")).includes("T"),
    notes,
  };
}

// Upper bound for PostgreSQL jsonb text, including separator spaces and
// numeric exponent expansion. Object key ordering cannot change byte length.
export function jsonbByteSize(value: unknown): number {
  if (Array.isArray(value)) return 2 + value.reduce((n, v) => n + jsonbByteSize(v), 0) + Math.max(0, value.length - 1) * 2;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    return 2 + entries.reduce((n, [k, v]) => n + new TextEncoder().encode(JSON.stringify(k)).length + 2 + jsonbByteSize(v), 0) + Math.max(0, entries.length - 1) * 2;
  }
  const encoded = JSON.stringify(value);
  const exponent = typeof value === "number" ? /[eE]([+-]?\d+)/.exec(encoded) : null;
  return new TextEncoder().encode(encoded).length + (exponent ? Math.abs(Number(exponent[1])) + 2 : 0);
}
