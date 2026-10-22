import { vendorPilot } from "@/lib/vendorPilot.mjs";
import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { ACTIVE_BRAND_THEME, ACTIVE_BRAND_PALETTE, activeBrandStyle } from "@/components/brand/brandTheme";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppChrome } from "@/components/layout/AppChrome";
import { MobileBottomNavFallback } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { RouteSurface } from "@/components/layout/RouteSurface";
import { SiteHeaderFallback } from "@/components/layout/SiteHeader";
import { isGrookaiDexEnabled } from "@/lib/grookaiDex/featureFlag";
import { isBinderLibraryEnabled } from "@/lib/binders/featureFlags";
import { GROOKAI_VAULT_ORIGIN } from "@/lib/getSiteOrigin";
import { isLocalVisualParityFixtureMode } from "@/lib/visualParity/fixtureMode";
import "./globals.css";
import "./collector.css";
import "./collector-approved.css";
import "./collector-detail.css";
import "./route-families.css";
import "./launch-identity.css";
import { SafeAnalytics } from "@/components/analytics/SafeAnalytics";
import { collectorStaging, collectorFixtureLab } from "@/lib/collectorStaging.mjs";

const roboto = localFont({
  src: [
    { path: "./fonts/Roboto/Roboto-Thin.ttf", weight: "100", style: "normal" },
    { path: "./fonts/Roboto/Roboto-Light.ttf", weight: "300", style: "normal" },
    { path: "./fonts/Roboto/Roboto-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Roboto/Roboto-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Roboto/Roboto-Bold.ttf", weight: "700", style: "normal" },
    { path: "./fonts/Roboto/Roboto-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-roboto",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(GROOKAI_VAULT_ORIGIN),
  applicationName: "grookai vault",
  title: "grookai vault",
  description:
    "Find exact Pokemon cards, build your Vault, and connect with collectors who have what you want.",
  openGraph: {
    title: "grookai vault",
    description:
      "Find exact Pokemon cards, build your Vault, and connect with collectors who have what you want.",
    siteName: "grookai vault",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "grookai vault",
    description:
      "Find exact Pokemon cards, build your Vault, and connect with collectors who have what you want.",
  },
};

const themeBootstrapScript = `
(() => {
  try {
    const stored = window.localStorage.getItem("grookai-theme");
    const theme = stored === "dark" || stored === "light" ? stored : "dark";
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
    <html
      lang="en"
      className={`${roboto.variable} gv-launch ${visualParityFixtureMode ? "gv-dark" : "gv-collector gv-dark"}`}
      data-visual-system="launch"
      data-brand-theme={ACTIVE_BRAND_THEME}
      data-brand-accent={ACTIVE_BRAND_PALETTE.accent}
      style={activeBrandStyle}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="grookai-theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body>
        <a href="#main-content" className="gv-skip-link">
          Skip to content
        </a>
        {collectorStaging ? <div role="status" style={{ padding: "6px 16px", background: "#194b3c", color: "white", textAlign: "center", fontSize: 12 }}>{vendorPilot ? "Vendor preview · Sample catalog · Payments disabled" : collectorFixtureLab ? "TEST FIXTURES ONLY - Prices are synthetic, not live market data" : "Test environment · Sample catalog · Separate from your live Vault"}</div> : null}
        {visualParityFixtureMode ? (
          children
        ) : (
          <>
            <Suspense fallback={<ChromeFallback dexEnabled={dexEnabled} />}>
              <AppChrome dexEnabled={dexEnabled} bindersEnabled={bindersEnabled} />
            </Suspense>
            <main id="main-content" className="gv-mobile-safe-content gv-page-shell w-full min-w-0 overflow-x-clip">
              <PageContainer>
                <RouteSurface bindersEnabled={bindersEnabled} dexEnabled={dexEnabled}>
                  {children}
                </RouteSurface>
              </PageContainer>
            </main>
            <footer className="gv-site-footer border-t border-slate-200/60 bg-white/55 pb-[calc(5.1rem+env(safe-area-inset-bottom))] backdrop-blur">
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
