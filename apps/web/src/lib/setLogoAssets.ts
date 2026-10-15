import "server-only";

import { readdir } from "fs/promises";
import path from "path";
import { cache } from "react";

const SET_LOGO_EXTENSION = ".png";
const SET_LOGO_DIRECTORY = path.join(process.cwd(), "public", "set-logos");
const EXACT_ALIAS_ASSET_CODE_MAP = new Map<string, string>([
  ["bog", "bp"],
]);
const MCD_SHARED_ASSET_CODE = "mcd11";
const BLACK_STAR_PROMO_SHARED_ASSET_CODE = "swshp";
const TRAINER_GALLERY_PARENT_SET_MAP = new Map<string, string>([
  ["swsh9tg", "swsh9"],
  ["swsh10tg", "swsh10"],
  ["swsh11tg", "swsh11"],
  ["swsh12tg", "swsh12"],
]);
// TCGdex has verified set-level marks for the newest releases before the
// local logo bundle is updated. These are logos, not representative cards.
const VERIFIED_EXTERNAL_SET_LOGO_URL_MAP = new Map<string, string>([
  ["30c", "https://assets.tcgdex.net/en/me/30th/logo.png"],
  ["30c-classic", "https://assets.tcgdex.net/en/me/30th/logo.png"],
  ["me02.5", "https://assets.tcgdex.net/en/me/me02.5/logo.png"],
  ["me05", "https://assets.tcgdex.net/en/me/me05/logo.png"],
]);

const getAvailableSetLogoCodes = cache(async () => {
  try {
    const entries = await readdir(SET_LOGO_DIRECTORY, { withFileTypes: true });
    return new Set(
      entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(SET_LOGO_EXTENSION))
        .map((entry) => entry.name.slice(0, -SET_LOGO_EXTENSION.length).toLowerCase()),
    );
  } catch {
    return new Set<string>();
  }
});

function normalizeSetCode(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function resolveFallbackSetCode(normalizedCode: string, availableCodes: Set<string>) {
  if (!normalizedCode) {
    return null;
  }

  const exactAliasCode = EXACT_ALIAS_ASSET_CODE_MAP.get(normalizedCode);
  if (exactAliasCode && availableCodes.has(exactAliasCode)) {
    return exactAliasCode;
  }

  if (normalizedCode.startsWith("mcd") && availableCodes.has(MCD_SHARED_ASSET_CODE)) {
    return MCD_SHARED_ASSET_CODE;
  }

  if (normalizedCode === "svp" && availableCodes.has(BLACK_STAR_PROMO_SHARED_ASSET_CODE)) {
    return BLACK_STAR_PROMO_SHARED_ASSET_CODE;
  }

  const trainerGalleryParentCode = TRAINER_GALLERY_PARENT_SET_MAP.get(normalizedCode);
  if (trainerGalleryParentCode && availableCodes.has(trainerGalleryParentCode)) {
    return trainerGalleryParentCode;
  }

  return null;
}

export async function getSetLogoAssetPathMap(setCodes: string[]) {
  const availableCodes = await getAvailableSetLogoCodes();
  const pathMap = new Map<string, string>();

  for (const setCode of setCodes) {
    const normalizedCode = normalizeSetCode(setCode);
    if (!normalizedCode) {
      continue;
    }

    const resolvedCode = availableCodes.has(normalizedCode)
      ? normalizedCode
      : resolveFallbackSetCode(normalizedCode, availableCodes);

    if (!resolvedCode) {
      const externalLogoUrl = VERIFIED_EXTERNAL_SET_LOGO_URL_MAP.get(normalizedCode);
      if (externalLogoUrl) {
        pathMap.set(normalizedCode, externalLogoUrl);
      }
      continue;
    }

    pathMap.set(normalizedCode, `/set-logos/${resolvedCode}${SET_LOGO_EXTENSION}`);
  }

  return pathMap;
}
