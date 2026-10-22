import type { CSSProperties } from "react";
import { BrandEmblem } from "./BrandEmblem";
import { SeasonalLogoEffects, type SeasonalLogoTheme } from "./SeasonalLogoEffects";

/** Live profile artwork: seasonal decoration around the unchanged original mark. */
export function BrandAvatar({
  theme,
  label,
  fill,
  size = 240,
  paused = false,
}: {
  theme?: SeasonalLogoTheme;
  label: string;
  fill?: string;
  size?: number;
  paused?: boolean;
}) {
  return (
    <span
      className="gv-brand-avatar"
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={!label || undefined}
      data-avatar-theme={theme ?? "original"}
      data-motion={paused ? "paused" : "playing"}
      style={{ width: size, height: size, "--gv-logo-fill": fill } as CSSProperties}
    >
      {theme ? <SeasonalLogoEffects theme={theme} /> : null}
      <BrandEmblem size={size} label="" />
    </span>
  );
}
