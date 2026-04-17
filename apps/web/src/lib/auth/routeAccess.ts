export const PROTECTED_ROUTE_MATCHER = [
  "/account/:path*",
  "/following/:path*",
  "/founder/:path*",
  "/network/inbox/:path*",
  "/submit/:path*",
  "/vault/:path*",
  "/wall/:path*",
] as const;

const PROTECTED_ROUTE_PREFIXES = [
  "/account",
  "/following",
  "/founder",
  "/network/inbox",
  "/submit",
  "/vault",
  "/wall",
] as const;

export function normalizeNextPath(pathname: string, search = "") {
  const normalizedPath = pathname.trim().startsWith("/") ? pathname.trim() : `/${pathname.trim()}`;
  const normalizedSearch = search.trim();

  if (!normalizedSearch) {
    return normalizedPath;
  }

  return `${normalizedPath}${normalizedSearch.startsWith("?") ? normalizedSearch : `?${normalizedSearch}`}`;
}

export function buildLoginHref(nextPath: string) {
  return `/login?next=${encodeURIComponent(nextPath)}`;
}

export function isProtectedRoute(pathname: string) {
  const normalizedPath = pathname.trim().replace(/\/+$/, "") || "/";

  return PROTECTED_ROUTE_PREFIXES.some((prefix) => {
    if (normalizedPath === prefix) {
      return true;
    }

    return normalizedPath.startsWith(`${prefix}/`);
  });
}
