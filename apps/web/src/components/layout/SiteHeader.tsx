"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import PersistentSearchBar, { PersistentSearchBarFallback } from "@/components/PersistentSearchBar";
import { PageContainer } from "@/components/layout/PageContainer";

type SiteHeaderProps = {
  isAuthenticated: boolean;
  profileHref: string | null;
};

export function SiteHeader({ isAuthenticated, profileHref }: SiteHeaderProps) {
  const pathname = usePathname();
  const showTopSearch =
    pathname === "/explore" || pathname.startsWith("/search") || pathname.startsWith("/card/");
  const accountHref = isAuthenticated ? "/account" : "/login";
  const accountLabel = isAuthenticated ? "Grookai Account" : "Login";

  return (
    <header className="border-b border-slate-200 bg-white">
      <PageContainer className={showTopSearch ? "space-y-3 py-4" : "py-4"}>
        <div className="flex items-center justify-between gap-4">
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
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <Link href="/vault" className="hover:underline">
              Vault
            </Link>
            {isAuthenticated && profileHref ? (
              <Link href={profileHref} className="hover:underline">
                Profile
              </Link>
            ) : null}
            <Link href={accountHref} className="rounded border px-3 py-1 hover:bg-slate-100">
              {accountLabel}
            </Link>
          </nav>
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
