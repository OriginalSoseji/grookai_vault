"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BarChart3, Boxes, ScanLine, ShoppingBag, Store } from "lucide-react";
import { MobileDockFrame } from "@/components/mobileParity/MobileDockFrame";
import { activeVendorDestination, vendorDestinations } from "@/lib/vendorWorkspace";
import s from "./VendorWorkspaceNavigation.module.css";

const icons = { desk: ShoppingBag, inventory: Boxes, scan: ScanLine, reports: BarChart3, store: Store };

export function VendorWorkspaceNavigation({ mobile = false, routePath }: { mobile?: boolean; routePath?: string }) {
  const path = usePathname();
  const params = useSearchParams();
  const active = activeVendorDestination(routePath ?? path, params.get("view"));
  const links = <nav className={mobile ? s.dock : s.tabs} aria-label="Vendor workspace">
    {vendorDestinations.map(item => {
      const Icon = icons[item.key];
      return <Link key={item.key} href={item.href} prefetch={false}
        aria-current={active === item.key ? "page" : undefined}>
        <Icon size={20} aria-hidden="true" /><span>{item.label}</span>
      </Link>;
    })}
  </nav>;
  return mobile ? <MobileDockFrame>{links}</MobileDockFrame> :
    <div className={s.header}><div className={s.title}><span>Vendor workspace</span>
      <Link href="/vault">Collector workspace</Link></div>{links}</div>;
}
