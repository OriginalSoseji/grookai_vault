export function isGrookaiDexEnabled() {
  if (process.env.GROOKAI_DEX_V1_DISABLED === "true" || process.env.NEXT_PUBLIC_GROOKAI_DEX_V1_DISABLED === "true") {
    return false;
  }

  return true;
}
