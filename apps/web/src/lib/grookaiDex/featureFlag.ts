export function isGrookaiDexEnabled() {
  if (process.env.GROOKAI_DEX_V1_ENABLED === "false" || process.env.NEXT_PUBLIC_GROOKAI_DEX_V1_ENABLED === "false") {
    return false;
  }

  return (
    process.env.GROOKAI_DEX_V1_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_GROOKAI_DEX_V1_ENABLED === "true" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.APP_ENV === "staging"
  );
}
