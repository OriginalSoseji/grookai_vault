"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
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

const COLLECTION_LOGOS = ["base1", "ex16", "base6", "sv08", "cel25"];

function CollectionComposition() {
  return (
    <section className="gv-route-composition gv-route-composition-collections" aria-labelledby="collection-composition-title">
      <div className="gv-route-composition-main">
        <div className="gv-composition-kicker">Your collection</div>
        <h1 id="collection-composition-title">Modern favorites, kept in one place.</h1>
        <p>Build a visual Vault that feels more like a binder than a database.</p>
        <div className="gv-composition-actions">
          <Link href="/vault" className="gv-composition-primary">Open Vault</Link>
          <Link href="/binders" className="gv-composition-secondary">View binders</Link>
        </div>
        <div className="gv-composition-metrics" aria-label="Collection summary">
          <div><strong>Cards</strong><span>in your Vault</span></div>
          <div><strong>Sets</strong><span>to explore next</span></div>
          <div><strong>Value</strong><span>track every change</span></div>
        </div>
      </div>
      <div className="gv-binder-preview" aria-label="Binder preview">
        <div className="gv-binder-cover">
          <span className="gv-binder-cover-title">Modern<br />Favorites</span>
          <span className="gv-binder-cover-mark">GV</span>
        </div>
        <div className="gv-binder-strip">
          {COLLECTION_LOGOS.map((logo) => (
            <Image key={logo} src={`/set-logos/${logo}.png`} alt="" width={68} height={68} />
          ))}
        </div>
      </div>
    </section>
  );
}

function DexComposition() {
  const starters = ["Bulbasaur", "Charmander", "Squirtle", "Pikachu"];
  return (
    <section className="gv-route-composition gv-route-composition-dex" aria-labelledby="dex-composition-title">
      <div className="gv-dex-composition-copy">
        <div className="gv-composition-kicker">Grookai Dex</div>
        <h1 id="dex-composition-title">Collect every Pokémon, one exact printing at a time.</h1>
        <p>Search a character and see what your Vault already owns, plus the exact gaps left to collect.</p>
        <form action="/dex" className="gv-dex-composition-search">
          <label htmlFor="gv-dex-composition-query" className="sr-only">Search Pokémon character</label>
          <input id="gv-dex-composition-query" name="q" type="search" placeholder="Search Pikachu, Gengar, #025…" autoComplete="off" />
          <button type="submit" aria-label="Search Dex">⌕</button>
        </form>
      </div>
      <div className="gv-dex-progress-panel">
        <div className="gv-dex-progress-head"><span>Collection progress</span><strong>161 <small>of 40,829</small></strong></div>
        <div className="gv-dex-progress-bar"><span /></div>
        <div className="gv-dex-progress-meta"><span>0.4% complete</span><span>Vault-aware</span></div>
        <div className="gv-dex-starter-rail">
          {starters.map((starter, index) => (
            <div key={starter} className={`gv-dex-starter gv-dex-starter-${index + 1}`}><span>{starter.slice(0, 1)}</span><small>{starter}</small></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DiscoveryComposition() {
  return (
    <section className="gv-route-composition gv-route-composition-discovery" aria-labelledby="discovery-composition-title">
      <div className="gv-route-composition-main">
        <div className="gv-composition-kicker">Collector activity</div>
        <h1 id="discovery-composition-title">Find the cards worth talking about.</h1>
        <p>See what collectors are adding, trading, and saving right now.</p>
        <div className="gv-composition-actions">
          <Link href="/explore" className="gv-composition-primary">Explore cards</Link>
          <Link href="/wall" className="gv-composition-secondary">Open your Wall</Link>
        </div>
      </div>
      <div className="gv-activity-preview">
        <div className="gv-activity-preview-head"><span className="gv-avatar-dot" /> <span>recent additions</span><b>•••</b></div>
        <div className="gv-activity-card-art gv-activity-card-art-a" />
        <div className="gv-activity-card-art gv-activity-card-art-b" />
        <div className="gv-activity-preview-foot"><strong>Browse the community</strong><span>New cards from collectors you follow</span></div>
      </div>
    </section>
  );
}

function PulseComposition() {
  return (
    <section className="gv-route-composition gv-route-composition-pulse" aria-labelledby="pulse-composition-title">
      <div className="gv-pulse-feed-preview">
        <div className="gv-composition-kicker">Collector activity</div>
        <h1 id="pulse-composition-title">See what the community is collecting.</h1>
        <p>Follow new additions, trade ideas, and the cards moving through your network.</p>
        <div className="gv-pulse-feed-items">
          <div className="gv-pulse-feed-item"><span className="gv-avatar-dot" /><div><strong>cardboard_king added a card</strong><small>Charizard ex · 2 min ago</small></div><span className="gv-pulse-mini-art gv-pulse-mini-art-a" /></div>
          <div className="gv-pulse-feed-item"><span className="gv-avatar-dot gv-avatar-dot-blue" /><div><strong>maria.collects opened a binder</strong><small>Modern favorites · 18 min ago</small></div><span className="gv-pulse-mini-art gv-pulse-mini-art-b" /></div>
        </div>
      </div>
      <aside className="gv-pulse-profile-preview">
        <div className="gv-pulse-profile-avatar">G</div>
        <strong>Your collector profile</strong>
        <span>Make your Wall a place people want to visit.</span>
        <div className="gv-pulse-profile-stats"><b>0 <small>cards</small></b><b>0 <small>followers</small></b><b>0 <small>following</small></b></div>
        <Link href="/wall" className="gv-composition-secondary">Open your Wall</Link>
      </aside>
    </section>
  );
}

function WallComposition() {
  const cards = ["gv-wall-art-a", "gv-wall-art-b", "gv-wall-art-c", "gv-wall-art-d"];
  return (
    <section className="gv-route-composition gv-route-composition-wall" aria-labelledby="wall-composition-title">
      <div className="gv-wall-profile-head">
        <div className="gv-wall-avatar">C</div>
        <div className="gv-wall-profile-copy">
          <div className="gv-composition-kicker">Your Wall</div>
          <h1 id="wall-composition-title">A collection worth coming back to.</h1>
          <span>@collector</span>
          <div className="gv-wall-stats"><b>29 <small>cards</small></b><b>38 <small>followers</small></b><b>12 <small>following</small></b></div>
        </div>
        <div className="gv-wall-profile-actions"><Link href="/wall">Share</Link><Link href="/account">Edit</Link></div>
      </div>
      <div className="gv-wall-tabs" role="tablist" aria-label="Wall sections">
        <button type="button" role="tab" aria-selected="true" className="is-active">Wall</button>
        <button type="button" role="tab" aria-selected="false">Favorites</button>
        <button type="button" role="tab" aria-selected="false">For sale / trade</button>
      </div>
      <div className="gv-wall-card-grid" aria-label="Featured cards">{cards.map((className) => <span key={className} className={`gv-wall-art ${className}`} />)}</div>
    </section>
  );
}

function UtilityComposition({ pathname }: { pathname: string }) {
  const activeTool = matches(pathname, "/scan") ? "scan" : matches(pathname, "/submit") ? "submit" : "compare";
  const copy = activeTool === "scan"
    ? { kicker: "Visual search", title: "Identify the card in front of you.", description: "Use a quick scan to find the right character, set, and printing." }
    : activeTool === "submit"
      ? { kicker: "Catalog contribution", title: "Help complete the catalog.", description: "Submit missing images and exact-printing evidence for other collectors." }
      : { kicker: "Side-by-side tools", title: "The right tool for the next card.", description: "Compare, identify, and contribute without losing your place." };
  const tools = [
    { href: "/compare", label: "Compare", copy: "See two printings side by side.", className: "gv-tool-card-compare" },
    { href: "/scan", label: "Scan", copy: "Identify a card in seconds.", className: "gv-tool-card-scan" },
    { href: "/submit", label: "Submit", copy: "Help complete the catalog.", className: "gv-tool-card-submit" },
  ];
  return (
    <section className={`gv-route-composition gv-route-composition-utility gv-route-composition-utility-${activeTool}`} aria-labelledby="utility-composition-title">
      <div className="gv-route-composition-main">
        <div className="gv-composition-kicker">{copy.kicker}</div>
        <h1 id="utility-composition-title">{copy.title}</h1>
        <p>{copy.description}</p>
      </div>
      <div className="gv-utility-tool-grid">
        {tools.map((tool) => (
          <Link href={tool.href} key={tool.href} aria-current={activeTool === tool.href.slice(1) ? "page" : undefined} className={`gv-utility-tool-card ${tool.className} ${activeTool === tool.href.slice(1) ? "is-active" : ""}`}>
            <span className="gv-tool-card-icon" aria-hidden="true" />
            <strong>{tool.label}</strong>
            <span>{tool.copy}</span>
            <em>Open tool →</em>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AccountComposition() {
  return (
    <section className="gv-route-composition gv-route-composition-account" aria-labelledby="account-composition-title">
      <div className="gv-route-composition-main">
        <div className="gv-composition-kicker">Your Grookai account</div>
        <h1 id="account-composition-title">Everything about your Vault, in control.</h1>
        <p>Manage access, profile details, and the support you need.</p>
      </div>
      <div className="gv-account-preview"><span>Account center</span><strong>Private by default.</strong><small>Simple controls for a focused collecting experience.</small></div>
    </section>
  );
}

function RouteComposition({ family, pathname }: { family: FamilyConfig; pathname: string }) {
  if (matches(pathname, "/dex")) return <DexComposition />;
  if (matches(pathname, "/network")) return <PulseComposition />;
  if (matches(pathname, "/wall")) return <WallComposition />;
  if (family.key === "collections") return <CollectionComposition />;
  if (family.key === "discovery") return <DiscoveryComposition />;
  if (family.key === "utility") return <UtilityComposition pathname={pathname} />;
  if (family.key === "account") return <AccountComposition />;
  return null;
}

function shouldShowRouteComposition(pathname: string, family: FamilyConfig) {
  // Landing compositions orient users at a section boundary. Detail routes
  // should get to the requested object immediately instead of repeating the
  // section marketing panel above the actual content.
  return family.routes.some((route) => pathname === route.href);
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
      {family && shouldShowRouteComposition(pathname, family) ? <RouteComposition family={family} pathname={pathname} /> : null}
      {children}
    </div>
  );
}

export default RouteSurface;
