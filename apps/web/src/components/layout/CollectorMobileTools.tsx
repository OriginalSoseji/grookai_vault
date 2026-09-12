"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useClientReady } from "@/components/layout/useClientReady";
import { DESKTOP_SECONDARY_NAV, getDesktopRouteState } from "@/lib/desktopShellManifest";

export function CollectorMobileTools({ pathname, isAuthenticated, dexEnabled, bindersEnabled, compareHref, compareCount }: {
  pathname: string;
  isAuthenticated: boolean;
  dexEnabled: boolean;
  bindersEnabled: boolean;
  compareHref: string;
  compareCount: number;
}) {
  const active = getDesktopRouteState(pathname).activeSecondary;
  const ready = useClientReady();
  return (
    <details className="gv-collector-mobile-menu" inert={!ready} aria-busy={!ready} onKeyDown={(event) => {
      if (event.key === "Escape") {
        event.currentTarget.removeAttribute("open");
        event.currentTarget.querySelector("summary")?.focus();
      }
    }}>
      <summary aria-label="More navigation" title="More navigation"><Menu size={21} aria-hidden="true" /></summary>
      <nav className="gv-collector-mobile-tools" aria-label="Collection and account tools" onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) event.currentTarget.closest("details")?.removeAttribute("open");
      }}>
      {DESKTOP_SECONDARY_NAV.filter((item) => {
        if (item.key === "dex") return dexEnabled;
        if (item.key === "binders") return isAuthenticated && bindersEnabled;
        if (item.key === "messages") return isAuthenticated;
        return true;
      }).map((item) => (
        <Link key={item.key} href={item.key === "compare" ? compareHref : item.href} aria-current={active === item.key ? "page" : undefined}>
          {item.label}{item.key === "compare" && compareCount > 0 ? ` (${compareCount})` : ""}
        </Link>
      ))}
      {isAuthenticated ? <Link href="/account" aria-current={pathname === "/account" ? "page" : undefined}>Account</Link> : <Link href="/login">Login</Link>}
      </nav>
    </details>
  );
}
