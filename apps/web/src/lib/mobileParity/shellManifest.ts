export const MOBILE_PARITY_BREAKPOINT_PX = 900;

export const MOBILE_PRIMARY_DOCK = [
  {
    key: "pulse",
    label: "Pulse",
    href: "/network",
    kind: "root",
  },
  {
    key: "wall",
    label: "Wall",
    href: "/wall",
    kind: "root",
  },
  {
    key: "scan",
    label: "Scan",
    href: "/scan",
    kind: "action",
  },
  {
    key: "vault",
    label: "Vault",
    href: "/vault",
    kind: "root",
  },
  {
    key: "search",
    label: "Search",
    href: "/explore",
    kind: "root",
  },
] as const;

export type MobilePrimaryDockItem = (typeof MOBILE_PRIMARY_DOCK)[number];
export type MobilePrimaryDockKey = MobilePrimaryDockItem["key"];

export const MOBILE_PARITY_SCENARIOS = [
  "pulse-empty",
  "wall-populated",
  "scan-ready",
  "vault-populated",
  "search-discovery",
  "menu-open",
] as const;

export type MobileParityScenario = (typeof MOBILE_PARITY_SCENARIOS)[number];

export function isMobileParityScenario(
  value: string,
): value is MobileParityScenario {
  return (MOBILE_PARITY_SCENARIOS as readonly string[]).includes(value);
}
