import "server-only";

import { resolveCanonImageV1, type CanonImageLike } from "@/lib/canon/resolveCanonImageV1";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";

export type CardDisplayImageKind = "exact" | "representative" | "missing";

export type CardImageLike = CanonImageLike & {
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
  "missing",
  "unresolved",
]);

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

export async function resolveCardImageFieldsV1(
  cardPrint: CardImageLike | null | undefined,
): Promise<ResolvedCardImageFieldsV1> {
  const exactImage = await resolveCanonImageV1(cardPrint);
  const exactImageUrl = exactImage.url ?? null;
  const representativeImageUrl = normalizeRepresentativeImageUrl(cardPrint?.representative_image_url);
  const imageStatus = normalizeImageStatus(
    cardPrint?.image_status,
    exactImageUrl,
    representativeImageUrl,
  );
  const imageNote = normalizeTextOrNull(cardPrint?.image_note);
  const imageSource = normalizeTextOrNull(cardPrint?.image_source);

  if (exactImageUrl) {
    return {
      image_url: exactImageUrl,
      representative_image_url: representativeImageUrl,
      image_status: imageStatus,
      image_note: imageNote,
      image_source: imageSource,
      display_image_url: exactImageUrl,
      display_image_kind: "exact",
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
