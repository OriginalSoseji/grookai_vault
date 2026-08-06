export const DESKTOP_PRIMARY_NAV = [
  { key: "pulse", label: "Pulse", href: "/network" },
  { key: "wall", label: "Wall", href: "/wall" },
  { key: "scan", label: "Scan", href: "/scan" },
  { key: "vault", label: "Vault", href: "/vault" },
  { key: "search", label: "Search", href: "/explore" },
] as const;

export const DESKTOP_SECONDARY_NAV = [
  { key: "sets", label: "Sets", href: "/sets" },
  { key: "dex", label: "Dex", href: "/dex" },
  { key: "compare", label: "Compare", href: "/compare" },
  { key: "binders", label: "Binders", href: "/binders" },
  { key: "messages", label: "Messages", href: "/network/inbox" },
] as const;

export type DesktopPrimaryNavKey = (typeof DESKTOP_PRIMARY_NAV)[number]["key"];
export type DesktopSecondaryNavKey = (typeof DESKTOP_SECONDARY_NAV)[number]["key"];
export type DesktopWallAvailability = "signed_out" | "public" | "setup" | "unavailable";

export type DesktopRouteContext = {
  parentLabel: string;
  parentHref: string;
  currentLabel: string;
};

export type DesktopRouteState = {
  activePrimary: DesktopPrimaryNavKey | null;
  activeSecondary: DesktopSecondaryNavKey | null;
  context: DesktopRouteContext | null;
};

function normalizePathname(pathname: string) {
  const withoutQueryOrHash = pathname.split(/[?#]/, 1)[0] || "/";
  return withoutQueryOrHash.length > 1
    ? withoutQueryOrHash.replace(/\/+$/, "")
    : withoutQueryOrHash;
}

function matchesRoute(pathname: string, root: string) {
  return pathname === root || pathname.startsWith(`${root}/`);
}

function childContext(
  pathname: string,
  root: string,
  parentLabel: string,
  currentLabel: string,
): DesktopRouteContext | null {
  return pathname !== root && pathname.startsWith(`${root}/`)
    ? { parentLabel, parentHref: root, currentLabel }
    : null;
}

export function getDesktopRouteState(rawPathname: string): DesktopRouteState {
  const pathname = normalizePathname(rawPathname);

  let activeSecondary: DesktopSecondaryNavKey | null = null;
  if (matchesRoute(pathname, "/network/inbox")) activeSecondary = "messages";
  else if (matchesRoute(pathname, "/binders") || matchesRoute(pathname, "/binder-templates")) activeSecondary = "binders";
  else if (matchesRoute(pathname, "/sets") || matchesRoute(pathname, "/set")) activeSecondary = "sets";
  else if (matchesRoute(pathname, "/dex")) activeSecondary = "dex";
  else if (matchesRoute(pathname, "/compare")) activeSecondary = "compare";

  let activePrimary: DesktopPrimaryNavKey | null = null;
  if (matchesRoute(pathname, "/network")) activePrimary = "pulse";
  else if (matchesRoute(pathname, "/wall") || matchesRoute(pathname, "/u")) activePrimary = "wall";
  else if (matchesRoute(pathname, "/scan") || matchesRoute(pathname, "/vault/import")) activePrimary = "scan";
  else if (matchesRoute(pathname, "/vault") || matchesRoute(pathname, "/binders") || matchesRoute(pathname, "/binder-templates")) activePrimary = "vault";
  else if (
    matchesRoute(pathname, "/explore") ||
    matchesRoute(pathname, "/search") ||
    matchesRoute(pathname, "/card") ||
    matchesRoute(pathname, "/sets") ||
    matchesRoute(pathname, "/set") ||
    matchesRoute(pathname, "/dex") ||
    matchesRoute(pathname, "/compare")
  ) activePrimary = "search";

  const context =
    childContext(pathname, "/binders", "Binders", "Binder workspace") ??
    childContext(pathname, "/binder-templates", "Binders", "Binder template") ??
    childContext(pathname, "/sets", "Sets", "Set detail") ??
    childContext(pathname, "/set", "Sets", "Set detail") ??
    childContext(pathname, "/dex", "Dex", "Pokémon detail") ??
    childContext(pathname, "/card", "Search", "Card detail") ??
    childContext(pathname, "/vault/card", "Vault", "Card copies") ??
    childContext(pathname, "/vault/gvvi", "Vault", "Exact copy") ??
    childContext(pathname, "/gvvi", "Vault", "Exact copy") ??
    childContext(pathname, "/network/inbox", "Pulse", "Messages") ??
    null;

  return { activePrimary, activeSecondary, context };
}
