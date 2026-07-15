export const WAREHOUSE_CANON_IMAGE_PREFIXES = [
  "warehouse-derived/self-hosted-images-v1/",
  "warehouse-derived/image-truth-v1/",
] as const;

export const WAREHOUSE_CANON_IMAGE_PREFIX = WAREHOUSE_CANON_IMAGE_PREFIXES[0];

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

export function buildCanonImageProxyUrl(path: string | null | undefined) {
  const normalizedPath = normalizeWarehouseCanonImagePath(path);
  return normalizedPath ? `/api/canon/image?path=${encodeURIComponent(normalizedPath)}` : null;
}

export function normalizeCanonImageGvId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized || normalized.length > 96 || !/^GV-[A-Z0-9-]+$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export function buildCanonCardImageProxyUrl(gvId: string | null | undefined) {
  const normalizedGvId = normalizeCanonImageGvId(gvId);
  return normalizedGvId ? `/api/canon/cards/${encodeURIComponent(normalizedGvId)}/image` : null;
}
