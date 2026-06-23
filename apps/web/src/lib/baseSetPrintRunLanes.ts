export const BASE_SET_PRINT_RUN_LANE_CODES = [
  "base1-shadowless",
  "base1-first-edition",
  "base1-1999-2000",
] as const;

export type BaseSetPrintRunLaneCode = (typeof BASE_SET_PRINT_RUN_LANE_CODES)[number];

export const BASE_SET_PRINT_RUN_SOURCE_SET_CODE = "base1";

export type BaseSetPrintRunLaneExplanation = {
  label: string;
  shortLabel: string;
  summary: string;
  whyDifferent: string;
  collectorNote: string;
  visualCue: string;
  aliases: string[];
};

const BASE_SET_PRINT_RUN_LANE_EXPLANATIONS: Record<
  BaseSetPrintRunLaneCode,
  BaseSetPrintRunLaneExplanation
> = {
  "base1-shadowless": {
    label: "Base Set Shadowless",
    shortLabel: "Shadowless",
    summary:
      "Shadowless Base Set cards use the early Base Set card frame without the later right-side drop shadow.",
    whyDifferent:
      "Grookai treats Shadowless as its own collector lane because the print construction is visibly different from Unlimited and is collected as a separate Base Set run.",
    collectorNote:
      "Pikachu #58 is handled through the existing red-cheeks and yellow-cheeks Shadowless identities, not a generic duplicate row.",
    visualCue:
      "Look at the right edge of the Pokemon artwork frame: Shadowless cards do not have the darker drop shadow used on Unlimited cards.",
    aliases: [
      "shadowless",
      "shadow less",
      "base shadowless",
      "base set shadowless",
      "shadowless base",
      "shadowless base set",
      "base1 shadowless",
      "base one shadowless",
      "no shadow base set",
      "base set no shadow",
    ],
  },
  "base1-first-edition": {
    label: "Base Set 1st Edition",
    shortLabel: "1st Edition",
    summary:
      "Base Set 1st Edition cards are the stamped first English Base Set release and belong to the Shadowless frame family.",
    whyDifferent:
      "Grookai separates 1st Edition because the 1st Edition stamp is identity-bearing and collectors track it independently from non-stamped Shadowless and Unlimited cards.",
    collectorNote:
      "Pikachu #58 is handled through existing first-edition red-cheeks and yellow-cheeks identities.",
    visualCue:
      "Look for the 1st Edition stamp on the left side of the card below the artwork.",
    aliases: [
      "first edition",
      "1st edition",
      "first ed",
      "1st ed",
      "1e",
      "base first edition",
      "base 1st edition",
      "base first ed",
      "base 1st ed",
      "base set first edition",
      "base set 1st edition",
      "first edition base",
      "first edition base set",
      "1st edition base",
      "1st edition base set",
      "base1 first edition",
      "base1 1st edition",
    ],
  },
  "base1-1999-2000": {
    label: "Base Set 1999-2000",
    shortLabel: "1999-2000",
    summary:
      "The 1999-2000 Base Set print run is a later Base Set printing identified by the 1999-2000 copyright line.",
    whyDifferent:
      "Grookai separates this as a collector lane because the copyright-line difference is printed on-card and collectors commonly track it as the fourth print / UK-style Base Set run.",
    collectorNote:
      "These rows start with missing lane images until exact 1999-2000 physical images are cataloged.",
    visualCue:
      "Look at the card copyright line and confirm it includes 1999-2000 rather than the standard Base Set copyright text.",
    aliases: [
      "1999-2000",
      "1999 2000",
      "base 1999-2000",
      "base set 1999-2000",
      "base set 1999 2000",
      "1999-2000 base",
      "1999-2000 base set",
      "base1 1999-2000",
      "base set 2000",
      "fourth print",
      "4th print",
      "base fourth print",
      "base 4th print",
      "base set fourth print",
      "base set 4th print",
      "uk print",
      "uk base set",
      "base set uk print",
    ],
  },
};

const BASE_SET_PRINT_RUN_LANE_SPECIAL_VARIANT_KEYS: Record<
  BaseSetPrintRunLaneCode,
  string[]
> = {
  "base1-shadowless": ["shadowless_red_cheeks", "shadowless_yellow_cheeks"],
  "base1-first-edition": [
    "first_edition_red_cheeks",
    "first_edition_yellow_cheeks",
  ],
  "base1-1999-2000": [],
};

function normalizeSetCode(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export function isBaseSetPrintRunLaneCode(
  value?: string | null,
): value is BaseSetPrintRunLaneCode {
  return BASE_SET_PRINT_RUN_LANE_CODES.includes(
    normalizeSetCode(value) as BaseSetPrintRunLaneCode,
  );
}

export function getBaseSetPrintRunLaneSpecialVariantKeys(
  setCode?: string | null,
) {
  const normalizedCode = normalizeSetCode(setCode);
  if (!isBaseSetPrintRunLaneCode(normalizedCode)) {
    return [];
  }

  return BASE_SET_PRINT_RUN_LANE_SPECIAL_VARIANT_KEYS[normalizedCode];
}

export function getBaseSetPrintRunLaneCardCountAdjustment(
  setCode?: string | null,
) {
  return getBaseSetPrintRunLaneSpecialVariantKeys(setCode).length;
}

export function getBaseSetPrintRunLaneExplanation(
  setCode?: string | null,
) {
  const normalizedCode = normalizeSetCode(setCode);
  if (!isBaseSetPrintRunLaneCode(normalizedCode)) {
    return null;
  }

  return BASE_SET_PRINT_RUN_LANE_EXPLANATIONS[normalizedCode];
}
