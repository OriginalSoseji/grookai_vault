import "server-only";

import {
  resolveCanonImageV1,
  type CanonImageLike,
} from "@/lib/canon/resolveCanonImageV1";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";

export type CardDisplayImageKind =
  | "exact"
  | "representative"
  | "missing_variant_visual"
  | "missing"
  | "blocked";

export type CardImageLike = CanonImageLike & {
  id?: string | null;
  card_print_id?: string | null;
  gv_id?: string | null;
  printing_gv_id?: string | null;
  name?: string | null;
  number?: string | null;
  number_plain?: string | null;
  set_code?: string | null;
  representative_image_url?: string | null;
  image_status?: string | null;
  image_note?: string | null;
};

export type ResolvedCardImageFieldsV1 = {
  image_url: string | null;
  representative_image_url: string | null;
  image_status: string | null;
  image_note: string | null;
  image_source: string | null;
  display_image_url: string | null;
  display_image_kind: CardDisplayImageKind;
  image_path: string | null;
  exact_image_source: "identity" | "external" | "none";
};

const TARGET_IMAGE_STATUSES = new Set([
  "exact",
  "representative_shared",
  "representative_shared_collision",
  "representative_shared_stamp",
  "missing_variant_visual",
  "representative_missing_variant_visual",
  "blocked",
  "missing",
  "unresolved",
]);

const STATUSES_THAT_BLOCK_EXACT_URL = new Set([
  "blocked",
  "missing",
  "unresolved",
]);

const LEGENDARY_TREASURES_RC5_CARD_PRINT_ID =
  "efa15a49-a1f9-46b0-bd69-85111388328e";
const LEGENDARY_TREASURES_RC5_BLOCKED_IMAGE_PATTERNS = [
  "00484a4e28a235d9f4a8edcc",
  "images.pokemontcg.io/bw11/5_hires.png",
];
const LEGENDARY_TREASURES_RC5_BLOCKED_IMAGE_NOTE =
  "Image blocked: known mismatched Legendary Treasures RC5 Torchic image candidate resolves to Carnivine.";
const KNOWN_BROKEN_TCGDEX_IMAGE_NOTE =
  "Image blocked: known upstream TCGdex asset URL returns 404 and needs a verified replacement.";
const POKEMON_TCG_TRAINER_KIT_SET_CODE_ALIASES: Record<string, string> = {
  "tk-ex-latia": "tk1a",
  "tk-ex-latio": "tk1b",
  "tk-ex-m": "tk2b",
  "tk-ex-p": "tk2a",
  tk2b: "tk2b",
};
const MALIE_TRAINER_KIT_SET_IMAGE_PLANS: Record<
  string,
  { series: string; code: string; folder: string }
> = {
  "tk-bw-z": { series: "BW", code: "TK5A", folder: "TK_Zoroark" },
  "tk-bw-e": { series: "BW", code: "TK5B", folder: "TK_Excadrill" },
  "tk-xy-n": { series: "XY", code: "TK6A", folder: "TK_Noivern" },
  "tk-xy-sy": { series: "XY", code: "TK6B", folder: "TK_Sylveon" },
  "tk-xy-b": { series: "XY", code: "TK7A", folder: "TK_Bisharp" },
  "tk-xy-w": { series: "XY", code: "TK7B", folder: "TK_Wigglytuff" },
  "tk-xy-latio": { series: "XY", code: "TK8A", folder: "TK_Latios" },
  "tk-xy-latia": { series: "XY", code: "TK8B", folder: "TK_Latias" },
  "tk-xy-p": { series: "XY", code: "TK9A", folder: "TK_PikachuLibre" },
  "tk-xy-su": { series: "XY", code: "TK9B", folder: "TK_Suicune" },
  "tk-sm-l": { series: "SM", code: "TK10A", folder: "TK_Lycanroc" },
  "tk-sm-r": { series: "SM", code: "TK10B", folder: "TK_AlolanRaichu" },
};

type SourceBackedReplacementImage = {
  url: string;
  image_source: string;
  image_status: "exact" | "representative_shared";
  image_note: string;
  display_image_kind: "exact" | "representative";
};

function normalizeTextOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLowerOrNull(value: unknown) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeRepresentativeImageUrl(value: unknown) {
  return getBestPublicCardImageUrl(normalizeTextOrNull(value)) ?? null;
}

function textIncludesAny(value: unknown, patterns: readonly string[]) {
  const normalized = normalizeLowerOrNull(value);
  return normalized
    ? patterns.some((pattern) => normalized.includes(pattern))
    : false;
}

function isLegendaryTreasuresRc5Torchic(
  cardPrint: CardImageLike | null | undefined,
) {
  const id = normalizeLowerOrNull(cardPrint?.id);
  const cardPrintId = normalizeLowerOrNull(cardPrint?.card_print_id);
  const gvId = normalizeLowerOrNull(cardPrint?.gv_id);
  const printingGvId = normalizeLowerOrNull(cardPrint?.printing_gv_id);
  const setCode = normalizeLowerOrNull(cardPrint?.set_code);
  const name = normalizeLowerOrNull(cardPrint?.name);
  const number = normalizeLowerOrNull(cardPrint?.number);

  return (
    id === LEGENDARY_TREASURES_RC5_CARD_PRINT_ID ||
    cardPrintId === LEGENDARY_TREASURES_RC5_CARD_PRINT_ID ||
    gvId === "gv-pk-ltr-rc5" ||
    printingGvId?.startsWith("gv-pk-ltr-rc5-") ||
    (setCode === "bw11" && name === "torchic" && number === "rc5")
  );
}

function hasKnownWrongLegendaryTreasuresRc5ImageReference(
  cardPrint: CardImageLike | null | undefined,
) {
  return (
    textIncludesAny(
      cardPrint?.image_path,
      LEGENDARY_TREASURES_RC5_BLOCKED_IMAGE_PATTERNS,
    ) ||
    textIncludesAny(
      cardPrint?.image_url,
      LEGENDARY_TREASURES_RC5_BLOCKED_IMAGE_PATTERNS,
    ) ||
    textIncludesAny(
      cardPrint?.image_alt_url,
      LEGENDARY_TREASURES_RC5_BLOCKED_IMAGE_PATTERNS,
    ) ||
    textIncludesAny(
      cardPrint?.representative_image_url,
      LEGENDARY_TREASURES_RC5_BLOCKED_IMAGE_PATTERNS,
    )
  );
}

function isKnownWrongLegendaryTreasuresRc5Image(
  cardPrint: CardImageLike | null | undefined,
) {
  return (
    isLegendaryTreasuresRc5Torchic(cardPrint) &&
    hasKnownWrongLegendaryTreasuresRc5ImageReference(cardPrint)
  );
}

function isKnownBrokenTcgdexImageUrl(value: unknown) {
  const normalized = normalizeLowerOrNull(value);
  if (!normalized) {
    return false;
  }

  return (
    normalized.includes("assets.tcgdex.net/en/tk/") ||
    normalized.includes("assets.tcgdex.net/en/mc/2021swsh/") ||
    normalized.includes("assets.tcgdex.net/en/ex/ex5.5/")
  );
}

function hasKnownBrokenTcgdexImageReference(
  cardPrint: CardImageLike | null | undefined,
) {
  return (
    isKnownBrokenTcgdexImageUrl(cardPrint?.image_path) ||
    isKnownBrokenTcgdexImageUrl(cardPrint?.image_url) ||
    isKnownBrokenTcgdexImageUrl(cardPrint?.image_alt_url) ||
    isKnownBrokenTcgdexImageUrl(cardPrint?.representative_image_url)
  );
}

function getNumericCardNumber(cardPrint: CardImageLike | null | undefined) {
  const number = normalizeTextOrNull(cardPrint?.number);
  if (number && /^\d+$/.test(number)) {
    return String(Number(number));
  }

  const numberPlain = normalizeTextOrNull(cardPrint?.number_plain);
  if (numberPlain && /^\d+$/.test(numberPlain)) {
    return String(Number(numberPlain));
  }

  return null;
}

function getPaddedNumericCardNumber(cardPrint: CardImageLike | null | undefined) {
  const number = getNumericCardNumber(cardPrint);
  return number ? number.padStart(3, "0") : null;
}

function slugForMalieTrainerKitImage(value: unknown) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  const slug = normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2018\u2019`]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  return slug.length > 0 ? slug : null;
}

function getMalieTrainerKitReplacementImageUrl(
  cardPrint: CardImageLike | null | undefined,
) {
  const setCode = normalizeLowerOrNull(cardPrint?.set_code);
  const plan = setCode ? MALIE_TRAINER_KIT_SET_IMAGE_PLANS[setCode] : null;
  const number = getPaddedNumericCardNumber(cardPrint);
  const nameSlug = slugForMalieTrainerKitImage(cardPrint?.name);

  if (!plan || !number || !nameSlug) {
    return null;
  }

  return `https://cdn.malie.io/file/malie-io/art/cards/jpg/en_US/${encodeURIComponent(plan.series)}/${encodeURIComponent(plan.code)}-${encodeURIComponent(plan.folder)}/en_US-${encodeURIComponent(plan.code)}-${encodeURIComponent(number)}-${encodeURIComponent(nameSlug)}.jpg`;
}

function getSourceBackedReplacementImage(
  cardPrint: CardImageLike | null | undefined,
): SourceBackedReplacementImage | null {
  const setCode = normalizeLowerOrNull(cardPrint?.set_code);
  const number = getNumericCardNumber(cardPrint);

  if (
    setCode === "2021swsh" &&
    number &&
    Number(number) >= 1 &&
    Number(number) <= 25
  ) {
    return {
      url: `https://images.pokemontcg.io/mcd21/${encodeURIComponent(number)}_hires.png`,
      image_source: "pokemonapi",
      image_status: "exact",
      image_note:
        "Source-backed replacement: PokemonTCG image used because the TCGdex asset URL returns 404.",
      display_image_kind: "exact",
    };
  }

  const trainerKitPokemonTcgSetCode = setCode
    ? POKEMON_TCG_TRAINER_KIT_SET_CODE_ALIASES[setCode]
    : null;
  if (trainerKitPokemonTcgSetCode && number) {
    return {
      url: `https://images.pokemontcg.io/${encodeURIComponent(trainerKitPokemonTcgSetCode)}/${encodeURIComponent(number)}_hires.png`,
      image_source: "pokemonapi",
      image_status: "exact",
      image_note:
        "Source-backed replacement: PokemonTCG image used because the TCGdex asset URL returns 404.",
      display_image_kind: "exact",
    };
  }

  const malieTrainerKitReplacementUrl =
    getMalieTrainerKitReplacementImageUrl(cardPrint);
  if (malieTrainerKitReplacementUrl) {
    return {
      url: malieTrainerKitReplacementUrl,
      image_source: "external",
      image_status: "representative_shared",
      image_note:
        "Source-backed representative display: Malie Trainer Kit image used because the upstream TCGdex asset is missing or unavailable.",
      display_image_kind: "representative",
    };
  }

  return null;
}

function buildSourceBackedReplacementFields(
  replacementImage: SourceBackedReplacementImage,
): ResolvedCardImageFieldsV1 {
  if (replacementImage.image_status === "exact") {
    return {
      image_url: replacementImage.url,
      representative_image_url: null,
      image_status: replacementImage.image_status,
      image_note: replacementImage.image_note,
      image_source: replacementImage.image_source,
      display_image_url: replacementImage.url,
      display_image_kind: replacementImage.display_image_kind,
      image_path: null,
      exact_image_source: "external",
    };
  }

  return {
    image_url: null,
    representative_image_url: replacementImage.url,
    image_status: replacementImage.image_status,
    image_note: replacementImage.image_note,
    image_source: replacementImage.image_source,
    display_image_url: replacementImage.url,
    display_image_kind: replacementImage.display_image_kind,
    image_path: null,
    exact_image_source: "none",
  };
}

function normalizeImageStatus(
  value: unknown,
  exactImageUrl: string | null,
  representativeImageUrl: string | null,
) {
  const normalized = normalizeLowerOrNull(value);

  if (normalized && TARGET_IMAGE_STATUSES.has(normalized)) {
    return normalized;
  }

  if (normalized === "ok") {
    return "exact";
  }

  if (!normalized) {
    if (exactImageUrl) {
      return "exact";
    }

    if (representativeImageUrl) {
      return "representative_shared";
    }

    return "missing";
  }

  return normalized;
}

function getDisplayKindFromStatus(
  imageStatus: string | null,
  fallbackKind: CardDisplayImageKind,
): CardDisplayImageKind {
  if (imageStatus === "exact") {
    return "exact";
  }

  if (
    imageStatus === "missing_variant_visual" ||
    imageStatus === "representative_missing_variant_visual"
  ) {
    return "missing_variant_visual";
  }

  if (imageStatus?.startsWith("representative_")) {
    return "representative";
  }

  if (imageStatus === "blocked") {
    return "blocked";
  }

  if (imageStatus === "missing" || imageStatus === "unresolved") {
    return "missing";
  }

  return fallbackKind;
}

export async function resolveCardImageFieldsV1(
  cardPrint: CardImageLike | null | undefined,
): Promise<ResolvedCardImageFieldsV1> {
  if (isKnownWrongLegendaryTreasuresRc5Image(cardPrint)) {
    return {
      image_url: null,
      representative_image_url: null,
      image_status: "blocked",
      image_note:
        normalizeTextOrNull(cardPrint?.image_note) ??
        LEGENDARY_TREASURES_RC5_BLOCKED_IMAGE_NOTE,
      image_source: normalizeTextOrNull(cardPrint?.image_source),
      display_image_url: null,
      display_image_kind: "blocked",
      image_path: null,
      exact_image_source: "none",
    };
  }

  if (hasKnownBrokenTcgdexImageReference(cardPrint)) {
    const replacementImage = getSourceBackedReplacementImage(cardPrint);
    if (replacementImage) {
      return buildSourceBackedReplacementFields(replacementImage);
    }

    return {
      image_url: null,
      representative_image_url: null,
      image_status: "blocked",
      image_note:
        normalizeTextOrNull(cardPrint?.image_note) ??
        KNOWN_BROKEN_TCGDEX_IMAGE_NOTE,
      image_source: normalizeTextOrNull(cardPrint?.image_source),
      display_image_url: null,
      display_image_kind: "blocked",
      image_path: null,
      exact_image_source: "none",
    };
  }

  const exactImage = await resolveCanonImageV1(cardPrint);
  const exactImageUrl = exactImage.url ?? null;
  const representativeImageUrl = normalizeRepresentativeImageUrl(
    cardPrint?.representative_image_url,
  );
  const imageStatus = normalizeImageStatus(
    cardPrint?.image_status,
    exactImageUrl,
    representativeImageUrl,
  );
  const imageNote = normalizeTextOrNull(cardPrint?.image_note);
  const imageSource = normalizeTextOrNull(cardPrint?.image_source);
  const exactDisplayKind = getDisplayKindFromStatus(imageStatus, "exact");
  const exactImageUrlIsUsable =
    Boolean(exactImageUrl) &&
    !STATUSES_THAT_BLOCK_EXACT_URL.has(imageStatus ?? "");

  if (exactImageUrlIsUsable) {
    return {
      image_url: exactImageUrl,
      representative_image_url: representativeImageUrl,
      image_status: imageStatus,
      image_note: imageNote,
      image_source: imageSource,
      display_image_url: exactImageUrl,
      display_image_kind: exactDisplayKind,
      image_path: exactImage.image_path,
      exact_image_source: exactImage.source,
    };
  }

  if (representativeImageUrl) {
    return {
      image_url: null,
      representative_image_url: representativeImageUrl,
      image_status: imageStatus,
      image_note: imageNote,
      image_source: imageSource,
      display_image_url: representativeImageUrl,
      display_image_kind: "representative",
      image_path: exactImage.image_path,
      exact_image_source: exactImage.source,
    };
  }

  const replacementImage = getSourceBackedReplacementImage(cardPrint);
  if (replacementImage) {
    return buildSourceBackedReplacementFields(replacementImage);
  }

  return {
    image_url: null,
    representative_image_url: null,
    image_status: imageStatus,
    image_note: imageNote,
    image_source: imageSource,
    display_image_url: null,
    display_image_kind: "missing",
    image_path: exactImage.image_path,
    exact_image_source: exactImage.source,
  };
}
