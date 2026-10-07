export const vendorDestinations = [
  { key: "desk", label: "Desk", href: "/account/store/sales" },
  { key: "inventory", label: "Inventory", href: "/account/store?view=inventory" },
  { key: "scan", label: "Scan", href: "/scan" },
  { key: "reports", label: "Reports", href: "/account/store/reports" },
  { key: "store", label: "Store", href: "/account/store" },
] as const;

export function isVendorWorkspacePath(path: string) {
  return path === "/account/store" || path.startsWith("/account/store/");
}

export function activeVendorDestination(path: string, view: string | null) {
  if (path === "/account/store/sales") return "desk";
  if (path === "/account/store/reports" || path.startsWith("/account/store/receipts")) return "reports";
  if (path === "/account/store" && view === "inventory") return "inventory";
  return "store";
}
