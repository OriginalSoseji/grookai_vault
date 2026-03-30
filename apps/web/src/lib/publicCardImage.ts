export function isUsablePublicImageUrl(value: string | null | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeLowerOrNull(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function isIdentityCardImageSource(value: string | null | undefined) {
  return normalizeLowerOrNull(value) === "identity";
}

export function isExternalCompatibleCardImageSource(value: string | null | undefined) {
  const normalized = normalizeLowerOrNull(value);
  if (!normalized) {
    return false;
  }

  return normalized === "external"
    || normalized === "tcgdex"
    || normalized === "ptcg"
    || normalized === "pokemonapi"
    || normalized === "user_photo";
}

export function getBestPublicCardImageUrl(image_url?: string | null, image_alt_url?: string | null) {
  if (isUsablePublicImageUrl(image_url)) {
    return image_url!.trim();
  }

  if (isUsablePublicImageUrl(image_alt_url)) {
    return image_alt_url!.trim();
  }

  return undefined;
}
