export type CardImagePresentationInput = {
  display_image_kind?: string | null;
  image_status?: string | null;
  image_note?: string | null;
};

export type ResolvedCardImagePresentation = {
  displayImageKind: "exact" | "representative" | "missing_variant_visual" | "missing" | "blocked";
  imageStatus: string | null;
  imageNote: string | null;
  isRepresentative: boolean;
  isMissingVariantVisual: boolean;
  isBlocked: boolean;
  isCollisionRepresentative: boolean;
  compactBadgeLabel: string | null;
  detailBadgeLabel: string | null;
  detailNote: string | null;
};

const DEFAULT_COLLISION_NOTE =
  "Identity is confirmed. The displayed image is a shared representative image until the exact variant image is available.";
const DEFAULT_REPRESENTATIVE_NOTE =
  "Correct printing. Image may not show exact finish, stamp, or parallel.";
const DEFAULT_MISSING_VARIANT_VISUAL_NOTE =
  "This is the printing, but not the correct variant image.";
const DEFAULT_BLOCKED_NOTE =
  "A possible image exists, but it needs verification before Grookai can use it.";

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
  const statusImpliesMissingVariantVisual =
    imageStatus === "missing_variant_visual" ||
    imageStatus === "representative_missing_variant_visual" ||
    imageStatus?.startsWith("missing_variant_") ||
    imageStatus?.startsWith("representative_missing_");
  const statusImpliesBlocked = imageStatus === "blocked" || imageStatus?.startsWith("blocked_");
  const displayImageKind =
    rawDisplayKind === "exact" ||
    rawDisplayKind === "representative" ||
    rawDisplayKind === "missing_variant_visual" ||
    rawDisplayKind === "missing" ||
    rawDisplayKind === "blocked"
      ? rawDisplayKind
      : statusImpliesBlocked
        ? "blocked"
        : statusImpliesMissingVariantVisual
          ? "missing_variant_visual"
          : imageStatus?.startsWith("representative_")
            ? "representative"
            : "missing";
  const isRepresentative = displayImageKind === "representative" || displayImageKind === "missing_variant_visual";
  const isMissingVariantVisual = displayImageKind === "missing_variant_visual";
  const isBlocked = displayImageKind === "blocked";
  const isCollisionRepresentative = imageStatus === "representative_shared_collision";

  if (isBlocked) {
    return {
      displayImageKind,
      imageStatus,
      imageNote,
      isRepresentative: false,
      isMissingVariantVisual: false,
      isBlocked: true,
      isCollisionRepresentative: false,
      compactBadgeLabel: "Image Under Review",
      detailBadgeLabel: "Image Under Review",
      detailNote: imageNote ?? DEFAULT_BLOCKED_NOTE,
    };
  }

  if (!isRepresentative) {
    return {
      displayImageKind,
      imageStatus,
      imageNote,
      isRepresentative: false,
      isMissingVariantVisual: false,
      isBlocked: false,
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
      isMissingVariantVisual: false,
      isBlocked: false,
      isCollisionRepresentative: true,
      compactBadgeLabel: "Exact Variant Image Pending",
      detailBadgeLabel: "Exact Variant Image Pending",
      detailNote: imageNote ?? DEFAULT_COLLISION_NOTE,
    };
  }

  if (isMissingVariantVisual) {
    return {
      displayImageKind,
      imageStatus,
      imageNote,
      isRepresentative: true,
      isMissingVariantVisual: true,
      isBlocked: false,
      isCollisionRepresentative: false,
      compactBadgeLabel: "Variant Image Pending",
      detailBadgeLabel: "Variant Image Pending",
      detailNote: imageNote ?? DEFAULT_MISSING_VARIANT_VISUAL_NOTE,
    };
  }

  return {
    displayImageKind,
    imageStatus,
    imageNote,
    isRepresentative: true,
    isMissingVariantVisual: false,
    isBlocked: false,
    isCollisionRepresentative: false,
    compactBadgeLabel: "Representative Image",
    detailBadgeLabel: "Representative Image",
    detailNote: imageNote ?? DEFAULT_REPRESENTATIVE_NOTE,
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
    : presentation.isMissingVariantVisual
      ? `${baseAlt} representative image. Variant image pending.`
    : `${baseAlt} representative image.`;
}
