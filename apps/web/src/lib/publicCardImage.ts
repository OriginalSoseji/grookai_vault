const NEXT_IMAGE_PATHNAME = "/_next/image";
const NEXT_IMAGE_UNWRAP_LIMIT = 3;

export function isUsablePublicImageUrl(value: string | null | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function unwrapNextImageUrl(value: string) {
  let current = value;

  for (let depth = 0; depth < NEXT_IMAGE_UNWRAP_LIMIT; depth += 1) {
    try {
      const url = new URL(current);
      if (url.pathname !== NEXT_IMAGE_PATHNAME) {
        return current;
      }

      const innerUrl = url.searchParams.get("url")?.trim();
      if (!innerUrl || innerUrl === current || !isUsablePublicImageUrl(innerUrl)) {
        return current;
      }

      current = innerUrl;
    } catch {
      return current;
    }
  }

  return current;
}

export function normalizePublicCardImageUrl(value: string) {
  const normalized = value.trim();
  const unwrapped = unwrapNextImageUrl(normalized);

  if (
    unwrapped.startsWith("https://assets.tcgdex.net/en/") &&
    !unwrapped.endsWith("/high.webp")
  ) {
    const withoutKnownFile = unwrapped.replace(/\/(?:low|high)\.(?:webp|png|jpg|jpeg)$/i, "");
    return `${withoutKnownFile.replace(/\/+$/, "")}/high.webp`;
  }

  return unwrapped;
}

export function normalizePublicCardImageSrc(value: string | null | undefined) {
  if (!isUsablePublicImageUrl(value)) {
    return undefined;
  }

  return normalizePublicCardImageUrl(value!.trim());
}

export function shouldBypassNextImageOptimization(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(normalizePublicCardImageUrl(value));
    return (
      url.hostname === "assets.tcgdex.net" ||
      (url.hostname === "raw.githubusercontent.com" &&
        url.pathname.startsWith("/PokeAPI/sprites/master/sprites/pokemon/"))
    );
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
    return normalizePublicCardImageUrl(image_url!);
  }

  if (isUsablePublicImageUrl(image_alt_url)) {
    return normalizePublicCardImageUrl(image_alt_url!);
  }

  return undefined;
}

export type DisplayImageUrlInput = {
  display_image_url?: string | null;
  image_url?: string | null;
  image_alt_url?: string | null;
  representative_image_url?: string | null;
};

export function resolveDisplayImageUrl(input: DisplayImageUrlInput) {
  // LOCK: Product surfaces must prefer display_image_url.
  // LOCK: Legacy image_url/image_alt_url are fallback-only compatibility fields.
  return (
    getBestPublicCardImageUrl(input.display_image_url) ??
    getBestPublicCardImageUrl(input.image_url) ??
    getBestPublicCardImageUrl(input.image_alt_url) ??
    getBestPublicCardImageUrl(input.representative_image_url) ??
    null
  );
}
