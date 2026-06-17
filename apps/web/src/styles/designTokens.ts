export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  xxl: "32px",
  xxxl: "48px",
  jumbo: "64px",
} as const;

export const radius = {
  small: "12px",
  medium: "14px",
  large: "22px",
  xlarge: "28px",
} as const;

export const shadows = {
  subtle: "0 6px 14px rgba(15, 23, 42, 0.05)",
  hover: "0 10px 22px rgba(15, 23, 42, 0.06)",
  elevated: "0 14px 28px rgba(15, 23, 42, 0.08)",
} as const;

export const transitions = {
  fast: "transition-all duration-100 ease-out",
  normal: "transition-all duration-150 ease-out",
} as const;

export const pageWidths = {
  standard: 1280,
  wide: 1440,
} as const;
