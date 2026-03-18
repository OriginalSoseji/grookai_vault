"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import PersistentSearchBar, { PersistentSearchBarFallback } from "@/components/PersistentSearchBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { buildCompareHref, buildPathWithCompareCards, normalizeCompareCardsParam } from "@/lib/compareCards";

type SiteHeaderProps = {
  isAuthenticated: boolean;
  profileHref: string | null;
};

export function SiteHeader({ isAuthenticated, profileHref }: SiteHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const compareCards = normalizeCompareCardsParam(searchParams.get("cards"));
  const compareCount = compareCards.length;
  const showTopSearch =
    pathname === "/explore" || pathname.startsWith("/search") || pathname.startsWith("/card/");
  const accountHref = isAuthenticated ? "/account" : "/login";
  const accountLabel = isAuthenticated ? "Account" : "Login";
  const primaryNav = [
    { href: buildPathWithCompareCards("/explore", "", compareCards), label: "Explore", matchHref: "/explore" },
    { href: buildPathWithCompareCards("/sets", "", compareCards), label: "Sets", matchHref: "/sets" },
    { href: buildCompareHref(compareCards), label: compareCount > 0 ? `Compare (${compareCount})` : "Compare", matchHref: "/compare" },
    { href: "/vault", label: "Vault" },
  ];
  const mobileSectionLabel =
    pathname === "/vault" || pathname.startsWith("/vault/")
      ? "Vault"
      : pathname === "/account" || pathname.startsWith("/account/")
        ? "Profile"
        : pathname === "/wall" || pathname.startsWith("/wall/") || pathname.startsWith("/u/")
          ? "Wall"
          : showTopSearch || pathname === "/sets" || pathname.startsWith("/sets/") || pathname === "/compare" || pathname.startsWith("/compare/")
            ? "Explore"
            : "Grookai Vault";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <PageContainer className={showTopSearch ? "space-y-3 py-3 md:space-y-4 md:py-4" : "py-3 md:py-4"}>
        <div className="md:hidden">
          <div className="flex min-h-[52px] items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-2.5 text-base font-semibold text-slate-950">
              <Image
                src="/grookai-emblem-square.svg"
                alt="Grookai Vault logo"
                width={30}
                height={30}
                className="rounded-md"
              />
              <span className="truncate">Grookai Vault</span>
            </Link>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={buildCompareHref(compareCards)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  pathname === "/compare" || pathname.startsWith("/compare/")
                    ? "bg-amber-100 text-amber-950 ring-1 ring-amber-200"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                {compareCount > 0 ? `Compare (${compareCount})` : "Compare"}
              </Link>
              <Link
                href={accountHref}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {accountLabel}
              </Link>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">{mobileSectionLabel}</p>
            {isAuthenticated && profileHref ? (
              <Link href={profileHref} className="text-xs font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline">
                My profile
              </Link>
            ) : null}
          </div>
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
                    {item.label}
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
          <Suspense fallback={<PersistentSearchBarFallback />}>
            <PersistentSearchBar />
          </Suspense>
        ) : null}
      </PageContainer>
    </header>
  );
}
