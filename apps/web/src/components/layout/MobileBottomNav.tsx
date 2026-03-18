"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MobileBottomNavProps = {
  wallHref: string | null;
};

type MobileNavKey = "vault" | "explore" | "wall" | "profile";

type MobileNavItem = {
  key: MobileNavKey;
  label: string;
  href: string | null;
};

function isExplorePath(pathname: string) {
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
  if (pathname === "/vault" || pathname.startsWith("/vault/")) {
    return "vault";
  }

  if (isExplorePath(pathname)) {
    return "explore";
  }

  if (pathname === "/wall" || pathname.startsWith("/wall/") || pathname.startsWith("/u/")) {
    return "wall";
  }

  if (pathname === "/account" || pathname.startsWith("/account/")) {
    return "profile";
  }

  return null;
}

function NavIcon({ name, active }: { name: MobileNavKey; active: boolean }) {
  const className = `h-[18px] w-[18px] ${active ? "text-slate-950" : "text-slate-500"}`;

  switch (name) {
    case "vault":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.75 8.25h16.5l-1.1 9.08a2 2 0 0 1-1.98 1.67H6.83a2 2 0 0 1-1.98-1.67L3.75 8.25Z" />
          <path d="M8.25 8.25V6.5A3.75 3.75 0 0 1 12 2.75 3.75 3.75 0 0 1 15.75 6.5v1.75" />
        </svg>
      );
    case "explore":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m14.25 9.75-4.5 4.5" />
          <path d="m10.46 10.46 6.04-2-2 6.04-6.04 2 2-6.04Z" />
          <circle cx="12" cy="12" r="8.25" />
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
    case "profile":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5 19.25c1.55-2.9 4.1-4.25 7-4.25s5.45 1.35 7 4.25" />
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
      <span className={`text-[10px] font-medium ${active ? "text-slate-950" : "text-slate-500"}`}>{item.label}</span>
    </>
  );

  const className = `flex min-h-[50px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[0.95rem] px-2 py-1.5 transition ${
    active
      ? "bg-slate-950/5 ring-1 ring-slate-200"
      : item.href
        ? "hover:bg-slate-100"
        : "opacity-45"
  }`;

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

export function MobileBottomNav({ wallHref }: MobileBottomNavProps) {
  const pathname = usePathname();
  const activeKey = getActiveMobileNavKey(pathname);
  const currentWallHref =
    pathname.startsWith("/u/") || pathname === "/wall" || pathname.startsWith("/wall/") ? pathname : wallHref;

  const items: MobileNavItem[] = [
    { key: "vault", label: "Vault", href: "/vault" },
    { key: "explore", label: "Discover", href: "/explore" },
    { key: "wall", label: "Showcase", href: currentWallHref },
    { key: "profile", label: "Profile", href: "/account" },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/92 px-3 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-2xl items-center gap-1.5 rounded-[1.2rem] border border-slate-200 bg-white p-1.5 shadow-[0_-6px_20px_rgba(15,23,42,0.06)]">
        {items.map((item) => (
          <MobileBottomNavLink key={item.key} item={item} active={activeKey === item.key} />
        ))}
      </div>
    </nav>
  );
}
