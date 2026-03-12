import type { NormalizedRow, ParsedRow } from "@/types/import";

export const IMPORT_CONDITION_OPTIONS = ["NM", "LP", "MP", "HP", "DMG"] as const;

export type ImportCondition = (typeof IMPORT_CONDITION_OPTIONS)[number];

const CONDITION_MAP: Record<string, ImportCondition> = {
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

const SET_ALIAS_MAP: Record<string, string> = {
  "base set (unlimited)": "base set",
  "base set (1st edition & shadowless)": "base set",
  "black and white": "black & white",
};

const REMOVABLE_NAME_DECORATIONS = new Set([
  "red cheeks",
  "yellow cheeks",
  "secret",
  "full art",
]);

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeMatchText(value: string) {
  return normalizeText(value).toLowerCase();
}

function normalizeCardNumber(value: string) {
  return normalizeText(value).replace(/^#/, "");
}

function stripLeadingZeros(value: string) {
  const stripped = value.replace(/^0+(\d+)$/, "$1");
  return stripped.length > 0 ? stripped : "0";
}

export function normalizeImportSetForCompare(value: string) {
  const normalized = normalizeMatchText(value);
  return SET_ALIAS_MAP[normalized] ?? normalized;
}

export function normalizeImportNameForCompare(value: string) {
  let normalized = normalizeMatchText(value);

  normalized = normalized.replace(/\s*\(([^)]*)\)/g, (match, decoration: string) => {
    return REMOVABLE_NAME_DECORATIONS.has(normalizeMatchText(decoration)) ? "" : match;
  });

  return normalizeText(normalized).toLowerCase();
}

export function normalizeImportNumberForCompare(value: string) {
  const normalized = normalizeCardNumber(value);
  if (!normalized) {
    return "";
  }

  const leftSide = normalized.split("/")[0]?.trim() ?? normalized;
  if (/^\d+$/.test(leftSide)) {
    return stripLeadingZeros(leftSide);
  }

  return leftSide;
}

function parseQuantity(value: string) {
  const normalized = normalizeText(value).replace(/,/g, "");
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseCurrency(value: string) {
  const normalized = normalizeText(value).replace(/[$,]/g, "");
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseImportedDate(value: string) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const isoLike = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoLike) {
    return `${isoLike[1]}-${isoLike[2]}-${isoLike[3]}T00:00:00.000Z`;
  }

  const usLike = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usLike) {
    const year = usLike[3].length === 2 ? `20${usLike[3]}` : usLike[3];
    const month = usLike[1].padStart(2, "0");
    const day = usLike[2].padStart(2, "0");
    return `${year}-${month}-${day}T00:00:00.000Z`;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function normalizeCondition(value: string): ImportCondition {
  const normalized = normalizeMatchText(value);
  return CONDITION_MAP[normalized] ?? "NM";
}

export function normalizeRow(row: ParsedRow): NormalizedRow {
  const displayName = normalizeText(row.rawName ?? "");
  const displaySet = normalizeText(row.rawSet ?? "");
  const displayNumber = normalizeCardNumber(row.rawNumber ?? "");
  const normalizedName = normalizeMatchText(row.rawName ?? "");
  const normalizedSet = normalizeMatchText(row.rawSet ?? "");
  const normalizedNumber = normalizeCardNumber(row.rawNumber ?? "");

  return {
    sourceRow: row.sourceRow,
    displayName: displayName || "Unknown card",
    displaySet: displaySet || "Unknown set",
    displayNumber: displayNumber || "—",
    name: normalizedName,
    set: normalizedSet,
    number: normalizedNumber,
    compareName: normalizeImportNameForCompare(row.rawName ?? ""),
    compareSet: normalizeImportSetForCompare(row.rawSet ?? ""),
    compareNumber: normalizeImportNumberForCompare(row.rawNumber ?? ""),
    quantity: parseQuantity(row.rawQuantity ?? ""),
    condition: normalizeCondition(row.rawCondition ?? ""),
    cost: parseCurrency(row.rawCost ?? "") ?? undefined,
    added: parseImportedDate(row.rawDate ?? "") ?? undefined,
    notes: normalizeText(row.rawNotes ?? "") || undefined,
  };
}
