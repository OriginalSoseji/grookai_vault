String? pokemonSpriteUrl(int nationalDexNumber) {
  if (nationalDexNumber <= 0) {
    return null;
  }

  return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/$nationalDexNumber.png';
}
