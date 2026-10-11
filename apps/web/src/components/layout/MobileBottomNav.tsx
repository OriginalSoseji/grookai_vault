"use client";

import { usePathname } from "next/navigation";
import { MobileParityDock } from "@/components/mobileParity/MobileParityDock";
import { useKeyboardVisible } from "@/components/mobileParity/useKeyboardVisible";
import { isVendorWorkspacePath } from "@/lib/vendorWorkspace";
import {
  shouldSuppressMobileChrome,
  type MobilePrimaryDockKey,
} from "@/lib/mobileParity/shellManifest";

type MobileBottomNavProps = {
  wallHref: string | null;
  pulseUnreadCount?: number;
};

function isSearchPath(pathname: string) {
  return (
    pathname === "/dex" || pathname.startsWith("/dex/") ||
    pathname === "/set" || pathname.startsWith("/set/") ||
    pathname === "/explore" ||
    pathname.startsWith("/explore/") ||
    pathname === "/sets" ||
    pathname.startsWith("/sets/") ||
    pathname === "/card" ||
    pathname.startsWith("/card/") ||
    pathname === "/compare" ||
    pathname.startsWith("/compare/") ||
    pathname === "/search" ||
    pathname.startsWith("/search/")
  );
}

function getActiveMobileNavKey(
  pathname: string,
): Exclude<MobilePrimaryDockKey, "scan"> | null {
  if (isSearchPath(pathname)) {
    return "search";
  }

  if (pathname === "/network" || pathname.startsWith("/network/")) {
    return "pulse";
  }

  if (pathname === "/wall" || pathname.startsWith("/wall/") || pathname.startsWith("/u/")) {
    return "pulse";
  }

  if (pathname === "/binders" || pathname.startsWith("/binders/")) return "binders";

  if (pathname === "/vault" || pathname.startsWith("/vault/")) {
    return "vault";
  }

  return null;
}

export function MobileBottomNav({ wallHref, pulseUnreadCount = 0 }: MobileBottomNavProps) {
  const pathname = usePathname();
  const keyboardVisible = useKeyboardVisible();

  if (shouldSuppressMobileChrome(pathname) || keyboardVisible) {
    return null;
  }

  const currentWallHref =
    pathname.startsWith("/u/") ||
    pathname === "/wall" ||
    pathname.startsWith("/wall/")
      ? pathname
      : wallHref;

  // Vendor routes own their dock, including when collector chrome is suppressed.
  if (isVendorWorkspacePath(pathname)) return null;

  return (
    <MobileParityDock
      wallHref={currentWallHref}
      activeKey={getActiveMobileNavKey(pathname)}
      pulseUnreadCount={pulseUnreadCount}
    />
  );
}

export function MobileBottomNavFallback() {
  const pathname = usePathname();
  const keyboardVisible = useKeyboardVisible();

  if (shouldSuppressMobileChrome(pathname) || keyboardVisible) {
    return null;
  }

  if (isVendorWorkspacePath(pathname)) return null;

  return (
    <MobileParityDock
      wallHref="/wall"
      activeKey={getActiveMobileNavKey(pathname)}
    />
  );
}
