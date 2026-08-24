export const WAREHOUSE_CANON_IMAGE_PREFIXES = [
  "warehouse-derived/self-hosted-images-v1/",
  "warehouse-derived/image-truth-v1/",
] as const;

export const WAREHOUSE_CANON_IMAGE_PREFIX = WAREHOUSE_CANON_IMAGE_PREFIXES[0];

const PRIVATE_CARD_IMAGE_BUCKET = "user-card-images";
const EXTERNAL_CARD_IMAGE_BUCKET = "external-card-images";
const ONE_PIECE_CARD_IMAGE_PATH =
  /^one-piece\/card-prints\/(?:official|tcgplayer)\/[1-9]\d*\/[0-9a-f]{32}\.(?:png|jpe?g|webp)$/i;
const SUPABASE_STORAGE_OBJECT_PREFIXES = [
  `/storage/v1/object/public/${PRIVATE_CARD_IMAGE_BUCKET}/`,
  `/storage/v1/object/sign/${PRIVATE_CARD_IMAGE_BUCKET}/`,
] as const;

export function normalizeWarehouseCanonImagePath(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.length > 512 ||
    normalized.includes("..") ||
    !WAREHOUSE_CANON_IMAGE_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  ) {
    return null;
  }

  return normalized;
}

export type CanonCardImageStorageLocation = {
  bucket: string;
  path: string;
};

export function resolveCanonCardImageStorageLocation(
  value: unknown,
): CanonCardImageStorageLocation | null {
  const warehousePath = normalizeWarehouseCanonImagePath(value);
  if (warehousePath) {
    return { bucket: PRIVATE_CARD_IMAGE_BUCKET, path: warehousePath };
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.length > 512 ||
    normalized.includes("..") ||
    !ONE_PIECE_CARD_IMAGE_PATH.test(normalized)
  ) {
    return null;
  }

  return { bucket: EXTERNAL_CARD_IMAGE_BUCKET, path: normalized };
}

export function buildCanonImageProxyUrl(path: string | null | undefined) {
  const normalizedPath = normalizeWarehouseCanonImagePath(path);
  return normalizedPath ? `/api/canon/image?path=${encodeURIComponent(normalizedPath)}` : null;
}

function parseSupabaseStorageUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value.trim());
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      !url.hostname.toLowerCase().endsWith(".supabase.co")
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

export function isPrivateCardImagePublicUrl(value: unknown) {
  const url = parseSupabaseStorageUrl(value);
  return Boolean(
    url &&
      url.pathname
        .toLowerCase()
        .startsWith(`/storage/v1/object/public/${PRIVATE_CARD_IMAGE_BUCKET}/`),
  );
}

export function extractWarehouseCanonImagePathFromStorageUrl(value: unknown) {
  const url = parseSupabaseStorageUrl(value);
  if (!url) {
    return null;
  }

  const lowerPathname = url.pathname.toLowerCase();
  const storagePrefix = SUPABASE_STORAGE_OBJECT_PREFIXES.find((prefix) =>
    lowerPathname.startsWith(prefix),
  );
  if (!storagePrefix) {
    return null;
  }

  try {
    const objectPath = decodeURIComponent(url.pathname.slice(storagePrefix.length));
    return normalizeWarehouseCanonImagePath(objectPath);
  } catch {
    return null;
  }
}

export function buildCanonImageProxyUrlFromStorageUrl(value: unknown) {
  return buildCanonImageProxyUrl(extractWarehouseCanonImagePathFromStorageUrl(value));
}

export function normalizeCanonImageGvId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized || normalized.length > 96 || !/^GV-[A-Z0-9_-]+$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export function buildCanonCardImageProxyUrl(gvId: string | null | undefined) {
  const normalizedGvId = normalizeCanonImageGvId(gvId);
  return normalizedGvId ? `/api/canon/cards/${encodeURIComponent(normalizedGvId)}/image` : null;
}

export function normalizeCanonCardImageProxyUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.trim().match(/^\/api\/canon\/cards\/([^/?#]+)\/image$/);
  if (!match) {
    return null;
  }

  try {
    return buildCanonCardImageProxyUrl(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}
