export function isUsablePublicImageUrl(value: string | null | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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
