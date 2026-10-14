"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { DesktopApplicationShell } from "@/components/layout/DesktopApplicationShell";
import { CollectorMobileTools } from "@/components/layout/CollectorMobileTools";
import { PageContainer } from "@/components/layout/PageContainer";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import type { DesktopWallAvailability } from "@/lib/desktopShellManifest";
import { buildCompareHref, buildPathWithCompareCards, normalizeCompareCardsParam } from "@/lib/compareCards";
import { shouldSuppressMobileChrome } from "@/lib/mobileParity/shellManifest";

type SiteHeaderProps = {
  isAuthenticated: boolean;
  profileHref: string | null;
  networkUnreadCount: number;
  wallAvailability: DesktopWallAvailability;
  dexEnabled: boolean;
  bindersEnabled: boolean;
};

function Header({ pathname, compareCards, ...props }: SiteHeaderProps & { pathname: string; compareCards: string[] }) {
  const suppressMobileChrome = shouldSuppressMobileChrome(pathname);
  const compareHref = buildCompareHref(compareCards);
  return (
    <header className={`gv-site-header sticky top-0 z-50 ${suppressMobileChrome ? "gv-site-header-mobile-suppressed" : ""}`}>
      <PageContainer>
        <div className="gv-mobile-site-header">
          <div className="flex min-h-[56px] items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-2 text-[15px] font-semibold">
              <Image src="/grookai-logo-64.png" alt="Grookai Vault logo" width={28} height={28} className="gv-brand-mark" />
              <span className="gv-approved-brand-name">Grookai<span>VAULT</span></span>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <CollectorMobileTools pathname={pathname} isAuthenticated={props.isAuthenticated} dexEnabled={props.dexEnabled} bindersEnabled={props.bindersEnabled} compareHref={compareHref} compareCount={compareCards.length} />
            </div>
          </div>
        </div>
        <DesktopApplicationShell {...props} pathname={pathname} compareCount={compareCards.length}
          searchHref={buildPathWithCompareCards("/explore", "", compareCards)} compareHref={compareHref} />
      </PageContainer>
    </header>
  );
}

export function SiteHeaderFallback({ dexEnabled }: { dexEnabled: boolean }) {
  const pathname = usePathname();
  return <Header pathname={pathname} compareCards={[]} dexEnabled={dexEnabled} isAuthenticated={false}
    profileHref={null} networkUnreadCount={0} wallAvailability="signed_out" bindersEnabled={false} />;
}

export function SiteHeader(props: SiteHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const suppressMobileChrome = shouldSuppressMobileChrome(pathname);
  const compareCards = normalizeCompareCardsParam(searchParams.get("cards"));
  const compareCount = compareCards.length;
  const showTopSearch =
    pathname.startsWith("/search") || pathname.startsWith("/card/");
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
  const mobileSectionLabel =
    pathname === "/scan" || pathname.startsWith("/scan/")
      ? "Scan"
      : pathname === "/vault" || pathname.startsWith("/vault/")
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
    <header
      className={`gv-site-header sticky top-0 z-50 ${suppressMobileChrome ? "gv-site-header-mobile-suppressed" : ""}`}
    >
      <PageContainer className={showTopSearch ? "space-y-2.5 py-2.5" : "py-2.5"}>
        <div className="gv-mobile-site-header">
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
              <Link
                href={accountHref}
                className="shrink-0 rounded-full bg-white/68 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200/60 transition hover:bg-white"
              >
                {accountLabel}
              </Link>
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

        <DesktopApplicationShell
          pathname={pathname}
          isAuthenticated={isAuthenticated}
          profileHref={profileHref}
          networkUnreadCount={networkUnreadCount}
          wallAvailability={wallAvailability}
          dexEnabled={dexEnabled}
          bindersEnabled={bindersEnabled}
          compareCount={compareCount}
          searchHref={buildPathWithCompareCards("/explore", "", compareCards)}
          compareHref={buildCompareHref(compareCards)}
        />
        {showTopSearch ? (
          <div className="gv-desktop-site-header">
            <Suspense fallback={<PersistentSearchBarFallback />}>
              <PersistentSearchBar />
            </Suspense>
          </div>
        ) : null}
      </PageContainer>
    </header>
  );
}
