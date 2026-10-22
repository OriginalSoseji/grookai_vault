import { BrandEmblem } from "./BrandEmblem";
import { BrandAvatar } from "./BrandAvatar";
import { ACTIVE_BRAND_THEME, ACTIVE_BRAND_PALETTE } from "./brandTheme";

/** Canonical wordmark. Keep font, casing, and Black weight independent of callers. */
export function BrandText({
  includeVault = false,
  className = "",
}: {
  includeVault?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`gv-brand-text ${className}`}
      data-grookai-wordmark
      style={{ fontFamily: "var(--font-roboto), Roboto, sans-serif", fontWeight: 900, textTransform: "none" }}
    >
      {includeVault ? "grookai vault" : "grookai"}
    </span>
  );
}

/** Preserve the original grookai emblem; typography never substitutes for it. */
export function BrandLockup({ includeVault = false, seasonal = true }: { includeVault?: boolean; seasonal?: boolean }) {
  return (
    <span className="gv-brand-lockup">
      {seasonal ? <BrandAvatar theme={ACTIVE_BRAND_THEME} fill={ACTIVE_BRAND_PALETTE.logoFill} size={64} label="" /> : <BrandEmblem label="" />}
      <BrandText includeVault={includeVault} />
    </span>
  );
}
