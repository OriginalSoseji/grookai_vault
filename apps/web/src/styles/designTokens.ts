export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  card: 16,
  image: 12,
  button: 10,
} as const;

export const shadows = {
  card: "shadow-sm",
  hover: "shadow-md",
} as const;

export const transitions = {
  fast: "transition-all duration-100",
  normal: "transition-all duration-150",
} as const;
