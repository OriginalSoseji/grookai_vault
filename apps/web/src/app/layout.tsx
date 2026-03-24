import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppChrome } from "@/components/layout/AppChrome";
import { PageContainer } from "@/components/layout/PageContainer";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

function ChromeFallback() {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <PageContainer className="py-2.5 md:py-4">
          <div className="md:hidden">
            <div className="flex min-h-[46px] items-center justify-between gap-3">
              <Link href="/" className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-slate-950">
                <span className="truncate">Grookai Vault</span>
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700"
              >
                Login
              </Link>
            </div>
          </div>
          <div className="hidden min-h-[64px] items-center justify-between gap-4 md:flex">
            <Link href="/" className="text-lg font-semibold text-slate-950">
              Grookai Vault
            </Link>
            <nav className="flex flex-wrap items-center gap-2 text-sm">
              <Link href="/explore" className="rounded-full px-3 py-2 text-slate-600">
                Explore
              </Link>
              <Link href="/sets" className="rounded-full px-3 py-2 text-slate-600">
                Sets
              </Link>
              <Link href="/network" className="rounded-full px-3 py-2 text-slate-600">
                Network
              </Link>
              <Link href="/compare" className="rounded-full px-3 py-2 text-slate-600">
                Compare
              </Link>
              <Link href="/vault" className="rounded-full px-3 py-2 text-slate-600">
                Vault
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700"
              >
                Login
              </Link>
            </nav>
          </div>
        </PageContainer>
      </header>
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/92 px-3 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
      >
        <div className="mx-auto flex max-w-2xl items-center gap-1.5 rounded-[1.2rem] border border-slate-200 bg-white p-1.5 shadow-[0_-6px_20px_rgba(15,23,42,0.06)]">
          {[
            { href: "/vault", label: "Vault" },
            { href: "/explore", label: "Discover" },
            { href: "/network", label: "Network" },
            { href: "/wall", label: "Showcase" },
            { href: "/account", label: "Profile" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-[50px] min-w-0 flex-1 items-center justify-center rounded-[0.95rem] px-2 py-1.5 text-[10px] font-medium text-slate-500"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<ChromeFallback />}>
          <AppChrome />
        </Suspense>
        <main className="w-full py-7 pb-[calc(5.1rem+env(safe-area-inset-bottom))] md:py-12 md:pb-12">
          <PageContainer>{children}</PageContainer>
        </main>
        <footer className="border-t border-slate-200 bg-white pb-[calc(5.1rem+env(safe-area-inset-bottom))] md:pb-0">
          <PageContainer className="py-4 text-center text-sm text-slate-600">
            <Link href="/legal" className="underline-offset-4 hover:text-slate-900 hover:underline">
              Legal
            </Link>
          </PageContainer>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
