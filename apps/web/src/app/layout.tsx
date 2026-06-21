import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppChrome } from "@/components/layout/AppChrome";
import { PageContainer } from "@/components/layout/PageContainer";
import { isGrookaiDexEnabled } from "@/lib/grookaiDex/featureFlag";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

const themeBootstrapScript = `
(() => {
  try {
    const stored = window.localStorage.getItem("grookai-theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored === "dark" || stored === "light" ? stored : prefersDark ? "dark" : "light";
    document.documentElement.classList.toggle("gv-dark", theme === "dark");
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {}
})();
`;

function ChromeFallback({ dexEnabled }: { dexEnabled: boolean }) {
  const desktopNavItems = [
    { href: "/explore", label: "Search" },
    { href: "/network", label: "Feed" },
    { href: "/sets", label: "Sets" },
    ...(dexEnabled ? [{ href: "/dex", label: "Dex" }] : []),
    { href: "/compare", label: "Compare" },
    { href: "/vault", label: "Vault" },
  ];
  const mobileNavItems = [
    { href: "/explore", label: "Search" },
    { href: "/network", label: "Feed" },
    { href: "/wall", label: "Wall" },
    { href: "/vault", label: "Vault" },
    { href: "/account", label: "Profile" },
  ];

  return (
    <>
      <header className="gv-site-header sticky top-0 z-50">
        <PageContainer className="py-2.5 md:py-4">
          <div className="md:hidden">
            <div className="flex min-h-[46px] items-center justify-between gap-3">
              <Link href="/" className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-slate-950">
                <span className="truncate">Grookai Vault</span>
              </Link>
              <Link
                href="/login"
                className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200/70"
              >
                Login
              </Link>
              <ThemeToggle />
            </div>
          </div>
          <div className="hidden min-h-[64px] items-center justify-between gap-4 md:flex">
            <Link href="/" className="text-lg font-semibold text-slate-950">
              Grookai Vault
            </Link>
            <nav className="flex flex-wrap items-center gap-2 text-sm">
              {desktopNavItems.map((item) => (
                <Link key={item.href} href={item.href} className="gv-nav-link">
                  {item.label}
                </Link>
              ))}
              <Link
                href="/login"
                className="gv-secondary-button min-h-0 px-4 py-2 text-sm"
              >
                Login
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </PageContainer>
      </header>
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/92 px-3 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
      >
        <div className="mx-auto flex max-w-2xl items-center gap-1.5 rounded-[1.2rem] border border-slate-200 bg-white p-1.5 shadow-[0_-6px_20px_rgba(15,23,42,0.06)]">
          {mobileNavItems.map((item) => (
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
  const dexEnabled = isGrookaiDexEnabled();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        <Suspense fallback={<ChromeFallback dexEnabled={dexEnabled} />}>
          <AppChrome dexEnabled={dexEnabled} />
        </Suspense>
        <main className="gv-mobile-safe-content gv-page-shell w-full min-w-0 overflow-x-clip md:pb-12">
          <PageContainer>{children}</PageContainer>
        </main>
        <footer className="border-t border-slate-200/60 bg-white/55 pb-[calc(5.1rem+env(safe-area-inset-bottom))] backdrop-blur md:pb-0">
          <PageContainer className="py-4 text-center text-sm text-slate-600">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <Link href="/early-access" className="underline-offset-4 hover:text-slate-900 hover:underline">
                Early Access
              </Link>
              <Link href="/legal" className="underline-offset-4 hover:text-slate-900 hover:underline">
                Legal
              </Link>
            </div>
          </PageContainer>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
