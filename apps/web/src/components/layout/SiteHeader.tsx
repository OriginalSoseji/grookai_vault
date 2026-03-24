"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MobileGlobalSearch } from "@/components/layout/MobileGlobalSearch";
import PersistentSearchBar, { PersistentSearchBarFallback } from "@/components/PersistentSearchBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { buildCompareHref, buildPathWithCompareCards, normalizeCompareCardsParam } from "@/lib/compareCards";

type SiteHeaderProps = {
  isAuthenticated: boolean;
  profileHref: string | null;
  networkUnreadCount: number;
};

function NetworkLabel({ unreadCount }: { unreadCount: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>Network</span>
      {unreadCount > 0 ? (
        <span className="inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-950 ring-1 ring-emerald-200">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </span>
  );
}

export function SiteHeader({ isAuthenticated, profileHref, networkUnreadCount }: SiteHeaderProps) {
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
    pathname.startsWith("/u/");
  const accountHref = isAuthenticated ? "/account" : "/login";
  const accountLabel = isAuthenticated ? "Account" : "Login";
  const primaryNav = [
    { href: buildPathWithCompareCards("/explore", "", compareCards), label: "Explore", matchHref: "/explore" },
    { href: buildPathWithCompareCards("/sets", "", compareCards), label: "Sets", matchHref: "/sets" },
    { href: "/network", label: "Network", matchHref: "/network" },
    { href: buildCompareHref(compareCards), label: compareCount > 0 ? `Compare (${compareCount})` : "Compare", matchHref: "/compare" },
    { href: "/vault", label: "Vault" },
  ];
  const mobileSectionLabel =
    pathname === "/vault" || pathname.startsWith("/vault/")
      ? "Vault"
      : pathname === "/account" || pathname.startsWith("/account/")
        ? "Profile"
        : pathname === "/network" || pathname.startsWith("/network/")
          ? "Network"
        : pathname === "/wall" || pathname.startsWith("/wall/") || pathname.startsWith("/u/")
          ? "Showcase"
          : showTopSearch || pathname === "/sets" || pathname.startsWith("/sets/") || pathname === "/compare" || pathname.startsWith("/compare/")
            ? "Discover"
            : "Grookai Vault";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <PageContainer className={showTopSearch ? "space-y-2.5 py-2.5 md:space-y-4 md:py-4" : "py-2.5 md:py-4"}>
        <div className="md:hidden">
          <div className="flex min-h-[46px] items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-slate-950">
              <Image
                src="/grookai-emblem-square.svg"
                alt="Grookai Vault logo"
                width={28}
                height={28}
                className="rounded-md"
              />
              <span className="truncate">Grookai Vault</span>
            </Link>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/network"
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  pathname === "/network" || pathname.startsWith("/network/")
                    ? "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-200"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                <NetworkLabel unreadCount={networkUnreadCount} />
              </Link>
              <Link
                href={buildCompareHref(compareCards)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  pathname === "/compare" || pathname.startsWith("/compare/")
                    ? "bg-amber-100 text-amber-950 ring-1 ring-amber-200"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                {compareCount > 0 ? `Compare (${compareCount})` : "Compare"}
              </Link>
              {!isAuthenticated ? (
                <Link
                  href={accountHref}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {accountLabel}
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
              src="/grookai-emblem-square.svg"
              alt="Grookai Vault logo"
              width={36}
              height={36}
              className="rounded-md"
            />
            <span>Grookai Vault</span>
          </Link>

          <div className="flex flex-col gap-4 lg:items-end">
            <nav className="flex flex-wrap items-center gap-2 text-sm">
              {primaryNav.map((item) => {
                const matchHref = "matchHref" in item ? item.matchHref : item.href;
                const isActive = pathname === matchHref || pathname.startsWith(`${matchHref}/`);
                const isCompareItem = matchHref === "/compare";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-3 py-2 transition-all duration-100 ${
                      isActive
                        ? isCompareItem && compareCount > 0
                          ? "bg-amber-100 text-amber-950 shadow-sm ring-1 ring-amber-200"
                          : "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                  >
                    {matchHref === "/network" ? <NetworkLabel unreadCount={networkUnreadCount} /> : item.label}
                  </Link>
                );
              })}
              {showTopSearch ? (
                <Link
                  href={buildPathWithCompareCards("/explore", "", compareCards)}
                  className="rounded-full px-3 py-2 text-slate-600 transition-all duration-100 hover:bg-slate-100 hover:text-slate-950"
                >
                  Search
                </Link>
              ) : null}
              {isAuthenticated && profileHref ? (
                <Link href={profileHref} className="rounded-full px-3 py-2 text-slate-600 transition-all duration-100 hover:bg-slate-100 hover:text-slate-950">
                  Profile
                </Link>
              ) : null}
              <Link
                href={accountHref}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 transition-all duration-100 hover:border-slate-300 hover:bg-slate-50"
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
