"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function CommunityNavigation({ wallHref }: { wallHref: string | null }) {
  const path = usePathname();
  const wall = path === "/wall" || path.startsWith("/wall/") || path.startsWith("/u/");
  const nearby = path === "/network/nearby";
  if (!wall && path !== "/network" && !path.startsWith("/network/")) return null;
  const items = [
    { label: "Pulse", href: "/network", active: !wall && !nearby },
    { label: "My Wall", href: wallHref, active: wall },
    { label: "Nearby", href: "/network/nearby", active: nearby },
  ];
  return <nav aria-label="Community" className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 py-3">
    {items.map((item) => item.href ? <Link key={item.label} href={item.href} aria-current={item.active ? "page" : undefined} className={item.active ? "gv-primary-button" : "gv-secondary-button"}>{item.label}</Link> : <span key={item.label} aria-disabled="true" className="gv-secondary-button opacity-50">{item.label} unavailable</span>)}
  </nav>;
}
