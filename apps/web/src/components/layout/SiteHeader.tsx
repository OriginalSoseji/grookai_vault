"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MobileGlobalSearch } from "@/components/layout/MobileGlobalSearch";
import PersistentSearchBar, { PersistentSearchBarFallback } from "@/components/PersistentSearchBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { buildCompareHref, buildPathWithCompareCards, normalizeCompareCardsParam } from "@/lib/compareCards";

type SiteHeaderProps = {
  isAuthenticated: boolean;
  profileHref: string | null;
  networkUnreadCount: number;
  dexEnabled: boolean;
  bindersEnabled: boolean;
};

function NetworkLabel({ unreadCount }: { unreadCount: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>Pulse</span>
      {unreadCount > 0 ? (
        <span className="inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-950 ring-1 ring-emerald-200">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </span>
  );
}

export function SiteHeader({
  isAuthenticated,
  profileHref,
  networkUnreadCount,
  dexEnabled,
  bindersEnabled,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const compareCards = normalizeCompareCardsParam(searchParams.get("cards"));
  const compareCount = compareCards.length;
  const showTopSearch =
    pathname === "/explore" || pathname.startsWith("/search") || pathname.startsWith("/card/");
  const showMobileGlobalSearch =
    pathname === "/vault" ||
    pathname.startsWith("/vault/") ||
    pathname === "/explore" ||
    pathname.startsWith("/explore/") ||
    pathname === "/sets" ||
    pathname.startsWith("/sets/") ||
    pathname === "/dex" ||
    pathname.startsWith("/dex/") ||
    pathname === "/card" ||
    pathname.startsWith("/card/") ||
    pathname === "/compare" ||
    pathname.startsWith("/compare/") ||
    pathname === "/network" ||
    pathname.startsWith("/network/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/wall" ||
    pathname.startsWith("/wall/") ||
    pathname.startsWith("/u/") ||
    pathname === "/binders" ||
    pathname.startsWith("/binders/");
  const accountHref = isAuthenticated ? "/account" : "/login";
  const accountLabel = isAuthenticated ? "Account" : "Login";
  const primaryNav = [
    { href: buildPathWithCompareCards("/explore", "", compareCards), label: "Search", matchHref: "/explore" },
    { href: "/network", label: "Pulse", matchHref: "/network" },
    { href: "/vault/import", label: "Scan", matchHref: "/vault/import" },
    { href: "/wall", label: "Wall", matchHref: "/wall" },
    { href: "/vault", label: "Vault", matchHref: "/vault" },
    ...(isAuthenticated && bindersEnabled
      ? [{ href: "/binders", label: "Binders", matchHref: "/binders" }]
      : []),
  ];
  const utilityNav = [
    { href: buildPathWithCompareCards("/sets", "", compareCards), label: "Sets", matchHref: "/sets" },
    ...(dexEnabled ? [{ href: "/dex", label: "Dex", matchHref: "/dex" }] : []),
    { href: buildCompareHref(compareCards), label: compareCount > 0 ? `Compare (${compareCount})` : "Compare", matchHref: "/compare" },
  ];
  const mobileSectionLabel =
    pathname === "/vault" || pathname.startsWith("/vault/")
      ? pathname === "/vault/import" || pathname.startsWith("/vault/import/")
        ? "Scan"
        : "Vault"
      : pathname === "/account" || pathname.startsWith("/account/")
        ? "Profile"
        : pathname === "/binders" || pathname.startsWith("/binders/")
          ? "Binders"
        : pathname === "/network" || pathname.startsWith("/network/")
          ? "Pulse"
          : pathname === "/wall" || pathname.startsWith("/wall/") || pathname.startsWith("/u/")
            ? "Wall"
          : pathname === "/dex" || pathname.startsWith("/dex/")
            ? "Dex"
          : showTopSearch || pathname === "/sets" || pathname.startsWith("/sets/") || pathname === "/compare" || pathname.startsWith("/compare/")
            ? "Search"
            : "Grookai Vault";

  return (
    <header className="gv-site-header sticky top-0 z-50">
      <PageContainer className={showTopSearch ? "space-y-2.5 py-2.5 md:space-y-4 md:py-4" : "py-2.5 md:py-4"}>
        <div className="md:hidden">
          <div className="flex min-h-[46px] items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 text-[15px] font-semibold text-slate-950">
              <Image
                src="/grookai-logo-64.png"
                alt="Grookai Vault logo"
                width={28}
                height={28}
                className="gv-brand-mark"
              />
              <span className="truncate">Grookai Vault</span>
            </Link>

            <div className="flex shrink-0 items-center justify-end gap-1.5 pl-2">
              <span className="gv-mobile-secondary-action">
                <ThemeToggle />
              </span>
              <Link
                href="/network"
                className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  pathname === "/network" || pathname.startsWith("/network/")
                    ? "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-200"
                    : "bg-white/60 text-slate-600 ring-1 ring-slate-200/60 hover:bg-white hover:text-slate-950"
                }`}
              >
                <NetworkLabel unreadCount={networkUnreadCount} />
              </Link>
              <Link
                href={buildCompareHref(compareCards)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${compareCount > 0 ? "inline-flex" : "hidden"} ${
                  pathname === "/compare" || pathname.startsWith("/compare/")
                    ? "bg-amber-100 text-amber-950 ring-1 ring-amber-200"
                    : "bg-white/60 text-slate-600 ring-1 ring-slate-200/60 hover:bg-white hover:text-slate-950"
                }`}
              >
                {compareCount > 0 ? `Compare (${compareCount})` : "Compare"}
              </Link>
              {!isAuthenticated ? (
                <Link
                  href={accountHref}
                  className="shrink-0 rounded-full bg-white/68 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200/60 transition hover:bg-white"
                >
                  {accountLabel}
                </Link>
              ) : null}
              {isAuthenticated && bindersEnabled ? (
                <Link
                  href="/binders"
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    pathname === "/binders" || pathname.startsWith("/binders/")
                      ? "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-200"
                      : "bg-white/60 text-slate-600 ring-1 ring-slate-200/60 hover:bg-white hover:text-slate-950"
                  }`}
                >
                  Binders
                </Link>
              ) : null}
            </div>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">{mobileSectionLabel}</p>
          </div>
          {showMobileGlobalSearch ? (
            <div className="mt-2">
              <MobileGlobalSearch />
            </div>
          ) : null}
        </div>

        <div className="hidden min-h-[64px] flex-col justify-center gap-4 md:flex lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="flex items-center gap-3 text-lg font-semibold text-slate-950">
            <Image
              src="/grookai-logo-64.png"
              alt="Grookai Vault logo"
              width={36}
              height={36}
              className="gv-brand-mark"
            />
            <span>Grookai Vault</span>
          </Link>

          <div className="flex flex-col gap-4 lg:items-end">
            <nav className="flex flex-wrap items-center justify-end gap-2 text-sm">
              {primaryNav.map((item) => {
                const matchHref = item.matchHref;
                const isActive =
                  matchHref === "/vault"
                    ? pathname === "/vault" || (pathname.startsWith("/vault/") && !pathname.startsWith("/vault/import"))
                    : pathname === matchHref || pathname.startsWith(`${matchHref}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`gv-nav-link ${isActive ? "gv-nav-link-active" : ""}`}
                  >
                    {matchHref === "/network" ? <NetworkLabel unreadCount={networkUnreadCount} /> : item.label}
                  </Link>
                );
              })}
              <span className="mx-1 hidden h-5 w-px bg-slate-200/80 lg:inline-block dark:bg-slate-700/70" aria-hidden="true" />
              {utilityNav.map((item) => {
                const matchHref = item.matchHref;
                const isActive = pathname === matchHref || pathname.startsWith(`${matchHref}/`);
                const isCompareItem = matchHref === "/compare";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`gv-nav-link gv-nav-link-secondary ${
                      isActive
                        ? isCompareItem && compareCount > 0
                          ? "bg-amber-100 text-amber-950 shadow-sm ring-1 ring-amber-200"
                          : "gv-nav-link-active"
                        : ""
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              {isAuthenticated && profileHref ? (
                <Link href={profileHref} className="gv-nav-link">
                  Profile
                </Link>
              ) : null}
              <ThemeToggle />
              <Link
                href={accountHref}
                className="gv-secondary-button min-h-0 px-4 py-2 text-sm"
              >
                {accountLabel}
              </Link>
            </nav>
          </div>
        </div>
        {showTopSearch ? (
          <div className="hidden md:block">
            <Suspense fallback={<PersistentSearchBarFallback />}>
              <PersistentSearchBar />
            </Suspense>
          </div>
        ) : null}
      </PageContainer>
    </header>
  );
}
