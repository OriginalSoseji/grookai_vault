const GROOKAI_DEX_SPRITE_BASE_PATH = "/dex/sprites/v1";

export function getPokemonSpriteUrl(nationalDexNumber: number | null | undefined) {
  if (!Number.isInteger(nationalDexNumber) || !nationalDexNumber || nationalDexNumber <= 0) {
    return null;
  }

  return `${GROOKAI_DEX_SPRITE_BASE_PATH}/${nationalDexNumber}.png`;
}
