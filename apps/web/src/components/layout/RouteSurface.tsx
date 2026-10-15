"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type RouteFamily = "discovery" | "collections" | "account" | "utility";

type FamilyConfig = {
  key: RouteFamily;
  label: string;
  description: string;
  routes: Array<{ href: string; label: string }>;
};

const FAMILY_CONFIGS: Record<RouteFamily, FamilyConfig> = {
  discovery: {
    key: "discovery",
    label: "Discovery",
    description: "Find cards, people, and conversations.",
    routes: [
      { href: "/explore", label: "Explore" },
      { href: "/following", label: "Following" },
      { href: "/wall", label: "Wall" },
      { href: "/network", label: "Network" },
    ],
  },
  collections: {
    key: "collections",
    label: "Collections",
    description: "Organize the cards worth keeping.",
    routes: [
      { href: "/vault", label: "Vault" },
      { href: "/binders", label: "Binders" },
      { href: "/sets", label: "Sets" },
      { href: "/dex", label: "Dex" },
    ],
  },
  account: {
    key: "account",
    label: "Account",
    description: "Your profile, access, and support.",
    routes: [
      { href: "/account", label: "Settings" },
      { href: "/early-access", label: "Early access" },
      { href: "/support", label: "Support" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
  utility: {
    key: "utility",
    label: "Tools",
    description: "Compare, identify, and contribute.",
    routes: [
      { href: "/compare", label: "Compare" },
      { href: "/scan", label: "Scan" },
      { href: "/submit", label: "Submit" },
    ],
  },
};

function matches(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function getFamily(pathname: string): FamilyConfig | null {
  if (matches(pathname, "/explore") || matches(pathname, "/following") || matches(pathname, "/wall") || matches(pathname, "/network") || matches(pathname, "/u")) {
    return FAMILY_CONFIGS.discovery;
  }
  if (matches(pathname, "/vault") || matches(pathname, "/binders") || matches(pathname, "/binder-templates") || matches(pathname, "/sets") || matches(pathname, "/set") || matches(pathname, "/dex") || matches(pathname, "/gvvi")) {
    return FAMILY_CONFIGS.collections;
  }
  if (matches(pathname, "/account") || matches(pathname, "/early-access") || matches(pathname, "/support") || matches(pathname, "/privacy") || matches(pathname, "/legal")) {
    return FAMILY_CONFIGS.account;
  }
  if (matches(pathname, "/compare") || matches(pathname, "/scan") || matches(pathname, "/submit") || matches(pathname, "/review/visual-search")) {
    return FAMILY_CONFIGS.utility;
  }
  return null;
}

function getCanonicalRouteHref(pathname: string, family: RouteFamily) {
  if (family !== "collections") return null;
  if (matches(pathname, "/binder-templates")) return "/binders";
  if (matches(pathname, "/set")) return "/sets";
  if (matches(pathname, "/gvvi")) return "/vault";
  return null;
}

export function RouteSurface({
  children,
  bindersEnabled = false,
  dexEnabled = false,
}: {
  children: ReactNode;
  bindersEnabled?: boolean;
  dexEnabled?: boolean;
}) {
  const pathname = usePathname() || "/";
  const family = getFamily(pathname);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/navigation/shell", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json().catch(() => null)) as { isAuthenticated?: boolean } | null;
      })
      .then((payload) => {
        if (!cancelled) setIsAuthenticated(payload?.isAuthenticated === true);
      })
      .catch(() => {
        if (!cancelled) setIsAuthenticated(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const routes = useMemo(() => {
    if (!family) return [];
    return family.routes.filter((route) => {
      if (route.href === "/binders") return bindersEnabled && isAuthenticated;
      if (route.href === "/dex") return dexEnabled;
      return true;
    });
  }, [bindersEnabled, dexEnabled, family, isAuthenticated]);
  const canonicalRouteHref = family ? getCanonicalRouteHref(pathname, family.key) : null;

  return (
    <div className="gv-route-surface" data-route-family={family?.key ?? "none"}>
      {family ? (
        <div className="gv-route-family-rail" data-route-family-rail>
          <div className="gv-route-family-rail-inner">
            <div className="gv-route-family-copy">
              <span className="gv-route-family-label">{family.label}</span>
              <span className="gv-route-family-description">{family.description}</span>
            </div>
            <nav aria-label={`${family.label} navigation`} className="gv-route-family-nav">
              {routes.map((route) => {
                const active = canonicalRouteHref
                  ? route.href === canonicalRouteHref
                  : matches(pathname, route.href);
                return (
                  <Link key={route.href} href={route.href} aria-current={active ? "page" : undefined}>
                    {route.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
      {children}
    </div>
  );
}

export default RouteSurface;
