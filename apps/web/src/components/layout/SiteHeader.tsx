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
  return <Header {...props} pathname={pathname} compareCards={normalizeCompareCardsParam(searchParams.get("cards"))} />;
}
