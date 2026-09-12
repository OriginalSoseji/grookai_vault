type CatalogVisibilityResult = { data: unknown; error: unknown };

export function catalogSearchAccess(result: CatalogVisibilityResult, authenticated: boolean) {
  if (result.error || typeof result.data !== "boolean") {
    return { allowed: false, status: 503, error: "Catalog search is temporarily unavailable." };
  }
  if (result.data) return { allowed: true, status: 200, error: null };
  return {
    allowed: false,
    status: authenticated ? 403 : 401,
    error: authenticated ? "This catalog is not available." : "Sign in to search this catalog.",
  };
}
