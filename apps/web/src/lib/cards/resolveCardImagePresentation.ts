export type CardImagePresentationInput = {
  display_image_kind?: string | null;
  image_status?: string | null;
  image_note?: string | null;
};

export type ResolvedCardImagePresentation = {
  displayImageKind: "exact" | "representative" | "missing";
  imageStatus: string | null;
  imageNote: string | null;
  isRepresentative: boolean;
  isCollisionRepresentative: boolean;
  compactBadgeLabel: string | null;
  detailBadgeLabel: string | null;
  detailNote: string | null;
};

const DEFAULT_COLLISION_NOTE =
  "Identity is confirmed. The displayed image is a shared representative image until the exact variant image is available.";

function normalizeTextOrNull(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeLowerOrNull(value: string | null | undefined) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : null;
}

export function resolveCardImagePresentation(
  card: CardImagePresentationInput | null | undefined,
): ResolvedCardImagePresentation {
  const imageStatus = normalizeLowerOrNull(card?.image_status);
  const imageNote = normalizeTextOrNull(card?.image_note);
  const rawDisplayKind = normalizeLowerOrNull(card?.display_image_kind);
  const displayImageKind =
    rawDisplayKind === "exact" || rawDisplayKind === "representative" || rawDisplayKind === "missing"
      ? rawDisplayKind
      : imageStatus?.startsWith("representative_")
        ? "representative"
        : "missing";
  const isRepresentative = displayImageKind === "representative";
  const isCollisionRepresentative = imageStatus === "representative_shared_collision";

  if (!isRepresentative) {
    return {
      displayImageKind,
      imageStatus,
      imageNote,
      isRepresentative: false,
      isCollisionRepresentative: false,
      compactBadgeLabel: null,
      detailBadgeLabel: null,
      detailNote: null,
    };
  }

  if (isCollisionRepresentative) {
    return {
      displayImageKind,
      imageStatus,
      imageNote,
      isRepresentative: true,
      isCollisionRepresentative: true,
      compactBadgeLabel: "Exact Variant Image Pending",
      detailBadgeLabel: "Exact Variant Image Pending",
      detailNote: imageNote ?? DEFAULT_COLLISION_NOTE,
    };
  }

  return {
    displayImageKind,
    imageStatus,
    imageNote,
    isRepresentative: true,
    isCollisionRepresentative: false,
    compactBadgeLabel: "Shared Preview",
    detailBadgeLabel: "Representative Image",
    detailNote: imageNote,
  };
}

export function getCardImageAltText(
  baseAlt: string,
  card: CardImagePresentationInput | null | undefined,
) {
  const presentation = resolveCardImagePresentation(card);
  if (!presentation.isRepresentative) {
    return baseAlt;
  }

  return presentation.isCollisionRepresentative
    ? `${baseAlt} representative image. Exact variant image pending.`
    : `${baseAlt} representative image.`;
}
