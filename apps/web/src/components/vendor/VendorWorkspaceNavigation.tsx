import Link from "next/link";
import { Boxes, Printer, SlidersHorizontal, Store } from "lucide-react";

const destinations = [
  {href: "/vault", label: "Inventory", icon: Boxes},
  {href: "/account/pricing", label: "Pricing", icon: SlidersHorizontal},
  {href: "/vault/labels", label: "Labels", icon: Printer},
  {href: "/account/connections/square", label: "Square", icon: Store},
] as const;

export default function VendorWorkspaceNavigation({active}: {active?: "Inventory" | "Pricing" | "Labels" | "Square"}) {
  return <div className="space-y-3 print:hidden">
    {active && <Link href="/account/vendor" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">Vendor Mode</Link>}
    <nav aria-label="Vendor workspace" className="flex flex-wrap gap-2">
      {destinations.map(({href, label, icon: Icon}) => <Link key={href} href={href}
        aria-current={active === label ? "page" : undefined}
        className={`${active === label ? "gv-primary-button" : "gv-secondary-button"} min-h-11 gap-2`}>
        <Icon size={17} aria-hidden="true" />{label}
      </Link>)}
    </nav>
  </div>;
}
