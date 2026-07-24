export const MOBILE_PARITY_BREAKPOINT_PX = 900;

export const MOBILE_PRIMARY_DOCK = [
  {
    key: "pulse",
    label: "Pulse",
    href: "/network",
    kind: "root",
  },
  {
    key: "wall",
    label: "Wall",
    href: "/wall",
    kind: "root",
  },
  {
    key: "scan",
    label: "Scan",
    href: "/scan",
    kind: "action",
  },
  {
    key: "vault",
    label: "Vault",
    href: "/vault",
    kind: "root",
  },
  {
    key: "search",
    label: "Search",
    href: "/explore",
    kind: "root",
  },
] as const;

export type MobilePrimaryDockItem = (typeof MOBILE_PRIMARY_DOCK)[number];
export type MobilePrimaryDockKey = MobilePrimaryDockItem["key"];

const MOBILE_FULLSCREEN_ROUTES = ["/scan", "/vault/import"] as const;
const MOBILE_BINDER_PUSHED_PREFIXES = [
  "/binders",
  "/binder-templates",
] as const;
const MOBILE_BINDER_STANDALONE_SECRET_PREFIXES = [
  "/b",
  "/binder-invites",
] as const;

export type MobileRouteChromeMode =
  | "root"
  | "pushed"
  | "fullscreen"
  | "standalone_secret";

function normalizePathname(pathname: string) {
  const withoutQueryOrHash = pathname.split(/[?#]/, 1)[0] || "/";
  return withoutQueryOrHash.length > 1
    ? withoutQueryOrHash.replace(/\/+$/, "")
    : withoutQueryOrHash;
}

function matchesRoutePrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * This first production integration is deliberately bounded to the route
 * families explicitly approved for Scan/import and Collaborative Binders.
 * Other route families retain their existing chrome until their parity phase.
 */
export function getMobileRouteChromeMode(
  pathname: string,
): MobileRouteChromeMode {
  const normalizedPathname = normalizePathname(pathname);

  if (
    (MOBILE_FULLSCREEN_ROUTES as readonly string[]).includes(
      normalizedPathname,
    )
  ) {
    return "fullscreen";
  }

  if (
    MOBILE_BINDER_PUSHED_PREFIXES.some((prefix) =>
      matchesRoutePrefix(normalizedPathname, prefix),
    )
  ) {
    return "pushed";
  }

  if (
    MOBILE_BINDER_STANDALONE_SECRET_PREFIXES.some((prefix) =>
      matchesRoutePrefix(normalizedPathname, prefix),
    )
  ) {
    return "standalone_secret";
  }

  return "root";
}

export function shouldSuppressMobileChrome(pathname: string) {
  return getMobileRouteChromeMode(pathname) !== "root";
}

export const MOBILE_PARITY_SCENARIOS = [
  "pulse-empty",
  "wall-populated",
  "scan-ready",
  "vault-populated",
  "search-discovery",
  "menu-open",
] as const;

export type MobileParityScenario = (typeof MOBILE_PARITY_SCENARIOS)[number];

export function isMobileParityScenario(
  value: string,
): value is MobileParityScenario {
  return (MOBILE_PARITY_SCENARIOS as readonly string[]).includes(value);
}
