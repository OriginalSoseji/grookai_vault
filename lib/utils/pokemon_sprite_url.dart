String? pokemonSpriteUrl(int nationalDexNumber) {
  if (nationalDexNumber <= 0) {
    return null;
  }

  final sourceUrl =
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/$nationalDexNumber.png';
  return Uri.https('grookaivault.com', '/_next/image', {
    'url': sourceUrl,
    'w': '128',
    'q': '90',
  }).toString();
}
