import "server-only";

import {
  getBestPublicCardImageUrl,
  isExternalCompatibleCardImageSource,
  isIdentityCardImageSource,
} from "@/lib/publicCardImage";
import { resolveVaultInstanceMediaUrl } from "@/lib/vault/resolveVaultInstanceMediaUrl";

export type CanonImageLike = {
  image_source?: string | null;
  image_path?: string | null;
  image_url?: string | null;
  image_alt_url?: string | null;
};

export type CanonImageResolutionV1 = {
  url: string | null;
  source: "identity" | "external" | "none";
  image_path: string | null;
};

function normalizeTextOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function resolveCanonImageV1(
  cardPrint: CanonImageLike | null | undefined,
): Promise<CanonImageResolutionV1> {
  const imageSource = normalizeTextOrNull(cardPrint?.image_source);
  const imagePath = normalizeTextOrNull(cardPrint?.image_path);
  const externalUrl = getBestPublicCardImageUrl(cardPrint?.image_url, cardPrint?.image_alt_url);

  if (isIdentityCardImageSource(imageSource) && imagePath) {
    const signedUrl = await resolveVaultInstanceMediaUrl(imagePath);

    return {
      url: signedUrl,
      source: signedUrl ? "identity" : "none",
      image_path: imagePath,
    };
  }

  if (isIdentityCardImageSource(imageSource) && externalUrl) {
    return {
      url: externalUrl,
      source: "identity",
      image_path: null,
    };
  }

  if (isExternalCompatibleCardImageSource(imageSource) || !imageSource) {
    return {
      url: externalUrl ?? null,
      source: externalUrl ? "external" : "none",
      image_path: null,
    };
  }

  return {
    url: null,
    source: "none",
    image_path: imagePath,
  };
}

export async function resolveCanonImageUrlV1(cardPrint: CanonImageLike | null | undefined) {
  return (await resolveCanonImageV1(cardPrint)).url;
}
