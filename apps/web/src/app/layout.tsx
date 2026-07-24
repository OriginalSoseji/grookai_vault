import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppChrome } from "@/components/layout/AppChrome";
import { MobileBottomNavFallback } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { SiteHeaderFallback } from "@/components/layout/SiteHeader";
import { isGrookaiDexEnabled } from "@/lib/grookaiDex/featureFlag";
import { isBinderLibraryEnabled } from "@/lib/binders/featureFlags";
import { GROOKAI_VAULT_ORIGIN } from "@/lib/getSiteOrigin";
import { isLocalVisualParityFixtureMode } from "@/lib/visualParity/fixtureMode";
import "./globals.css";
import { SafeAnalytics } from "@/components/analytics/SafeAnalytics";

export const metadata: Metadata = {
  metadataBase: new URL(GROOKAI_VAULT_ORIGIN),
  applicationName: "Grookai Vault",
  title: "Grookai Vault",
  description:
    "Search, organize, and share Pokemon cards through Grookai Vault's collector intelligence layer.",
  openGraph: {
    title: "Grookai Vault",
    description:
      "Search, organize, and share Pokemon cards through Grookai Vault's collector intelligence layer.",
    siteName: "Grookai Vault",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Grookai Vault",
    description:
      "Search, organize, and share Pokemon cards through Grookai Vault's collector intelligence layer.",
  },
};

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
  return (
    <>
      <SiteHeaderFallback dexEnabled={dexEnabled} />
      <MobileBottomNavFallback />
    </>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const dexEnabled = isGrookaiDexEnabled();
  const bindersEnabled = isBinderLibraryEnabled();
  const visualParityFixtureMode = isLocalVisualParityFixtureMode();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        {visualParityFixtureMode ? (
          children
        ) : (
          <>
            <Suspense fallback={<ChromeFallback dexEnabled={dexEnabled} />}>
              <AppChrome dexEnabled={dexEnabled} bindersEnabled={bindersEnabled} />
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
                    Terms
                  </Link>
                  <Link href="/privacy" className="underline-offset-4 hover:text-slate-900 hover:underline">
                    Privacy
                  </Link>
                  <Link href="/support" className="underline-offset-4 hover:text-slate-900 hover:underline">
                    Support
                  </Link>
                  <Link href="/account/delete" className="underline-offset-4 hover:text-slate-900 hover:underline">
                    Account Deletion
                  </Link>
                </div>
              </PageContainer>
            </footer>
            <SafeAnalytics />
          </>
        )}
      </body>
    </html>
  );
}
