"use client";

import { Boxes, Eye, LayoutDashboard, Layers3, PackageOpen, Store, Tags } from "lucide-react";
import s from "./StoreManager.module.css";

const entries = [
  { name: "Overview", icon: LayoutDashboard, group: "Workspace" },
  { name: "Vault inventory", icon: Layers3 },
  { name: "Custom collectibles", icon: Boxes },
  { name: "Preorders", icon: PackageOpen },
  { name: "Sections", icon: Tags },
  { name: "Store details", icon: Store, group: "Storefront" },
  { name: "Visibility", icon: Eye },
];

export default function StoreWorkspaceNavigation({ active, navigate, busy, preorders }: { active: string; navigate: (tab: string) => void; busy: boolean; preorders: boolean }) {
  return <nav className={s.sidebar} aria-label="Store management">
    {entries.filter(entry => entry.name !== "Preorders" || preorders).map(({ name, icon: Icon, group }) => <div key={name} className={s.navEntry}>
      {group && <div className={s.sidebarLabel}>{group}</div>}
      <button disabled={busy} aria-pressed={active === name} onClick={() => navigate(name)}><Icon size={17} strokeWidth={1.6} aria-hidden="true" />{name}</button>
    </div>)}
    <small>Browse-only storefront<br />Checkout is not enabled.</small>
  </nav>;
}
