export const WAREHOUSE_CANON_IMAGE_PREFIX = "warehouse-derived/self-hosted-images-v1/";

export function normalizeWarehouseCanonImagePath(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.length > 512 ||
    normalized.includes("..") ||
    !normalized.startsWith(WAREHOUSE_CANON_IMAGE_PREFIX)
  ) {
    return null;
  }

  return normalized;
}

export function buildCanonImageProxyUrl(path: string | null | undefined) {
  const normalizedPath = normalizeWarehouseCanonImagePath(path);
  return normalizedPath ? `/api/canon/image?path=${encodeURIComponent(normalizedPath)}` : null;
}
