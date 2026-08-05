"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MobileParityDock } from "@/components/mobileParity/MobileParityDock";
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
    return "wall";
  }

  if (pathname === "/vault" || pathname.startsWith("/vault/")) {
    return "vault";
  }

  return null;
}

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }

    const update = () => {
      setVisible(window.innerHeight - viewport.height > 150);
    };

    update();
    viewport.addEventListener("resize", update);
    return () => viewport.removeEventListener("resize", update);
  }, []);

  return visible;
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

  return (
    <MobileParityDock
      wallHref="/wall"
      activeKey={getActiveMobileNavKey(pathname)}
    />
  );
}
