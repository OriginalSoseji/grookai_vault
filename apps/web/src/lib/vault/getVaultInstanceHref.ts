export function getVaultInstanceHref(
  gvviId: string | null | undefined,
  viewerUserId: string | null | undefined,
  ownerUserId: string | null | undefined,
): string | null {
  if (typeof gvviId !== "string") {
    return null;
  }

  const normalizedGvviId = gvviId.trim();
  if (!normalizedGvviId) {
    return null;
  }

  const normalizedViewerUserId =
    typeof viewerUserId === "string" && viewerUserId.trim().length > 0 ? viewerUserId.trim() : null;
  const normalizedOwnerUserId =
    typeof ownerUserId === "string" && ownerUserId.trim().length > 0 ? ownerUserId.trim() : null;

  const basePath =
    normalizedViewerUserId && normalizedOwnerUserId && normalizedViewerUserId === normalizedOwnerUserId
      ? "/vault/gvvi"
      : "/gvvi";

  return `${basePath}/${encodeURIComponent(normalizedGvviId)}`;
}
