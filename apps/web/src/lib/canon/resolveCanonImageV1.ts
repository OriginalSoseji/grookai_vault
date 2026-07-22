import "server-only";

import {
  getBestPublicCardImageUrl,
  isExternalCompatibleCardImageSource,
  isIdentityCardImageSource,
} from "@/lib/publicCardImage";
import { buildCanonCardImageProxyUrl, buildCanonImageProxyUrl } from "@/lib/canon/canonImageProxy";

export type CanonImageLike = {
  gv_id?: string | null;
  printing_gv_id?: string | null;
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
    const proxyUrl = buildCanonCardImageProxyUrl(cardPrint?.gv_id ?? cardPrint?.printing_gv_id) ?? buildCanonImageProxyUrl(imagePath);
    if (proxyUrl) {
      return {
        url: proxyUrl,
        source: "identity",
        image_path: imagePath,
      };
    }

    return {
      url: null,
      source: "none",
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
