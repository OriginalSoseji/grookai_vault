"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MobileBottomNavProps = {
  wallHref: string | null;
  dexEnabled: boolean;
};

type MobileNavKey = "search" | "feed" | "scan" | "dex" | "wall" | "vault";

type MobileNavItem = {
  key: MobileNavKey;
  label: string;
  href: string | null;
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

function getActiveMobileNavKey(pathname: string): MobileNavKey | null {
  if (pathname === "/dex" || pathname.startsWith("/dex/")) {
    return "dex";
  }

  if (isSearchPath(pathname)) {
    return "search";
  }

  if (pathname === "/network" || pathname.startsWith("/network/")) {
    return "feed";
  }

  if (pathname === "/vault/import" || pathname.startsWith("/vault/import/")) {
    return "scan";
  }

  if (pathname === "/wall" || pathname.startsWith("/wall/") || pathname.startsWith("/u/")) {
    return "wall";
  }

  if (pathname === "/vault" || pathname.startsWith("/vault/")) {
    return "vault";
  }

  return null;
}

function NavIcon({ name, active }: { name: MobileNavKey; active: boolean }) {
  const className =
    name === "scan"
      ? "h-[18px] w-[18px] text-white dark:text-slate-950"
      : `h-[18px] w-[18px] ${active ? "text-sky-600" : "text-slate-500"}`;

  switch (name) {
    case "vault":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.75 8.25h16.5l-1.1 9.08a2 2 0 0 1-1.98 1.67H6.83a2 2 0 0 1-1.98-1.67L3.75 8.25Z" />
          <path d="M8.25 8.25V6.5A3.75 3.75 0 0 1 12 2.75 3.75 3.75 0 0 1 15.75 6.5v1.75" />
        </svg>
      );
    case "search":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m14.25 9.75-4.5 4.5" />
          <path d="m10.46 10.46 6.04-2-2 6.04-6.04 2 2-6.04Z" />
          <circle cx="12" cy="12" r="8.25" />
        </svg>
      );
    case "feed":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 7.25h14" />
          <path d="M5 12h14" />
          <path d="M5 16.75h8" />
          <circle cx="18" cy="17" r="2" />
        </svg>
      );
    case "scan":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 3.75H5.75a2 2 0 0 0-2 2V7" />
          <path d="M17 3.75h1.25a2 2 0 0 1 2 2V7" />
          <path d="M7 20.25H5.75a2 2 0 0 1-2-2V17" />
          <path d="M17 20.25h1.25a2 2 0 0 0 2-2V17" />
          <path d="M7.75 9.5h8.5" />
          <path d="M7.75 14.5h8.5" />
          <path d="M9.5 7.75h5" />
          <path d="M9.5 16.25h5" />
        </svg>
      );
    case "dex":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8.25" />
          <path d="M3.75 12h16.5" />
          <path d="M12 3.75c2.3 2.14 3.45 4.9 3.45 8.25S14.3 18.1 12 20.25" />
          <path d="M12 3.75C9.7 5.89 8.55 8.65 8.55 12S9.7 18.1 12 20.25" />
          <circle cx="12" cy="12" r="1.65" fill="currentColor" stroke="none" />
        </svg>
      );
    case "wall":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4.5" width="16" height="15" rx="3" />
          <path d="M8 15.25c1.2-1.6 2.2-2.4 3-2.4.9 0 1.5.5 2.25 1.2.7.64 1.14.95 1.75.95.8 0 1.55-.55 2.5-1.75" />
          <circle cx="9.25" cy="9.25" r="1.25" />
        </svg>
      );
  }
}

function MobileBottomNavLink({
  item,
  active,
}: {
  item: MobileNavItem;
  active: boolean;
}) {
  const content = (
    <>
      <NavIcon name={item.key} active={active} />
      <span
        className={`text-[10px] font-medium ${
          item.key === "scan"
            ? "text-white dark:text-slate-950"
            : active
              ? "text-sky-600"
              : "text-slate-500"
        }`}
      >
        {item.label}
      </span>
    </>
  );

  const isScan = item.key === "scan";
  const className = `flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 transition ${
    isScan
      ? `min-h-[56px] rounded-[18px] px-2 py-1.5 ${active ? "bg-sky-500 text-white shadow-[0_16px_34px_-24px_rgba(14,165,233,0.9)]" : "bg-slate-950 text-white shadow-[0_16px_34px_-24px_rgba(15,23,42,0.7)] hover:bg-slate-800 dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300"}`
      : `min-h-[50px] rounded-[0.95rem] px-2 py-1.5 ${
    active
      ? "bg-sky-500/[0.09] ring-1 ring-sky-200/70 dark:bg-sky-400/[0.14] dark:ring-sky-300/20"
      : item.href
        ? "hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
        : "opacity-45"
  }`}`;

  if (!item.href) {
    return (
      <span aria-disabled="true" className={className}>
        {content}
      </span>
    );
  }

  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={className}>
      {content}
    </Link>
  );
}

export function MobileBottomNav({ wallHref, dexEnabled }: MobileBottomNavProps) {
  const pathname = usePathname();
  const activeKey = getActiveMobileNavKey(pathname);
  const currentWallHref =
    pathname.startsWith("/u/") || pathname === "/wall" || pathname.startsWith("/wall/") ? pathname : wallHref;

  const items: MobileNavItem[] = [
    { key: "search", label: "Search", href: "/explore" },
    { key: "feed", label: "Feed", href: "/network" },
    { key: "scan", label: "Scan", href: "/vault/import" },
    ...(dexEnabled ? [{ key: "dex" as const, label: "Dex", href: "/dex" }] : []),
    { key: "wall", label: "Wall", href: currentWallHref },
    { key: "vault", label: "Vault", href: "/vault" },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 bg-transparent px-3 pb-[calc(0.45rem+env(safe-area-inset-bottom))] pt-2 md:hidden"
    >
      <div className="gv-control-surface mx-auto flex max-w-2xl items-center gap-1.5 rounded-[22px] p-1.5 backdrop-blur">
        {items.map((item) => (
          <MobileBottomNavLink key={item.key} item={item} active={activeKey === item.key} />
        ))}
      </div>
    </nav>
  );
}
