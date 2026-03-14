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
  const accountLabel = isAuthenticated ? "Account" : "Login";
  const primaryNav = [
    { href: "/explore", label: "Explore" },
    { href: "/sets", label: "Sets" },
    { href: "/compare", label: "Compare" },
    { href: "/vault", label: "Vault" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <PageContainer className={showTopSearch ? "space-y-4 py-4" : "py-4"}>
        <div className="flex min-h-[64px] flex-col justify-center gap-4 lg:flex-row lg:items-center lg:justify-between">
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
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-3 py-2 transition-all duration-100 ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              {showTopSearch ? (
                <Link href="/explore" className="rounded-full px-3 py-2 text-slate-600 transition-all duration-100 hover:bg-slate-100 hover:text-slate-950">
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
