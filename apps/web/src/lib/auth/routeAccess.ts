import { isBinderSecretPath } from "@/lib/binders/safePath";

export const PROTECTED_ROUTE_MATCHER = [
  "/account/:path*",
  "/following/:path*",
  "/founder/:path*",
  "/network/inbox/:path*",
  "/review/:path*",
  "/submit/:path*",
  "/vault/:path*",
  "/wall/:path*",
] as const;

const PROTECTED_ROUTE_PREFIXES = [
  "/account",
  "/following",
  "/founder",
  "/network/inbox",
  "/review",
  "/submit",
  "/vault",
  "/wall",
] as const;

const PROTECTED_EXACT_ROUTES = ["/binders", "/binders/new"] as const;

const PUBLIC_ROUTE_EXCEPTIONS = ["/account/delete"] as const;

export function normalizeNextPath(pathname: string, search = "") {
  const normalizedPath = pathname.trim().startsWith("/") ? pathname.trim() : `/${pathname.trim()}`;
  const normalizedSearch = search.trim();

  if (!normalizedSearch) {
    return normalizedPath;
  }

  return `${normalizedPath}${normalizedSearch.startsWith("?") ? normalizedSearch : `?${normalizedSearch}`}`;
}

export function getSafePostAuthPath(
  candidate?: string | null,
  fallback = "/vault",
) {
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\")
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, "https://grookaivault.com");
    if (parsed.origin !== "https://grookaivault.com") {
      return fallback;
    }
    const safePath = `${parsed.pathname}${parsed.search}`;
    const isTokenFreeInvitationReview =
      parsed.pathname === "/binder-invites/review" &&
      !parsed.search &&
      !parsed.hash;
    return isBinderSecretPath(safePath) && !isTokenFreeInvitationReview
      ? fallback
      : safePath;
  } catch {
    return fallback;
  }
}

export function buildLoginHref(nextPath: string) {
  const safeNextPath = getSafePostAuthPath(nextPath, "");
  if (!safeNextPath) {
    return "/login";
  }
  return `/login?next=${encodeURIComponent(safeNextPath)}`;
}

export function isProtectedRoute(pathname: string) {
  const normalizedPath = pathname.trim().replace(/\/+$/, "") || "/";

  if (PUBLIC_ROUTE_EXCEPTIONS.includes(normalizedPath as (typeof PUBLIC_ROUTE_EXCEPTIONS)[number])) {
    return false;
  }

  if (PROTECTED_EXACT_ROUTES.includes(normalizedPath as (typeof PROTECTED_EXACT_ROUTES)[number])) {
    return true;
  }

  return PROTECTED_ROUTE_PREFIXES.some((prefix) => {
    if (normalizedPath === prefix) {
      return true;
    }

    return normalizedPath.startsWith(`${prefix}/`);
  });
}
