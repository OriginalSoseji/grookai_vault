String? pokemonSpriteUrl(int nationalDexNumber) {
  if (nationalDexNumber <= 0) {
    return null;
  }

  return Uri.https(
    'grookaivault.com',
    '/dex/sprites/v1/$nationalDexNumber.png',
  ).toString();
}
