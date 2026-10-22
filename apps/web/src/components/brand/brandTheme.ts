import type { CSSProperties } from "react";

/** Logo and interaction accents travel together whenever the season changes. */
export const BRAND_THEMES = {
  halloween: {
    accent: "#ff8a33",
    lightAccent: "#a74400",
    soft: "rgb(255 138 51 / 12%)",
    container: "#4b2812",
    lightContainer: "#ffdcc0",
    logoFill: "linear-gradient(135deg, #ffb45c, #ff8a33 45%, #b898f4)",
  },
  winter: {
    accent: "#87ddfa",
    lightAccent: "#00627d",
    soft: "rgb(135 221 250 / 12%)",
    container: "#143744",
    lightContainer: "#c7f3fa",
    logoFill: "linear-gradient(135deg, #87ddfa, #c7f3fa 50%, #f4f5ed)",
  },
} as const;

export const ACTIVE_BRAND_THEME = "halloween" as const;
export const ACTIVE_BRAND_PALETTE = BRAND_THEMES[ACTIVE_BRAND_THEME];

export const activeBrandStyle = {
  "--gv-brand-accent": ACTIVE_BRAND_PALETTE.accent,
  "--gv-brand-accent-light": ACTIVE_BRAND_PALETTE.lightAccent,
  "--gv-brand-accent-soft": ACTIVE_BRAND_PALETTE.soft,
  "--gv-brand-accent-container": ACTIVE_BRAND_PALETTE.container,
  "--gv-brand-accent-container-light": ACTIVE_BRAND_PALETTE.lightContainer,
} as CSSProperties;
